# Technical Specification & Forensic Architecture: Sensor Noise (PRNU) & Spatial Rich Model (SRM) Analysis (`noise_analysis.py`)

**Implementation File**: [`backend/pipeline/noise_analysis.py`](../pipeline/noise_analysis.py)  
**Analytical Classification**: Physics-Based Sensor Forensics / Photo-Response Non-Uniformity / Steganalytic Rich Models  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `OS`  
**Primary Interface**: `analyze_sensor_noise(image_rgb, output_dir, prefix="noise", quality_multiplier=1.0)`  
**Meta-Classifier Vector Position**: Input Feature Index 4 (`noise_score`)

---

## 1. Executive Summary & Sensor Noise Forensic Theory

`noise_analysis.py` extracts, isolates, and measures the microscopic high-frequency sensor noise profile of digital imagery.

Every physical optical camera possesses a unique, hardware-level fingerprint known as **Photo-Response Non-Uniformity (PRNU)** (Lukas, Fridrich, & Goljan, IEEE TIFS 2006). PRNU is an intrinsic, deterministic physical pattern caused by minor microscopic variations in pixel dimensions, substrate silicon thickness, and photon-to-electron conversion efficiencies during semiconductor wafer fabrication. When physical light strikes a camera sensor, the resulting digital pixel value $I(x, y)$ is governed by:

$$I(x, y) = I_0(x, y) + I_0(x, y) \cdot K(x, y) + \Theta(x, y)$$

Where:
* $I_0(x, y)$ represents the ideal optical scene radiance.
* $K(x, y)$ represents the zero-mean, deterministic multiplicative PRNU sensor pattern noise.
* $\Theta(x, y)$ encapsulates additive physical noise (shot noise, thermal Johnson-Nyquist noise, and readout quantization noise).

### The Generative Forensic Anomaly:
Generative neural networks (GANs, VAEs, Latent Diffusion models) synthesize pixel tensors numerically through floating-point matrix multiplications. They do not operate through physical silicon semiconductors:
1. **Severe Noise Starvation (Unnatural Smoothness)**: Generative decoders minimize reconstruction losses ($L_1$, $L_2$, perceptual VGG losses), which mathematically suppress high-frequency variance, producing unnaturally smooth facial skin devoid of PRNU.
2. **Noise Floor Discontinuity**: In face-swapping pipelines (e.g. DeepFaceLab, FaceSwap), a synthetic donor face is pasted into an authentic camera capture. This creates a stark spatial divergence where the surrounding background exhibits natural physical sensor noise while the face region has near-zero noise variance.
3. **Adversarial Camouflage Noise**: To defeat simple noise detectors, some generators inject synthetic Gaussian noise. However, this produces an abnormally elevated, uncorrelated noise variance ($\sigma^2 > t_{\max}$) that lacks physical PRNU structure.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          SENSOR NOISE FORENSIC TOPOLOGY                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input RGB Image]
                                             │
                                   Grayscale Conversion
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          [Non-Local Means (NLM) Filter]               [Spatial Rich Model (SRM)]
          Patch-Based Edge-Preserving Denoising        2nd-Order Derivative Kernel (3×3)
          Template: 7×7, Search Window: 21×21          Suppresses Image Structural Edges
          Filter Parameter: h = 10                     Exposes Micro-Blending Artifacts
                      │                                             │
                      ▼                                             ▼
          Clean Denoised Estimate I_clean              SRM High-Pass Residual R_SRM
                      │                                             │
                      ▼                                             ▼
          PRNU Residual R = I - I_clean                Log Dynamic Range Compression
                      │                                Magma Colormap Blended Visualization
                      ▼                                             │
          Residual Variance σ² = Var(R)                             │
          IQA Calibration: t_min, t_low, t_max                      │
          Piecewise Linear Interpolation                            │
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │
                                             ▼
                           [noise_score ∈ [0.10, 0.85]]
                                             │
                                  [Visual Diagnostics]
                                  - noise_denoised.jpg
                                  - noise_map.jpg (JET)
                                  - noise_srm_map.jpg (MAGMA)
```

---

## 2. Sub-Engine Architecture & Mathematical Formulations

### 2.1 Non-Local Means (NLM) PRNU Extraction (`extract_noise_residual`)
Conventional Gaussian or median smoothing destroys sharp edges, contaminating the noise residual with false high-frequency structural edge energy. To prevent this, the engine employs **Non-Local Means (NLM) Denoising** (Buades, Coll, & Morel, CVPR 2005):

$$\hat{I}_{\text{NLM}}(p) = \frac{1}{C(p)} \sum_{q \in \Omega(p)} w(p, q) I(q)$$

Where:
* $p = (x, y)$ is the target pixel.
* $\Omega(p)$ is a $21 \times 21$ neighborhood search window (`searchWindowSize=21`).
* $w(p, q)$ is the non-local similarity weight between a $7 \times 7$ patch $V(p)$ centered at $p$ and patch $V(q)$ centered at $q$ (`templateWindowSize=7`):
  $$w(p, q) = \exp\left( -\frac{\max(\|V(p) - V(q)\|_2^2 - 2\sigma^2, 0)}{h^2} \right)$$
* $h = 10$ is the filter luminance degree parameter, and $C(p) = \sum_{q} w(p, q)$ is the normalizing partition function.

#### PRNU Residual Formulation:
$$\mathbf{R}_{\text{PRNU}}(x, y) = I_{\text{gray}}(x, y) - \hat{I}_{\text{NLM}}(x, y)$$
*Because NLM averages across self-similar patches across the entire search window, physical textures (skin pores, eyelashes) are preserved in $\hat{I}_{\text{NLM}}$, isolating pure uncorrelated sensor noise in $\mathbf{R}_{\text{PRNU}}$.*

---

### 2.2 Spatial Rich Model (SRM) High-Pass Residual (`extract_srm_noise`)
In steganalysis and digital image forensics, Spatial Rich Models (Fridrich & Kodovsky, IEEE TIFS 2012) capture low-level pixel manipulation traces by suppressing scene semantics via specialized linear high-pass residual filters.

The engine implements a 2nd-order Laplacian-like directional derivative filter:
$$\mathbf{K}_{\text{SRM}} = \frac{1}{4} \begin{bmatrix} -1 & 2 & -1 \\ 2 & -4 & 2 \\ -1 & 2 & -1 \end{bmatrix}$$

1. **2D Spatial Convolution**:
   $$\mathbf{R}_{\text{SRM}} = \left| I_{\text{float}} * \mathbf{K}_{\text{SRM}} \right|$$
2. **Log-Scale Dynamic Range Compression**:
   $$\mathbf{V}_{\text{SRM}} = \text{normalize}\left( \ln(\mathbf{R}_{\text{SRM}} + 10^{-5}), \text{min}=0, \text{max}=255 \right)$$
3. **Artifact Localization**:
   Applies `COLORMAP_MAGMA` and alpha-blends with the BGR image ($0.4 \cdot I_{\text{BGR}} + 0.8 \cdot \text{Magma}$). Synthetic boundary splicing and interpolation boundaries appear as bright thermal fractures. Saved to `{prefix}_srm_map.jpg`.

---

## 3. Anomaly Scoring Formulation & Calibration

The forensic indicator is the empirical variance of the PRNU noise residual:

$$\sigma^2 = \text{Var}(\mathbf{R}_{\text{PRNU}}) = \frac{1}{W \cdot H} \sum_{x=0}^{W-1} \sum_{y=0}^{H-1} \left( \mathbf{R}_{\text{PRNU}}(x, y) - \bar{\mathbf{R}} \right)^2$$

### 3.1 Image Quality Assessment (IQA) Dynamic Thresholds
Real cameras operating in low-light or compressed formats have fluctuating baseline noise floors. Thresholds scale dynamically with the Image Quality Assessment multiplier $Q$:

$$t_{\min} = 2.0 \cdot Q, \quad t_{\text{low}} = 1.0 \cdot Q, \quad t_{\max} = 15.0 \cdot Q$$

### 3.2 Piecewise Anomaly Scoring Function:
```python
if variance >= t_min and variance <= t_max:
    noise_score = 0.10 # Normal PRNU camera noise range
elif variance > t_low and variance < t_min:
    t = (t_min - variance) / (t_min - t_low)
    noise_score = 0.10 + t * 0.35
elif variance <= t_low:
    t = (t_low - variance) / t_low
    noise_score = 0.45 + t * 0.40
elif variance > t_max:
    noise_score = 0.60 # Artificially injected noise
```

$$\text{noise\_score} = \begin{cases}
0.10 & \text{if } t_{\min} \le \sigma^2 \le t_{\max} & \text{(Natural PRNU Sensor Noise)} \\
0.10 + 0.35 \left(\frac{t_{\min} - \sigma^2}{t_{\min} - t_{\text{low}}}\right) & \text{if } t_{\text{low}} < \sigma^2 < t_{\min} & \text{(Moderate Smoothing)} \\
0.45 + 0.40 \left(\frac{t_{\text{low}} - \sigma^2}{t_{\text{low}}}\right) & \text{if } \sigma^2 \le t_{\text{low}} & \text{(Severe Synthetic Smoothness - Deepfake)} \\
0.60 & \text{if } \sigma^2 > t_{\max} & \text{(Adversarial Injected Noise)}
\end{cases}$$

### 3.3 Forensic Interpretation:
* **$\text{Score} \le 0.50$**: **Natural PRNU Sensor Noise** — The image exhibits standard microscopic noise variance consistent with physical digital camera sensors.
* **$\text{Score} > 0.50$**: **Unnaturally Smooth (Deepfake)** — The image lacks natural microscopic noise grain, indicating it was synthetically generated or heavily denoised.

---

## 4. Visual Diagnostics Specification

| File Name | Filter Type | Colormap | Display Features |
| :--- | :--- | :---: | :--- |
| **`noise_denoised.jpg`** | Non-Local Means (NLM) | Grayscale | Structural edge-preserved clean base image $\hat{I}_{\text{NLM}}$ |
| **`noise_map.jpg`** | Normalized PRNU Residual | `JET` | Color-mapped noise residual blended over original image ($40\%/80\%$) |
| **`noise_srm_map.jpg`**| 2nd-Order SRM Derivative | `MAGMA` | Log-compressed high-pass residual highlighting blending seams |

---

## 5. Interface Specification & Schema

### Function Signature
```python
def analyze_sensor_noise(
    image_rgb: np.ndarray,
    output_dir: str,
    prefix: str = "noise",
    quality_multiplier: float = 1.0
) -> dict
```

### Return Payload:
```json
{
  "noise_map_path": "uploads/job-id/noise_map.jpg",
  "denoised_map_path": "uploads/job-id/noise_denoised.jpg",
  "srm_map_path": "uploads/job-id/noise_srm_map.jpg",
  "noise_variance": 0.8421,
  "noise_score": 0.5132,
  "explanation": {
    "what_happened": "Extracted the Photo Response Non-Uniformity (PRNU) noise residual using Non-Local Means Denoising.",
    "result": "Unnaturally Smooth (Deepfake)",
    "why_it_happened": "The image lacks the natural microscopic noise grain produced by physical camera sensors, indicating it was synthetically generated.",
    "variables": {
      "Noise Variance": "0.84",
      "Expected Range": "[2.0 - 15.0]"
    }
  }
}
```

---

## 6. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `noise_score` feeds as **Input Feature Index 4** (`noise_score`) into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Highly correlated with **Feature 1 (`spectral_score`)** and **Feature 13 (`cfa_score`)**. When a deepfake generator suppresses high frequencies, spectral analysis detects loss of Fourier energy, CFA analysis detects missing Bayer interpolation, and noise analysis detects near-zero PRNU variance.
* **Safety Guards Handled**:
  1. **Log-Zero Singularities**: Log compression in SRM visualization adds $\epsilon = 10^{-5}$ (`np.log(srm_noise + 1e-5)`) preventing mathematical divergence on flat black regions.
  2. **IQA Scaling**: Quality multiplier $Q$ adjusts expected noise bounds, ensuring compressed JPEG captures do not trigger false positive deepfake scores.
