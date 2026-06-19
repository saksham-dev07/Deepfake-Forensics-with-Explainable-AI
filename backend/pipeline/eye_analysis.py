import cv2
import numpy as np
import mediapipe as mp
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def calculate_ear(eye_landmarks, landmarks):
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

    # Vertical distances
    v1 = np.linalg.norm(p2 - p6)
    v2 = np.linalg.norm(p3 - p5)
    # Horizontal distance
    h = np.linalg.norm(p1 - p4)

    ear = (v1 + v2) / (2.0 * h + 1e-6)
    return ear

def analyze_eye_movements(video_path, output_dir, prefix="eye"):
    """
    Analyzes eye blinking frequency and gaze symmetry over time using MediaPipe.
    """
    results = {
        "eye_anomaly_score": 0.5,
        "blink_count": 0,
        "blink_rate_per_min": 0.0,
        "gaze_asymmetry": 0.0,
        "eye_plot_path": "",
        "warnings": []
    }

    if not video_path or not os.path.exists(video_path):
        results["error"] = "Missing video file"
        return results

    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    
    # Use the local model file
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'weights', 'face_landmarker.task')
    base_options = mp_python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    
    try:
        detector = vision.FaceLandmarker.create_from_options(options)
    except Exception as e:
        results["error"] = f"Failed to load MediaPipe model: {e}"
        return results

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or np.isnan(fps): 
        fps = 30.0

    # MediaPipe Face Mesh landmark indices for eyes
    # Right eye (user's right) -> Image left
    RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144]
    # Left eye (user's left) -> Image right
    LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380]

    ear_sequence = []
    left_ear_seq = []
    right_ear_seq = []
    
    # Analyze up to 15 seconds
    max_frames = int(fps * 15)
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
            
            left_ear = calculate_ear(LEFT_EYE_IDX, landmarks)
            right_ear = calculate_ear(RIGHT_EYE_IDX, landmarks)
            
            avg_ear = (left_ear + right_ear) / 2.0
            
            left_ear_seq.append(left_ear)
            right_ear_seq.append(right_ear)
            ear_sequence.append(avg_ear)
        else:
            if ear_sequence:
                ear_sequence.append(ear_sequence[-1])
                left_ear_seq.append(left_ear_seq[-1])
                right_ear_seq.append(right_ear_seq[-1])
            else:
                ear_sequence.append(0.3)
                left_ear_seq.append(0.3)
                right_ear_seq.append(0.3)
                
        frame_count += 1
        
    cap.release()
    detector.close()

    if len(ear_sequence) < int(fps * 2): # Need at least 2 seconds
        results["warnings"].append("Video too short for robust blink analysis.")
        return results

    # 1. Blink Detection
    # A blink is typically a sharp drop in the Eye Aspect Ratio.
    # We dynamically calculate the threshold based on the user's natural resting EAR
    ear_array = np.array(ear_sequence)
    resting_ear = np.median(ear_array)  # Median ignores the blink outliers
    
    # A blink must be a significant relative drop (80% of resting) AND an absolute drop (-0.03)
    # This ensures we don't trigger false blinks on tiny landmark jitters, 
    # but successfully detect blinks for ALL eye shapes (narrow or wide).
    threshold = min(resting_ear * 0.80, resting_ear - 0.03)
    
    # Generous absolute safety bounds to prevent edge-case failures
    threshold = np.clip(threshold, 0.05, 0.35)

    blinks = 0
    in_blink = False
    
    for ear_val in ear_sequence:
        if ear_val < threshold:
            if not in_blink:
                in_blink = True
                blinks += 1
        else:
            in_blink = False
            
    video_duration_min = len(ear_sequence) / (fps * 60.0)
    blink_rate = blinks / video_duration_min if video_duration_min > 0 else 0
    
    # 2. Gaze Asymmetry (Left vs Right eye openness correlation)
    # Natural human eyes blink synchronously and have similar openness.
    # Deepfakes often have "lazy eye" where one eye drops but the other doesn't.
    correlation = np.corrcoef(left_ear_seq, right_ear_seq)[0, 1]
    if np.isnan(correlation):
        correlation = 1.0
        
    gaze_asymmetry = 1.0 - max(0, correlation)
    
    # Scoring
    anomaly_score = 0.1
    
    # Normal human blink rate: 10-20 blinks per minute
    # Deepfakes often blink too little (0-5) or way too fast (glitching)
    if blink_rate < 5.0 and video_duration_min > 0.1:  # Only penalize if video is > 6 seconds
        anomaly_score = max(anomaly_score, 0.70)
        results["warnings"].append(f"Unnaturally low blink rate ({blink_rate:.1f} blinks/min)")
    elif blink_rate > 45.0:
        anomaly_score = max(anomaly_score, 0.85)
        results["warnings"].append(f"Unnaturally high blink rate / glitching ({blink_rate:.1f} blinks/min)")
        
    # High asymmetry (uncorrelated eyes) is a huge red flag
    if gaze_asymmetry > 0.4:
        anomaly_score = max(anomaly_score, 0.90)
        results["warnings"].append("High gaze asymmetry ('lazy eye' deepfake artifact)")
    elif gaze_asymmetry > 0.25:
        anomaly_score = max(anomaly_score, 0.60)
        
    results["eye_anomaly_score"] = float(anomaly_score)
    results["blink_count"] = int(blinks)
    results["blink_rate_per_min"] = float(round(blink_rate, 1))
    results["gaze_asymmetry"] = float(round(gaze_asymmetry, 3))
    
    # Generate Plot
    plt.figure(figsize=(8, 3))
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(8, 3), facecolor='#0f172a')
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
    plt.tight_layout()
    plt.savefig(plot_path, dpi=120, bbox_inches='tight', facecolor='#0f172a')
    plt.close('all')
    
    results["eye_plot_path"] = plot_path.replace("\\", "/")
    
    return results
