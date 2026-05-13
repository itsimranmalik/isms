<?php
/**
 * REST controller: assessments (Quran Recitation primarily).
 *
 * Routes:
 *  POST /assessments/quran-recitation
 *  GET  /assessments/quran-recitation?student_id=&limit=
 *  GET  /assessments/quran-recitation/class/{class_id}
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Assessments_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/assessments/quran-recitation', array(
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'create_quran' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_grade_students' ),
            ),
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'student_trend' ),
                'permission_callback' => array( __CLASS__, 'can_view_student' ),
                'args' => array(
                    'student_id' => array( 'required' => true, 'sanitize_callback' => 'absint' ),
                    'limit'      => array( 'default' => 10, 'sanitize_callback' => 'absint' ),
                ),
            ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/assessments/quran-recitation/class/(?P<class_id>\d+)', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'class_snapshot' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_view_class_reports' ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/assessments/quran-recitation/grading-scale', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'grading_scale' ),
            'permission_callback' => ISM_Security::require_login(),
        ) );
    }

    public static function can_view_student( WP_REST_Request $r ) {
        if ( ! is_user_logged_in() ) {
            return new WP_Error( 'ism_unauthenticated', 'Login required.', array( 'status' => 401 ) );
        }
        $student_id = (int) $r->get_param( 'student_id' );
        // Admin / teachers can view any student. Students can only view themselves.
        if ( current_user_can( 'ism_grade_students' ) || current_user_can( 'ism_manage_all' ) ) {
            return true;
        }
        $own = ISM_Security::current_student_id();
        if ( $own && $own === $student_id ) {
            return true;
        }
        return new WP_Error( 'ism_forbidden', 'Not allowed.', array( 'status' => 403 ) );
    }

    public static function create_quran( WP_REST_Request $r ) {
        $payload = $r->get_json_params() ?: $r->get_params();
        if ( ! isset( $payload['teacher_id'] ) ) {
            $payload['teacher_id'] = ISM_Security::current_teacher_id();
        }
        $result = ISM_Quran_Recitation_Module::record_assessment( $payload );
        if ( is_wp_error( $result ) ) {
            return $result;
        }
        return rest_ensure_response( array( 'assessment_id' => $result ) );
    }

    public static function student_trend( WP_REST_Request $r ) {
        $trend = ISM_Quran_Recitation_Module::student_trend(
            (int) $r->get_param( 'student_id' ),
            (int) $r->get_param( 'limit' )
        );
        return rest_ensure_response( array( 'data' => $trend ) );
    }

    public static function class_snapshot( WP_REST_Request $r ) {
        $snap = ISM_Quran_Recitation_Module::class_snapshot( (int) $r['class_id'] );
        return rest_ensure_response( array( 'data' => $snap ) );
    }

    public static function grading_scale() {
        $scale = array();
        foreach ( ISM_Quran_Recitation_Module::GRADE_BANDS as $b ) {
            $scale[] = array( 'min' => $b[0], 'label' => $b[1], 'gpa' => $b[2], 'color' => $b[3] );
        }
        return rest_ensure_response( array(
            'categories' => ISM_Quran_Recitation_Module::CATEGORIES,
            'bands'      => $scale,
            'scale_min'  => 0,
            'scale_max'  => 5,
            'guidelines' => array(
                0 => __( 'Not Attempted', 'islamic-school-mgmt' ),
                1 => __( 'Very Weak — many mistakes; full teacher assistance', 'islamic-school-mgmt' ),
                2 => __( 'Weak — frequent pauses, Tajweed rarely applied', 'islamic-school-mgmt' ),
                3 => __( 'Satisfactory — fluency improving, basic Tajweed', 'islamic-school-mgmt' ),
                4 => __( 'Good — steady fluency, mostly accurate', 'islamic-school-mgmt' ),
                5 => __( 'Excellent — Tajweed correct throughout, very few mistakes', 'islamic-school-mgmt' ),
            ),
        ) );
    }
}
