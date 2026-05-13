<?php
/**
 * Public-facing shortcodes:
 *   [ism_login]               — branded login form
 *   [ism_student_dashboard]   — student panel
 *   [ism_teacher_dashboard]   — teacher panel
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Public {

    public function __construct() {
        add_action( 'wp_enqueue_scripts', array( $this, 'assets' ) );
        add_shortcode( 'ism_login',              array( $this, 'shortcode_login' ) );
        add_shortcode( 'ism_student_dashboard',  array( $this, 'shortcode_student_dashboard' ) );
        add_shortcode( 'ism_teacher_dashboard',  array( $this, 'shortcode_teacher_dashboard' ) );
    }

    public function assets() {
        wp_register_style(  'ism-public', ISM_PLUGIN_URL . 'assets/css/ism.css', array(), ISM_VERSION );
        wp_register_script( 'ism-public', ISM_PLUGIN_URL . 'assets/js/ism-public.js', array(), ISM_VERSION, true );
        wp_localize_script( 'ism-public', 'ISM', array(
            'apiBase' => esc_url_raw( rest_url( ISM_REST_NAMESPACE ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'logoUrl' => get_option( 'ism_settings' )['logo_url'] ?? '',
        ) );
    }

    private function enqueue_assets() {
        wp_enqueue_style( 'ism-public' );
        wp_enqueue_script( 'ism-public' );
    }

    public function shortcode_login() {
        $this->enqueue_assets();
        if ( is_user_logged_in() ) {
            return '<div class="ism-public-shell"><p>' . esc_html__( 'You are signed in.', 'islamic-school-mgmt' ) . ' <a href="' . esc_url( wp_logout_url( home_url() ) ) . '">' . esc_html__( 'Sign out', 'islamic-school-mgmt' ) . '</a></p></div>';
        }
        ob_start(); ?>
        <div class="ism-public-shell">
            <div class="ism-card ism-login-card">
                <h2><span class="ism-crescent">☪</span> <?php esc_html_e( 'Sign in', 'islamic-school-mgmt' ); ?></h2>
                <?php wp_login_form( array(
                    'redirect' => esc_url( home_url( '/dashboard/' ) ),
                    'label_username' => __( 'Username or Email', 'islamic-school-mgmt' ),
                ) ); ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    public function shortcode_student_dashboard() {
        $this->enqueue_assets();
        if ( ! is_user_logged_in() ) {
            return '<div class="ism-public-shell"><p>' . esc_html__( 'Please log in.', 'islamic-school-mgmt' ) . '</p></div>';
        }
        $sid = ISM_Security::current_student_id();
        if ( ! $sid ) {
            return '<div class="ism-public-shell"><p>' . esc_html__( 'No linked student profile.', 'islamic-school-mgmt' ) . '</p></div>';
        }
        ob_start(); ?>
        <div class="ism-public-shell" id="ism-root" data-student-id="<?php echo (int) $sid; ?>">
            <div class="ism-header">
                <h1><span class="ism-crescent">☪</span> <?php esc_html_e( 'My Dashboard', 'islamic-school-mgmt' ); ?></h1>
                <div class="ism-toolbar">
                    <button class="ism-btn" id="ism-theme-toggle"><?php esc_html_e( 'Theme', 'islamic-school-mgmt' ); ?></button>
                    <a class="ism-btn" href="<?php echo esc_url( wp_logout_url( home_url() ) ); ?>"><?php esc_html_e( 'Sign out', 'islamic-school-mgmt' ); ?></a>
                </div>
            </div>
            <section class="ism-grid">
                <div class="ism-card ism-card-wide">
                    <h2><?php esc_html_e( 'Quran Recitation — last 10', 'islamic-school-mgmt' ); ?></h2>
                    <canvas id="ism-stu-trend" height="120"></canvas>
                </div>
                <div class="ism-card">
                    <h2><?php esc_html_e( 'Memorisation', 'islamic-school-mgmt' ); ?></h2>
                    <div id="ism-stu-memo"></div>
                </div>
                <div class="ism-card">
                    <h2><?php esc_html_e( 'Duas Progress', 'islamic-school-mgmt' ); ?></h2>
                    <div id="ism-stu-duas"></div>
                </div>
                <div class="ism-card ism-card-wide">
                    <h2><?php esc_html_e( 'Download Report', 'islamic-school-mgmt' ); ?></h2>
                    <button class="ism-btn ism-btn-primary" id="ism-stu-pdf"><?php esc_html_e( 'Download PDF', 'islamic-school-mgmt' ); ?></button>
                </div>
            </section>
        </div>
        <?php
        return ob_get_clean();
    }

    public function shortcode_teacher_dashboard() {
        $this->enqueue_assets();
        if ( ! is_user_logged_in() ) {
            return '<div class="ism-public-shell"><p>' . esc_html__( 'Please log in.', 'islamic-school-mgmt' ) . '</p></div>';
        }
        $tid = ISM_Security::current_teacher_id();
        if ( ! $tid ) {
            return '<div class="ism-public-shell"><p>' . esc_html__( 'No linked teacher profile.', 'islamic-school-mgmt' ) . '</p></div>';
        }
        ob_start(); ?>
        <div class="ism-public-shell" id="ism-root" data-teacher-id="<?php echo (int) $tid; ?>">
            <div class="ism-header">
                <h1><span class="ism-crescent">☪</span> <?php esc_html_e( 'Teacher Dashboard', 'islamic-school-mgmt' ); ?></h1>
                <div class="ism-toolbar">
                    <button class="ism-btn" id="ism-theme-toggle"><?php esc_html_e( 'Theme', 'islamic-school-mgmt' ); ?></button>
                    <a class="ism-btn" href="<?php echo esc_url( wp_logout_url( home_url() ) ); ?>"><?php esc_html_e( 'Sign out', 'islamic-school-mgmt' ); ?></a>
                </div>
            </div>
            <section class="ism-grid">
                <div class="ism-card ism-card-wide">
                    <h2><?php esc_html_e( 'My Classes', 'islamic-school-mgmt' ); ?></h2>
                    <div id="ism-teacher-classes"></div>
                </div>
            </section>
        </div>
        <?php
        return ob_get_clean();
    }
}
