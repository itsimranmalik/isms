<?php
/**
 * Excel exporter — uses PhpOffice\PhpSpreadsheet if installed,
 * falls back to .xls (HTML-style Excel) when missing so the export
 * always works on bare WordPress installs.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Excel_Exporter {

    public static function stream_class_report( $class_id ) {
        global $wpdb;
        $class_id = (int) $class_id;
        $class    = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}ism_classes WHERE id = %d", $class_id
        ), ARRAY_A );
        if ( ! $class ) {
            wp_die( esc_html__( 'Class not found.', 'islamic-school-mgmt' ), 404 );
        }
        $rows = ISM_Quran_Recitation_Module::class_snapshot( $class_id );

        if ( class_exists( '\PhpOffice\PhpSpreadsheet\Spreadsheet' ) ) {
            self::stream_with_phpspreadsheet( $class, $rows );
        } else {
            self::stream_fallback_xls( $class, $rows );
        }
    }

    private static function stream_with_phpspreadsheet( $class, $rows ) {
        $ss    = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $ss->getActiveSheet();
        $sheet->setTitle( 'Class Report' );

        $sheet->setCellValue( 'A1', 'Class: ' . $class['name'] );
        $sheet->mergeCells( 'A1:D1' );
        $sheet->getStyle( 'A1' )->getFont()->setBold( true )->setSize( 14 );

        $headers = array( 'Student ID', 'First Name', 'Last Name', 'Latest Avg', 'Latest Grade' );
        $sheet->fromArray( $headers, null, 'A3' );
        $sheet->getStyle( 'A3:E3' )->getFont()->setBold( true );
        $sheet->getStyle( 'A3:E3' )->getFill()
              ->setFillType( \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID )
              ->getStartColor()->setRGB( '056656' );
        $sheet->getStyle( 'A3:E3' )->getFont()->getColor()->setRGB( 'FFFFFF' );

        $r = 4;
        foreach ( $rows as $row ) {
            $sheet->fromArray( array(
                $row['student_id'],
                $row['first_name'],
                $row['last_name'],
                $row['latest_average'] !== null ? (float) $row['latest_average'] : '',
                $row['latest_grade'] ?? '',
            ), null, 'A' . $r );
            $r++;
        }
        foreach ( range( 'A', 'E' ) as $col ) {
            $sheet->getColumnDimension( $col )->setAutoSize( true );
        }

        $filename = sprintf( 'class-%d-report.xlsx', (int) $class['id'] );
        nocache_headers();
        header( 'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' );
        header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx( $ss );
        $writer->save( 'php://output' );
    }

    /**
     * Fallback when PhpSpreadsheet isn't installed: HTML-tagged .xls that
     * Excel and LibreOffice both open without issue.
     */
    private static function stream_fallback_xls( $class, $rows ) {
        $filename = sprintf( 'class-%d-report.xls', (int) $class['id'] );
        nocache_headers();
        header( 'Content-Type: application/vnd.ms-excel; charset=utf-8' );
        header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
        echo '<html><head><meta charset="utf-8"></head><body>';
        echo '<h3>Class: ' . esc_html( $class['name'] ) . '</h3>';
        echo '<table border="1"><tr style="background:#066;color:#fff">'
           . '<th>Student ID</th><th>First Name</th><th>Last Name</th><th>Latest Avg</th><th>Latest Grade</th></tr>';
        foreach ( $rows as $row ) {
            echo '<tr>'
               . '<td>' . (int) $row['student_id'] . '</td>'
               . '<td>' . esc_html( $row['first_name'] ) . '</td>'
               . '<td>' . esc_html( $row['last_name'] ) . '</td>'
               . '<td>' . esc_html( $row['latest_average'] ?? '' ) . '</td>'
               . '<td>' . esc_html( $row['latest_grade'] ?? '' ) . '</td>'
               . '</tr>';
        }
        echo '</table></body></html>';
    }
}
