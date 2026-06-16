import cv2
import os
import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import mediapipe as mp

def analyze_audio_visual_sync(video_path, audio_path, output_dir, prefix="sync"):
    """
    Analyzes the correlation between audio energy and visual lip movements.
    This acts as a heuristic proxy for SyncNet, detecting Wav2Lip or 
    generic audio-visual desynchronization common in deepfakes.
    """
    if not audio_path or not video_path or not os.path.exists(audio_path) or not os.path.exists(video_path):
        return {"sync_score": 0.5, "error": "Missing audio or video file"}

    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    
    # Use the local model file we downloaded
    base_options = mp_python.BaseOptions(model_asset_path=os.path.join(os.path.dirname(__file__), '..', 'face_landmarker.task'))
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    detector = vision.FaceLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0: fps = 30 # fallback

    mar_sequence = []
    
    # Process max 10 seconds of video to keep it fast
    max_frames = int(fps * 10)
    frame_count = 0

    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
            
        # Convert the BGR image to RGB and format for MediaPipe
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        
        detection_result = detector.detect(mp_image)
        
        if detection_result.face_landmarks:
            landmarks = detection_result.face_landmarks[0]
            
            # Inner lip landmarks for Mouth Aspect Ratio (MAR)
            top_lip = landmarks[13]
            bottom_lip = landmarks[14]
            left_lip = landmarks[78]
            right_lip = landmarks[308]
            
            # Distance calculations
            vertical_dist = np.sqrt((top_lip.x - bottom_lip.x)**2 + (top_lip.y - bottom_lip.y)**2)
            horizontal_dist = np.sqrt((left_lip.x - right_lip.x)**2 + (left_lip.y - right_lip.y)**2)
            
            mar = vertical_dist / (horizontal_dist + 1e-6)
            mar_sequence.append(mar)
        else:
            # If no face is detected, append the last known MAR or 0
            mar_sequence.append(mar_sequence[-1] if mar_sequence else 0)
            
        frame_count += 1
        
    cap.release()
    detector.close()
    
    if len(mar_sequence) < 10:
        return {"sync_score": 0.5, "error": "Not enough frames with a face detected"}

    # Process Audio Envelope
    try:
        y, sr = librosa.load(audio_path, sr=None)
        # Compute MFCCs (Mel-frequency cepstral coefficients)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        # We use the 2nd MFCC (index 1), which highly correlates with phonetic vowel openness (Formant F1)
        # We take the negative absolute to align the peaks with mouth openings for easier visualization
        audio_feature = -np.abs(mfccs[1])
        
        # Resample audio feature to match the length of mar_sequence
        from scipy.interpolate import interp1d
        x_audio = np.linspace(0, 1, len(audio_feature))
        x_mar = np.linspace(0, 1, len(mar_sequence))
        
        interpolator = interp1d(x_audio, audio_feature, kind='linear', fill_value="extrapolate")
        audio_resampled = interpolator(x_mar)
        
        # Normalize both sequences to 0-1 for plotting and correlation
        mar_norm = (mar_sequence - np.min(mar_sequence)) / (np.ptp(mar_sequence) + 1e-6)
        audio_norm = (audio_resampled - np.min(audio_resampled)) / (np.ptp(audio_resampled) + 1e-6)
        
        # Smooth the sequences slightly using a moving average
        kernel_size = 3
        kernel = np.ones(kernel_size) / kernel_size
        mar_smooth = np.convolve(mar_norm, kernel, mode='same')
        audio_smooth = np.convolve(audio_norm, kernel, mode='same')
        
        # Calculate Pearson Correlation
        correlation = np.corrcoef(mar_smooth, audio_smooth)[0, 1]
        if np.isnan(correlation):
            correlation = 0.0
            
        # LSE-C Proxy: Map correlation (-1 to 1) to a confidence scale (0 to 10+)
        # LSE-C in paper is high (e.g. >7) for real videos
        lse_c = float(max(0, (correlation + 0.5) * 6.5))
        
        # LSE-D Proxy: Mean Squared Error between the normalized envelopes
        # LSE-D in paper is low (e.g. <6) for real videos
        mse = np.mean((mar_smooth - audio_smooth)**2)
        lse_d = float(mse * 25) # Scaled to match typical LSE-D ranges
            
    except Exception as e:
        print(f"Audio processing error: {e}")
        return {"sync_score": 0.5, "error": str(e)}

    # Generate Visualization Plot
    plt.figure(figsize=(10, 4), facecolor='#111827')
    ax = plt.gca()
    ax.set_facecolor('#111827')
    
    time_axis = np.arange(len(mar_smooth)) / fps
    
    plt.plot(time_axis, mar_smooth, color='#34d399', linewidth=2, label='Mouth Aspect Ratio (Visual)')
    plt.plot(time_axis, audio_smooth, color='#60a5fa', linewidth=2, linestyle='--', label='Audio MFCC (Phonetic Shape)')
    
    plt.title(f'Audio-Visual Synchronization (Correlation: {correlation:.3f})', color='white', pad=15)
    plt.xlabel('Time (seconds)', color='white')
    plt.ylabel('Normalized Magnitude', color='white')
    
    ax.tick_params(colors='gray')
    for spine in ax.spines.values():
        spine.set_color('#374151')
        
    legend = plt.legend(facecolor='#1f2937', edgecolor='#374151', labelcolor='white')
    plt.tight_layout()
    
    plot_path = os.path.join(output_dir, f"{prefix}_sync_plot.jpg")
    plt.savefig(plot_path, dpi=120, bbox_inches='tight')
    plt.close()

    # Convert correlation and distance to an anomaly score (0 to 1)
    if correlation > 0.3 and lse_d < 5.0:
        sync_score = 0.1 # Very real
    elif correlation > 0.1 and lse_d < 8.0:
        sync_score = 0.4
    elif correlation > -0.1:
        sync_score = 0.7
    else:
        sync_score = 0.95 # Highly suspicious
        
    return {
        "sync_score": sync_score,
        "correlation": float(correlation),
        "lse_c": lse_c,
        "lse_d": lse_d,
        "sync_plot_path": plot_path.replace("\\", "/")
    }
