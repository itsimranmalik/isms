-- =====================================================================
-- 11_quran_assessor_and_duas.sql
--
--   1. classes.quran_assessor_id  — a teacher who is NOT the primary
--      teacher but is allowed to do the Quran Recitation assessment
--      for an entire class.
--
--   2. RLS so that the assigned Quran Assessor can read class_students
--      for the class they're assessing.
--
--   3. Refresh public.duas with the canonical list from
--      "Kalimah, Dua and Namaz list.xlsx"  — three categories:
--        kalimas | daily | namaz
--      All existing dua_progress is wiped (IDs change).
--
-- Re-runnable.
-- =====================================================================

-- ---------- 1) classes.quran_assessor_id -----------------------------
alter table public.classes
    add column if not exists quran_assessor_id bigint
        references public.teachers(id) on delete set null;

create index if not exists ix_classes_quran_assessor
    on public.classes(quran_assessor_id);

-- ---------- 2) RLS: Quran assessor reads class_students --------------
-- Existing policies still apply (admin, lead/primary teacher). This is additive.
drop policy if exists "Quran assessor reads class_students" on public.class_students;
create policy "Quran assessor reads class_students"
    on public.class_students for select
    using (
        exists (
            select 1
              from public.classes  c
              join public.teachers t on t.id = c.quran_assessor_id
             where c.id = class_students.class_id
               and t.user_id = auth.uid()
        )
    );

-- Quran assessor should also be able to insert/update assessments for the class.
-- The existing assessments policy is by teacher_id; this adds the assessor route.
drop policy if exists "Quran assessor writes assessments" on public.assessments;
create policy "Quran assessor writes assessments"
    on public.assessments for insert
    with check (
        exists (
            select 1
              from public.classes  c
              join public.teachers t on t.id = c.quran_assessor_id
             where c.id = assessments.class_id
               and t.user_id = auth.uid()
        )
    );

drop policy if exists "Quran assessor reads assessments" on public.assessments;
create policy "Quran assessor reads assessments"
    on public.assessments for select
    using (
        exists (
            select 1
              from public.classes  c
              join public.teachers t on t.id = c.quran_assessor_id
             where c.id = assessments.class_id
               and t.user_id = auth.uid()
        )
    );

-- ---------- 3) Refresh duas + dua_progress ---------------------------
-- dua_progress rows reference dua_id; we wipe both before reloading.
truncate public.dua_progress;
delete from public.duas;
-- Reset the bigserial counter so titles get neat IDs again
do $$
declare seqname text;
begin
    select pg_get_serial_sequence('public.duas','id') into seqname;
    if seqname is not null then
        execute format('alter sequence %s restart with 1', seqname);
    end if;
end $$;

-- Kalimas ---------------------------------------------------------------
insert into public.duas (category, title, sort_order) values
    ('kalimas', '1st Kalimah',                  1),
    ('kalimas', '1st Kalimah — Meaning',        2),
    ('kalimas', '2nd Kalimah',                  3),
    ('kalimas', '2nd Kalimah — Meaning',        4),
    ('kalimas', '3rd Kalimah',                  5),
    ('kalimas', '4th Kalimah',                  6),
    ('kalimas', '5th Kalimah',                  7),
    ('kalimas', 'Imaan Mujmal',                 8),
    ('kalimas', 'Imaan Mufassal',               9);

-- Daily Duas ------------------------------------------------------------
insert into public.duas (category, title, sort_order) values
    ('daily', 'Tawwuz',                                     1),
    ('daily', 'Tasmiyah',                                   2),
    ('daily', 'When greeting someone',                      3),
    ('daily', 'Reply to the greeting',                      4),
    ('daily', 'On hearing good news',                       5),
    ('daily', 'On thanking someone',                        6),
    ('daily', 'Making intention to do something',           7),
    ('daily', 'Before eating',                              8),
    ('daily', 'If you forget to pray eating dua',           9),
    ('daily', 'After eating',                              10),
    ('daily', 'Before going to sleep',                     11),
    ('daily', 'After waking up',                           12),
    ('daily', 'Durood Shareef',                            13),
    ('daily', 'Before toilet',                             14),
    ('daily', 'After toilet',                              15),
    ('daily', 'Entering the masjid',                       16),
    ('daily', 'Leaving the masjid',                        17),
    ('daily', 'When sneezing',                             18),
    ('daily', 'If you hear somebody sneezing',             19),
    ('daily', 'Dua when travelling',                       20),
    ('daily', 'When loss occurs',                          21),
    ('daily', 'Leaving the home',                          22),
    ('daily', 'Entering the home',                         23),
    ('daily', 'Before wudhu',                              24),
    ('daily', 'After wudhu',                               25),
    ('daily', 'Wearing clothes',                           26),
    ('daily', 'Istighfaar',                                27),
    ('daily', 'Dua for protection',                        28),
    ('daily', 'After drinking milk',                       29),
    ('daily', 'After Azaan',                               30),
    ('daily', 'Dua for parents',                           31),
    ('daily', 'To increase knowledge',                     32),
    ('daily', 'Looking in the mirror',                     33),
    ('daily', 'After drinking water',                      34),
    ('daily', 'Entering a town or city',                   35);

-- Namaz -----------------------------------------------------------------
insert into public.duas (category, title, sort_order) values
    ('namaz', 'Thana',                  1),
    ('namaz', 'Tasbeeh for Ruku',       2),
    ('namaz', 'Tasmee',                 3),
    ('namaz', 'Tahmeed',                4),
    ('namaz', 'Tasbeeh for Sajdah',     5),
    ('namaz', 'Iqamah and reply',       6),
    ('namaz', 'Tashahud',               7),
    ('namaz', 'Durood-e Ibrahim',       8),
    ('namaz', 'Dua-e-Mathoorah',        9),
    ('namaz', 'Azaan',                 10),
    ('namaz', 'Dua-e-Qunoot',          11),
    ('namaz', 'Dua after Salaah',      12);

do $$ begin
    raise notice 'OK -- quran_assessor_id added, duas refreshed (% rows)',
        (select count(*) from public.duas);
end $$;
