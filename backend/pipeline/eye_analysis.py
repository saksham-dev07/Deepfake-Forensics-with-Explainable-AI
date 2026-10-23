import cv2
import numpy as np
import mediapipe as mp
import os
from matplotlib.figure import Figure
from pipeline.image_utils import save_optimized_figure

def calculate_ear(eye_landmarks, landmarks, image_shape=None):
    """
    Calculate Eye Aspect Ratio (EAR).
    eye_landmarks: indices of the eye landmarks [p1, p2, p3, p4, p5, p6]
                   p1: left corner, p4: right corner
                   p2, p3: top, p5, p6: bottom
    """
    p1 = np.array([landmarks[eye_landmarks[0]].x, landmarks[eye_landmarks[0]].y])
    p2 = np.array([landmarks[eye_landmarks[1]].x, landmarks[eye_landmarks[1]].y])
    p3 = np.array([landmarks[eye_landmarks[2]].x, landmarks[eye_landmarks[2]].y])
    p4 = np.array([landmarks[eye_landmarks[3]].x, landmarks[eye_landmarks[3]].y])
    p5 = np.array([landmarks[eye_landmarks[4]].x, landmarks[eye_landmarks[4]].y])
    p6 = np.array([landmarks[eye_landmarks[5]].x, landmarks[eye_landmarks[5]].y])

    if image_shape is not None:
        height, width = image_shape[:2]
        p1, p2, p3, p4, p5, p6 = [p * [width, height] for p in (p1, p2, p3, p4, p5, p6)]

    # Vertical distances
    v1 = np.linalg.norm(p2 - p6)
    v2 = np.linalg.norm(p3 - p5)
    # Horizontal distance
    h = np.linalg.norm(p1 - p4)

    # A collapsed landmark span is missing geometry, not a closed eye.
    return float((v1 + v2) / (2.0 * h)) if np.isfinite(h) and h > 1e-6 else np.nan

def analyze_eye_movements(video_path, output_dir, prefix="eye"):
    """
    Analyzes eye blinking frequency and gaze symmetry over time using MediaPipe.
    """
    results = {
        "available": False,
        "score_available": False,
        "eligible_for_fusion": False,
        "score_calibrated": False,
        "score_kind": "heuristic",
        "eye_anomaly_score": 0.5,
        "blink_count": 0,
        "blink_rate_per_min": 0.0,
        "gaze_asymmetry": None,
        "eye_plot_path": "",
        "warnings": []
    }

    if not video_path or not os.path.exists(video_path):
        results["error"] = "Missing video file"
        return results

    from pipeline.face_geometry import get_landmarker
    
    try:
        detector = get_landmarker()
    except Exception as e:
        results["error"] = f"Failed to load MediaPipe model: {e}"
        return results

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not np.isfinite(fps) or fps <= 0:
        cap.release()
        results["warnings"].append("A known positive frame rate is required to measure blink duration and rate.")
        return results

    # MediaPipe Face Mesh landmark indices for eyes
    # Right eye (user's right) -> Image left
    RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144]
    # Left eye (user's left) -> Image right
    LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380]

    ear_sequence = []
    left_ear_seq = []
    right_ear_seq = []
    
    # Analyze up to 15 seconds
    max_frames = min(450, int(fps * 15))
    frame_count = 0

    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        
        detection_result = detector.detect(mp_image)
        
        if detection_result.face_landmarks:
            landmarks = detection_result.face_landmarks[0]
            
            left_ear = calculate_ear(LEFT_EYE_IDX, landmarks, frame.shape)
            right_ear = calculate_ear(RIGHT_EYE_IDX, landmarks, frame.shape)
            
            avg_ear = (left_ear + right_ear) / 2.0
            
            left_ear_seq.append(left_ear)
            right_ear_seq.append(right_ear)
            ear_sequence.append(avg_ear)
        else:
            ear_sequence.append(np.nan)
            left_ear_seq.append(np.nan)
            right_ear_seq.append(np.nan)

        frame_count += 1
        
    cap.release()

    valid = np.isfinite(ear_sequence)
    results["valid_frame_count"] = int(valid.sum())
    if not len(valid) or valid.sum() < int(fps * 2) or valid.mean() < 0.8: # Need at least 2 seconds
        results["warnings"].append("Insufficient visible face observations for blink analysis (requires 2 seconds and 80% coverage).")
        return results

    # 1. Blink Detection
    # A blink is typically a sharp drop in the Eye Aspect Ratio.
    # We dynamically calculate the threshold based on the user's natural resting EAR
    ear_array = np.array(ear_sequence)
    resting_ear = np.nanmedian(ear_array)  # Median ignores the blink outliers
    
    # A blink must be a significant relative drop (80% of resting) AND an absolute drop (-0.03)
    # This ensures we don't trigger false blinks on tiny landmark jitters, 
    # but successfully detect blinks for ALL eye shapes (narrow or wide).
    threshold = min(resting_ear * 0.80, resting_ear - 0.03)
    
    # Generous absolute safety bounds to prevent edge-case failures
    threshold = np.clip(threshold, 0.05, 0.35)

    blinks = 0
    in_blink = False
    was_open = False
    
    for ear_val in ear_sequence:
        if not np.isfinite(ear_val):
            in_blink = False
            was_open = False
            continue
        if ear_val < threshold:
            if was_open:
                in_blink = True
        else:
            # Count complete observed open/closed/open events. An initial
            # closure, a cut, or a tracking gap cannot establish a blink.
            if in_blink:
                blinks += 1
            in_blink = False
            was_open = True
            
    video_duration_min = int(valid.sum()) / (fps * 60.0)
    blink_rate = blinks / video_duration_min if video_duration_min > 0 else 0
    
    # 2. Bilateral eyelid-openness correlation. EAR does not measure gaze.
    left_valid = np.asarray(left_ear_seq)[valid]
    right_valid = np.asarray(right_ear_seq)[valid]
    if len(left_valid) > 1 and np.std(left_valid) > 1e-5 and np.std(right_valid) > 1e-5:
        correlation = np.corrcoef(left_valid, right_valid)[0, 1]
        gaze_asymmetry = float(1.0 - max(0, correlation)) if np.isfinite(correlation) else None
    else:
        gaze_asymmetry = None
    
    # Scoring
    anomaly_score = 0.1
    
    # Retained legacy rule thresholds, not a validated deepfake probability.
    if blink_rate < 5.0 and video_duration_min > 0.1:  # Only penalize if video is > 6 seconds
        anomaly_score = max(anomaly_score, 0.70)
        results["warnings"].append(f"Low observed blink rate ({blink_rate:.1f} blinks/min); short observations and attention can also cause this.")
    elif blink_rate > 45.0:
        anomaly_score = max(anomaly_score, 0.85)
        results["warnings"].append(f"High observed blink rate ({blink_rate:.1f} blinks/min); this is not specific to synthesis.")
        
    # High asymmetry (uncorrelated eyes) is a huge red flag
    if gaze_asymmetry is not None and gaze_asymmetry > 0.4:
        anomaly_score = max(anomaly_score, 0.90)
        results["warnings"].append("Low bilateral eyelid-openness correlation; pose, occlusion and landmark noise can also cause this.")
    elif gaze_asymmetry is not None and gaze_asymmetry > 0.25:
        anomaly_score = max(anomaly_score, 0.60)
        
    results["available"] = True
    results["score_available"] = video_duration_min > 0.1
    results["eligible_for_fusion"] = results["score_available"]
    if not results["score_available"]:
        results["warnings"].append("At most six seconds of observed eye data: blink/openness metrics are descriptive; the anomaly rule is unavailable.")
    results["eye_anomaly_score"] = float(anomaly_score)
    results["blink_count"] = int(blinks)
    results["blink_rate_per_min"] = float(round(blink_rate, 1))
    results["gaze_asymmetry"] = round(gaze_asymmetry, 3) if gaze_asymmetry is not None else None
    results["observed_duration_seconds"] = round(int(valid.sum()) / fps, 3)
    results["asymmetry_measure"] = "eyelid_openness_correlation_not_gaze"
    
    # Generate Explanation
    explanation = {
        "what_happened": "Measured complete eyelid closures and bilateral eye-openness correlation using Eye Aspect Ratio (EAR). Gaze direction was not estimated.",
        "result": "Lower blink/openness heuristic score" if anomaly_score < 0.5 else "Elevated blink/openness heuristic score",
        "why_it_happened": "Blink statistics depend on attention, health, pose, visibility and duration. Landmark noise can affect both measures; they do not establish authenticity or diagnose an eye condition.",
        "variables": {
            "Blinks Detected": int(blinks),
            "Blink Rate (per min)": f"{blink_rate:.1f}",
            "Eyelid Openness Asymmetry": f"{gaze_asymmetry:.3f}" if gaze_asymmetry is not None else "Unavailable (insufficient variation)",
            "Anomaly Score": f"{anomaly_score:.2f}"
        }
    }
    results["explanation"] = explanation
    
    # Generate Plot
    fig = Figure(figsize=(8, 3), facecolor='#0f172a')
    ax = fig.subplots()
    ax.set_facecolor('#0f172a')
    
    time_axis = np.arange(len(ear_sequence)) / fps
    
    ax.plot(time_axis, left_ear_seq, label='Left Eye', color='#3b82f6', alpha=0.8, linewidth=1.5)
    ax.plot(time_axis, right_ear_seq, label='Right Eye', color='#ef4444', alpha=0.8, linewidth=1.5)
    
    ax.axhline(y=threshold, color='white', linestyle='--', alpha=0.5, label='Blink Threshold')
    
    ax.set_title('Eye Aspect Ratio (EAR) Over Time', color='white', pad=10)
    ax.set_xlabel('Time (seconds)', color='#94a3b8')
    ax.set_ylabel('EAR', color='#94a3b8')
    ax.tick_params(colors='#94a3b8')
    ax.legend(loc='upper right', facecolor='#1e293b', edgecolor='none', labelcolor='white')
    ax.grid(True, color='#1e293b', alpha=0.6)
    
    plot_path = os.path.join(output_dir, f"{prefix}_plot.png")
    save_optimized_figure(plot_path, fig)
    
    results["eye_plot_path"] = plot_path.replace("\\", "/")
    
    return results
