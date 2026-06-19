import cv2
import numpy as np
import os
from scipy.signal import butter, filtfilt, detrend
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pipeline.face_geometry import detect_face

def butter_bandpass(lowcut, highcut, fs, order=3):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return b, a

def extract_rppg_signal(video_path, output_dir, prefix="rppg"):
    """
    Extracts the Remote Photoplethysmography (rPPG) signal from a video.
    AI generated videos often lack the micro-color changes associated with a human pulse.
    """
    results = {
        "rppg_anomaly_score": 0.5,
        "has_pulse": False,
        "heart_rate": 0,
        "signal_plot_path": None,
        "warnings": [],
        "snr": 0.0
    }

    if not video_path.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        results["warnings"].append("rPPG (Pulse Detection) requires a video file. Skipped for static image.")
        return results

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or np.isnan(fps):
        fps = 30.0

    raw_signal = []
    frame_count = 0
    max_frames = 450 # 15 seconds max
    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        landmarks = detect_face(rgb_frame)

        if landmarks is not None:
            x, y, w, h = landmarks["face_bbox"]
            ih, iw = rgb_frame.shape[:2]
            
            # Simple bounding box (use inner region to avoid background noise)
            x_min = max(0, x + int(w * 0.2))
            x_max = min(iw, x + int(w * 0.8))
            y_min = max(0, y + int(h * 0.1))
            y_max = min(ih, y + int(h * 0.6))

            if x_max > x_min and y_max > y_min:
                face_crop = rgb_frame[y_min:y_max, x_min:x_max]
                g_channel = face_crop[:, :, 1]
                avg_g = np.mean(g_channel)
                raw_signal.append(avg_g)
            else:
                raw_signal.append(raw_signal[-1] if len(raw_signal) > 0 else 0)
        else:
            raw_signal.append(raw_signal[-1] if len(raw_signal) > 0 else 0)
        
        frame_count += 1

    cap.release()

    if len(raw_signal) < 60:
        results["warnings"].append("Video too short or face not found consistently for rPPG analysis.")
        return results

    # Process signal
    signal = np.array(raw_signal)
    
    # Detrend
    signal = detrend(signal)
    
    # Bandpass filter (0.7 Hz to 2.5 Hz = 42 to 150 BPM)
    try:
        b, a = butter_bandpass(0.7, 2.5, fps, order=3)
        filtered_signal = filtfilt(b, a, signal)
    except Exception as e:
        results["warnings"].append(f"Filtering error: {str(e)}")
        return results

    # FFT
    N = len(filtered_signal)
    fft_vals = np.fft.rfft(filtered_signal)
    fft_freqs = np.fft.rfftfreq(N, 1.0/fps)
    power = np.abs(fft_vals)**2

    # Find peak in the valid human range
    valid_idx = np.where((fft_freqs >= 0.7) & (fft_freqs <= 2.5))[0]
    if len(valid_idx) == 0:
         results["rppg_anomaly_score"] = 0.8
         return results
         
    valid_freqs = fft_freqs[valid_idx]
    valid_power = power[valid_idx]
    
    max_power_idx = np.argmax(valid_power)
    peak_freq = valid_freqs[max_power_idx]
    peak_power = valid_power[max_power_idx]
    
    mean_power = np.mean(valid_power)
    snr = peak_power / (mean_power + 1e-9)

    hr = int(peak_freq * 60)
    
    os.makedirs(output_dir, exist_ok=True)
    plot_path = os.path.join(output_dir, f"{prefix}_rppg_spectrum.jpg")
    
    plt.figure(figsize=(6, 3), facecolor='#0f172a')
    ax = plt.axes()
    ax.set_facecolor('#0f172a')
    plt.plot(valid_freqs * 60, valid_power, color='#22d3ee', linewidth=2)
    plt.axvline(x=hr, color='#f43f5e', linestyle='--', alpha=0.7)
    plt.title("rPPG Power Spectral Density (Pulse Signal)", color='white', fontsize=10)
    plt.xlabel("Heart Rate (BPM)", color='gray', fontsize=8)
    plt.ylabel("Power", color='gray', fontsize=8)
    ax.tick_params(colors='gray', labelsize=8)
    for spine in ax.spines.values():
        spine.set_color('#1e293b')
    plt.tight_layout()
    plt.savefig(plot_path, dpi=100, bbox_inches='tight', facecolor='#0f172a')
    plt.close()

    results["signal_plot_path"] = plot_path.replace("\\", "/")
    results["heart_rate"] = hr

    # If SNR > 2.5, it's a prominent peak
    if snr > 2.5:
        results["has_pulse"] = True
        results["rppg_anomaly_score"] = 0.10
    else:
        results["has_pulse"] = False
        results["rppg_anomaly_score"] = 0.85
        results["warnings"].append("No biological pulse detected. High probability of synthetic or static face.")

    results["snr"] = round(float(snr), 2)
    return results
