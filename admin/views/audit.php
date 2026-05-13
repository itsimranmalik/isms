<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }
global $wpdb;
$rows = $wpdb->get_results( "SELECT * FROM {$wpdb->prefix}ism_audit_logs ORDER BY created_at DESC LIMIT 200", ARRAY_A );
?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'Audit Log (last 200 events)', 'islamic-school-mgmt' ); ?></h1>
        </header>
        <section class="ism-card">
            <table class="ism-table">
                <thead><tr>
                    <th>When</th><th>Actor</th><th>Action</th><th>Object</th><th>IP</th><th>Meta</th>
                </tr></thead>
                <tbody>
                <?php foreach ( $rows as $r ) :
                    $user = $r['actor_id'] ? get_user_by( 'id', (int) $r['actor_id'] ) : null;
                ?>
                    <tr>
                        <td><?php echo esc_html( $r['created_at'] ); ?></td>
                        <td><?php echo esc_html( $user ? $user->user_login : 'system' ); ?></td>
                        <td><?php echo esc_html( $r['action'] ); ?></td>
                        <td><?php echo esc_html( $r['object_type'] . '#' . $r['object_id'] ); ?></td>
                        <td><?php echo esc_html( $r['ip_address'] ); ?></td>
                        <td><code><?php echo esc_html( (string) $r['meta'] ); ?></code></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </section>
    </div>
</div>
