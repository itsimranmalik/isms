-- =====================================================================
-- Admissions table — public form submissions, admin-only read.
-- Anonymous visitors on /admissions.html submit; only admins can view
-- the resulting rows in the portal.
-- =====================================================================

create table if not exists public.admissions (
    id              bigserial primary key,
    child_first_name  text not null,
    child_last_name   text not null,
    dob               date,
    gender            text,
    guardian_name     text not null,
    guardian_phone    text not null,
    guardian_email    text not null,
    address           text,
    prior_study       text,
    preferred_start   date,
    status            text not null default 'new'   -- new | contacted | enrolled | rejected
                          check (status in ('new','contacted','enrolled','rejected')),
    admin_notes       text,
    submitted_at      timestamptz not null default now(),
    handled_by        uuid references auth.users(id) on delete set null,
    handled_at        timestamptz
);
create index if not exists ix_admissions_status     on public.admissions(status);
create index if not exists ix_admissions_submitted  on public.admissions(submitted_at desc);

alter table public.admissions enable row level security;

-- Drop any old policies (re-run safety)
drop policy if exists "admissions anon insert"  on public.admissions;
drop policy if exists "admissions admin read"   on public.admissions;
drop policy if exists "admissions admin write"  on public.admissions;

-- Anyone (signed in or not) may INSERT a new application.
create policy "admissions anon insert"
    on public.admissions
    for insert
    to anon, authenticated
    with check (true);

-- Only admins may SELECT.
create policy "admissions admin read"
    on public.admissions
    for select
    to authenticated
    using (public.is_admin());

-- Only admins may UPDATE / DELETE (status changes, notes, etc.).
create policy "admissions admin write"
    on public.admissions
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "admissions admin delete"
    on public.admissions
    for delete
    to authenticated
    using (public.is_admin());

do $$ begin raise notice 'OK -- admissions table created with anon-insert + admin-read policies'; end $$;
