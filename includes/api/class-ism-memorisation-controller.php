<?php
/**
 * REST controller: memorisation progress + surah catalogue.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Memorisation_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/memorisation/surahs', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'list_surahs' ),
            'permission_callback' => ISM_Security::require_login(),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/memorisation/progress', array(
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'update_progress' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_grade_students' ),
            ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/memorisation/student/(?P<student_id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'student_summary' ),
            'permission_callback' => array( __CLASS__, 'can_view_student' ),
        ) );
    }

    public static function can_view_student( WP_REST_Request $r ) {
        if ( ! is_user_logged_in() ) {
            return new WP_Error( 'ism_unauthenticated', 'Login required.', array( 'status' => 401 ) );
        }
        $student_id = (int) $r['student_id'];
        if ( current_user_can( 'ism_grade_students' ) || current_user_can( 'ism_manage_all' ) ) {
            return true;
        }
        return ISM_Security::current_student_id() === $student_id
            ? true
            : new WP_Error( 'ism_forbidden', 'Not allowed.', array( 'status' => 403 ) );
    }

    public static function list_surahs() {
        global $wpdb;
        return rest_ensure_response(
            $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}ism_surahs ORDER BY number", ARRAY_A )
        );
    }

    public static function update_progress( WP_REST_Request $r ) {
        $payload = $r->get_json_params() ?: $r->get_params();
        if ( ! isset( $payload['teacher_id'] ) ) {
            $payload['teacher_id'] = ISM_Security::current_teacher_id();
        }
        $result = ISM_Memorisation_Module::update_progress( $payload );
        if ( is_wp_error( $result ) ) {
            return $result;
        }
        return rest_ensure_response( array( 'progress_id' => $result ) );
    }

    public static function student_summary( WP_REST_Request $r ) {
        $summary = ISM_Memorisation_Module::student_summary( (int) $r['student_id'] );
        return rest_ensure_response( $summary );
    }
}
