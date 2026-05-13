<?php
/**
 * Plugin deactivation - non-destructive. Tables are dropped only on uninstall.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Deactivator {
    public static function deactivate() {
        $hook = 'ism_daily_cron';
        $timestamp = wp_next_scheduled( $hook );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, $hook );
        }
        flush_rewrite_rules();
    }
}
