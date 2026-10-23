import numpy as np
import cv2
import os
from pipeline.image_utils import save_optimized_image

def analyze_chrominance(image_rgb, output_dir, prefix="color", quality_multiplier=1.0):
    """
    Analyzes the image across multiple color spaces: YCbCr, HSV, and LAB.
    These whole-image statistics describe color diversity, not skin physiology.
    """
    if (min(image_rgb.shape[:2]) < 8 or not np.any(np.ptp(image_rgb, axis=(0, 1)))
            or np.ptp(image_rgb, axis=2).max() == 0
            or not np.isfinite(quality_multiplier) or quality_multiplier <= 0):
        return {"color_anomaly_score": 0.5, "available": False, "score_kind": "heuristic", "score_calibrated": False,
                "warnings": ["Insufficient color/spatial variation, image size, or valid quality factor for chrominance analysis."]}
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. YCrCb Analysis (Standard Chrominance)
    ycrcb = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    
    # Visualizations for Cb and Cr
    constant_y = np.full_like(y, 128)
    cb_vis = cv2.merge([constant_y, np.full_like(cr, 128), cb])
    cb_vis_rgb = cv2.cvtColor(cb_vis, cv2.COLOR_YCrCb2RGB)
    cr_vis = cv2.merge([constant_y, cr, np.full_like(cb, 128)])
    cr_vis_rgb = cv2.cvtColor(cr_vis, cv2.COLOR_YCrCb2RGB)
    
    cb_path = os.path.join(output_dir, f"{prefix}_cb_map.jpg")
    cr_path = os.path.join(output_dir, f"{prefix}_cr_map.jpg")
    
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    blended_cb = cv2.addWeighted(image_bgr, 0.4, cv2.cvtColor(cb_vis_rgb, cv2.COLOR_RGB2BGR), 0.8, 0)
    blended_cr = cv2.addWeighted(image_bgr, 0.4, cv2.cvtColor(cr_vis_rgb, cv2.COLOR_RGB2BGR), 0.8, 0)
    
    save_optimized_image(cb_path, blended_cb)
    save_optimized_image(cr_path, blended_cr)
    
    # 2. HSV Analysis (Saturation/Vibrancy Variance)
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv)
    
    # Create Saturation heatmap (Viridis colormap)
    s_vis = cv2.applyColorMap(s, cv2.COLORMAP_VIRIDIS)
    blended_s = cv2.addWeighted(image_bgr, 0.4, s_vis, 0.8, 0)
    s_path = os.path.join(output_dir, f"{prefix}_s_map.jpg")
    save_optimized_image(s_path, blended_s)
    
    # 3. LAB Analysis (Skin Subsurface Scattering)
    lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    # Create a* (Red/Green) heatmap (Plasma colormap to highlight blood flow)
    a_vis = cv2.applyColorMap(a, cv2.COLORMAP_PLASMA)
    blended_a = cv2.addWeighted(image_bgr, 0.4, a_vis, 0.8, 0)
    a_path = os.path.join(output_dir, f"{prefix}_a_map.jpg")
    save_optimized_image(a_path, blended_a)
    
    # Calculate variances across all critical non-luma channels
    cb_var = np.var(cb)
    cr_var = np.var(cr)
    h_var = np.var(h)
    # OpenCV hue is circular on [0, 180); 0 and 179 are adjacent reds.
    # Retain h_variance for older reports; expose the meaningful circular metric.
    valid_hue = h[s > 0].astype(np.float64) * (2 * np.pi / 180.0)
    hue_circular_variance = float(np.clip(1 - np.abs(np.mean(np.exp(1j * valid_hue))), 0, 1))
    s_var = np.var(s)
    a_var = np.var(a)
    b_var = np.var(b)
    
    # Score calculation (Heuristic based on multi-space blending)
    # Deepfakes often have highly suppressed variance (flat skin tones).
    # Normal camera captures varied skin tones in S (saturation) and a* (redness/blood).
    anomaly_factors = 0
    t_cbcr = 10.0 * quality_multiplier
    t_s = 15.0 * quality_multiplier
    t_a = 5.0 * quality_multiplier
    
    if cb_var < t_cbcr: anomaly_factors += 1
    if cr_var < t_cbcr: anomaly_factors += 1
    if s_var < t_s: anomaly_factors += 1
    if a_var < t_a: anomaly_factors += 1 # a* channel is usually highly textured in real skin
    
    if anomaly_factors >= 3:
        color_score = 0.85 # Highly suspicious (flat colors across multiple spaces)
    elif anomaly_factors >= 1:
        color_score = 0.60 # Suspected
    else:
        color_score = 0.15 # Natural color variance
        
    return {
        "cb_map_path": cb_path.replace("\\", "/"),
        "cr_map_path": cr_path.replace("\\", "/"),
        "s_map_path": s_path.replace("\\", "/"),
        "a_map_path": a_path.replace("\\", "/"),
        "cb_variance": round(float(cb_var), 4),
        "cr_variance": round(float(cr_var), 4),
        "h_variance": round(float(h_var), 4),
        "h_circular_variance": round(hue_circular_variance, 6),
        "s_variance": round(float(s_var), 4),
        "a_variance": round(float(a_var), 4),
        "b_variance": round(float(b_var), 4),
        "color_anomaly_score": color_score,
        "available": True,
        "score_kind": "heuristic", "score_calibrated": False,
        "explanation": {
            "what_happened": "Measured whole-image chrominance variance across YCbCr, HSV, and LAB color spaces.",
            "result": "Lower Whole-Image Color Variation" if color_score > 0.5 else "Higher Whole-Image Color Variation",
            "why_it_happened": "Low color variance crosses the heuristic thresholds. Image content, grading, and compression can also cause this." if color_score > 0.5 else "Color variance is within the heuristic range; these channels alone do not establish authenticity or blood flow.",
            "variables": {
                "Cb/Cr Variance": f"Cb: {cb_var:.1f} / Cr: {cr_var:.1f}",
                "Saturation Variance": f"{s_var:.1f}",
                "a* (Redness) Variance": f"{a_var:.1f}",
                "Threshold Factor": f"{anomaly_factors}/4 channels failed"
            }
        }
    }
