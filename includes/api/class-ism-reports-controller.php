<?php
/**
 * REST controller: export endpoints (PDF / Excel / CSV).
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Reports_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/reports/student/(?P<id>\d+)/pdf', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'student_pdf' ),
            'permission_callback' => array( __CLASS__, 'can_view_student' ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/reports/class/(?P<id>\d+)/excel', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'class_excel' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_export_class_excel' ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/reports/class/(?P<id>\d+)/csv', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'class_csv' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_export_class_excel' ),
        ) );
    }

    public static function can_view_student( WP_REST_Request $r ) {
        if ( ! is_user_logged_in() ) {
            return new WP_Error( 'ism_unauthenticated', 'Login required.', array( 'status' => 401 ) );
        }
        $sid = (int) $r['id'];
        if ( current_user_can( 'ism_manage_all' )
          || current_user_can( 'ism_export_class_pdf' )
          || current_user_can( 'ism_grade_students' ) ) {
            return true;
        }
        return ISM_Security::current_student_id() === $sid
            ? true
            : new WP_Error( 'ism_forbidden', 'Not allowed.', array( 'status' => 403 ) );
    }

    public static function student_pdf( WP_REST_Request $r ) {
        ISM_Pdf_Exporter::stream_student_report( (int) $r['id'] );
        exit;
    }

    public static function class_excel( WP_REST_Request $r ) {
        ISM_Excel_Exporter::stream_class_report( (int) $r['id'] );
        exit;
    }

    public static function class_csv( WP_REST_Request $r ) {
        ISM_Csv_Exporter::stream_class_report( (int) $r['id'] );
        exit;
    }
}
