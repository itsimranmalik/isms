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

-- =====================================================================
-- Seed: surahs (Al-Fatihah + Juz Amma), duas (daily + namaz), subjects, settings.
-- Run AFTER 01_schema.sql.
-- =====================================================================

insert into public.subjects (code, name, module_type) values
    ('QURAN','Quran Recitation','quran_recitation'),
    ('HIFZ','Memorisation (Hifz)','memorisation'),
    ('DUAD','Daily Duas','daily_duas'),
    ('DUAN','Namaz Duas','namaz_duas'),
    ('AKHL','Akhlaq & Adab','general'),
    ('ARAB','Arabic Language','general')
on conflict (code) do nothing;

insert into public.settings (id, school_name) values (1, 'My Madrasa')
on conflict (id) do nothing;

insert into public.surahs (number, name_arabic, name_transliteration, name_english, total_ayahs, juz_start) values
    (1,  'الفاتحة',   'Al-Fatihah',     'The Opening',           7,  1),
    (78, 'النبأ',     'An-Naba',        'The Announcement',     40, 30),
    (79, 'النازعات',  'An-Naziat',      'Those Who Pull Out',   46, 30),
    (80, 'عبس',       'Abasa',          'He Frowned',           42, 30),
    (81, 'التكوير',   'At-Takwir',      'The Folding Up',       29, 30),
    (82, 'الانفطار',  'Al-Infitar',     'The Cleaving',         19, 30),
    (83, 'المطففين',  'Al-Mutaffifin',  'Defrauding',           36, 30),
    (84, 'الانشقاق',  'Al-Inshiqaq',    'The Splitting Asunder',25, 30),
    (85, 'البروج',    'Al-Buruj',       'The Constellations',   22, 30),
    (86, 'الطارق',    'At-Tariq',       'The Night-Comer',      17, 30),
    (87, 'الأعلى',    'Al-Ala',         'The Most High',        19, 30),
    (88, 'الغاشية',   'Al-Ghashiyah',   'The Overwhelming',     26, 30),
    (89, 'الفجر',     'Al-Fajr',        'The Dawn',             30, 30),
    (90, 'البلد',     'Al-Balad',       'The City',             20, 30),
    (91, 'الشمس',     'Ash-Shams',      'The Sun',              15, 30),
    (92, 'الليل',     'Al-Layl',        'The Night',            21, 30),
    (93, 'الضحى',     'Ad-Duha',        'The Forenoon',         11, 30),
    (94, 'الشرح',     'Ash-Sharh',      'The Opening Forth',     8, 30),
    (95, 'التين',     'At-Tin',         'The Fig',               8, 30),
    (96, 'العلق',     'Al-Alaq',        'The Clot',             19, 30),
    (97, 'القدر',     'Al-Qadr',        'The Night of Decree',   5, 30),
    (98, 'البينة',    'Al-Bayyinah',    'The Clear Evidence',    8, 30),
    (99, 'الزلزلة',   'Az-Zalzalah',    'The Earthquake',        8, 30),
    (100,'العاديات',  'Al-Adiyat',      'The Courser',          11, 30),
    (101,'القارعة',   'Al-Qariah',      'The Striking Hour',    11, 30),
    (102,'التكاثر',   'At-Takathur',    'The Piling Up',         8, 30),
    (103,'العصر',     'Al-Asr',         'The Time',              3, 30),
    (104,'الهمزة',    'Al-Humazah',     'The Slanderer',         9, 30),
    (105,'الفيل',     'Al-Fil',         'The Elephant',          5, 30),
    (106,'قريش',      'Quraysh',        'Quraysh',               4, 30),
    (107,'الماعون',   'Al-Maun',        'The Small Kindness',    7, 30),
    (108,'الكوثر',    'Al-Kawthar',     'Abundance',             3, 30),
    (109,'الكافرون',  'Al-Kafirun',     'The Disbelievers',      6, 30),
    (110,'النصر',     'An-Nasr',        'The Help',              3, 30),
    (111,'المسد',     'Al-Masad',       'The Palm Fibre',        5, 30),
    (112,'الإخلاص',   'Al-Ikhlas',      'Sincerity',             4, 30),
    (113,'الفلق',     'Al-Falaq',       'The Daybreak',          5, 30),
    (114,'الناس',     'An-Nas',         'Mankind',               6, 30)
on conflict (number) do nothing;

insert into public.duas (category, title, arabic_text, transliteration, translation, sort_order) values
    ('daily','Before Eating',    'بِسْمِ اللَّهِ',                                 'Bismillah',                              'In the name of Allah',                                      1),
    ('daily','After Eating',     'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا','Alhamdulillah-illadhi at''amana wa saqana','Praise be to Allah who fed us and gave us drink',          2),
    ('daily','Before Sleep',     'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',         'Bismika Allahumma amutu wa ahya',        'In Your name O Allah, I die and I live',                    3),
    ('daily','Waking Up',        'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا',            'Alhamdulillah-illadhi ahyana',           'Praise be to Allah who gave us life',                       4),
    ('daily','Entering Bathroom','اللَّهُمَّ إِنِّي أَعُوذُ بِكَ',                  'Allahumma inni a''udhu bika',            'O Allah, I seek refuge in You',                             5),
    ('daily','Leaving Home',     'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ',        'Bismillahi tawakkaltu ''ala-llah',       'In the name of Allah, I trust in Allah',                    6),
    ('namaz','Niyyah (Intention)','نَوَيْتُ',                                       'Nawaytu',                                'I intend...',                                                7),
    ('namaz','Takbir',           'اللَّهُ أَكْبَرُ',                                'Allahu Akbar',                           'Allah is the Greatest',                                     8),
    ('namaz','Thana (Subhanaka)','سُبْحَانَكَ اللَّهُمَّ',                          'Subhanaka Allahumma',                    'Glory be to You, O Allah',                                  9),
    ('namaz','Ruku Tasbeeh',     'سُبْحَانَ رَبِّيَ الْعَظِيمِ',                     'Subhana Rabbiyal Adheem',                'Glory be to my Lord, the Most Great',                       10),
    ('namaz','Sajdah Tasbeeh',   'سُبْحَانَ رَبِّيَ الْأَعْلَى',                     'Subhana Rabbiyal A''la',                 'Glory be to my Lord, the Most High',                        11),
    ('namaz','Tashahhud',        'التَّحِيَّاتُ لِلَّهِ',                            'At-tahiyyatu lillah',                    'All greetings are for Allah',                              12),
    ('namaz','Durood Ibrahim',   'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',                  'Allahumma salli ''ala Muhammad',         'O Allah, send blessings upon Muhammad',                    13),
    ('namaz','Dua after Tashahhud','اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي',              'Allahumma inni dhalamtu nafsi',          'O Allah, I have wronged myself',                           14),
    ('namaz','Salam',            'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',         'As-salamu ''alaykum wa rahmatullah',     'Peace and mercy of Allah be upon you',                     15);
