import cv2
import numpy as np
import os
import uuid
import matplotlib.pyplot as plt
from scipy.signal import convolve2d
from pathlib import Path

def analyze_cfa_artifacts(image_path, save_dir=None, face_results=None, quality_multiplier=1.0):
    """
    Detects the presence and consistency of Color Filter Array (CFA) 
    demosaicing artifacts, which are present in all real digital camera photos
    but absent in pure GAN/Diffusion generations.
    """
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            return {"cfa_score": 0.5, "error": "Could not read image"}
            
        # Convert to RGB and Gray
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        
        # CFA Demosaicing residual filter (captures Bayer interpolation artifacts)
        # This filter isolates high-frequency diagonal differences inherent to CFA
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
        
        variance_map = np.zeros((h_blocks, w_blocks))
        
        for i in range(h_blocks):
            for j in range(w_blocks):
                block = cfa_residual[i*block_size:(i+1)*block_size, j*block_size:(j+1)*block_size]
                variance_map[i, j] = np.var(block)
                
        # Normalize variance map for visualization
        if np.max(variance_map) > 0:
            norm_variance = variance_map / np.max(variance_map)
        else:
            norm_variance = variance_map
            
        # Analyze Face vs Background if face is detected
        face_cfa_variance = 0.0
        bg_cfa_variance = 0.0
        
        if face_results and face_results.get("face_detected") and "box" in face_results:
            x, y, fw, fh = face_results["box"]
            
            # Map box to block coordinates
            bx1 = max(0, x // block_size)
            by1 = max(0, y // block_size)
            bx2 = min(w_blocks, (x + fw) // block_size)
            by2 = min(h_blocks, (y + fh) // block_size)
            
            face_region = variance_map[by1:by2, bx1:bx2]
            
            # Background is everything else (we create a mask)
            mask = np.ones_like(variance_map, dtype=bool)
            mask[by1:by2, bx1:bx2] = False
            bg_region = variance_map[mask]
            
            if face_region.size > 0:
                face_cfa_variance = np.mean(face_region)
            if bg_region.size > 0:
                bg_cfa_variance = np.mean(bg_region)
                
            # If the face has significantly less CFA noise, it's likely synthetic.
            # If the face has completely different CFA noise than bg, it's likely spliced.
            ratio = face_cfa_variance / (bg_cfa_variance + 1e-6)
            
            # Score calculation: 
            # Normal ratio is around 0.8 - 1.2. 
            if ratio < 0.5:
                cfa_score = 1.0 - (ratio / 0.5)  # 0.0 ratio = 1.0 score
            elif ratio > 2.0:
                cfa_score = min(1.0, (ratio - 2.0) / 2.0)
            else:
                cfa_score = abs(1.0 - ratio) * 0.5 # Small penalty for normal variance
                
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
            
        # Scale score by quality (low quality = lower confidence)
        cfa_score = cfa_score * quality_multiplier
        cfa_score = float(np.clip(cfa_score, 0.05, 0.95))
            
        # --- Visualization Generation ---
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(8, 6))
        
        # Display the normalized variance map as a heatmap
        # Resize to original dimensions for overlay or display
        heatmap_resized = cv2.resize(norm_variance, (w, h), interpolation=cv2.INTER_NEAREST)
        
        # Create a viridis colormap representation
        im = ax.imshow(heatmap_resized, cmap='inferno')
        
        # Draw face bounding box if available
        if face_results and face_results.get("face_detected") and "box" in face_results:
            x, y, fw, fh = face_results["box"]
            import matplotlib.patches as patches
            rect = patches.Rectangle((x, y), fw, fh, linewidth=2, edgecolor='cyan', facecolor='none', linestyle='dashed')
            ax.add_patch(rect)
            
        ax.axis('off')
        plt.tight_layout(pad=0)
        
        # Save visualization
        filename = f"cfa_{uuid.uuid4().hex[:8]}.png"
        
        if save_dir is None:
            save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "results")
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, filename)
        
        plt.savefig(save_path, bbox_inches='tight', pad_inches=0, dpi=100, facecolor='black')
        plt.close(fig)
        
        # Calculate web relative path
        if "uploads" in str(save_path):
            web_path = "uploads/" + Path(save_path).parts[-2] + "/" + filename
        else:
            web_path = f"static/results/{filename}"
        
        face_var = float(face_cfa_variance) if 'face_cfa_variance' in locals() else 0.0
        bg_var = float(bg_cfa_variance) if 'bg_cfa_variance' in locals() else 0.0
        score = float(np.clip(cfa_score, 0.05, 0.95))

        return {
            "cfa_score": score,
            "face_variance": face_var,
            "bg_variance": bg_var,
            "cfa_map_path": web_path,
            "explanation": {
                "what_happened": "Extracted the microscopic Color Filter Array (Bayer) grid pattern created by physical camera sensors.",
                "result": "Grid Disrupted (Deepfake)" if score > 0.5 else "Authentic Sensor Grid",
                "why_it_happened": "The face region's microscopic pixel grid was completely destroyed or out-of-sync compared to the background, which happens when AI generates new pixels." if score > 0.5 else "The physical camera pixel grid is perfectly consistent across the entire image.",
                "variables": {
                    "Face Grid Variance": f"{face_var:.4f}",
                    "Background Grid Variance": f"{bg_var:.4f}",
                    "Mismatch Ratio": f"{(bg_var / max(0.0001, face_var)):.2f}x"
                }
            }
        }
        
    except Exception as e:
        print(f"Error in CFA analysis: {e}")
        return {"cfa_score": 0.5, "error": str(e)}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = analyze_cfa_artifacts(sys.argv[1])
        print(res)
