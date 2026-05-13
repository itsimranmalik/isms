<?php
/**
 * REST controller: daily + namaz duas.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Duas_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/duas', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'list_duas' ),
            'permission_callback' => ISM_Security::require_login(),
            'args'                => array(
                'category' => array( 'sanitize_callback' => 'sanitize_key' ),
            ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/duas/progress', array(
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => array( __CLASS__, 'update' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_grade_students' ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/duas/student/(?P<student_id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'student_checklist' ),
            'permission_callback' => array( __CLASS__, 'can_view_student' ),
            'args' => array(
                'category' => array( 'sanitize_callback' => 'sanitize_key' ),
            ),
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

    public static function list_duas( WP_REST_Request $r ) {
        return rest_ensure_response(
            ISM_Duas_Module::list_duas( $r->get_param( 'category' ) )
        );
    }

    public static function update( WP_REST_Request $r ) {
        $payload = $r->get_json_params() ?: $r->get_params();
        if ( ! isset( $payload['teacher_id'] ) ) {
            $payload['teacher_id'] = ISM_Security::current_teacher_id();
        }
        $result = ISM_Duas_Module::update_progress( $payload );
        if ( is_wp_error( $result ) ) {
            return $result;
        }
        return rest_ensure_response( array( 'progress_id' => $result ) );
    }

    public static function student_checklist( WP_REST_Request $r ) {
        return rest_ensure_response(
            ISM_Duas_Module::student_checklist( (int) $r['student_id'], $r->get_param( 'category' ) )
        );
    }
}
