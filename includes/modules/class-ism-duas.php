<?php
/**
 * Combined Duas module — serves Daily Duas + Namaz Duas via a category column.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Duas_Module {

    const CATEGORY_DAILY = 'daily';
    const CATEGORY_NAMAZ = 'namaz';

    public static function list_duas( $category = null ) {
        global $wpdb;
        if ( $category ) {
            return $wpdb->get_results( $wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}ism_duas WHERE category = %s ORDER BY sort_order, id",
                sanitize_key( $category )
            ), ARRAY_A );
        }
        return $wpdb->get_results(
            "SELECT * FROM {$wpdb->prefix}ism_duas ORDER BY category, sort_order, id",
            ARRAY_A
        );
    }

    /**
     * Update a student's progress on one dua.
     *
     * @param array $payload student_id, dua_id, status, score?, tajweed_verified?, teacher_id?, comments?
     */
    public static function update_progress( array $payload ) {
        global $wpdb;
        foreach ( array( 'student_id', 'dua_id' ) as $k ) {
            if ( ! isset( $payload[ $k ] ) ) {
                return new WP_Error( 'ism_missing_field', "Missing $k", array( 'status' => 400 ) );
            }
        }

        $row = array(
            'student_id'       => (int) $payload['student_id'],
            'dua_id'           => (int) $payload['dua_id'],
            'status'           => isset( $payload['status'] ) ? sanitize_key( $payload['status'] ) : 'in_progress',
            'score'            => isset( $payload['score'] ) ? ISM_Security::clamp_grade( $payload['score'] ) : null,
            'tajweed_verified' => ! empty( $payload['tajweed_verified'] ) ? 1 : 0,
            'teacher_id'       => isset( $payload['teacher_id'] ) ? (int) $payload['teacher_id'] : null,
            'assessed_on'      => isset( $payload['assessed_on'] ) ? sanitize_text_field( $payload['assessed_on'] ) : current_time( 'Y-m-d' ),
            'comments'         => isset( $payload['comments'] ) ? sanitize_textarea_field( $payload['comments'] ) : null,
        );

        $existing = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}ism_dua_progress WHERE student_id = %d AND dua_id = %d",
            $row['student_id'], $row['dua_id']
        ) );
        if ( $existing ) {
            $wpdb->update( $wpdb->prefix . 'ism_dua_progress', $row, array( 'id' => $existing ) );
            $id = $existing;
        } else {
            $wpdb->insert( $wpdb->prefix . 'ism_dua_progress', $row );
            $id = (int) $wpdb->insert_id;
        }

        ISM_Audit::log( 'duas.update', 'dua_progress', $id, array(
            'student_id' => $row['student_id'],
            'dua_id'     => $row['dua_id'],
            'status'     => $row['status'],
            'score'      => $row['score'],
        ) );

        return $id;
    }

    /**
     * Per-student checklist grouped by category, including progress percentage.
     */
    public static function student_checklist( $student_id, $category = null ) {
        global $wpdb;
        $student_id = (int) $student_id;
        $sql = "SELECT d.id, d.category, d.title, d.arabic_text, d.transliteration, d.translation,
                       p.status, p.score, p.tajweed_verified, p.assessed_on, p.comments
                FROM {$wpdb->prefix}ism_duas d
                LEFT JOIN {$wpdb->prefix}ism_dua_progress p
                  ON p.dua_id = d.id AND p.student_id = %d";
        $params = array( $student_id );
        if ( $category ) {
            $sql     .= ' WHERE d.category = %s';
            $params[] = sanitize_key( $category );
        }
        $sql .= ' ORDER BY d.category, d.sort_order, d.id';
        $rows = $wpdb->get_results( $wpdb->prepare( $sql, $params ), ARRAY_A );

        // Compute summary per category.
        $by_cat = array();
        foreach ( $rows as $r ) {
            $cat = $r['category'];
            if ( ! isset( $by_cat[ $cat ] ) ) {
                $by_cat[ $cat ] = array( 'total' => 0, 'completed' => 0, 'avg_score' => 0, 'score_count' => 0, 'items' => array() );
            }
            $by_cat[ $cat ]['total']++;
            if ( 'completed' === ( $r['status'] ?? '' ) ) {
                $by_cat[ $cat ]['completed']++;
            }
            if ( null !== $r['score'] ) {
                $by_cat[ $cat ]['avg_score']   += (int) $r['score'];
                $by_cat[ $cat ]['score_count']++;
            }
            $by_cat[ $cat ]['items'][] = $r;
        }
        foreach ( $by_cat as $cat => &$data ) {
            $data['percent_complete'] = $data['total'] ? round( $data['completed'] / $data['total'] * 100, 1 ) : 0;
            $data['avg_score']        = $data['score_count'] ? round( $data['avg_score'] / $data['score_count'], 2 ) : null;
            unset( $data['score_count'] );
        }
        return $by_cat;
    }
}
