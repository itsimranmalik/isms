<?php
/**
 * Role & capability registration. Idempotent — safe to call on every init.
 *
 * Capability map:
 *  Admin       -> manage_options (WP built-in) + all ism_* caps
 *  Teacher     -> ism_view_dashboard, ism_take_attendance, ism_grade_students,
 *                 ism_export_class_pdf, ism_upload_materials
 *  Student     -> ism_view_own_records
 *  Parent      -> ism_view_child_records
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Roles {

    const TEACHER_CAPS = array(
        'read'                   => true,
        'ism_view_dashboard'     => true,
        'ism_take_attendance'    => true,
        'ism_grade_students'     => true,
        'ism_export_class_pdf'   => true,
        'ism_export_class_excel' => true,
        'ism_upload_materials'   => true,
        'ism_view_class_reports' => true,
    );

    const STUDENT_CAPS = array(
        'read'                   => true,
        'ism_view_own_records'   => true,
    );

    const PARENT_CAPS = array(
        'read'                   => true,
        'ism_view_child_records' => true,
    );

    const ADMIN_EXTRA_CAPS = array(
        'ism_manage_all',
        'ism_view_dashboard',
        'ism_take_attendance',
        'ism_grade_students',
        'ism_export_class_pdf',
        'ism_export_class_excel',
        'ism_upload_materials',
        'ism_view_class_reports',
        'ism_manage_settings',
        'ism_view_audit_logs',
    );

    public static function register() {
        // Add custom roles.
        if ( ! get_role( 'ism_teacher' ) ) {
            add_role( 'ism_teacher', __( 'Teacher (ISM)', 'islamic-school-mgmt' ), self::TEACHER_CAPS );
        } else {
            self::sync_role( 'ism_teacher', self::TEACHER_CAPS );
        }
        if ( ! get_role( 'ism_student' ) ) {
            add_role( 'ism_student', __( 'Student (ISM)', 'islamic-school-mgmt' ), self::STUDENT_CAPS );
        } else {
            self::sync_role( 'ism_student', self::STUDENT_CAPS );
        }
        if ( ! get_role( 'ism_parent' ) ) {
            add_role( 'ism_parent', __( 'Parent (ISM)', 'islamic-school-mgmt' ), self::PARENT_CAPS );
        } else {
            self::sync_role( 'ism_parent', self::PARENT_CAPS );
        }

        // Promote admin.
        $admin = get_role( 'administrator' );
        if ( $admin ) {
            foreach ( self::ADMIN_EXTRA_CAPS as $cap ) {
                $admin->add_cap( $cap );
            }
        }
    }

    private static function sync_role( $slug, $caps ) {
        $role = get_role( $slug );
        if ( ! $role ) {
            return;
        }
        foreach ( $caps as $cap => $grant ) {
            $role->add_cap( $cap, (bool) $grant );
        }
    }
}
