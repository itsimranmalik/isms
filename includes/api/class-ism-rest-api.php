<?php
/**
 * REST API bootstrap. Namespace: ism/v1
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ISM_Rest_Api {

    public static function register_routes() {
        ISM_Students_Controller::register();
        ISM_Teachers_Controller::register();
        ISM_Classes_Controller::register();
        ISM_Assessments_Controller::register();
        ISM_Memorisation_Controller::register();
        ISM_Duas_Controller::register();
        ISM_Attendance_Controller::register();
        ISM_Reports_Controller::register();
        ISM_Dashboard_Controller::register();
    }
}
