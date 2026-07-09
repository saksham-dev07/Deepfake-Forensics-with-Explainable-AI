import cv2
import numpy as np
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pipeline.face_geometry import detect_face

def analyze_optical_flow(video_path, output_dir, prefix="flow"):
    """
    Analyzes temporal consistency using Farneback Dense Optical Flow.
    Detects mask jittering and frame-by-frame flickering common in deepfakes.
    """
    results = {
        "flow_anomaly_score": 0.5,
        "mean_motion_variance": 0.0,
        "flow_plot_path": "",
        "warnings": []
    }

    if not video_path or not os.path.exists(video_path):
        results["error"] = "Missing video file"
        return results

    cap = cv2.VideoCapture(video_path)
    ret, frame1 = cap.read()
    if not ret:
        results["warnings"].append("Could not read video for optical flow.")
        return results

    # Resize for faster processing
    frame1 = cv2.resize(frame1, (320, 240))
    prvs = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    
    # Dynamically extract face bounding box for precise ROI targeting
    rgb_frame1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2RGB)
    landmarks = detect_face(rgb_frame1)
    
    h, w = prvs.shape
    if landmarks is not None and "face_bbox" in landmarks:
        fx, fy, fw, fh = landmarks["face_bbox"]
        roi_x1, roi_x2 = max(0, fx), min(w, fx + fw)
        roi_y1, roi_y2 = max(0, fy), min(h, fy + fh)
    else:
        # Fallback to center
        roi_y1, roi_y2 = int(h*0.1), int(h*0.9)
        roi_x1, roi_x2 = int(w*0.2), int(w*0.8)

    motion_variances = []
    max_frames = 60 # Analyze max 60 frames (2 seconds)
    frame_count = 0

    # Accumulate flow visualization
    hsv = np.zeros_like(frame1)
    hsv[..., 1] = 255

    # Initialize DIS Optical Flow (Extremely fast & accurate for dense tracking)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)

    while cap.isOpened() and frame_count < max_frames:
        ret, frame2 = cap.read()
        if not ret:
            break
            
        frame2 = cv2.resize(frame2, (320, 240))
        next_gray = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Calculate dense optical flow using DIS
        flow = dis.calc(prvs, next_gray, None)
        
        # Extract magnitude and angle
        mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        
        # Focus on ROI to avoid background motion
        roi_mag = mag[roi_y1:roi_y2, roi_x1:roi_x2]
        
        # Deepfakes often have highly variable blocky motion vectors in the mask boundaries
        var_mag = np.var(roi_mag)
        motion_variances.append(var_mag)
        
        prvs = next_gray
        frame_count += 1
        
        # Keep the last flow field for visualization
        if frame_count == max_frames // 2:
            hsv[..., 0] = ang * 180 / np.pi / 2
            hsv[..., 2] = cv2.normalize(mag, None, 0, 255, cv2.NORM_MINMAX)
            bgr_flow = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    cap.release()

    if len(motion_variances) < 10:
        results["warnings"].append("Video too short for temporal consistency check.")
        return results

    mean_var = np.mean(motion_variances)
    var_of_vars = np.var(motion_variances)
    
    anomaly_score = 0.1
    
    # Heavy flickering produces spikes in motion variance across frames
    if var_of_vars > 15.0:
        anomaly_score = max(anomaly_score, 0.85)
        results["warnings"].append(f"Severe temporal flickering detected (Var of Vars: {var_of_vars:.1f})")
    elif var_of_vars > 5.0:
        anomaly_score = max(anomaly_score, 0.65)
        results["warnings"].append(f"Moderate jittering detected (Var of Vars: {var_of_vars:.1f})")
        
    results["flow_anomaly_score"] = float(anomaly_score)
    results["mean_motion_variance"] = float(round(mean_var, 3))
    
    # Generate Explanation
    explanation = {
        "what_happened": "Temporal consistency was analyzed using Farneback Dense Optical Flow to track pixel movement across consecutive frames.",
        "result": "Motion vectors appear temporally consistent." if anomaly_score < 0.5 else "Detected abnormal temporal flickering and inconsistent motion trajectories.",
        "why_it_happened": "Face-swapping AI models often struggle to maintain exact spatial alignment between frames. This results in microscopic 'jittering' or 'flickering' in the synthesized facial mask which creates spikes in motion variance.",
        "variables": {
            "Mean Motion Variance": f"{mean_var:.3f}",
            "Variance of Variances (Jitter)": f"{var_of_vars:.2f}",
            "Anomaly Score": f"{anomaly_score:.2f}"
        }
    }
    results["explanation"] = explanation
    
    # Plot Variance over time
    plt.figure(figsize=(8, 3))
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(8, 3), facecolor='#0f172a')
    
    ax.plot(motion_variances, color='#10b981', linewidth=2)
    ax.set_title('Temporal Motion Variance (Jitter)', color='white', pad=10)
    ax.set_xlabel('Frame Index', color='#94a3b8')
    ax.set_ylabel('Variance', color='#94a3b8')
    ax.tick_params(colors='#94a3b8')
    ax.grid(True, color='#1e293b', alpha=0.6)
    
    plot_path = os.path.join(output_dir, f"{prefix}_plot.png")
    plt.tight_layout()
    plt.savefig(plot_path, dpi=120, bbox_inches='tight', facecolor='#0f172a')
    plt.close('all')
    
    results["flow_plot_path"] = plot_path.replace("\\", "/")
    
    # Save the flow field image
    if 'bgr_flow' in locals():
        flow_img_path = os.path.join(output_dir, f"{prefix}_field.jpg")
        cv2.imwrite(flow_img_path, bgr_flow)
        results["flow_field_path"] = flow_img_path.replace("\\", "/")
    
    return results
