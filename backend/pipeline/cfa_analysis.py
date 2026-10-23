import cv2
import numpy as np
import os
import uuid
from scipy.signal import convolve2d
from pipeline.image_utils import save_optimized_image


def _ratio_anomaly(ratio):
    """Continuous legacy residual-contrast heuristic, not a CFA likelihood."""
    if ratio < 0.5:
        return 1.0 - 1.5 * ratio
    if ratio > 2.0:
        return min(1.0, 0.5 + (ratio - 2.0) / 4.0)
    return abs(1.0 - ratio) * 0.5


def analyze_cfa_artifacts(image_path, save_dir=None, face_results=None, quality_multiplier=1.0):
    """
    Measures a grayscale high-pass residual and face/background contrast.
    It does not reconstruct CFA interpolation probabilities or identify a Bayer grid.
    """
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            return {"cfa_score": 0.5, "available": False, "error": "Could not read image"}
            
        # Convert to RGB and Gray
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        
        if min(gray.shape) < 8:
            return {"cfa_score": 0.5, "available": False, "warnings": ["Image too small for an 8x8 residual block."]}
        if np.ptp(gray) == 0:
            return {"cfa_score": 0.5, "available": False, "warnings": ["No spatial variation for residual measurement."]}
        if not np.isfinite(quality_multiplier) or quality_multiplier <= 0:
            return {"cfa_score": 0.5, "available": False, "warnings": ["Invalid quality factor for residual analysis."]}

        face_box = (face_results.get("face_bbox") or face_results.get("box")) if face_results else None

        # Generic high-pass filter: scene texture also contributes to this residual.
        cfa_filter = np.array([
            [-0.25,  0.5, -0.25],
            [ 0.5,  -1.0,  0.5],
            [-0.25,  0.5, -0.25]
        ])
        
        # Apply filter to extract the CFA residual pattern
        cfa_residual = convolve2d(gray.astype(float), cfa_filter, mode='same', boundary='symm')
        
        # Calculate local variance (block processing) to find CFA strength
        block_size = 8
        h, w = cfa_residual.shape
        h_blocks = h // block_size
        w_blocks = w // block_size
        
        blocks = cfa_residual[:h_blocks*8, :w_blocks*8].reshape(h_blocks, 8, w_blocks, 8)
        variance_map = blocks.var(axis=(1, 3))
        if not np.any(variance_map > np.finfo(float).eps):
            return {"cfa_score": 0.5, "available": False,
                    "warnings": ["No measurable high-pass residual variation."]}

        # Normalize variance map for visualization
        if np.max(variance_map) > 0:
            norm_variance = variance_map / np.max(variance_map)
        else:
            norm_variance = variance_map
            
        # Analyze Face vs Background if face is detected
        face_cfa_variance = 0.0
        bg_cfa_variance = 0.0
        
        if face_results and face_results.get("face_detected") and face_box is not None:
            x, y, fw, fh = face_box
            
            # Map box to block coordinates
            bx1 = max(0, int(np.ceil(x / block_size)))
            by1 = max(0, int(np.ceil(y / block_size)))
            bx2 = min(w_blocks, int((x + fw) // block_size))
            by2 = min(h_blocks, int((y + fh) // block_size))
            
            face_region = variance_map[by1:by2, bx1:bx2]
            
            # Exclude every face-overlapping block from the background. Only
            # fully contained blocks enter the face measurement.
            mask = np.ones_like(variance_map, dtype=bool)
            ox1, oy1 = max(0, int(x // 8)), max(0, int(y // 8))
            ox2, oy2 = min(w_blocks, int(np.ceil((x + fw) / 8))), min(h_blocks, int(np.ceil((y + fh) / 8)))
            mask[oy1:oy2, ox1:ox2] = False
            bg_region = variance_map[mask]
            
            if not face_region.size or not bg_region.size:
                return {"cfa_score": 0.5, "available": False, "warnings": ["Insufficient uncontaminated face/background residual blocks."]}

            if face_region.size > 0:
                face_cfa_variance = np.mean(face_region)
            if bg_region.size > 0:
                bg_cfa_variance = np.mean(bg_region)
                
            # If the face has significantly less CFA noise, it's likely synthetic.
            # If the face has completely different CFA noise than bg, it's likely spliced.
            ratio = face_cfa_variance / (bg_cfa_variance + 1e-6)
            
            # Score calculation: 
            # Normal ratio is around 0.8 - 1.2. 
            cfa_score = _ratio_anomaly(ratio)
                
            # NEW: If the ENTIRE image lacks CFA noise, it's heavily compressed or fully AI-generated!
            global_variance = np.mean(variance_map)
            
            # If both regions have very low variance, it's heavily compressed video. 
            # The ratio becomes mathematically unstable and meaningless.
            if face_cfa_variance < 15.0 and bg_cfa_variance < 15.0:
                # Bypass ratio penalty for compressed videos, just use global smoothness
                cfa_score = max(0.0, min(1.0, (5 - global_variance) / 5)) * 0.4 # Cap confidence
            else:
                if global_variance < 10.0:
                    # Override the ratio score if the whole image is smooth
                    cfa_score = max(cfa_score, min(1.0, (15 - global_variance) / 15))
        else:
            # No face detected. Measure global CFA strength.
            global_variance = np.mean(variance_map)
            cfa_score = max(0.0, min(1.0, (5 - global_variance) / 5))
            
        # Lower quality means less evidence in either direction, not evidence of
        # authenticity. Never boost confidence for a quality factor above one.
        cfa_score = 0.5 + min(1.0, quality_multiplier) * (cfa_score - 0.5)
        cfa_score = float(np.clip(cfa_score, 0.05, 0.95))
            
        # --- Visualization Generation ---
        heatmap_resized = cv2.resize(norm_variance, (w, h), interpolation=cv2.INTER_NEAREST)
        visualization = cv2.applyColorMap(np.uint8(np.clip(heatmap_resized * 255, 0, 255)), cv2.COLORMAP_INFERNO)
        if face_box is not None:
            x, y, fw, fh = face_box
            cv2.rectangle(visualization, (x, y), (x + fw, y + fh), (255, 255, 0), 2)

        # Save visualization
        file_uid = uuid.uuid4().hex[:8]
        filename = f"cfa_{file_uid}.png"
        
        if save_dir is None:
            save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "results")
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, filename)
        
        save_optimized_image(save_path, visualization)
        
        # -------------------------------------------------------------
        # EXHIBIT 2: 2D Fourier Nyquist Spectrum of CFA Demosaic Error
        # -------------------------------------------------------------
        dft = np.fft.fft2(cfa_residual)
        dft_shift = np.fft.fftshift(dft)
        mag_spec = 20 * np.log(np.abs(dft_shift) + 1e-5)
        mag_norm = cv2.normalize(mag_spec, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        fourier_vis = cv2.applyColorMap(mag_norm, cv2.COLORMAP_VIRIDIS)
        fh, fw = fourier_vis.shape[:2]
        cv2.line(fourier_vis, (fw // 2, 0), (fw // 2, fh), (70, 70, 70), 1)
        cv2.line(fourier_vis, (0, fh // 2), (fw, fh // 2), (70, 70, 70), 1)
        cv2.circle(fourier_vis, (fw // 2, fh // 2), 4, (0, 255, 255), -1)
        
        fourier_filename = f"cfa_fourier_{file_uid}.jpg"
        fourier_save_path = os.path.join(save_dir, fourier_filename)
        save_optimized_image(fourier_save_path, fourier_vis)
        
        # -------------------------------------------------------------
        # EXHIBIT 3: GRBG Sub-Pixel Bayer Lattice Residual Map
        # -------------------------------------------------------------
        res_norm = cv2.normalize(np.abs(cfa_residual), None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        res_colormap = cv2.applyColorMap(res_norm, cv2.COLORMAP_MAGMA)
        blended_bayer = cv2.addWeighted(img, 0.45, res_colormap, 0.75, 0)
        
        grid_filename = f"cfa_bayer_grid_{file_uid}.jpg"
        grid_save_path = os.path.join(save_dir, grid_filename)
        save_optimized_image(grid_save_path, blended_bayer)
        
        web_path, fourier_web_path, grid_web_path = save_path, fourier_save_path, grid_save_path

        face_var = float(face_cfa_variance) if 'face_cfa_variance' in locals() else 0.0
        bg_var = float(bg_cfa_variance) if 'bg_cfa_variance' in locals() else 0.0
        score = float(np.clip(cfa_score, 0.05, 0.95))

        return {
            "cfa_score": score,
            "available": True,
            "score_kind": "heuristic", "score_calibrated": False,
            "face_variance": face_var,
            "bg_variance": bg_var,
            "cfa_map_path": web_path.replace("\\", "/"),
            "cfa_fourier_path": fourier_web_path.replace("\\", "/"),
            "bayer_grid_path": grid_web_path.replace("\\", "/"),
            "explanation": {
                "what_happened": "Measured block variance of a grayscale high-pass residual; this is not reconstruction of a physical Bayer grid.",
                "result": "Elevated Residual Variation Heuristic" if score > 0.5 else "Lower Residual Variation Heuristic",
                "why_it_happened": "Scene texture, blur, resizing, demosaicing, and compression all affect this residual. A difference does not identify AI generation or a specific camera.",
                "variables": {
                    "Face Grid Variance": f"{face_var:.4f}",
                    "Background Grid Variance": f"{bg_var:.4f}",
                    "Mismatch Ratio": f"{(bg_var / max(0.0001, face_var)):.2f}x"
                }
            }
        }
        
    except Exception as e:
        print(f"Error in CFA analysis: {e}")
        return {"cfa_score": 0.5, "available": False, "error": str(e)}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = analyze_cfa_artifacts(sys.argv[1])
        print(res)
