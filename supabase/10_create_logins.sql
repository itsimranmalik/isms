-- =====================================================================
-- Bulk-create logins for every teacher + student loaded in 09_production_data.sql.
--
--   Username = staff_code (for teachers) / student_code (for students)
--   Password = Madrasa@123 (everyone)
--
-- Internally the username is stored as "<code>@madrasa.local" so the
-- existing auth flow + login page just work — users only ever see the
-- numeric code as their username.
--
-- Run AFTER 09_production_data.sql. Re-runnable: existing auth users with
-- the same email are skipped.
-- =====================================================================

-- pgcrypto is needed for bcrypt password hashing (already enabled in 01_schema.sql)
create extension if not exists "pgcrypto";

do $$
declare
    rec  record;
    uid  uuid;
    pwd  text;
    domain  text := 'madrasa.local';
    n_t  int  := 0;
    n_s  int  := 0;
    n_k  int  := 0;
begin
    -- Hash the shared password ONCE. bcrypt cost 10 = ~50 ms; we'd hate to repeat 417 times.
    pwd := crypt('Madrasa@123', gen_salt('bf', 10));

    -- ---------------- Teachers -----------------------------------------
    for rec in
        select id, staff_code,
               coalesce(nullif(trim(concat_ws(' ', first_name, nullif(last_name, '-'))), ''), first_name, 'Unnamed') as full_name
          from public.teachers
         where user_id is null
         order by staff_code
    loop
        if exists (select 1 from auth.users
                    where email = rec.staff_code || '@' || domain) then
            n_k := n_k + 1;
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
            rec.staff_code || '@' || domain, pwd,
            now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('full_name', rec.full_name, 'role', 'teacher'),
            now(), now(), false
        );

        insert into auth.identities (
            id, user_id, provider, provider_id, identity_data,
            last_sign_in_at, created_at, updated_at
        ) values (
            -- IMPORTANT: provider_id must equal the email for newer GoTrue versions.
            gen_random_uuid(), uid, 'email', rec.staff_code || '@' || domain,
            jsonb_build_object(
                'sub', uid::text,
                'email', rec.staff_code || '@' || domain,
                'email_verified', true,
                'phone_verified', false
            ),
            now(), now(), now()
        );

        -- The handle_new_user trigger may have inserted a default profile —
        -- upsert to make sure role + teacher_id are correct.
        insert into public.profiles (id, role, full_name, teacher_id)
        values (uid, 'teacher', rec.full_name, rec.id)
        on conflict (id) do update set
            role = 'teacher',
            full_name = excluded.full_name,
            teacher_id = excluded.teacher_id;

        update public.teachers set user_id = uid where id = rec.id;
        n_t := n_t + 1;
    end loop;

    -- ---------------- Students -----------------------------------------
    for rec in
        select id, student_code,
               coalesce(nullif(trim(concat_ws(' ', first_name, nullif(last_name, '-'))), ''), first_name, 'Unnamed') as full_name
          from public.students
         where user_id is null
         order by student_code
    loop
        if exists (select 1 from auth.users
                    where email = rec.student_code || '@' || domain) then
            n_k := n_k + 1;
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
            -- IMPORTANT: provider_id must equal the email for newer GoTrue versions.
            gen_random_uuid(), uid, 'email', rec.student_code || '@' || domain,
            jsonb_build_object(
                'sub', uid::text,
                'email', rec.student_code || '@' || domain,
                'email_verified', true,
                'phone_verified', false
            ),
            now(), now(), now()
        );

        insert into public.profiles (id, role, full_name, student_id)
        values (uid, 'student', rec.full_name, rec.id)
        on conflict (id) do update set
            role = 'student',
            full_name = excluded.full_name,
            student_id = excluded.student_id;

        update public.students set user_id = uid where id = rec.id;
        n_s := n_s + 1;
    end loop;

    raise notice 'Logins created: % teachers, % students.  Skipped (already had account): %', n_t, n_s, n_k;
end $$;
