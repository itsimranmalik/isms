<?php
/**
 * Plugin Name:       Islamic School Management
 * Plugin URI:        https://example.com/islamic-school-mgmt
 * Description:       Complete Madrasa / Islamic Academy management: students, teachers, classes, attendance, Quran recitation (0-5), memorisation, duas, reports (PDF/Excel/CSV).
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Your Organisation
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       islamic-school-mgmt
 * Domain Path:       /languages
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // No direct access.
}

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------
define( 'ISM_VERSION',      '1.0.0' );
define( 'ISM_DB_VERSION',   '1.0.0' );
define( 'ISM_PLUGIN_FILE',  __FILE__ );
define( 'ISM_PLUGIN_DIR',   plugin_dir_path( __FILE__ ) );
define( 'ISM_PLUGIN_URL',   plugin_dir_url( __FILE__ ) );
define( 'ISM_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
define( 'ISM_REST_NAMESPACE', 'ism/v1' );

// -------------------------------------------------------------------------
// Composer autoload (TCPDF, PhpSpreadsheet, Firebase JWT) - optional.
// -------------------------------------------------------------------------
if ( file_exists( ISM_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once ISM_PLUGIN_DIR . 'vendor/autoload.php';
}

// -------------------------------------------------------------------------
// Plugin autoloader for ISM_* classes in /includes
// -------------------------------------------------------------------------
spl_autoload_register( function ( $class ) {
    if ( strpos( $class, 'ISM_' ) !== 0 ) {
        return;
    }
    $file = strtolower( str_replace( '_', '-', substr( $class, 4 ) ) );
    $candidates = array(
        ISM_PLUGIN_DIR . "includes/class-ism-{$file}.php",
        ISM_PLUGIN_DIR . "includes/api/class-ism-{$file}.php",
        ISM_PLUGIN_DIR . "includes/models/class-ism-{$file}.php",
        ISM_PLUGIN_DIR . "includes/modules/class-ism-{$file}.php",
        ISM_PLUGIN_DIR . "includes/reporting/class-ism-{$file}.php",
        ISM_PLUGIN_DIR . "admin/class-ism-{$file}.php",
        ISM_PLUGIN_DIR . "public/class-ism-{$file}.php",
    );
    foreach ( $candidates as $path ) {
        if ( file_exists( $path ) ) {
            require_once $path;
            return;
        }
    }
} );

// -------------------------------------------------------------------------
// Activation / Deactivation / Uninstall hooks
// -------------------------------------------------------------------------
register_activation_hook( __FILE__,   array( 'ISM_Activator',   'activate' ) );
register_deactivation_hook( __FILE__, array( 'ISM_Deactivator', 'deactivate' ) );

// -------------------------------------------------------------------------
// Bootstrap
// -------------------------------------------------------------------------
add_action( 'plugins_loaded', function () {
    load_plugin_textdomain( 'islamic-school-mgmt', false, dirname( ISM_PLUGIN_BASENAME ) . '/languages' );
    ISM_Plugin::instance()->run();
} );
