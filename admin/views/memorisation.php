<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Memorisation Tracker', 'islamic-school-mgmt' ); ?></h1>
        </header>
        <section class="ism-card">
            <label class="ism-block">
                <?php esc_html_e( 'Student', 'islamic-school-mgmt' ); ?>
                <select id="ism-memo-student"></select>
            </label>
            <div id="ism-memo-summary" class="ism-summary"></div>
            <table class="ism-table" id="ism-memo-table">
                <thead><tr>
                    <th>#</th><th><?php esc_html_e( 'Surah', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Ayahs', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Status', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Quality', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Last revised', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Update', 'islamic-school-mgmt' ); ?></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </section>
    </div>
</div>
