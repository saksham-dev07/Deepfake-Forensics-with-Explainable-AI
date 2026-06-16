"""
Facial Landmark Consistency Analysis for Deepfake Detection.

Uses OpenCV's DNN-based YuNet face detector (ONNX) for robust detection of:
- Small faces (down to ~30px)
- Angled/tilted faces (up to +/-45 degrees)
- Partially occluded faces
- Various lighting conditions

Analysis techniques:
1. Facial symmetry ratios
2. Boundary texture consistency (Laplacian variance)
3. Noise pattern consistency (PRNU)
4. Landmark-based geometric validation (14-point landmarks from YuNet)
"""

import numpy as np
import cv2
import os

# Path to YuNet ONNX model (relative to backend/)
YUNET_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "face_detection_yunet_2023mar.onnx")


def detect_face_yunet(image_rgb):
    """
    Detect faces using OpenCV's DNN-based YuNet detector.
    Returns the strongest detection with 14-point landmarks:
      [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
      (right eye, left eye, nose tip, right corner mouth, left corner mouth)
    """
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    h, w = image_bgr.shape[:2]

    if not os.path.exists(YUNET_MODEL_PATH):
        print(f"Warning: YuNet model not found at {YUNET_MODEL_PATH}, falling back to Haar cascade.")
        return _detect_face_haar(image_rgb)

    try:
        detector = cv2.FaceDetectorYN.create(
            YUNET_MODEL_PATH,
            "",
            (w, h),
            score_threshold=0.5,
            nms_threshold=0.3,
            top_k=5000
        )

        # First pass at original resolution
        _, faces = detector.detect(image_bgr)

        # If no face found, try upscaling small images
        if faces is None or len(faces) == 0:
            scale = 2.0
            upscaled = cv2.resize(image_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)
            detector.setInputSize((int(w * scale), int(h * scale)))
            _, faces = detector.detect(upscaled)

            if faces is not None and len(faces) > 0:
                # Scale coordinates back down
                faces[:, :4] = faces[:, :4] / scale
                faces[:, 4:14] = faces[:, 4:14] / scale

        if faces is None or len(faces) == 0:
            # Last resort: try with lower confidence threshold
            detector2 = cv2.FaceDetectorYN.create(
                YUNET_MODEL_PATH,
                "",
                (w, h),
                score_threshold=0.3,
                nms_threshold=0.3,
                top_k=5000
            )
            _, faces = detector2.detect(image_bgr)

        if faces is None or len(faces) == 0:
            return None

        # Take the face with highest confidence
        best_idx = np.argmax(faces[:, -1])
        face = faces[best_idx]

        x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
        confidence = float(face[-1])

        landmarks = {
            "face_bbox": (x, y, fw, fh),
            "confidence": confidence,
            "right_eye": (int(face[4]), int(face[5])),
            "left_eye": (int(face[6]), int(face[7])),
            "nose_tip": (int(face[8]), int(face[9])),
            "right_mouth": (int(face[10]), int(face[11])),
            "left_mouth": (int(face[12]), int(face[13])),
            "face_center": (x + fw // 2, y + fh // 2),
        }

        return landmarks

    except Exception as e:
        print(f"YuNet detection failed: {e}, falling back to Haar cascade.")
        return _detect_face_haar(image_rgb)


def _detect_face_haar(image_rgb):
    """Fallback: Haar cascade face detection for environments without YuNet."""
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

    # Try multiple scale factors for better detection
    for scale in [1.05, 1.1, 1.2]:
        faces = face_cascade.detectMultiScale(gray, scaleFactor=scale, minNeighbors=3, minSize=(30, 30))
        if len(faces) > 0:
            break

    if len(faces) == 0:
        return None

    face = max(faces, key=lambda f: f[2] * f[3])
    x, y, w, h = face

    return {
        "face_bbox": (int(x), int(y), int(w), int(h)),
        "confidence": 0.5,  # Unknown for Haar
        "right_eye": None,
        "left_eye": None,
        "nose_tip": None,
        "right_mouth": None,
        "left_mouth": None,
        "face_center": (int(x + w // 2), int(y + h // 2)),
    }


def compute_face_symmetry(image_rgb, face_bbox, output_dir=None, prefix="face"):
    """
    Measure facial symmetry by comparing pixel intensities on
    the left and right halves of the detected face.
    """
    x, y, w, h = face_bbox
    ih, iw = image_rgb.shape[:2]

    # Clamp to image bounds
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(iw, x + w), min(ih, y + h)
    face_crop = image_rgb[y1:y2, x1:x2]

    if face_crop.size == 0 or face_crop.shape[1] < 4:
        return 0.5, None

    gray = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY)

    mid = gray.shape[1] // 2
    left_half = gray[:, :mid]
    right_half = cv2.flip(gray[:, mid:2 * mid], 1)

    if left_half.shape != right_half.shape:
        min_w = min(left_half.shape[1], right_half.shape[1])
        left_half = left_half[:, :min_w]
        right_half = right_half[:, :min_w]

    if left_half.size == 0:
        return 0.5, None

    diff = np.abs(left_half.astype(float) - right_half.astype(float))
    
    symmetry_map_path = None
    if output_dir:
        # Reconstruct the full face diff for visualization by mirroring the diff
        diff_full = np.hstack((diff, cv2.flip(diff, 1)))
        
        # Visualize the asymmetry (diff_full) using a heatmap
        diff_vis = cv2.normalize(diff_full, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        diff_vis = cv2.applyColorMap(diff_vis, cv2.COLORMAP_MAGMA)
        symmetry_map_path = os.path.join(output_dir, f"{prefix}_symmetry_map.jpg")
        cv2.imwrite(symmetry_map_path, diff_vis)

    symmetry_score = 1.0 - (np.mean(diff) / 255.0)
    return float(symmetry_score), symmetry_map_path


def compute_texture_consistency(image_rgb, face_bbox, output_dir=None, prefix="face"):
    """
    Analyze texture consistency across the face using Laplacian variance.
    Deepfakes often show inconsistent texture patterns at face boundaries.
    """
    x, y, w, h = face_bbox
    ih, iw = image_rgb.shape[:2]

    pad = int(w * 0.15)
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(iw, x + w + pad)
    y2 = min(ih, y + h + pad)

    face_region = cv2.cvtColor(image_rgb[y1:y2, x1:x2], cv2.COLOR_RGB2GRAY)

    if face_region.size == 0 or min(face_region.shape) < 10:
        return 0.5, None

    laplacian = cv2.Laplacian(face_region, cv2.CV_64F)
    
    texture_map_path = None
    if output_dir:
        # Visualize the Laplacian texture as a heatmap
        tex_vis = cv2.normalize(np.abs(laplacian), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        tex_vis = cv2.applyColorMap(tex_vis, cv2.COLORMAP_TWILIGHT_SHIFTED)
        texture_map_path = os.path.join(output_dir, f"{prefix}_texture_map.jpg")
        cv2.imwrite(texture_map_path, tex_vis)

    inner_h, inner_w = face_region.shape
    inner_margin = int(min(inner_h, inner_w) * 0.2)

    if inner_margin < 2:
        return 0.5, texture_map_path

    inner = laplacian[inner_margin:-inner_margin, inner_margin:-inner_margin]

    boundary_mask = np.ones_like(laplacian, dtype=bool)
    boundary_mask[inner_margin:-inner_margin, inner_margin:-inner_margin] = False
    boundary = laplacian[boundary_mask]

    if inner.size == 0 or boundary.size == 0:
        return 0.5, texture_map_path

    inner_var = np.var(inner)
    boundary_var = np.var(boundary)

    if max(inner_var, boundary_var) == 0:
        return 0.5, texture_map_path

    consistency = 1.0 - abs(inner_var - boundary_var) / max(inner_var, boundary_var)
    return float(max(0, min(1, consistency))), texture_map_path


def compute_noise_consistency(image_rgb, face_bbox):
    """
    Analyze noise patterns across the image.
    Real photos have consistent sensor noise (PRNU), while deepfakes
    introduce inconsistent noise patterns in manipulated regions.
    """
    x, y, w, h = face_bbox
    ih, iw = image_rgb.shape[:2]

    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY).astype(np.float64)

    blurred = cv2.GaussianBlur(gray, (5, 5), 1.0)
    noise = gray - blurred

    face_mask = np.zeros_like(gray, dtype=bool)
    y1, y2 = max(0, y), min(ih, y + h)
    x1, x2 = max(0, x), min(iw, x + w)
    face_mask[y1:y2, x1:x2] = True

    face_noise = noise[face_mask]
    bg_noise = noise[~face_mask]

    if face_noise.size == 0 or bg_noise.size < 100:
        return 0.5

    face_noise_std = np.std(face_noise)
    bg_noise_std = np.std(bg_noise)

    if max(face_noise_std, bg_noise_std) == 0:
        return 0.5

    noise_ratio = min(face_noise_std, bg_noise_std) / max(face_noise_std, bg_noise_std)
    return float(noise_ratio)


def compute_eye_alignment(landmarks):
    """
    Check if eyes are geometrically aligned using YuNet's 14-point landmarks.
    Deepfakes can introduce subtle misalignment in eye positions.
    Returns angle in degrees (0 = perfectly level).
    """
    re = landmarks.get("right_eye")
    le = landmarks.get("left_eye")

    if re is None or le is None:
        return None

    dx = le[0] - re[0]
    dy = le[1] - re[1]

    if dx == 0:
        return 90.0

    angle = np.degrees(np.arctan2(dy, dx))
    return float(abs(angle))


def compute_mouth_symmetry(landmarks):
    """
    Check mouth corner symmetry relative to the nose.
    Deepfakes sometimes produce asymmetric mouth positioning.
    """
    nose = landmarks.get("nose_tip")
    rm = landmarks.get("right_mouth")
    lm = landmarks.get("left_mouth")

    if nose is None or rm is None or lm is None:
        return None

    dist_right = np.sqrt((rm[0] - nose[0]) ** 2 + (rm[1] - nose[1]) ** 2)
    dist_left = np.sqrt((lm[0] - nose[0]) ** 2 + (lm[1] - nose[1]) ** 2)

    if max(dist_right, dist_left) == 0:
        return 1.0

    symmetry = min(dist_right, dist_left) / max(dist_right, dist_left)
    return float(symmetry)


def compute_golden_ratio(landmarks):
    """
    Computes the vertical biological proportion ratio.
    Distance from eyes to nose tip vs. distance from nose tip to mouth center.
    The human face roughly follows the golden ratio (~1.618).
    GANs often synthesize facial features with subtle vertical skewing.
    """
    re = landmarks.get("right_eye")
    le = landmarks.get("left_eye")
    nt = landmarks.get("nose_tip")
    rm = landmarks.get("right_mouth")
    lm = landmarks.get("left_mouth")

    if not all([re, le, nt, rm, lm]):
        return None

    eye_center_y = (re[1] + le[1]) / 2.0
    mouth_center_y = (rm[1] + lm[1]) / 2.0

    eye_to_nose = abs(nt[1] - eye_center_y)
    nose_to_mouth = abs(mouth_center_y - nt[1])

    if nose_to_mouth == 0:
        return 1.0

    ratio = eye_to_nose / nose_to_mouth
    return float(ratio)


def compute_interocular_ratio(landmarks):
    """
    Computes the horizontal biological proportion ratio.
    Distance between eyes vs. width of the mouth.
    AI generators sometimes hallucinate mouths that are too wide or eyes too close.
    """
    re = landmarks.get("right_eye")
    le = landmarks.get("left_eye")
    rm = landmarks.get("right_mouth")
    lm = landmarks.get("left_mouth")

    if not all([re, le, rm, lm]):
        return None

    eye_dist = np.sqrt((re[0] - le[0])**2 + (re[1] - le[1])**2)
    mouth_width = np.sqrt((rm[0] - lm[0])**2 + (rm[1] - lm[1])**2)

    if mouth_width == 0:
        return 1.0

    ratio = eye_dist / mouth_width
    return float(ratio)

def compute_face_aspect_ratio(landmarks):
    """
    Computes the aspect ratio of the face bounding box (width / height).
    Faces generated by AI sometimes have unnatural aspect ratios due to latent space stretching.
    """
    x, y, w, h = landmarks["face_bbox"]
    if h == 0:
        return 1.0
    return float(w / h)

def compute_nose_mouth_ratio(landmarks):
    """
    Computes the ratio of nose-to-mouth distance vs mouth width.
    """
    nt = landmarks.get("nose_tip")
    rm = landmarks.get("right_mouth")
    lm = landmarks.get("left_mouth")
    if not all([nt, rm, lm]):
        return None
        
    mouth_center_y = (rm[1] + lm[1]) / 2.0
    mouth_center_x = (rm[0] + lm[0]) / 2.0
    
    nose_to_mouth = np.sqrt((nt[0] - mouth_center_x)**2 + (nt[1] - mouth_center_y)**2)
    mouth_width = np.sqrt((rm[0] - lm[0])**2 + (rm[1] - lm[1])**2)
    
    if mouth_width == 0: return 1.0
    return float(nose_to_mouth / mouth_width)

def visualize_landmarks(image_rgb, landmarks, metrics=None, save_path=None):
    """
    Draw YuNet landmarks on the image with an elegant Constellation Wireframe.
    """
    vis = image_rgb.copy()

    if landmarks is None:
        if save_path:
            cv2.imwrite(save_path, cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))
        return vis

    x, y, w, h = landmarks["face_bbox"]
    
    # 1. Draw Bounding Box Corners (more elegant than full box)
    corner_length = max(10, int(w * 0.1))
    bbox_color = (200, 200, 255) # Light blueish white
    thickness = 2
    
    # Top-left
    cv2.line(vis, (x, y), (x + corner_length, y), bbox_color, thickness, cv2.LINE_AA)
    cv2.line(vis, (x, y), (x, y + corner_length), bbox_color, thickness, cv2.LINE_AA)
    # Top-right
    cv2.line(vis, (x + w, y), (x + w - corner_length, y), bbox_color, thickness, cv2.LINE_AA)
    cv2.line(vis, (x + w, y), (x + w, y + corner_length), bbox_color, thickness, cv2.LINE_AA)
    # Bottom-left
    cv2.line(vis, (x, y + h), (x + corner_length, y + h), bbox_color, thickness, cv2.LINE_AA)
    cv2.line(vis, (x, y + h), (x, y + h - corner_length), bbox_color, thickness, cv2.LINE_AA)
    # Bottom-right
    cv2.line(vis, (x + w, y + h), (x + w - corner_length, y + h), bbox_color, thickness, cv2.LINE_AA)
    cv2.line(vis, (x + w, y + h), (x + w, y + h - corner_length), bbox_color, thickness, cv2.LINE_AA)

    # 2. Draw Constellation Wireframe
    re = landmarks.get("right_eye")
    le = landmarks.get("left_eye")
    nt = landmarks.get("nose_tip")
    rm = landmarks.get("right_mouth")
    lm = landmarks.get("left_mouth")
    
    wireframe_color = (129, 248, 200) # Mint Green
    
    if all([re, le, nt, rm, lm]):
        # Connect Eyes
        cv2.line(vis, re, le, wireframe_color, 1, cv2.LINE_AA)
        # Connect Eyes to Nose
        cv2.line(vis, re, nt, wireframe_color, 1, cv2.LINE_AA)
        cv2.line(vis, le, nt, wireframe_color, 1, cv2.LINE_AA)
        # Connect Nose to Mouths
        cv2.line(vis, nt, rm, wireframe_color, 1, cv2.LINE_AA)
        cv2.line(vis, nt, lm, wireframe_color, 1, cv2.LINE_AA)
        # Connect Mouths
        cv2.line(vis, rm, lm, wireframe_color, 1, cv2.LINE_AA)
        
    # 3. Draw Landmark Dots
    pts = [re, le, nt, rm, lm]
    for pt in pts:
        if pt:
            cv2.circle(vis, pt, 4, (0, 0, 0), -1, cv2.LINE_AA)
            cv2.circle(vis, pt, 2, (255, 255, 255), -1, cv2.LINE_AA)

    # 4. Optional: Print minimal stats at bottom left instead of a huge HUD
    if metrics:
        conf_str = metrics.get('Confidence', '')
        sym_str = metrics.get('Symmetry', '')
        text = f"CONF: {conf_str} | SYM: {sym_str}"
        # Measure text to place it at bottom
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
        ih, iw = vis.shape[:2]
        tx, ty = 10, ih - 10
        # Shadow
        cv2.putText(vis, text, (tx+1, ty+1), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)
        # Text
        cv2.putText(vis, text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)

    if save_path:
        cv2.imwrite(save_path, cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))

    return vis


def analyze_face_geometry(image_rgb, output_dir, prefix="face", frame_files=None):
    """
    Run full facial geometry analysis.
    If frame_files is provided, performs Temporal Geometric Jitter analysis across frames.
    Returns a dict with all computed metrics and visualization paths.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Always process the first frame for static metrics and visualization
    landmarks_first = detect_face_yunet(image_rgb)
    vis_path = os.path.join(output_dir, f"{prefix}_landmarks.jpg")

    if landmarks_first is None:
        cv2.imwrite(vis_path, cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR))
        return {
            "face_detected": False,
            "symmetry_score": None,
            "texture_consistency": None,
            "noise_consistency": None,
            "landmark_visualization_path": vis_path.replace("\\", "/"),
            "face_geometry_interpretation": "No face detected in the image.",
        }

    bbox = landmarks_first["face_bbox"]
    symmetry, sym_map_path = compute_face_symmetry(image_rgb, bbox, output_dir, prefix)
    texture, tex_map_path = compute_texture_consistency(image_rgb, bbox, output_dir, prefix)
    noise = compute_noise_consistency(image_rgb, bbox)
    eye_angle = compute_eye_alignment(landmarks_first)
    mouth_sym = compute_mouth_symmetry(landmarks_first)
    golden_ratio = compute_golden_ratio(landmarks_first)
    interoc_ratio = compute_interocular_ratio(landmarks_first)
    aspect_ratio = compute_face_aspect_ratio(landmarks_first)
    nose_mouth_ratio = compute_nose_mouth_ratio(landmarks_first)

    temporal_jitter = 0.0
    is_video = False

    # Temporal Geometric Jitter Analysis for Videos
    if frame_files and len(frame_files) > 1:
        is_video = True
        # Sample up to 20 frames evenly across the video to measure temporal consistency
        sample_count = min(20, len(frame_files))
        indices = np.linspace(0, len(frame_files) - 1, sample_count, dtype=int)
        
        gr_history = []
        io_history = []

        for idx in indices:
            frame_path = frame_files[idx]
            frame = cv2.imread(frame_path)
            if frame is None:
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            lms = detect_face_yunet(frame_rgb)
            if lms:
                gr = compute_golden_ratio(lms)
                io = compute_interocular_ratio(lms)
                if gr is not None: gr_history.append(gr)
                if io is not None: io_history.append(io)

        # Calculate standard deviation (jitter) across frames
        if len(gr_history) > 3 and len(io_history) > 3:
            gr_variance = np.std(gr_history)
            io_variance = np.std(io_history)
            # Normalize jitter: Webcams have high noise which shifts landmarks. We use 0.15 std as the threshold for true deepfake jitter
            temporal_jitter = min(1.0, (gr_variance / 0.15) * 0.5 + (io_variance / 0.15) * 0.5)

    # Build HUD metrics
    hud_metrics = {
        "Confidence": f"{landmarks_first.get('confidence', 0):.1%}",
        "Symmetry": f"{symmetry:.2f}",
        "Golden Ratio": f"{golden_ratio:.3f}" if golden_ratio else "N/A",
        "Interocular": f"{interoc_ratio:.3f}" if interoc_ratio else "N/A",
        "Face Aspect": f"{aspect_ratio:.2f}" if aspect_ratio else "N/A"
    }

    # Call visualize
    visualize_landmarks(image_rgb, landmarks_first, metrics=hud_metrics, save_path=vis_path)

    # Overall geometry anomaly score
    if is_video:
        # Videos suffer from compression, ruining texture/noise. Rely heavily on symmetry and temporal stability.
        base_score = symmetry * 0.50 + texture * 0.25 + noise * 0.25
        anomaly_score = (1.0 - base_score) * 0.60 + (temporal_jitter * 0.40)
    else:
        base_score = symmetry * 0.30 + texture * 0.40 + noise * 0.30
        anomaly_score = 1.0 - base_score

    # Factor in landmark-based analysis if available
    if eye_angle is not None:
        eye_penalty = min(0.15, max(0, (eye_angle - 15)) / 100)
        anomaly_score += eye_penalty

    if mouth_sym is not None:
        mouth_penalty = (1.0 - mouth_sym) * 0.10
        anomaly_score += mouth_penalty

    if golden_ratio is not None:
        gr_deviation = abs(golden_ratio - 1.618)
        gr_penalty = min(0.20, gr_deviation * 0.2)
        anomaly_score += gr_penalty

    if interoc_ratio is not None:
        if interoc_ratio < 0.8:
            io_penalty = (0.8 - interoc_ratio) * 0.5
        elif interoc_ratio > 1.4:
            io_penalty = (interoc_ratio - 1.4) * 0.5
        else:
            io_penalty = 0.0
        anomaly_score += min(0.15, io_penalty)

    anomaly_score = float(np.clip(anomaly_score, 0, 1))

    # Interpretation
    if temporal_jitter > 0.4:
        interpretation = "High Temporal Geometric Jitter detected! Facial proportions fluctuate unnaturally across frames, strongly indicating a synthetic video generation."
    elif anomaly_score > 0.5:
        interpretation = "Significant facial geometry anomalies detected. Asymmetrical features or incorrect biological proportions suggest synthetic generation."
    elif anomaly_score > 0.3:
        interpretation = "Minor geometric inconsistencies found. Subtle texture boundary artifacts or skewed proportions."
    else:
        interpretation = "Facial geometry appears consistent. Biological proportions, symmetry, and temporal stability are natural."

    conf = landmarks_first.get("confidence", 0.0)
    det_conf = round(float(conf), 4) if isinstance(conf, (int, float, str)) else 0.0

    result = {
        "face_detected": True,
        "detection_confidence": det_conf,
        "symmetry_score": round(symmetry, 4),
        "texture_consistency": round(texture, 4),
        "noise_consistency": round(noise, 4),
        "geometry_anomaly_score": round(anomaly_score, 4),
        "landmark_visualization_path": vis_path.replace("\\", "/"),
        "symmetry_map_path": sym_map_path.replace("\\", "/") if sym_map_path else None,
        "texture_map_path": tex_map_path.replace("\\", "/") if tex_map_path else None,
        "face_geometry_interpretation": interpretation,
    }

    if is_video:
        result["temporal_jitter_score"] = round(temporal_jitter, 4)
        result["temporal_history"] = {
            "golden_ratio": [round(x, 3) for x in gr_history] if 'gr_history' in locals() and gr_history else [],
            "interocular_ratio": [round(x, 3) for x in io_history] if 'io_history' in locals() and io_history else [],
            "frames": [int(x) for x in indices] if 'indices' in locals() and indices is not None and len(indices) > 0 else []
        }

    if eye_angle is not None:
        result["eye_alignment_angle"] = round(eye_angle, 2)
    if mouth_sym is not None:
        result["mouth_symmetry"] = round(mouth_sym, 4)
    if golden_ratio is not None:
        result["golden_ratio"] = round(golden_ratio, 3)
    if interoc_ratio is not None:
        result["interocular_ratio"] = round(interoc_ratio, 3)
    if aspect_ratio is not None:
        result["face_aspect_ratio"] = round(aspect_ratio, 3)
    if nose_mouth_ratio is not None:
        result["nose_mouth_ratio"] = round(nose_mouth_ratio, 3)

    return result
