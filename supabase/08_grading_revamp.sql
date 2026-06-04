-- =====================================================================
-- Grading model revamp:
--   Memorisation: adds Memorisation Score (1-5). Old `quality_score`
--     stays in place and is now displayed as "Tajweed Score". Statuses
--     are restricted to: not_started / not_applicable / completed.
--   Duas: adds Memorisation Score + Tajweed Score (both 1-5). Statuses
--     become not_applicable / not_completed / completed.
--
-- This migration is additive and re-runnable. Old columns are kept so
-- previously-saved data continues to render.
-- Run after 07_admissions.sql.
-- =====================================================================

-- ----- memorisation_progress -----------------------------------------
alter table public.memorisation_progress
    add column if not exists memorisation_score smallint
        check (memorisation_score is null or memorisation_score between 0 and 5);

-- Translate in-progress -> not_applicable so the new UI options apply
update public.memorisation_progress
   set status = 'not_applicable'
 where status = 'in_progress';

-- ----- dua_progress --------------------------------------------------
alter table public.dua_progress
    add column if not exists memorisation_score smallint
        check (memorisation_score is null or memorisation_score between 0 and 5),
    add column if not exists tajweed_score smallint
        check (tajweed_score is null or tajweed_score between 0 and 5);

-- One-time backfill: the old `score` column is treated as memorisation_score
update public.dua_progress
   set memorisation_score = score
 where memorisation_score is null and score is not null;

-- Migrate statuses: pending + in_progress -> not_completed
update public.dua_progress
   set status = 'not_completed'
 where status in ('pending','in_progress');

-- New defaults for fresh inserts
alter table public.dua_progress           alter column status set default 'not_completed';
alter table public.memorisation_progress  alter column status set default 'not_started';

do $$ begin raise notice 'OK -- grading revamp migration complete'; end $$;
