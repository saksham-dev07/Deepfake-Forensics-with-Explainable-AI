import unittest
from unittest.mock import patch

import numpy as np

from pipeline.ensemble_classifier import DeepfakeMetaClassifier


FEATURES = (
    "nn_score", "spectral_score", "ela_score", "geometry_anomaly",
    "noise_score", "color_score", "sync_score", "metadata_score", "rppg_score",
    "lighting_score", "eye_score", "voice_score", "flow_score", "cfa_score", "corneal_score",
)


class InferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = DeepfakeMetaClassifier()
        cls.model.load_model()

    def test_loaded_xgboost_drives_production_prediction(self):
        self.assertTrue(self.model.is_xgb_trained)
        features = dict.fromkeys(FEATURES, 0.2)
        expected = self.model.xgb_model.predict_proba(np.full((1, 15), 0.2))[0, 1]
        self.assertAlmostEqual(self.model.predict(features), float(expected), places=7)

    def test_torch_checkpoint_fallback(self):
        model = DeepfakeMetaClassifier()
        model.use_xgboost = False
        self.assertTrue(model.load_model())
        self.assertTrue(model.is_trained)
        result = model.predict(dict.fromkeys(FEATURES, 0.2))
        self.assertGreaterEqual(result, 0)
        self.assertLessEqual(result, 1)

    def test_shap_explains_production_prediction(self):
        import main

        features = dict.fromkeys(FEATURES, 0.2)
        features["voice_score"] = 0.95
        captured = {}

        class Explainer:
            def __init__(self, predict, background):
                captured["background"] = predict(background)
                self.predict = predict

            def shap_values(self, values, **kwargs):
                captured["prediction"] = self.predict(values)[0]
                return np.zeros_like(values)

        with patch.object(main, "get_meta_classifier", return_value=self.model), \
             patch("shap.KernelExplainer", Explainer):
            output = main.generate_shap_features(features, True)
        self.assertIn("prediction", captured, output)
        self.assertAlmostEqual(captured["prediction"], 0.95)

    def test_missing_visual_weights_fail_without_generic_model_fallback(self):
        from pipeline.models import DeepfakeDetector

        with patch("pipeline.models.os.path.exists", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "trained visual detector weights"):
                DeepfakeDetector()

    def test_pipeline_import_failure_marks_job_failed(self):
        import builtins
        import main

        original_import = builtins.__import__

        def fail_cv2(name, *args, **kwargs):
            if name == "cv2":
                raise ImportError("test unavailable detector dependency")
            return original_import(name, *args, **kwargs)

        with patch.dict(main.analysis_jobs, {"import-failure": {"status": "processing"}}), \
             patch("builtins.__import__", side_effect=fail_cv2):
            main.run_analysis_pipeline("import-failure", "unused.png")
            self.assertEqual(main.analysis_jobs["import-failure"]["status"], "failed")


if __name__ == "__main__":
    unittest.main()
