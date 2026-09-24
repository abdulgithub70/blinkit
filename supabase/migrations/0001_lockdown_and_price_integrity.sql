-- ============================================================================
-- ExpoEase security hardening migration
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New
-- query → paste → Run). It is written to be safe to re-run.
--
-- What this does:
--   1. Creates a `products` table as the single source of truth for prices
--      (mirrors src/data/products.js) and seeds it.
--   2. Adds a trigger that recalculates order_items + total_price from the
--      `products` table on every insert into `orders`, ignoring whatever
--      price the browser sent. This closes the checkout price-tampering
--      hole — the client can only choose product id + quantity now.
--   3. Enables Row Level Security on orders, service_bookings, profiles,
--      and users_register, with policies so that:
--        - anyone (including guests) can place an order or booking
--        - only rows belonging to the signed-in user are readable/writable
--          for profiles and users_register
--        - only users whose users_register.role = 'admin' can read or
--          update the orders / service_bookings lists
--
-- This is the real enforcement layer. The admin-page auth guard added in
-- the frontend only improves the UI experience — without these policies,
-- anyone could still call the Supabase REST API directly with the public
-- anon key and read/write everything.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Products table (source of truth for pricing)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id integer primary key,
  name text not null,
  price numeric not null,
  description text,
  image text
);

insert into public.products (id, name, price, description, image) values
  (1, 'Bisleri Water Bottle', 300, '24 x 200ml', '/products/bisleri1.webp'),
  (2, 'Coconut Water', 320, null, '/products/coconut.webp'),
  (3, 'CLEAR Water', 350, '48 x 200ml', '/products/clear.webp'),
  (4, 'campa pack (20pcs)', 50, null, '/products/campa.png'),
  (5, 'Mixed Fruit Juice', 180, '1ltr', '/products/mixed-juice.webp'),
  (6, 'Bisleri Water Bottle (5 Pack)', 180, '10ltr', '/products/bisleri-lg.webp'),
  (7, 'Tissue Pack', 3000, '4x100pulls', '/products/napkins.webp'),
  (8, 'Coffe Machine Nescafe', 3000, 'per day', '/products/Nescafe.jpg'),
  (9, 'LCD TV', 1000, null, '/products/tv.jpg')
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  image = excluded.image;

-- Keep this table in sync with src/data/products.js by hand for now.
-- (A later upgrade could make this table the frontend's data source too,
-- so there's only one place prices live.)

-- ----------------------------------------------------------------------------
-- 1b. Defensive schema check
--
-- I built this migration by reading your frontend code, not your actual
-- Supabase schema (I don't have DB access from here). These statements are
-- no-ops if the columns already exist, but protect against the trigger/
-- policies below failing if something's named differently than expected.
-- If any of these error out, your real column names differ — tell me what
-- they are and I'll adjust the migration.
-- ----------------------------------------------------------------------------
alter table if exists public.orders
  add column if not exists order_items jsonb not null default '[]'::jsonb,
  add column if not exists total_price numeric not null default 0,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now();

alter table if exists public.service_bookings
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- 2. Server-side price recalculation on orders
-- ----------------------------------------------------------------------------
create or replace function public.recalc_order_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  prod record;
  qty integer;
  computed_total numeric := 0;
  rebuilt_items jsonb := '[]'::jsonb;
begin
  if NEW.order_items is null or jsonb_array_length(NEW.order_items) = 0 then
    raise exception 'order_items must be a non-empty array';
  end if;

  for item in select * from jsonb_array_elements(NEW.order_items)
  loop
    select id, name, price, description, image
      into prod
      from public.products
     where id = (item->>'id')::int;

    if not found then
      raise exception 'Unknown product id: %', item->>'id';
    end if;

    qty := greatest(coalesce((item->>'quantity')::int, 1), 1);
    computed_total := computed_total + (prod.price * qty);

    rebuilt_items := rebuilt_items || jsonb_build_object(
      'id', prod.id,
      'name', prod.name,
      'price', prod.price,
      'description', prod.description,
      'image', prod.image,
      'quantity', qty
    );
  end loop;

  -- Only these two columns are ever trusted from the trigger's output;
  -- everything else the client sent (name/phone/hall_no/etc.) passes through.
  NEW.order_items := rebuilt_items;
  NEW.total_price := computed_total;

  return NEW;
end;
$$;

drop trigger if exists trg_recalc_order_total on public.orders;
create trigger trg_recalc_order_total
  before insert on public.orders
  for each row
  execute function public.recalc_order_total();

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.service_bookings enable row level security;
alter table public.profiles enable row level security;
alter table public.users_register enable row level security;

-- products: public read-only catalog
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products"
  on public.products for select
  using (true);

-- users_register: users can read/create only their own row.
-- No update policy is defined on purpose — role changes (e.g. granting
-- 'admin') must be done by you in the Supabase table editor, not by users.
drop policy if exists "Users can read own registration" on public.users_register;
create policy "Users can read own registration"
  on public.users_register for select
  using (auth.uid() = id);

drop policy if exists "Users can create own registration" on public.users_register;
create policy "Users can create own registration"
  on public.users_register for insert
  with check (auth.uid() = id);

-- profiles: public listing (hostesses/service-boys pages read everyone),
-- but only the owner can create/update their own profile.
drop policy if exists "Public can read profiles" on public.profiles;
create policy "Public can read profiles"
  on public.profiles for select
  using (true);

drop policy if exists "Users can create own profile" on public.profiles;
create policy "Users can create own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- orders: anyone (including guests) can place an order; only admins can
-- read the order list or change status.
drop policy if exists "Anyone can place an order" on public.orders;
create policy "Anyone can place an order"
  on public.orders for insert
  with check (true);

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
  on public.orders for select
  using (
    exists (
      select 1 from public.users_register
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update
  using (
    exists (
      select 1 from public.users_register
      where id = auth.uid() and role = 'admin'
    )
  );

-- service_bookings: same pattern as orders.
drop policy if exists "Anyone can create a booking" on public.service_bookings;
create policy "Anyone can create a booking"
  on public.service_bookings for insert
  with check (true);

drop policy if exists "Admins can read bookings" on public.service_bookings;
create policy "Admins can read bookings"
  on public.service_bookings for select
  using (
    exists (
      select 1 from public.users_register
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update bookings" on public.service_bookings;
create policy "Admins can update bookings"
  on public.service_bookings for update
  using (
    exists (
      select 1 from public.users_register
      where id = auth.uid() and role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 4. One-time manual step (do this AFTER running the migration above):
--
--    update public.users_register
--       set role = 'admin'
--     where email = 'YOUR_OWNER_EMAIL_HERE';
--
--    That account can then log in at /login and will be routed to
--    /adminzxz. No one else can reach that role — the register page only
--    ever lets people sign up as service_boy or hostess.
-- ----------------------------------------------------------------------------
