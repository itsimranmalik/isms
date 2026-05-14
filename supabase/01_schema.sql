-- =====================================================================
-- Islamic School Management — Supabase Postgres schema
-- Run order: 01_schema.sql -> 02_rls.sql -> 03_seed.sql
-- =====================================================================

-- Enable required extensions ---------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- profiles  (1:1 with auth.users — role + name + linked entity ids)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
    id            uuid primary key references auth.users(id) on delete cascade,
    role          text not null check (role in ('admin','teacher','student','parent')),
    full_name     text not null,
    phone         text,
    avatar_url    text,
    student_id    bigint,   -- back-reference set later
    teacher_id    bigint,   -- back-reference set later
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------
create table if not exists public.students (
    id              bigserial primary key,
    user_id         uuid references auth.users(id) on delete set null,
    student_code    text not null unique,
    first_name      text not null,
    last_name       text not null,
    date_of_birth   date,
    gender          text,
    guardian_name   text,
    guardian_phone  text,
    guardian_email  text,
    address         text,
    photo_url       text,
    enrolled_on     date,
    status          text not null default 'active',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index if not exists ix_students_status on public.students(status);
create index if not exists ix_students_user   on public.students(user_id);
create trigger trg_students_updated_at before update on public.students for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- teachers
-- ---------------------------------------------------------------------
create table if not exists public.teachers (
    id              bigserial primary key,
    user_id         uuid not null references auth.users(id) on delete cascade,
    staff_code      text not null unique,
    first_name      text not null,
    last_name       text not null,
    phone           text,
    email           text,
    qualifications  text,
    photo_url       text,
    joined_on       date,
    status          text not null default 'active',
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index if not exists ix_teachers_user on public.teachers(user_id);
create trigger trg_teachers_updated_at before update on public.teachers for each row execute function public.set_updated_at();

-- Now wire the profiles -> students/teachers FKs ------------------------
alter table public.profiles
    add constraint fk_profiles_student foreign key (student_id) references public.students(id) on delete set null,
    add constraint fk_profiles_teacher foreign key (teacher_id) references public.teachers(id) on delete set null;

-- ---------------------------------------------------------------------
-- academic sessions
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
    id          bigserial primary key,
    name        text not null,
    starts_on   date not null,
    ends_on     date not null,
    is_current  boolean not null default false,
    created_at  timestamptz not null default now()
);
create index if not exists ix_sessions_current on public.sessions(is_current);

-- ---------------------------------------------------------------------
-- classes + pivot tables
-- ---------------------------------------------------------------------
create table if not exists public.classes (
    id          bigserial primary key,
    session_id  bigint references public.sessions(id) on delete set null,
    name        text not null,
    level       text,
    description text,
    created_at  timestamptz not null default now()
);

create table if not exists public.class_teachers (
    class_id    bigint references public.classes(id) on delete cascade,
    teacher_id  bigint references public.teachers(id) on delete cascade,
    is_lead     boolean not null default false,
    assigned_at timestamptz not null default now(),
    primary key (class_id, teacher_id)
);

create table if not exists public.class_students (
    class_id    bigint references public.classes(id) on delete cascade,
    student_id  bigint references public.students(id) on delete cascade,
    enrolled_at timestamptz not null default now(),
    primary key (class_id, student_id)
);

-- ---------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------
create table if not exists public.subjects (
    id          bigserial primary key,
    code        text not null unique,
    name        text not null,
    module_type text not null default 'general',
    description text
);

-- ---------------------------------------------------------------------
-- assessments + Quran recitation grades (0-5 per category)
-- ---------------------------------------------------------------------
create table if not exists public.assessments (
    id             bigserial primary key,
    student_id     bigint not null references public.students(id) on delete cascade,
    teacher_id     bigint not null references public.teachers(id) on delete cascade,
    class_id       bigint references public.classes(id) on delete set null,
    module_type    text not null,                  -- quran_recitation | memorisation | daily_duas | namaz_duas
    assessed_on    date not null,
    overall_score  numeric(5,2),
    overall_grade  text,
    comments       text,
    created_at     timestamptz not null default now()
);
create index if not exists ix_assessments_student_module on public.assessments(student_id, module_type, assessed_on desc);
create index if not exists ix_assessments_teacher        on public.assessments(teacher_id);
create index if not exists ix_assessments_class          on public.assessments(class_id);

create table if not exists public.quran_recitation_grades (
    id              bigserial primary key,
    assessment_id   bigint not null unique references public.assessments(id) on delete cascade,
    surah_id        bigint,
    ayah_from       smallint,
    ayah_to         smallint,
    fluency         smallint not null check (fluency  between 0 and 5),
    makharij        smallint not null check (makharij between 0 and 5),
    tajweed         smallint not null check (tajweed  between 0 and 5),
    waqf            smallint not null check (waqf     between 0 and 5),
    accuracy        smallint not null check (accuracy between 0 and 5),
    average_score   numeric(4,2) not null,
    grade_label     text not null,
    weaknesses      jsonb,
    recommendations jsonb
);

-- ---------------------------------------------------------------------
-- surahs + memorisation
-- ---------------------------------------------------------------------
create table if not exists public.surahs (
    id                   bigserial primary key,
    number               smallint not null unique,
    name_arabic          text not null,
    name_transliteration text not null,
    name_english         text,
    total_ayahs          smallint not null,
    juz_start            smallint
);

create table if not exists public.memorisation_progress (
    id               bigserial primary key,
    student_id       bigint not null references public.students(id) on delete cascade,
    surah_id         bigint not null references public.surahs(id) on delete restrict,
    ayahs_memorised  smallint not null default 0,
    status           text not null default 'in_progress',  -- not_started | in_progress | completed
    last_revised_on  date,
    quality_score    smallint check (quality_score between 0 and 5),
    teacher_id       bigint references public.teachers(id) on delete set null,
    notes            text,
    updated_at       timestamptz not null default now(),
    unique (student_id, surah_id)
);
create index if not exists ix_memo_progress_status on public.memorisation_progress(status);

create table if not exists public.memorisation_revisions (
    id            bigserial primary key,
    progress_id   bigint not null references public.memorisation_progress(id) on delete cascade,
    revised_on    date not null,
    quality_score smallint not null check (quality_score between 0 and 5),
    teacher_id    bigint not null references public.teachers(id) on delete cascade,
    comments      text
);

-- ---------------------------------------------------------------------
-- duas (daily + namaz)
-- ---------------------------------------------------------------------
create table if not exists public.duas (
    id              bigserial primary key,
    category        text not null,  -- daily | namaz
    title           text not null,
    arabic_text     text,
    transliteration text,
    translation     text,
    sort_order      smallint not null default 0
);
create index if not exists ix_duas_category on public.duas(category);

create table if not exists public.dua_progress (
    id                bigserial primary key,
    student_id        bigint not null references public.students(id) on delete cascade,
    dua_id            bigint not null references public.duas(id) on delete cascade,
    status            text not null default 'pending', -- pending | in_progress | completed
    score             smallint check (score between 0 and 5),
    tajweed_verified  boolean not null default false,
    teacher_id        bigint references public.teachers(id) on delete set null,
    assessed_on       date,
    comments          text,
    unique (student_id, dua_id)
);

-- ---------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
    id           bigserial primary key,
    student_id   bigint not null references public.students(id) on delete cascade,
    class_id     bigint not null references public.classes(id)  on delete cascade,
    attended_on  date not null,
    status       text not null check (status in ('present','absent','late','excused')),
    recorded_by  bigint references public.teachers(id) on delete set null,
    note         text,
    unique (student_id, class_id, attended_on)
);
create index if not exists ix_attendance_class_day on public.attendance(class_id, attended_on);

-- ---------------------------------------------------------------------
-- announcements + notifications + audit
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
    id            bigserial primary key,
    title         text not null,
    body          text not null,
    audience      text not null default 'all',   -- all | students | teachers | parents
    published_at  timestamptz not null default now(),
    author_id     uuid references auth.users(id) on delete set null
);

create table if not exists public.notifications (
    id          bigserial primary key,
    user_id     uuid not null references auth.users(id) on delete cascade,
    title       text not null,
    body        text,
    link        text,
    is_read     boolean not null default false,
    created_at  timestamptz not null default now()
);

create table if not exists public.audit_logs (
    id           bigserial primary key,
    actor_id     uuid references auth.users(id) on delete set null,
    action       text not null,
    object_type  text not null,
    object_id    bigint,
    meta         jsonb,
    ip_address   text,
    user_agent   text,
    created_at   timestamptz not null default now()
);
create index if not exists ix_audit_actor  on public.audit_logs(actor_id, created_at);
create index if not exists ix_audit_object on public.audit_logs(object_type, object_id);

-- ---------------------------------------------------------------------
-- school settings  (single-row table for simplicity)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
    id           int primary key default 1 check (id = 1),
    school_name  text not null default 'My Madrasa',
    logo_url     text,
    address      text,
    phone        text,
    email        text,
    theme        text not null default 'light',
    updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Auto-create profile row on new auth.user signup
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, role, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'role', 'student'),
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))
    )
    on conflict (id) do nothing;
    return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
