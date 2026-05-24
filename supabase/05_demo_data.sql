-- =====================================================================
-- DEMO dataset: 3 teachers, 12 students, 3 classes, enrolments,
-- assessments, memorisation progress, dua progress, attendance.
-- Idempotent on the unique columns (student_code, staff_code, class name+level).
-- Safe to re-run; will skip rows that already exist.
-- =====================================================================

-- ----- Teachers (3) ---------------------------------------------------
insert into public.teachers (staff_code, first_name, last_name, phone, email, qualifications, joined_on, status)
values
    ('T001', 'Ahmed',    'Khan',    '+44 7000 000001', 'ahmed.khan@madrasa.local',   'BA Islamic Studies, 8 yrs teaching', '2022-09-01', 'active'),
    ('T002', 'Fatima',   'Hussain', '+44 7000 000002', 'fatima.h@madrasa.local',     'MA Quran Studies, Hifz certified',   '2023-01-15', 'active'),
    ('T003', 'Yusuf',    'Patel',   '+44 7000 000003', 'yusuf.p@madrasa.local',      'Ijazah in Tajweed, 12 yrs',          '2021-06-10', 'active')
on conflict (staff_code) do nothing;

-- ----- Students (12) --------------------------------------------------
insert into public.students (student_code, first_name, last_name, date_of_birth, gender, guardian_name, guardian_phone, guardian_email, enrolled_on, status) values
    ('S001', 'Aisha',   'Malik',     '2015-03-12', 'Female', 'Imran Malik',    '+44 7100 000001', 'imran.malik@example.com',    '2024-09-01', 'active'),
    ('S002', 'Bilal',   'Ahmed',     '2014-07-22', 'Male',   'Tariq Ahmed',    '+44 7100 000002', 'tariq.ahmed@example.com',    '2024-09-01', 'active'),
    ('S003', 'Maryam',  'Khan',      '2015-11-05', 'Female', 'Sara Khan',      '+44 7100 000003', 'sara.k@example.com',         '2024-09-01', 'active'),
    ('S004', 'Ibrahim', 'Hassan',    '2014-02-18', 'Male',   'Hassan Ali',     '+44 7100 000004', 'hassan.ali@example.com',     '2024-09-01', 'active'),
    ('S005', 'Zainab',  'Ali',       '2013-09-30', 'Female', 'Mohammed Ali',   '+44 7100 000005', 'mali@example.com',           '2024-09-01', 'active'),
    ('S006', 'Yusuf',   'Rahman',    '2012-12-04', 'Male',   'Abdul Rahman',   '+44 7100 000006', 'a.rahman@example.com',       '2023-09-01', 'active'),
    ('S007', 'Khadija', 'Iqbal',     '2012-05-17', 'Female', 'Nadia Iqbal',    '+44 7100 000007', 'n.iqbal@example.com',        '2023-09-01', 'active'),
    ('S008', 'Hamza',   'Sheikh',    '2013-08-21', 'Male',   'Bashir Sheikh',  '+44 7100 000008', 'b.sheikh@example.com',       '2023-09-01', 'active'),
    ('S009', 'Safiyah', 'Bukhari',   '2012-01-09', 'Female', 'Yasmin Bukhari', '+44 7100 000009', 'y.bukhari@example.com',      '2023-09-01', 'active'),
    ('S010', 'Omar',    'Farooq',    '2010-04-14', 'Male',   'Khalid Farooq',  '+44 7100 000010', 'k.farooq@example.com',       '2022-09-01', 'active'),
    ('S011', 'Ruqaiya', 'Mahmood',   '2010-10-26', 'Female', 'Salma Mahmood',  '+44 7100 000011', 'salma.m@example.com',        '2022-09-01', 'active'),
    ('S012', 'Abdullah','Siddiqui',  '2011-06-08', 'Male',   'Asif Siddiqui',  '+44 7100 000012', 'a.siddiqui@example.com',     '2022-09-01', 'active')
on conflict (student_code) do nothing;

-- ----- Classes (3) ----------------------------------------------------
do $$
begin
    if not exists (select 1 from public.classes where name = 'Beginner Quran') then
        insert into public.classes (name, level, description)
        values ('Beginner Quran', 'Beginner', 'Foundational recitation for new learners');
    end if;
    if not exists (select 1 from public.classes where name = 'Intermediate Hifz') then
        insert into public.classes (name, level, description)
        values ('Intermediate Hifz', 'Intermediate', 'Surah memorisation track');
    end if;
    if not exists (select 1 from public.classes where name = 'Advanced Tajweed') then
        insert into public.classes (name, level, description)
        values ('Advanced Tajweed', 'Advanced', 'Advanced Tajweed rules and recitation polish');
    end if;
end $$;

-- ----- Teacher assignments -------------------------------------------
insert into public.class_teachers (class_id, teacher_id, is_lead)
select c.id, t.id, true
from public.classes c, public.teachers t
where c.name = 'Beginner Quran' and t.staff_code = 'T001'
on conflict do nothing;

insert into public.class_teachers (class_id, teacher_id, is_lead)
select c.id, t.id, false
from public.classes c, public.teachers t
where c.name = 'Beginner Quran' and t.staff_code = 'T002'
on conflict do nothing;

insert into public.class_teachers (class_id, teacher_id, is_lead)
select c.id, t.id, true
from public.classes c, public.teachers t
where c.name = 'Intermediate Hifz' and t.staff_code = 'T002'
on conflict do nothing;

insert into public.class_teachers (class_id, teacher_id, is_lead)
select c.id, t.id, true
from public.classes c, public.teachers t
where c.name = 'Advanced Tajweed' and t.staff_code = 'T003'
on conflict do nothing;

-- ----- Enrolments ----------------------------------------------------
-- Beginner Quran: S001-S005
insert into public.class_students (class_id, student_id)
select c.id, s.id
from public.classes c, public.students s
where c.name = 'Beginner Quran' and s.student_code in ('S001','S002','S003','S004','S005')
on conflict do nothing;

-- Intermediate Hifz: S005-S009 (Zainab is in both)
insert into public.class_students (class_id, student_id)
select c.id, s.id
from public.classes c, public.students s
where c.name = 'Intermediate Hifz' and s.student_code in ('S005','S006','S007','S008','S009')
on conflict do nothing;

-- Advanced Tajweed: S010-S012
insert into public.class_students (class_id, student_id)
select c.id, s.id
from public.classes c, public.students s
where c.name = 'Advanced Tajweed' and s.student_code in ('S010','S011','S012')
on conflict do nothing;

-- ----- Quran Recitation assessments (last 30 days) -------------------
-- Helper: insert assessment + matching detail grade in one go
do $$
declare
    s_id  bigint;
    t_id  bigint;
    c_id  bigint;
    sur_id bigint;
    a_id  bigint;
    -- assessment rows: code, teacher, class, days_ago, sur#, fl, ma, ta, wa, ac
    rows  text[][] := array[
        array['S001','T001','Beginner Quran',   '20', '1',  '4','4','3','5','4'],
        array['S002','T001','Beginner Quran',   '20', '1',  '3','4','3','3','3'],
        array['S003','T001','Beginner Quran',   '14', '1',  '5','5','4','5','5'],
        array['S004','T002','Beginner Quran',   '14', '1',  '2','3','2','3','3'],
        array['S005','T002','Intermediate Hifz', '7', '78', '4','4','4','4','5'],
        array['S006','T002','Intermediate Hifz', '7', '79', '5','5','5','5','5'],
        array['S007','T002','Intermediate Hifz', '5', '80', '3','3','3','4','3'],
        array['S010','T003','Advanced Tajweed',  '3', '93', '5','5','5','5','5'],
        array['S011','T003','Advanced Tajweed',  '3', '93', '4','5','4','5','4'],
        array['S012','T003','Advanced Tajweed',  '2', '93', '4','4','4','4','4']
    ];
    r text[];
    fl int; ma int; ta int; wa int; ac int;
    avg numeric;
    grade_label text;
begin
    foreach r slice 1 in array rows loop
        select id into s_id  from public.students where student_code = r[1];
        select id into t_id  from public.teachers where staff_code   = r[2];
        select id into c_id  from public.classes  where name         = r[3];
        select id into sur_id from public.surahs  where number       = r[5]::int;
        if s_id is null or t_id is null or c_id is null then continue; end if;

        fl := r[6]::int; ma := r[7]::int; ta := r[8]::int; wa := r[9]::int; ac := r[10]::int;
        avg := round((fl + ma + ta + wa + ac)::numeric / 5.0, 2);
        grade_label := case
            when avg >= 4.5 then 'Excellent'
            when avg >= 3.5 then 'Good'
            when avg >= 2.5 then 'Satisfactory'
            when avg >= 1.5 then 'Weak'
            when avg >= 0.5 then 'Very Weak'
            else 'Not Attempted'
        end;

        -- skip if we already have an assessment for this student on that date
        if exists (
            select 1 from public.assessments
             where student_id = s_id
               and module_type = 'quran_recitation'
               and assessed_on = (current_date - (r[4]::int))
        ) then continue; end if;

        insert into public.assessments (student_id, teacher_id, class_id, module_type, assessed_on, overall_score, overall_grade, comments)
        values (s_id, t_id, c_id, 'quran_recitation', current_date - (r[4]::int), avg, grade_label,
                'Demo assessment for ' || r[1])
        returning id into a_id;

        insert into public.quran_recitation_grades
            (assessment_id, surah_id, fluency, makharij, tajweed, waqf, accuracy, average_score, grade_label)
        values (a_id, sur_id, fl, ma, ta, wa, ac, avg, grade_label);
    end loop;
end $$;

-- ----- Memorisation progress ----------------------------------------
-- A few students have completed Al-Fatihah, others in progress on shorter Juz Amma surahs
insert into public.memorisation_progress (student_id, surah_id, ayahs_memorised, status, quality_score, teacher_id, last_revised_on)
select s.id, sur.id, sur.total_ayahs, 'completed', 5, t.id, current_date - 10
from public.students s, public.surahs sur, public.teachers t
where s.student_code in ('S005','S006','S010','S011','S012') and sur.number = 1 and t.staff_code = 'T002'
on conflict (student_id, surah_id) do nothing;

insert into public.memorisation_progress (student_id, surah_id, ayahs_memorised, status, quality_score, teacher_id, last_revised_on)
select s.id, sur.id, 3, 'in_progress', 3, t.id, current_date - 5
from public.students s, public.surahs sur, public.teachers t
where s.student_code in ('S001','S002','S003') and sur.number = 108 and t.staff_code = 'T001'
on conflict (student_id, surah_id) do nothing;

insert into public.memorisation_progress (student_id, surah_id, ayahs_memorised, status, quality_score, teacher_id, last_revised_on)
select s.id, sur.id, sur.total_ayahs, 'completed', 5, t.id, current_date - 7
from public.students s, public.surahs sur, public.teachers t
where s.student_code = 'S006' and sur.number in (108, 109, 110, 111, 112, 113, 114) and t.staff_code = 'T002'
on conflict (student_id, surah_id) do nothing;

-- ----- Dua progress -------------------------------------------------
insert into public.dua_progress (student_id, dua_id, status, score, tajweed_verified, teacher_id, assessed_on)
select s.id, d.id, 'completed', 5, true, t.id, current_date - 4
from public.students s, public.duas d, public.teachers t
where s.student_code in ('S005','S006','S010','S011') and d.category = 'namaz' and t.staff_code = 'T002'
on conflict (student_id, dua_id) do nothing;

insert into public.dua_progress (student_id, dua_id, status, score, tajweed_verified, teacher_id, assessed_on)
select s.id, d.id, 'in_progress', 3, false, t.id, current_date - 3
from public.students s, public.duas d, public.teachers t
where s.student_code in ('S001','S002','S003','S004') and d.category = 'daily' and t.staff_code = 'T001'
on conflict (student_id, dua_id) do nothing;

-- ----- Attendance (last 5 weekdays) ---------------------------------
do $$
declare
    s_codes text[] := array['S001','S002','S003','S004','S005','S006','S007','S008','S009','S010','S011','S012'];
    s_code text;
    d_offset int;
    s_id bigint; c_id bigint; t_id bigint;
    status_pick text;
begin
    foreach s_code in array s_codes loop
        select s.id, ct.class_id, ct.teacher_id
          into s_id, c_id, t_id
          from public.students s
          join public.class_students cs on cs.student_id = s.id
          join public.class_teachers ct on ct.class_id   = cs.class_id and ct.is_lead = true
         where s.student_code = s_code
         limit 1;
        if c_id is null then continue; end if;

        for d_offset in 1..5 loop
            status_pick := case
                when random() < 0.85 then 'present'
                when random() < 0.5  then 'late'
                when random() < 0.5  then 'excused'
                else 'absent'
            end;
            insert into public.attendance (student_id, class_id, attended_on, status, recorded_by)
            values (s_id, c_id, current_date - d_offset, status_pick, t_id)
            on conflict (student_id, class_id, attended_on) do nothing;
        end loop;
    end loop;
end $$;

-- ----- Done ----------------------------------------------------------
do $$
begin
    raise notice '== Demo data loaded ==';
    raise notice 'Teachers: %', (select count(*) from public.teachers);
    raise notice 'Students: %', (select count(*) from public.students);
    raise notice 'Classes:  %', (select count(*) from public.classes);
    raise notice 'Assessments: %', (select count(*) from public.assessments);
end $$;
