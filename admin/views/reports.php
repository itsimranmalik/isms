<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Reports & Exports', 'islamic-school-mgmt' ); ?></h1>
        </header>
        <section class="ism-card">
            <h2><?php esc_html_e( 'Student Report Card (PDF)', 'islamic-school-mgmt' ); ?></h2>
            <div class="ism-form-row">
                <label>
                    <?php esc_html_e( 'Student', 'islamic-school-mgmt' ); ?>
                    <select id="ism-report-student"></select>
                </label>
                <button class="ism-btn ism-btn-primary" id="ism-report-pdf"><?php esc_html_e( 'Download PDF', 'islamic-school-mgmt' ); ?></button>
            </div>
        </section>
        <section class="ism-card">
            <h2><?php esc_html_e( 'Class Performance Export', 'islamic-school-mgmt' ); ?></h2>
            <div class="ism-form-row">
                <label>
                    <?php esc_html_e( 'Class', 'islamic-school-mgmt' ); ?>
                    <select id="ism-report-class"></select>
                </label>
                <button class="ism-btn" id="ism-report-xlsx"><?php esc_html_e( 'Excel', 'islamic-school-mgmt' ); ?></button>
                <button class="ism-btn" id="ism-report-csv"><?php esc_html_e( 'CSV', 'islamic-school-mgmt' ); ?></button>
            </div>
        </section>
    </div>
</div>
