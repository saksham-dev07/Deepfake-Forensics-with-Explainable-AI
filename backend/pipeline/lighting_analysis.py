import cv2
import numpy as np
import os
import math
from pipeline.face_geometry import detect_face_yunet

def analyze_lighting(image_rgb, output_dir, prefix="lighting", quality_multiplier=1.0):
    """
    Estimates 2D lighting direction on the face vs the background.
    High divergence indicates the face was spliced from a different lighting environment.
    """
    results = {
        "lighting_anomaly_score": 0.5,
        "face_light_angle": 0.0,
        "bg_light_angle": 0.0,
        "angle_difference": 0.0,
        "lighting_map_path": None,
        "warnings": []
    }

    h, w, _ = image_rgb.shape
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Calculate gradients
    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=5)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=5)
    
    magnitude = cv2.magnitude(grad_x, grad_y)
    angle = cv2.phase(grad_x, grad_y, angleInDegrees=True)

    # Face detection
    landmarks = detect_face_yunet(image_rgb)
    
    face_mask = np.zeros((h, w), dtype=np.uint8)
    x_min, y_min, box_w, box_h = 0, 0, 0, 0

    if landmarks is not None:
        x_min, y_min, box_w, box_h = landmarks["face_bbox"]
        
        # Ensure within bounds
        x_min = max(0, x_min)
        y_min = max(0, y_min)
        x_max = min(w, x_min + box_w)
        y_max = min(h, y_min + box_h)
        
        if x_max > x_min and y_max > y_min:
             cv2.rectangle(face_mask, (x_min, y_min), (x_max, y_max), 255, -1)
    else:
        results["warnings"].append("No face detected for lighting analysis.")
        return results

    bg_mask = cv2.bitwise_not(face_mask)

    # FARID (2005) METHODOLOGY: 
    # Estimate 2D light source direction on the face occluding boundary
    
    # Model face boundary as an ellipse
    cx = x_min + box_w / 2.0
    cy = y_min + box_h / 2.0
    a = box_w / 2.0
    b = box_h / 2.0
    
    # We sample N points along the boundary
    N_samples = 36
    M_matrix = []
    B_vector = []
    
    # Distance to sample inward to avoid bg bleed
    inward_d = max(3.0, min(box_w, box_h) * 0.08)
    
    for i in range(N_samples):
        theta = 2 * math.pi * i / N_samples
        # Normal of ellipse at angle theta: (cos(theta)/a, sin(theta)/b)
        nx = math.cos(theta) / a
        ny = math.sin(theta) / b
        # Normalize
        norm = math.sqrt(nx**2 + ny**2)
        nx /= norm
        ny /= norm
        
        # Boundary point
        xb = cx + a * math.cos(theta)
        yb = cy + b * math.sin(theta)
        
        # Inward point (along -N)
        xi = int(xb - nx * inward_d)
        yi = int(yb - ny * inward_d)
        
        if 0 <= xi < w and 0 <= yi < h:
            intensity = float(gray[yi, xi])
            M_matrix.append([nx, ny, 1.0])
            B_vector.append([intensity])
            
    # Least squares: M * v = B -> v = (M^T M)^-1 M^T B
    M_np = np.array(M_matrix)
    B_np = np.array(B_vector)
    
    if len(M_np) > 3:
        v, residuals, rank, s = np.linalg.lstsq(M_np, B_np, rcond=None)
        Lx = float(v[0][0])
        Ly = float(v[1][0])
        # Face angle
        face_angle = (np.rad2deg(np.arctan2(Ly, Lx)) + 360) % 360
    else:
        face_angle = 0.0

    # BACKGROUND: Still use Sobel gradients since we don't have 3D geometry of bg objects
    mag_threshold = np.percentile(magnitude, 70)
    strong_edges = magnitude > mag_threshold
    bg_valid = (bg_mask > 0) & strong_edges

    def get_dominant_angle(angles, valid_mask):
        valid_angles = angles[valid_mask]
        if len(valid_angles) == 0:
            return 0.0
        rads = np.deg2rad(valid_angles)
        sin_sum = np.sum(np.sin(rads))
        cos_sum = np.sum(np.cos(rads))
        mean_angle = np.rad2deg(np.arctan2(sin_sum, cos_sum))
        return (mean_angle + 360) % 360

    bg_angle = get_dominant_angle(angle, bg_valid)
    
    diff = abs(face_angle - bg_angle)
    if diff > 180:
        diff = 360 - diff

    results["face_light_angle"] = round(float(face_angle), 1)
    results["bg_light_angle"] = round(float(bg_angle), 1)
    results["angle_difference"] = round(float(diff), 1)

    # Scoring: > 45 degree diff is highly suspicious
    # We calibrate thresholds based on quality. Webcams (low quality) often have noisy background gradients.
    # Base thresholds are now more forgiving to prevent false positives.
    t1 = 75 * (1.0 / quality_multiplier)
    t2 = 50 * (1.0 / quality_multiplier)
    t3 = 25 * (1.0 / quality_multiplier)

    if diff > t1:
        results["lighting_anomaly_score"] = 0.90
    elif diff > t2:
        results["lighting_anomaly_score"] = 0.70
    elif diff > t3:
        results["lighting_anomaly_score"] = 0.40
    else:
        results["lighting_anomaly_score"] = 0.10

    # Visualization: draw arrows on the image
    vis_img = image_rgb.copy()
    vis_img = cv2.cvtColor(vis_img, cv2.COLOR_RGB2BGR)

    center_face = (int(x_min + box_w/2), int(y_min + box_h/2))
    center_bg = (int(w * 0.1), int(h * 0.1)) # top left corner for bg

    def draw_arrow(img, center, ang_deg, color, length=50):
        ang_rad = np.deg2rad(ang_deg)
        dx = int(length * np.cos(ang_rad))
        dy = int(length * np.sin(ang_rad))
        pt2 = (center[0] + dx, center[1] + dy)
        cv2.arrowedLine(img, center, pt2, color, 4, tipLength=0.3)
        return img

    vis_img = draw_arrow(vis_img, center_face, face_angle, (0, 0, 255), 80) # Red for face
    vis_img = draw_arrow(vis_img, center_bg, bg_angle, (255, 0, 0), 80)   # Blue for bg

    cv2.putText(vis_img, f"Face Dir", (center_face[0]-40, center_face[1]-20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    cv2.putText(vis_img, f"BG Dir", (center_bg[0]-10, center_bg[1]+20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

    os.makedirs(output_dir, exist_ok=True)
    map_path = os.path.join(output_dir, f"{prefix}_lighting_map.jpg")
    cv2.imwrite(map_path, vis_img)
    
    results["lighting_map_path"] = map_path.replace("\\", "/")
    
    return results
