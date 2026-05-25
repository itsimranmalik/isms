-- =====================================================================
-- Migration: each class enrolment can name a primary teacher.
-- Teachers will only see their assigned students on the Quran Grading
-- screen. Admins still see everyone.
--
-- Run after 04_teacher_enrolment.sql.
-- =====================================================================

alter table public.class_students
    add column if not exists primary_teacher_id bigint
    references public.teachers(id) on delete set null;

create index if not exists ix_class_students_primary_teacher
    on public.class_students(primary_teacher_id);

-- Backfill: where a class has exactly one teacher, set that as primary
-- for any students currently unassigned.
update public.class_students cs
   set primary_teacher_id = ct.teacher_id
  from (
        select class_id, max(teacher_id) as teacher_id, count(*) as n
          from public.class_teachers
         group by class_id
       ) ct
 where cs.class_id = ct.class_id
   and ct.n = 1
   and cs.primary_teacher_id is null;

-- For multi-teacher classes, set the LEAD teacher (if any) as default
update public.class_students cs
   set primary_teacher_id = lt.teacher_id
  from (select class_id, teacher_id from public.class_teachers where is_lead = true) lt
 where cs.class_id = lt.class_id
   and cs.primary_teacher_id is null;

do $$ begin raise notice 'OK — class_students.primary_teacher_id added and backfilled where possible'; end $$;
