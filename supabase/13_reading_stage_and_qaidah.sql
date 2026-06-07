-- =====================================================================
-- 13_reading_stage_and_qaidah.sql
--
--   1. students.reading_stage   — 'qaidah' | 'juz' | 'quran' (nullable)
--      students.qaidah_page     — current page (Qaidah / Juz students)
--
--   2. NEW TABLE: qaidah_grades — 4-category 0-5 scoring rubric used for
--      Qaidah AND Juz Amm, 1, 2 assessments.
--        letter_recognition  | joining_reading | makharij_tajweed | fluency_confidence
--      Total /20 ; average tracked too.
--
--   3. RLS — same model as quran_recitation_grades.
--
--   4. Bulk-load: 330 student updates from "Qaidah Quran Split.csv".
--
-- Re-runnable.
-- =====================================================================

-- ---------- 1) students.reading_stage + qaidah_page -----------------
alter table public.students
    add column if not exists reading_stage text check (reading_stage in ('qaidah','juz','quran')),
    add column if not exists qaidah_page   smallint check (qaidah_page is null or qaidah_page between 0 and 200);

create index if not exists ix_students_reading_stage on public.students(reading_stage);

-- ---------- 2) qaidah_grades table ----------------------------------
create table if not exists public.qaidah_grades (
    id                  bigserial primary key,
    assessment_id       bigint not null unique references public.assessments(id) on delete cascade,
    page_at_assessment  smallint,
    letter_recognition  smallint not null check (letter_recognition between 0 and 5),
    joining_reading     smallint not null check (joining_reading    between 0 and 5),
    makharij_tajweed    smallint not null check (makharij_tajweed   between 0 and 5),
    fluency_confidence  smallint not null check (fluency_confidence between 0 and 5),
    total_score         smallint not null,                    -- 0..20
    average_score       numeric(4,2) not null,
    grade_label         text not null,
    weaknesses          jsonb,
    recommendations     jsonb
);

-- ---------- 3) RLS for qaidah_grades --------------------------------
alter table public.qaidah_grades enable row level security;

drop policy if exists "Admin all on qaidah_grades"           on public.qaidah_grades;
drop policy if exists "Teacher reads qaidah_grades for own"  on public.qaidah_grades;
drop policy if exists "Teacher writes qaidah_grades for own" on public.qaidah_grades;
drop policy if exists "Student reads own qaidah_grades"     on public.qaidah_grades;

create policy "Admin all on qaidah_grades" on public.qaidah_grades
    for all
    using ((select role from public.profiles where id = auth.uid()) = 'admin')
    with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Teacher reads qaidah_grades for own" on public.qaidah_grades
    for select
    using (
        exists (
            select 1 from public.assessments a
              join public.teachers t on t.id = a.teacher_id
             where a.id = qaidah_grades.assessment_id
               and t.user_id = auth.uid()
        )
    );

create policy "Teacher writes qaidah_grades for own" on public.qaidah_grades
    for insert
    with check (
        exists (
            select 1 from public.assessments a
              join public.teachers t on t.id = a.teacher_id
             where a.id = qaidah_grades.assessment_id
               and t.user_id = auth.uid()
        )
    );

create policy "Student reads own qaidah_grades" on public.qaidah_grades
    for select
    using (
        exists (
            select 1 from public.assessments a
              join public.students s on s.id = a.student_id
             where a.id = qaidah_grades.assessment_id
               and s.user_id = auth.uid()
        )
    );

-- ---------- 4) Bulk-load reading_stage + qaidah_page -----------------
-- Matched on students.student_code = the ID column in the CSV.
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 37 WHERE student_code = '574';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '979';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '1063';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 25 WHERE student_code = '816';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 30 WHERE student_code = '581';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 10 WHERE student_code = '817';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '579';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 14 WHERE student_code = '575';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 32 WHERE student_code = '576';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 40 WHERE student_code = '573';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '577';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 18 WHERE student_code = '578';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '580';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 39 WHERE student_code = '582';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 5 WHERE student_code = '982';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 11 WHERE student_code = '823';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 40 WHERE student_code = '585';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '586';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '587';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 14 WHERE student_code = '572';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '1152';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '557';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 18 WHERE student_code = '556';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 11 WHERE student_code = '558';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 5 WHERE student_code = '900';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '561';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 14 WHERE student_code = '818';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 6 WHERE student_code = '822';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 38 WHERE student_code = '562';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 18 WHERE student_code = '565';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 18 WHERE student_code = '566';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 27 WHERE student_code = '583';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 20 WHERE student_code = '560';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '563';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 21 WHERE student_code = '564';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '1151';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 10 WHERE student_code = '568';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 30 WHERE student_code = '569';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '570';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 11 WHERE student_code = '571';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 20 WHERE student_code = '809';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 61 WHERE student_code = '592';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 48 WHERE student_code = '594';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 20 WHERE student_code = '602';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 48 WHERE student_code = '603';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 27 WHERE student_code = '604';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 44 WHERE student_code = '600';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 49 WHERE student_code = '595';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '601';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 35 WHERE student_code = '941';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 10 WHERE student_code = '1065';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 33 WHERE student_code = '599';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 33 WHERE student_code = '605';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 34 WHERE student_code = '606';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 20 WHERE student_code = '598';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '607';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 25 WHERE student_code = '608';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '611';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 42 WHERE student_code = '620';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 28 WHERE student_code = '588';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 44 WHERE student_code = '589';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 43 WHERE student_code = '591';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 11 WHERE student_code = '616';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '1003';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 48 WHERE student_code = '628';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 36 WHERE student_code = '593';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '893';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 28 WHERE student_code = '945';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '621';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 19 WHERE student_code = '946';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 43 WHERE student_code = '625';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 34 WHERE student_code = '609';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 37 WHERE student_code = '617';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '629';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '630';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '613';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '631';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '632';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '949';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '622';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '635';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '614';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '993';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '633';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '627';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '615';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '626';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '619';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '623';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '639';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '618';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '640';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '641';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '642';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '644';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '645';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '646';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '647';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '649';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '650';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '995';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '653';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '652';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '654';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '657';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '656';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '658';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '643';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '942';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '874';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '851';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '889';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '651';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '875';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '877';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '871';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '655';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '944';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '894';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '968';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '879';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '883';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '884';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '853';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '1127';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '975';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '854';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '888';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '1062';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '872';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '860';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '977';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '863';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '996';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '948';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '991';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '862';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '865';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '882';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '867';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '868';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '869';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '870';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 17 WHERE student_code = '843';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '891';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '937';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '848';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '981';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '842';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '841';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '844';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '859';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '890';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '1067';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '934';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '994';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '887';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '846';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '866';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '852';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '837';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '847';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 43 WHERE student_code = '659';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '660';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '661';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 19 WHERE student_code = '985';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 30 WHERE student_code = '664';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 20 WHERE student_code = '813';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 6 WHERE student_code = '666';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 32 WHERE student_code = '667';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 36 WHERE student_code = '668';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 5 WHERE student_code = '896';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '669';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 28 WHERE student_code = '670';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 30 WHERE student_code = '671';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 43 WHERE student_code = '672';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '1006';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 11 WHERE student_code = '819';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '820';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 15 WHERE student_code = '821';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 14 WHERE student_code = '676';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 24 WHERE student_code = '677';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = NULL WHERE student_code = '678';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 39 WHERE student_code = '702';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 31 WHERE student_code = '703';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 48 WHERE student_code = '704';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 11 WHERE student_code = '834';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 13 WHERE student_code = '814';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 31 WHERE student_code = '705';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 35 WHERE student_code = '706';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 20 WHERE student_code = '707';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 5 WHERE student_code = '708';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 24 WHERE student_code = '709';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 34 WHERE student_code = '710';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 29 WHERE student_code = '711';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '712';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 12 WHERE student_code = '713';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 38 WHERE student_code = '715';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 22 WHERE student_code = '716';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 28 WHERE student_code = '717';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 29 WHERE student_code = '718';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 12 WHERE student_code = '899';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '679';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 30 WHERE student_code = '686';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '684';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 34 WHERE student_code = '689';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '682';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 42 WHERE student_code = '690';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '976';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 41 WHERE student_code = '691';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 48 WHERE student_code = '692';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '693';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 46 WHERE student_code = '694';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 24 WHERE student_code = '984';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 46 WHERE student_code = '696';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 32 WHERE student_code = '697';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '699';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 19 WHERE student_code = '700';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 42 WHERE student_code = '714';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 45 WHERE student_code = '935';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 35 WHERE student_code = '701';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 39 WHERE student_code = '719';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '681';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '721';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '797';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '723';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '725';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '724';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '747';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '1005';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '727';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '728';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '729';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '730';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '731';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '770';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '733';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '734';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 26 WHERE student_code = '980';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '736';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 31 WHERE student_code = '737';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '738';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '739';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '740';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '776';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '742';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '744';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '745';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '746';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '726';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '748';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '786';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '749';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '750';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '769';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '751';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '732';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '752';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '735';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '753';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '754';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '755';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '983';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '757';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '759';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '760';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '761';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '762';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '763';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '765';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '787';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '766';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '768';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '1066';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '771';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '772';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '773';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '1082';
  UPDATE public.students SET reading_stage = 'juz', qaidah_page = NULL WHERE student_code = '1083';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '775';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '777';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '778';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '779';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '780';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '782';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '781';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '784';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '788';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '789';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '897';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '791';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '793';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '794';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 38 WHERE student_code = '795';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '796';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '845';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 33 WHERE student_code = '683';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '687';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '798';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 46 WHERE student_code = '799';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 43 WHERE student_code = '800';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 38 WHERE student_code = '801';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 30 WHERE student_code = '802';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 36 WHERE student_code = '804';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '803';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 31 WHERE student_code = '698';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '1128';
  UPDATE public.students SET reading_stage = 'quran', qaidah_page = NULL WHERE student_code = '806';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 18 WHERE student_code = '824';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 40 WHERE student_code = '808';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '997';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 5 WHERE student_code = '810';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 7 WHERE student_code = '811';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 2 WHERE student_code = '812';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '986';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '1007';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 7 WHERE student_code = '815';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 6 WHERE student_code = '978';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 2 WHERE student_code = '1004';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '936';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '1090';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 3 WHERE student_code = '989';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 2 WHERE student_code = '1081';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '990';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '1012';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 2 WHERE student_code = '1068';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '895';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 8 WHERE student_code = '971';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 2 WHERE student_code = '987';
  UPDATE public.students SET reading_stage = 'qaidah', qaidah_page = 1 WHERE student_code = '1091';

do $$ begin
    raise notice 'OK -- reading_stage + qaidah_page loaded for % students',
        (select count(*) from public.students where reading_stage is not null);
end $$;
