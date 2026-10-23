import os
import numpy as np
import librosa
import librosa.display
import threading
from pipeline.image_utils import save_optimized_figure

_voice_model = None
_voice_model_lock = threading.Lock()

def analyze_voice_spoofing(audio_path, output_dir, prefix="voice"):
    """
    Analyzes an audio track for synthetic artifacts common in AI voice clones.
    """
    results = {
        "available": False,
        "score_available": False,
        "eligible_for_fusion": False,
        "speech_verified": False,
        "score_calibrated": False,
        "applicability": "unverified_speech",
        "voice_anomaly_score": 0.5,
        "high_freq_ratio": 0.0,
        "high_freq_band_hz": [6400, 8000],
        "zcr_variance": 0.0,
        "spectral_rolloff_mean": 0.0,
        "voice_plot_path": "",
        "warnings": []
    }

    if not audio_path or not os.path.exists(audio_path):
        results["error"] = "Missing audio file"
        return results

    try:
        y, sr = librosa.load(audio_path, sr=16000, duration=60)
    except Exception as e:
        results["error"] = f"Failed to load audio: {e}"
        return results

    if len(y) < sr * 1.0: # Less than 1 second
        results["warnings"].append("Audio too short for spoofing analysis.")
        return results

    if not np.isfinite(y).all() or np.max(np.abs(y)) < 1e-7:
        results["warnings"].append("No finite, non-silent audio signal for voice analysis.")
        return results

    # Do not reconstruct samples: interpolation changes potential spoofing cues.
    if np.any(np.abs(y) >= 0.98):
        results["warnings"].append("Near-full-scale samples detected; original decoded samples retained.")

    # 1. Zero Crossing Rate Variance (Keep for reporting)
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    zcr_var = np.var(zcr)

    # 2. Spectral Rolloff (Keep for reporting)
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)[0]
    rolloff_mean = np.mean(rolloff)
    
    # 3. High Frequency Energy Ratio (Keep for reporting)
    S = np.abs(librosa.stft(y)) ** 2
    freqs = librosa.fft_frequencies(sr=sr)
    high_freq_idx = np.where(freqs >= 0.8 * (sr / 2.0))[0]
    if len(high_freq_idx) > 0:
        high_freq_energy = np.sum(S[high_freq_idx, :])
        total_energy = np.sum(S)
        hf_ratio = high_freq_energy / (total_energy + 1e-10)
    else:
        hf_ratio = 0.0

    results.update(high_freq_ratio=float(hf_ratio), zcr_variance=float(zcr_var),
                   spectral_rolloff_mean=float(rolloff_mean),
                   analyzed_duration_seconds=len(y) / sr,
                   inference_duration_seconds=min(len(y) / sr, 255 * 512 / sr))

    # A conservative narrow-band exclusion, not a speech detector. Analyze
    # interior STFT frames so reflection-padding transients do not hide a tone.
    spectrum = S[:, 2:-2].sum(axis=1) if S.shape[1] > 4 else S.sum(axis=1)
    peak = int(np.argmax(spectrum))
    tone_ratio = float(spectrum[max(0, peak - 2):peak + 3].sum() / max(spectrum.sum(), 1e-20))
    results["narrowband_power_ratio"] = tone_ratio

    # 4. Generate Mel-Spectrogram for Deep Learning Model
    # Use standard 128 mels. We pad or truncate to 256 time steps for the CNN.
    M = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    M_db = librosa.power_to_db(M, ref=np.max)
    
    # Normalize
    M_norm = (M_db - M_db.min()) / (M_db.max() - M_db.min() + 1e-8)
    
    # Resize time dimension to exactly 256 frames
    target_frames = 256
    if M_norm.shape[1] < target_frames:
        pad_width = target_frames - M_norm.shape[1]
        M_cnn_input = np.pad(M_norm, ((0, 0), (0, pad_width)), mode='constant')
    else:
        M_cnn_input = M_norm[:, :target_frames]

    # 5. PyTorch Deep Learning Inference (Lightweight Anti-Spoofing)
    try:
        global _voice_model
        with _voice_model_lock:
            if _voice_model is None:
                from pipeline.voice_model import LightweightAudioAntiSpoof
                candidate = LightweightAudioAntiSpoof()
                candidate.load_weights()
                _voice_model = candidate
        if tone_ratio > 0.999:
            results["applicability"] = "narrowband_audio"
            results["warnings"].append("Nearly all audio power is in one narrow band; voice spoofing is not applicable to this tone-like signal.")
            return results
        cnn_score = _voice_model.predict(M_cnn_input)
        
        anomaly_score = cnn_score

        # Add interpretation warning
        if not np.isfinite(anomaly_score) or not 0 <= anomaly_score <= 1:
            raise ValueError("Voice model returned an invalid score")
    except Exception as e:
        results["error"] = f"Voice model unavailable: {e}"
        results["warnings"].append(results["error"])
        return results
        
    results["available"] = True
    results["warnings"].append("Uncalibrated checkpoint score: speech content and training provenance are unverified; excluded from combined scoring.")
    if len(y) / sr > 256 * 512 / sr:
        results["warnings"].append("The CNN uses only the first 256 mel frames (about 8.2 seconds); the plot and descriptive metrics cover the loaded audio, up to 60 seconds.")
    results["voice_anomaly_score"] = float(anomaly_score)
    results["high_freq_ratio"] = float(hf_ratio)
    results["zcr_variance"] = float(zcr_var)
    results["spectral_rolloff_mean"] = float(rolloff_mean)
    
    # Generate Dual-Panel Plot
    from matplotlib.figure import Figure

    fig = Figure(figsize=(8, 6), facecolor='#0f172a')
    ax1, ax2 = fig.subplots(2, 1, gridspec_kw={'height_ratios': [1, 2]})
    
    # 1. Waveform
    time_axis = np.arange(len(y)) / sr
    ax1.set_facecolor('#0f172a')
    ax1.plot(time_axis, y, color='#14b8a6', alpha=0.8, linewidth=0.5)
    ax1.set_title('Raw Audio Waveform', color='white', fontsize=11, pad=10)
    ax1.set_ylabel('Amplitude', color='#94a3b8', fontsize=9)
    ax1.tick_params(colors='#94a3b8', labelsize=8)
    for spine in ax1.spines.values(): spine.set_color('#1e293b')
    ax1.grid(True, color='#1e293b', linestyle='--', alpha=0.5)
    
    # 2. Correct Mel-Spectrogram
    M_dB = M_db
    
    ax2.set_facecolor('#0f172a')
    img = librosa.display.specshow(M_dB, x_axis='time', y_axis='mel', sr=sr, ax=ax2, cmap='magma')
    ax2.set_title('Mel-Frequency Spectrogram', color='white', fontsize=11, pad=10)
    ax2.set_xlabel('Time (s)', color='#94a3b8', fontsize=9)
    ax2.set_ylabel('Hz (Mel Scale)', color='#94a3b8', fontsize=9)
    ax2.tick_params(colors='#94a3b8', labelsize=8)
    for spine in ax2.spines.values(): spine.set_color('#1e293b')
    
    # Add colorbar
    cbar = fig.colorbar(img, ax=ax2, format="%+2.f dB", pad=0.02)
    cbar.ax.tick_params(colors='#94a3b8', labelsize=8)
    
    plot_path = os.path.join(output_dir, f"{prefix}_spec.png")
    save_optimized_figure(plot_path, fig)
    
    results["voice_plot_path"] = plot_path.replace("\\", "/")
    
    results["explanation"] = {
        "what_happened": "Evaluated the first 256 normalized mel frames using the project's bundled depthwise CNN checkpoint.",
        "result": "Uncalibrated Voice Checkpoint Measurement",
        "why_it_happened": "The sigmoid output is not a calibrated probability. Neither a speech detector nor validated checkpoint provenance is available; spectral summaries do not explain individual CNN decisions.",
        "variables": {
            "Uncalibrated CNN Score": f"{anomaly_score:.4f}",
            "High Freq Ratio": f"{hf_ratio:.4f}",
            "ZCR Variance": f"{zcr_var:.4f}",
            "Spectral Rolloff Mean": f"{rolloff_mean:.0f} Hz"
        }
    }
    
    return results
