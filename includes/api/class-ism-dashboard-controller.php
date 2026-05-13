<?php
/**
 * REST controller: dashboard aggregate KPIs.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Dashboard_Controller {

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/dashboard/admin', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'admin_widgets' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/dashboard/teacher', array(
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => array( __CLASS__, 'teacher_widgets' ),
            'permission_callback' => ISM_Security::require_cap( 'ism_view_dashboard' ),
        ) );
    }

    public static function admin_widgets() {
        global $wpdb;
        $p = $wpdb->prefix;
        $today = current_time( 'Y-m-d' );

        $total_students  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}ism_students WHERE status='active'" );
        $total_teachers  = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}ism_teachers WHERE status='active'" );
        $total_classes   = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$p}ism_classes" );
        $attendance_today = $wpdb->get_results( $wpdb->prepare(
            "SELECT status, COUNT(*) AS n FROM {$p}ism_attendance WHERE attended_on = %s GROUP BY status", $today
        ), ARRAY_A );

        $recent_assessments = $wpdb->get_results(
            "SELECT a.id, a.assessed_on, a.module_type, a.overall_score, a.overall_grade,
                    s.first_name, s.last_name
             FROM {$p}ism_assessments a
             JOIN {$p}ism_students s ON s.id = a.student_id
             ORDER BY a.created_at DESC LIMIT 10", ARRAY_A
        );

        $top_performers = $wpdb->get_results(
            "SELECT s.id, s.first_name, s.last_name, AVG(a.overall_score) AS avg_score
             FROM {$p}ism_assessments a
             JOIN {$p}ism_students s ON s.id = a.student_id
             WHERE a.module_type = 'quran_recitation'
             GROUP BY s.id
             HAVING avg_score IS NOT NULL
             ORDER BY avg_score DESC LIMIT 5", ARRAY_A
        );

        return rest_ensure_response( array(
            'total_students'      => $total_students,
            'total_teachers'      => $total_teachers,
            'total_classes'       => $total_classes,
            'attendance_today'    => $attendance_today,
            'recent_assessments'  => $recent_assessments,
            'top_performers'      => $top_performers,
        ) );
    }

    public static function teacher_widgets() {
        global $wpdb;
        $p = $wpdb->prefix;
        $teacher_id = ISM_Security::current_teacher_id();
        if ( ! $teacher_id ) {
            return new WP_Error( 'ism_no_profile', 'No teacher profile linked.', array( 'status' => 404 ) );
        }
        $classes = $wpdb->get_results( $wpdb->prepare(
            "SELECT c.id, c.name, c.level,
                    (SELECT COUNT(*) FROM {$p}ism_class_students WHERE class_id = c.id) AS students
             FROM {$p}ism_classes c
             JOIN {$p}ism_class_teachers ct ON ct.class_id = c.id
             WHERE ct.teacher_id = %d
             ORDER BY c.name",
            $teacher_id
        ), ARRAY_A );

        $pending_today = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT COUNT(DISTINCT cs.student_id)
             FROM {$p}ism_class_students cs
             JOIN {$p}ism_class_teachers ct ON ct.class_id = cs.class_id
             LEFT JOIN {$p}ism_attendance att
               ON att.student_id = cs.student_id
              AND att.class_id   = cs.class_id
              AND att.attended_on = %s
             WHERE ct.teacher_id = %d AND att.id IS NULL",
            current_time( 'Y-m-d' ), $teacher_id
        ) );

        return rest_ensure_response( array(
            'teacher_id'                  => $teacher_id,
            'classes'                     => $classes,
            'students_missing_attendance' => $pending_today,
        ) );
    }
}
