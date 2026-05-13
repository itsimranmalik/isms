<?php
if ( ! defined( 'ABSPATH' ) ) { exit; } ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Daily & Namaz Duas', 'islamic-school-mgmt' ); ?></h1>
        </header>
        <section class="ism-card">
            <div class="ism-form-row">
                <label>
                    <?php esc_html_e( 'Student', 'islamic-school-mgmt' ); ?>
                    <select id="ism-dua-student"></select>
                </label>
                <label>
                    <?php esc_html_e( 'Category', 'islamic-school-mgmt' ); ?>
                    <select id="ism-dua-category">
                        <option value="">All</option>
                        <option value="daily">Daily</option>
                        <option value="namaz">Namaz</option>
                    </select>
                </label>
            </div>
            <div id="ism-dua-list"></div>
        </section>
    </div>
</div>
