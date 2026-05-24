-- =====================================================================
-- Migration: allow teachers to enrol/unenrol students in classes
--            they are assigned to teach.
--
-- Teacher-assignment (class_teachers) remains admin-only — teachers
-- cannot add other teachers to classes.
--
-- Run after 01-03 SQL files.
-- =====================================================================

-- 1. Drop the old admin-only policy
drop policy if exists "class_students admin write" on public.class_students;

-- 2. New policy: admin OR a teacher who teaches this class
create policy "class_students admin or own class teacher write"
    on public.class_students
    for all
    using (
        public.is_admin()
        or exists (
            select 1
              from public.class_teachers ct
             where ct.class_id   = class_students.class_id
               and ct.teacher_id = public.my_teacher_id()
        )
    )
    with check (
        public.is_admin()
        or exists (
            select 1
              from public.class_teachers ct
             where ct.class_id   = class_students.class_id
               and ct.teacher_id = public.my_teacher_id()
        )
    );

-- Sanity: confirm the policy exists
do $$ begin
    if not exists (
        select 1 from pg_policies
         where schemaname = 'public'
           and tablename  = 'class_students'
           and policyname = 'class_students admin or own class teacher write'
    ) then
        raise exception 'Policy was not created';
    end if;
    raise notice 'OK — teachers can now enrol students in classes they teach';
end $$;
