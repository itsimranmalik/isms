<?php
/**
 * Main plugin controller - wires up admin, public, and REST API.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

final class ISM_Plugin {

    /** @var ISM_Plugin */
    private static $instance = null;

    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {}

    /**
     * Boot the plugin.
     */
    public function run() {
        // Run DB upgrade silently if needed.
        ISM_Activator::maybe_upgrade();

        // Register roles (idempotent).
        add_action( 'init', array( 'ISM_Roles', 'register' ) );

        // REST API.
        add_action( 'rest_api_init', array( 'ISM_Rest_Api', 'register_routes' ) );

        // Admin UI.
        if ( is_admin() ) {
            new ISM_Admin();
        }

        // Public shortcodes / front-end.
        new ISM_Public();

        // Schedule daily cron for revision reminders.
        add_action( 'init', array( __CLASS__, 'schedule_cron' ) );
        add_action( 'ism_daily_cron', array( 'ISM_Memorisation_Module', 'send_revision_reminders' ) );
    }

    public static function schedule_cron() {
        if ( ! wp_next_scheduled( 'ism_daily_cron' ) ) {
            wp_schedule_event( time() + 60, 'daily', 'ism_daily_cron' );
        }
    }
}
