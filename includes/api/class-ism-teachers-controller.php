<?php
/**
 * REST controller: teachers.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Teachers_Controller {

    const SCHEMA = array(
        'wp_user_id'     => 'int',
        'staff_code'     => 'text',
        'first_name'     => 'text',
        'last_name'      => 'text',
        'phone'          => 'text',
        'email'          => 'email',
        'qualifications' => 'textarea',
        'photo_url'      => 'url',
        'joined_on'      => 'date',
        'status'         => 'key',
    );

    public static function register() {
        register_rest_route( ISM_REST_NAMESPACE, '/teachers', array(
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
        register_rest_route( ISM_REST_NAMESPACE, '/teachers/(?P<id>\d+)', array(
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

    public static function index() {
        global $wpdb;
        return rest_ensure_response(
            $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}ism_teachers ORDER BY last_name, first_name", ARRAY_A )
        );
    }

    public static function show( WP_REST_Request $r ) {
        global $wpdb;
        $row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}ism_teachers WHERE id = %d", (int) $r['id'] ), ARRAY_A );
        return $row ? rest_ensure_response( $row ) : new WP_Error( 'ism_not_found', 'Teacher not found.', array( 'status' => 404 ) );
    }

    public static function create( WP_REST_Request $r ) {
        global $wpdb;
        $data = ISM_Security::sanitise_payload( $r->get_json_params() ?: $r->get_params(), self::SCHEMA );
        if ( empty( $data['staff_code'] ) || empty( $data['wp_user_id'] ) ) {
            return new WP_Error( 'ism_invalid', 'staff_code and wp_user_id required.', array( 'status' => 400 ) );
        }
        $data['created_at'] = current_time( 'mysql', 1 );
        $data['updated_at'] = $data['created_at'];
        $data['status']     = $data['status'] ?? 'active';
        $wpdb->insert( $wpdb->prefix . 'ism_teachers', $data );
        $id = (int) $wpdb->insert_id;
        // Ensure the WP user has the ism_teacher role.
        $user = get_user_by( 'id', (int) $data['wp_user_id'] );
        if ( $user ) {
            $user->add_role( 'ism_teacher' );
        }
        ISM_Audit::log( 'teacher.create', 'teacher', $id, $data );
        return self::show( new WP_REST_Request( 'GET', '', array( 'id' => $id ) ) );
    }

    public static function update( WP_REST_Request $r ) {
        global $wpdb;
        $id   = (int) $r['id'];
        $data = ISM_Security::sanitise_payload( $r->get_json_params() ?: $r->get_params(), self::SCHEMA );
        $data['updated_at'] = current_time( 'mysql', 1 );
        $wpdb->update( $wpdb->prefix . 'ism_teachers', $data, array( 'id' => $id ) );
        ISM_Audit::log( 'teacher.update', 'teacher', $id, $data );
        return self::show( $r );
    }

    public static function destroy( WP_REST_Request $r ) {
        global $wpdb;
        $id = (int) $r['id'];
        $wpdb->delete( $wpdb->prefix . 'ism_teachers', array( 'id' => $id ) );
        ISM_Audit::log( 'teacher.delete', 'teacher', $id );
        return rest_ensure_response( array( 'deleted' => true, 'id' => $id ) );
    }
}
