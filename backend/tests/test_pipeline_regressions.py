"""Regression coverage for the per-module pipeline audit."""
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import cv2
import numpy as np


class Capture:
    def __init__(self, frames=240, fps=30):
        self.remaining = frames
        self.fps = fps

    def get(self, prop):
        return self.fps if prop == cv2.CAP_PROP_FPS else self.remaining

    def isOpened(self):
        return self.remaining > 0

    def read(self):
        self.remaining -= 1
        return True, np.full((64, 64, 3), 100, np.uint8)

    def release(self):
        pass


class PipelineRegressionTests(unittest.TestCase):
    def test_landmark_overlay_preserves_background_and_small_face_detail(self):
        from pipeline.face_geometry import visualize_landmarks
        for size in (64, 256):
            rgb = np.full((size, size, 3), 100, np.uint8)
            points = [(20 + i % 21, 20 + i // 21) for i in range(468)]
            landmarks = {"all_landmarks": points, "nose_tip": points[1]}
            with patch('pipeline.face_geometry.compute_3d_head_pose', return_value=None):
                result = visualize_landmarks(rgb, landmarks)
            np.testing.assert_array_equal(result[0, 0], rgb[0, 0])
            np.testing.assert_array_equal(rgb, np.full_like(rgb, 100))
            self.assertTrue(np.any(result != rgb))
            self.assertLess(int(result.max()), 150, 'Landmarks must not saturate a small face')
            self.assertEqual(result.shape, rgb.shape)

    def test_ela_amplification_saturates_without_wrapping(self):
        from pipeline.ela_analysis import compute_ela
        rgb = np.random.default_rng(1).integers(0, 256, (32, 32, 3), dtype=np.uint8)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        _, encoded = cv2.imencode('.jpg', bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
        decoded = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
        expected = np.clip(cv2.absdiff(bgr, decoded).astype(np.float32) * 15, 0, 255).astype(np.uint8)
        actual, _ = compute_ela(rgb)
        np.testing.assert_array_equal(actual, cv2.cvtColor(expected, cv2.COLOR_BGR2RGB))

    def test_ela_recompression_does_not_use_shared_files(self):
        from pipeline.ela_analysis import compute_ela, compute_ela_heatmap, compute_jpeg_ghosting, compute_hsv_ela
        rgb = np.full((32, 32, 3), 100, np.uint8)
        with patch('pipeline.ela_analysis.cv2.imwrite', side_effect=AssertionError('shared temporary file')):
            for function in (compute_ela, compute_ela_heatmap, compute_jpeg_ghosting, compute_hsv_ela):
                function(rgb)

    def test_noise_residual_preserves_negative_values(self):
        from pipeline.noise_analysis import extract_noise_residual
        rgb = np.array([[[90]*3, [110]*3]], dtype=np.uint8)
        with patch('pipeline.noise_analysis.cv2.fastNlMeansDenoising', return_value=np.full((1, 2), 100, np.uint8)):
            noise, _ = extract_noise_residual(rgb)
        np.testing.assert_array_equal(noise, [[-10, 10]])

    def test_no_face_eye_evidence_is_neutral_and_does_not_close_cached_detector(self):
        from pipeline.eye_analysis import analyze_eye_movements
        detector = Mock()
        detector.detect.return_value = SimpleNamespace(face_landmarks=[])
        with tempfile.TemporaryDirectory() as output, \
             patch('pipeline.eye_analysis.os.path.exists', return_value=True), \
             patch('pipeline.eye_analysis.cv2.VideoCapture', return_value=Capture()), \
             patch('pipeline.face_geometry.get_landmarker', return_value=detector):
            result = analyze_eye_movements('test.mp4', output)
        self.assertEqual(result['eye_anomaly_score'], 0.5)
        self.assertTrue(result['warnings'])
        detector.close.assert_not_called()

    def test_no_face_pulse_evidence_is_neutral(self):
        from pipeline.rppg_analysis import extract_rppg_signal
        with tempfile.TemporaryDirectory() as output, \
             patch('pipeline.rppg_analysis.cv2.VideoCapture', return_value=Capture()), \
             patch('pipeline.rppg_analysis.detect_face', return_value=None):
            result = extract_rppg_signal('test.mp4', output)
        self.assertEqual(result['rppg_anomaly_score'], 0.5)
        self.assertTrue(result['warnings'])

    def test_voice_requires_loaded_weights(self):
        from pipeline.voice_model import LightweightAudioAntiSpoof
        with self.assertRaises(FileNotFoundError):
            LightweightAudioAntiSpoof().load_weights('__missing__.pth')

    def test_dct_supports_odd_image_dimensions(self):
        from pipeline.frequency_analysis import compute_dct_spectrum
        spectrum, _, ratio = compute_dct_spectrum(np.full((31, 33, 3), 128, np.uint8))
        self.assertEqual(spectrum.shape, (31, 33))
        self.assertTrue(np.isfinite(ratio))

    def test_block_dct_includes_diagonal_high_frequencies(self):
        from pipeline.frequency_analysis import compute_block_dct_artifacts
        # A checkerboard contains energy along both high-frequency axes.
        gray = ((np.indices((8, 8)).sum(axis=0) % 2) * 255).astype(np.uint8)
        image = np.repeat(gray[:, :, None], 3, axis=2)
        energy, _, _ = compute_block_dct_artifacts(image)
        dct = cv2.dct(gray.astype(np.float32) - 128)
        expected = np.abs(dct)[np.add.outer(np.arange(8), np.arange(8)) >= 8].sum()
        self.assertAlmostEqual(float(energy[0, 0]), float(expected), delta=0.01)

    def test_failed_image_write_raises(self):
        from pipeline.image_utils import save_optimized_image
        with patch('pipeline.image_utils.cv2.imwrite', return_value=False):
            with self.assertRaises(OSError):
                save_optimized_image('failed.jpg', np.zeros((8, 8, 3), np.uint8))

    def test_empty_face_crop_is_neutral(self):
        from pipeline.face_geometry import compute_texture_consistency
        score, path = compute_texture_consistency(np.zeros((32, 32, 3), np.uint8), (100, 100, 10, 10))
        self.assertEqual(score, 0.5)
        self.assertIsNone(path)

    def test_ear_uses_pixel_geometry_on_non_square_images(self):
        from pipeline.eye_analysis import calculate_ear
        points = [(20, 20), (30, 15), (50, 15), (60, 20), (50, 25), (30, 25)]
        landmarks = [SimpleNamespace(x=x/200, y=y/100) for x, y in points]
        self.assertAlmostEqual(calculate_ear(list(range(6)), landmarks, (100, 200, 3)), 0.25, places=6)

    def test_voice_model_failure_is_neutral_and_not_cached(self):
        import pipeline.voice_spoofing as voice
        signal = (0.1 * np.sin(np.arange(16000) * 2 * np.pi * 440 / 16000)).astype(np.float32)
        with tempfile.TemporaryDirectory() as output, \
             patch.object(voice, '_voice_model', None), \
             patch.object(voice.os.path, 'exists', return_value=True), \
             patch.object(voice.librosa, 'load', return_value=(signal, 16000)), \
             patch('pipeline.voice_model.LightweightAudioAntiSpoof.load_weights', side_effect=RuntimeError('broken checkpoint')):
            result = voice.analyze_voice_spoofing('test.wav', output)
            self.assertIsNone(voice._voice_model)
        self.assertEqual(result['voice_anomaly_score'], 0.5)
        self.assertIn('broken checkpoint', result['error'])

    def test_sync_windows_include_last_complete_window(self):
        import pipeline.audio_sync as sync
        with patch.object(sync.librosa, 'load', return_value=(np.ones(4000), 16000)), \
             patch.object(sync, '_syncnet_mfcc', return_value=np.zeros((13, 20))):
            windows = sync.extract_audio_windows('test.wav', 25, 5)
        self.assertEqual(len(windows), 1)

    def test_sync_resamples_and_allocates_only_small_batches(self):
        import torch
        import pipeline.audio_sync as sync
        model = Mock()
        model.forward_aud.side_effect = lambda a: torch.zeros((len(a), 1024))
        model.forward_lip.side_effect = lambda v: torch.zeros((len(v), 1024))
        detector = Mock()
        detector.detect.return_value = SimpleNamespace(face_landmarks=[[SimpleNamespace(x=0.5, y=0.5)]])
        with tempfile.TemporaryDirectory() as output, \
             patch.object(sync, '_syncnet_model', model), \
             patch.object(sync.os.path, 'exists', return_value=True), \
             patch.object(sync.cv2, 'VideoCapture', return_value=Capture(180, 60)), \
             patch('pipeline.face_geometry.get_landmarker', return_value=detector), \
             patch.object(sync, 'get_mouth_roi', return_value=np.full((224, 224, 3), 100, np.uint8)), \
             patch.object(sync, 'extract_audio_windows', return_value=[np.ones((13, 20), np.float32)] * 71) as windows, \
             patch.object(sync, 'save_optimized_figure'):
            result = sync.analyze_audio_visual_sync('test.mp4', 'test.wav', output)
        windows.assert_called_once_with('test.wav', 25, 75)
        self.assertIsNone(result['lse_c'])
        self.assertIsNone(result['correlation'])
        self.assertTrue(all(len(call.args[0]) <= 8 for call in model.forward_lip.call_args_list))
        # Checkpoint expects unnormalized pixel values.
        self.assertEqual(float(model.forward_lip.call_args.args[0].max()), 100)

    def test_flat_and_tiny_cfa_images_return_neutral(self):
        from pipeline.cfa_analysis import analyze_cfa_artifacts
        for shape in ((4, 4, 3), (32, 32, 3)):
            with patch('pipeline.cfa_analysis.cv2.imread', return_value=np.zeros(shape, np.uint8)):
                result = analyze_cfa_artifacts('image.png')
            self.assertEqual(result['cfa_score'], 0.5)
            self.assertTrue(result['warnings'])

    def test_lighting_without_a_solvable_fit_is_neutral(self):
        from pipeline.lighting_analysis import analyze_lighting
        with patch('pipeline.lighting_analysis.detect_face', return_value={'face_bbox': (0, 0, 16, 16)}):
            result = analyze_lighting(np.zeros((32, 32, 3), np.uint8), 'unused')
        self.assertEqual(result['lighting_anomaly_score'], 0.5)
        self.assertTrue(result['warnings'])

    def test_visual_checkpoint_cannot_omit_classifier(self):
        import torch
        from pipeline.models import DeepfakeDetector
        with patch('pipeline.models.os.path.exists', return_value=True), \
             patch('pipeline.models.torch.load', return_value={}):
            with self.assertRaisesRegex(RuntimeError, 'trained visual detector weights'):
                DeepfakeDetector()

    def test_meta_rejects_nonfinite_or_malformed_features(self):
        from pipeline.ensemble_classifier import DeepfakeMetaClassifier
        model = DeepfakeMetaClassifier()
        for values in ([np.nan] * 15, [0.2] * 14, [1.1] * 15):
            with self.assertRaises(ValueError):
                model.predict_batch([values])

    def test_pdf_missing_values_do_not_look_authentic(self):
        from pipeline.pdf_reporter import fmt_num, fmt_pct
        for value in (None, float('nan'), float('inf')):
            self.assertEqual(fmt_num(value), 'N/A')
            self.assertEqual(fmt_pct(value), 'N/A')

    def test_sync_mfcc_matches_reference_feature_vector(self):
        from pipeline.audio_sync import _syncnet_mfcc
        samples = np.random.default_rng(42).integers(-20000, 20000, 4800, dtype=np.int16)
        # Golden vector from python_speech_features.mfcc(..., 16000, nfft=512).
        expected = [24.62990442180089, -35.841805800119246, -10.81736566441269,
                    -8.555937840004802, -8.128481379147537, -11.242171441887614,
                    -5.047243431508669, 2.3885920592998118, 1.606914472925875,
                    2.0078039625719786, 0.09034915747067006, 3.512945208249242,
                    2.027755538371397]
        actual = _syncnet_mfcc(samples.astype(np.float32) / 32768)
        self.assertEqual(actual.shape, (13, 29))
        np.testing.assert_allclose(actual[:, 0], expected, rtol=1e-5, atol=1e-5)

    def test_parallel_ela_jobs_do_not_mix_images(self):
        from concurrent.futures import ThreadPoolExecutor
        from pipeline.ela_analysis import compute_ela
        images = [np.random.default_rng(i).integers(0, 256, (64, 64, 3), dtype=np.uint8) for i in range(12)]
        expected = [compute_ela(image) for image in images]
        with ThreadPoolExecutor(max_workers=4) as executor:
            actual = list(executor.map(compute_ela, images))
        for (expected_image, expected_score), (actual_image, actual_score) in zip(expected, actual):
            np.testing.assert_array_equal(actual_image, expected_image)
            self.assertEqual(actual_score, expected_score)

    def test_grayscale_image_is_not_chrominance_evidence(self):
        from pipeline.color_analysis import analyze_chrominance
        gray = np.arange(256, dtype=np.uint8).reshape(16, 16)
        with tempfile.TemporaryDirectory() as output:
            result = analyze_chrominance(np.repeat(gray[:, :, None], 3, axis=2), output)
        self.assertEqual(result['color_anomaly_score'], 0.5)
        self.assertTrue(result['warnings'])

    def test_tiny_and_constant_images_are_not_spectral_evidence(self):
        from pipeline.frequency_analysis import analyze_frequency_domain
        with tempfile.TemporaryDirectory() as output:
            for shape in ((1, 1, 3), (32, 32, 3)):
                result = analyze_frequency_domain(np.full(shape, 100, np.uint8), output)
                self.assertEqual(result['spectral_anomaly_score'], 0.5)
                self.assertTrue(result['warnings'])

    def test_empty_corneal_masks_are_not_perfect_matches(self):
        from pipeline.corneal_analysis import analyze_corneal_reflections
        detector = Mock()
        detector.detect.return_value = SimpleNamespace(face_landmarks=[
            [SimpleNamespace(x=0.5, y=0.5) for _ in range(478)]])
        with patch('pipeline.corneal_analysis.cv2.imread', return_value=np.zeros((64, 64, 3), np.uint8)), \
             patch('pipeline.face_geometry.get_landmarker', return_value=detector):
            result = analyze_corneal_reflections('test.png')
        self.assertEqual(result['corneal_score'], 0.5)
        self.assertTrue(result['warnings'])


if __name__ == '__main__':
    unittest.main()
