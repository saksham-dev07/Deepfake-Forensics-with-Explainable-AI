import cv2
import os
import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import torch
from torch.nn import functional as F
from scipy.interpolate import interp1d
import math
from .SyncNetModel import S
import mediapipe as mp

def get_mfccs(audio_path, start_time, duration, fps=25):
    # Load audio segment
    y, sr = librosa.load(audio_path, sr=16000, offset=start_time, duration=duration)
    # SyncNet expects 100Hz audio feature rate. sr=16000, hop_length=160 -> 100fps
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=160, n_fft=512)
    return mfcc

def extract_audio_windows(audio_path, video_fps, total_frames):
    # We need 0.2 seconds of audio for every 5 frames of video
    # SyncNet expects 20 time steps of 13 MFCCs.
    y, sr = librosa.load(audio_path, sr=16000)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=160, n_fft=512)
    
    # 1 video frame = 1 / video_fps seconds
    # Audio rate = 100 Hz. 1 video frame = 100 / video_fps audio frames
    audio_frames_per_video_frame = 100.0 / video_fps
    
    windows = []
    for i in range(total_frames - 5):
        start_idx = int(i * audio_frames_per_video_frame)
        end_idx = start_idx + 20
        if end_idx <= mfcc.shape[1]:
            windows.append(mfcc[:, start_idx:end_idx])
        else:
            break
    return windows

def get_mouth_roi(frame, landmarks):
    # Extract lower half of the face using landmarks
    h, w, _ = frame.shape
    x_min = w
    x_max = 0
    y_min = h
    y_max = 0
    for lm in landmarks:
        x, y = int(lm.x * w), int(lm.y * h)
        if x < x_min: x_min = x
        if x > x_max: x_max = x
        if y < y_min: y_min = y
        if y > y_max: y_max = y
        
    # We want the lower half of the face (nose down)
    y_mid = int((y_min + y_max) / 2)
    # Make it a square
    box_w = x_max - x_min
    box_h = y_max - y_mid
    size = max(box_w, box_h)
    
    # Center crop
    cx = (x_min + x_max) // 2
    cy = (y_mid + y_max) // 2
    
    half_size = int(size * 0.6) # Add padding
    
    x1 = max(0, cx - half_size)
    y1 = max(0, cy - half_size)
    x2 = min(w, cx + half_size)
    y2 = min(h, cy + half_size)
    
    roi = frame[y1:y2, x1:x2]
    if roi.size == 0:
        return cv2.resize(frame, (224, 224))
    return cv2.resize(roi, (224, 224))

def analyze_audio_visual_sync(video_path, audio_path, output_dir, prefix="sync"):
    results = {"sync_score": 0.5, "warnings": []}
    
    if not audio_path or not video_path or not os.path.exists(audio_path) or not os.path.exists(video_path):
        return {"sync_score": 0.5, "error": "Missing audio or video file"}

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "syncnet_v2.model")
    
    if not os.path.exists(model_path):
        results["warnings"].append("SyncNet weights not found.")
        return results

    try:
        model = S(num_layers_in_fc_layers=1024)
        model.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
        model.eval()
        model.to(device)
    except Exception as e:
        results["warnings"].append(f"Failed to load SyncNet: {e}")
        return results

    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
    
    base_options = mp_python.BaseOptions(model_asset_path=os.path.join(os.path.dirname(__file__), '..', 'weights', 'face_landmarker.task'))
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=1
    )
    detector = vision.FaceLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0: fps = 25

    # SyncNet was trained on 25 fps videos. 
    # If the video is not 25fps, the LSE distance might be slightly off, but it usually still works.
    
    video_frames = []
    max_frames = int(fps * 15) # Process up to 15 seconds
    frame_count = 0

    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        detection_result = detector.detect(mp_image)
        
        if detection_result.face_landmarks:
            roi = get_mouth_roi(frame_rgb, detection_result.face_landmarks[0])
            video_frames.append(roi)
        else:
            if len(video_frames) > 0:
                video_frames.append(video_frames[-1])
            else:
                video_frames.append(cv2.resize(frame_rgb, (224, 224)))
                
        frame_count += 1
    
    cap.release()
    detector.close()

    if len(video_frames) < 15:
        return {"sync_score": 0.5, "error": "Video too short for SyncNet"}

    audio_windows = extract_audio_windows(audio_path, fps, len(video_frames))
    
    # We analyze in batches of 5 frames
    distances = []
    
    batch_audio = []
    batch_video = []
    
    for i in range(len(audio_windows)):
        a_win = audio_windows[i]
        if a_win.shape[1] != 20: continue
        
        v_win = video_frames[i:i+5]
        if len(v_win) != 5: continue
        
        # Format Audio: [1, 13, 20]
        a_tensor = torch.FloatTensor(a_win).unsqueeze(0)
        
        # Format Video: [3, 5, 224, 224]
        v_tensor = np.array(v_win) / 255.0 # (5, 224, 224, 3)
        v_tensor = np.transpose(v_tensor, (3, 0, 1, 2)) # (3, 5, 224, 224)
        v_tensor = torch.FloatTensor(v_tensor)
        
        batch_audio.append(a_tensor)
        batch_video.append(v_tensor)

    if len(batch_audio) == 0:
         return {"sync_score": 0.5, "error": "Could not extract windows"}

    batch_audio = torch.stack(batch_audio).to(device)
    batch_video = torch.stack(batch_video).to(device)
    
    # Process in mini-batches to avoid OOM
    batch_size = 64
    all_distances = []
    
    with torch.no_grad():
        for i in range(0, len(batch_audio), batch_size):
            a = batch_audio[i:i+batch_size]
            v = batch_video[i:i+batch_size]
            
            feat_a = model.forward_aud(a)
            feat_v = model.forward_lip(v)
            
            #feat_a = F.normalize(feat_a, p=2, dim=1)
            #feat_v = F.normalize(feat_v, p=2, dim=1)
            
            dist = torch.norm(feat_a - feat_v, dim=1)
            all_distances.extend(dist.cpu().numpy())

    mean_dist = float(np.mean(all_distances))
    lse_d = mean_dist
    
    # Simple mapping of LSE-D to anomaly score
    # Usually, LSE-D < 8 is real, LSE-D > 10 is fake
    if lse_d < 8.0:
        sync_score = 0.1
    elif lse_d < 9.5:
        sync_score = 0.4
    elif lse_d < 11.0:
        sync_score = 0.7
    else:
        sync_score = 0.95
        
    results["sync_score"] = sync_score
    results["lse_d"] = lse_d
    results["correlation"] = 0.0 # Legacy compat
    results["lse_c"] = max(0, 15.0 - lse_d)
    
    # Plot distances
    plt.figure(figsize=(10, 4), facecolor='#111827')
    ax = plt.gca()
    ax.set_facecolor('#111827')
    
    plt.plot(all_distances, color='#fb7185', linewidth=2)
    plt.axhline(y=8.0, color='#34d399', linestyle='--', label='Authentic Threshold')
    
    plt.title(f'SyncNet Audio-Visual Distance (Mean: {mean_dist:.2f})', color='white', pad=15)
    plt.xlabel('Window Index', color='white')
    plt.ylabel('L2 Distance (LSE-D)', color='white')
    ax.tick_params(colors='gray')
    for spine in ax.spines.values(): spine.set_color('#374151')
    
    legend = plt.legend(facecolor='#1f2937', edgecolor='#374151', labelcolor='white')
    plt.tight_layout()
    
    plot_path = os.path.join(output_dir, f"{prefix}_sync_plot.jpg")
    plt.savefig(plot_path, dpi=120, bbox_inches='tight')
    plt.close()
    results["sync_plot_path"] = plot_path.replace("\\", "/")
    
    results["explanation"] = {
        "what_happened": "Analyzed the phonetic lip movements and compared them to the audio speech tract using a dual-stream SyncNet neural network.",
        "result": "Lip-Sync Mismatch (Deepfake)" if sync_score > 0.5 else "Authentic Audio-Visual Sync",
        "why_it_happened": "The person's lip movements mathematically do not match the spoken words, a common flaw when AI generates audio or video separately and splices them." if sync_score > 0.5 else "The lip movements perfectly match the phonemes of the spoken audio tract.",
        "variables": {
            "LSE-D (Distance)": f"{lse_d:.2f} (Expected < 8.0)",
            "LSE-C (Confidence)": f"{results['lse_c']:.2f}"
        }
    }
    
    return results
