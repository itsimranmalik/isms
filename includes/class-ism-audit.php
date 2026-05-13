<?php
/**
 * Append-only audit log writer.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Audit {

    public static function log( $action, $object_type, $object_id = null, $meta = array() ) {
        global $wpdb;
        $wpdb->insert(
            $wpdb->prefix . 'ism_audit_logs',
            array(
                'actor_id'    => get_current_user_id() ?: null,
                'action'      => substr( (string) $action, 0, 80 ),
                'object_type' => substr( (string) $object_type, 0, 60 ),
                'object_id'   => $object_id ? (int) $object_id : null,
                'meta'        => $meta ? wp_json_encode( $meta ) : null,
                'ip_address'  => self::client_ip(),
                'user_agent'  => isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( sanitize_text_field( $_SERVER['HTTP_USER_AGENT'] ), 0, 255 ) : null,
                'created_at'  => current_time( 'mysql', 1 ),
            )
        );
    }

    private static function client_ip() {
        foreach ( array( 'HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR' ) as $h ) {
            if ( ! empty( $_SERVER[ $h ] ) ) {
                $ip = explode( ',', (string) $_SERVER[ $h ] )[0];
                $ip = trim( $ip );
                if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
                    return $ip;
                }
            }
        }
        return null;
    }
}
