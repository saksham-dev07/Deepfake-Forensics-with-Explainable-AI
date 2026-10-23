"""Measurement invariants from the biometric research audit; no accuracy claims."""
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import cv2
import numpy as np


class Capture:
    def __init__(self, frames=90, fps=30, shape=(64, 128, 3)):
        self.frames, self.fps, self.shape = frames, fps, shape
        self.released = False

    def get(self, _):
        return self.fps

    def isOpened(self):
        return self.frames > 0

    def read(self):
        if self.frames <= 0:
            return False, None
        self.frames -= 1
        return True, np.full(self.shape, 100, np.uint8)

    def release(self):
        self.released = True


class BiometricResearchTests(unittest.TestCase):
    def test_chrom_is_invariant_to_per_channel_camera_gain(self):
        from pipeline.rppg_analysis import _chrom_signal
        time = np.arange(300) / 30
        pulse, motion = np.sin(2 * np.pi * 1.2 * time), np.sin(2 * np.pi * .9 * time)
        rgb = np.array([120, 80, 50]) * (1 + .02 * motion[:, None] + pulse[:, None] * [.003, .01, .001])
        reference = _chrom_signal(rgb, 30)
        self.assertGreater(np.std(reference), 1e-4)
        np.testing.assert_allclose(reference, _chrom_signal(rgb * [1.4, .7, 2], 30), atol=1e-9)

    def test_achromatic_lighting_has_no_resolvable_chrom_signal(self):
        from pipeline.rppg_analysis import _chrom_signal
        time = np.arange(300) / 30
        rgb = np.array([120, 80, 50]) * (1 + .03 * np.sin(2 * np.pi * 1.2 * time[:, None]))
        self.assertLess(np.std(_chrom_signal(rgb, 30)), 1e-10)

    def test_pulse_rejects_unknown_or_insufficient_sampling_rate(self):
        from pipeline.rppg_analysis import extract_rppg_signal
        for fps in (0, np.nan, 5):
            cap = Capture(fps=fps)
            with patch('pipeline.rppg_analysis.cv2.VideoCapture', return_value=cap):
                result = extract_rppg_signal('test.mp4', 'unused')
            self.assertFalse(result['available'])
            self.assertFalse(result['eligible_for_fusion'])
            self.assertTrue(cap.released)

    def test_collapsed_eye_span_is_not_a_closed_eye_measurement(self):
        from pipeline.eye_analysis import calculate_ear
        points = [SimpleNamespace(x=.2, y=.3)] * 6
        self.assertTrue(np.isnan(calculate_ear(range(6), points, (100, 200))))

    def run_eye_sequence(self, values, missing=()):
        from pipeline.eye_analysis import analyze_eye_movements
        detector = Mock()
        detector.detect.side_effect = [SimpleNamespace(face_landmarks=[] if i in missing else [[None] * 478]) for i in range(len(values))]
        measured = [value for i, value in enumerate(values) if i not in missing for _ in range(2)]
        with tempfile.TemporaryDirectory() as output, \
             patch('pipeline.eye_analysis.os.path.exists', return_value=True), \
             patch('pipeline.eye_analysis.cv2.VideoCapture', return_value=Capture(len(values))), \
             patch('pipeline.face_geometry.get_landmarker', return_value=detector), \
             patch('pipeline.eye_analysis.calculate_ear', side_effect=measured), \
             patch('pipeline.eye_analysis.save_optimized_figure'):
            return analyze_eye_movements('test.mp4', output)

    def test_only_complete_observed_blinks_are_counted(self):
        sequence = [.1] * 3 + [.3] * 20 + [.1] * 3 + [.3] * 61 + [.1] * 3
        result = self.run_eye_sequence(sequence)
        self.assertEqual(result['blink_count'], 1)
        self.assertTrue(result['available'])
        self.assertFalse(result['score_available'], 'Three seconds do not support the legacy blink-rate rule')

    def test_tracking_gap_does_not_complete_a_blink(self):
        sequence = [.3] * 30 + [.1] * 3 + [.3] * 57
        result = self.run_eye_sequence(sequence, missing=(33,))
        self.assertEqual(result['blink_count'], 0)

    def test_constant_openness_does_not_fabricate_perfect_correlation(self):
        result = self.run_eye_sequence([.3] * 240)
        self.assertIsNone(result['gaze_asymmetry'])
        self.assertTrue(result['score_available'])
        self.assertEqual(result['asymmetry_measure'], 'eyelid_openness_correlation_not_gaze')

    def test_horizontal_eye_line_is_invariant_to_eye_order(self):
        from pipeline.face_geometry import compute_eye_alignment
        self.assertEqual(compute_eye_alignment({'right_eye': (10, 20), 'left_eye': (30, 20)}), 0)
        self.assertEqual(compute_eye_alignment({'right_eye': (30, 20), 'left_eye': (10, 20)}), 0)

    def test_face_distance_ratio_is_invariant_to_in_plane_roll(self):
        from pipeline.face_geometry import compute_golden_ratio
        points = {'right_eye': (-10, -10), 'left_eye': (10, -10), 'nose_tip': (0, 5), 'right_mouth': (-6, 15), 'left_mouth': (6, 15)}
        rolled = {key: (-value[1], value[0]) for key, value in points.items()}
        self.assertAlmostEqual(compute_golden_ratio(points), compute_golden_ratio(rolled))

    def test_degenerate_pose_does_not_reach_pnp(self):
        from pipeline.face_geometry import compute_3d_head_pose
        points = {key: (1, 1) for key in ('right_eye', 'left_eye', 'nose_tip', 'right_mouth', 'left_mouth')}
        points['all_landmarks'] = [(1, 1)] * 478
        with patch('pipeline.face_geometry.cv2.solvePnP', side_effect=AssertionError('degenerate fit')):
            self.assertIsNone(compute_3d_head_pose(points, 100, 100))

    def test_yunet_box_must_match_the_landmarked_face(self):
        import pipeline.face_geometry as module
        landmarks = [SimpleNamespace(x=.2, y=.2, z=0) for _ in range(478)]
        landmarks[33] = SimpleNamespace(x=.1, y=.2, z=0)
        landmarks[263] = SimpleNamespace(x=.3, y=.2, z=0)
        faces = np.array([[50, 50, 45, 45, 0, 0, .99], [5, 5, 30, 30, 0, 0, .83]])
        yunet = Mock()
        yunet.detect.return_value = None, faces
        detector = Mock()
        detector.detect.return_value = SimpleNamespace(face_landmarks=[landmarks])
        with patch.object(module, '_local_storage', SimpleNamespace(yunet=yunet)), \
             patch.object(module, 'get_landmarker', return_value=detector), \
             patch.object(module.os.path, 'exists', return_value=True):
            result = module.detect_face(np.full((100, 100, 3), 100, np.uint8))
        self.assertEqual(result['face_bbox'], (5, 5, 30, 30))
        self.assertAlmostEqual(result['confidence'], .83)

    def test_native_highlight_segmentation_excludes_bright_sclera(self):
        from pipeline.corneal_analysis import _extract_highlights
        eye = np.full((8, 8, 3), 30, np.uint8)
        eye[0, 0] = 255  # bright outside the iris
        eye[4, 4] = 250  # one measured highlight inside it
        mask = np.zeros((8, 8), np.uint8)
        mask[2:6, 2:6] = 255
        result = _extract_highlights(eye, mask)
        self.assertEqual(np.count_nonzero(result), 1)
        self.assertEqual(result[0, 0], 0)
        self.assertEqual(result[4, 4], 255)

    def test_no_face_flow_is_unavailable_not_central_region_evidence(self):
        from pipeline.optical_flow import analyze_optical_flow
        cap = Capture()
        with patch('pipeline.optical_flow.os.path.exists', return_value=True), \
             patch('pipeline.optical_flow.cv2.VideoCapture', return_value=cap), \
             patch('pipeline.optical_flow.detect_face', return_value=None):
            result = analyze_optical_flow('test.mp4', 'unused')
        self.assertFalse(result['available'])
        self.assertFalse(result['eligible_for_fusion'])
        self.assertEqual(result['flow_anomaly_score'], .5)
        self.assertTrue(cap.released)

    def test_flow_preserves_portrait_aspect_ratio_and_short_exhibit(self):
        from pipeline.optical_flow import analyze_optical_flow
        cap = Capture(frames=13, shape=(128, 64, 3))
        dis = Mock()
        dis.calc.side_effect = lambda previous, current, _: np.zeros((*previous.shape, 2), np.float32)
        with tempfile.TemporaryDirectory() as output, \
             patch('pipeline.optical_flow.os.path.exists', return_value=True), \
             patch('pipeline.optical_flow.cv2.VideoCapture', return_value=cap), \
             patch('pipeline.optical_flow.detect_face', return_value={'face_bbox': (20, 30, 100, 180)}), \
             patch('pipeline.optical_flow.cv2.DISOpticalFlow_create', return_value=dis), \
             patch('pipeline.optical_flow.save_optimized_figure'), \
             patch('pipeline.optical_flow.save_optimized_image'):
            result = analyze_optical_flow('test.mp4', output)
        self.assertEqual(result['processing_size'], [160, 320])
        self.assertEqual(result['analyzed_frame_pairs'], 12)
        self.assertTrue(result['available'])
        self.assertTrue(result['flow_field_path'])
        self.assertFalse(result['score_calibrated'])

    def test_corneal_exhibit_does_not_invent_light_source_vectors(self):
        from pipeline.corneal_analysis import analyze_corneal_reflections
        landmarks = [SimpleNamespace(x=.5, y=.5) for _ in range(478)]
        for indices, cx in (([362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398], .7),
                            ([33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246], .3)):
            for index, angle in zip(indices, np.linspace(0, 2 * np.pi, 16, endpoint=False)):
                landmarks[index] = SimpleNamespace(x=cx + .1 * np.cos(angle), y=.5 + .05 * np.sin(angle))
        for indices, cx in ((range(474, 478), .7), (range(469, 473), .3)):
            for index, angle in zip(indices, np.linspace(0, 2 * np.pi, 4, endpoint=False)):
                landmarks[index] = SimpleNamespace(x=cx + .04 * np.cos(angle), y=.5 + .04 * np.sin(angle))
        image = np.full((200, 200, 3), 30, np.uint8)
        image[100, 60] = image[100, 140] = 250
        detector = Mock()
        detector.detect.return_value = SimpleNamespace(face_landmarks=[landmarks])
        with tempfile.TemporaryDirectory() as output, \
             patch('pipeline.corneal_analysis.cv2.imread', return_value=image), \
             patch('pipeline.face_geometry.get_landmarker', return_value=detector), \
             patch('pipeline.corneal_analysis.save_optimized_image') as save:
            result = analyze_corneal_reflections('test.png', output)
        self.assertTrue(result['available'])
        self.assertTrue(result['score_available'])
        self.assertIsNone(result['specular_vector_path'])
        self.assertEqual(save.call_count, 2)


if __name__ == '__main__':
    unittest.main()
