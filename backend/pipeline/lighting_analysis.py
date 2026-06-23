import cv2
import numpy as np
import os
import math
from pipeline.face_geometry import detect_face

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
    
    # WEBCAM NOISE FIX: Illumination is a low-frequency signal.
    # We apply a massive Gaussian Blur to completely destroy ISO grain
    # and webcam noise, leaving only the pure global illumination gradients.
    blur_size = int(max(5, min(w, h) * 0.05)) | 1 # Ensure odd number
    gray_smooth = cv2.GaussianBlur(gray, (blur_size, blur_size), 0)
    
    # Calculate gradients on the smoothed image
    grad_x = cv2.Sobel(gray_smooth, cv2.CV_64F, 1, 0, ksize=5)
    grad_y = cv2.Sobel(gray_smooth, cv2.CV_64F, 0, 1, ksize=5)
    
    magnitude = cv2.magnitude(grad_x, grad_y)
    angle = cv2.phase(grad_x, grad_y, angleInDegrees=True)

    # Face detection
    landmarks = detect_face(image_rgb)
    
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

    # ==============================================================
    # 3D SPHERICAL HARMONIC LIGHTING ESTIMATION (SHLE)
    # ==============================================================
    # Instead of 2D gradients, we use the true 3D topography of the face
    # to reconstruct a 9-coefficient Spherical Harmonic environment map.

    M_matrix = []
    B_vector = []
    
    if landmarks is not None and "all_landmarks_3d" in landmarks:
        points_3d = landmarks["all_landmarks_3d"]
        xs = [p[0] for p in points_3d]
        ys = [p[1] for p in points_3d]
        zs = [p[2] for p in points_3d]
        
        # Approximate center of the head sphere
        cx = np.mean(xs)
        cy = np.mean(ys)
        cz = np.mean(zs) + (box_w / 2.0) # Push center deep into the skull (MediaPipe Z is negative towards camera)
        
        for p in points_3d:
            px, py, pz = p
            
            # Surface normal pointing outward
            nx = px - cx
            ny = py - cy
            nz = pz - cz
            
            norm = math.sqrt(nx**2 + ny**2 + nz**2)
            if norm == 0: continue
            nx /= norm
            ny /= norm
            nz /= norm
            
            # Ensure pixel is inside image
            iy, ix = int(py), int(px)
            if 0 <= ix < w and 0 <= iy < h:
                intensity = float(gray_smooth[iy, ix])
                
                # Evaluate the 9 Spherical Harmonic basis functions for this normal
                Y0 = 1.0
                Y1 = ny
                Y2 = nz
                Y3 = nx
                Y4 = nx * ny
                Y5 = ny * nz
                Y6 = 3.0 * nz**2 - 1.0
                Y7 = nx * nz
                Y8 = nx**2 - ny**2
                
                M_matrix.append([Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7, Y8])
                B_vector.append([intensity])
                
    # Solve Least Squares for SH coefficients
    M_np = np.array(M_matrix)
    B_np = np.array(B_vector)
    
    sh_coeffs = None
    face_angle = 0.0
    
    if len(M_np) > 9:
        v, residuals, rank, s = np.linalg.lstsq(M_np, B_np, rcond=None)
        sh_coeffs = v.flatten()
        
        # The primary light direction can be approximated by the 1st order bands (Y1, Y2, Y3)
        # Y1 is Y, Y2 is Z, Y3 is X
        Lx = float(sh_coeffs[3])
        Ly = float(sh_coeffs[1])
        face_angle = (np.rad2deg(np.arctan2(Ly, Lx)) + 360) % 360
    else:
        results["warnings"].append("Could not solve 3D Spherical Harmonics.")

    # BACKGROUND: Use robust Sobel gradients
    bg_mask = cv2.bitwise_not(face_mask)
    mag_threshold = np.percentile(magnitude, 70)
    strong_edges = magnitude > mag_threshold
    bg_valid = (bg_mask > 0) & strong_edges

    def get_dominant_angle_and_variance(angles, valid_mask):
        valid_angles = angles[valid_mask]
        if len(valid_angles) == 0:
            return 0.0, 1.0
        rads = np.deg2rad(valid_angles)
        sin_sum = np.sum(np.sin(rads))
        cos_sum = np.sum(np.cos(rads))
        mean_angle = np.rad2deg(np.arctan2(sin_sum, cos_sum))
        
        R = np.sqrt(sin_sum**2 + cos_sum**2) / max(1, len(valid_angles))
        circular_variance = 1.0 - R
        
        return (mean_angle + 360) % 360, circular_variance

    bg_angle, bg_variance = get_dominant_angle_and_variance(angle, bg_valid)
    
    diff = abs(face_angle - bg_angle)
    if diff > 180:
        diff = 360 - diff

    results["face_light_angle"] = round(float(face_angle), 1)
    results["bg_light_angle"] = round(float(bg_angle), 1)
    results["angle_difference"] = round(float(diff), 1)

    t1 = 75 * (1.0 / quality_multiplier)
    t2 = 50 * (1.0 / quality_multiplier)
    t3 = 25 * (1.0 / quality_multiplier)

    if diff > t1:
        base_score = 0.90
    elif diff > t2:
        base_score = 0.70
    elif diff > t3:
        base_score = 0.40
    else:
        base_score = 0.10

    # DISOUNT TEXTURED BACKGROUNDS: 
    # If the background has high circular variance (e.g. curtains, bookshelves), 
    # the 2D gradient angle is meaningless texture noise, not lighting.
    # We heavily discount the anomaly score to prevent false positives.
    confidence = 1.0
    if bg_variance > 0.5:
        confidence = max(0.1, 1.0 - ((bg_variance - 0.5) * 2.0))
        results["warnings"].append(f"Textured background detected (Var: {bg_variance:.2f}). Reducing lighting confidence.")
        
    results["lighting_anomaly_score"] = max(0.10, base_score * confidence)

    # ==============================================================
    # RENDER 3D LIGHT PROBE
    # ==============================================================
    vis_img = image_rgb.copy()
    vis_img = cv2.cvtColor(vis_img, cv2.COLOR_RGB2BGR)

    if sh_coeffs is not None:
        probe_radius = max(40, int(min(w, h) * 0.1))
        # Place probe in top right corner
        pcx, pcy = w - probe_radius - 20, probe_radius + 20
        
        # Draw a dark background for the probe
        cv2.circle(vis_img, (pcx, pcy), probe_radius + 4, (0, 0, 0), -1)
        
        # Render the sphere pixel by pixel
        for y in range(-probe_radius, probe_radius):
            for x in range(-probe_radius, probe_radius):
                if x**2 + y**2 <= probe_radius**2:
                    # Calculate z coordinate of sphere
                    z = -math.sqrt(probe_radius**2 - x**2 - y**2)
                    
                    # Normal vector
                    nx = x / probe_radius
                    ny = y / probe_radius
                    nz = z / probe_radius
                    
                    # Evaluate SH
                    Y0 = 1.0
                    Y1 = ny
                    Y2 = nz
                    Y3 = nx
                    Y4 = nx * ny
                    Y5 = ny * nz
                    Y6 = 3.0 * nz**2 - 1.0
                    Y7 = nx * nz
                    Y8 = nx**2 - ny**2
                    
                    # Dot product with coefficients
                    intensity = (sh_coeffs[0]*Y0 + sh_coeffs[1]*Y1 + sh_coeffs[2]*Y2 + 
                                 sh_coeffs[3]*Y3 + sh_coeffs[4]*Y4 + sh_coeffs[5]*Y5 + 
                                 sh_coeffs[6]*Y6 + sh_coeffs[7]*Y7 + sh_coeffs[8]*Y8)
                    
                    # Clip and convert to BGR
                    val = int(max(0, min(255, intensity)))
                    
                    # Give it a slight metallic blue-gold tint based on lighting
                    b = min(255, int(val * 0.9))
                    g = min(255, int(val * 0.95))
                    r = min(255, int(val * 1.0))
                    
                    vis_img[pcy + y, pcx + x] = (b, g, r)
                    
        # Add a glossy rim light to the probe
        cv2.circle(vis_img, (pcx, pcy), probe_radius, (255, 255, 255), 1, cv2.LINE_AA)
        cv2.putText(vis_img, "3D Light Probe", (pcx - 50, pcy + probe_radius + 20), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

    # Draw 2D Directional Arrows for context
    center_face = (int(x_min + box_w/2), int(y_min + box_h/2))
    center_bg = (int(w * 0.1), int(h * 0.1)) 

    def draw_arrow(img, center, ang_deg, color, length=50):
        ang_rad = np.deg2rad(ang_deg)
        dx = int(length * np.cos(ang_rad))
        dy = int(length * np.sin(ang_rad))
        pt2 = (center[0] + dx, center[1] + dy)
        
        # Shadow for visibility
        cv2.arrowedLine(img, center, pt2, (0,0,0), 6, tipLength=0.3)
        cv2.arrowedLine(img, center, pt2, color, 3, tipLength=0.3)
        return img

    vis_img = draw_arrow(vis_img, center_face, face_angle, (50, 50, 255), 80) # Red for face
    vis_img = draw_arrow(vis_img, center_bg, bg_angle, (255, 100, 50), 80)   # Blue for bg

    cv2.putText(vis_img, f"Face Lighting Angle: {int(face_angle)}", (10, h - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 255), 2)
    cv2.putText(vis_img, f"BG Lighting Angle: {int(bg_angle)}", (10, h - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 100, 50), 2)

    os.makedirs(output_dir, exist_ok=True)
    map_path = os.path.join(output_dir, f"{prefix}_lighting_map.jpg")
    cv2.imwrite(map_path, vis_img)
    
    results["lighting_map_path"] = map_path.replace("\\", "/")
    
    results["explanation"] = {
        "what_happened": "Reconstructed a 3D Spherical Harmonic environment map of the face and compared its light source angle to the background's 2D lighting gradients.",
        "result": "Lighting Mismatch (Deepfake)" if results["lighting_anomaly_score"] > 0.5 else "Consistent Global Illumination",
        "why_it_happened": "The light hitting the person's face comes from a completely different angle than the light in the background room, proving the face was spliced in." if results["lighting_anomaly_score"] > 0.5 else "The 3D lighting on the face perfectly matches the environmental light source in the background.",
        "variables": {
            "Face Light Angle": f"{face_angle:.1f}°",
            "Background Light Angle": f"{bg_angle:.1f}°",
            "Angle Difference": f"{diff:.1f}°",
            "Background Texture Variance": f"{bg_variance:.2f}"
        }
    }
    
    return results
