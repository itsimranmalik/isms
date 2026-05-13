<?php
/**
 * Plugin activation: create database schema, seed reference data, register roles.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Activator {

    public static function activate() {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        self::create_tables();
        self::seed_reference_data();
        ISM_Roles::register();
        update_option( 'ism_db_version', ISM_DB_VERSION );
        flush_rewrite_rules();
    }

    public static function maybe_upgrade() {
        $installed = get_option( 'ism_db_version' );
        if ( $installed !== ISM_DB_VERSION ) {
            self::activate();
        }
    }

    /**
     * dbDelta-compatible schema. Foreign keys defined as plain columns
     * (MyISAM compatibility); referential integrity enforced in the data
     * layer plus optional ALTER TABLE FK statements for InnoDB tenants.
     */
    public static function create_tables() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();
        $p       = $wpdb->prefix;

        $statements = array();

        // Students -----------------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_students (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            wp_user_id BIGINT UNSIGNED NULL,
            student_code VARCHAR(40) NOT NULL,
            first_name VARCHAR(120) NOT NULL,
            last_name VARCHAR(120) NOT NULL,
            date_of_birth DATE NULL,
            gender VARCHAR(20) NULL,
            guardian_name VARCHAR(200) NULL,
            guardian_phone VARCHAR(40) NULL,
            guardian_email VARCHAR(190) NULL,
            address TEXT NULL,
            photo_url TEXT NULL,
            enrolled_on DATE NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_student_code (student_code),
            KEY ix_wp_user (wp_user_id),
            KEY ix_status (status)
        ) {$charset};";

        // Teachers -----------------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_teachers (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            wp_user_id BIGINT UNSIGNED NOT NULL,
            staff_code VARCHAR(40) NOT NULL,
            first_name VARCHAR(120) NOT NULL,
            last_name VARCHAR(120) NOT NULL,
            phone VARCHAR(40) NULL,
            email VARCHAR(190) NULL,
            qualifications TEXT NULL,
            photo_url TEXT NULL,
            joined_on DATE NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_staff_code (staff_code),
            KEY ix_wp_user (wp_user_id)
        ) {$charset};";

        // Academic sessions --------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_sessions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            starts_on DATE NOT NULL,
            ends_on DATE NOT NULL,
            is_current TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY ix_current (is_current)
        ) {$charset};";

        // Classes ------------------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_classes (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            session_id BIGINT UNSIGNED NULL,
            name VARCHAR(160) NOT NULL,
            level VARCHAR(60) NULL,
            description TEXT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY ix_session (session_id)
        ) {$charset};";

        // Pivot: classes <-> teachers ---------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_class_teachers (
            class_id BIGINT UNSIGNED NOT NULL,
            teacher_id BIGINT UNSIGNED NOT NULL,
            is_lead TINYINT(1) NOT NULL DEFAULT 0,
            assigned_at DATETIME NOT NULL,
            PRIMARY KEY  (class_id, teacher_id),
            KEY ix_teacher (teacher_id)
        ) {$charset};";

        // Pivot: classes <-> students ---------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_class_students (
            class_id BIGINT UNSIGNED NOT NULL,
            student_id BIGINT UNSIGNED NOT NULL,
            enrolled_at DATETIME NOT NULL,
            PRIMARY KEY  (class_id, student_id),
            KEY ix_student (student_id)
        ) {$charset};";

        // Subjects / modules -------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_subjects (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            code VARCHAR(40) NOT NULL,
            name VARCHAR(160) NOT NULL,
            module_type VARCHAR(40) NOT NULL DEFAULT 'general',
            description TEXT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_code (code),
            KEY ix_module (module_type)
        ) {$charset};";

        // Assessments (parent) ----------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_assessments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            student_id BIGINT UNSIGNED NOT NULL,
            teacher_id BIGINT UNSIGNED NOT NULL,
            class_id BIGINT UNSIGNED NULL,
            module_type VARCHAR(40) NOT NULL,
            assessed_on DATE NOT NULL,
            overall_score DECIMAL(5,2) NULL,
            overall_grade VARCHAR(10) NULL,
            comments TEXT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY ix_student_module (student_id, module_type, assessed_on),
            KEY ix_teacher (teacher_id),
            KEY ix_class (class_id)
        ) {$charset};";

        // Quran Recitation grading (0-5 per category) -----------------------
        $statements[] = "CREATE TABLE {$p}ism_quran_recitation_grades (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            assessment_id BIGINT UNSIGNED NOT NULL,
            surah_id BIGINT UNSIGNED NULL,
            ayah_from SMALLINT UNSIGNED NULL,
            ayah_to SMALLINT UNSIGNED NULL,
            fluency TINYINT UNSIGNED NOT NULL,
            makharij TINYINT UNSIGNED NOT NULL,
            tajweed TINYINT UNSIGNED NOT NULL,
            waqf TINYINT UNSIGNED NOT NULL,
            accuracy TINYINT UNSIGNED NOT NULL,
            average_score DECIMAL(4,2) NOT NULL,
            grade_label VARCHAR(20) NOT NULL,
            weaknesses TEXT NULL,
            recommendations TEXT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_assessment (assessment_id),
            KEY ix_surah (surah_id)
        ) {$charset};";

        // Memorisation progress ---------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_surahs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            number SMALLINT UNSIGNED NOT NULL,
            name_arabic VARCHAR(120) NOT NULL,
            name_transliteration VARCHAR(120) NOT NULL,
            name_english VARCHAR(160) NULL,
            total_ayahs SMALLINT UNSIGNED NOT NULL,
            juz_start TINYINT UNSIGNED NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_number (number)
        ) {$charset};";

        $statements[] = "CREATE TABLE {$p}ism_memorisation_progress (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            student_id BIGINT UNSIGNED NOT NULL,
            surah_id BIGINT UNSIGNED NOT NULL,
            ayahs_memorised SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
            last_revised_on DATE NULL,
            quality_score TINYINT UNSIGNED NULL,
            teacher_id BIGINT UNSIGNED NULL,
            notes TEXT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_student_surah (student_id, surah_id),
            KEY ix_status (status),
            KEY ix_revised (last_revised_on)
        ) {$charset};";

        $statements[] = "CREATE TABLE {$p}ism_memorisation_revisions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            progress_id BIGINT UNSIGNED NOT NULL,
            revised_on DATE NOT NULL,
            quality_score TINYINT UNSIGNED NOT NULL,
            teacher_id BIGINT UNSIGNED NOT NULL,
            comments TEXT NULL,
            PRIMARY KEY  (id),
            KEY ix_progress (progress_id, revised_on)
        ) {$charset};";

        // Duas (Daily + Namaz) -----------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_duas (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            category VARCHAR(40) NOT NULL,
            title VARCHAR(200) NOT NULL,
            arabic_text TEXT NULL,
            transliteration TEXT NULL,
            translation TEXT NULL,
            sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            PRIMARY KEY  (id),
            KEY ix_category (category)
        ) {$charset};";

        $statements[] = "CREATE TABLE {$p}ism_dua_progress (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            student_id BIGINT UNSIGNED NOT NULL,
            dua_id BIGINT UNSIGNED NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            score TINYINT UNSIGNED NULL,
            tajweed_verified TINYINT(1) NOT NULL DEFAULT 0,
            teacher_id BIGINT UNSIGNED NULL,
            assessed_on DATE NULL,
            comments TEXT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_student_dua (student_id, dua_id),
            KEY ix_status (status)
        ) {$charset};";

        // Attendance ---------------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_attendance (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            student_id BIGINT UNSIGNED NOT NULL,
            class_id BIGINT UNSIGNED NOT NULL,
            attended_on DATE NOT NULL,
            status VARCHAR(20) NOT NULL,
            recorded_by BIGINT UNSIGNED NULL,
            note VARCHAR(255) NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ux_student_day (student_id, class_id, attended_on),
            KEY ix_class_day (class_id, attended_on)
        ) {$charset};";

        // Notifications / announcements -------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_announcements (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            body LONGTEXT NOT NULL,
            audience VARCHAR(40) NOT NULL DEFAULT 'all',
            published_at DATETIME NOT NULL,
            author_id BIGINT UNSIGNED NULL,
            PRIMARY KEY  (id),
            KEY ix_published (published_at)
        ) {$charset};";

        $statements[] = "CREATE TABLE {$p}ism_notifications (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            title VARCHAR(200) NOT NULL,
            body TEXT NULL,
            link VARCHAR(500) NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY ix_user_read (user_id, is_read)
        ) {$charset};";

        // Audit log ----------------------------------------------------------
        $statements[] = "CREATE TABLE {$p}ism_audit_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            actor_id BIGINT UNSIGNED NULL,
            action VARCHAR(80) NOT NULL,
            object_type VARCHAR(60) NOT NULL,
            object_id BIGINT UNSIGNED NULL,
            meta LONGTEXT NULL,
            ip_address VARCHAR(64) NULL,
            user_agent VARCHAR(255) NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            KEY ix_actor (actor_id, created_at),
            KEY ix_object (object_type, object_id)
        ) {$charset};";

        foreach ( $statements as $sql ) {
            dbDelta( $sql );
        }
    }

    /**
     * Seed canonical reference data on first install.
     */
    public static function seed_reference_data() {
        global $wpdb;
        $p = $wpdb->prefix;

        // Subjects.
        $existing = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}ism_subjects" );
        if ( 0 === $existing ) {
            $defaults = array(
                array( 'QURAN', 'Quran Recitation',   'quran_recitation' ),
                array( 'HIFZ',  'Memorisation (Hifz)', 'memorisation' ),
                array( 'DUAD',  'Daily Duas',         'daily_duas' ),
                array( 'DUAN',  'Namaz Duas',         'namaz_duas' ),
                array( 'AKHL',  'Akhlaq & Adab',      'general' ),
                array( 'ARAB',  'Arabic Language',    'general' ),
            );
            foreach ( $defaults as $row ) {
                $wpdb->insert( "{$p}ism_subjects", array(
                    'code'        => $row[0],
                    'name'        => $row[1],
                    'module_type' => $row[2],
                ) );
            }
        }

        // Surahs (first 30 Juz Amma + key full surahs).
        if ( 0 === (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}ism_surahs" ) ) {
            $surahs = self::canonical_surah_list();
            foreach ( $surahs as $s ) {
                $wpdb->insert( "{$p}ism_surahs", array(
                    'number'              => $s[0],
                    'name_arabic'         => $s[1],
                    'name_transliteration' => $s[2],
                    'name_english'        => $s[3],
                    'total_ayahs'         => $s[4],
                    'juz_start'           => $s[5],
                ) );
            }
        }

        // Duas (Daily + Namaz starter list).
        if ( 0 === (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}ism_duas" ) ) {
            $duas = self::canonical_duas_list();
            foreach ( $duas as $i => $d ) {
                $wpdb->insert( "{$p}ism_duas", array(
                    'category'        => $d[0],
                    'title'           => $d[1],
                    'arabic_text'     => $d[2],
                    'transliteration' => $d[3],
                    'translation'     => $d[4],
                    'sort_order'      => $i,
                ) );
            }
        }
    }

    private static function canonical_surah_list() {
        // Truncated for brevity - admin can extend via UI / import.
        // Format: [number, arabic, transliteration, english, ayahs, juz_start]
        return array(
            array( 1,  'الفاتحة',   'Al-Fatihah',  'The Opening',          7,   1 ),
            array( 78, 'النبأ',     'An-Naba',     'The Announcement',     40, 30 ),
            array( 79, 'النازعات',  'An-Naziat',   'Those Who Pull Out',   46, 30 ),
            array( 80, 'عبس',       'Abasa',       'He Frowned',           42, 30 ),
            array( 81, 'التكوير',   'At-Takwir',   'The Folding Up',       29, 30 ),
            array( 82, 'الانفطار',  'Al-Infitar',  'The Cleaving',         19, 30 ),
            array( 83, 'المطففين',  'Al-Mutaffifin', 'Defrauding',         36, 30 ),
            array( 84, 'الانشقاق',  'Al-Inshiqaq', 'The Splitting Asunder', 25, 30 ),
            array( 85, 'البروج',    'Al-Buruj',    'The Constellations',   22, 30 ),
            array( 86, 'الطارق',    'At-Tariq',    'The Night-Comer',      17, 30 ),
            array( 87, 'الأعلى',    'Al-Ala',      'The Most High',        19, 30 ),
            array( 88, 'الغاشية',   'Al-Ghashiyah', 'The Overwhelming',    26, 30 ),
            array( 89, 'الفجر',     'Al-Fajr',     'The Dawn',             30, 30 ),
            array( 90, 'البلد',     'Al-Balad',    'The City',             20, 30 ),
            array( 91, 'الشمس',     'Ash-Shams',   'The Sun',              15, 30 ),
            array( 92, 'الليل',     'Al-Layl',     'The Night',            21, 30 ),
            array( 93, 'الضحى',     'Ad-Duha',     'The Forenoon',         11, 30 ),
            array( 94, 'الشرح',     'Ash-Sharh',   'The Opening Forth',     8, 30 ),
            array( 95, 'التين',     'At-Tin',      'The Fig',               8, 30 ),
            array( 96, 'العلق',     'Al-Alaq',     'The Clot',             19, 30 ),
            array( 97, 'القدر',     'Al-Qadr',     'The Night of Decree',   5, 30 ),
            array( 98, 'البينة',    'Al-Bayyinah', 'The Clear Evidence',    8, 30 ),
            array( 99, 'الزلزلة',   'Az-Zalzalah', 'The Earthquake',        8, 30 ),
            array( 100,'العاديات',  'Al-Adiyat',   'The Courser',          11, 30 ),
            array( 101,'القارعة',   'Al-Qariah',   'The Striking Hour',    11, 30 ),
            array( 102,'التكاثر',   'At-Takathur', 'The Piling Up',         8, 30 ),
            array( 103,'العصر',     'Al-Asr',      'The Time',              3, 30 ),
            array( 104,'الهمزة',    'Al-Humazah',  'The Slanderer',         9, 30 ),
            array( 105,'الفيل',     'Al-Fil',      'The Elephant',          5, 30 ),
            array( 106,'قريش',      'Quraysh',     'Quraysh',               4, 30 ),
            array( 107,'الماعون',   'Al-Maun',     'The Small Kindness',    7, 30 ),
            array( 108,'الكوثر',    'Al-Kawthar',  'Abundance',             3, 30 ),
            array( 109,'الكافرون',  'Al-Kafirun',  'The Disbelievers',      6, 30 ),
            array( 110,'النصر',     'An-Nasr',     'The Help',              3, 30 ),
            array( 111,'المسد',     'Al-Masad',    'The Palm Fibre',        5, 30 ),
            array( 112,'الإخلاص',   'Al-Ikhlas',   'Sincerity',             4, 30 ),
            array( 113,'الفلق',     'Al-Falaq',    'The Daybreak',          5, 30 ),
            array( 114,'الناس',     'An-Nas',      'Mankind',               6, 30 ),
        );
    }

    private static function canonical_duas_list() {
        // [category, title, arabic, transliteration, translation]
        return array(
            // Daily
            array( 'daily', 'Before Eating',       'بِسْمِ اللَّهِ',                                   'Bismillah',                              'In the name of Allah' ),
            array( 'daily', 'After Eating',        'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا', 'Alhamdulillah-illadhi at\'amana wa saqana','Praise be to Allah who fed us and gave us drink' ),
            array( 'daily', 'Before Sleep',        'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',           'Bismika Allahumma amutu wa ahya',        'In Your name O Allah, I die and I live' ),
            array( 'daily', 'Waking Up',           'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا',              'Alhamdulillah-illadhi ahyana',           'Praise be to Allah who gave us life' ),
            array( 'daily', 'Entering Bathroom',   'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ',                    'Allahumma inni a\'udhu bika',            'O Allah, I seek refuge in You' ),
            array( 'daily', 'Leaving Home',        'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ',          'Bismillahi tawakkaltu \'ala-llah',       'In the name of Allah, I trust in Allah' ),
            // Namaz
            array( 'namaz', 'Niyyah (Intention)',  'نَوَيْتُ',                                          'Nawaytu',                                 'I intend...' ),
            array( 'namaz', 'Takbir',              'اللَّهُ أَكْبَرُ',                                  'Allahu Akbar',                           'Allah is the Greatest' ),
            array( 'namaz', 'Thana (Subhanaka)',   'سُبْحَانَكَ اللَّهُمَّ',                            'Subhanaka Allahumma',                    'Glory be to You, O Allah' ),
            array( 'namaz', 'Ruku Tasbeeh',        'سُبْحَانَ رَبِّيَ الْعَظِيمِ',                       'Subhana Rabbiyal Adheem',                'Glory be to my Lord, the Most Great' ),
            array( 'namaz', 'Sajdah Tasbeeh',      'سُبْحَانَ رَبِّيَ الْأَعْلَى',                       'Subhana Rabbiyal A\'la',                 'Glory be to my Lord, the Most High' ),
            array( 'namaz', 'Tashahhud',           'التَّحِيَّاتُ لِلَّهِ',                              'At-tahiyyatu lillah',                    'All greetings are for Allah' ),
            array( 'namaz', 'Durood Ibrahim',      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',                    'Allahumma salli \'ala Muhammad',         'O Allah, send blessings upon Muhammad' ),
            array( 'namaz', 'Dua after Tashahhud', 'اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي',                  'Allahumma inni dhalamtu nafsi',          'O Allah, I have wronged myself' ),
            array( 'namaz', 'Salam',               'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ',           'As-salamu \'alaykum wa rahmatullah',     'Peace and mercy of Allah be upon you' ),
        );
    }
}
