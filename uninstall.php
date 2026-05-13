<?php
/**
 * Uninstaller - DROPs all ism_* tables and deletes options.
 * Runs only when the user deletes the plugin from WP admin.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Honour an opt-out so admins don't lose data if they reinstall.
if ( get_option( 'ism_preserve_data_on_uninstall' ) ) {
    return;
}

global $wpdb;
$p = $wpdb->prefix;

$tables = array(
    'ism_audit_logs',
    'ism_notifications',
    'ism_announcements',
    'ism_attendance',
    'ism_dua_progress',
    'ism_duas',
    'ism_memorisation_revisions',
    'ism_memorisation_progress',
    'ism_surahs',
    'ism_quran_recitation_grades',
    'ism_assessments',
    'ism_subjects',
    'ism_class_students',
    'ism_class_teachers',
    'ism_classes',
    'ism_sessions',
    'ism_teachers',
    'ism_students',
);

foreach ( $tables as $t ) {
    $wpdb->query( "DROP TABLE IF EXISTS {$p}{$t}" ); // phpcs:ignore
}

delete_option( 'ism_db_version' );
delete_option( 'ism_settings' );

// Remove custom roles.
remove_role( 'ism_teacher' );
remove_role( 'ism_student' );
remove_role( 'ism_parent' );
