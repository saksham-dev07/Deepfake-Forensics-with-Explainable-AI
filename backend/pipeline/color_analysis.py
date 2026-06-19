import numpy as np
import cv2
import os

def analyze_chrominance(image_rgb, output_dir, prefix="color", quality_multiplier=1.0):
    """
    Analyzes the image across multiple color spaces: YCbCr, HSV, and LAB.
    Deepfake generative models often struggle to properly reproduce 
    the complex micro-coloration of human skin (subsurface scattering)
    across diverse spectral representations.
    """
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
    
    cv2.imwrite(cb_path, blended_cb)
    cv2.imwrite(cr_path, blended_cr)
    
    # 2. HSV Analysis (Saturation/Vibrancy Variance)
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    h, s, v = cv2.split(hsv)
    
    # Create Saturation heatmap (Viridis colormap)
    s_vis = cv2.applyColorMap(s, cv2.COLORMAP_VIRIDIS)
    blended_s = cv2.addWeighted(image_bgr, 0.4, s_vis, 0.8, 0)
    s_path = os.path.join(output_dir, f"{prefix}_s_map.jpg")
    cv2.imwrite(s_path, blended_s)
    
    # 3. LAB Analysis (Skin Subsurface Scattering)
    lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    # Create a* (Red/Green) heatmap (Plasma colormap to highlight blood flow)
    a_vis = cv2.applyColorMap(a, cv2.COLORMAP_PLASMA)
    blended_a = cv2.addWeighted(image_bgr, 0.4, a_vis, 0.8, 0)
    a_path = os.path.join(output_dir, f"{prefix}_a_map.jpg")
    cv2.imwrite(a_path, blended_a)
    
    # Calculate variances across all critical non-luma channels
    cb_var = np.var(cb)
    cr_var = np.var(cr)
    h_var = np.var(h)
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
        "s_variance": round(float(s_var), 4),
        "a_variance": round(float(a_var), 4),
        "b_variance": round(float(b_var), 4),
        "color_anomaly_score": color_score
    }
