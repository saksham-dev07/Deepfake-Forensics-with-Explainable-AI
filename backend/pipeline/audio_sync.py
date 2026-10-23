import cv2
import os
import numpy as np
import librosa
from matplotlib.figure import Figure
from pipeline.image_utils import save_optimized_figure
import threading
import torch
from .SyncNetModel import S
import mediapipe as mp

_syncnet_model = None
_syncnet_lock = threading.Lock()

def _syncnet_mfcc(y):
    """Original SyncNet PCM/MFCC contract, using existing NumPy and SciPy."""
    from scipy.fft import dct

    samples = np.asarray(y, dtype=np.float64) * 32768.0
    if samples.size == 0 or not np.isfinite(samples).all():
        raise ValueError("SyncNet requires finite nonempty audio")
    emphasized = np.append(samples[0], samples[1:] - 0.97 * samples[:-1])
    count = max(1, 1 + int(np.ceil((len(samples) - 400) / 160)))
    padded = np.pad(emphasized, (0, (count - 1) * 160 + 400 - len(samples)))
    frames = np.lib.stride_tricks.sliding_window_view(padded, 400)[::160]
    power = np.abs(np.fft.rfft(frames, n=512)) ** 2 / 512.0
    mel_edges = np.linspace(0, 2595 * np.log10(1 + 8000 / 700), 28)
    bins = np.floor(513 * (700 * (10 ** (mel_edges / 2595) - 1)) / 16000)
    frequencies = np.arange(257)[None, :]
    rising = (frequencies - bins[:-2, None]) / (bins[1:-1] - bins[:-2])[:, None]
    falling = (bins[2:, None] - frequencies) / (bins[2:] - bins[1:-1])[:, None]
    filters = np.maximum(0, np.minimum(rising, falling))
    epsilon = np.finfo(float).eps
    features = dct(np.log(np.maximum(power @ filters.T, epsilon)), type=2, axis=1, norm='ortho')[:, :13]
    features *= 1 + 11 * np.sin(np.pi * np.arange(13) / 22)
    features[:, 0] = np.log(np.maximum(power.sum(axis=1), epsilon))
    return features.T.astype(np.float32)


def get_mfccs(audio_path, start_time, duration, fps=25):
    # Load audio segment
    y, sr = librosa.load(audio_path, sr=16000, offset=start_time, duration=duration)
    # SyncNet expects 100Hz audio feature rate. sr=16000, hop_length=160 -> 100fps
    mfcc = _syncnet_mfcc(y)
    return mfcc

def extract_audio_windows(audio_path, video_fps, total_frames):
    # We need 0.2 seconds of audio for every 5 frames of video
    # SyncNet expects 20 time steps of 13 MFCCs.
    if not np.isfinite(video_fps) or video_fps <= 0:
        raise ValueError("video_fps must be finite and positive")
    y, sr = librosa.load(audio_path, sr=16000, duration=total_frames / video_fps)
    mfcc = _syncnet_mfcc(y)
    
    # 1 video frame = 1 / video_fps seconds
    # Audio rate = 100 Hz. 1 video frame = 100 / video_fps audio frames
    audio_frames_per_video_frame = 100.0 / video_fps
    
    windows = []
    for i in range(max(0, total_frames - 4)):
        start_idx = int(i * audio_frames_per_video_frame)
        end_idx = start_idx + 20
        if end_idx <= mfcc.shape[1]:
            windows.append(mfcc[:, start_idx:end_idx])
        else:
            break
    return windows

def get_mouth_roi(frame, landmarks):
    """Use the official evaluator's padded face crop, with landmark bounds.

    Its 224-pixel checkpoint consumes more than a tightly cropped mouth. Keep
    square geometry at image borders using neutral padding instead of stretching.
    """
    h, w = frame.shape[:2]
    points = np.asarray([(lm.x * w, lm.y * h) for lm in landmarks])
    if points.size == 0 or not np.isfinite(points).all():
        return None
    low, high = points.min(axis=0), points.max(axis=0)
    half = float(np.max(high - low) / 2)
    if half < 1 or high[0] <= 0 or high[1] <= 0 or low[0] >= w or low[1] >= h:
        return None
    cx, cy = (low + high) / 2
    # Official crop_scale=0.40: face plus context below/around the mouth.
    x1, y1 = int(np.floor(cx - 1.4 * half)), int(np.floor(cy - half))
    size = max(1, int(np.ceil(2.8 * half)))
    x2, y2 = x1 + size, y1 + size
    # Invalid/extreme detections must not allocate unbounded padded images.
    if size > 3 * max(h, w):
        return None
    roi = np.full((size, size, 3), 110, dtype=frame.dtype)
    ix1, iy1, ix2, iy2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
    if ix2 <= ix1 or iy2 <= iy1:
        return None
    roi[iy1-y1:iy2-y1, ix1-x1:ix2-x1] = frame[iy1:iy2, ix1:ix2]
    if roi.size == 0:
        return None
    return cv2.resize(roi, (224, 224))


def _offset_distance_curve(video_features, audio_features, video_indices, max_shift=10):
    """Compare the same observed video windows at every audio offset.

    Missing mouth observations retain their original time indices. Common
    support avoids introducing artificial zero embeddings at clip boundaries.
    Positive audio shifts pair video[i] with audio[i+shift].
    """
    indices = np.asarray(video_indices, dtype=int)
    usable = (indices >= max_shift) & (indices < len(audio_features) - max_shift)
    if np.count_nonzero(usable) < 10:
        raise ValueError("Insufficient common windows for the temporal-offset search")
    visual = np.asarray(video_features)[usable]
    indices = indices[usable]
    shifts = np.arange(-max_shift, max_shift + 1)
    distances = np.asarray([np.linalg.norm(visual - audio_features[indices + shift], axis=1).mean()
                            for shift in shifts])
    if not np.isfinite(distances).all():
        raise ValueError("SyncNet returned non-finite offset distances")
    return shifts, distances, len(indices)

def analyze_audio_visual_sync(video_path, audio_path, output_dir, prefix="sync"):
    results = {"sync_score": 0.5, "available": False, "score_available": False,
               "eligible_for_fusion": False, "score_calibrated": False,
               "speech_verified": False, "lse_d": None, "lse_c": None,
               "correlation": None, "warnings": []}
    
    if not audio_path or not video_path or not os.path.exists(audio_path) or not os.path.exists(video_path):
        results["error"] = "Missing audio or video file"
        return results

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "syncnet_v2.model")
    
    if not os.path.exists(model_path):
        results["warnings"].append("SyncNet weights not found.")
        return results

    try:
        global _syncnet_model
        with _syncnet_lock:
            if _syncnet_model is None:
                candidate = S(num_layers_in_fc_layers=1024)
                candidate.load_state_dict(torch.load(model_path, map_location=device, weights_only=True))
                candidate.eval()
                candidate.to(device)
                _syncnet_model = candidate
        model = _syncnet_model
    except Exception as e:
        results["warnings"].append(f"Failed to load SyncNet: {e}")
        return results

    from pipeline.face_geometry import get_landmarker
    detector = get_landmarker()

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not np.isfinite(fps) or fps <= 0:
        cap.release()
        results["warnings"].append("Unknown video frame rate; temporal synchronization cannot be measured.")
        return results

    # Sample a fixed 25 Hz timeline: five video frames correspond to 200 ms.
    video_frames = []
    max_frames = int(fps * 15)
    frame_count = 0
    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        # Upsample or downsample on the source timeline without changing audio time.
        if (frame_count + 1) / fps > len(video_frames) / 25.0:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            detection = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
            roi = get_mouth_roi(frame, detection.face_landmarks[0]) if detection.face_landmarks else None
            while len(video_frames) < 375 and len(video_frames) / 25.0 < (frame_count + 1) / fps:
                video_frames.append(roi)
        frame_count += 1

    cap.release()
    # Removed detector.close() to keep it cached globally

    if len(video_frames) < 15:
        results["error"] = "Video too short for SyncNet"
        return results

    audio_windows = extract_audio_windows(audio_path, 25, len(video_frames))
    valid_indices = [i for i in range(len(audio_windows))
                     if len(video_frames[i:i+5]) == 5
                     and all(frame is not None for frame in video_frames[i:i+5])]
    if len(valid_indices) < 10:
        results["warnings"].append("Insufficient visible mouth windows for SyncNet.")
        return results

    # Materialize only one small batch, rather than every overlapping float window.
    audio_features, video_features = [], []
    with torch.inference_mode():
        for start in range(0, len(audio_windows), 8):
            a = torch.from_numpy(np.asarray(audio_windows[start:start+8], dtype=np.float32)).unsqueeze(1).to(device)
            audio_features.extend(model.forward_aud(a).cpu().numpy())
        for start in range(0, len(valid_indices), 8):
            indices = valid_indices[start:start+8]
            v = np.asarray([video_frames[i:i+5] for i in indices], dtype=np.float32)
            v = torch.from_numpy(v.transpose(0, 4, 1, 2, 3)).to(device)
            video_features.extend(model.forward_lip(v).cpu().numpy())
    audio_features, video_features = np.asarray(audio_features), np.asarray(video_features)
    all_distances = np.linalg.norm(video_features - audio_features[valid_indices], axis=1)
    if not np.isfinite(all_distances).all():
        results["warnings"].append("SyncNet returned non-finite distances.")
        return results

    mean_dist = float(np.mean(all_distances))
    results.update(available=True, aligned_distance=mean_dist, observed_windows=len(valid_indices))
    try:
        shifts, distances, support = _offset_distance_curve(video_features, audio_features, valid_indices)
        best = int(np.argmin(distances))
        results.update(lse_d=float(distances[best]), lse_c=float(np.median(distances) - distances[best]),
                       offset_frames=int(-shifts[best]), offset_ms=int(-shifts[best]) * 40,
                       offset_search_frames=10, offset_support_windows=support)
        if np.ptp(distances) <= 1e-6:
            results["offset_frames"] = results["offset_ms"] = None
            results["warnings"].append("Flat offset-distance curve; no unique synchronization offset is identifiable.")
        elif best in (0, len(shifts)-1):
            results["warnings"].append("Best offset is at the search boundary; the true offset may lie outside +/-400 ms.")
    except ValueError as error:
        results["warnings"].append(str(error))
    results["warnings"].append("Synchronization measurements are not a calibrated deepfake score; speech, speaker tracking, and crop-domain applicability require validation. Excluded from combined scoring.")
    
    # Plot measured distances using a private figure.
    fig = Figure(figsize=(10, 4), facecolor='#111827')
    ax = fig.subplots()
    ax.set_facecolor('#111827')
    ax.plot(all_distances, color='#fb7185', linewidth=2)
    ax.set_title(f'SyncNet Aligned Distance (Mean: {mean_dist:.2f})', color='white', pad=15)
    ax.set_xlabel('Observed Window Index', color='white')
    ax.set_ylabel('L2 Distance', color='white')
    ax.tick_params(colors='gray')
    plot_path = os.path.join(output_dir, f"{prefix}_sync_plot.jpg")
    save_optimized_figure(plot_path, fig)
    results["sync_plot_path"] = plot_path.replace("\\", "/")
    
    results["explanation"] = {
        "what_happened": "Measured aligned embedding distances and, when enough common windows exist, searched audio offsets from -400 to +400 milliseconds.",
        "result": "Audio-Visual Synchronization Measurements",
        "why_it_happened": "Distance and offset confidence measure audiovisual correspondence. Dubbing, silence, multiple speakers, static faces, and preprocessing can affect them; they do not prove manipulation.",
        "variables": {
            "Aligned Distance": f"{mean_dist:.2f}",
            "LSE-D (Minimum Offset Distance)": results["lse_d"],
            "LSE-C (Median Minus Minimum)": results["lse_c"],
            "Estimated Offset (ms)": results.get("offset_ms")
        }
    }
    
    return results
