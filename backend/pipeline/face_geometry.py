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
import threading
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MP_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "face_landmarker.task")
_local_storage = threading.local()

def get_landmarker():
    if not hasattr(_local_storage, "landmarker"):
        base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
        )
        _local_storage.landmarker = vision.FaceLandmarker.create_from_options(options)
    return _local_storage.landmarker

def detect_face(image_rgb):
    """
    Detect faces using YuNet for robust bounding boxes (handling tilts/angles),
    then use MediaPipe Face Mesh for highly accurate 3D landmarks.
    """
    h, w = image_rgb.shape[:2]
    
    # 1. Try YuNet first for robust bounding box
    yunet_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "face_detection_yunet_2023mar.onnx")
    bbox = None
    
    if os.path.exists(yunet_path):
        try:
            if not hasattr(_local_storage, "yunet"):
                _local_storage.yunet = cv2.FaceDetectorYN.create(
                    model=yunet_path, config="", input_size=(w, h), score_threshold=0.8, nms_threshold=0.3
                )
            _local_storage.yunet.setInputSize((w, h))
            image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
            _, faces = _local_storage.yunet.detect(image_bgr)
            if faces is not None and len(faces) > 0:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                face = faces[0]
                bbox = (int(face[0]), int(face[1]), int(face[2]), int(face[3]))
        except Exception:
            pass

    # 2. Use MediaPipe for dense landmarks
    landmarker = get_landmarker()
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    detection_result = landmarker.detect(mp_image)

    if not detection_result.face_landmarks:
        return None

    face_landmarks = detection_result.face_landmarks[0]

    # Calculate bounding box if YuNet failed
    if bbox is None:
        x_min, y_min = w, h
        x_max, y_max = 0, 0
        for landmark in face_landmarks:
            x, y = int(landmark.x * w), int(landmark.y * h)
            x_min = min(x_min, x)
            y_min = min(y_min, y)
            x_max = max(x_max, x)
            y_max = max(y_max, y)

        x_min, y_min = max(0, x_min), max(0, y_min)
        x_max, y_max = min(w, x_max), min(h, y_max)
        fw = x_max - x_min
        fh = y_max - y_min
        bbox = (x_min, y_min, fw, fh)

    # Extract Constellation Landmarks
    def get_pt(idx):
        lm = face_landmarks[idx]
        return (int(lm.x * w), int(lm.y * h))

    return {
        "face_bbox": bbox,
        "confidence": 0.95,
        "right_eye": get_pt(468), # Person's right iris
        "left_eye": get_pt(473),  # Person's left iris
        "nose_tip": get_pt(1),    # Nose tip
        "right_mouth": get_pt(61), # Person's right mouth corner
        "left_mouth": get_pt(291), # Person's left mouth corner
        "face_center": (bbox[0] + bbox[2] // 2, bbox[1] + bbox[3] // 2),
        "all_landmarks": [get_pt(i) for i in range(len(face_landmarks))],
        "all_landmarks_3d": [(lm.x * w, lm.y * h, lm.z * w) for lm in face_landmarks],
    }


def compute_face_symmetry(image_rgb, landmarks_first, output_dir=None, prefix="face"):
    """
    Measure facial symmetry using purely geometric distances to isolate lighting.
    We also generate a pixel-intensity difference heatmap for visualization.
    """
    face_bbox = landmarks_first["face_bbox"]
    x, y, w, h = face_bbox
    ih, iw = image_rgb.shape[:2]

    # 1. Pixel Heatmap (For Visualization Only)
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(iw, x + w), min(ih, y + h)
    face_crop = image_rgb[y1:y2, x1:x2]

    symmetry_map_path = None
    if face_crop.size > 0 and face_crop.shape[1] >= 4:
        gray = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY)
        mid = gray.shape[1] // 2
        left_half = gray[:, :mid]
        right_half = cv2.flip(gray[:, mid:2 * mid], 1)

        if left_half.shape == right_half.shape and left_half.size > 0:
            diff = np.abs(left_half.astype(float) - right_half.astype(float))
            if output_dir:
                diff_full = np.hstack((diff, cv2.flip(diff, 1)))
                diff_vis = cv2.normalize(diff_full, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                diff_vis = cv2.applyColorMap(diff_vis, cv2.COLORMAP_MAGMA)
                diff_vis = cv2.resize(diff_vis, (face_crop.shape[1], face_crop.shape[0]))
                face_crop_bgr = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)
                blended = cv2.addWeighted(face_crop_bgr, 0.4, diff_vis, 0.8, 0)
                symmetry_map_path = os.path.join(output_dir, f"{prefix}_symmetry_map.jpg")
                cv2.imwrite(symmetry_map_path, blended)

    # 2. Geometric Symmetry Score (Highly Accurate)
    re = landmarks_first.get("right_eye")
    le = landmarks_first.get("left_eye")
    nt = landmarks_first.get("nose_tip")
    rm = landmarks_first.get("right_mouth")
    lm = landmarks_first.get("left_mouth")

    if not all([re, le, nt, rm, lm]):
        return 0.5, symmetry_map_path

    def dist(p1, p2):
        return np.linalg.norm(np.array(p1) - np.array(p2))

    eye_sym = abs(dist(re, nt) - dist(le, nt)) / max(1, max(dist(re, nt), dist(le, nt)))
    mouth_sym = abs(dist(rm, nt) - dist(lm, nt)) / max(1, max(dist(rm, nt), dist(lm, nt)))
    jaw_sym = abs(dist(re, rm) - dist(le, lm)) / max(1, max(dist(re, rm), dist(le, lm)))

    avg_asymmetry = np.mean([eye_sym, mouth_sym, jaw_sym])
    symmetry_score = max(0.0, 1.0 - (avg_asymmetry * 2.0)) # Multiply by 2 to make it more sensitive
    
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
        
        # Alpha blend over original face
        face_crop_bgr = cv2.cvtColor(image_rgb[y1:y2, x1:x2], cv2.COLOR_RGB2BGR)
        blended = cv2.addWeighted(face_crop_bgr, 0.4, tex_vis, 0.8, 0)
        
        texture_map_path = os.path.join(output_dir, f"{prefix}_texture_map.jpg")
        cv2.imwrite(texture_map_path, blended)

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
    Computes the aspect ratio of the face bounding box (height / width).
    Faces generated by AI sometimes have unnatural aspect ratios due to latent space stretching.
    """
    x, y, w, h = landmarks["face_bbox"]
    if w == 0:
        return 1.0
    return float(h / w)

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

def compute_3d_head_pose(landmarks, w, h, return_vectors=False):
    """
    Use cv2.solvePnP to mathematically project 2D landmarks onto a canonical 3D human skull model.
    This exposes deepfakes by calculating the true 3D Pitch, Yaw, and Roll of the head.
    """
    re = landmarks.get("right_eye")
    le = landmarks.get("left_eye")
    nt = landmarks.get("nose_tip")
    rm = landmarks.get("right_mouth")
    lm = landmarks.get("left_mouth")
    
    # Extract chin and temples from all_landmarks
    all_pts = landmarks.get("all_landmarks", [])
    if len(all_pts) > 454:
        chin = all_pts[152]
        left_temple = all_pts[454]
        right_temple = all_pts[234]
    else:
        return None
    
    if not all([re, le, nt, rm, lm, chin, left_temple, right_temple]):
        return None
        
    # 2D image points from MediaPipe (8 points required for robust solvePnP)
    image_points = np.array([
        nt,       # Nose tip
        lm,       # Left mouth corner
        rm,       # Right mouth corner
        le,       # Left eye
        re,       # Right eye
        chin,     # Chin
        left_temple,  # Left side of face
        right_temple  # Right side of face
    ], dtype="double")
    
    # Canonical 3D skull points (X, Y, Z) in standard right-handed coordinates
    # X points right, Y points down, Z points into the screen
    model_points = np.array([
        (0.0, 0.0, 0.0),             # Nose tip
        (225.0, 170.0, 135.0),       # Left mouth corner
        (-225.0, 170.0, 135.0),      # Right mouth corner
        (225.0, -150.0, 125.0),      # Left eye
        (-225.0, -150.0, 125.0),     # Right eye
        (0.0, 330.0, 65.0),          # Chin
        (350.0, -50.0, 200.0),       # Left temple
        (-350.0, -50.0, 200.0)       # Right temple
    ])
    
    # Camera internals
    focal_length = w
    center = (w / 2, h / 2)
    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype="double")
    
    dist_coeffs = np.zeros((4, 1)) # Assume zero lens distortion
    
    success, rotation_vector, translation_vector = cv2.solvePnP(
        model_points, image_points, camera_matrix, dist_coeffs, flags=cv2.SOLVEPNP_ITERATIVE
    )
    
    if not success:
        return None
        
    if return_vectors:
        return rotation_vector, translation_vector, camera_matrix, dist_coeffs
        
    # Convert rotation vector to Euler angles
    rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
    proj_matrix = np.hstack((rotation_matrix, translation_vector))
    _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)
    
    pitch, yaw, roll = euler_angles.flatten()
    return (pitch, yaw, roll)

def visualize_landmarks(image_rgb, landmarks, metrics=None, save_path=None, pose_save_path=None):
    """
    Draw 468-point full 3D face mesh using MediaPipe connections.
    Creates a glowing hologram effect on the original image.
    """
    vis = image_rgb.copy()

    if landmarks is None or "all_landmarks" not in landmarks:
        if save_path:
            cv2.imwrite(save_path, cv2.cvtColor(vis, cv2.COLOR_RGB2BGR))
        return vis

    # Draw Face Mesh
    overlay = np.zeros_like(vis, dtype=np.uint8)
    all_pts = landmarks["all_landmarks"]
    
    # Dynamic scaling based on image size (baseline 1000px)
    ih, iw = vis.shape[:2]
    scale = max(1.0, max(iw, ih) / 1000.0)
    line_thick = max(1, int(1 * scale))
    dot_rad = max(1, int(1 * scale))
    key_bg_rad = max(2, int(4 * scale))
    key_fg_rad = max(1, int(2 * scale))
    glow_k = int(7 * scale)
    if glow_k % 2 == 0: glow_k += 1

    # Define color for mesh
    mesh_color = (200, 248, 129) # Glowing mint
    
    # Try to get connections
    connections = None
    try:
        import mediapipe as mp
        if hasattr(mp, 'solutions') and hasattr(mp.solutions, 'face_mesh'):
            connections = mp.solutions.face_mesh.FACEMESH_TESSELATION
        else:
            from mediapipe.python.solutions import face_mesh_connections
            connections = face_mesh_connections.FACEMESH_TESSELATION
    except Exception:
        pass
        
    if connections:
        # Draw connections
        for connection in connections:
            start_idx = connection[0]
            end_idx = connection[1]
            if start_idx < len(all_pts) and end_idx < len(all_pts):
                pt1 = all_pts[start_idx]
                pt2 = all_pts[end_idx]
                cv2.line(overlay, pt1, pt2, mesh_color, line_thick, cv2.LINE_AA)
        # Add tiny dots at vertices for a subtle "constellation" effect
        for pt in all_pts:
            cv2.circle(overlay, pt, dot_rad, mesh_color, -1, cv2.LINE_AA)
    else:
        # Fallback to dense point cloud
        for pt in all_pts:
            cv2.circle(overlay, pt, dot_rad, mesh_color, -1, cv2.LINE_AA)
            
    # Add dots for key points (eyes, nose, mouth)
    key_pts = [landmarks.get("right_eye"), landmarks.get("left_eye"), landmarks.get("nose_tip"), landmarks.get("right_mouth"), landmarks.get("left_mouth")]
    for pt in key_pts:
        if pt:
            cv2.circle(overlay, pt, key_bg_rad, (0, 0, 0), -1, cv2.LINE_AA)
            cv2.circle(overlay, pt, key_fg_rad, (255, 255, 255), -1, cv2.LINE_AA)
            
    # Apply glow effect
    glow = cv2.GaussianBlur(overlay, (glow_k, glow_k), 0)
    overlay_with_glow = cv2.addWeighted(overlay, 0.9, glow, 0.6, 0)
    
    # Blend with original - Dim background to 60% so the mesh is clearly visible but not blinding
    vis = cv2.addWeighted(vis, 0.6, overlay_with_glow, 1.2, 0)
    
    # Draw 3D axes (Pitch, Yaw, Roll) on a SEPARATE clean image
    ih, iw = vis.shape[:2]
    pose_data = compute_3d_head_pose(landmarks, iw, ih, return_vectors=True)
    if pose_data and pose_save_path:
        # Create a fresh copy of the original image
        pose_vis = image_rgb.copy()
        
        rvec, tvec, camera_matrix, dist_coeffs = pose_data
        axis_length = landmarks.get("face_bbox", [0, 0, 200, 200])[2] * 1.2 # Scale to 1.2x face width
        
        # 3D points representing X, Y, Z axes
        axis_points = np.array([
            (axis_length, 0.0, 0.0),       # X axis (Pitch)
            (0.0, -axis_length, 0.0),      # Y axis (Yaw)
            (0.0, 0.0, axis_length)        # Z axis (Roll) - Positive points into screen
        ], dtype="double")
        
        projected_axes, _ = cv2.projectPoints(axis_points, rvec, tvec, camera_matrix, dist_coeffs)
        nose_tip = landmarks.get("nose_tip")
        
        if nose_tip:
            p1 = (int(projected_axes[0][0][0]), int(projected_axes[0][0][1]))
            p2 = (int(projected_axes[1][0][0]), int(projected_axes[1][0][1]))
            p3 = (int(projected_axes[2][0][0]), int(projected_axes[2][0][1]))
            
            # Helper to draw shadowed text, using a specific 2D push direction to prevent overlapping
            def draw_hud_text(img, text, start_pt, end_pt, color, fallback_dir):
                length = np.sqrt((end_pt[0]-start_pt[0])**2 + (end_pt[1]-start_pt[1])**2)
                
                if length > 15:
                    dx = (end_pt[0] - start_pt[0]) / length
                    dy = (end_pt[1] - start_pt[1]) / length
                else:
                    # If arrow is pointing at camera, it's a dot. Use the fallback direction.
                    dx, dy = fallback_dir
                
                # Push text 25 pixels past the tip
                pos = (int(end_pt[0] + dx * 25) - 30, int(end_pt[1] + dy * 25) + 5)
                
                cv2.putText(img, text, (pos[0]+2, pos[1]+2), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,0,0), 3, cv2.LINE_AA)
                cv2.putText(img, text, pos, cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)

            # Draw center origin point
            cv2.circle(pose_vis, nose_tip, 4, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(pose_vis, nose_tip, 6, (0, 0, 0), 2, cv2.LINE_AA)

            # Note: image_rgb is in RGB format, so colors are (R, G, B)
            
            # Z axis (Roll Axis) - Blue. Fallback points down-left
            cv2.arrowedLine(pose_vis, nose_tip, p3, (50, 150, 255), 3, cv2.LINE_AA, tipLength=0.15)
            draw_hud_text(pose_vis, "Z (Roll Axis)", nose_tip, p3, (50, 150, 255), (-0.7, 0.7))
            
            # Y axis (Yaw Axis) - Green. Fallback points up
            cv2.arrowedLine(pose_vis, nose_tip, p2, (50, 255, 50), 3, cv2.LINE_AA, tipLength=0.15)
            draw_hud_text(pose_vis, "Y (Yaw Axis)", nose_tip, p2, (50, 255, 50), (0.0, -1.0))
            
            # X axis (Pitch Axis) - Red. Fallback points right
            cv2.arrowedLine(pose_vis, nose_tip, p1, (255, 50, 50), 3, cv2.LINE_AA, tipLength=0.15)
            draw_hud_text(pose_vis, "X (Pitch Axis)", nose_tip, p1, (255, 50, 50), (1.0, 0.0))
            
            cv2.imwrite(pose_save_path, cv2.cvtColor(pose_vis, cv2.COLOR_RGB2BGR))

    # Print stats
    if metrics:
        conf_str = metrics.get('Confidence', '')
        sym_str = metrics.get('Symmetry', '')
        text = f"CONF: {conf_str} | SYM: {sym_str}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
        ih, iw = vis.shape[:2]
        tx, ty = 10, ih - 10
        cv2.putText(vis, text, (tx+1, ty+1), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1, cv2.LINE_AA)
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
    landmarks_first = detect_face(image_rgb)
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
    symmetry, sym_map_path = compute_face_symmetry(image_rgb, landmarks_first, output_dir, prefix)
    texture, tex_map_path = compute_texture_consistency(image_rgb, bbox, output_dir, prefix)
    noise = compute_noise_consistency(image_rgb, bbox)
    eye_angle = compute_eye_alignment(landmarks_first)
    mouth_sym = compute_mouth_symmetry(landmarks_first)
    golden_ratio = compute_golden_ratio(landmarks_first)
    interoc_ratio = compute_interocular_ratio(landmarks_first)
    aspect_ratio = compute_face_aspect_ratio(landmarks_first)
    nose_mouth_ratio = compute_nose_mouth_ratio(landmarks_first)
    
    ih, iw = image_rgb.shape[:2]
    first_head_pose = compute_3d_head_pose(landmarks_first, iw, ih)

    temporal_jitter = 0.0
    head_pose_jitter = 0.0
    is_video = False

    # Temporal Geometric Jitter Analysis for Videos
    if frame_files and len(frame_files) > 1:
        is_video = True
        # Sample up to 20 frames evenly across the video to measure temporal consistency
        sample_count = min(20, len(frame_files))
        indices = np.linspace(0, len(frame_files) - 1, sample_count, dtype=int)
        
        gr_history = []
        io_history = []
        sym_history = []
        ar_history = []
        nm_history = []
        tex_history = []
        noise_history = []
        conf_history = []

        for idx in indices:
            frame_path = frame_files[idx]
            frame = cv2.imread(frame_path)
            if frame is None:
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            lms = detect_face(frame_rgb)
            if lms:
                gr = compute_golden_ratio(lms)
                io = compute_interocular_ratio(lms)
                ar = compute_face_aspect_ratio(lms)
                nm = compute_nose_mouth_ratio(lms)
                sym, _ = compute_face_symmetry(frame_rgb, lms, output_dir=None)
                tex, _ = compute_texture_consistency(frame_rgb, lms["face_bbox"], output_dir=None)
                ns = compute_noise_consistency(frame_rgb, lms["face_bbox"])
                cnf = lms.get("confidence", 0.95)

                if gr is not None: gr_history.append(gr)
                if io is not None: io_history.append(io)
                if ar is not None: ar_history.append(ar)
                if nm is not None: nm_history.append(nm)
                if sym is not None: sym_history.append(sym)
                if tex is not None: tex_history.append(tex)
                if ns is not None: noise_history.append(ns)
                if cnf is not None: conf_history.append(cnf)
                
                # 3D Head Pose tracking
                pose = compute_3d_head_pose(lms, iw, ih)
                if pose:
                    if not 'pose_history' in locals():
                        pose_history = []
                    pose_history.append(pose)

        # Calculate standard deviation (jitter) across frames
        if len(gr_history) > 3:
            # We compute a combined jitter score based on the variance of all key proportions
            # Increase the tolerance drastically since these are sparsely sampled frames (e.g. 1 frame every 2-3 secs)
            var_gr = np.std(gr_history) / 0.50
            var_io = np.std(io_history) / 0.50
            var_ar = np.std(ar_history) / 0.60
            var_nm = np.std(nm_history) / 0.60
            var_sym = np.std(sym_history) / 0.30
            
            avg_var = np.mean([var_gr, var_io, var_ar, var_nm, var_sym])
            temporal_jitter = min(1.0, avg_var * 0.3) # Scale down the overall impact
            
            # Compute 3D Head Pose Jitter
            if 'pose_history' in locals() and len(pose_history) > 3:
                poses = np.array(pose_history)
                # Compute angular velocity (diff between adjacent frames)
                angular_velocity = np.diff(poses, axis=0)
                # Jitter is the variance of the angular velocity
                pitch_jitter = np.var(angular_velocity[:, 0])
                yaw_jitter = np.var(angular_velocity[:, 1])
                roll_jitter = np.var(angular_velocity[:, 2])
                
                # Normalize jitter. Real faces have smooth velocity.
                # Deepfakes snap and snap with high velocity variance.
                # Increase denominator from 150.0 to 3000.0 since sparse frames have naturally massive variance!
                head_pose_jitter = min(1.0, (pitch_jitter + yaw_jitter + roll_jitter) / 3000.0)

            # Generate Temporal Geometric Jitter Plot
            from matplotlib.figure import Figure
            from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
            
            fig = Figure(figsize=(8, 4), facecolor='#0f172a')
            canvas = FigureCanvas(fig)
            ax = fig.subplots()
            
            ax.set_facecolor('#0f172a')
            time_axis = np.arange(len(gr_history))
            
            def norm_history(hist):
                if not hist or len(hist) == 0: return []
                mean_val = np.mean(hist)
                if mean_val == 0: return [0] * len(hist)
                return [(x - mean_val) / mean_val * 100 for x in hist]
            
            ax.plot(time_axis, norm_history(gr_history), color='#f43f5e', linewidth=2, label='Golden Ratio', marker='o', markersize=3)
            ax.plot(time_axis, norm_history(io_history), color='#2dd4bf', linewidth=2, label='Interocular', marker='s', markersize=3)
            ax.plot(time_axis, norm_history(sym_history), color='#a855f7', linewidth=1.5, label='Symmetry', alpha=0.8)
            ax.plot(time_axis, norm_history(ar_history), color='#3b82f6', linewidth=1.5, label='Aspect Ratio', alpha=0.8)
            ax.plot(time_axis, norm_history(tex_history), color='#eab308', linewidth=1, label='Texture', alpha=0.5, linestyle='--')
            ax.plot(time_axis, norm_history(noise_history), color='#94a3b8', linewidth=1, label='Noise', alpha=0.5, linestyle='--')
            
            ax.set_title("Temporal Jitter Tracker (All Proportions)", color='white', fontsize=11, pad=10)
            ax.set_xlabel("Sampled Frame Window", color='#94a3b8', fontsize=9)
            ax.set_ylabel("Deviation from Mean (%)", color='#94a3b8', fontsize=9)
            ax.tick_params(colors='#94a3b8', labelsize=8)
            ax.legend(facecolor='#0f172a', edgecolor='#1e293b', labelcolor='white', loc='upper right', fontsize=8, ncol=2)
            for spine in ax.spines.values(): spine.set_color('#1e293b')
            ax.grid(True, color='#1e293b', linestyle='--', alpha=0.5)
            
            temporal_plot_path = os.path.join(output_dir, f"{prefix}_temporal_jitter.jpg")
            fig.tight_layout()
            canvas.print_figure(temporal_plot_path, dpi=120, bbox_inches='tight', facecolor='#0f172a')

    # Build HUD metrics
    hud_metrics = {
        "Confidence": f"{landmarks_first.get('confidence', 0):.1%}",
        "Symmetry": f"{symmetry:.2f}",
        "Golden Ratio": f"{golden_ratio:.3f}" if golden_ratio else "N/A",
        "Interocular": f"{interoc_ratio:.3f}" if interoc_ratio else "N/A",
        "Face Aspect": f"{aspect_ratio:.2f}" if aspect_ratio else "N/A"
    }

    # Call visualize
    pose_vis_path = os.path.join(output_dir, f"{prefix}_head_pose.jpg")
    visualize_landmarks(image_rgb, landmarks_first, metrics=hud_metrics, save_path=vis_path, pose_save_path=pose_vis_path)

    # Overall geometry anomaly score
    if is_video:
        # A deepfake face swap might have perfect symmetry, but terrible texture mismatch.
        # We must penalize based on the WORST spatial metric, not the average!
        worst_spatial_metric = min(symmetry, texture, noise)
        spatial_anomaly = 1.0 - worst_spatial_metric
        
        temporal_anomaly = (temporal_jitter + head_pose_jitter) / 2.0
        # A deepfake might have perfect temporal stability but terrible spatial boundaries, or vice versa.
        # We take the max of either to ensure we don't average down a critical failure.
        anomaly_score = max(spatial_anomaly, temporal_anomaly)
    else:
        worst_spatial_metric = min(symmetry, texture, noise)
        spatial_anomaly = 1.0 - worst_spatial_metric
        anomaly_score = spatial_anomaly
    # Factor in landmark-based analysis if available
    if eye_angle is not None:
        eye_penalty = min(0.15, max(0, (eye_angle - 15)) / 100)
        anomaly_score += eye_penalty

    if mouth_sym is not None:
        mouth_penalty = (1.0 - mouth_sym) * 0.10
        anomaly_score += mouth_penalty

    if golden_ratio is not None:
        gr_deviation = abs(golden_ratio - 1.4)
        gr_penalty = min(0.20, gr_deviation * 0.15)
        anomaly_score += gr_penalty

    if interoc_ratio is not None:
        if interoc_ratio < 1.0:
            io_penalty = (1.0 - interoc_ratio) * 0.5
        elif interoc_ratio > 1.6:
            io_penalty = (interoc_ratio - 1.6) * 0.5
        else:
            io_penalty = 0.0
        anomaly_score += min(0.15, io_penalty)

    anomaly_score = float(np.clip(anomaly_score, 0, 1))

    # Interpretation
    if head_pose_jitter > 0.4:
        interpretation = "High 3D Head Pose Inconsistency! The angular velocity of the head exhibits unnatural snapping and jitter (solvePnP violation), which is physically impossible for a real human. Extremely likely to be a Deepfake."
    elif temporal_jitter > 0.4:
        interpretation = "High Temporal Geometric Jitter detected! Facial proportions fluctuate unnaturally across frames, strongly indicating a synthetic video generation."
    elif anomaly_score > 0.5:
        interpretation = "Significant facial geometry anomalies detected. Asymmetrical features or incorrect biological proportions suggest synthetic generation."
    elif anomaly_score > 0.3:
        interpretation = "Minor geometric inconsistencies found. Subtle texture boundary artifacts or skewed proportions."
    else:
        interpretation = "Facial geometry appears consistent. 3D pose tracking, biological proportions, and temporal stability are natural."

    conf = landmarks_first.get("confidence", 0.0)
    det_conf = round(float(conf), 4) if isinstance(conf, (int, float, str)) else 0.0

    # === Radar Chart Generation ===
    labels = [
        "Symmetry", "Golden Ratio", "Interocular",
        "Face Aspect", "Nose-Mouth", "Texture", "Noise", "Confidence"
    ]
    
    # Normalize values (1.0 = Perfect, 0.0 = Bad)
    def norm_ratio(val, ideal, tol=0.4):
        if val is None: return 0.5
        return max(0.0, 1.0 - (abs(val - ideal) / tol))
        
    v_sym = float(symmetry)
    # The Vertical Proportion using MediaPipe landmarks is typically around 1.4
    v_gr = norm_ratio(golden_ratio, 1.4, 0.6)
    # The Interocular vs Mouth Width is typically around 1.3
    v_io = norm_ratio(interoc_ratio, 1.3, 0.5)
    # MediaPipe Face Mesh BBox aspect ratio is typically ~1.3
    v_ar = norm_ratio(aspect_ratio, 1.3, 0.3)
    # Nose-Mouth to Mouth Width ratio is typically ~0.65
    v_nm = norm_ratio(nose_mouth_ratio, 0.65, 0.3)
    v_tex = float(texture)
    v_noise = float(noise)
    v_conf = float(det_conf)
    
    values = [v_sym, v_gr, v_io, v_ar, v_nm, v_tex, v_noise, v_conf]
    
    # Close the loop
    values += values[:1]
    
    # Angles
    angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
    angles += angles[:1]
    
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
    
    fig = Figure(figsize=(5, 5), facecolor='#0f172a')
    canvas = FigureCanvas(fig)
    ax = fig.add_subplot(111, polar=True)
    ax.set_facecolor('#0f172a')
    
    # Draw radar
    ax.plot(angles, values, color='#a855f7', linewidth=2)
    ax.fill(angles, values, color='#a855f7', alpha=0.25)
    
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, color='#94a3b8', size=8)
    
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_yticklabels([], color='#1e293b')
    ax.spines['polar'].set_color('#1e293b')
    ax.grid(color='#1e293b', linestyle='--', alpha=0.5)
    
    ax.set_title("Biological Proportions (Radar Map)", color='white', pad=20, size=11)
    
    radar_path = os.path.join(output_dir, f"{prefix}_radar_chart.jpg")
    fig.tight_layout()
    canvas.print_figure(radar_path, dpi=120, bbox_inches='tight', facecolor='#0f172a')

    result = {
        "face_detected": True,
        "detection_confidence": det_conf,
        "symmetry_score": round(symmetry, 4),
        "texture_consistency": round(texture, 4),
        "noise_consistency": round(noise, 4),
        "geometry_anomaly_score": round(anomaly_score, 4),
        "landmark_visualization_path": vis_path.replace("\\", "/"),
        "head_pose_visualization_path": pose_vis_path.replace("\\", "/"),
        "symmetry_map_path": sym_map_path.replace("\\", "/") if sym_map_path else None,
        "texture_map_path": tex_map_path.replace("\\", "/") if tex_map_path else None,
        "radar_chart_path": radar_path.replace("\\", "/"),
        "face_geometry_interpretation": interpretation,
    }

    if is_video:
        result["temporal_jitter_score"] = round(temporal_jitter, 4)
        result["head_pose_jitter_score"] = round(head_pose_jitter, 4)
        result["temporal_history"] = {
            "golden_ratio": [round(x, 3) for x in gr_history] if 'gr_history' in locals() and gr_history else [],
            "interocular_ratio": [round(x, 3) for x in io_history] if 'io_history' in locals() and io_history else [],
            "symmetry": [round(x, 3) for x in sym_history] if 'sym_history' in locals() and sym_history else [],
            "aspect_ratio": [round(x, 3) for x in ar_history] if 'ar_history' in locals() and ar_history else [],
            "nose_mouth": [round(x, 3) for x in nm_history] if 'nm_history' in locals() and nm_history else [],
            "texture": [round(x, 3) for x in tex_history] if 'tex_history' in locals() and tex_history else [],
            "noise": [round(x, 3) for x in noise_history] if 'noise_history' in locals() and noise_history else [],
            "frames": [int(x) for x in indices] if 'indices' in locals() and indices is not None and len(indices) > 0 else []
        }
        if 'temporal_plot_path' in locals():
            result["temporal_jitter_plot_path"] = temporal_plot_path.replace("\\", "/")

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

    result["explanation"] = {
        "what_happened": "Extracted 468 3D facial landmarks and analyzed biological proportions, spatial symmetry, and temporal pose jitter.",
        "result": "Geometry Anomalies Detected" if anomaly_score > 0.5 else "Biologically Authentic Geometry",
        "why_it_happened": interpretation,
        "variables": {
            "Symmetry Anomaly": f"{(1.0 - symmetry) * 100:.1f}%",
            "Temporal Jitter": f"{(temporal_jitter * 100):.1f}%" if is_video else "N/A",
            "3D Head Pose Snap": f"{(head_pose_jitter * 100):.1f}%" if is_video else "N/A",
            "Worst Spatial Mismatch": f"{(spatial_anomaly * 100):.1f}%"
        }
    }

    return result
