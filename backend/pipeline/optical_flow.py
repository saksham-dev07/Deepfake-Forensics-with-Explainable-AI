import cv2
import numpy as np
import os
from matplotlib.figure import Figure
from pipeline.face_geometry import detect_face
from pipeline.image_utils import save_optimized_image, save_optimized_figure

def analyze_optical_flow(video_path, output_dir, prefix="flow"):
    """
    Analyzes temporal consistency using DIS Dense Optical Flow.
    Detects mask jittering and frame-by-frame flickering common in deepfakes.
    """
    results = {
        "available": False,
        "score_available": False,
        "eligible_for_fusion": False,
        "score_calibrated": False,
        "score_kind": "heuristic",
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
        cap.release()
        results["warnings"].append("Could not read video for optical flow.")
        return results

    # Resize for faster processing
    # Preserve aspect ratio; stretching portrait faces changes displacement
    # magnitudes differently along the two axes.
    scale = 320 / max(frame1.shape[:2])
    target_size = (round(frame1.shape[1] * scale), round(frame1.shape[0] * scale))
    if min(target_size) < 8:
        cap.release()
        results["warnings"].append("Frame aspect ratio leaves insufficient optical-flow resolution.")
        return results
    frame1 = cv2.resize(frame1, target_size)
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
        cap.release()
        results["warnings"].append("No face detected; a central-image flow score cannot substitute for facial motion evidence.")
        return results

    if roi_x2 <= roi_x1 or roi_y2 <= roi_y1:
        cap.release()
        results["warnings"].append("No valid motion region.")
        return results

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
            
        frame2 = cv2.resize(frame2, target_size)
        next_gray = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Calculate dense optical flow using DIS
        flow = dis.calc(prvs, next_gray, None)
        if flow is None or not np.isfinite(flow).all():
            cap.release()
            results["warnings"].append("Optical flow returned invalid displacement vectors.")
            return results
        
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
        if frame_count == 1 or frame_count == max_frames // 2:
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
    results["available"] = True
    results["score_available"] = True
    results["eligible_for_fusion"] = True
    results["analyzed_frame_pairs"] = len(motion_variances)
    results["processing_size"] = list(target_size)
    results["roi_mode"] = "fixed_initial_face_box"
    results["mean_motion_variance"] = float(round(mean_var, 3))
    
    # Generate Explanation
    explanation = {
        "what_happened": "Measured DIS optical-flow magnitude variance within the initial detected face box across consecutive frames.",
        "result": "Lower motion-variance heuristic" if anomaly_score < 0.5 else "Elevated motion-variance heuristic",
        "why_it_happened": "This is an uncalibrated motion descriptor, not a DIS deepfake classifier. Real head movement, a face leaving the fixed box, camera motion, cuts, lighting changes and compression can raise variance.",
        "variables": {
            "Mean Motion Variance": f"{mean_var:.3f}",
            "Variance of Variances (Jitter)": f"{var_of_vars:.2f}",
            "Anomaly Score": f"{anomaly_score:.2f}"
        }
    }
    results["explanation"] = explanation
    
    # Plot Variance over time
    fig = Figure(figsize=(8, 3), facecolor='#0f172a')
    ax = fig.subplots()
    ax.set_facecolor('#0f172a')
    
    ax.plot(motion_variances, color='#10b981', linewidth=2)
    ax.set_title('Temporal Motion Variance (Jitter)', color='white', pad=10)
    ax.set_xlabel('Frame Index', color='#94a3b8')
    ax.set_ylabel('Variance', color='#94a3b8')
    ax.tick_params(colors='#94a3b8')
    ax.grid(True, color='#1e293b', alpha=0.6)
    
    plot_path = os.path.join(output_dir, f"{prefix}_plot.png")
    save_optimized_figure(plot_path, fig)
    
    results["flow_plot_path"] = plot_path.replace("\\", "/")
    
    # Save the flow field image
    if 'bgr_flow' in locals():
        flow_img_path = os.path.join(output_dir, f"{prefix}_field.jpg")
        save_optimized_image(flow_img_path, bgr_flow)
        results["flow_field_path"] = flow_img_path.replace("\\", "/")
    
    return results
