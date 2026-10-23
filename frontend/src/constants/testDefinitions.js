import { DIAGNOSTICS } from './diagnostics';

export const TEST_DEFINITIONS = Object.fromEntries(Object.entries(DIAGNOSTICS).map(([id, config]) => [id, {
  title: config.title,
  what_is_it: config.description,
  what_it_does: id === 'visual' ? 'A trained visual detector evaluates the face crop. Grad-CAM visualizes regions influencing its output.'
    : 'The backend returns detector measurements, available exhibits, and warnings. The console displays those values without substituting sample measurements.',
  how_good_is_it: config.note || 'Treat this as contextual evidence. A score is an estimate and is not a certificate of authenticity.',
  how_to_bypass: 'Compression, resizing, lighting, source content, and missing observations can affect the measurement. Review the original media and the detector warnings.',
}]));
TEST_DEFINITIONS.features = {
  title: 'Combined analysis and attribution',
  what_is_it: 'The overview collects the available detector outputs and the ensemble anomaly score.',
  what_it_does: 'A trained meta-classifier combines detector features. Measured SHAP output describes which features moved that prediction up or down.',
  how_good_is_it: 'Feature thresholds and model scores need validation on representative labeled media. Procedural training data are not an independent accuracy benchmark.',
  how_to_bypass: 'Dataset shift, missing detectors, and quality differences can affect the result. Review each measurement rather than relying on the combined score alone.',
};
