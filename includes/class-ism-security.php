<?php
/**
 * Security helpers: nonces (CSRF), sanitisation, rate limiting, current-actor utilities.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Security {

    const NONCE_ACTION = 'ism_action';
    const NONCE_FIELD  = 'ism_nonce';

    /**
     * Standard permission callback for REST routes. Accepts a required capability.
     */
    public static function require_cap( $capability ) {
        return function ( WP_REST_Request $request ) use ( $capability ) {
            if ( ! is_user_logged_in() ) {
                return new WP_Error( 'ism_unauthenticated', __( 'Login required.', 'islamic-school-mgmt' ), array( 'status' => 401 ) );
            }
            if ( ! current_user_can( $capability ) ) {
                return new WP_Error( 'ism_forbidden', __( 'Insufficient permission.', 'islamic-school-mgmt' ), array( 'status' => 403 ) );
            }
            if ( ! self::verify_nonce_for_request( $request ) ) {
                return new WP_Error( 'ism_csrf', __( 'Invalid security token.', 'islamic-school-mgmt' ), array( 'status' => 403 ) );
            }
            if ( ! self::rate_limit_ok( $request ) ) {
                return new WP_Error( 'ism_rate_limit', __( 'Too many requests.', 'islamic-school-mgmt' ), array( 'status' => 429 ) );
            }
            return true;
        };
    }

    /**
     * Same as require_cap but for read-only endpoints where rate limiting is gentler.
     */
    public static function require_login() {
        return function () {
            if ( ! is_user_logged_in() ) {
                return new WP_Error( 'ism_unauthenticated', __( 'Login required.', 'islamic-school-mgmt' ), array( 'status' => 401 ) );
            }
            return true;
        };
    }

    public static function verify_nonce_for_request( WP_REST_Request $request ) {
        // WP REST already verifies X-WP-Nonce for cookie auth. Accept either header.
        $nonce = $request->get_header( 'x_wp_nonce' )
              ?: $request->get_header( 'x-ism-nonce' )
              ?: $request->get_param( '_wpnonce' );
        if ( ! $nonce ) {
            return false;
        }
        return (bool) wp_verify_nonce( $nonce, 'wp_rest' )
            || (bool) wp_verify_nonce( $nonce, self::NONCE_ACTION );
    }

    public static function rate_limit_ok( WP_REST_Request $request, $limit = 60, $window = 60 ) {
        $user_id = get_current_user_id();
        $key     = 'ism_rl_' . md5( $user_id . '|' . $request->get_route() );
        $entry   = get_transient( $key );
        $now     = time();
        if ( ! is_array( $entry ) ) {
            set_transient( $key, array( 'c' => 1, 'r' => $now + $window ), $window );
            return true;
        }
        if ( $now > $entry['r'] ) {
            set_transient( $key, array( 'c' => 1, 'r' => $now + $window ), $window );
            return true;
        }
        if ( $entry['c'] >= $limit ) {
            return false;
        }
        $entry['c']++;
        set_transient( $key, $entry, $entry['r'] - $now );
        return true;
    }

    /**
     * Sanitise a flat associative array using a schema map [key => type].
     * Supported types: text, textarea, int, float, bool, date, email, url, slug, key.
     */
    public static function sanitise_payload( array $data, array $schema ) {
        $clean = array();
        foreach ( $schema as $key => $type ) {
            if ( ! array_key_exists( $key, $data ) ) {
                continue;
            }
            $v = $data[ $key ];
            switch ( $type ) {
                case 'int':      $clean[ $key ] = is_null( $v ) ? null : (int) $v; break;
                case 'float':    $clean[ $key ] = is_null( $v ) ? null : (float) $v; break;
                case 'bool':     $clean[ $key ] = (bool) $v; break;
                case 'textarea': $clean[ $key ] = sanitize_textarea_field( (string) $v ); break;
                case 'email':    $clean[ $key ] = sanitize_email( (string) $v ); break;
                case 'url':      $clean[ $key ] = esc_url_raw( (string) $v ); break;
                case 'slug':     $clean[ $key ] = sanitize_title( (string) $v ); break;
                case 'key':      $clean[ $key ] = sanitize_key( (string) $v ); break;
                case 'date':
                    $clean[ $key ] = ( $v && strtotime( (string) $v ) ) ? gmdate( 'Y-m-d', strtotime( (string) $v ) ) : null;
                    break;
                case 'text':
                default:         $clean[ $key ] = sanitize_text_field( (string) $v ); break;
            }
        }
        return $clean;
    }

    /**
     * Helper: clamp 0-5 grade input.
     */
    public static function clamp_grade( $v ) {
        $v = (int) $v;
        if ( $v < 0 ) return 0;
        if ( $v > 5 ) return 5;
        return $v;
    }

    /**
     * Resolve the ism_students.id for the currently logged-in student, or 0.
     */
    public static function current_student_id() {
        global $wpdb;
        $uid = get_current_user_id();
        if ( ! $uid ) return 0;
        return (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}ism_students WHERE wp_user_id = %d",
            $uid
        ) );
    }

    public static function current_teacher_id() {
        global $wpdb;
        $uid = get_current_user_id();
        if ( ! $uid ) return 0;
        return (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}ism_teachers WHERE wp_user_id = %d",
            $uid
        ) );
    }
}
