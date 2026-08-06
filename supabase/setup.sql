-- ÆSIR AUTOMOTIVE — booking backend
-- Run this whole file once in the SQL editor of a fresh free Supabase project.
--
-- The design point: the PUBLIC website must know which slots are TAKEN, but must
-- never be able to read who booked them. Customer names and phone numbers are
-- readable only by a signed-in workshop account. This is the thing the JSONBlob
-- version got wrong — there, anyone who viewed source could read the whole diary.

-- ---------------------------------------------------------------- diary (Neil's controls)
create table if not exists public.diary (
  id          int primary key default 1 check (id = 1),
  blocked     jsonb       not null default '{}'::jsonb,   -- {"2026-08-07":["09:30","12:00"]}
  closed_days jsonb       not null default '[]'::jsonb,   -- ["2026-08-25"]
  updated_at  timestamptz not null default now()
);
insert into public.diary (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- bookings (personal data)
create table if not exists public.bookings (
  ref        text primary key,
  iso        date        not null,
  slot_time  text        not null,
  svc        text        not null,
  name       text        not null,
  phone      text        not null,
  reg        text,
  model      text,
  created_at timestamptz not null default now(),
  -- the real double-booking guard: two people submitting the same slot at the
  -- same instant cannot both succeed, however the browser behaves.
  unique (iso, slot_time)
);

alter table public.diary    enable row level security;
alter table public.bookings enable row level security;

-- ---------------------------------------------------------------- policies
-- Diary: world-readable (it contains no personal data — just which slots Neil
-- has blocked and which days he's closed). Writable only when signed in.
drop policy if exists "diary read"  on public.diary;
drop policy if exists "diary write" on public.diary;
create policy "diary read"  on public.diary for select using (true);
create policy "diary write" on public.diary for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Bookings: anyone may CREATE one (that's the public booking form).
-- Nobody anonymous may READ, UPDATE or DELETE them. No select policy for anon
-- means no rows come back — RLS denies by default.
drop policy if exists "bookings insert"      on public.bookings;
drop policy if exists "bookings staff read"  on public.bookings;
drop policy if exists "bookings staff write" on public.bookings;
create policy "bookings insert"      on public.bookings for insert with check (true);
create policy "bookings staff read"  on public.bookings for select using (auth.role() = 'authenticated');
create policy "bookings staff write" on public.bookings for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------- what the public may see
-- Only the fact that a slot is gone. No name, no number, no registration.
-- security_invoker = off means the view runs as its owner and so is not blocked
-- by the bookings RLS above; the view itself exposes only two harmless columns.
drop view if exists public.taken_slots;
create view public.taken_slots with (security_invoker = off) as
  select iso, slot_time from public.bookings;
grant select on public.taken_slots to anon, authenticated;

-- ---------------------------------------------------------------- housekeeping
-- Old bookings stop being needed once the job is done. Keeping personal data
-- longer than necessary is exactly what a privacy notice promises not to do.
-- Run manually, or schedule with pg_cron if the project has it enabled.
create or replace function public.purge_old_bookings() returns void
language sql security definer as $$
  delete from public.bookings where iso < (current_date - interval '30 days');
$$;

-- ---------------------------------------------------------------- after running this
-- 1. Authentication → Providers: leave Email on, turn OFF "enable sign-ups"
--    (there should be exactly one account: Neil's).
-- 2. Authentication → Users → "Add user": create Neil's email + a strong password.
--    That replaces the '8177' PIN that is currently visible in admin.html source.
-- 3. Project Settings → API: copy the Project URL and the anon/public key into
--    js/cloud.supabase.js. The anon key is safe in client code — it grants only
--    what the policies above allow. NEVER put the service_role key in the site.
