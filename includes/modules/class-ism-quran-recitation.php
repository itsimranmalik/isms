<?php
/**
 * Quran Recitation Module - 0..5 grading across five categories.
 *
 * Categories: Fluency, Makharij, Tajweed, Waqf, Accuracy.
 * Scale (per the marking guidelines in the system spec):
 *   0 Not Attempted | 1 Very Weak | 2 Weak | 3 Satisfactory | 4 Good | 5 Excellent
 *
 * Responsibilities:
 *   - Persist assessments + per-category scores.
 *   - Calculate average + overall grade label.
 *   - Identify weakest category.
 *   - Surface improvement trend over the last N assessments.
 *   - Generate teacher recommendations.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Quran_Recitation_Module {

    const MODULE_TYPE = 'quran_recitation';

    const CATEGORIES = array( 'fluency', 'makharij', 'tajweed', 'waqf', 'accuracy' );

    const GRADE_BANDS = array(
        // [min_average_inclusive, label, gpa_letter, css_color]
        array( 0.0, __( 'Not Attempted', 'islamic-school-mgmt' ), 'NA', '#9CA3AF' ),
        array( 0.5, __( 'Very Weak',     'islamic-school-mgmt' ), 'E',  '#DC2626' ),
        array( 1.5, __( 'Weak',          'islamic-school-mgmt' ), 'D',  '#F97316' ),
        array( 2.5, __( 'Satisfactory',  'islamic-school-mgmt' ), 'C',  '#F59E0B' ),
        array( 3.5, __( 'Good',          'islamic-school-mgmt' ), 'B',  '#10B981' ),
        array( 4.5, __( 'Excellent',     'islamic-school-mgmt' ), 'A',  '#059669' ),
    );

    /**
     * @param array $payload Required:
     *   student_id, teacher_id, fluency, makharij, tajweed, waqf, accuracy, assessed_on
     *   Optional: class_id, surah_id, ayah_from, ayah_to, comments
     * @return int|WP_Error  New assessment id or WP_Error.
     */
    public static function record_assessment( array $payload ) {
        global $wpdb;

        $required = array( 'student_id', 'teacher_id', 'fluency', 'makharij', 'tajweed', 'waqf', 'accuracy', 'assessed_on' );
        foreach ( $required as $k ) {
            if ( ! isset( $payload[ $k ] ) ) {
                return new WP_Error( 'ism_missing_field', sprintf( 'Missing field: %s', $k ), array( 'status' => 400 ) );
            }
        }

        $scores = array(
            'fluency'  => ISM_Security::clamp_grade( $payload['fluency'] ),
            'makharij' => ISM_Security::clamp_grade( $payload['makharij'] ),
            'tajweed'  => ISM_Security::clamp_grade( $payload['tajweed'] ),
            'waqf'     => ISM_Security::clamp_grade( $payload['waqf'] ),
            'accuracy' => ISM_Security::clamp_grade( $payload['accuracy'] ),
        );

        $average = self::calculate_average( $scores );
        $band    = self::resolve_band( $average );
        $weak    = self::identify_weaknesses( $scores );
        $recs    = self::generate_recommendations( $scores, $average );

        $now = current_time( 'mysql', 1 );

        $assessment_ok = $wpdb->insert( $wpdb->prefix . 'ism_assessments', array(
            'student_id'    => (int) $payload['student_id'],
            'teacher_id'    => (int) $payload['teacher_id'],
            'class_id'      => isset( $payload['class_id'] ) ? (int) $payload['class_id'] : null,
            'module_type'   => self::MODULE_TYPE,
            'assessed_on'   => sanitize_text_field( $payload['assessed_on'] ),
            'overall_score' => $average,
            'overall_grade' => $band['label'],
            'comments'      => isset( $payload['comments'] ) ? sanitize_textarea_field( $payload['comments'] ) : null,
            'created_at'    => $now,
        ) );
        if ( false === $assessment_ok ) {
            return new WP_Error( 'ism_db_error', 'Failed to create assessment.', array( 'status' => 500 ) );
        }
        $assessment_id = (int) $wpdb->insert_id;

        $wpdb->insert( $wpdb->prefix . 'ism_quran_recitation_grades', array(
            'assessment_id'   => $assessment_id,
            'surah_id'        => isset( $payload['surah_id'] )  ? (int) $payload['surah_id']  : null,
            'ayah_from'       => isset( $payload['ayah_from'] ) ? (int) $payload['ayah_from'] : null,
            'ayah_to'         => isset( $payload['ayah_to'] )   ? (int) $payload['ayah_to']   : null,
            'fluency'         => $scores['fluency'],
            'makharij'        => $scores['makharij'],
            'tajweed'         => $scores['tajweed'],
            'waqf'            => $scores['waqf'],
            'accuracy'        => $scores['accuracy'],
            'average_score'   => $average,
            'grade_label'     => $band['label'],
            'weaknesses'      => $weak ? wp_json_encode( $weak ) : null,
            'recommendations' => $recs ? wp_json_encode( $recs ) : null,
        ) );

        ISM_Audit::log( 'quran_recitation.assessed', 'assessment', $assessment_id, array(
            'student_id' => (int) $payload['student_id'],
            'average'    => $average,
            'grade'      => $band['label'],
        ) );

        return $assessment_id;
    }

    /**
     * Mean of the five 0-5 category scores; rounded to 2 dp.
     */
    public static function calculate_average( array $scores ) {
        $total = 0;
        foreach ( self::CATEGORIES as $c ) {
            $total += isset( $scores[ $c ] ) ? (int) $scores[ $c ] : 0;
        }
        return round( $total / count( self::CATEGORIES ), 2 );
    }

    public static function resolve_band( $average ) {
        $match = self::GRADE_BANDS[0];
        foreach ( self::GRADE_BANDS as $band ) {
            if ( $average >= $band[0] ) {
                $match = $band;
            }
        }
        return array(
            'min'   => $match[0],
            'label' => $match[1],
            'gpa'   => $match[2],
            'color' => $match[3],
        );
    }

    /**
     * Returns category names whose score is <= 2 (Weak or worse) ranked ascending.
     */
    public static function identify_weaknesses( array $scores ) {
        $weak = array();
        foreach ( self::CATEGORIES as $c ) {
            if ( ( $scores[ $c ] ?? 0 ) <= 2 ) {
                $weak[ $c ] = (int) $scores[ $c ];
            }
        }
        asort( $weak );
        return array_keys( $weak );
    }

    /**
     * Plain-text recommendations the teacher can copy or the system can show.
     */
    public static function generate_recommendations( array $scores, $average ) {
        $tips_per_cat = array(
            'fluency'  => __( 'Daily 10-minute reading aloud sessions to build flow.', 'islamic-school-mgmt' ),
            'makharij' => __( 'Practice articulation points (huroof) with mirror exercises.', 'islamic-school-mgmt' ),
            'tajweed'  => __( 'Review specific tajweed rules (Idgham, Ikhfa, Madd) with worked examples.', 'islamic-school-mgmt' ),
            'waqf'     => __( 'Drill on stopping signs (waqf marks); read short ayahs with deliberate pauses.', 'islamic-school-mgmt' ),
            'accuracy' => __( 'Read with a Mushaf open; have a peer check missed/added letters.', 'islamic-school-mgmt' ),
        );
        $recs = array();
        foreach ( self::CATEGORIES as $c ) {
            if ( ( $scores[ $c ] ?? 0 ) <= 3 ) {
                $recs[] = ucfirst( $c ) . ': ' . $tips_per_cat[ $c ];
            }
        }
        if ( $average >= 4.5 ) {
            $recs[] = __( 'Maintain excellence — introduce longer surahs and harder Tajweed rules.', 'islamic-school-mgmt' );
        } elseif ( $average >= 3.5 && empty( $recs ) ) {
            $recs[] = __( 'Solid progress — focus on consistency and reduce occasional slips.', 'islamic-school-mgmt' );
        }
        return $recs;
    }

    /**
     * Per-student trend across last $limit recitation assessments (chronological asc).
     */
    public static function student_trend( $student_id, $limit = 10 ) {
        global $wpdb;
        $student_id = (int) $student_id;
        $limit      = max( 1, min( 100, (int) $limit ) );
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT a.id, a.assessed_on, g.fluency, g.makharij, g.tajweed, g.waqf, g.accuracy, g.average_score, g.grade_label
             FROM {$wpdb->prefix}ism_assessments a
             JOIN {$wpdb->prefix}ism_quran_recitation_grades g ON g.assessment_id = a.id
             WHERE a.student_id = %d AND a.module_type = %s
             ORDER BY a.assessed_on DESC
             LIMIT %d",
            $student_id, self::MODULE_TYPE, $limit
        ), ARRAY_A );
        return array_reverse( $rows ?: array() );
    }

    /**
     * Aggregate class snapshot: each student's latest recitation average.
     */
    public static function class_snapshot( $class_id ) {
        global $wpdb;
        $class_id = (int) $class_id;
        $sql = $wpdb->prepare(
            "SELECT s.id AS student_id, s.first_name, s.last_name,
                    (SELECT g.average_score
                       FROM {$wpdb->prefix}ism_assessments a
                       JOIN {$wpdb->prefix}ism_quran_recitation_grades g ON g.assessment_id = a.id
                      WHERE a.student_id = s.id AND a.module_type = %s
                      ORDER BY a.assessed_on DESC LIMIT 1) AS latest_average,
                    (SELECT g.grade_label
                       FROM {$wpdb->prefix}ism_assessments a
                       JOIN {$wpdb->prefix}ism_quran_recitation_grades g ON g.assessment_id = a.id
                      WHERE a.student_id = s.id AND a.module_type = %s
                      ORDER BY a.assessed_on DESC LIMIT 1) AS latest_grade
             FROM {$wpdb->prefix}ism_class_students cs
             JOIN {$wpdb->prefix}ism_students s ON s.id = cs.student_id
             WHERE cs.class_id = %d
             ORDER BY s.last_name, s.first_name",
            self::MODULE_TYPE, self::MODULE_TYPE, $class_id
        );
        return $wpdb->get_results( $sql, ARRAY_A );
    }
}
