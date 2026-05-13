<?php
/**
 * CSV exporter — no dependencies.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Csv_Exporter {

    public static function stream_class_report( $class_id ) {
        global $wpdb;
        $class_id = (int) $class_id;
        $class    = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}ism_classes WHERE id = %d", $class_id
        ), ARRAY_A );
        if ( ! $class ) {
            wp_die( esc_html__( 'Class not found.', 'islamic-school-mgmt' ), 404 );
        }
        $rows = ISM_Quran_Recitation_Module::class_snapshot( $class_id );

        nocache_headers();
        header( 'Content-Type: text/csv; charset=utf-8' );
        header( 'Content-Disposition: attachment; filename="class-' . $class_id . '-report.csv"' );

        $out = fopen( 'php://output', 'w' );
        // BOM so Excel recognises UTF-8.
        fwrite( $out, "\xEF\xBB\xBF" );
        fputcsv( $out, array( 'Class', $class['name'] ) );
        fputcsv( $out, array() );
        fputcsv( $out, array( 'Student ID', 'First Name', 'Last Name', 'Latest Average', 'Latest Grade' ) );
        foreach ( $rows as $row ) {
            fputcsv( $out, array(
                $row['student_id'],
                $row['first_name'],
                $row['last_name'],
                $row['latest_average'] ?? '',
                $row['latest_grade'] ?? '',
            ) );
        }
        fclose( $out );
    }
}
