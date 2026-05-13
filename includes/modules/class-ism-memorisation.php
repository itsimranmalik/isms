<?php
/**
 * Memorisation (Hifz) module: Surah-by-surah tracking, revisions, Juz aggregation.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Memorisation_Module {

    const MODULE_TYPE = 'memorisation';

    /**
     * Update a student's progress on a single surah.
     *
     * @param array $payload student_id, surah_id, ayahs_memorised, status, quality_score?, teacher_id?, notes?
     */
    public static function update_progress( array $payload ) {
        global $wpdb;
        $required = array( 'student_id', 'surah_id' );
        foreach ( $required as $k ) {
            if ( ! isset( $payload[ $k ] ) ) {
                return new WP_Error( 'ism_missing_field', "Missing $k", array( 'status' => 400 ) );
            }
        }
        $surah = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}ism_surahs WHERE id = %d", (int) $payload['surah_id']
        ) );
        if ( ! $surah ) {
            return new WP_Error( 'ism_invalid_surah', 'Unknown surah.', array( 'status' => 400 ) );
        }
        $ayahs = isset( $payload['ayahs_memorised'] )
            ? max( 0, min( (int) $payload['ayahs_memorised'], (int) $surah->total_ayahs ) )
            : 0;

        $status = isset( $payload['status'] ) ? sanitize_key( $payload['status'] ) : 'in_progress';
        if ( $ayahs >= $surah->total_ayahs ) {
            $status = 'completed';
        }

        $row = array(
            'student_id'      => (int) $payload['student_id'],
            'surah_id'        => (int) $payload['surah_id'],
            'ayahs_memorised' => $ayahs,
            'status'          => $status,
            'quality_score'   => isset( $payload['quality_score'] ) ? ISM_Security::clamp_grade( $payload['quality_score'] ) : null,
            'teacher_id'      => isset( $payload['teacher_id'] ) ? (int) $payload['teacher_id'] : null,
            'notes'           => isset( $payload['notes'] ) ? sanitize_textarea_field( $payload['notes'] ) : null,
            'last_revised_on' => isset( $payload['revised_on'] ) ? sanitize_text_field( $payload['revised_on'] ) : null,
            'updated_at'      => current_time( 'mysql', 1 ),
        );

        $existing = (int) $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$wpdb->prefix}ism_memorisation_progress WHERE student_id = %d AND surah_id = %d",
            $row['student_id'], $row['surah_id']
        ) );

        if ( $existing ) {
            $wpdb->update( $wpdb->prefix . 'ism_memorisation_progress', $row, array( 'id' => $existing ) );
            $progress_id = $existing;
        } else {
            $wpdb->insert( $wpdb->prefix . 'ism_memorisation_progress', $row );
            $progress_id = (int) $wpdb->insert_id;
        }

        // Record a revision row if quality score given.
        if ( isset( $payload['quality_score'] ) && isset( $payload['teacher_id'] ) ) {
            $wpdb->insert( $wpdb->prefix . 'ism_memorisation_revisions', array(
                'progress_id'   => $progress_id,
                'revised_on'    => $row['last_revised_on'] ?: current_time( 'Y-m-d' ),
                'quality_score' => ISM_Security::clamp_grade( $payload['quality_score'] ),
                'teacher_id'    => (int) $payload['teacher_id'],
                'comments'      => $row['notes'],
            ) );
        }

        ISM_Audit::log( 'memorisation.update', 'memorisation_progress', $progress_id, array(
            'student_id' => $row['student_id'],
            'surah_id'   => $row['surah_id'],
            'status'     => $status,
        ) );

        return $progress_id;
    }

    /**
     * Per-student aggregates: total ayahs memorised, % of Quran, completed surahs, completed juz.
     */
    public static function student_summary( $student_id ) {
        global $wpdb;
        $student_id = (int) $student_id;

        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT s.id AS surah_id, s.number, s.name_transliteration, s.total_ayahs, s.juz_start,
                    COALESCE(p.ayahs_memorised, 0) AS ayahs_memorised,
                    COALESCE(p.status, 'not_started') AS status,
                    p.quality_score, p.last_revised_on
             FROM {$wpdb->prefix}ism_surahs s
             LEFT JOIN {$wpdb->prefix}ism_memorisation_progress p
               ON p.surah_id = s.id AND p.student_id = %d
             ORDER BY s.number",
            $student_id
        ), ARRAY_A );

        $total_ayahs_memorised = 0;
        $surahs_completed      = 0;
        $juz_counts            = array(); // [juz_no => sum(progress_percent)]

        foreach ( $rows as $r ) {
            $total_ayahs_memorised += (int) $r['ayahs_memorised'];
            if ( 'completed' === $r['status'] ) {
                $surahs_completed++;
            }
            $juz = (int) $r['juz_start'];
            if ( ! isset( $juz_counts[ $juz ] ) ) {
                $juz_counts[ $juz ] = array( 'memorised' => 0, 'total' => 0 );
            }
            $juz_counts[ $juz ]['memorised'] += (int) $r['ayahs_memorised'];
            $juz_counts[ $juz ]['total']     += (int) $r['total_ayahs'];
        }

        // Quran is 6236 ayahs canonical.
        $percent_total = round( ( $total_ayahs_memorised / 6236 ) * 100, 2 );

        $juz_breakdown = array();
        foreach ( $juz_counts as $juz => $stats ) {
            $pct = $stats['total'] > 0 ? round( $stats['memorised'] / $stats['total'] * 100, 1 ) : 0;
            $juz_breakdown[] = array( 'juz' => $juz, 'percent' => $pct );
        }

        return array(
            'student_id'         => $student_id,
            'ayahs_memorised'    => $total_ayahs_memorised,
            'percent_of_quran'   => $percent_total,
            'surahs_completed'   => $surahs_completed,
            'surahs_tracked'     => count( $rows ),
            'juz_breakdown'      => $juz_breakdown,
            'detail'             => $rows,
        );
    }

    /**
     * Find students who haven't revised a completed surah in 14+ days; notify their teacher.
     */
    public static function send_revision_reminders() {
        global $wpdb;
        $rows = $wpdb->get_results(
            "SELECT p.id, p.student_id, p.teacher_id, p.surah_id, p.last_revised_on
             FROM {$wpdb->prefix}ism_memorisation_progress p
             WHERE p.status = 'completed'
               AND p.last_revised_on IS NOT NULL
               AND p.last_revised_on < DATE_SUB(CURDATE(), INTERVAL 14 DAY)
               AND p.teacher_id IS NOT NULL
             LIMIT 500",
            ARRAY_A
        );

        $by_teacher = array();
        foreach ( $rows as $r ) {
            $by_teacher[ (int) $r['teacher_id'] ][] = $r;
        }
        foreach ( $by_teacher as $teacher_id => $items ) {
            $teacher = $wpdb->get_row( $wpdb->prepare(
                "SELECT wp_user_id FROM {$wpdb->prefix}ism_teachers WHERE id = %d", $teacher_id
            ) );
            if ( ! $teacher || ! $teacher->wp_user_id ) {
                continue;
            }
            $wpdb->insert( $wpdb->prefix . 'ism_notifications', array(
                'user_id'    => (int) $teacher->wp_user_id,
                'title'      => __( 'Revision Reminder', 'islamic-school-mgmt' ),
                'body'       => sprintf( _n( '%d student needs revision review.', '%d students need revision review.', count( $items ), 'islamic-school-mgmt' ), count( $items ) ),
                'link'       => admin_url( 'admin.php?page=ism-memorisation' ),
                'is_read'    => 0,
                'created_at' => current_time( 'mysql', 1 ),
            ) );
        }
    }
}
