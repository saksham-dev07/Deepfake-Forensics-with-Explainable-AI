"""Research-contract regression tests; these do not measure model accuracy."""
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import cv2
import numpy as np


class AudioResearchTests(unittest.TestCase):
    def test_offset_search_recovers_known_delay_without_compressing_missing_faces(self):
        from pipeline.audio_sync import _offset_distance_curve
        audio = np.random.default_rng(17).normal(size=(90, 16)).astype(np.float32)
        indices = np.array([i for i in range(80) if i not in (23, 24, 48)])
        video = audio[indices + 3]
        shifts, distances, support = _offset_distance_curve(video, audio, indices)
        self.assertEqual(int(shifts[np.argmin(distances)]), 3)
        self.assertEqual(float(distances.min()), 0)
        self.assertGreater(float(np.median(distances) - distances.min()), 0)
        self.assertEqual(support, len([i for i in indices if 10 <= i < 80]))

    def test_offset_search_uses_identical_support_at_every_shift(self):
        from pipeline.audio_sync import _offset_distance_curve
        audio = np.ones((50, 8), np.float32)
        video = np.ones((50, 8), np.float32)
        shifts, distances, support = _offset_distance_curve(video, audio, np.arange(50))
        np.testing.assert_array_equal(distances, np.zeros(21))
        self.assertEqual(support, 30)
        self.assertEqual(shifts.tolist(), list(range(-10, 11)))
        with self.assertRaisesRegex(ValueError, 'common windows'):
            _offset_distance_curve(video[:12], audio[:12], np.arange(12))

    def test_syncnet_shapes_are_explicit_before_convolution(self):
        import torch
        from pipeline.SyncNetModel import S
        model = S().eval()
        with self.assertRaisesRegex(ValueError, 'audio input'):
            model.forward_aud(torch.zeros(1, 1, 20, 13))
        for function in (model.forward_lip, model.forward_lipfeat):
            with self.assertRaisesRegex(ValueError, 'video input'):
                function(torch.zeros(1, 3, 4, 224, 224))

    def test_syncnet_padded_crop_keeps_face_context_and_square_border_geometry(self):
        from pipeline.audio_sync import get_mouth_roi
        frame = np.full((100, 100, 3), 70, np.uint8)
        landmarks = [SimpleNamespace(x=0, y=0), SimpleNamespace(x=.2, y=.4)]
        with patch('pipeline.audio_sync.cv2.resize', side_effect=lambda crop, size: crop) as resize:
            crop = get_mouth_roi(frame, landmarks)
        resize.assert_called_once()
        self.assertEqual(crop.shape, (56, 56, 3))
        self.assertTrue(np.any(crop == 110), 'Face crop context must be padded at the boundary')
        self.assertTrue(np.any(crop == 70))
        self.assertIsNone(get_mouth_roi(frame, []))
        self.assertIsNone(get_mouth_roi(frame, [SimpleNamespace(x=float('nan'), y=0)]))

    def test_unknown_fps_is_unavailable_instead_of_assumed_25(self):
        import pipeline.audio_sync as sync
        cap = Mock()
        cap.get.return_value = float('nan')
        with patch.object(sync.os.path, 'exists', return_value=True), \
             patch.object(sync, '_syncnet_model', Mock()), \
             patch.object(sync.cv2, 'VideoCapture', return_value=cap), \
             patch('pipeline.face_geometry.get_landmarker', return_value=Mock()):
            result = sync.analyze_audio_visual_sync('input.mp4', 'audio.wav', 'unused')
        self.assertFalse(result['available'])
        self.assertFalse(result['eligible_for_fusion'])
        self.assertEqual(result['sync_score'], .5)
        cap.release.assert_called_once()
        cap.read.assert_not_called()

    def test_pure_440_hz_tone_is_not_a_synthetic_voice_verdict(self):
        import pipeline.voice_spoofing as voice
        y = (.1 * np.sin(2 * np.pi * 440 * np.arange(48000) / 16000)).astype(np.float32)
        model = Mock()
        model.predict.return_value = 1
        with tempfile.TemporaryDirectory() as output, \
             patch.object(voice.os.path, 'exists', return_value=True), \
             patch.object(voice.librosa, 'load', return_value=(y, 16000)), \
             patch.object(voice, '_voice_model', model):
            result = voice.analyze_voice_spoofing('tone.wav', output)
        model.predict.assert_not_called()
        self.assertFalse(result['available'])
        self.assertFalse(result['eligible_for_fusion'])
        self.assertFalse(result['speech_verified'])
        self.assertEqual(result['voice_anomaly_score'], .5)
        self.assertEqual(result['applicability'], 'narrowband_audio')
        self.assertGreater(result['narrowband_power_ratio'], .999)

    def test_clipped_samples_are_preserved_and_cnn_span_is_disclosed(self):
        import librosa
        import pipeline.voice_spoofing as voice
        y = np.clip(np.random.default_rng(3).normal(size=16000 * 10), -1, 1).astype(np.float32)
        model = Mock()
        model.predict.return_value = .99
        with tempfile.TemporaryDirectory() as output, \
             patch.object(voice.os.path, 'exists', return_value=True), \
             patch.object(voice.librosa, 'load', return_value=(y, 16000)), \
             patch.object(voice, '_voice_model', model), \
             patch.object(voice, 'save_optimized_figure'):
            result = voice.analyze_voice_spoofing('clipped.wav', output)
        mel_db = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=16000, n_mels=128), ref=np.max)
        expected = ((mel_db - mel_db.min()) / (mel_db.max() - mel_db.min() + 1e-8))[:, :256]
        np.testing.assert_array_equal(model.predict.call_args.args[0], expected)
        self.assertTrue(result['available'])
        self.assertFalse(result['score_available'])
        self.assertFalse(result['eligible_for_fusion'])
        self.assertEqual(result['analyzed_duration_seconds'], 10)
        self.assertEqual(result['inference_duration_seconds'], 8.16)
        self.assertTrue(any('256 mel frames' in message for message in result['warnings']))
        self.assertNotIn('Synthetic Voice Detected', str(result['explanation']))

    def test_invalid_checkpoint_output_is_not_exposed_as_a_valid_score(self):
        import pipeline.voice_spoofing as voice
        y = np.random.default_rng(5).normal(0, .1, 16000).astype(np.float32)
        for invalid in (float('nan'), float('inf'), 1.1, -.1):
            model = Mock()
            model.predict.return_value = invalid
            with patch.object(voice.os.path, 'exists', return_value=True), \
                 patch.object(voice.librosa, 'load', return_value=(y, 16000)), \
                 patch.object(voice, '_voice_model', model):
                result = voice.analyze_voice_spoofing('noise.wav', 'unused')
            self.assertFalse(result['available'])
            self.assertEqual(result['voice_anomaly_score'], .5)
            self.assertIn('invalid score', result['error'])

    def test_voice_model_rejects_malformed_mel_without_running_network(self):
        from pipeline.voice_model import LightweightAudioAntiSpoof
        model = LightweightAudioAntiSpoof()
        model.weights_loaded = True
        bad_inputs = [np.zeros((128, 255)), np.zeros((256, 128)),
                      np.full((128, 256), np.nan), np.full((128, 256), 1.1)]
        with patch.object(model, 'forward', side_effect=AssertionError('must validate first')):
            for value in bad_inputs:
                with self.assertRaises(ValueError):
                    model.predict(value)

    def test_nonfinite_voice_checkpoint_is_not_published(self):
        import torch
        from pipeline.voice_model import LightweightAudioAntiSpoof
        model = LightweightAudioAntiSpoof()
        state = model.state_dict()
        state['classifier.5.weight'][0, 0] = float('nan')
        with patch('pipeline.voice_model.os.path.exists', return_value=True), \
             patch('pipeline.voice_model.torch.load', return_value=state):
            with self.assertRaisesRegex(ValueError, 'non-finite'):
                model.load_weights('invalid.pth')
        self.assertFalse(model.weights_loaded)


if __name__ == '__main__':
    unittest.main()
