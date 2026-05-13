<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Students', 'islamic-school-mgmt' ); ?></h1>
            <div class="ism-toolbar">
                <input type="search" id="ism-students-search" placeholder="<?php esc_attr_e( 'Search students…', 'islamic-school-mgmt' ); ?>">
                <button class="ism-btn ism-btn-primary" id="ism-students-add"><?php esc_html_e( 'Add Student', 'islamic-school-mgmt' ); ?></button>
            </div>
        </header>
        <section class="ism-card">
            <table class="ism-table" id="ism-students-table">
                <thead><tr>
                    <th><?php esc_html_e( 'Code', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Name', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Guardian', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Status', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Actions', 'islamic-school-mgmt' ); ?></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </section>
    </div>
</div>
