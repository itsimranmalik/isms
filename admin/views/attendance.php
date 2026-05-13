<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Attendance', 'islamic-school-mgmt' ); ?></h1>
        </header>
        <section class="ism-card">
            <div class="ism-form-row">
                <label>
                    <?php esc_html_e( 'Class', 'islamic-school-mgmt' ); ?>
                    <select id="ism-att-class"></select>
                </label>
                <label>
                    <?php esc_html_e( 'Date', 'islamic-school-mgmt' ); ?>
                    <input type="date" id="ism-att-date" value="<?php echo esc_attr( current_time( 'Y-m-d' ) ); ?>">
                </label>
                <button class="ism-btn ism-btn-primary" id="ism-att-save"><?php esc_html_e( 'Save Attendance', 'islamic-school-mgmt' ); ?></button>
            </div>
            <table class="ism-table" id="ism-att-table">
                <thead><tr>
                    <th><?php esc_html_e( 'Student', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Present', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Absent', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Late', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Excused', 'islamic-school-mgmt' ); ?></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </section>
    </div>
</div>
