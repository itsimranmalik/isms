# Madrasa — Islamic School Management Website

A complete school management website built as static HTML/CSS/JS + Supabase.
No server to maintain. Free to host. Custom domain optional.

```
ISMS/
├── index.html, about.html, admissions.html, contact.html, login.html   # public site
├── app.html                                  # logged-in portal (SPA shell)
├── assets/
│   ├── css/site.css     # public-facing theme (green + gold)
│   ├── css/app.css      # portal layout
│   └── js/
│       ├── config.js              # YOUR Supabase URL + key go here
│       ├── supabase-client.js     # auth + audit helpers
│       ├── app.js                 # SPA router + role-aware sidebar
│       ├── site.js, partials.js   # public-page niceties
│       ├── modules/
│       │   ├── quran-recitation.js  # 0-5 grading logic + recommendations
│       │   └── exporters.js         # jsPDF + SheetJS + CSV
│       └── views/                   # one .js per route
│           ├── dashboard.js, students.js, teachers.js, classes.js,
│           ├── assessments.js, memorisation.js, duas.js, attendance.js,
│           ├── reports.js, settings.js, audit.js,
│           └── my-grades.js, my-memorisation.js, my-duas.js, my-attendance.js
├── supabase/
│   ├── 01_schema.sql    # 18 tables + triggers
│   ├── 02_rls.sql       # row-level security policies
│   └── 03_seed.sql      # surahs, duas, subjects, defaults
└── DEPLOY.md            # step-by-step deployment guide
```

## Stack

- **Frontend:** pure HTML + ES modules + Tailwind-flavoured CSS (no build step)
- **Auth + DB:** Supabase (Postgres + Row Level Security + Auth)
- **Charts:** Chart.js (CDN)
- **PDF / Excel:** jsPDF + jspdf-autotable / SheetJS (CDN, lazy-loaded)
- **Host:** Cloudflare Pages (free, unlimited bandwidth)

## Roles

| Role     | Can do                                                                   |
|----------|--------------------------------------------------------------------------|
| admin    | Everything: manage students, teachers, classes, grading, audit, settings |
| teacher  | View own classes, take attendance, grade students, export reports        |
| student  | View own grades, memorisation, duas, attendance, download report card    |
| parent   | (Stub) Link to child's account                                           |

## Quick start

See [`DEPLOY.md`](DEPLOY.md) — it walks you through Supabase + Cloudflare in about 30 minutes.

## Local preview

You can preview the public pages locally with any static server:

```bash
# from this folder
python -m http.server 8000
# then open http://localhost:8000
```

The portal pages (`app.html`) require Supabase to be configured.

## License

GPL-2.0-or-later. Quran text included is from the public-domain Uthmani text.
