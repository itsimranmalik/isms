<?php
/**
 * Quran Recitation assessment entry screen (0-5 scale).
 *
 * @package IslamicSchoolMgmt
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap" id="ism-root">
    <div class="ism-shell">
        <header class="ism-header">
            <h1><?php esc_html_e( 'New Quran Recitation Assessment', 'islamic-school-mgmt' ); ?></h1>
        </header>

        <section class="ism-card">
            <form id="ism-assess-form" class="ism-form">
                <div class="ism-form-row">
                    <label>
                        <?php esc_html_e( 'Student', 'islamic-school-mgmt' ); ?>
                        <select name="student_id" required></select>
                    </label>
                    <label>
                        <?php esc_html_e( 'Class', 'islamic-school-mgmt' ); ?>
                        <select name="class_id"></select>
                    </label>
                    <label>
                        <?php esc_html_e( 'Date', 'islamic-school-mgmt' ); ?>
                        <input type="date" name="assessed_on" value="<?php echo esc_attr( current_time( 'Y-m-d' ) ); ?>" required>
                    </label>
                </div>

                <div class="ism-form-row">
                    <label>
                        <?php esc_html_e( 'Surah', 'islamic-school-mgmt' ); ?>
                        <select name="surah_id"></select>
                    </label>
                    <label>
                        <?php esc_html_e( 'Ayah from', 'islamic-school-mgmt' ); ?>
                        <input type="number" min="1" name="ayah_from">
                    </label>
                    <label>
                        <?php esc_html_e( 'Ayah to', 'islamic-school-mgmt' ); ?>
                        <input type="number" min="1" name="ayah_to">
                    </label>
                </div>

                <fieldset class="ism-grades">
                    <legend><?php esc_html_e( '0–5 Category Scoring', 'islamic-school-mgmt' ); ?></legend>
                    <?php foreach ( array(
                        'fluency'  => __( 'Fluency',  'islamic-school-mgmt' ),
                        'makharij' => __( 'Makharij (Pronunciation)', 'islamic-school-mgmt' ),
                        'tajweed'  => __( 'Other Tajweed Rules', 'islamic-school-mgmt' ),
                        'waqf'     => __( 'Waqf (Stopping Rules)', 'islamic-school-mgmt' ),
                        'accuracy' => __( 'Accuracy', 'islamic-school-mgmt' ),
                    ) as $name => $label ) : ?>
                        <div class="ism-grade-row">
                            <label class="ism-grade-label"><?php echo esc_html( $label ); ?></label>
                            <div class="ism-grade-buttons" data-field="<?php echo esc_attr( $name ); ?>">
                                <?php for ( $i = 0; $i <= 5; $i++ ) : ?>
                                    <button type="button" class="ism-grade-btn" data-val="<?php echo $i; ?>"><?php echo $i; ?></button>
                                <?php endfor; ?>
                            </div>
                            <input type="hidden" name="<?php echo esc_attr( $name ); ?>" required>
                        </div>
                    <?php endforeach; ?>
                </fieldset>

                <label class="ism-block">
                    <?php esc_html_e( 'Comments', 'islamic-school-mgmt' ); ?>
                    <textarea name="comments" rows="3"></textarea>
                </label>

                <div class="ism-form-actions">
                    <span id="ism-live-summary" class="ism-tag">—</span>
                    <button type="submit" class="ism-btn ism-btn-primary"><?php esc_html_e( 'Save Assessment', 'islamic-school-mgmt' ); ?></button>
                </div>
            </form>
        </section>

        <section class="ism-card">
            <h2><?php esc_html_e( 'Marking Guidelines', 'islamic-school-mgmt' ); ?></h2>
            <table class="ism-table">
                <thead><tr><th>Score</th><th>Meaning</th></tr></thead>
                <tbody>
                    <tr><td>0</td><td><?php esc_html_e( 'Not Attempted — student did not read.', 'islamic-school-mgmt' ); ?></td></tr>
                    <tr><td>1</td><td><?php esc_html_e( 'Very Weak — many mistakes; needs full assistance.', 'islamic-school-mgmt' ); ?></td></tr>
                    <tr><td>2</td><td><?php esc_html_e( 'Weak — frequent pauses; Tajweed rarely applied.', 'islamic-school-mgmt' ); ?></td></tr>
                    <tr><td>3</td><td><?php esc_html_e( 'Satisfactory — basic Tajweed inconsistently applied.', 'islamic-school-mgmt' ); ?></td></tr>
                    <tr><td>4</td><td><?php esc_html_e( 'Good — steady fluency; Tajweed applied in most areas.', 'islamic-school-mgmt' ); ?></td></tr>
                    <tr><td>5</td><td><?php esc_html_e( 'Excellent — clear recitation, Tajweed throughout.', 'islamic-school-mgmt' ); ?></td></tr>
                </tbody>
            </table>
        </section>
    </div>
</div>
