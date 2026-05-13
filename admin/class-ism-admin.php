<?php
/**
 * Admin menu, settings, and view loading.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Admin {

    public function __construct() {
        add_action( 'admin_menu',            array( $this, 'menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'assets' ) );
        add_action( 'admin_init',            array( $this, 'register_settings' ) );
    }

    public function menu() {
        $cap = 'ism_view_dashboard';
        add_menu_page(
            __( 'Islamic School', 'islamic-school-mgmt' ),
            __( 'Islamic School', 'islamic-school-mgmt' ),
            $cap,
            'ism-dashboard',
            array( $this, 'render_dashboard' ),
            'dashicons-book-alt',
            27
        );
        $sub = function ( $slug, $title, $callback, $cap = null ) {
            add_submenu_page(
                'ism-dashboard',
                $title,
                $title,
                $cap ?: 'ism_view_dashboard',
                $slug,
                $callback
            );
        };
        $sub( 'ism-dashboard',     __( 'Dashboard',     'islamic-school-mgmt' ), array( $this, 'render_dashboard' ) );
        $sub( 'ism-students',      __( 'Students',      'islamic-school-mgmt' ), array( $this, 'render_view' ) );
        $sub( 'ism-teachers',      __( 'Teachers',      'islamic-school-mgmt' ), array( $this, 'render_view' ) );
        $sub( 'ism-classes',       __( 'Classes',       'islamic-school-mgmt' ), array( $this, 'render_view' ) );
        $sub( 'ism-assessments',   __( 'Assessments',   'islamic-school-mgmt' ), array( $this, 'render_view' ), 'ism_grade_students' );
        $sub( 'ism-memorisation',  __( 'Memorisation',  'islamic-school-mgmt' ), array( $this, 'render_view' ) );
        $sub( 'ism-duas',          __( 'Duas',          'islamic-school-mgmt' ), array( $this, 'render_view' ) );
        $sub( 'ism-attendance',    __( 'Attendance',    'islamic-school-mgmt' ), array( $this, 'render_view' ), 'ism_take_attendance' );
        $sub( 'ism-reports',       __( 'Reports',       'islamic-school-mgmt' ), array( $this, 'render_view' ) );
        $sub( 'ism-audit',         __( 'Audit Log',     'islamic-school-mgmt' ), array( $this, 'render_view' ), 'ism_view_audit_logs' );
        $sub( 'ism-settings',      __( 'Settings',      'islamic-school-mgmt' ), array( $this, 'render_view' ), 'ism_manage_settings' );
    }

    public function assets( $hook ) {
        if ( strpos( (string) $hook, 'ism-' ) === false ) {
            return;
        }
        // Tailwind CDN keeps things easy; production sites can self-host.
        wp_enqueue_script( 'ism-tailwind', 'https://cdn.tailwindcss.com', array(), '3.4.0', false );
        wp_enqueue_script( 'ism-chartjs', 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js', array(), '4.4.0', false );

        wp_enqueue_style(  'ism-admin', ISM_PLUGIN_URL . 'assets/css/ism.css', array(), ISM_VERSION );
        wp_enqueue_script( 'ism-admin', ISM_PLUGIN_URL . 'assets/js/ism-admin.js', array( 'ism-chartjs' ), ISM_VERSION, true );

        wp_localize_script( 'ism-admin', 'ISM', array(
            'apiBase' => esc_url_raw( rest_url( ISM_REST_NAMESPACE ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'logoUrl' => get_option( 'ism_settings' )['logo_url'] ?? '',
        ) );
    }

    public function register_settings() {
        register_setting( 'ism_settings_group', 'ism_settings', array(
            'sanitize_callback' => function ( $input ) {
                return array(
                    'school_name'  => sanitize_text_field( $input['school_name'] ?? '' ),
                    'logo_url'     => esc_url_raw( $input['logo_url'] ?? '' ),
                    'theme'        => in_array( $input['theme'] ?? 'light', array( 'light', 'dark' ), true ) ? $input['theme'] : 'light',
                    'language'     => sanitize_text_field( $input['language'] ?? 'en_US' ),
                    'smtp_host'    => sanitize_text_field( $input['smtp_host'] ?? '' ),
                    'smtp_port'    => (int) ( $input['smtp_port'] ?? 587 ),
                    'smtp_user'    => sanitize_text_field( $input['smtp_user'] ?? '' ),
                    'smtp_from'    => sanitize_email( $input['smtp_from'] ?? '' ),
                );
            },
        ) );
    }

    public function render_dashboard() {
        include ISM_PLUGIN_DIR . 'admin/views/dashboard.php';
    }

    public function render_view() {
        $page = isset( $_GET['page'] ) ? sanitize_key( $_GET['page'] ) : '';
        $map  = array(
            'ism-students'     => 'students.php',
            'ism-teachers'     => 'teachers.php',
            'ism-classes'      => 'classes.php',
            'ism-assessments'  => 'assessments.php',
            'ism-memorisation' => 'memorisation.php',
            'ism-duas'         => 'duas.php',
            'ism-attendance'   => 'attendance.php',
            'ism-reports'      => 'reports.php',
            'ism-audit'        => 'audit.php',
            'ism-settings'     => 'settings.php',
        );
        if ( isset( $map[ $page ] ) ) {
            include ISM_PLUGIN_DIR . 'admin/views/' . $map[ $page ];
        }
    }
}
