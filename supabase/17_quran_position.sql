-- =====================================================================
-- 17_quran_position.sql
--
-- Tracks a Quran student's CURRENT POSITION in the Mushaf:
--    students.quran_surah  (1-114, FK-style integer, no constraint)
--    students.quran_ayah   (1-300, broad bound for any surah)
--
-- And extends the existing teacher-friendly RPC so they can update
-- it the same way they update Qaidah page.
--
-- Re-runnable.
-- =====================================================================

-- ---------- 1) New columns -----------------------------------------
alter table public.students
    add column if not exists quran_surah smallint
        check (quran_surah is null or quran_surah between 1 and 114),
    add column if not exists quran_ayah  smallint
        check (quran_ayah  is null or quran_ayah  between 1 and 300);

create index if not exists ix_students_quran_position
    on public.students(quran_surah, quran_ayah);

-- ---------- 2) Extend the RPC --------------------------------------
-- Drop the old signature; create a wider one. Old (3-arg) callers will
-- still work because we keep defaults on the new tail params.
drop function if exists public.set_student_reading_stage(bigint, text, smallint);
drop function if exists public.set_student_reading_stage(bigint, text, smallint, smallint, smallint);

create or replace function public.set_student_reading_stage(
    p_student_id  bigint,
    p_stage       text,
    p_page        smallint default null,
    p_quran_surah smallint default null,
    p_quran_ayah  smallint default null
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

    select role into caller_role from public.profiles where id = caller_uuid;
    if caller_role = 'admin' then
        update public.students
           set reading_stage = nullif(p_stage, ''),
               qaidah_page   = p_page,
               quran_surah   = p_quran_surah,
               quran_ayah    = p_quran_ayah
         where id = p_student_id;
        return;
    end if;

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
           qaidah_page   = p_page,
           quran_surah   = p_quran_surah,
           quran_ayah    = p_quran_ayah
     where id = p_student_id;
end $$;

revoke all on function public.set_student_reading_stage(bigint, text, smallint, smallint, smallint) from public;
grant execute on function public.set_student_reading_stage(bigint, text, smallint, smallint, smallint) to authenticated;

do $$ begin
    raise notice 'OK -- quran_surah + quran_ayah added, RPC extended';
end $$;
