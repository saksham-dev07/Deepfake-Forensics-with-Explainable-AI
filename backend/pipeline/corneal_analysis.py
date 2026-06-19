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
        
        # Create a mask for the face to exclude bright backgrounds (like curtains)
        face_oval_indices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
        face_mask = np.zeros(img.shape[:2], dtype=np.uint8)
        oval_pts = np.array([[int(face_landmarks[i].x * w), int(face_landmarks[i].y * h)] for i in face_oval_indices], dtype=np.int32)
        cv2.fillPoly(face_mask, [oval_pts], 255)
        
        # Apply mask to grayscale image to ignore background reflections
        gray_masked = cv2.bitwise_and(gray, gray, mask=face_mask)
        
        # Person's left eye (appears on the right side of the image)
        le_indices = [263, 362, 386, 374]
        lx_coords = [int(face_landmarks[i].x * w) for i in le_indices]
        ly_coords = [int(face_landmarks[i].y * h) for i in le_indices]
        lx_min, lx_max = min(lx_coords), max(lx_coords)
        ly_min, ly_max = min(ly_coords), max(ly_coords)
        
        def pad_bbox(x_min, x_max, y_min, y_max, pad_ratio=1.5):
            bw, bh = x_max - x_min, y_max - y_min
            px, py = int(bw * pad_ratio), int(bh * pad_ratio)
            return (
                max(0, x_min - px), min(w, x_max + px),
                max(0, y_min - py), min(h, y_max + py)
            )
            
        lx_min, lx_max, ly_min, ly_max = pad_bbox(lx_min, lx_max, ly_min, ly_max)
        
        # Person's right eye (appears on the left side of the image)
        re_indices = [33, 133, 159, 145]
        rx_coords = [int(face_landmarks[i].x * w) for i in re_indices]
        ry_coords = [int(face_landmarks[i].y * h) for i in re_indices]
        rx_min, rx_max = min(rx_coords), max(rx_coords)
        ry_min, ry_max = min(ry_coords), max(ry_coords)
        
        rx_min, rx_max, ry_min, ry_max = pad_bbox(rx_min, rx_max, ry_min, ry_max)
        
        # Crop eye regions (using raw RGB image to access color channels)
        left_eye_rgb = img_rgb[ly_min:ly_max, lx_min:lx_max]
        right_eye_rgb = img_rgb[ry_min:ry_max, rx_min:rx_max]
        
        # Crop masks
        left_mask = face_mask[ly_min:ly_max, lx_min:lx_max]
        right_mask = face_mask[ry_min:ry_max, rx_min:rx_max]
        
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
        
        # Isolate specular highlights using Color-Informed Brightness:
        # Human skin is highly red-dominant (R > G > B). 
        # Specular reflections from screens/windows are neutral/cool and bright (R ≈ G ≈ B or B > R).
        # Taking min(B, G) perfectly suppresses warm skin while preserving true reflections!
        def extract_highlights(eye_rgb, mask):
            r, g, b = cv2.split(eye_rgb)
            min_bg = np.minimum(b.astype(np.float32), g.astype(np.float32))
            min_bg = np.clip(min_bg, 0, 255).astype(np.uint8)
            min_bg = cv2.bitwise_and(min_bg, min_bg, mask=mask)
            
            _, mx, _, _ = cv2.minMaxLoc(min_bg)
            thresh_val = max(90, mx * 0.80)
            _, thresh = cv2.threshold(min_bg, thresh_val, 255, cv2.THRESH_BINARY)
            return thresh
            
        left_thresh = extract_highlights(left_eye_rgb, left_mask)
        right_thresh = extract_highlights(right_eye_rgb, right_mask)
        
        # Create grayscale versions for the visualization at the end
        left_eye_img = cv2.cvtColor(left_eye_rgb, cv2.COLOR_RGB2GRAY)
        right_eye_img = cv2.cvtColor(right_eye_rgb, cv2.COLOR_RGB2GRAY)
        
        # Calculate Intersection over Union (IoU) of the highlights
        intersection = np.logical_and(left_thresh, right_thresh).sum()
        union = np.logical_or(left_thresh, right_thresh).sum()
        
        if union == 0:
            # No highlights found in either eye
            iou = 1.0 # Consistent (both have no highlights)
        else:
            iou = intersection / union
            
        # Calculate Structural Similarity of the thresholds
        sim_score, _ = ssim(left_thresh, right_thresh, full=True)
        
        # Combine metrics. High similarity = real. Low similarity = fake.
        # Deepfakes often have IoU < 0.2 and SSIM < 0.5 for specular masks
        combined_sim = (iou + max(0, sim_score)) / 2.0
        
        # If similarity is very low, anomaly score is high
        anomaly = 1.0 - combined_sim
        
        # Apply strict heuristics (IoU needs to be somewhat similar for real photos)
        corneal_score = np.clip(anomaly * 1.5, 0.1, 0.95)
        
        # Scale score by quality (blurry webcam might have distorted highlights)
        corneal_score = corneal_score * quality_multiplier
        
        # --- Visualization Generation ---
        scale = 6
        img_size = 64 * scale
        
        # Resize base images first (using NEAREST to keep masks pixel-perfect)
        left_big = cv2.resize(cv2.cvtColor(left_eye_img, cv2.COLOR_GRAY2RGB), (img_size, img_size), interpolation=cv2.INTER_NEAREST)
        right_big = cv2.resize(cv2.cvtColor(right_eye_img, cv2.COLOR_GRAY2RGB), (img_size, img_size), interpolation=cv2.INTER_NEAREST)
        
        left_big_thresh = cv2.resize(left_thresh, (img_size, img_size), interpolation=cv2.INTER_NEAREST)
        right_big_thresh = cv2.resize(right_thresh, (img_size, img_size), interpolation=cv2.INTER_NEAREST)
        
        # Overlays
        left_big_overlay = left_big.copy()
        left_big_overlay[left_big_thresh > 0] = [255, 50, 50] 
        
        right_big_overlay = right_big.copy()
        right_big_overlay[right_big_thresh > 0] = [50, 255, 255] 
        
        # Composite
        comp_big = np.zeros_like(left_big)
        comp_big[left_big_thresh > 0, 0] = 255 # Red
        comp_big[right_big_thresh > 0, 1] = 255 # Green
        comp_big[right_big_thresh > 0, 2] = 255 # Blue
        
        # Build Canvas
        pad = 40
        top_pad = 80
        w = pad * 4 + img_size * 3
        h = top_pad + img_size + pad
        
        # Dark Slate background (BGR format)
        canvas = np.full((h, w, 3), (40, 30, 25), dtype=np.uint8)
        
        x1 = pad
        x2 = x1 + img_size + pad
        x3 = x2 + img_size + pad
        y = top_pad
        
        # Place Images
        canvas[y:y+img_size, x1:x1+img_size] = cv2.cvtColor(left_big_overlay, cv2.COLOR_RGB2BGR)
        canvas[y:y+img_size, x2:x2+img_size] = cv2.cvtColor(right_big_overlay, cv2.COLOR_RGB2BGR)
        canvas[y:y+img_size, x3:x3+img_size] = cv2.cvtColor(comp_big, cv2.COLOR_RGB2BGR)
        
        # Draw Borders
        border_color = (80, 80, 80)
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
            cv2.putText(img, text, (tx, cy), font, font_scale, color, 2, cv2.LINE_AA)
            
        status = "Consistent" if iou > 0.3 else "Mismatched"
        comp_title = f"Alignment: {status} (IoU: {iou:.2f})"
        
        put_centered_text(canvas, "Left Eye Reflection", x1 + img_size//2, top_pad - 25, (220, 220, 220))
        put_centered_text(canvas, "Right Eye Reflection", x2 + img_size//2, top_pad - 25, (220, 220, 220))
        put_centered_text(canvas, comp_title, x3 + img_size//2, top_pad - 25, (255, 255, 255))
        
        final_vis_bgr = canvas
        
        filename = f"corneal_{uuid.uuid4().hex[:8]}.png"
        
        if save_dir is None:
            save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "results")
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, filename)
        
        cv2.imwrite(save_path, final_vis_bgr)
        
        # Calculate web relative path
        if "uploads" in str(save_path):
            web_path = "uploads/" + Path(save_path).parts[-2] + "/" + filename
        else:
            web_path = f"static/results/{filename}"
        
        return {
            "corneal_score": float(corneal_score),
            "iou": float(iou),
            "ssim": float(sim_score),
            "corneal_map_path": web_path
        }
        
    except Exception as e:
        print(f"Error in corneal analysis: {e}")
        return {"corneal_score": 0.5, "error": str(e)}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        res = analyze_corneal_reflections(sys.argv[1])
        print(res)
