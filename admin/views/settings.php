<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
$opts = get_option( 'ism_settings', array() ); ?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Settings', 'islamic-school-mgmt' ); ?></h1>
        </header>
        <section class="ism-card">
            <form method="post" action="options.php" class="ism-form">
                <?php settings_fields( 'ism_settings_group' ); ?>
                <label class="ism-block">
                    <?php esc_html_e( 'School name', 'islamic-school-mgmt' ); ?>
                    <input type="text" name="ism_settings[school_name]" value="<?php echo esc_attr( $opts['school_name'] ?? '' ); ?>">
                </label>
                <label class="ism-block">
                    <?php esc_html_e( 'Logo URL', 'islamic-school-mgmt' ); ?>
                    <input type="url" name="ism_settings[logo_url]" value="<?php echo esc_attr( $opts['logo_url'] ?? '' ); ?>">
                </label>
                <label class="ism-block">
                    <?php esc_html_e( 'Default theme', 'islamic-school-mgmt' ); ?>
                    <select name="ism_settings[theme]">
                        <option value="light" <?php selected( $opts['theme'] ?? 'light', 'light' ); ?>>Light</option>
                        <option value="dark"  <?php selected( $opts['theme'] ?? 'light', 'dark' ); ?>>Dark</option>
                    </select>
                </label>
                <label class="ism-block">
                    <?php esc_html_e( 'Language', 'islamic-school-mgmt' ); ?>
                    <input type="text" name="ism_settings[language]" value="<?php echo esc_attr( $opts['language'] ?? 'en_US' ); ?>">
                </label>
                <fieldset class="ism-card" style="margin-top:16px">
                    <legend><?php esc_html_e( 'SMTP', 'islamic-school-mgmt' ); ?></legend>
                    <label class="ism-block"><?php esc_html_e( 'Host', 'islamic-school-mgmt' ); ?> <input type="text" name="ism_settings[smtp_host]" value="<?php echo esc_attr( $opts['smtp_host'] ?? '' ); ?>"></label>
                    <label class="ism-block"><?php esc_html_e( 'Port', 'islamic-school-mgmt' ); ?> <input type="number" name="ism_settings[smtp_port]" value="<?php echo esc_attr( $opts['smtp_port'] ?? 587 ); ?>"></label>
                    <label class="ism-block"><?php esc_html_e( 'User', 'islamic-school-mgmt' ); ?> <input type="text" name="ism_settings[smtp_user]" value="<?php echo esc_attr( $opts['smtp_user'] ?? '' ); ?>"></label>
                    <label class="ism-block"><?php esc_html_e( 'From address', 'islamic-school-mgmt' ); ?> <input type="email" name="ism_settings[smtp_from]" value="<?php echo esc_attr( $opts['smtp_from'] ?? '' ); ?>"></label>
                </fieldset>
                <?php submit_button(); ?>
            </form>
        </section>
    </div>
</div>
