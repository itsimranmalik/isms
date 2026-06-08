-- =====================================================================
-- 16_assessment_regrade.sql
--
-- Locks Quran + Qaidah assessments so that once a teacher saves an
-- assessment for a given (student, module, day), no second teacher
-- insert is allowed until an admin approves a regrade request.
--
-- Memorisation and Duas are NOT covered (they're tracked per
-- surah/dua, not per day).
--
-- Components:
--   1. New table: public.assessment_regrade_requests
--   2. BEFORE INSERT trigger on public.assessments that blocks teacher
--      duplicates for (student_id, module_type, assessed_on).
--      Admins bypass.
--
-- Admin "approve" deletes the original assessment row, which cascades
-- the request row away (audit_logs holds the history).
--
-- Re-runnable.
-- =====================================================================

-- ---------- 1) regrade requests table -------------------------------
create table if not exists public.assessment_regrade_requests (
    id                    bigserial primary key,
    assessment_id         bigint not null references public.assessments(id) on delete cascade,
    student_id            bigint not null references public.students(id)    on delete cascade,
    module_type           text   not null,
    assessed_on           date   not null,
    requester_id          uuid   not null references auth.users(id)         on delete cascade,
    requester_teacher_id  bigint          references public.teachers(id)    on delete set null,
    reason                text,
    status                text   not null default 'pending'
                                  check (status in ('pending', 'rejected')),
    admin_note            text,
    created_at            timestamptz not null default now(),
    decided_at            timestamptz,
    decided_by            uuid            references auth.users(id)         on delete set null
);

-- Only one open request at a time per assessment
create unique index if not exists ix_regrade_pending_unique
    on public.assessment_regrade_requests(assessment_id)
    where status = 'pending';

create index if not exists ix_regrade_student
    on public.assessment_regrade_requests(student_id, created_at desc);
create index if not exists ix_regrade_requester
    on public.assessment_regrade_requests(requester_id, created_at desc);
create index if not exists ix_regrade_status
    on public.assessment_regrade_requests(status);

-- ---------- 2) RLS for the new table --------------------------------
alter table public.assessment_regrade_requests enable row level security;

drop policy if exists "Admin all on regrade requests"     on public.assessment_regrade_requests;
drop policy if exists "Teacher inserts own regrade"       on public.assessment_regrade_requests;
drop policy if exists "Teacher reads own regrade"         on public.assessment_regrade_requests;

create policy "Admin all on regrade requests"
    on public.assessment_regrade_requests
    for all
    using ((select role from public.profiles where id = auth.uid()) = 'admin')
    with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Teacher inserts own regrade"
    on public.assessment_regrade_requests
    for insert
    with check (requester_id = auth.uid());

create policy "Teacher reads own regrade"
    on public.assessment_regrade_requests
    for select
    using (requester_id = auth.uid());

-- ---------- 3) Trigger: block duplicate Quran/Qaidah inserts --------
create or replace function public.check_no_duplicate_assessment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_role text;
begin
    -- Lock only applies to reading assessments
    if new.module_type not in ('quran_recitation', 'qaidah_reading') then
        return new;
    end if;

    -- Admins bypass the lock entirely
    select role into caller_role from public.profiles where id = auth.uid();
    if caller_role = 'admin' then
        return new;
    end if;

    if exists (
        select 1 from public.assessments a
         where a.student_id  = new.student_id
           and a.module_type = new.module_type
           and a.assessed_on = new.assessed_on
    ) then
        raise exception
          'An assessment for this student already exists for %. Ask an admin to approve a regrade.',
          new.assessed_on;
    end if;

    return new;
end $$;

drop trigger if exists trg_no_duplicate_assessment on public.assessments;
create trigger trg_no_duplicate_assessment
    before insert on public.assessments
    for each row execute function public.check_no_duplicate_assessment();

do $$ begin raise notice 'OK -- regrade workflow installed'; end $$;
