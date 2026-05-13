<?php
/**
 * Admin dashboard view.
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1>
                <span class="ism-crescent">☪</span>
                <?php esc_html_e( 'Islamic School — Dashboard', 'islamic-school-mgmt' ); ?>
            </h1>
            <div class="ism-toolbar">
                <button class="ism-btn" id="ism-theme-toggle"><?php esc_html_e( 'Toggle theme', 'islamic-school-mgmt' ); ?></button>
                <button class="ism-btn ism-btn-primary" id="ism-refresh"><?php esc_html_e( 'Refresh', 'islamic-school-mgmt' ); ?></button>
            </div>
        </header>

        <section class="ism-kpis" id="ism-kpis">
            <div class="ism-kpi"><span class="ism-kpi-label"><?php esc_html_e( 'Students', 'islamic-school-mgmt' ); ?></span><span class="ism-kpi-value" data-kpi="total_students">—</span></div>
            <div class="ism-kpi"><span class="ism-kpi-label"><?php esc_html_e( 'Teachers', 'islamic-school-mgmt' ); ?></span><span class="ism-kpi-value" data-kpi="total_teachers">—</span></div>
            <div class="ism-kpi"><span class="ism-kpi-label"><?php esc_html_e( 'Classes', 'islamic-school-mgmt' ); ?></span><span class="ism-kpi-value" data-kpi="total_classes">—</span></div>
            <div class="ism-kpi"><span class="ism-kpi-label"><?php esc_html_e( 'Attendance Today', 'islamic-school-mgmt' ); ?></span><span class="ism-kpi-value" data-kpi="attendance_today">—</span></div>
        </section>

        <section class="ism-grid">
            <div class="ism-card ism-card-wide">
                <h2><?php esc_html_e( 'Class Performance (Quran Recitation)', 'islamic-school-mgmt' ); ?></h2>
                <canvas id="ism-chart-perf" height="120"></canvas>
            </div>
            <div class="ism-card">
                <h2><?php esc_html_e( 'Top Performers', 'islamic-school-mgmt' ); ?></h2>
                <ol id="ism-top-performers" class="ism-list"></ol>
            </div>
            <div class="ism-card ism-card-wide">
                <h2><?php esc_html_e( 'Recent Assessments', 'islamic-school-mgmt' ); ?></h2>
                <table class="ism-table" id="ism-recent-assessments">
                    <thead><tr>
                        <th><?php esc_html_e( 'Date', 'islamic-school-mgmt' ); ?></th>
                        <th><?php esc_html_e( 'Student', 'islamic-school-mgmt' ); ?></th>
                        <th><?php esc_html_e( 'Module', 'islamic-school-mgmt' ); ?></th>
                        <th><?php esc_html_e( 'Score', 'islamic-school-mgmt' ); ?></th>
                        <th><?php esc_html_e( 'Grade', 'islamic-school-mgmt' ); ?></th>
                    </tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>
    </div>
</div>
