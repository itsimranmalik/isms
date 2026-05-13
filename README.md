# Islamic School Management

A WordPress plugin for running a Madrasa / Islamic Academy end-to-end:
students, teachers, classes, attendance, **Quran recitation grading on a 0-5
Tajweed-aware scale**, Hifz tracking, daily + namaz duas, and PDF/Excel/CSV
reports — all behind a modern green-and-gold UI with dark-mode support.

```
islamic-school-mgmt/
├── islamic-school-mgmt.php           # Plugin bootstrap
├── uninstall.php                     # Schema teardown
├── composer.json                     # TCPDF + PhpSpreadsheet + JWT
├── readme.txt                        # WP plugin readme
├── INSTALL.md                        # Full install / deploy guide
├── includes/
│   ├── class-ism-plugin.php          # Top-level wiring
│   ├── class-ism-activator.php       # 18-table schema migration + seed data
│   ├── class-ism-deactivator.php
│   ├── class-ism-roles.php           # Custom roles + capability map
│   ├── class-ism-security.php        # Nonces, sanitisation, rate limiting
│   ├── class-ism-audit.php           # Append-only audit log
│   ├── modules/
│   │   ├── class-ism-quran-recitation.php  # ⭐ 0-5 grading core
│   │   ├── class-ism-memorisation.php
│   │   └── class-ism-duas.php
│   ├── api/                          # REST controllers (ism/v1)
│   │   ├── class-ism-rest-api.php
│   │   ├── class-ism-students-controller.php
│   │   ├── class-ism-teachers-controller.php
│   │   ├── class-ism-classes-controller.php
│   │   ├── class-ism-assessments-controller.php
│   │   ├── class-ism-memorisation-controller.php
│   │   ├── class-ism-duas-controller.php
│   │   ├── class-ism-attendance-controller.php
│   │   ├── class-ism-dashboard-controller.php
│   │   └── class-ism-reports-controller.php
│   └── reporting/
│       ├── class-ism-pdf-exporter.php       # TCPDF + HTML fallback
│       ├── class-ism-excel-exporter.php     # PhpSpreadsheet + legacy .xls fallback
│       └── class-ism-csv-exporter.php
├── admin/
│   ├── class-ism-admin.php
│   └── views/                        # 10 admin screens (Tailwind/Chart.js)
├── public/
│   └── class-ism-public.php          # [ism_login], [ism_student_dashboard], [ism_teacher_dashboard]
├── assets/
│   ├── css/ism.css                   # Green-and-gold theme, dark mode, RTL-friendly
│   └── js/
│       ├── ism-admin.js              # Admin SPA against ism/v1
│       └── ism-public.js             # Public dashboards
└── languages/                        # i18n .pot lives here once generated
```

## Quick start

1. `composer install --no-dev` inside the plugin folder (optional but recommended).
2. Activate plugin via WP admin.
3. Visit **Islamic School → Settings** to set school name + logo.
4. Place the relevant shortcode on your public dashboard page.

See `INSTALL.md` for a complete deployment walk-through, REST API reference,
security model, and roadmap.

## License

GPL-2.0-or-later. Quran text included in seed data is from the public-domain
Uthmani text — replace freely with your preferred mushaf rasm.
