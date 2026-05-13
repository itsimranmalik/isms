<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Classes', 'islamic-school-mgmt' ); ?></h1>
            <div class="ism-toolbar">
                <button class="ism-btn ism-btn-primary" id="ism-classes-add"><?php esc_html_e( 'New Class', 'islamic-school-mgmt' ); ?></button>
            </div>
        </header>
        <section class="ism-card">
            <table class="ism-table" id="ism-classes-table">
                <thead><tr>
                    <th><?php esc_html_e( 'Name', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Level', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Students', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Teachers', 'islamic-school-mgmt' ); ?></th>
                    <th><?php esc_html_e( 'Actions', 'islamic-school-mgmt' ); ?></th>
                </tr></thead>
                <tbody></tbody>
            </table>
        </section>
    </div>
</div>
