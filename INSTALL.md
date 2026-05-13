# Islamic School Management — Installation Guide

This plugin runs on any WordPress 6.0+ site with PHP 7.4+ and MySQL 5.7+ / MariaDB 10.3+.
It installs cleanly on shared cPanel hosting and on managed WordPress hosts.

## 1. Upload

**Option A — Zip upload (recommended for cPanel / managed hosting):**

1. Zip the `islamic-school-mgmt/` folder.
2. WP Admin → Plugins → Add New → Upload Plugin → choose the zip → Install Now → Activate.

**Option B — Manual upload:**

1. Upload the unzipped folder to `wp-content/plugins/` via SFTP / cPanel File Manager.
2. WP Admin → Plugins → activate "Islamic School Management".

## 2. Composer (optional but recommended)

The plugin works without Composer, falling back to:
- a printable HTML "Save as PDF" page instead of TCPDF-rendered PDFs;
- a legacy `.xls` (HTML) Excel export instead of true `.xlsx`.

For full PDF + true XLSX support, install Composer dependencies once:

```bash
cd wp-content/plugins/islamic-school-mgmt
composer install --no-dev --optimize-autoloader
```

This pulls in:
- `tecnickcom/tcpdf` — PDF generation
- `phpoffice/phpspreadsheet` — XLSX generation
- `firebase/php-jwt` — optional JWT auth for external clients

## 3. First-run

On activation the plugin creates these tables (prefixed with your `wp_` prefix):

```
ism_students, ism_teachers, ism_sessions, ism_classes,
ism_class_teachers, ism_class_students, ism_subjects,
ism_assessments, ism_quran_recitation_grades,
ism_surahs, ism_memorisation_progress, ism_memorisation_revisions,
ism_duas, ism_dua_progress,
ism_attendance, ism_announcements, ism_notifications,
ism_audit_logs
```

It also adds the custom roles `ism_teacher`, `ism_student`, `ism_parent`,
and seeds reference data: ~38 commonly-taught surahs (Al-Fatihah + Juz Amma)
and ~15 starter duas across `daily` + `namaz` categories.

## 4. Configure

WP Admin → **Islamic School → Settings**:

- School name (appears on report cards)
- Logo URL (PNG ≥ 200x200px recommended)
- Default theme (light / dark)
- Language
- SMTP host / port / user / from-address (optional; uses WP defaults otherwise)

## 5. Public pages

Place these shortcodes on any page or Elementor section:

| Shortcode | Purpose |
|---|---|
| `[ism_login]` | Branded login form |
| `[ism_student_dashboard]` | Student panel: grades, memorisation, duas, PDF download |
| `[ism_teacher_dashboard]` | Teacher panel: assigned classes and quick links |

## 6. Linking WP users to ISM profiles

The plugin uses native WordPress users for authentication; the `ism_students` /
`ism_teachers` tables store the domain-specific profile and link via `wp_user_id`.

- Create a WP user (Users → Add New) with role `ism_teacher` or `ism_student`.
- Then create the matching ISM row via Islamic School → Teachers / Students,
  setting the `wp_user_id` field.

## 7. REST API surface

Namespace: `/wp-json/ism/v1`

```
GET    /students             ?q=&class_id=&page=&per_page=
POST   /students             (admin)
GET    /students/{id}
PATCH  /students/{id}        (admin)
DELETE /students/{id}        (admin)

GET    /teachers
POST   /teachers             (admin)

GET    /classes
POST   /classes              (admin)
POST   /classes/{id}/enrol               { student_ids: [...] }
POST   /classes/{id}/assign-teacher      { teacher_id, is_lead }

POST   /assessments/quran-recitation     { student_id, teacher_id, fluency, makharij, tajweed, waqf, accuracy, assessed_on, ... }
GET    /assessments/quran-recitation     ?student_id=&limit=
GET    /assessments/quran-recitation/class/{class_id}
GET    /assessments/quran-recitation/grading-scale

GET    /memorisation/surahs
POST   /memorisation/progress            { student_id, surah_id, ayahs_memorised, status, quality_score?, revised_on? }
GET    /memorisation/student/{id}

GET    /duas?category=daily|namaz
POST   /duas/progress                    { student_id, dua_id, status, score?, tajweed_verified? }
GET    /duas/student/{id}?category=

POST   /attendance                       { class_id, attended_on, entries: [{student_id, status, note?}] }
GET    /attendance                       ?class_id=&from=&to=

GET    /dashboard/admin
GET    /dashboard/teacher

GET    /reports/student/{id}/pdf
GET    /reports/class/{id}/excel
GET    /reports/class/{id}/csv
```

All POST/PATCH/DELETE require `X-WP-Nonce: <wp_rest nonce>` and the appropriate
`ism_*` capability (see `class-ism-roles.php`).

## 8. Security model

- CSRF via WP nonces (`X-WP-Nonce`) on every write.
- Authorisation via custom capabilities (`ism_manage_all`, `ism_grade_students`, …).
- Rate limiting (60 writes / minute / route / user) via transients.
- All DB writes go through `$wpdb->prepare()` — SQL-injection-safe.
- Output escaped with `esc_html`, `esc_attr`, `esc_url`.
- Append-only audit log in `ism_audit_logs` (actor + IP + UA).

## 9. Uninstall

Removing the plugin from WP admin runs `uninstall.php`, which drops every
`ism_*` table and removes the custom roles. To preserve data across reinstalls,
set `update_option('ism_preserve_data_on_uninstall', 1)` before deleting.

## 10. Known limitations / roadmap

The following are intentionally stubbed for v1.0.0:

- Parent portal (child linking is in schema; UI not yet shipped)
- SMS / WhatsApp notifications (hook points exist in `ISM_Audit`)
- AI-powered performance analysis
- QR-coded student ID cards
- Online fee management
- Zoom / Google Meet integration
- Cloud backup integration

PRs welcome.
