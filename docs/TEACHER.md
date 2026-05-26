# Teacher Handbook — Madrasa

This guide walks you through everything you'll do as a teacher. Most of it is
day-to-day grading, attendance, and pulling progress reports for your classes.

---

## 1. Getting your login

The school admin creates your account. They'll give you:

- A **username** (e.g. `ahmed.khan`) — or a real email if they prefer.
- A **temporary password**.

Sign in at your school's portal URL. If you don't know it, ask the admin.

After your first sign-in, go to **My Account** in the sidebar (bottom) and set
a password you'll remember.

---

## 2. The teacher sidebar

| Item | What it's for |
|---|---|
| Dashboard | Quick view of your classes |
| My Students | All students enrolled in your classes |
| My Classes | The classes you're assigned to |
| Quran Grading | Record Quran Recitation assessments (0-5 scale) |
| Memorisation | Track per-surah memorisation for your students |
| Duas | Mark daily and namaz duas complete |
| Attendance | Take attendance per class per day |
| Reports | Class-level reports + downloadable PDFs |
| My Account | Change your own password |

---

## 3. What "your students" means

You only see students who have been assigned to **you as their primary teacher**.
A class can have multiple teachers, and each student in the class has one primary
teacher. So:

- On the **Quran Grading**, **Memorisation**, and **Duas** screens, the student
  list only shows your primary students.
- On **Classes**, you see every class you're assigned to. Inside a class, you
  can enrol *new* students from the full school directory (admin enables this).

If you think you should see a student but don't, ask the admin to set you as
their primary teacher in the **Classes** screen.

---

## 4. Recording a Quran Recitation assessment

1. **Quran Grading** in the sidebar.
2. You see cards for each class you teach. Click one.
3. Pick a student from the table. The **Grade** button opens the form.
4. Fill in the form:

   - **Date** — defaults to today; change if grading from earlier.
   - **Surah** — which surah was recited.
   - **Ayah from / to** — the range covered.
   - **Comments** — strengths, what to focus on next.

5. The five categories — click a 0-5 button on each row:

   | Category | What to listen for |
   |---|---|
   | Fluency | Smooth, confident flow |
   | Makharij | Articulation points of letters |
   | Tajweed | Idgham, Ikhfa, Madd, Qalqalah etc. |
   | Waqf | Stopping rules and signs |
   | Accuracy | No missed, added, or substituted letters |

6. The chip at the bottom updates live with the average and grade band.
7. **Save assessment** — a success box shows the average and any flagged
   weaknesses with suggested improvement areas.

### Scoring scale

| Score | Meaning |
|---|---|
| 0 | Not attempted — student didn't read |
| 1 | Very weak — many mistakes; full help needed |
| 2 | Weak — frequent pauses; Tajweed rare |
| 3 | Satisfactory — basic Tajweed inconsistent |
| 4 | Good — steady fluency; Tajweed in most areas |
| 5 | Excellent — clear, Tajweed throughout |

Be honest — the system tracks improvement, so an inflated early score makes
later improvement look smaller. Most students score 2 or 3 at the start.

### After the assessment

The system automatically:

- Calculates the average and grade band (Very Weak → Excellent).
- Flags categories scoring 2 or below as **weaknesses**.
- Generates short **recommendations** like "daily 10-minute reading sessions to
  build flow" — useful to copy into your comments next time.
- Stores the result so it shows up on the student's report and dashboard.

---

## 5. Memorisation tracking

1. **Memorisation** in the sidebar.
2. Pick a class, then a student.
3. The table lists every surah from Al-Fatihah and Juz Amma. For each surah:
   - **Memorised** — type the number of ayahs the student has memorised
     (e.g. 5 / 7 for Al-Fatihah means halfway).
   - **Status** — `not_started`, `in_progress`, or `completed`.
   - **Quality** — 0-5 mastery score on the most recent revision.
4. Click **Save** in that row.

The header chip shows total ayahs memorised and % of Quran for that student.

> Tip: do this weekly in batches. Update progress for all your students on the
> same day so the dashboard trends stay meaningful.

---

## 6. Daily and Namaz Duas

1. **Duas** in the sidebar.
2. Pick a class, then a student.
3. Filter by **Daily** or **Namaz** category (default: All).
4. For each dua row:
   - **Status** — pending, in_progress, completed.
   - **Score** — 0-5 mastery on oral assessment.
   - **Tajweed verified** — tick when the student recited with correct Tajweed.
5. Save per row.

Header chip shows overall completion percentage.

---

## 7. Taking attendance

1. **Attendance** in the sidebar.
2. Pick a class and a date.
3. Each student row has four radio buttons: **Present**, **Absent**, **Late**, **Excused**. Defaults to Present.
4. Click **Save attendance** at the bottom.

You can edit a past date's attendance by changing the date and re-saving.

---

## 8. Reports

1. **Reports** in the sidebar.
2. Cards show the classes you teach. Pick one.
3. Four tabs across the top:

   - **Quran Recitation** — latest score per student, with a **Trend** chip
     (↑ +0.40 = improved, ↓ -0.20 = dropped, → flat). Click **PDF** next to a
     student for their full report card.
   - **Memorisation** — ayahs memorised, % of Quran, surahs complete. **PDF** button generates a class table.
   - **Daily Duas** — completion per student. PDF + CSV.
   - **Namaz Duas** — same.

4. Use **Excel** / **CSV** buttons to export for printing or sharing.

---

## 9. My Account

1. Sidebar → **My Account** (bottom).
2. See your profile info: name, role, sign-in identifier, account UUID.
3. **Change password** section: enter new password twice, **Update password**.

If you forgot your password:

- If you signed in with a real email — use the **Forgot password?** link on the
  login page. You'll get a reset email.
- If you have a username only — ask the admin to reset it from the Supabase
  dashboard. There's no email to send the reset link to.

---

## 10. Quick checks

| Symptom | What to do |
|---|---|
| I can't see a student I should be grading | Ask admin to assign you as the student's **primary teacher** in Classes |
| The Grade button doesn't appear | You're viewing a class you don't teach — only admins can grade those |
| My report PDF doesn't open | Allow popups for the site URL in your browser |
| I see "Read-only" when opening a class | You're not assigned to that class — admin needs to add you |
| Sign-in fails | Check Caps Lock; if still stuck, ask admin to reset your password |

---

## 11. Best practices

- Grade Quran Recitation **weekly** for each student. Frequency matters more
  than depth — small samples over time build a useful trend.
- Be honest with low scores. Improvement shows up most clearly when starting
  points are realistic.
- Use the **Comments** field to note specific letters/rules to focus on next
  time — both you and the student see this on their report.
- Update memorisation right after the revision session, not at the end of the
  week. Counts get lost otherwise.
- Take attendance **before** the lesson starts, not after — easier to remember.

---

## Glossary

- **Primary teacher** — the teacher inside a class who's responsible for a
  specific student. You only see students assigned to you as primary.
- **Tajweed** — the rules of Quranic recitation (Idgham, Ikhfa, Madd, etc.).
- **Waqf** — stopping rules and signs in the Mushaf.
- **Makharij** — the articulation points of Arabic letters.
- **Average** — the arithmetic mean of the five 0-5 category scores.
- **Grade band** — Very Weak / Weak / Satisfactory / Good / Excellent, mapped
  from the average. See the marking guidelines panel on the grading screen.
