<?php
/**
 * REST controller: attendance.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Attendance_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/attendance', array(
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'bulk_record' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_take_attendance' ),
            ),
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'index' ),
                'permission_callback' => ISM_Security::require_login(),
                'args' => array(
                    'class_id' => array( 'sanitize_callback' => 'absint' ),
                    'from'     => array( 'sanitize_callback' => 'sanitize_text_field' ),
                    'to'       => array( 'sanitize_callback' => 'sanitize_text_field' ),
                ),
            ),
        ) );
    }

    public static function bulk_record( WP_REST_Request $r ) {
        global $wpdb;
        $payload    = $r->get_json_params() ?: $r->get_params();
        $class_id   = (int) ( $payload['class_id'] ?? 0 );
        $attended_on = sanitize_text_field( $payload['attended_on'] ?? current_time( 'Y-m-d' ) );
        $entries    = (array) ( $payload['entries'] ?? array() );

        if ( ! $class_id || empty( $entries ) ) {
            return new WP_Error( 'ism_invalid', 'class_id and entries required.', array( 'status' => 400 ) );
        }

        $saved = 0;
        foreach ( $entries as $e ) {
            $sid    = (int) ( $e['student_id'] ?? 0 );
            $status = sanitize_key( $e['status'] ?? 'absent' );
            if ( ! $sid ) continue;
            if ( ! in_array( $status, array( 'present', 'absent', 'late', 'excused' ), true ) ) {
                $status = 'absent';
            }
            $wpdb->replace( $wpdb->prefix . 'ism_attendance', array(
                'student_id'  => $sid,
                'class_id'    => $class_id,
                'attended_on' => $attended_on,
                'status'      => $status,
                'recorded_by' => ISM_Security::current_teacher_id() ?: null,
                'note'        => isset( $e['note'] ) ? sanitize_text_field( $e['note'] ) : null,
            ) );
            $saved++;
        }
        ISM_Audit::log( 'attendance.bulk', 'attendance', $class_id, array( 'count' => $saved, 'date' => $attended_on ) );
        return rest_ensure_response( array( 'saved' => $saved ) );
    }

    public static function index( WP_REST_Request $r ) {
        global $wpdb;
        $class_id = (int) $r->get_param( 'class_id' );
        $from     = $r->get_param( 'from' );
        $to       = $r->get_param( 'to' );

        $sql    = "SELECT * FROM {$wpdb->prefix}ism_attendance WHERE 1=1";
        $params = array();
        if ( $class_id ) { $sql .= ' AND class_id = %d'; $params[] = $class_id; }
        if ( $from )     { $sql .= ' AND attended_on >= %s'; $params[] = $from; }
        if ( $to )       { $sql .= ' AND attended_on <= %s'; $params[] = $to; }
        $sql .= ' ORDER BY attended_on DESC, student_id LIMIT 1000';
        $rows = $params ? $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A )
                        : $wpdb->get_results( $sql, ARRAY_A );
        return rest_ensure_response( $rows );
    }
}
