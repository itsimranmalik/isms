-- =====================================================================
-- Switch the default status from 'not_completed' / 'not_started' to
-- 'not_applicable' on BOTH grading tables. Newly-graded rows that aren't
-- filled in stay out of the overall % calculation by default — more
-- honest than assuming every dua / surah applies to every student.
-- Re-runnable.
-- =====================================================================

alter table public.dua_progress
    alter column status set default 'not_applicable';

alter table public.memorisation_progress
    alter column status set default 'not_applicable';

do $$ begin
    raise notice 'OK -- dua_progress + memorisation_progress default is now not_applicable';
end $$;
