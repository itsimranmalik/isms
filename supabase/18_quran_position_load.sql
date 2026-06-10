-- =====================================================================
-- 18_quran_position_load.sql
--
-- Bulk-load Quran positions (surah:ayah) for the students listed in
-- "Quran Sabaq - Final 2026.csv". Only updates the position columns
-- (and reading_stage where missing) — assessment scores are NOT touched.
--
-- Position mapping used:
--   "2:108"               -> surah 2, ayah 108              (20 students)
--   "End of Juz 6"        -> surah 5, ayah 81  (last ayah)  (30 students)
--   "Upto Juz 4 - Nisf"   -> surah 3, ayah 158 (mid-juz 4)  (12 students)
--   "Page 40"             -> surah 2, ayah 252               (2 students)
--   "Page 57"             -> surah 3, ayah 101               (1 student)
--   "Page 73"             -> surah 3, ayah 200               (1 student)
--   "Page 137"            -> surah 6, ayah 130               (1 student)
--   empty positions       -> skipped, no change
--
-- Page mappings assume the standard 604-page Madinah Mushaf. If your
-- school uses a different print, fix individual students via the
-- Stage button on the Students screen after running.
--
-- Re-runnable. Wrapped in a single transaction so any typo halts the
-- whole load rather than half-applying.
-- =====================================================================

begin;

-- Make sure every targeted student is on the Quran stage (does nothing if
-- they already are; flips a NULL or 'qaidah'/'juz' to 'quran' otherwise).
update public.students
   set reading_stage = 'quran'
 where student_code in ('629','630','613','631','632','949','622','635','614','993','633','627','615','626','619','623','639','618','640','641','642','644','645','646','647','649','650','995','653','652','654','657','656','658','643','942','874','851','889','651','875','877','871','655','944','894','968','879','883','884','725','731','733','736','738','776','744','726','748','786','749','769','751','752','735','753','755')
   and (reading_stage is null or reading_stage <> 'quran');

-- Position updates -----------------------------------------------------
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '629';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '630';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '613';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '631';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '632';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '949';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '622';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '635';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '614';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '993';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '633';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '627';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '615';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '626';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '619';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '623';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '639';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '618';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '640';
update public.students set quran_surah = 2, quran_ayah = 108 where student_code = '641';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '642';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '644';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '645';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '646';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '647';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '649';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '650';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '995';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '653';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '652';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '654';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '657';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '656';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '658';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '643';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '942';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '874';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '851';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '889';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '651';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '875';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '877';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '871';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '655';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '944';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '894';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '968';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '879';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '883';
update public.students set quran_surah = 5, quran_ayah = 81 where student_code = '884';
update public.students set quran_surah = 3, quran_ayah = 200 where student_code = '725';
update public.students set quran_surah = 2, quran_ayah = 252 where student_code = '731';
update public.students set quran_surah = 3, quran_ayah = 101 where student_code = '733';
update public.students set quran_surah = 6, quran_ayah = 130 where student_code = '736';
update public.students set quran_surah = 2, quran_ayah = 252 where student_code = '738';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '776';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '744';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '726';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '748';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '786';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '749';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '769';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '751';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '752';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '735';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '753';
update public.students set quran_surah = 3, quran_ayah = 158 where student_code = '755';

commit;

do $$ begin
    raise notice 'OK -- Quran positions loaded for % students',
        (select count(*) from public.students where quran_surah is not null);
end $$;
