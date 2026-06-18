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
        
        # Load Haar cascades for face and eyes
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Try to use provided face box, otherwise detect
        face_box = None
        if face_results and "box" in face_results:
            face_box = face_results["box"]
        else:
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            if len(faces) > 0:
                face_box = faces[0]
                
        if face_box is None:
            # No face found, cannot do corneal analysis
            return {
                "corneal_score": 0.5,
                "warning": "No face detected for corneal analysis",
                "corneal_map_path": None
            }
            
        fx, fy, fw, fh = face_box
        roi_gray = gray[fy:fy+fh, fx:fx+fw]
        roi_color = img[fy:fy+fh, fx:fx+fw]
        
        # Detect eyes within the face ROI
        eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 4)
        
        if len(eyes) < 2:
             return {
                "corneal_score": 0.5,
                "warning": "Could not detect both eyes clearly",
                "corneal_map_path": None
            }
            
        # Sort eyes by X coordinate to get Left and Right
        eyes = sorted(eyes, key=lambda e: e[0])
        left_eye = eyes[0]
        right_eye = eyes[-1] # Usually index 1
        
        # Extract eye images
        lx, ly, lw, lh = left_eye
        rx, ry, rw, rh = right_eye
        
        left_eye_img = roi_gray[ly:ly+lh, lx:lx+lw]
        right_eye_img = roi_gray[ry:ry+rh, rx:rx+rw]
        
        # Resize to same dimensions for comparison
        target_size = (64, 64)
        left_eye_img = cv2.resize(left_eye_img, target_size)
        right_eye_img = cv2.resize(right_eye_img, target_size)
        
        # Find specular highlights (brightest pixels)
        # We use a high threshold to isolate the reflections
        _, left_thresh = cv2.threshold(left_eye_img, 200, 255, cv2.THRESH_BINARY)
        _, right_thresh = cv2.threshold(right_eye_img, 200, 255, cv2.THRESH_BINARY)
        
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
        plt.style.use('dark_background')
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Create RGB versions for overlay plotting
        left_eye_rgb = cv2.cvtColor(left_eye_img, cv2.COLOR_GRAY2RGB)
        right_eye_rgb = cv2.cvtColor(right_eye_img, cv2.COLOR_GRAY2RGB)
        
        # Left Eye Highlight (Bright Red overlay)
        left_eye_overlay = left_eye_rgb.copy()
        left_eye_overlay[left_thresh > 0] = [255, 50, 50] 
        axes[0].imshow(left_eye_overlay)
        axes[0].set_title("Left Eye Specular Highlight")
        axes[0].axis('off')
        
        # Right Eye Highlight (Bright Cyan overlay)
        right_eye_overlay = right_eye_rgb.copy()
        right_eye_overlay[right_thresh > 0] = [50, 255, 255] 
        axes[1].imshow(right_eye_overlay)
        axes[1].set_title("Right Eye Specular Highlight")
        axes[1].axis('off')
        
        # Intersection Overlay (Left = Red, Right = Cyan, Intersection = White)
        composite = np.zeros_like(left_eye_rgb)
        composite[left_thresh > 0, 0] = 255 # Red channel for left
        composite[right_thresh > 0, 1] = 255 # Green channel for right
        composite[right_thresh > 0, 2] = 255 # Blue channel for right
        
        axes[2].imshow(composite)
        
        status = "Consistent" if iou > 0.3 else "Mismatched"
        axes[2].set_title(f"3D Reflection Alignment: {status}\n(IoU: {iou:.2f} | Anomaly: {corneal_score:.2f})")
        axes[2].axis('off')
        
        plt.tight_layout()
        
        filename = f"corneal_{uuid.uuid4().hex[:8]}.png"
        
        if save_dir is None:
            save_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "results")
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, filename)
        
        plt.savefig(save_path, bbox_inches='tight', facecolor='black')
        plt.close(fig)
        
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
