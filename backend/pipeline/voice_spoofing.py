import os
import numpy as np
import librosa
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def analyze_voice_spoofing(audio_path, output_dir, prefix="voice"):
    """
    Analyzes an audio track for synthetic artifacts common in AI voice clones.
    """
    results = {
        "voice_anomaly_score": 0.5,
        "high_freq_ratio": 0.0,
        "zcr_variance": 0.0,
        "spectral_rolloff_mean": 0.0,
        "voice_plot_path": "",
        "warnings": []
    }

    if not audio_path or not os.path.exists(audio_path):
        results["error"] = "Missing audio file"
        return results

    try:
        y, sr = librosa.load(audio_path, sr=None)
    except Exception as e:
        results["error"] = f"Failed to load audio: {e}"
        return results

    if len(y) < sr * 1.0: # Less than 1 second
        results["warnings"].append("Audio too short for spoofing analysis.")
        return results

    # 1. Zero Crossing Rate Variance
    # Synthetic voices often have unnaturally smooth or highly erratic ZCR
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    zcr_var = np.var(zcr)

    # 2. Spectral Rolloff
    # Real voices have natural high-frequency decay. AI voices often have unnatural cutoffs.
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)[0]
    rolloff_mean = np.mean(rolloff)
    
    # 3. High Frequency Energy Ratio
    # We analyze the spectrogram to find the ratio of energy in frequencies above 8kHz
    S = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    
    high_freq_idx = np.where(freqs > 8000)[0]
    if len(high_freq_idx) > 0:
        high_freq_energy = np.sum(S[high_freq_idx, :])
        total_energy = np.sum(S)
        hf_ratio = high_freq_energy / (total_energy + 1e-10)
    else:
        hf_ratio = 0.0

    # Scoring Rules
    anomaly_score = 0.1
    
    if zcr_var < 0.001:
        anomaly_score = max(anomaly_score, 0.70)
        results["warnings"].append(f"Unnaturally smooth Zero-Crossing Rate ({zcr_var:.5f})")
        
    if hf_ratio > 0.15:
        # High frequency artifacts (hissing/static common in bad vocoders)
        anomaly_score = max(anomaly_score, 0.85)
        results["warnings"].append(f"Synthetic high-frequency noise detected ({hf_ratio:.3f})")
    elif hf_ratio < 0.0001:
        # Unnaturally missing high frequencies (over-smoothed mel-spectrogram inversion)
        anomaly_score = max(anomaly_score, 0.60)
        results["warnings"].append(f"Unnaturally muted high frequencies ({hf_ratio:.5f})")
        
    results["voice_anomaly_score"] = float(anomaly_score)
    results["high_freq_ratio"] = float(hf_ratio)
    results["zcr_variance"] = float(zcr_var)
    results["spectral_rolloff_mean"] = float(rolloff_mean)
    
    # Generate Mel-Spectrogram Plot
    plt.figure(figsize=(8, 3))
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(8, 3), facecolor='#0f172a')
    
    S_dB = librosa.power_to_db(S**2, ref=np.max)
    img = librosa.display.specshow(S_dB, x_axis='time', y_axis='mel', sr=sr, ax=ax, cmap='magma')
    
    ax.set_title('Mel-Frequency Spectrogram', color='white', pad=10)
    ax.set_xlabel('Time (s)', color='#94a3b8')
    ax.set_ylabel('Hz', color='#94a3b8')
    ax.tick_params(colors='#94a3b8')
    fig.colorbar(img, ax=ax, format="%+2.f dB")
    
    plot_path = os.path.join(output_dir, f"{prefix}_spec.png")
    plt.tight_layout()
    plt.savefig(plot_path, dpi=120, bbox_inches='tight', facecolor='#0f172a')
    plt.close('all')
    
    results["voice_plot_path"] = plot_path.replace("\\", "/")
    
    return results
