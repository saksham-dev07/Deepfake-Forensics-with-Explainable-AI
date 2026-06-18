import numpy as np
import cv2
import os

def extract_noise_residual(image_rgb):
    """
    Extracts the pure Photo Response Non-Uniformity (PRNU) noise residual.
    Uses Non-Local Means (NLM) denoising to create an edge-preserved clean image,
    and subtracts it from the original to isolate pure sensor noise.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Apply edge-preserving NLM Denoising to simulate a clean image.
    clean_img = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
    
    # Extract the high-frequency PRNU noise residual
    noise = cv2.subtract(gray, clean_img)
    
    return noise, clean_img

def extract_srm_noise(image_rgb):
    """
    Applies a Spatial Rich Model (SRM) High-Pass Filter.
    This suppresses image content and exposes low-level pixel manipulation
    and blending artifacts common in deepfakes.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    gray_float = np.float32(gray)
    
    # Standard SRM high-pass filter kernel
    srm_kernel = np.array([
        [-1,  2, -1],
        [ 2, -4,  2],
        [-1,  2, -1]
    ], dtype=np.float32) / 4.0
    
    # Apply 2D spatial convolution
    srm_noise = cv2.filter2D(gray_float, -1, srm_kernel)
    
    # Take absolute value to represent noise magnitude
    srm_noise = np.abs(srm_noise)
    
    return srm_noise

def analyze_sensor_noise(image_rgb, output_dir, prefix="noise", quality_multiplier=1.0):
    """
    Analyzes the sensor noise (PRNU consistency) of the image.
    Deepfakes often exhibit unnatural smoothness or mismatched noise prints
    where the synthetic face was blended into the real background.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    noise, clean_img = extract_noise_residual(image_rgb)
    
    # Save the edge-preserving denoised image
    denoised_path = os.path.join(output_dir, f"{prefix}_denoised.jpg")
    cv2.imwrite(denoised_path, clean_img)
    
    # Amplify the noise for visualization
    # We use cv2.COLORMAP_JET to vividly highlight the low/high variance areas
    noise_vis = cv2.normalize(noise, None, 0, 255, cv2.NORM_MINMAX)
    noise_vis = cv2.applyColorMap(noise_vis, cv2.COLORMAP_JET)
    
    noise_path = os.path.join(output_dir, f"{prefix}_map.jpg")
    cv2.imwrite(noise_path, noise_vis)
    
    # ---------------------------------------------
    # NEW: Spatial Rich Model (SRM) Filter Map
    # ---------------------------------------------
    srm_noise = extract_srm_noise(image_rgb)
    srm_vis = cv2.normalize(np.log(srm_noise + 1e-5), None, 0, 255, cv2.NORM_MINMAX)
    srm_vis = cv2.applyColorMap(np.uint8(srm_vis), cv2.COLORMAP_MAGMA)
    
    srm_path = os.path.join(output_dir, f"{prefix}_srm_map.jpg")
    cv2.imwrite(srm_path, srm_vis)
    
    # Calculate noise variance.
    # With NLM, the variance of natural noise is tighter and lower than with simple blur.
    # Real camera sensors have a consistent baseline noise variance.
    # Deepfakes often have lower variance (too smooth) due to GAN synthesis.
    variance = np.var(noise)
    
    # Score calculation (heuristic)
    # NLM PRNU variance is much cleaner.
    # Calibrate thresholds via IQA:
    t_min = 2.0 * quality_multiplier
    t_low = 1.0 * quality_multiplier
    t_max = 15.0 * quality_multiplier

    if variance >= t_min and variance <= t_max:
        noise_score = 0.10 # Normal PRNU camera noise range
    elif variance > t_low and variance < t_min:
        # Linear interpolation
        t = (t_min - variance) / (t_min - t_low)
        noise_score = 0.10 + t * 0.35
    elif variance <= t_low:
        t = (t_low - variance) / t_low
        noise_score = 0.45 + t * 0.40
    elif variance > t_max:
        noise_score = 0.60 # Artificially injected noise
        
    return {
        "noise_map_path": noise_path.replace("\\", "/"),
        "denoised_map_path": denoised_path.replace("\\", "/"),
        "srm_map_path": srm_path.replace("\\", "/"),
        "noise_variance": round(float(variance), 4),
        "noise_score": noise_score
    }
