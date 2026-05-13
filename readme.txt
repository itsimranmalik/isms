=== Islamic School Management ===
Contributors: yourorg
Tags: madrasa, school, quran, recitation, tajweed, memorisation, islamic
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Complete Madrasa / Islamic Academy management for WordPress: students, teachers, classes, attendance, Quran recitation (0-5 grading), memorisation, daily duas, namaz duas, plus PDF/Excel/CSV exports.

== Description ==

Built for Islamic schools. Roles for Admin, Teacher, Student and (optional) Parent. REST API ready, Elementor-friendly via shortcodes, mobile-first responsive UI in a green-and-gold palette with optional dark mode.

Core modules:

* Quran Recitation — 0-5 grading across Fluency, Makharij, Tajweed, Waqf, Accuracy, with automatic averaging, grade bands, weakness detection and teacher recommendations.
* Memorisation (Hifz) — per-surah ayah tracking, revision history, Juz aggregation, biweekly revision reminders via cron.
* Daily Duas & Namaz Duas — Arabic + transliteration + translation, oral assessment with tajweed verification flag.
* Attendance — bulk recording per class/day, present/absent/late/excused.
* Reports — student report card PDF, class performance Excel/CSV exports.
* Audit log — every write captured with actor, IP and user agent.

Security: nonce-protected REST routes, capability-based authorisation, rate limiting, full sanitisation through wpdb-prepared queries.

== Installation ==

1. Upload the plugin folder to /wp-content/plugins/, or install via WP admin.
2. (Optional) Run `composer install` inside the plugin folder to enable TCPDF + PhpSpreadsheet for richer exports.
3. Activate the plugin. Tables are created automatically.
4. Go to "Islamic School" -> Settings to set school name & logo.
5. Add shortcodes to any page: [ism_login], [ism_student_dashboard], [ism_teacher_dashboard].

== Changelog ==

= 1.0.0 =
* Initial release.
