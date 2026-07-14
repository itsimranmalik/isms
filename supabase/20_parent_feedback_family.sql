-- =====================================================================
-- 20_parent_feedback_family.sql
--
-- Adds a "how many children studying at the madrasa" field to the
-- parent_feedback table. Class list continues to live in the existing
-- `class_names` column (auto-populated from the per-child inputs).
--
-- Re-runnable.
-- =====================================================================

alter table public.parent_feedback
    add column if not exists children_count smallint
        check (children_count is null or children_count between 1 and 10);

create index if not exists ix_parent_feedback_children_count
    on public.parent_feedback(children_count);

do $$ begin raise notice 'OK -- children_count column added to parent_feedback'; end $$;
