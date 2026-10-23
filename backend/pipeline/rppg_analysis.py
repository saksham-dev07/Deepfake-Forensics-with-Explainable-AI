import cv2
import numpy as np
import os
from scipy.signal import butter, filtfilt, detrend
from pipeline.image_utils import save_optimized_figure
from pipeline.face_geometry import detect_face

def butter_bandpass(lowcut, highcut, fs, order=3):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return b, a


def _chrom_signal(signal_rgb, fps):
    """Mean-normalized CHROM projection; not a liveness classifier.

    The coefficients operate on relative channel changes, not raw intensities
    (de Haan & Jeanne, 2013, doi:10.1109/TBME.2013.2266196).
    """
    base = np.mean(signal_rgb, axis=0)
    if not np.isfinite(base).all() or np.any(base <= 1e-9):
        raise ValueError("Skin RGB channels need a nonzero measured mean.")
    normalized = detrend(signal_rgb / base - 1.0, axis=0)
    b, a = butter_bandpass(0.7, 2.5, fps, order=3)
    filtered = filtfilt(b, a, normalized, axis=0)
    x = 3 * filtered[:, 0] - 2 * filtered[:, 1]
    y = 1.5 * filtered[:, 0] + filtered[:, 1] - 1.5 * filtered[:, 2]
    if np.std(y) <= 1e-12:
        raise ValueError("No measurable chrominance variation.")
    return x - (np.std(x) / np.std(y)) * y

def extract_rppg_signal(video_path, output_dir, prefix="rppg"):
    """
    Extracts the Remote Photoplethysmography (rPPG) signal from a video.
    AI generated videos often lack the micro-color changes associated with a human pulse.
    """
    results = {
        "available": False,
        "score_available": False,
        "eligible_for_fusion": False,
        "score_calibrated": False,
        "score_kind": "heuristic",
        "rppg_anomaly_score": 0.5,
        "has_pulse": False,
        "heart_rate": 0,
        "signal_plot_path": None,
        "warnings": [],
        "snr": 0.0
    }

    if not video_path or not str(video_path).lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        results["warnings"].append("rPPG (Pulse Detection) requires a video file. Skipped for static image.")
        return results

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not np.isfinite(fps) or fps <= 5:
        cap.release()
        results["warnings"].append("A known frame rate above 5 FPS is required to resolve the 0.7-2.5 Hz band.")
        return results

    raw_signal = []
    frame_count = 0
    max_frames = min(450, int(fps * 15))
    
    tracker = None
    relative_anchors = None
    
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
                except (AttributeError, cv2.error):
                    tracker = "MediaPipe_Fallback"
                    
                re = landmarks.get("right_eye")
                le = landmarks.get("left_eye")
                nose = landmarks.get("nose_tip")
                rm = landmarks.get("right_mouth")
                lm = landmarks.get("left_mouth")
                if all(point is not None for point in (re, le, nose, rm, lm)):
                    relative_anchors = [((point[0] - fx) / fw, (point[1] - fy) / fh) for point in (re, le, nose, rm, lm)]
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
                if success and relative_anchors is not None:
                    fx, fy, fw, fh = [int(v) for v in bbox]
                    # Preserve the measured anchor layout instead of replacing
                    # it with unrelated hard-coded anatomical proportions.
                    re, le, nose, rm, lm = [(int(fx + px * fw), int(fy + py * fh)) for px, py in relative_anchors]
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
                raw_signal.append((np.nan, np.nan, np.nan))
        else:
            raw_signal.append((np.nan, np.nan, np.nan))
        
        frame_count += 1

    cap.release()

    # Filtering across a missing ROI invents pulse data. Use the longest valid run.
    valid = np.isfinite(np.asarray(raw_signal).reshape(-1, 3)).all(axis=1)
    runs = np.split(np.arange(len(valid)), np.flatnonzero(np.diff(valid)) + 1)
    longest = max((run for run in runs if len(run) and valid[run[0]]), key=len, default=[])
    results["valid_frame_count"] = int(valid.sum())
    if len(longest) < max(60, int(fps * 2)) or not len(valid) or valid.mean() < 0.8:
        results["warnings"].append("Video too short or face not found consistently for rPPG analysis.")
        return results

    # Process CHROM signal
    signal_rgb = np.array(raw_signal)[longest] # contiguous measured observations only
    if np.max(np.std(signal_rgb, axis=0)) < 1e-6:
        results["warnings"].append("No measurable color variation; pulse evidence is unavailable.")
        return results
    
    try:
        filtered_signal = _chrom_signal(signal_rgb, fps)
    except Exception as e:
        results["warnings"].append(f"Filtering error: {str(e)}")
        return results

    if not np.isfinite(filtered_signal).all() or np.std(filtered_signal) <= 1e-10:
        results["warnings"].append("No resolvable CHROM signal; pulse evidence is unavailable.")
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
         results["warnings"].append("No resolvable frequency bins in the pulse band.")
         return results
         
    valid_freqs = fft_freqs[valid_idx]
    valid_power = power[valid_idx]
    
    max_power_idx = np.argmax(valid_power)
    peak_freq = valid_freqs[max_power_idx]
    peak_power = valid_power[max_power_idx]
    
    mean_power = np.mean(valid_power)
    snr = peak_power / (mean_power + 1e-9)

    hr = int(round(peak_freq * 60))
    results["analysis_duration_seconds"] = round(N / fps, 3)
    results["frequency_resolution_bpm"] = round(60 * fps / N, 3)
    results["snr_measure"] = "in_band_peak_to_mean_power_ratio"
    
    os.makedirs(output_dir, exist_ok=True)
    plot_path = os.path.join(output_dir, f"{prefix}_rppg_spectrum.jpg")
    
    # ── DUAL-PANEL PLOT ──
    from matplotlib.figure import Figure

    fig = Figure(figsize=(8, 6), facecolor='#0f172a')
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

    save_optimized_figure(plot_path, fig)

    results["available"] = True
    results["score_available"] = True
    results["eligible_for_fusion"] = True
    results["signal_plot_path"] = plot_path.replace("\\", "/")
    results["heart_rate"] = hr

    # Retained legacy peak-concentration rules, not validated liveness or
    # deepfake probabilities. Weak rPPG is also common in authentic video.
    if snr < 1.5:
        # No distinct heartbeat found
        results["rppg_anomaly_score"] = 0.95
        results["has_pulse"] = False
        results["warnings"].append("No distinct pulse-band peak resolved. Motion, capture quality and lighting can also cause this.")
    elif snr < 3.0:
        # Weak or noisy heartbeat
        results["rppg_anomaly_score"] = 0.70
        results["has_pulse"] = True
        results["warnings"].append("Weak pulse-band peak; this is not specific to synthesis.")
    else:
        # Strong, consistent heartbeat
        results["has_pulse"] = True
        results["rppg_anomaly_score"] = 0.15

    results["snr"] = round(float(snr), 2)
    results["heart_rate"] = hr
    results["signal_plot_path"] = plot_path.replace("\\", "/")
    
    results["explanation"] = {
        "what_happened": "Measured mean-normalized facial color variation using a single-window CHROM projection and searched its 0.7-2.5 Hz spectrum.",
        "result": "Weak or Unresolved Pulse-Band Signal" if results["rppg_anomaly_score"] > 0.5 else "Pulse-Like Spectral Peak",
        "why_it_happened": "The measured color signal has weak pulse-band peaks. Motion, compression, and lighting can also cause this." if results["rppg_anomaly_score"] > 0.5 else "A pulse-like spectral peak was detected; this is not proof of biological authenticity.",
        "variables": {
            "Estimated Heart Rate": f"{hr} BPM" if results["has_pulse"] else "N/A",
            "In-Band Peak/Mean Power Ratio": f"{snr:.2f}",
            "Pulse-Band Peak": "Resolved" if results["has_pulse"] else "Unresolved"
        }
    }
    
    return results
