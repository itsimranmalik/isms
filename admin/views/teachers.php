<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Teachers', 'islamic-school-mgmt' ); ?></h1>
            <div class="ism-toolbar">
                <button class="ism-btn ism-btn-primary" id="ism-teachers-add"><?php esc_html_e( 'Add Teacher', 'islamic-school-mgmt' ); ?></button>
            </div>
        </header>
        <section class="ism-card">
            <table class="ism-table" id="ism-teachers-table">
                <thead><tr>
                    <th><?php esc_html_e( 'Code', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Name', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Email', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Status', 'islamic-school-mgmt' ); ?></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </section>
    </div>
</div>
