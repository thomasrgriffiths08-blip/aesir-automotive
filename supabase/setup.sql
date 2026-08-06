-- Æsir Automotive — Supabase backend (run in SQL editor of a fresh free project)

-- single-row availability document (Neil's diary controls)
create table if not exists diary (
  id int primary key default 1 check (id = 1),
  blocked jsonb not null default '{}'::jsonb,
  closed_days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into diary (id) values (1) on conflict do nothing;

create table if not exists bookings (
  ref text primary key,
  iso date not null,
  time text not null,
  svc text not null,
  name text not null,
  phone text not null,
  reg text,
  model text,
  created_at timestamptz not null default now(),
  unique (iso, time)          -- hard double-booking guard at the database level
);

alter table diary enable row level security;
alter table bookings enable row level security;

-- public site: read the diary, read + create bookings
create policy "diary public read"   on diary    for select using (true);
create policy "bookings public read" on bookings for select using (true);
create policy "bookings public insert" on bookings for insert with check (true);

-- admin writes go through an edge function with the service role,
-- or temporarily: create policy "diary public update" on diary for update using (true);
-- (uncomment the line above ONLY if you want PIN-in-browser admin before real auth)
