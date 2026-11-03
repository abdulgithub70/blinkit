-- Hall layouts (shell matrix + stalls + company names). Supabase SQL editor me ek baar run karo, re-run safe hai.
-- exhibition_slug = exhibitions.slug. Ek exhibition ke ek hall ka ek layout.

create table if not exists public.hall_layouts (
  id uuid primary key default gen_random_uuid(),
  exhibition_slug text not null,
  hall text not null,
  rows int not null check (rows between 1 and 300),
  cols int not null check (cols between 1 and 300),
  cells jsonb not null check (jsonb_typeof(cells) = 'array'),
  stalls jsonb not null default '[]'::jsonb,
  pois jsonb not null default '[]'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  unique (exhibition_slug, hall)
);

alter table public.hall_layouts enable row level security;

-- Visitors layout padh sakte hain (company names public info hain)
drop policy if exists "Public can read hall layouts" on public.hall_layouts;
create policy "Public can read hall layouts" on public.hall_layouts for select using (true);

-- Sirf admin likh sakta hai (wahi role check jo orders me hai)
drop policy if exists "Admins can insert hall layouts" on public.hall_layouts;
create policy "Admins can insert hall layouts" on public.hall_layouts for insert
  with check (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can update hall layouts" on public.hall_layouts;
create policy "Admins can update hall layouts" on public.hall_layouts for update
  using (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can delete hall layouts" on public.hall_layouts;
create policy "Admins can delete hall layouts" on public.hall_layouts for delete
  using (exists (select 1 from public.users_register where id = auth.uid() and role = 'admin'));
