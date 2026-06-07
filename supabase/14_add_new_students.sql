-- =====================================================================
-- 14_add_new_students.sql
--
-- Six students were tagged "New" in "Qaidah Quran Split.csv" but were
-- missing from the original production roster (09_production_data.sql):
--
--    1151  Nadeem        Smith         B1A   Qaidah
--    1152  Abdul Kareem  Smith         B1A   Qaidah
--     983  Abira         Alam          G5    Juz Amm, 1, 2
--    1066  Manahil       Abbas         G5    Quran
--    1082  Samiya        Nasir         G5    Juz Amm, 1, 2
--    1083  Sehrish       Nasir         G5    Juz Amm, 1, 2
--
-- This migration:
--   1) Inserts the 6 students with stage + (no page = NULL for "New").
--   2) Enrols them in their class (no primary teacher set yet — admin can
--      assign one from the Classes screen).
--   3) Creates a login for each: username = student_code, password = Madrasa@123.
--
-- Re-runnable: skips inserts when student_code already exists; skips auth
-- users when the email is already taken.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- 1) Insert students --------------------------------------
insert into public.students (student_code, first_name, last_name, reading_stage, qaidah_page, status)
values
    ('1151', 'Nadeem',        'Smith',  'qaidah', null, 'active'),
    ('1152', 'Abdul Kareem',  'Smith',  'qaidah', null, 'active'),
    ('983',  'Abira',         'Alam',   'juz',    null, 'active'),
    ('1066', 'Manahil',       'Abbas',  'quran',  null, 'active'),
    ('1082', 'Samiya',        'Nasir',  'juz',    null, 'active'),
    ('1083', 'Sehrish',       'Nasir',  'juz',    null, 'active')
on conflict (student_code) do update set
    first_name    = excluded.first_name,
    last_name     = excluded.last_name,
    reading_stage = excluded.reading_stage;

-- ---------- 2) Enrol in classes -------------------------------------
-- B1A students
insert into public.class_students (class_id, student_id)
select (select id from public.classes where name = 'B1A'),
       (select id from public.students where student_code = '1151')
where not exists (
    select 1 from public.class_students
     where class_id   = (select id from public.classes where name = 'B1A')
       and student_id = (select id from public.students where student_code = '1151')
);
insert into public.class_students (class_id, student_id)
select (select id from public.classes where name = 'B1A'),
       (select id from public.students where student_code = '1152')
where not exists (
    select 1 from public.class_students
     where class_id   = (select id from public.classes where name = 'B1A')
       and student_id = (select id from public.students where student_code = '1152')
);
-- G5 students
insert into public.class_students (class_id, student_id)
select (select id from public.classes where name = 'G5'),
       (select id from public.students where student_code = c)
  from (values ('983'), ('1066'), ('1082'), ('1083')) as v(c)
where not exists (
    select 1 from public.class_students
     where class_id   = (select id from public.classes where name = 'G5')
       and student_id = (select id from public.students where student_code = v.c)
);

-- ---------- 3) Create logins ----------------------------------------
do $$
declare
    rec  record;
    uid  uuid;
    pwd  text;
    domain text := 'madrasa.local';
    n    int := 0;
begin
    pwd := crypt('Madrasa@123', gen_salt('bf', 10));

    for rec in
        select s.id, s.student_code,
               coalesce(nullif(trim(concat_ws(' ', s.first_name, nullif(s.last_name, '-'))), ''), s.first_name, 'Unnamed') as full_name
          from public.students s
         where s.student_code in ('1151','1152','983','1066','1082','1083')
           and s.user_id is null
    loop
        -- Skip if an auth user already exists with this email
        if exists (select 1 from auth.users where email = rec.student_code || '@' || domain) then
            continue;
        end if;

        uid := gen_random_uuid();

        insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at, is_anonymous
        ) values (
            '00000000-0000-0000-0000-000000000000', uid,
            'authenticated', 'authenticated',
            rec.student_code || '@' || domain, pwd,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', rec.full_name, 'role', 'student'),
            now(), now(), false
        );

        insert into auth.identities (
            id, user_id, provider, provider_id, identity_data,
            last_sign_in_at, created_at, updated_at
        ) values (
            gen_random_uuid(), uid, 'email', rec.student_code || '@' || domain,
            jsonb_build_object(
                'sub',            uid::text,
                'email',          rec.student_code || '@' || domain,
                'email_verified', true,
                'phone_verified', false
            ),
            now(), now(), now()
        );

        insert into public.profiles (id, role, full_name, student_id)
        values (uid, 'student', rec.full_name, rec.id)
        on conflict (id) do update set
            role       = 'student',
            full_name  = excluded.full_name,
            student_id = excluded.student_id;

        update public.students set user_id = uid where id = rec.id;
        n := n + 1;
    end loop;

    raise notice 'Logins created for % new students.', n;
end $$;

do $$ begin
    raise notice 'OK -- new students loaded. Total students now: %',
        (select count(*) from public.students);
end $$;
