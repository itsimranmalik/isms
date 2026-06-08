-- =====================================================================
-- 15_teacher_stage_update.sql
--
-- RPC: set_student_reading_stage(p_student_id, p_stage, p_page)
--   Lets teachers update reading_stage + qaidah_page for students they
--   teach (primary teacher OR class teacher OR Quran assessor for the
--   student's class). Admins can update anyone.
--
-- Direct UPDATE on public.students stays admin-only via existing RLS.
-- The RPC is `security definer` so it can perform the update on a
-- teacher's behalf after running its own authorisation check.
--
-- Re-runnable.
-- =====================================================================

create or replace function public.set_student_reading_stage(
    p_student_id bigint,
    p_stage      text,
    p_page       smallint default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    caller_uuid uuid := auth.uid();
    caller_role text;
    teacher_pk  bigint;
    is_allowed  boolean;
begin
    if caller_uuid is null then
        raise exception 'Not signed in';
    end if;

    if p_stage is not null and p_stage not in ('qaidah','juz','quran') then
        raise exception 'reading_stage must be qaidah, juz, quran, or null';
    end if;

    -- Admins: short-circuit, no further checks.
    select role into caller_role from public.profiles where id = caller_uuid;
    if caller_role = 'admin' then
        update public.students
           set reading_stage = nullif(p_stage, ''),
               qaidah_page   = p_page
         where id = p_student_id;
        return;
    end if;

    -- Teachers: must teach the student in some way.
    select t.id into teacher_pk
      from public.teachers t
     where t.user_id = caller_uuid;
    if teacher_pk is null then
        raise exception 'Forbidden — no teacher record linked to this account';
    end if;

    select exists (
        select 1
          from public.class_students cs
         where cs.student_id = p_student_id
           and (
                cs.primary_teacher_id = teacher_pk
             or exists (select 1 from public.class_teachers ct
                         where ct.class_id = cs.class_id
                           and ct.teacher_id = teacher_pk)
             or exists (select 1 from public.classes c
                         where c.id = cs.class_id
                           and c.quran_assessor_id = teacher_pk)
           )
    ) into is_allowed;

    if not is_allowed then
        raise exception 'Forbidden — you do not teach this student';
    end if;

    update public.students
       set reading_stage = nullif(p_stage, ''),
           qaidah_page   = p_page
     where id = p_student_id;
end $$;

-- Lock down + grant to authenticated users so PostgREST exposes it.
revoke all on function public.set_student_reading_stage(bigint, text, smallint) from public;
grant execute on function public.set_student_reading_stage(bigint, text, smallint) to authenticated;

do $$ begin
    raise notice 'OK -- set_student_reading_stage RPC ready';
end $$;
