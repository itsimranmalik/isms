<?php
/**
 * REST controller: classes, plus enrolment / teacher assignment endpoints.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Classes_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/classes', array(
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'index' ),
                'permission_callback' => ISM_Security::require_login(),
            ),
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'create' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
            ),
        ) );
        register_rest_route( ISM_REST_NAMESPACE, '/classes/(?P<id>\d+)/enrol', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( __CLASS__, 'enrol' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
        ) );
        register_rest_route( ISM_REST_NAMESPACE, '/classes/(?P<id>\d+)/assign-teacher', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( __CLASS__, 'assign_teacher' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
        ) );
    }

    public static function index() {
        global $wpdb;
        $rows = $wpdb->get_results(
            "SELECT c.*,
                    (SELECT COUNT(*) FROM {$wpdb->prefix}ism_class_students WHERE class_id = c.id) AS student_count,
                    (SELECT COUNT(*) FROM {$wpdb->prefix}ism_class_teachers WHERE class_id = c.id) AS teacher_count
             FROM {$wpdb->prefix}ism_classes c
             ORDER BY c.name", ARRAY_A
        );
        return rest_ensure_response( $rows );
    }

    public static function create( WP_REST_Request $r ) {
        global $wpdb;
        $params = $r->get_json_params() ?: $r->get_params();
        $name   = sanitize_text_field( $params['name'] ?? '' );
        if ( ! $name ) {
            return new WP_Error( 'ism_invalid', 'name required', array( 'status' => 400 ) );
        }
        $wpdb->insert( $wpdb->prefix . 'ism_classes', array(
            'session_id'  => isset( $params['session_id'] ) ? (int) $params['session_id'] : null,
            'name'        => $name,
            'level'       => isset( $params['level'] ) ? sanitize_text_field( $params['level'] ) : null,
            'description' => isset( $params['description'] ) ? sanitize_textarea_field( $params['description'] ) : null,
            'created_at'  => current_time( 'mysql', 1 ),
        ) );
        $id = (int) $wpdb->insert_id;
        ISM_Audit::log( 'class.create', 'class', $id, array( 'name' => $name ) );
        return rest_ensure_response( array( 'id' => $id, 'name' => $name ) );
    }

    public static function enrol( WP_REST_Request $r ) {
        global $wpdb;
        $class_id    = (int) $r['id'];
        $student_ids = (array) ( $r->get_json_params()['student_ids'] ?? array() );
        $count       = 0;
        foreach ( $student_ids as $sid ) {
            $sid = (int) $sid;
            if ( ! $sid ) continue;
            $wpdb->replace( $wpdb->prefix . 'ism_class_students', array(
                'class_id'    => $class_id,
                'student_id'  => $sid,
                'enrolled_at' => current_time( 'mysql', 1 ),
            ) );
            $count++;
        }
        ISM_Audit::log( 'class.enrol', 'class', $class_id, array( 'students' => $student_ids ) );
        return rest_ensure_response( array( 'enrolled' => $count ) );
    }

    public static function assign_teacher( WP_REST_Request $r ) {
        global $wpdb;
        $class_id   = (int) $r['id'];
        $params     = $r->get_json_params() ?: $r->get_params();
        $teacher_id = (int) ( $params['teacher_id'] ?? 0 );
        $is_lead    = ! empty( $params['is_lead'] );
        if ( ! $teacher_id ) {
            return new WP_Error( 'ism_invalid', 'teacher_id required', array( 'status' => 400 ) );
        }
        $wpdb->replace( $wpdb->prefix . 'ism_class_teachers', array(
            'class_id'    => $class_id,
            'teacher_id'  => $teacher_id,
            'is_lead'     => $is_lead ? 1 : 0,
            'assigned_at' => current_time( 'mysql', 1 ),
        ) );
        ISM_Audit::log( 'class.assign_teacher', 'class', $class_id, array( 'teacher_id' => $teacher_id ) );
        return rest_ensure_response( array( 'assigned' => true ) );
    }
}
