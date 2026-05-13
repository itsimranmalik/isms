<?php
/**
 * PDF exporter — uses TCPDF if available (composer require tecnickcom/tcpdf),
 * falls back to printable HTML output if TCPDF is missing.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Pdf_Exporter {

    public static function stream_student_report( $student_id ) {
        global $wpdb;
        $student_id = (int) $student_id;
        $student = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}ism_students WHERE id = %d", $student_id
        ), ARRAY_A );
        if ( ! $student ) {
            wp_die( esc_html__( 'Student not found.', 'islamic-school-mgmt' ), 404 );
        }

        $trend       = ISM_Quran_Recitation_Module::student_trend( $student_id, 10 );
        $memorise    = ISM_Memorisation_Module::student_summary( $student_id );
        $duas        = ISM_Duas_Module::student_checklist( $student_id );
        $school_name = get_option( 'ism_settings' )['school_name'] ?? get_bloginfo( 'name' );
        $logo_url    = get_option( 'ism_settings' )['logo_url']    ?? '';

        if ( class_exists( '\TCPDF' ) ) {
            self::stream_with_tcpdf( $student, $trend, $memorise, $duas, $school_name, $logo_url );
        } else {
            self::stream_with_html( $student, $trend, $memorise, $duas, $school_name, $logo_url );
        }
    }

    private static function stream_with_tcpdf( $student, $trend, $memorise, $duas, $school_name, $logo_url ) {
        $pdf = new \TCPDF( 'P', 'mm', 'A4', true, 'UTF-8', false );
        $pdf->SetCreator( 'Islamic School Management' );
        $pdf->SetAuthor( $school_name );
        $pdf->SetTitle( 'Student Report - ' . $student['first_name'] . ' ' . $student['last_name'] );
        $pdf->SetMargins( 15, 20, 15 );
        $pdf->setPrintHeader( false );
        $pdf->setPrintFooter( false );
        $pdf->AddPage();

        // Header band.
        if ( $logo_url ) {
            @$pdf->Image( $logo_url, 15, 12, 20 );
        }
        $pdf->SetFont( 'helvetica', 'B', 18 );
        $pdf->Cell( 0, 8, $school_name, 0, 1, 'C' );
        $pdf->SetFont( 'helvetica', '', 11 );
        $pdf->Cell( 0, 6, __( 'Student Progress Report', 'islamic-school-mgmt' ), 0, 1, 'C' );
        $pdf->Ln( 4 );

        // Student box.
        $pdf->SetFont( 'helvetica', 'B', 11 );
        $pdf->Cell( 40, 7, 'Student:', 0 );
        $pdf->SetFont( 'helvetica', '', 11 );
        $pdf->Cell( 0, 7, $student['first_name'] . ' ' . $student['last_name'] . '  (' . $student['student_code'] . ')', 0, 1 );
        $pdf->SetFont( 'helvetica', 'B', 11 );
        $pdf->Cell( 40, 7, 'Date of Birth:', 0 );
        $pdf->SetFont( 'helvetica', '', 11 );
        $pdf->Cell( 0, 7, (string) ( $student['date_of_birth'] ?? '' ), 0, 1 );
        $pdf->Ln( 4 );

        // Quran Recitation table.
        $pdf->SetFillColor( 5, 102, 86 ); // Green Islamic.
        $pdf->SetTextColor( 255, 255, 255 );
        $pdf->SetFont( 'helvetica', 'B', 11 );
        $pdf->Cell( 0, 8, __( 'Quran Recitation — Last 10 Assessments', 'islamic-school-mgmt' ), 0, 1, 'L', true );
        $pdf->SetTextColor( 0, 0, 0 );
        $pdf->SetFont( 'helvetica', 'B', 9 );
        $pdf->Cell( 25, 6, 'Date', 1 );
        $pdf->Cell( 22, 6, 'Fluency', 1, 0, 'C' );
        $pdf->Cell( 22, 6, 'Makharij', 1, 0, 'C' );
        $pdf->Cell( 22, 6, 'Tajweed', 1, 0, 'C' );
        $pdf->Cell( 22, 6, 'Waqf', 1, 0, 'C' );
        $pdf->Cell( 22, 6, 'Accuracy', 1, 0, 'C' );
        $pdf->Cell( 22, 6, 'Average', 1, 0, 'C' );
        $pdf->Cell( 25, 6, 'Grade', 1, 1, 'C' );
        $pdf->SetFont( 'helvetica', '', 9 );
        foreach ( $trend as $t ) {
            $pdf->Cell( 25, 6, $t['assessed_on'], 1 );
            foreach ( array( 'fluency', 'makharij', 'tajweed', 'waqf', 'accuracy' ) as $c ) {
                $pdf->Cell( 22, 6, $t[ $c ], 1, 0, 'C' );
            }
            $pdf->Cell( 22, 6, number_format( (float) $t['average_score'], 2 ), 1, 0, 'C' );
            $pdf->Cell( 25, 6, $t['grade_label'], 1, 1, 'C' );
        }
        $pdf->Ln( 4 );

        // Memorisation summary.
        $pdf->SetFillColor( 5, 102, 86 );
        $pdf->SetTextColor( 255, 255, 255 );
        $pdf->SetFont( 'helvetica', 'B', 11 );
        $pdf->Cell( 0, 8, __( 'Memorisation Summary', 'islamic-school-mgmt' ), 0, 1, 'L', true );
        $pdf->SetTextColor( 0, 0, 0 );
        $pdf->SetFont( 'helvetica', '', 10 );
        $pdf->Cell( 0, 6, sprintf( 'Total ayahs memorised: %d (%.2f%% of Quran)', $memorise['ayahs_memorised'], $memorise['percent_of_quran'] ), 0, 1 );
        $pdf->Cell( 0, 6, sprintf( 'Surahs completed: %d / %d tracked', $memorise['surahs_completed'], $memorise['surahs_tracked'] ), 0, 1 );
        $pdf->Ln( 4 );

        // Duas summary.
        $pdf->SetFillColor( 5, 102, 86 );
        $pdf->SetTextColor( 255, 255, 255 );
        $pdf->SetFont( 'helvetica', 'B', 11 );
        $pdf->Cell( 0, 8, __( 'Duas Progress', 'islamic-school-mgmt' ), 0, 1, 'L', true );
        $pdf->SetTextColor( 0, 0, 0 );
        $pdf->SetFont( 'helvetica', '', 10 );
        foreach ( $duas as $cat => $info ) {
            $pdf->Cell( 0, 6, sprintf( '%s: %d / %d completed (%.1f%%)', ucfirst( $cat ), $info['completed'], $info['total'], $info['percent_complete'] ), 0, 1 );
        }
        $pdf->Ln( 8 );

        // Signature.
        $pdf->Cell( 70, 6, '________________________', 0, 0, 'C' );
        $pdf->Cell( 20, 6, '', 0 );
        $pdf->Cell( 70, 6, '________________________', 0, 1, 'C' );
        $pdf->Cell( 70, 6, __( 'Teacher Signature', 'islamic-school-mgmt' ), 0, 0, 'C' );
        $pdf->Cell( 20, 6, '', 0 );
        $pdf->Cell( 70, 6, __( 'Principal Signature', 'islamic-school-mgmt' ), 0, 1, 'C' );

        $filename = sprintf( 'student-report-%s.pdf', $student['student_code'] );
        nocache_headers();
        $pdf->Output( $filename, 'D' );
    }

    /**
     * Print-friendly HTML fallback when TCPDF isn't installed.
     */
    private static function stream_with_html( $student, $trend, $memorise, $duas, $school_name, $logo_url ) {
        nocache_headers();
        header( 'Content-Type: text/html; charset=utf-8' );
        ?>
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title><?php echo esc_html( 'Report - ' . $student['first_name'] . ' ' . $student['last_name'] ); ?></title>
            <style>
                body{font-family:Helvetica,Arial,sans-serif;max-width:800px;margin:24px auto;color:#111}
                h1{color:#066;font-size:22px;margin:0}
                .hdr{display:flex;align-items:center;gap:16px;border-bottom:2px solid #066;padding-bottom:8px}
                table{width:100%;border-collapse:collapse;margin:10px 0 18px}
                th,td{border:1px solid #999;padding:6px 8px;font-size:13px;text-align:center}
                th{background:#066;color:#fff}
                .section{margin-top:18px}
                .lbl{font-weight:bold;color:#066}
                @media print{ .noprint{display:none} }
            </style>
        </head>
        <body>
        <button class="noprint" onclick="window.print()">Print / Save as PDF</button>
        <div class="hdr">
            <?php if ( $logo_url ) : ?><img src="<?php echo esc_url( $logo_url ); ?>" style="height:60px" alt=""><?php endif; ?>
            <div>
                <h1><?php echo esc_html( $school_name ); ?></h1>
                <div>Student Progress Report</div>
            </div>
        </div>
        <div class="section">
            <p><span class="lbl">Student:</span> <?php echo esc_html( $student['first_name'] . ' ' . $student['last_name'] ); ?> (<?php echo esc_html( $student['student_code'] ); ?>)</p>
            <p><span class="lbl">DOB:</span> <?php echo esc_html( $student['date_of_birth'] ?? '' ); ?></p>
        </div>
        <div class="section">
            <h2 style="color:#066;font-size:16px">Quran Recitation — Last 10</h2>
            <table>
                <tr><th>Date</th><th>Fluency</th><th>Makharij</th><th>Tajweed</th><th>Waqf</th><th>Accuracy</th><th>Average</th><th>Grade</th></tr>
                <?php foreach ( $trend as $t ) : ?>
                <tr>
                    <td><?php echo esc_html( $t['assessed_on'] ); ?></td>
                    <td><?php echo (int) $t['fluency']; ?></td>
                    <td><?php echo (int) $t['makharij']; ?></td>
                    <td><?php echo (int) $t['tajweed']; ?></td>
                    <td><?php echo (int) $t['waqf']; ?></td>
                    <td><?php echo (int) $t['accuracy']; ?></td>
                    <td><?php echo esc_html( number_format( (float) $t['average_score'], 2 ) ); ?></td>
                    <td><?php echo esc_html( $t['grade_label'] ); ?></td>
                </tr>
                <?php endforeach; ?>
            </table>
        </div>
        <div class="section">
            <h2 style="color:#066;font-size:16px">Memorisation</h2>
            <p>Total ayahs memorised: <?php echo (int) $memorise['ayahs_memorised']; ?> (<?php echo esc_html( $memorise['percent_of_quran'] ); ?>% of Quran).</p>
            <p>Surahs completed: <?php echo (int) $memorise['surahs_completed']; ?> / <?php echo (int) $memorise['surahs_tracked']; ?></p>
        </div>
        <div class="section">
            <h2 style="color:#066;font-size:16px">Duas Progress</h2>
            <?php foreach ( $duas as $cat => $info ) : ?>
            <p><strong><?php echo esc_html( ucfirst( $cat ) ); ?>:</strong>
                <?php echo (int) $info['completed']; ?> / <?php echo (int) $info['total']; ?> completed
                (<?php echo esc_html( $info['percent_complete'] ); ?>%)</p>
            <?php endforeach; ?>
        </div>
        </body></html>
        <?php
    }
}
