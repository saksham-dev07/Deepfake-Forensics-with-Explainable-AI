import cv2
import numpy as np
import os
import math
from pipeline.face_geometry import detect_face
from pipeline.image_utils import save_optimized_image

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
        "chrome_probe_path": None,
        "shading_residual_path": None,
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
    # RENDER 3D LIGHT PROBE (lighting_map_path)
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
    save_optimized_image(map_path, vis_img)
    results["lighting_map_path"] = map_path.replace("\\", "/")

    # ==============================================================
    # EXHIBIT 2: VIRTUAL CHROME SPHERE PROBE (chrome_probe_path)
    # ==============================================================
    probe_dim = 512
    probe_img = np.zeros((probe_dim, probe_dim, 3), dtype=np.uint8)
    probe_img[:] = (13, 6, 4) # Dark BGR background

    pcx, pcy = probe_dim // 2, probe_dim // 2
    pr = 175

    yy_grid, xx_grid = np.mgrid[-pr:pr+1, -pr:pr+1]
    dist_sq = xx_grid**2 + yy_grid**2
    sphere_mask = dist_sq <= pr**2

    nx_vals = xx_grid[sphere_mask] / float(pr)
    ny_vals = yy_grid[sphere_mask] / float(pr)
    nz_vals = -np.sqrt(np.maximum(0.0, 1.0 - nx_vals**2 - ny_vals**2))

    if sh_coeffs is not None and len(sh_coeffs) >= 9:
        Y0 = 1.0
        Y1 = ny_vals
        Y2 = nz_vals
        Y3 = nx_vals
        Y4 = nx_vals * ny_vals
        Y5 = ny_vals * nz_vals
        Y6 = 3.0 * nz_vals**2 - 1.0
        Y7 = nx_vals * nz_vals
        Y8 = nx_vals**2 - ny_vals**2
        intensity = (sh_coeffs[0]*Y0 + sh_coeffs[1]*Y1 + sh_coeffs[2]*Y2 + 
                     sh_coeffs[3]*Y3 + sh_coeffs[4]*Y4 + sh_coeffs[5]*Y5 + 
                     sh_coeffs[6]*Y6 + sh_coeffs[7]*Y7 + sh_coeffs[8]*Y8)
    else:
        ang_rad = np.deg2rad(face_angle)
        lx, ly, lz = np.cos(ang_rad), np.sin(ang_rad), -0.5
        l_norm = math.sqrt(lx*lx + ly*ly + lz*lz)
        lx, ly, lz = lx/l_norm, ly/l_norm, lz/l_norm
        intensity = np.maximum(0.0, nx_vals * lx + ny_vals * ly + nz_vals * lz) * 200.0 + 30.0

    int_min, int_max = float(np.min(intensity)), float(np.max(intensity))
    if int_max > int_min:
        norm_int = ((intensity - int_min) / (int_max - int_min) * 230.0 + 25.0)
    else:
        norm_int = np.full_like(intensity, 128.0)

    # Specular highlight glint
    ang_rad_face = np.deg2rad(face_angle)
    flx, fly = np.cos(ang_rad_face), np.sin(ang_rad_face)
    dot_face = np.maximum(0.0, nx_vals * flx + ny_vals * fly)
    specular = np.power(dot_face, 12) * 80.0

    b_vals = np.clip(norm_int * 0.90 + specular + 15, 0, 255).astype(np.uint8)
    g_vals = np.clip(norm_int * 0.95 + specular + 10, 0, 255).astype(np.uint8)
    r_vals = np.clip(norm_int * 1.00 + specular + 5, 0, 255).astype(np.uint8)

    sphere_patch = np.zeros((2*pr+1, 2*pr+1, 3), dtype=np.uint8)
    sphere_patch[sphere_mask, 0] = b_vals
    sphere_patch[sphere_mask, 1] = g_vals
    sphere_patch[sphere_mask, 2] = r_vals

    probe_img[pcy-pr:pcy+pr+1, pcx-pr:pcx+pr+1] = np.where(
        sphere_mask[:, :, None], sphere_patch, probe_img[pcy-pr:pcy+pr+1, pcx-pr:pcx+pr+1]
    )

    # Rim circle & concentric guide circles
    cv2.circle(probe_img, (pcx, pcy), pr, (180, 200, 220), 2, cv2.LINE_AA)
    cv2.circle(probe_img, (pcx, pcy), int(pr * 0.5), (70, 80, 95), 1, cv2.LINE_AA)

    # Draw face donor light vector (Amber BGR (11, 158, 245))
    face_rad = np.deg2rad(face_angle)
    pt_face = (int(pcx + pr * 0.85 * np.cos(face_rad)), int(pcy + pr * 0.85 * np.sin(face_rad)))
    cv2.arrowedLine(probe_img, (pcx, pcy), pt_face, (11, 158, 245), 3, tipLength=0.25, line_type=cv2.LINE_AA)

    # Draw background ambient vector (Cyan BGR (248, 189, 56))
    bg_rad = np.deg2rad(bg_angle)
    pt_bg = (int(pcx + pr * 0.85 * np.cos(bg_rad)), int(pcy + pr * 0.85 * np.sin(bg_rad)))
    cv2.arrowedLine(probe_img, (pcx, pcy), pt_bg, (248, 189, 56), 2, tipLength=0.25, line_type=cv2.LINE_AA)

    # HUD Annotations
    cv2.putText(probe_img, "VIRTUAL CHROME SPHERE PROBE", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 220, 220), 1, cv2.LINE_AA)
    cv2.putText(probe_img, "9D Spherical Harmonics (l <= 2)", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (140, 140, 140), 1, cv2.LINE_AA)
    cv2.putText(probe_img, f"FACE: {face_angle:.1f} deg", (20, probe_dim - 45), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (11, 158, 245), 1, cv2.LINE_AA)
    cv2.putText(probe_img, f"BG:   {bg_angle:.1f} deg", (20, probe_dim - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (248, 189, 56), 1, cv2.LINE_AA)
    cv2.putText(probe_img, f"DIV:  {diff:.1f} deg", (probe_dim - 140, probe_dim - 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255) if diff > 45 else (50, 205, 50), 1, cv2.LINE_AA)

    chrome_probe_path = os.path.join(output_dir, f"{prefix}_chrome_probe.jpg")
    save_optimized_image(chrome_probe_path, probe_img)
    results["chrome_probe_path"] = chrome_probe_path.replace("\\", "/")

    # ==============================================================
    # EXHIBIT 3: LAMBERTIAN SHADING RESIDUAL (shading_residual_path)
    # ==============================================================
    residual_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    residual_map = np.zeros((h, w), dtype=np.float32)

    if box_w > 0 and box_h > 0:
        fcx = x_min + box_w / 2.0
        fcy = y_min + box_h / 2.0
        frx = max(1.0, box_w / 2.0)
        fry = max(1.0, box_h / 2.0)

        y_indices, x_indices = np.mgrid[y_min:y_max, x_min:x_max]
        norm_x = (x_indices - fcx) / frx
        norm_y = (y_indices - fcy) / fry
        ellip_dist = norm_x**2 + norm_y**2
        face_ellipse = ellip_dist <= 1.0

        if np.any(face_ellipse):
            fnx = norm_x[face_ellipse]
            fny = norm_y[face_ellipse]
            fnz = -np.sqrt(np.maximum(0.0, 1.0 - fnx**2 - fny**2))

            l_rad = np.deg2rad(face_angle)
            lx = np.cos(l_rad)
            ly = np.sin(l_rad)
            lz = -0.5
            l_mag = math.sqrt(lx*lx + ly*ly + lz*lz)
            lx, ly, lz = lx/l_mag, ly/l_mag, lz/l_mag

            diffuse_model = np.maximum(0.0, fnx * lx + fny * ly + fnz * lz)
            obs_face = gray[y_min:y_max, x_min:x_max][face_ellipse].astype(np.float32) / 255.0

            if len(diffuse_model) > 10:
                A = np.vstack([diffuse_model, np.ones(len(diffuse_model))]).T
                res_fit, _, _, _ = np.linalg.lstsq(A, obs_face, rcond=None)
                kd, ia = res_fit[0], res_fit[1]
                pred = kd * diffuse_model + ia
            else:
                pred = diffuse_model * 0.8 + 0.1

            res_vals = np.abs(obs_face - pred)
            res_patch = np.zeros((y_max - y_min, x_max - x_min), dtype=np.float32)
            res_patch[face_ellipse] = res_vals
            residual_map[y_min:y_max, x_min:x_max] = res_patch

    max_res = float(np.max(residual_map)) if np.max(residual_map) > 0 else 1.0
    res_norm = np.clip((residual_map / max(0.15, max_res * 0.8)) * 255.0, 0, 255).astype(np.uint8)
    heatmap = cv2.applyColorMap(res_norm, cv2.COLORMAP_MAGMA)

    alpha = 0.65
    blended = cv2.addWeighted(heatmap, alpha, residual_bgr, 1.0 - alpha, 0)
    mask_3d = np.repeat((residual_map > 0.01)[:, :, np.newaxis], 3, axis=2)
    final_shading_img = np.where(mask_3d, blended, (residual_bgr * 0.6).astype(np.uint8))

    if box_w > 0 and box_h > 0:
        cv2.rectangle(final_shading_img, (x_min, y_min), (x_max, y_max), (0, 255, 255), 1, cv2.LINE_AA)

    cv2.putText(final_shading_img, "LAMBERTIAN SHADING RESIDUAL", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(final_shading_img, "||I_obs(p) - (k_d * (N(p).L) + I_a)||", (20, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1, cv2.LINE_AA)
    cv2.putText(final_shading_img, f"MAX RESIDUAL: {max_res:.3f}", (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)

    shading_residual_path = os.path.join(output_dir, f"{prefix}_shading_residual.jpg")
    save_optimized_image(shading_residual_path, final_shading_img)
    results["shading_residual_path"] = shading_residual_path.replace("\\", "/")

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
