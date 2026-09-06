# Technical Specification & Forensic Architecture: Remote Photoplethysmography (rPPG) Hemodynamic Forensics (`rppg_analysis.py`)

**Implementation File**: [`backend/pipeline/rppg_analysis.py`](../pipeline/rppg_analysis.py)  
**Analytical Classification**: Physiological Forensics / Subcutaneous Hemodynamics / Chrominance-Based Pulse Extraction  
**Signal Processing Method**: CHROM rPPG Projection (De Haan & Jeanne, 2013)  
**Bandpass Filter**: 3rd-Order Zero-Phase Butterworth ($0.7 - 2.5\text{ Hz} \iff 42 - 150\text{ BPM}$)  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `SciPy (butter, filtfilt, detrend)`, `Matplotlib`, `face_geometry.detect_face`  
**Primary Interface**: `extract_rppg_signal(video_path, output_dir, prefix="rppg")`  
**Meta-Classifier Vector Position**: Input Feature Index 10 (`rppg_score`)

---

## 1. Executive Summary & Hemodynamic Forensic Theory

`rppg_analysis.py` extracts, isolates, and measures sub-perceptual physiological blood volume pulse (BVP) waveforms from video recordings of human faces.

Every living human possesses a cardiovascular system. With each ventricular contraction of the heart, a volumetric pressure wave propagates through the arterial tree, expanding the micro-vascular capillary beds beneath the facial epidermis. Oxygenated hemoglobin ($\text{HbO}_2$) absorbs light strongly in the green spectrum ($\approx 520 - 580\text{ nm}$). As blood volume rhythmically surges through facial tissue, the green chrominance of facial skin undergoes microscopic, periodic intensity modulations synchronized with the cardiac pulse.

### The Generative Forensic Anomaly:
Generative neural networks (such as DeepFaceLab, SimSwap, Wav2Lip, or Latent Diffusion) synthesize facial images based on perceptual visual aesthetics without physiological cardiovascular models:
1. **Cardiac Pulse Starvation**: Synthetic facial pixels completely lack periodic cardiac micro-blushes.
2. **Spectral Disruption**: When performing Fourier analysis on synthetic skin color signals, the power spectrum is flat and noisy, lacking a definitive cardiac harmonic peak ($\text{SNR} < 1.5$).
3. **Biological Proof of Life**: While an AI generator can render photorealistic eyes, skin pores, and hair, simulating the exact sub-perceptual hemodynamics of a human cardiovascular system remains an uncrossed physiological barrier.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           rPPG FORENSIC EXTRACTION TOPOLOGY                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Video Stream]
                                             │
                        Extract Video Frame Rate (FPS, default 30)
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
          [CSRT Face Tracker]                             [MediaPipe Landmark Fallback]
          Initializes Bounding Box                        Extracts 5 Anatomical Anchors:
          Tracks Across Up to 450 Frames                  re, le, nose, rm, lm
                     │                                               │
                     └───────────────────────┬───────────────────────┘
                                             │
                          [Vascular ROI Polygonal Masking]
                          - Right Cheek Polygon (rc_poly)
                          - Left Cheek Polygon (lc_poly)
                          - Forehead Polygon (fh_poly)
                                             │
                          Mean RGB Extraction: [R(t), G(t), B(t)]
                                             │
                          [Detrending: Linear Trend Removal]
                                             │
                          [3rd-Order Zero-Phase Butterworth]
                          Passband: 0.7 Hz - 2.5 Hz (42 - 150 BPM)
                          Filtered Channels: R_f, G_f, B_f
                                             │
                          [CHROM Projection Matrix]
                          X = 3·R_f - 2·G_f
                          Y = 1.5·R_f + G_f - 1.5·B_f
                          α = std(X) / std(Y)
                          S_rppg = X - α·Y
                                             │
                          [Fast Fourier Transform (FFT)]
                          Power Spectral Density P(f) = |FFT(S)|²
                          Peak Frequency f_peak ∈ [0.7, 2.5 Hz]
                          Heart Rate HR = f_peak × 60 BPM
                          Signal-to-Noise Ratio: SNR = P_peak / P_mean
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          [SNR Evaluation & Verdict]                     [Dual-Panel Visual Plot]
          - SNR < 1.5 => Score = 0.95 (No Pulse)         Panel 1: Filtered Temporal Waveform
          - SNR < 3.0 => Score = 0.70 (Weak Pulse)       Panel 2: Power Spectrum & BPM Peak
          - SNR ≥ 3.0 => Score = 0.15 (Biological Life)
                                             │
                                             ▼
                            [rppg_anomaly_score ∈ [0.15, 0.95]]
```

---

## 2. Anatomical Region of Interest (ROI) Masking

To isolate high-amplitude capillary perfusion while avoiding non-pulsatile artifacts (facial hair, eyes, lips, and nostrils), the module dynamically computes three vascular polygons relative to 5 facial landmarks:
* Right Eye (`re`), Left Eye (`le`), Nose Tip (`nose`), Right Mouth Corner (`rm`), and Left Mouth Corner (`lm`).

### 2.1 Explicit Polygon Vertices:
1. **Right Cheek Polygon (`rc_poly`)**:
   $$V_1 = \left(re_x - 0.5(nose_x - re_x), \; re_y + 0.5(nose_y - re_y)\right)$$
   $$V_2 = \left(nose_x - 0.2(nose_x - re_x), \; nose_y\right)$$
   $$V_3 = \left(rm_x - 0.2(nose_x - re_x), \; rm_y\right)$$
   $$V_4 = \left(rm_x - 0.5(nose_x - re_x), \; rm_y - 0.5(rm_y - nose_y)\right)$$
2. **Left Cheek Polygon (`lc_poly`)**:
   $$V_1 = \left(le_x + 0.5(le_x - nose_x), \; le_y + 0.5(nose_y - le_y)\right)$$
   $$V_2 = \left(nose_x + 0.2(le_x - nose_x), \; nose_y\right)$$
   $$V_3 = \left(lm_x + 0.2(le_x - nose_x), \; lm_y\right)$$
   $$V_4 = \left(lm_x + 0.5(le_x - nose_x), \; lm_y - 0.5(lm_y - nose_y)\right)$$
3. **Forehead Polygon (`fh_poly`)**:
   $$V_1 = \left(re_x, \; re_y - 0.8(nose_y - re_y)\right)$$
   $$V_2 = \left(le_x, \; le_y - 0.8(nose_y - le_y)\right)$$
   $$V_3 = \left(le_x, \; le_y - 1.5(nose_y - le_y)\right)$$
   $$V_4 = \left(re_x, \; re_y - 1.5(nose_y - re_y)\right)$$

### 2.2 Composite Masking:
$$\mathbf{M}_{\text{vascular}} = \text{Polygon}(\text{rc}) \cup \text{Polygon}(\text{lc}) \cup \text{Polygon}(\text{fh})$$
$$\mathbf{c}(t) = \frac{1}{|\mathbf{M}_{\text{vascular}}|} \sum_{(x, y) \in \mathbf{M}} \mathbf{I}_{\text{RGB}}(x, y, t) = [R(t), G(t), B(t)]^T$$

---

## 3. Signal Processing & The Chrominance-Based (CHROM) Method

Raw color traces $\mathbf{c}(t)$ are contaminated by motion artifacts, head rotation, and ambient luminaire flicker. The module applies the **CHROM** method (De Haan & Jeanne, IEEE TBME 2013).

### 3.1 Detrending & 3rd-Order Zero-Phase Filtering
1. **Detrending**: Evaluates `scipy.signal.detrend` on each color channel independently, removing slow non-linear baseline illumination drift.
2. **Butterworth Bandpass Filter**:
   Constructs a 3rd-order digital bandpass filter tuned to the human cardiac frequency window:
   $$[f_{\text{low}}, f_{\text{high}}] = [0.7\text{ Hz}, 2.5\text{ Hz}] \iff [42\text{ BPM}, 150\text{ BPM}]$$
   The magnitude transfer function of the 3rd-order bandpass filter is:
   $$|H(j\omega)|^2 = \frac{1}{1 + \left(\frac{\omega^2 - \omega_0^2}{\omega B}\right)^6}$$
   Where center frequency $\omega_0 = 2\pi \sqrt{0.7 \times 2.5} \approx 8.31\text{ rad/s}$ ($1.32\text{ Hz} \iff 79.4\text{ BPM}$) and bandwidth $B = 2\pi(2.5 - 0.7) = 3.6\pi\text{ rad/s}$.
3. **Zero-Phase Forward-Backward Filtering (`filtfilt`)**:
   Filtering forward, reversing, filtering backward, and reversing again yields:
   $$|H_{\text{filtfilt}}(j\omega)| = |H(j\omega)|^2, \quad \angle H_{\text{filtfilt}}(j\omega) \equiv 0^\circ$$
   Guarantees strictly **zero phase distortion**, preventing systolic peak timings from shifting across frames.

### 3.2 Dichromatic Reflection Model & CHROM Derivation
Under the Shafer Dichromatic Reflection Model, skin radiance is the linear combination of specular surface reflection $\mathbf{C}_s(t)$ and diffuse sub-surface hemoglobin reflection $\mathbf{C}_d(t)$:

$$\mathbf{C}(t) = I(t) \cdot \left[ \mathbf{u}_s \cdot m(t) + \mathbf{u}_c \cdot s(t) \right]$$

Where:
* $\mathbf{u}_s \propto [1, 1, 1]^T$ is the specular reflection vector (colorless under white illumination).
* $m(t)$ represents motion-induced intensity changes.
* $\mathbf{u}_c$ is the color vector of pulsatile hemoglobin absorption.
* $s(t)$ is the desired physiological blood volume pulse.

The CHROM algorithm defines two orthogonal projection vectors:
$$\mathbf{P}_x = [3, -2, 0]^T \implies X_{\text{comp}}(t) = 3 R_f(t) - 2 G_f(t)$$
$$\mathbf{P}_y = [1.5, 1, -1.5]^T \implies Y_{\text{comp}}(t) = 1.5 R_f(t) + G_f(t) - 1.5 B_f(t)$$

The dynamic adaptive weighting factor $\alpha$ balances the two signals based on their standard deviations:
$$\alpha = \frac{\sigma(X_{\text{comp}})}{\sigma(Y_{\text{comp}}) + 10^{-9}}$$

The final motion-compensated pulsatile signal $S(t)$ is extracted as:
$$S(t) = X_{\text{comp}}(t) - \alpha \cdot Y_{\text{comp}}(t)$$
*Setting $\alpha = \sigma(X)/\sigma(Y)$ forces the total variance of the specular motion components in $X$ and $Y$ to cancel out, isolating the pure diffuse arterial pulse.*

---

## 4. Spectral Decomposition & Signal-to-Noise Ratio (SNR)

1. **Discrete Fourier Transform (rFFT)**:
   Over $N$ frames of the normalized signal $S_{\text{norm}}(t)$ sampled at $f_s$:
   $$F(k) = \sum_{n=0}^{N-1} S_{\text{norm}}(n) e^{-j 2\pi k n / N} \quad \text{for } k = 0, \dots, \lfloor N/2 \rfloor$$
   $$P(f) = |F(f)|^2$$
2. **Frequency Resolution ($\Delta f$) & Precision**:
   $$\Delta f = \frac{f_s}{N} \implies \Delta\text{BPM} = \frac{60 \cdot f_s}{N}$$
   * At $N = 450$ frames ($15\text{ seconds}$ at $30\text{ FPS}$): $\Delta\text{BPM} = \frac{1800}{450} = 4.0\text{ BPM}$ resolution.
3. **Peak Frequency Identification**:
   Within the valid cardiac window $f \in [0.7\text{ Hz}, 2.5\text{ Hz}]$:
   $$f_{\text{peak}} = \arg\max_{f \in [0.7, 2.5]} P(f)$$
   $$\text{Heart Rate (HR)} = \text{round}(f_{\text{peak}} \times 60) \quad (\text{BPM})$$
4. **Spectral Signal-to-Noise Ratio (SNR)**:
   Computes the power concentration ratio of the peak frequency relative to the in-band spectral noise floor:
   $$\text{SNR} = \frac{P(f_{\text{peak}})}{\frac{1}{M}\sum_{f \in [0.7, 2.5]} P(f) + 10^{-9}}$$

---

## 5. Forensic Decision Rules & Anomaly Scoring

```python
if snr < 1.5:
    results["rppg_anomaly_score"] = 0.95
    results["has_pulse"] = False
    results["warnings"].append("No biological pulse detected (SNR critically low). Potential AI generation.")
elif snr < 3.0:
    results["rppg_anomaly_score"] = 0.70
    results["has_pulse"] = True
    results["warnings"].append("Weak pulse detected. Could be due to poor lighting or mild synthesis.")
else:
    results["has_pulse"] = True
    results["rppg_anomaly_score"] = 0.15
```

| Spectral SNR Metric | Anomaly Score | Pulse Status | Forensic Diagnosis |
| :--- | :---: | :---: | :--- |
| **$\text{SNR} < 1.5$** | `0.95` | `False` | **No Pulse Found (Deepfake)**: Flat, noisy power spectrum. No cardiac rhythm. |
| **$1.5 \le \text{SNR} < 3.0$**| `0.70` | `True` | **Weak / Indeterminate Pulse**: Low-light authentic capture or subtle neural face swap. |
| **$\text{SNR} \ge 3.0$** | `0.15` | `True` | **Biological Pulse Detected (Authentic)**: Sharp, harmonic cardiac frequency peak. |

---

## 6. Visual Diagnostics Specification

The module generates `{prefix}_rppg_spectrum.jpg`, a dual-panel dark-themed graphic (`#0f172a` slate):

### 6.1 Panel 1 (Top): Filtered Temporal Waveform
* **Dimensions**: $8 \times 6$ inches (height ratio 1.0).
* **Signal Plotted**: Normalized filtered rPPG signal $S_{\text{norm}}(t)$ over time in seconds:
  $$S_{\text{norm}}(t) = \frac{S(t) - \mu_S}{\sigma_S + 10^{-9}}$$
* **Color**: Emerald green (`#34d399`, linewidth 1.5).
* **Diagnostic Meaning**: Shows the rhythmic systolic-diastolic arterial wave peaks over the sequence duration.

### 6.2 Panel 2 (Bottom): Power Spectral Density (PSD)
* **Dimensions**: Height ratio 1.5.
* **Signal Plotted**: Power $P(f)$ plotted against Heart Rate in Beats Per Minute ($\text{BPM} = f \times 60$).
* **Color**: Sky blue (`#38bdf8`, linewidth 2.0).
* **Peak Marker**: Dashed rose vertical guide rule (`#fb7185`) labeled with `Peak: X BPM`.
* **Diagnostic Meaning**: A single, prominent spike proves biological authenticity; a diffuse plateau confirms AI synthesis.

---

## 7. Interface Specification & Schema

### Function Signature
```python
def extract_rppg_signal(
    video_path: str,
    output_dir: str,
    prefix: str = "rppg"
) -> dict
```

### Return Payload (Authentic Human Capture):
```json
{
  "rppg_anomaly_score": 0.15,
  "has_pulse": true,
  "heart_rate": 72,
  "snr": 5.42,
  "signal_plot_path": "uploads/job-id/rppg_rppg_spectrum.jpg",
  "warnings": [],
  "explanation": {
    "what_happened": "Extracted micro-color variations from the face over time (Remote Photoplethysmography) to search for a human heartbeat.",
    "result": "Biological Pulse Detected",
    "why_it_happened": "A consistent, rhythmic heartbeat was detected in the face's micro-color changes, proving biological authenticity.",
    "variables": {
      "Estimated Heart Rate": "72 BPM",
      "Spectral Signal-to-Noise (SNR)": "5.42",
      "Pulse Status": "Detected"
    }
  }
}
```

---

## 8. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `rppg_anomaly_score` feeds as **Input Feature Index 10** (`rppg_score`) into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Highly complementary to **Feature 8 (`eye_score`)** and **Feature 11 (`flow_score`)**. While blinking monitors neural motor control and optical flow monitors rigid spatial kinematics, rPPG monitors autonomous cardiovascular physiology.
* **Safety Guards Handled**:
  1. **Static Image Guard**: If passed an image file, safely returns neutral score `0.50` with warning `"rPPG requires a video file. Skipped for static image."`
  2. **Short Video Guard**: Requires a minimum of $60$ frames ($\ge 2.0\text{ seconds}$) to establish a valid Fourier frequency resolution ($\Delta f = f_s / N$).
  3. **Zero-Division Protection**: All power ratios and standard deviations employ $\epsilon = 10^{-9}$ denominators to prevent divide-by-zero crashes.
  4. **Headless Execution**: Uses `matplotlib.use('Agg')` and explicit `FigureCanvas` renderers to guarantee crash-free background threading on Windows servers.
