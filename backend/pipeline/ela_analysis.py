"""
Error Level Analysis (ELA) for Deepfake Detection.

ELA works by re-saving the image at a known JPEG quality level,
then computing the difference between the original and re-saved version.
Regions that have been manipulated will show different compression 
artifacts compared to the rest of the image.

This technique is widely used in digital forensics to detect:
- Image splicing and compositing
- Face swapping regions
- Inpainting and retouching
"""

import numpy as np
import cv2
import os
import tempfile


def compute_ela(image_rgb, quality=90, scale=15, save_path=None):
    """
    Perform Error Level Analysis on an image.
    
    Args:
        image_rgb: Input image in RGB format (numpy array)
        quality: JPEG quality level for re-compression (0-100)
        scale: Amplification factor for the difference (higher = more visible)
        save_path: Optional path to save the ELA visualization
        
    Returns:
        ela_image: The amplified difference image (RGB)
        ela_score: Overall ELA score (0-1, higher = more manipulation suspected)
    """
    # Convert to BGR for OpenCV
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    
    # Save to a temporary JPEG with specified quality
    temp_path = os.path.join(tempfile.gettempdir(), "ela_temp.jpg")
    cv2.imwrite(temp_path, image_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    
    # Read back the re-compressed image
    recompressed = cv2.imread(temp_path)
    
    # Compute absolute difference
    diff = cv2.absdiff(image_bgr, recompressed)
    
    # Amplify the differences
    ela_image = diff * scale
    ela_image = np.clip(ela_image, 0, 255).astype(np.uint8)
    
    # Convert to RGB
    ela_rgb = cv2.cvtColor(ela_image, cv2.COLOR_BGR2RGB)
    
    # Compute ELA score based on variance of the difference
    # High variance in specific regions suggests manipulation
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    
    # Divide into blocks and compute local variance
    block_size = 32
    h, w = gray_diff.shape
    variances = []
    
    for y in range(0, h - block_size, block_size):
        for x in range(0, w - block_size, block_size):
            block = gray_diff[y:y+block_size, x:x+block_size]
            variances.append(np.var(block))
    
    if len(variances) > 0:
        variances = np.array(variances)
        # Coefficient of variation of block variances
        # Higher CV = more uneven compression = potential manipulation
        mean_var = np.mean(variances)
        std_var = np.std(variances)
        
        if mean_var > 0:
            cv_score = std_var / mean_var
        else:
            cv_score = 0
            
        # Normalize to 0-1 range (empirically determined thresholds)
        ela_score = min(1.0, cv_score / 3.0)
    else:
        ela_score = 0.0
    
    if save_path:
        cv2.imwrite(save_path, cv2.cvtColor(ela_rgb, cv2.COLOR_RGB2BGR))
    
    # Cleanup temp file
    try:
        os.remove(temp_path)
    except:
        pass
    
    return ela_rgb, float(ela_score)


def compute_ela_heatmap(image_rgb, quality=90, save_path=None):
    """
    Generate a color-coded ELA heatmap where bright/warm regions
    indicate areas with suspicious compression inconsistencies.
    """
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    
    temp_path = os.path.join(tempfile.gettempdir(), "ela_heatmap_temp.jpg")
    cv2.imwrite(temp_path, image_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    
    recompressed = cv2.imread(temp_path)
    diff = cv2.absdiff(image_bgr, recompressed)
    
    # Convert to grayscale and amplify
    gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    gray_amplified = np.clip(gray_diff * 20, 0, 255).astype(np.uint8)
    
    # Apply Gaussian blur for smoother heatmap
    gray_smooth = cv2.GaussianBlur(gray_amplified, (11, 11), 0)
    
    # Apply colormap
    heatmap = cv2.applyColorMap(gray_smooth, cv2.COLORMAP_JET)
    
    # Blend with original
    blended = cv2.addWeighted(image_bgr, 0.5, heatmap, 0.5, 0)
    
    if save_path:
        cv2.imwrite(save_path, blended)
    
    try:
        os.remove(temp_path)
    except:
        pass
    
    return blended

def compute_jpeg_ghosting(image_rgb, save_path=None):
    """
    Computes JPEG ghosting by measuring the variance of differences across multiple JPEG quality levels.
    """
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    qualities = [50, 65, 75, 85, 95]
    diffs = []
    
    for q in qualities:
        temp_path = os.path.join(tempfile.gettempdir(), f"ghost_temp_{q}.jpg")
        cv2.imwrite(temp_path, image_bgr, [cv2.IMWRITE_JPEG_QUALITY, q])
        recompressed = cv2.imread(temp_path)
        diff = cv2.absdiff(image_bgr, recompressed)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        diffs.append(gray_diff)
        try:
            os.remove(temp_path)
        except:
            pass
            
    stack = np.stack(diffs, axis=-1)
    variance_map = np.var(stack, axis=-1)
    
    ghost_map_norm = cv2.normalize(variance_map, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    ghost_smooth = cv2.GaussianBlur(ghost_map_norm, (5, 5), 0)
    ghost_colored = cv2.applyColorMap(ghost_smooth, cv2.COLORMAP_INFERNO)
    
    ghost_variance = float(np.var(ghost_smooth) / 255.0)
    
    if save_path:
        cv2.imwrite(save_path, ghost_colored)
        
    return ghost_colored, ghost_variance


def compute_hsv_ela(image_rgb, quality=90, save_path=None):
    """
    Computes ELA on the HSV Saturation channel to detect chrominance blending anomalies.
    """
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    temp_path = os.path.join(tempfile.gettempdir(), "hsv_ela_temp.jpg")
    cv2.imwrite(temp_path, image_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    
    recompressed = cv2.imread(temp_path)
    hsv_recomp = cv2.cvtColor(recompressed, cv2.COLOR_BGR2HSV)
    
    try:
        os.remove(temp_path)
    except:
        pass
        
    s_diff = cv2.absdiff(hsv[:,:,1], hsv_recomp[:,:,1])
    s_amp = np.clip(s_diff * 15, 0, 255).astype(np.uint8)
    hsv_colored = cv2.applyColorMap(s_amp, cv2.COLORMAP_TURBO)
    
    s_variance = float(np.var(s_amp) / 255.0)
    
    if save_path:
        cv2.imwrite(save_path, hsv_colored)
        
    return hsv_colored, s_variance
def analyze_ela(image_rgb, output_dir, prefix="ela"):
    """
    Run full ELA analysis on an image.
    Returns a dict with metrics and visualization paths.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Standard ELA
    ela_path = os.path.join(output_dir, f"{prefix}_analysis.jpg")
    ela_rgb, base_ela_score = compute_ela(image_rgb, save_path=ela_path)
    
    # ELA heatmap overlay
    heatmap_path = os.path.join(output_dir, f"{prefix}_heatmap.jpg")
    compute_ela_heatmap(image_rgb, save_path=heatmap_path)
    
    # Ghosting Map
    ghosting_path = os.path.join(output_dir, f"{prefix}_ghosting.jpg")
    _, ghost_var = compute_jpeg_ghosting(image_rgb, save_path=ghosting_path)
    
    # HSV ELA Map
    hsv_ela_path = os.path.join(output_dir, f"{prefix}_hsv.jpg")
    _, hsv_var = compute_hsv_ela(image_rgb, save_path=hsv_ela_path)
    
    # =========================================================
    # NEW FEATURE: Edge-Aware Smooth Region Anomaly
    # =========================================================
    # Standard ELA naturally lights up on sharp edges (text, outlines).
    # A true manipulation often shows high ELA in smooth regions (like skin/background).
    image_gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(image_gray, 50, 150)
    # Dilate edges to create a thick mask
    edge_mask = cv2.dilate(edges, np.ones((5, 5), np.uint8), iterations=1)
    smooth_mask = cv2.bitwise_not(edge_mask)
    
    # Extract the ELA intensity from the standard ELA result, converted to grayscale
    ela_gray = cv2.cvtColor(ela_rgb, cv2.COLOR_RGB2GRAY)
    ela_in_smooth = cv2.bitwise_and(ela_gray, ela_gray, mask=smooth_mask)
    
    # If the max/mean ELA in smooth regions is high, it's very suspicious
    smooth_mean = float(np.mean(ela_in_smooth[smooth_mask > 0])) if np.any(smooth_mask > 0) else 0.0
    smooth_max = float(np.max(ela_in_smooth)) if np.any(smooth_mask > 0) else 0.0
    
    edge_anomaly_score = min(1.0, smooth_mean / 15.0) # Heuristic scaling
    
    # Final ensemble ELA score
    final_ela_score = (base_ela_score * 0.4) + (edge_anomaly_score * 0.3) + (min(1.0, ghost_var/30.0) * 0.2) + (min(1.0, hsv_var/40.0) * 0.1)
    
    # Interpret the score
    if final_ela_score > 0.6:
        interpretation = "High compression inconsistency detected (Smooth Region Anomaly) - strong indicator of splicing/compositing."
    elif final_ela_score > 0.3:
        interpretation = "Moderate compression variations found - potential minor retouching or re-saving."
    else:
        interpretation = "Compression levels appear uniform - consistent with an unmodified single-source image."
        
    # Generate Verdicts
    verdicts = {}
    
    # Standard ELA Verdict
    if base_ela_score > 0.4:
        verdicts['standard'] = {"status": "FAIL", "reason": f"High global block variance ({base_ela_score:.2f})"}
    elif base_ela_score > 0.15:
        verdicts['standard'] = {"status": "WARNING", "reason": f"Moderate compression variance ({base_ela_score:.2f})"}
    else:
        verdicts['standard'] = {"status": "PASS", "reason": "Uniform baseline compression"}

    # Ghosting Verdict
    if ghost_var > 15.0:
        verdicts['ghosting'] = {"status": "FAIL", "reason": f"Extreme localized variance jumps ({ghost_var:.1f})"}
    elif ghost_var > 5.0:
        verdicts['ghosting'] = {"status": "WARNING", "reason": f"Minor compression ghosts ({ghost_var:.1f})"}
    else:
        verdicts['ghosting'] = {"status": "PASS", "reason": "No compression ghosts found"}

    # HSV ELA Verdict
    if hsv_var > 20.0:
        verdicts['hsv'] = {"status": "FAIL", "reason": f"Saturation chrominance mismatch ({hsv_var:.1f})"}
    elif hsv_var > 10.0:
        verdicts['hsv'] = {"status": "WARNING", "reason": f"Elevated saturation variance ({hsv_var:.1f})"}
    else:
        verdicts['hsv'] = {"status": "PASS", "reason": "Natural chrominance integration"}

    # Smooth Region Anomaly Verdict
    if edge_anomaly_score > 0.5:
        verdicts['smooth'] = {"status": "FAIL", "reason": f"Artifacts present in smooth areas ({edge_anomaly_score:.2f})"}
    elif edge_anomaly_score > 0.2:
        verdicts['smooth'] = {"status": "WARNING", "reason": f"Slight smooth-area noise ({edge_anomaly_score:.2f})"}
    else:
        verdicts['smooth'] = {"status": "PASS", "reason": "Smooth areas cleanly compressed"}
    
    return {
        "ela_image_path": ela_path.replace("\\", "/"),
        "ela_heatmap_path": heatmap_path.replace("\\", "/"),
        "ghosting_path": ghosting_path.replace("\\", "/"),
        "hsv_ela_path": hsv_ela_path.replace("\\", "/"),
        "ela_score": round(final_ela_score, 4),
        "ela_base_variance": round(base_ela_score, 4),
        "ela_smooth_anomaly": round(edge_anomaly_score, 4),
        "ghost_variance": round(ghost_var, 4),
        "hsv_variance": round(hsv_var, 4),
        "smooth_mean_intensity": round(smooth_mean, 2),
        "ela_interpretation": interpretation,
        "verdicts": verdicts
    }
