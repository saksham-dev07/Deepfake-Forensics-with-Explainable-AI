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
    
    tracker = None
    
    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        re, le, nose, rm, lm = None, None, None, None, None
        
        # Fast Face Tracking instead of re-detecting every frame
        if tracker is None:
            landmarks = detect_face(rgb_frame)
            if landmarks and "face_bbox" in landmarks:
                fx, fy, fw, fh = landmarks["face_bbox"]
                bbox = (max(0, fx), max(0, fy), max(1, fw), max(1, fh))
                try:
                    tracker = cv2.TrackerCSRT_create()
                    tracker.init(frame, bbox)
                except AttributeError:
                    tracker = "MediaPipe_Fallback"
                    
                re = landmarks.get("right_eye")
                le = landmarks.get("left_eye")
                nose = landmarks.get("nose_tip")
                rm = landmarks.get("right_mouth")
                lm = landmarks.get("left_mouth")
        else:
            if tracker == "MediaPipe_Fallback":
                landmarks = detect_face(rgb_frame)
                if landmarks:
                    re = landmarks.get("right_eye")
                    le = landmarks.get("left_eye")
                    nose = landmarks.get("nose_tip")
                    rm = landmarks.get("right_mouth")
                    lm = landmarks.get("left_mouth")
            else:
                success, bbox = tracker.update(frame)
                if success:
                    fx, fy, fw, fh = [int(v) for v in bbox]
                    re = (fx + int(fw*0.3), fy + int(fh*0.4))
                    le = (fx + int(fw*0.7), fy + int(fh*0.4))
                    nose = (fx + int(fw*0.5), fy + int(fh*0.6))
                    rm = (fx + int(fw*0.35), fy + int(fh*0.8))
                    lm = (fx + int(fw*0.65), fy + int(fh*0.8))
                else:
                    tracker = None

        if re and le and nose and rm and lm:
            mask = np.zeros(rgb_frame.shape[:2], dtype=np.uint8)
            # Right Cheek Polygon
            rc_poly = np.array([
                (re[0] - int((nose[0] - re[0])*0.5), re[1] + int((nose[1]-re[1])*0.5)),
                (nose[0] - int((nose[0] - re[0])*0.2), nose[1]),
                (rm[0] - int((nose[0] - re[0])*0.2), rm[1]),
                (rm[0] - int((nose[0] - re[0])*0.5), rm[1] - int((rm[1]-nose[1])*0.5))
            ], np.int32)
            
            # Left Cheek Polygon
            lc_poly = np.array([
                (le[0] + int((le[0] - nose[0])*0.5), le[1] + int((nose[1]-le[1])*0.5)),
                (nose[0] + int((le[0] - nose[0])*0.2), nose[1]),
                (lm[0] + int((le[0] - nose[0])*0.2), lm[1]),
                (lm[0] + int((le[0] - nose[0])*0.5), lm[1] - int((lm[1]-nose[1])*0.5))
            ], np.int32)
            
            # Forehead Polygon
            fh_poly = np.array([
                (re[0], re[1] - int((nose[1]-re[1])*0.8)),
                (le[0], le[1] - int((nose[1]-le[1])*0.8)),
                (le[0], le[1] - int((nose[1]-le[1])*1.5)),
                (re[0], re[1] - int((nose[1]-re[1])*1.5))
            ], np.int32)
            
            cv2.fillPoly(mask, [rc_poly, lc_poly, fh_poly], 255)
            
            # Extract mean of R, G, B channels in mask
            mean_rgb = cv2.mean(rgb_frame, mask=mask)[:3] # (R, G, B)
            if sum(mean_rgb) > 0:
                raw_signal.append(mean_rgb)
            else:
                raw_signal.append(raw_signal[-1] if len(raw_signal) > 0 else (0,0,0))
        else:
            raw_signal.append(raw_signal[-1] if len(raw_signal) > 0 else (0,0,0))
        
        frame_count += 1

    cap.release()

    if len(raw_signal) < 60:
        results["warnings"].append("Video too short or face not found consistently for rPPG analysis.")
        return results

    # Process CHROM signal
    signal_rgb = np.array(raw_signal) # shape (N, 3)
    
    # Detrend each channel
    R = detrend(signal_rgb[:, 0])
    G = detrend(signal_rgb[:, 1])
    B = detrend(signal_rgb[:, 2])
    
    # Bandpass filter each channel (0.7 Hz to 2.5 Hz = 42 to 150 BPM)
    try:
        b, a = butter_bandpass(0.7, 2.5, fps, order=3)
        R_f = filtfilt(b, a, R)
        G_f = filtfilt(b, a, G)
        B_f = filtfilt(b, a, B)
        
        # CHROM rPPG Projection
        X_comp = 3 * R_f - 2 * G_f
        Y_comp = 1.5 * R_f + G_f - 1.5 * B_f
        
        std_X = np.std(X_comp)
        std_Y = np.std(Y_comp)
        alpha = std_X / (std_Y + 1e-9)
        
        filtered_signal = X_comp - alpha * Y_comp
    except Exception as e:
        results["warnings"].append(f"Filtering error: {str(e)}")
        return results

    # Normalize filtered signal for plotting
    norm_filtered = (filtered_signal - np.mean(filtered_signal)) / (np.std(filtered_signal) + 1e-9)

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
    
    # ── DUAL-PANEL PLOT ──
    from matplotlib.figure import Figure
    from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas

    fig = Figure(figsize=(8, 6), facecolor='#0f172a')
    canvas = FigureCanvas(fig)
    ax1, ax2 = fig.subplots(2, 1, gridspec_kw={'height_ratios': [1, 1.5]})
    
    # Panel 1: Waveform
    time_axis = np.arange(len(norm_filtered)) / fps
    ax1.set_facecolor('#0f172a')
    ax1.plot(time_axis, norm_filtered, color='#34d399', linewidth=1.5)
    ax1.set_title("Filtered rPPG Waveform (Cheeks/Forehead)", color='white', fontsize=11, pad=10)
    ax1.set_xlabel("Time (s)", color='#94a3b8', fontsize=9)
    ax1.set_ylabel("Amplitude", color='#94a3b8', fontsize=9)
    ax1.tick_params(colors='#94a3b8', labelsize=8)
    for spine in ax1.spines.values(): spine.set_color('#1e293b')
    ax1.grid(True, color='#1e293b', linestyle='--', alpha=0.5)

    # Panel 2: Spectrum
    ax2.set_facecolor('#0f172a')
    ax2.plot(valid_freqs * 60, valid_power, color='#38bdf8', linewidth=2)
    ax2.axvline(x=hr, color='#fb7185', linestyle='--', alpha=0.9, label=f'Peak: {hr} BPM')
    ax2.set_title("Power Spectral Density (Heart Rate)", color='white', fontsize=11, pad=10)
    ax2.set_xlabel("Heart Rate (BPM)", color='#94a3b8', fontsize=9)
    ax2.set_ylabel("Power", color='#94a3b8', fontsize=9)
    ax2.tick_params(colors='#94a3b8', labelsize=8)
    ax2.legend(facecolor='#0f172a', edgecolor='#1e293b', labelcolor='white')
    for spine in ax2.spines.values(): spine.set_color('#1e293b')
    ax2.grid(True, color='#1e293b', linestyle='--', alpha=0.5)

    fig.tight_layout()
    canvas.print_figure(plot_path, dpi=120, bbox_inches='tight', facecolor='#0f172a')

    results["signal_plot_path"] = plot_path.replace("\\", "/")
    results["heart_rate"] = hr

    # Calculate dynamic penalty based on SNR
    # Real rPPG signals have sharp, defined peaks in the human heartbeat range (SNR > 4.0)
    # AI generated faces have uniform noise (SNR < 2.0)
    if snr < 1.5:
        # No distinct heartbeat found
        results["rppg_anomaly_score"] = 0.95
        results["has_pulse"] = False
        results["warnings"].append("No biological pulse detected (SNR critically low). Potential AI generation.")
    elif snr < 3.0:
        # Weak or noisy heartbeat
        results["rppg_anomaly_score"] = 0.70
        results["has_pulse"] = True
        results["warnings"].append("Weak pulse detected. Could be due to poor lighting or mild synthesis.")
    else:
        # Strong, consistent heartbeat
        results["has_pulse"] = True
        results["rppg_anomaly_score"] = 0.15

    results["snr"] = round(float(snr), 2)
    results["heart_rate"] = hr
    results["signal_plot_path"] = plot_path.replace("\\", "/")
    
    results["explanation"] = {
        "what_happened": "Extracted micro-color variations from the face over time (Remote Photoplethysmography) to search for a human heartbeat.",
        "result": "No Pulse Found (Deepfake)" if results["rppg_anomaly_score"] > 0.5 else "Biological Pulse Detected",
        "why_it_happened": "The face lacks the rhythmic blood-flow spectral peaks that a living human heart produces, indicating it is an AI rendering." if results["rppg_anomaly_score"] > 0.5 else "A consistent, rhythmic heartbeat was detected in the face's micro-color changes, proving biological authenticity.",
        "variables": {
            "Estimated Heart Rate": f"{hr} BPM" if results["has_pulse"] else "N/A",
            "Spectral Signal-to-Noise (SNR)": f"{snr:.2f}",
            "Pulse Status": "Detected" if results["has_pulse"] else "Missing"
        }
    }
    
    return results
