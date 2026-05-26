# Admin Handbook — Madrasa

Welcome. As an admin, you have full control of the system. This handbook walks
through everything you need to run the day-to-day.

---

## 1. Signing in

1. Open the site (your `*.pages.dev` URL or your custom domain).
2. Top-right corner: **Sign in**.
3. Type your **username** *or* **email** in the Username field. Real emails and
   short usernames both work.
4. Type your password.
5. **Sign in** — you land on the admin dashboard.

If you forget your password and you used a real email, click **"Send reset email"**.
If you used a username only, you'll need to reset via the Supabase dashboard
(see [Resetting another admin's password](#resetting-another-admins-password)).

---

## 2. The admin sidebar

| Group | Item | What it's for |
|---|---|---|
| Overview | Dashboard | KPIs, top performers, recent assessments |
| School | Students | Add / edit / delete student records |
| School | Teachers | Add / edit / delete teachers (and create their logins) |
| School | Classes | Create classes, assign teachers, enrol students |
| Assessment | Quran Grading | Record Quran Recitation assessments (0-5) |
| Assessment | Memorisation | Track per-surah memorisation |
| Assessment | Duas | Track Daily and Namaz duas |
| Assessment | Attendance | Bulk record attendance per class per day |
| Admin | Reports | Class-level Quran / Memorisation / Duas reports + PDF/Excel/CSV |
| Admin | Admins | Create more admins, demote existing ones |
| Admin | Audit log | Read-only history of all writes |
| Admin | Settings | School name, logo, theme |
| You | My Account | Change your own password |

---

## 3. First-time setup

Do these once when you set up the school.

### 3.1 Settings

1. **Settings** in the sidebar.
2. Set your **School name** — appears in the sidebar header and on PDF reports.
3. (Optional) Paste a **Logo URL** — 200×200 PNG is ideal; will print at the top of PDF reports.
4. Phone, email, address: shown in the public footer if you ever wire it up.
5. Save.

### 3.2 Create your teachers

1. **Teachers → + Add teacher**.
2. Required fields: Staff code (e.g. T001), First name, Last name.
3. Optional profile fields: phone, profile email (for records), qualifications.
4. **Login credentials** — *recommended*: give the teacher a username and password.
   - Username: letters/digits/dot/underscore/dash, 3-40 chars (e.g. `ahmed.khan`).
   - Or use a real email — that enables self-service password resets.
   - Password: minimum 8 characters.
5. **Save** → "Teacher saved and login created" — they can sign in immediately.

The **Login?** column on the Teachers list shows whether each teacher has an active
login. If not, click **+ Create login** in that row to add one.

### 3.3 Create your students

Same pattern as Teachers but on the Students screen. Login credentials are optional
for students — many madrasas only give logins to older students or guardians.

### 3.4 Create classes and assign teachers

1. **Classes → + New class**.
2. Name (e.g. "Beginner Quran"), Level (e.g. "Beginner"), description.
3. Save → the class appears in the list.
4. **Click the class name** (the bold link) to open its detail panel.
5. On the right side, **Assigned teachers** — pick a teacher from the dropdown,
   optionally tick **Lead** if they're the lead teacher, **Assign**.
6. On the left, **Enrolled students** — pick a student, and *also* pick a
   **primary teacher** from the second dropdown. Click **Enrol**.

> The "primary teacher" is the teacher who will see this student in their Quran
> Grading and Memorisation/Duas screens. Multi-teacher classes can split students
> between teachers this way.

### 3.5 Create additional admins (optional)

1. **Admins** in the sidebar.
2. Right-hand card: **+ Add a new admin**.
3. Full name, username, password → **Create admin**.
4. They can sign in immediately and have full system access.

The system always protects the **last admin** from being demoted, so you can't
accidentally lock yourself out.

---

## 4. Day-to-day operations

### 4.1 Recording a Quran Recitation assessment

1. **Quran Grading** → pick a class (cards show count of students per class).
2. Pick a student → opens the grading form.
3. Fill in:
   - **Date** (defaults to today)
   - **Surah** + ayah range (optional but useful)
   - The five **0-5 scores**: Fluency, Makharij, Tajweed, Waqf, Accuracy
   - Teacher comments (optional)
4. The live summary at the bottom shows the **average + grade band** as you click.
5. **Save assessment** — a green success box shows the average, weaknesses, and recommendations.

The 0-5 scale:

| Score | Meaning |
|---|---|
| 0 | Not attempted |
| 1 | Very weak — many mistakes; needs full assistance |
| 2 | Weak — frequent pauses; Tajweed rarely applied |
| 3 | Satisfactory — basic Tajweed inconsistently applied |
| 4 | Good — steady fluency; Tajweed in most areas |
| 5 | Excellent — clear recitation, Tajweed throughout |

### 4.2 Updating memorisation

1. **Memorisation** in the sidebar.
2. Pick a class, then a student.
3. The table lists every surah in the database with an editable **Memorised**
   counter, **Status** dropdown, **Quality** score (0-5).
4. Edit any row → click **Save** in that row.

The header chip shows total ayahs memorised and % of Quran for the student.

### 4.3 Marking duas complete

1. **Duas** in the sidebar.
2. Pick a class → student → optionally filter by category (Daily / Namaz / All).
3. Each dua row has Status (pending / in progress / completed), Score (0-5), Tajweed verified.
4. Update and **Save**.

### 4.4 Taking attendance

1. **Attendance** in the sidebar.
2. Pick a class and a date.
3. Each student in the roster has four radio buttons: Present / Absent / Late / Excused.
   Default is Present.
4. **Save attendance** at the bottom.

### 4.5 Running reports

1. **Reports** → pick a class.
2. Top KPIs show students count, Quran-assessed count, class average.
3. Four tabs:
   - **Quran Recitation** — latest score per student, trend arrow vs previous,
     per-student PDF buttons + class Excel / CSV.
   - **Memorisation** — ayahs memorised, % of Quran, surahs complete. Class PDF + CSV.
   - **Daily Duas** — per-student completion. Class PDF + CSV.
   - **Namaz Duas** — same as above.

Per-student PDF reports include all three modules with progress trends.

---

## 5. Maintenance

### 5.1 Adding a login to an existing teacher/student

If you created them without a password, the **Login?** column shows a
**+ Create login** button. Click it → fill in username + password → Save.

### 5.2 Resetting another admin's password

If a colleague forgot their password:

1. Open Supabase dashboard → **Authentication → Users**.
2. Find their email/username in the list.
3. Three-dot menu (`⋮`) → **Send password recovery email** (if real email) or
   **Reset password** (sets a new one directly).
4. Hand them the temporary password; they can change it from **My Account**.

If they only have a username (no real email on file), only the manual reset works —
Supabase can't email a fake-domain address.

### 5.3 Demoting an admin

1. **Admins** → find their row.
2. Click **Demote to teacher** → confirm.
3. They keep their login but lose the admin sidebar entries.

The system blocks demoting the last admin — there must always be at least one.

### 5.4 Auditing actions

1. **Audit log** → shows the last 200 write events: who, what, when, IP address.
2. Useful when checking why a grade changed, who deleted a student, etc.

---

## 6. Common stumbles

| What you see | Likely fix |
|---|---|
| "Failed to fetch" when creating a teacher | The `create-user` Edge Function isn't deployed. See DEPLOY.md step 2. |
| "Forbidden — admin role required" | Your `profiles.role` isn't `admin`. Set it via Supabase Table Editor. |
| Sign-in says "Invalid login credentials" | Wrong password, or the user wasn't email-confirmed. Toggle "Email confirmed" in Supabase Users panel. |
| No students show on Quran Grading after picking a class | Each student needs a **primary teacher** set in the class detail panel. Admin sees all students regardless. |
| PDF download doesn't trigger | Browser popup blocker — allow popups for your site. |
| "Class has no teacher assigned" when saving an assessment | Open Classes → that class → assign at least one teacher. |

---

## 7. Backups

Supabase backs up the database daily on the free tier (7-day retention). If you
want a manual snapshot, go to **Project Settings → Database → Backups → Download**.

---

## 8. Glossary

- **RLS (Row Level Security)** — Supabase enforces who can read/write each row
  in the database. Even if someone tampers with the JS, they can't see data
  outside their role's allowed scope.
- **Edge Function** — a tiny piece of server code on Supabase. We use one
  called `create-user` so admins can provision logins without exposing the
  master service key in the browser.
- **Primary teacher** — the teacher responsible for a student inside a class.
  Drives what each teacher sees on their Quran Grading screen.
- **Username domain** — usernames are stored internally as
  `username@madrasa.local` so Supabase Auth (which insists on emails) accepts
  them. Users never see this.
