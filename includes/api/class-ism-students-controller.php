<?php
/**
 * REST controller: students. Admin-only writes.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Students_Controller {

    const SCHEMA = array(
        'student_code'   => 'text',
        'first_name'     => 'text',
        'last_name'      => 'text',
        'date_of_birth'  => 'date',
        'gender'         => 'text',
        'guardian_name'  => 'text',
        'guardian_phone' => 'text',
        'guardian_email' => 'email',
        'address'        => 'textarea',
        'photo_url'      => 'url',
        'enrolled_on'    => 'date',
        'status'         => 'key',
        'wp_user_id'     => 'int',
    );

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/students', array(
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'index' ),
                'permission_callback' => ISM_Security::require_login(),
                'args'                => array(
                    'q'        => array( 'sanitize_callback' => 'sanitize_text_field' ),
                    'class_id' => array( 'sanitize_callback' => 'absint' ),
                    'page'     => array( 'default' => 1, 'sanitize_callback' => 'absint' ),
                    'per_page' => array( 'default' => 25, 'sanitize_callback' => 'absint' ),
                ),
            ),
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'create' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
            ),
        ) );

        register_rest_route( ISM_REST_NAMESPACE, '/students/(?P<id>\d+)', array(
            array(
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => array( __CLASS__, 'show' ),
                'permission_callback' => ISM_Security::require_login(),
            ),
            array(
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => array( __CLASS__, 'update' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
            ),
            array(
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => array( __CLASS__, 'destroy' ),
                'permission_callback' => ISM_Security::require_cap( 'ism_manage_all' ),
            ),
        ) );
    }

    public static function index( WP_REST_Request $r ) {
        global $wpdb;
        $page     = max( 1, (int) $r->get_param( 'page' ) );
        $per_page = max( 1, min( 100, (int) $r->get_param( 'per_page' ) ?: 25 ) );
        $offset   = ( $page - 1 ) * $per_page;
        $q        = trim( (string) $r->get_param( 'q' ) );
        $class_id = (int) $r->get_param( 'class_id' );

        $where = array( '1=1' );
        $args  = array();
        if ( $q ) {
            $where[] = '(s.first_name LIKE %s OR s.last_name LIKE %s OR s.student_code LIKE %s)';
            $like    = '%' . $wpdb->esc_like( $q ) . '%';
            array_push( $args, $like, $like, $like );
        }
        if ( $class_id ) {
            $where[] = 'cs.class_id = %d';
            $args[]  = $class_id;
        }

        $join = $class_id
            ? "JOIN {$wpdb->prefix}ism_class_students cs ON cs.student_id = s.id"
            : '';

        $sql = "SELECT s.* FROM {$wpdb->prefix}ism_students s $join WHERE " . implode( ' AND ', $where )
             . ' ORDER BY s.last_name, s.first_name LIMIT %d OFFSET %d';
        array_push( $args, $per_page, $offset );

        $rows = $wpdb->get_results( $wpdb->prepare( $sql, $args ), ARRAY_A );
        return rest_ensure_response( array(
            'data' => $rows,
            'page' => $page,
            'per_page' => $per_page,
        ) );
    }

    public static function show( WP_REST_Request $r ) {
        global $wpdb;
        $id = (int) $r['id'];
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}ism_students WHERE id = %d", $id ), ARRAY_A );
        if ( ! $row ) {
            return new WP_Error( 'ism_not_found', 'Student not found.', array( 'status' => 404 ) );
        }
        return rest_ensure_response( $row );
    }

    public static function create( WP_REST_Request $r ) {
        global $wpdb;
        $data = ISM_Security::sanitise_payload( $r->get_json_params() ?: $r->get_params(), self::SCHEMA );
        if ( empty( $data['student_code'] ) || empty( $data['first_name'] ) || empty( $data['last_name'] ) ) {
            return new WP_Error( 'ism_invalid', 'student_code, first_name, last_name required.', array( 'status' => 400 ) );
        }
        $now = current_time( 'mysql', 1 );
        $data['created_at'] = $now;
        $data['updated_at'] = $now;
        $data['status']     = $data['status'] ?? 'active';
        $ok = $wpdb->insert( $wpdb->prefix . 'ism_students', $data );
        if ( false === $ok ) {
            return new WP_Error( 'ism_db_error', $wpdb->last_error, array( 'status' => 500 ) );
        }
        $id = (int) $wpdb->insert_id;
        ISM_Audit::log( 'student.create', 'student', $id, $data );
        return self::show( new WP_REST_Request( 'GET', '', array( 'id' => $id ) ) );
    }

    public static function update( WP_REST_Request $r ) {
        global $wpdb;
        $id   = (int) $r['id'];
        $data = ISM_Security::sanitise_payload( $r->get_json_params() ?: $r->get_params(), self::SCHEMA );
        if ( empty( $data ) ) {
            return new WP_Error( 'ism_invalid', 'No valid fields to update.', array( 'status' => 400 ) );
        }
        $data['updated_at'] = current_time( 'mysql', 1 );
        $wpdb->update( $wpdb->prefix . 'ism_students', $data, array( 'id' => $id ) );
        ISM_Audit::log( 'student.update', 'student', $id, $data );
        return self::show( $r );
    }

    public static function destroy( WP_REST_Request $r ) {
        global $wpdb;
        $id = (int) $r['id'];
        $wpdb->delete( $wpdb->prefix . 'ism_students', array( 'id' => $id ) );
        ISM_Audit::log( 'student.delete', 'student', $id );
        return rest_ensure_response( array( 'deleted' => true, 'id' => $id ) );
    }
}
