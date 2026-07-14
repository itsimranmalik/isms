-- =====================================================================
-- 19_parent_feedback.sql
--
-- Public anonymous "Parents' Evening Feedback Form" submissions.
-- Anyone can INSERT via feedback.html; only admins can SELECT/DELETE.
-- Mirrors the admissions table pattern.
--
-- Satisfaction scale: 1..5 (5 = Very Satisfied, 1 = Very Dissatisfied).
-- Yes/No/etc. answers use short text codes.
--
-- Re-runnable.
-- =====================================================================

create table if not exists public.parent_feedback (
    id                              bigserial primary key,
    submitted_at                    timestamptz not null default now(),
    class_names                     text,                                       -- free text, e.g. "B4, G2"

    -- Section 1: Overall Experience (1-5, 5 = Very Satisfied)
    q1_overall_satisfaction         smallint check (q1_overall_satisfaction between 1 and 5),
    q2_teaching_quality             smallint check (q2_teaching_quality       between 1 and 5),
    q3_communication                smallint check (q3_communication          between 1 and 5),
    q4_learning_environment         smallint check (q4_learning_environment   between 1 and 5),
    q5_safety_wellbeing             smallint check (q5_safety_wellbeing       between 1 and 5),
    q6_approachability              smallint check (q6_approachability        between 1 and 5),

    -- Section 2: End of Year Assessment
    q8_assessment_explanation       smallint check (q8_assessment_explanation between 1 and 5),
    q9_progress_understanding       smallint check (q9_progress_understanding between 1 and 5),
    q10_teaching_pace               text check (q10_teaching_pace   in ('too_slow','just_right','too_fast')),
    q11_support_needed              text,

    -- Section 3: Urdu Language
    q12_urdu_interest               text check (q12_urdu_interest             in ('yes','no','not_sure')),
    q13_urdu_classes_interest       text check (q13_urdu_classes_interest     in ('yes','no','maybe')),
    q14_urdu_fee_willingness        text check (q14_urdu_fee_willingness      in ('yes','no','depends')),
    q16_urdu_preferred_time         text check (q16_urdu_preferred_time       in ('weekday_evening','weekend','either','not_sure')),

    -- Section 4: General Feedback (open text)
    q17_does_well                   text,
    q18_could_improve               text,
    q19_other_comments              text,

    -- Anti-spam / lightweight audit
    ip_address                      text,
    user_agent                      text
);

create index if not exists ix_parent_feedback_submitted
    on public.parent_feedback(submitted_at desc);
create index if not exists ix_parent_feedback_class
    on public.parent_feedback(class_names);

alter table public.parent_feedback enable row level security;

drop policy if exists "parent_feedback anon insert" on public.parent_feedback;
drop policy if exists "parent_feedback admin read"  on public.parent_feedback;
drop policy if exists "parent_feedback admin delete" on public.parent_feedback;

-- Anyone (signed in or not) may submit
create policy "parent_feedback anon insert"
    on public.parent_feedback
    for insert
    to anon, authenticated
    with check (true);

-- Only admins can read
create policy "parent_feedback admin read"
    on public.parent_feedback
    for select
    to authenticated
    using (public.is_admin());

-- Only admins can delete (e.g. remove spam)
create policy "parent_feedback admin delete"
    on public.parent_feedback
    for delete
    to authenticated
    using (public.is_admin());

do $$ begin raise notice 'OK -- parent_feedback table created with anon-insert + admin-read policies'; end $$;
