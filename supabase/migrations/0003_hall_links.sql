-- Halls ke beech ke raaste. Ek link = Hall A ka ek gate <-> Hall B ka ek gate + walking doori (meters).
-- Run karne se pehle 0002_hall_layouts.sql chal chuki honi chahiye. Re-run safe hai.

create table if not exists public.hall_links (
  id uuid primary key default gen_random_uuid(),
  exhibition_slug text not null,
  a_hall text not null,
  a_poi text not null,
  b_hall text not null,
  b_poi text not null,
  meters int not null check (meters between 0 and 5000),
  kind text not null default 'walk' check (kind in ('walk', 'outdoor', 'corridor')),
  created_at timestamptz not null default now(),
  check (a_hall <> b_hall or a_poi <> b_poi)
);

create index if not exists hall_links_exhibition_idx on public.hall_links (exhibition_slug);

alter table public.hall_links enable row level security;

drop policy if exists "Public can read hall links" on public.hall_links;
create policy "Public can read hall links" on public.hall_links for select using (true);

drop policy if exists "Admins can insert hall links" on public.hall_links;
create policy "Admins can insert hall links" on public.hall_links for insert
  with check (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can update hall links" on public.hall_links;
create policy "Admins can update hall links" on public.hall_links for update
  using (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can delete hall links" on public.hall_links;
create policy "Admins can delete hall links" on public.hall_links for delete
  using (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'));
