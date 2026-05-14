-- =====================================================================
-- Row Level Security (RLS) policies
-- Roles are read from public.profiles.role
-- =====================================================================

-- Helper: SECURITY DEFINER getter to avoid recursive policy lookups
create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
    select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce((select role in ('admin','teacher') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.my_student_id() returns bigint
language sql stable security definer set search_path = public as $$
    select student_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_teacher_id() returns bigint
language sql stable security definer set search_path = public as $$
    select teacher_id from public.profiles where id = auth.uid()
$$;

-- Enable RLS on every table -------------------------------------------
alter table public.profiles                enable row level security;
alter table public.students                enable row level security;
alter table public.teachers                enable row level security;
alter table public.sessions                enable row level security;
alter table public.classes                 enable row level security;
alter table public.class_teachers          enable row level security;
alter table public.class_students          enable row level security;
alter table public.subjects                enable row level security;
alter table public.assessments             enable row level security;
alter table public.quran_recitation_grades enable row level security;
alter table public.surahs                  enable row level security;
alter table public.memorisation_progress   enable row level security;
alter table public.memorisation_revisions  enable row level security;
alter table public.duas                    enable row level security;
alter table public.dua_progress            enable row level security;
alter table public.attendance              enable row level security;
alter table public.announcements           enable row level security;
alter table public.notifications           enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.settings                enable row level security;

-- profiles -----------------------------------------------------------
create policy "profiles read own or staff" on public.profiles for select
    using (id = auth.uid() or is_staff());
create policy "profiles update own" on public.profiles for update
    using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin all" on public.profiles for all
    using (is_admin()) with check (is_admin());

-- Reference / lookup tables: readable by any logged-in user, writable by admin
do $$
declare t text;
begin
    for t in select unnest(array['sessions','subjects','surahs','duas','settings','classes']) loop
        execute format($f$create policy "%I read all logged-in" on public.%I for select using (auth.role() = 'authenticated')$f$, t, t);
        execute format($f$create policy "%I admin write"        on public.%I for all    using (is_admin()) with check (is_admin())$f$, t, t);
    end loop;
end $$;

-- students ----------------------------------------------------------
create policy "students staff read"  on public.students for select using (is_staff() or user_id = auth.uid());
create policy "students admin write" on public.students for all    using (is_admin()) with check (is_admin());

-- teachers ----------------------------------------------------------
create policy "teachers staff read"  on public.teachers for select using (is_staff() or user_id = auth.uid());
create policy "teachers admin write" on public.teachers for all    using (is_admin()) with check (is_admin());

-- class_teachers, class_students -----------------------------------
create policy "class_teachers read" on public.class_teachers for select using (auth.role() = 'authenticated');
create policy "class_teachers admin write" on public.class_teachers for all using (is_admin()) with check (is_admin());
create policy "class_students read" on public.class_students for select using (auth.role() = 'authenticated');
create policy "class_students admin write" on public.class_students for all using (is_admin()) with check (is_admin());

-- assessments / grades --------------------------------------------
create policy "assessments staff or own" on public.assessments for select
    using (is_staff() or student_id = my_student_id());
create policy "assessments staff write" on public.assessments for insert
    with check (is_staff());
create policy "assessments staff update" on public.assessments for update
    using (is_staff()) with check (is_staff());
create policy "assessments admin delete" on public.assessments for delete
    using (is_admin());

create policy "qr_grades staff or own" on public.quran_recitation_grades for select
    using (
        is_staff() or
        exists(select 1 from public.assessments a where a.id = assessment_id and a.student_id = my_student_id())
    );
create policy "qr_grades staff write" on public.quran_recitation_grades for all
    using (is_staff()) with check (is_staff());

-- memorisation ----------------------------------------------------
create policy "memo_progress staff or own" on public.memorisation_progress for select
    using (is_staff() or student_id = my_student_id());
create policy "memo_progress staff write" on public.memorisation_progress for all
    using (is_staff()) with check (is_staff());

create policy "memo_revisions staff or own" on public.memorisation_revisions for select
    using (
        is_staff() or
        exists(select 1 from public.memorisation_progress p where p.id = progress_id and p.student_id = my_student_id())
    );
create policy "memo_revisions staff write" on public.memorisation_revisions for all
    using (is_staff()) with check (is_staff());

-- duas ------------------------------------------------------------
create policy "dua_progress staff or own" on public.dua_progress for select
    using (is_staff() or student_id = my_student_id());
create policy "dua_progress staff write" on public.dua_progress for all
    using (is_staff()) with check (is_staff());

-- attendance ------------------------------------------------------
create policy "attendance staff or own" on public.attendance for select
    using (is_staff() or student_id = my_student_id());
create policy "attendance staff write" on public.attendance for all
    using (is_staff()) with check (is_staff());

-- announcements ---------------------------------------------------
create policy "announcements read all" on public.announcements for select
    using (auth.role() = 'authenticated');
create policy "announcements admin write" on public.announcements for all
    using (is_admin()) with check (is_admin());

-- notifications ---------------------------------------------------
create policy "notifications own" on public.notifications for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid());
create policy "notifications system insert" on public.notifications for insert with check (is_staff());

-- audit_logs (admin read only; inserts are by service role from triggers)
create policy "audit admin read" on public.audit_logs for select using (is_admin());
create policy "audit any insert"  on public.audit_logs for insert with check (auth.uid() is not null);
