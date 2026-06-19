import cv2
import numpy as np
import os
import uuid
import matplotlib.pyplot as plt
from skimage.metrics import structural_similarity as ssim
from pathlib import Path

def analyze_corneal_reflections(image_path, save_dir=None, face_results=None, quality_multiplier=1.0):
    """
    Detects inconsistencies in corneal specular highlights (the reflection of light 
    in the eyes). Real photos have geometrically consistent reflections in both eyes.
    GANs and face swaps often render mismatched reflections.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return {"corneal_score": 0.5, "error": "Could not read image"}
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        
        import mediapipe as mp
        from pipeline.face_geometry import get_landmarker
        
        landmarker = get_landmarker()
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        detection_result = landmarker.detect(mp_image)
            
        if not detection_result.face_landmarks:
            return {
                "corneal_score": 0.5,
                "warning": "No face detected for corneal analysis",
                "corneal_map_path": None
            }
            
        face_landmarks = detection_result.face_landmarks[0]
        
        # Mediapipe Eye Contours (tightly bounds the sclera and iris)
        # Left eye (right side of image)
        le_indices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        # Right eye (left side of image)
        re_indices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        
        # Create precise masks for left and right eyes
        left_eye_mask_full = np.zeros(img.shape[:2], dtype=np.uint8)
        right_eye_mask_full = np.zeros(img.shape[:2], dtype=np.uint8)
        
        le_pts = np.array([[int(face_landmarks[i].x * w), int(face_landmarks[i].y * h)] for i in le_indices], dtype=np.int32)
        re_pts = np.array([[int(face_landmarks[i].x * w), int(face_landmarks[i].y * h)] for i in re_indices], dtype=np.int32)
        
        cv2.fillPoly(left_eye_mask_full, [le_pts], 255)
        cv2.fillPoly(right_eye_mask_full, [re_pts], 255)
        
        # Bounding boxes for cropping
        def get_bbox(pts, pad=2):
            x_min, y_min = np.min(pts, axis=0)
            x_max, y_max = np.max(pts, axis=0)
            return (
                max(0, x_min - pad), min(w, x_max + pad),
                max(0, y_min - pad), min(h, y_max + pad)
            )
            
        lx_min, lx_max, ly_min, ly_max = get_bbox(le_pts, pad=5)
        rx_min, rx_max, ry_min, ry_max = get_bbox(re_pts, pad=5)
        
        # Crop eye regions
        left_eye_rgb = img_rgb[ly_min:ly_max, lx_min:lx_max]
        right_eye_rgb = img_rgb[ry_min:ry_max, rx_min:rx_max]
        
        # Crop masks
        left_mask = left_eye_mask_full[ly_min:ly_max, lx_min:lx_max]
        right_mask = right_eye_mask_full[ry_min:ry_max, rx_min:rx_max]
        
        if left_eye_rgb.size == 0 or right_eye_rgb.size == 0:
             return {
                "corneal_score": 0.5,
                "warning": "Eye regions could not be cropped clearly",
                "corneal_map_path": None
            }
            
        # Resize to standard size for comparison
        target_size = (64, 64)
        left_eye_rgb = cv2.resize(left_eye_rgb, target_size)
        right_eye_rgb = cv2.resize(right_eye_rgb, target_size)
        
        left_mask = cv2.resize(left_mask, target_size, interpolation=cv2.INTER_NEAREST)
        right_mask = cv2.resize(right_mask, target_size, interpolation=cv2.INTER_NEAREST)
        
        # Isolate specular highlights using Color-Informed Brightness
        def extract_highlights(eye_rgb, mask):
            # Convert to LAB to find brightness
            lab = cv2.cvtColor(eye_rgb, cv2.COLOR_RGB2LAB)
            l_channel = lab[:,:,0]
            
            # Apply exact eye mask
            l_channel = cv2.bitwise_and(l_channel, l_channel, mask=mask)
            
            # Threshold top 10% brightness inside the eye mask
            valid_pixels = l_channel[mask > 0]
            if len(valid_pixels) == 0:
                return np.zeros_like(l_channel)
                
            p90 = np.percentile(valid_pixels, 90)
            thresh_val = max(180, p90) # Require absolute brightness as well
            
            _, thresh = cv2.threshold(l_channel, thresh_val, 255, cv2.THRESH_BINARY)
            return thresh
            
        left_thresh = extract_highlights(left_eye_rgb, left_mask)
        right_thresh = extract_highlights(right_eye_rgb, right_mask)
        
        # Grayscale versions for visualization
        left_eye_img = cv2.cvtColor(left_eye_rgb, cv2.COLOR_RGB2GRAY)
        right_eye_img = cv2.cvtColor(right_eye_rgb, cv2.COLOR_RGB2GRAY)
        
        # Calculate IoU
        intersection = np.logical_and(left_thresh, right_thresh).sum()
        union = np.logical_or(left_thresh, right_thresh).sum()
        
        if union == 0:
            iou = 1.0 # Both have no highlights
        else:
            iou = intersection / union
            
        # Calculate Structural Similarity
        sim_score, _ = ssim(left_thresh, right_thresh, full=True, data_range=255)
        
        combined_sim = (iou + max(0, sim_score)) / 2.0
        anomaly = 1.0 - combined_sim
        corneal_score = np.clip(anomaly * 1.5, 0.1, 0.95)
        corneal_score = corneal_score * quality_multiplier
        
        # --- Premium Visualization Generation ---
        scale = 6
        img_size = 64 * scale
        
        left_big = cv2.resize(cv2.cvtColor(left_eye_img, cv2.COLOR_GRAY2RGB), (img_size, img_size), interpolation=cv2.INTER_CUBIC)
        right_big = cv2.resize(cv2.cvtColor(right_eye_img, cv2.COLOR_GRAY2RGB), (img_size, img_size), interpolation=cv2.INTER_CUBIC)
        
        left_big_thresh = cv2.resize(left_thresh, (img_size, img_size), interpolation=cv2.INTER_NEAREST)
        right_big_thresh = cv2.resize(right_thresh, (img_size, img_size), interpolation=cv2.INTER_NEAREST)
        
        # Alpha blended overlays
        def apply_glow_overlay(base, thresh, color):
            overlay = np.zeros_like(base)
            overlay[thresh > 0] = color
            
            # Create a glow effect
            glow = cv2.GaussianBlur(overlay, (21, 21), 0)
            overlay_with_glow = cv2.addWeighted(overlay, 0.8, glow, 0.6, 0)
            
            # Blend with original
            result = cv2.addWeighted(base, 1.0, overlay_with_glow, 0.7, 0)
            return result
            
        left_big_overlay = apply_glow_overlay(left_big, left_big_thresh, [50, 50, 255])   # Red in BGR
        right_big_overlay = apply_glow_overlay(right_big, right_big_thresh, [255, 255, 50]) # Cyan in BGR
        
        # Composite (Heatmap Diff)
        comp_big = np.zeros_like(left_big)
        comp_big[left_big_thresh > 0] = [50, 50, 255] # Red
        comp_big[right_big_thresh > 0] = [255, 255, 50] # Cyan
        
        # Find intersection
        intersect_mask = cv2.bitwise_and(left_big_thresh, right_big_thresh)
        comp_big[intersect_mask > 0] = [255, 255, 255] # White where they overlap
        
        comp_big = cv2.addWeighted(comp_big, 1.0, cv2.GaussianBlur(comp_big, (21, 21), 0), 0.6, 0)
        
        # Build Canvas (Transparent PNG background)
        pad = 40
        top_pad = 80
        w = pad * 4 + img_size * 3
        h = top_pad + img_size + pad
        
        # Create a 4-channel transparent image (BGRA)
        canvas = np.zeros((h, w, 4), dtype=np.uint8)
        
        x1 = pad
        x2 = x1 + img_size + pad
        x3 = x2 + img_size + pad
        y = top_pad
        
        # Place Images (Add alpha channel)
        def add_alpha(img):
            return cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
            
        canvas[y:y+img_size, x1:x1+img_size] = add_alpha(left_big_overlay)
        canvas[y:y+img_size, x2:x2+img_size] = add_alpha(right_big_overlay)
        canvas[y:y+img_size, x3:x3+img_size] = add_alpha(comp_big)
        
        # Draw Borders (Glassmorphism style)
        border_color = (255, 255, 255, 60)
        thickness = 2
        cv2.rectangle(canvas, (x1-thickness, y-thickness), (x1+img_size+thickness-1, y+img_size+thickness-1), border_color, thickness)
        cv2.rectangle(canvas, (x2-thickness, y-thickness), (x2+img_size+thickness-1, y+img_size+thickness-1), border_color, thickness)
        cv2.rectangle(canvas, (x3-thickness, y-thickness), (x3+img_size+thickness-1, y+img_size+thickness-1), border_color, thickness)
        
        # Add text
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.8
        
        def put_centered_text(img, text, cx, cy, color):
            text_size, _ = cv2.getTextSize(text, font, font_scale, 2)
            tx = cx - text_size[0] // 2
            # Shadow
            cv2.putText(img, text, (tx+1, cy+1), font, font_scale, (0,0,0,255), 2, cv2.LINE_AA)
            # Text
            cv2.putText(img, text, (tx, cy), font, font_scale, color, 2, cv2.LINE_AA)
            
        status = "Consistent" if iou > 0.3 else "Mismatched"
        comp_title = f"Alignment: {status} (IoU: {iou:.2f})"
        
        text_color = (220, 220, 220, 255)
        put_centered_text(canvas, "Left Eye Reflection", x1 + img_size//2, top_pad - 25, text_color)
        put_centered_text(canvas, "Right Eye Reflection", x2 + img_size//2, top_pad - 25, text_color)
        put_centered_text(canvas, comp_title, x3 + img_size//2, top_pad - 25, (255, 255, 255, 255))
        
        filename = f"corneal_{uuid.uuid4().hex[:8]}.png"
        
        if save_dir is None:
            save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "results")
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, filename)
        
        cv2.imwrite(save_path, canvas)
        
        # Calculate web relative path
        if "uploads" in str(save_path).replace("\\", "/"):
            web_path = "uploads/" + Path(save_path).parts[-2] + "/" + filename
        else:
            web_path = f"static/results/{filename}"
        
        return {
            "corneal_score": float(corneal_score),
            "iou": float(iou),
            "ssim": float(sim_score),
            "corneal_map_path": web_path.replace("\\", "/")
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"corneal_score": 0.5, "error": str(e)}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = analyze_corneal_reflections(sys.argv[1])
        print(res)
