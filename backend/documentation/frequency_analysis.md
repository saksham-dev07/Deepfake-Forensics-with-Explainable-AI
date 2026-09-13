# Technical Specification & Forensic Architecture: Frequency Domain & Spectral Forensics (`frequency_analysis.py`)

**Implementation File**: [`backend/pipeline/frequency_analysis.py`](../pipeline/frequency_analysis.py)  
**Analytical Classification**: 2D Fourier Analysis / Discrete Cosine Transform / Wavelet & Cepstral Decomposition  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `PyWavelets (pywt)`, `OS`  
**Primary Interface**: `analyze_frequency_domain(image_rgb, output_dir, prefix="freq", quality_multiplier=1.0)`  
**Meta-Classifier Vector Position**: Input Feature Index 1 (`spectral_score`)

---

## 1. Executive Summary & Spectral Forensic Theory

`frequency_analysis.py` exposes digital manipulations, synthetic generative models (GANs, VAEs, Latent Diffusion), and splicing boundaries in the spatial frequency domain.

While state-of-the-art generative networks produce photorealistic textures in the spatial domain, their underlying mathematical generation process leaves permanent, indelible signatures in the frequency domain. Deep convolutional decoders rely on upsampling operators—primarily **Strided Transpose Convolutions (`ConvTranspose2d`)** and **Sub-Pixel Interpolations**—which induce periodic zero-padding and kernel overlap. In Fourier and Cosine space, these operations manifest as **high-frequency periodic checkerboard artifacts, $1/f^\alpha$ power-law violations, and severe high-frequency energy suppression** (Frank et al., ICML 2020; Durall et al., CVPR 2020).

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          FREQUENCY DOMAIN FORENSIC TOPOLOGY                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input RGB Image]
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
  [2D FFT Engine]       [2D DCT Engine]              [Spatial Noise]        [Multi-Scale Wavelet]
  - Hanning Windowing   - Full-Frame DCT             - Switching Noise (SWN) - 2D Haar DWT (LL,LH,HL,HH)
  - Centered Magnitude  - Vectorized 8×8 Blocks       - High-Pass Filter     - 2D Cepstrum (Echoes)
  - Azimuthal 1/f Fit   - Diagonal HF Arcs           - Phase Spectrum       - Spectral Saliency (Residual)
  - Per-Channel R,G,B   - Block Variance                                    - PCA Decomposition (PC3)
      │                      │                               │                      │
      └──────────────────────┼───────────────────────────────┴──────────────────────┘
                             │
            [Continuous Spectral Anomaly Scoring]
            Piecewise Linear HF Ratio Interpolation (t1, t2, t3)
            + Azimuthal 1/f Deviation Penalty
            + Cross-Channel Variance Penalty
            + PCA PC3 Residual Penalty
            + Spectral Saliency Grid Penalty
            + DWT & Cepstrum Penalties
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
    [Meta-Classifier Vector]         [10 Component Verdicts]
    spectral_score ∈ [0.0, 1.0]      FFT, DCT, Block, SWN, PCA, DWT...
```

---

## 2. Theoretical Foundations: The Mathematics of Spectral Artifacts

### 2.1 The Natural Image Power Law ($1/f^\alpha$)
Authentic photographs captured by physical camera sensors exhibit an isotropic radially averaged power spectrum that decays with spatial frequency $f$ following a standard power law:

$$P(f) \propto \frac{1}{f^\alpha} \quad \text{where } \alpha \approx 2.0$$

Taking the natural logarithm yields a strictly linear decay:
$$\ln P(f) = -\alpha \ln f + C$$

* **The Generative Anomaly**: Neural networks fail to preserve this continuous decay. They either exhibit severe **high-frequency starvation** (due to smoothness loss terms such as $L_1$/$L_2$) or manifest **high-frequency spikes** at resonant frequencies corresponding to stride lengths ($2\times, 4\times, 8\times$).

### 2.2 Transpose Convolution Checkerboard Grid
A 1D deconvolution of stride $s$ and kernel size $k$ produces an output sequence with periodic overlap when $k$ is not cleanly divisible by $s$. In 2D, this creates a 2D spatial grid $g(x, y)$ of period $T$. In the frequency domain, the Fourier Transform of a periodic spatial impulse train is an orthogonal frequency grid:

$$\mathcal{F}\left[ \sum_{m, n} \delta(x - mT, y - nT) \right] = \frac{1}{T^2} \sum_{u, v} \delta\left(u - \frac{u}{T}, v - \frac{v}{T}\right)$$

This mathematical resonance produces bright, symmetrical starburst and grid patterns in the FFT and DCT spectrum.

---

## 3. Sub-Engine Analysis & Mathematical Implementations

### 3.1 2D Fast Fourier Transform (FFT) & Leakage Suppression
Natural images do not wrap periodically at their boundaries ($I(0, y) \ne I(W-1, y)$). Standard discrete Fourier transforms treat images as infinitely repeating toroids:

$$F(u, v) = \sum_{x=0}^{W-1} \sum_{y=0}^{H-1} f(x, y) e^{-j 2\pi \left(\frac{ux}{W} + \frac{vy}{H}\right)}$$

When opposed boundaries differ, the resulting step discontinuity behaves as a Heaviside step function $\Theta(x)$, creating an artificial $1/f$ spectral crosshair along the central axes.

To eliminate this spectral leakage, the engine applies a separable **2D Hanning Window**:
$$w(x, y) = \sin^2\left(\frac{\pi x}{W-1}\right) \sin^2\left(\frac{\pi y}{H-1}\right)$$
$$\mathbf{I}_{\text{windowed}}(x, y) = I_{\text{gray}}(x, y) \cdot w(x, y)$$
*Because both $w(x, y)$ and its first derivative $\nabla w$ vanish smoothly at all four borders, the toroidal step discontinuity is nullified.*

* **Centered Spectrum**:
  $$\mathbf{F}(u, v) = \text{fftshift}\left(\mathcal{F}\{\mathbf{I}_{\text{windowed}}\}\right)$$
  $$\text{Magnitude}(u, v) = 20 \log_{10}(|\mathbf{F}(u, v)| + 10^{-10})$$
* **High-Frequency Energy Ratio**:
  Calculated over the outer $30\%$ of the radial frequency disc:
  $$\text{HF Mask} = \left[ (u, v) : \sqrt{(u - c_x)^2 + (v - c_y)^2} > 0.70 \cdot R_{\max} \right]$$
  $$\text{hf\_ratio} = \frac{\sum_{(u, v) \in \text{HF Mask}} |\mathbf{F}(u, v)|^2}{\sum_{\text{all }} |\mathbf{F}(u, v)|^2}$$
* **Embedded Radial Profile Mini-Chart**:
  Computes azimuthal radial average $A(r) = \frac{1}{|\mathcal{C}_r|} \sum_{(u, v) \in \mathcal{C}_r} \text{Magnitude}(u, v)$ and plots an embedded HUD curve in the bottom-right corner of `{prefix}_fft_magnitude.jpg`.

---

### 3.2 2D Discrete Cosine Transform (DCT) & High-Frequency Arcs
The 2D-DCT operates with symmetric boundary conditions, avoiding edge discontinuities without requiring a window function:

$$F_{\text{DCT}}(u, v) = \alpha_u \alpha_v \sum_{x=0}^{W-1} \sum_{y=0}^{H-1} I(x, y) \cos\left[\frac{\pi (2x+1)u}{2W}\right] \cos\left[\frac{\pi (2y+1)v}{2H}\right]$$

* **Orientation**: DC resides at the top-left $(0, 0)$, with spatial frequency increasing radially toward the bottom-right corner $(W-1, H-1)$.
* **Diagonal Energy Metric**:
  $$r_{\text{diag}}(u, v) = \sqrt{u^2 + v^2}, \quad R_{\text{max}} = \sqrt{W^2 + H^2}$$
  $$\text{dct\_hf\_ratio} = \frac{\sum_{r_{\text{diag}} > 0.70 R_{\text{max}}} |F_{\text{DCT}}(u, v)|^2}{\sum_{\text{all }} |F_{\text{DCT}}(u, v)|^2}$$
* **Visual Representation**: Quarter-circle arcs delineate DC ($5\%$), Low-Freq ($15\%$), Mid-Freq ($35\%$), and High-Freq ($65\%$) bands, mapped via `COLORMAP_INFERNO` and saved to `{prefix}_dct_spectrum.jpg`.

---

### 3.3 Vectorized $8 \times 8$ Block-Wise DCT Grid Disruption
JPEG-compressed source images possess rigid $8 \times 8$ block boundary alignments. Spliced face swaps disrupt this underlying grid.

* **Tensorized Parallel Matrix Multiplication**:
  Rather than using nested Python loops, the engine constructs the $8 \times 8$ DCT-II orthogonal transform matrix $\mathbf{A} \in \mathbb{R}^{8 \times 8}$:
  $$A(k, n) = \begin{cases} \sqrt{\frac{1}{8}} & \text{if } k = 0 \\ \sqrt{\frac{2}{8}} \cos\left(\frac{\pi(2n+1)k}{16}\right) & \text{if } k > 0 \end{cases}$$
  The padded image $\mathbf{X} \in \mathbb{R}^{H_p \times W_p}$ (centered around 0 via $-128.0$) is reshaped into a 4D tensor of blocks:
  $$\mathbf{X}_{\text{blocks}} \in \mathbb{R}^{(H_p/8) \times (W_p/8) \times 8 \times 8}$$
  The 2D-DCT for all blocks across the entire image is evaluated in a single vectorized operation:
  $$\mathbf{Y}_{\text{blocks}} = \mathbf{A} \mathbf{X}_{\text{blocks}} \mathbf{A}^T$$
* **Lower-Triangular High-Frequency Mask**:
  Isolates high diagonal AC frequencies via `np.tri(8, 8, -3, dtype=bool).T`:
  $$\mathbf{E}_{\text{block}}(i, j) = \sum_{u+v \ge 5} |Y_{i, j}(u, v)|$$
* **Anomaly Z-Scoring**:
  $$Z(i, j) = \frac{\ln(1 + \mathbf{E}_{\text{block}}(i, j)) - \mu}{\sigma}$$
  Blocks with $|Z| > 2.0$ are flagged as anomalous, contoured in cyan, and overlaid on the image with an attached vertical colorbar strip. Saved to `{prefix}_block_dct.jpg`.

---

### 3.4 Switching Noise Estimator (SWN)
* **Citation**: Ranjbaran et al., *Multi-Resolution Switching Noise Filter*, 2015.
* **Objective**: Isolates pure high-frequency zero-crossing sensor noise while suppressing physical structural edges.
1. Computes forward 1st and 2nd differences:
   $$g_x(x, y) = u(x+1, y) - u(x, y), \quad g_{x, dx}(x, y) = u(x+2, y) - u(x+1, y)$$
   $$g_y(x, y) = u(x, y+1) - u(x, y), \quad g_{y, dy}(x, y) = u(x, y+2) - u(x, y+1)$$
2. Continuous zero-crossing Heaviside detection via steep arctan switch:
   $$h_x = \frac{1}{\pi} \left[ \frac{\pi}{2} + \arctan\left(-300 \cdot g_x \cdot g_{x, dx}\right) \right]$$
   $$h_y = \frac{1}{\pi} \left[ \frac{\pi}{2} + \arctan\left(-300 \cdot g_y \cdot g_{y, dy}\right) \right]$$
   *Mathematical Proof of Switch*: When $g_x$ and $g_{x, dx}$ have opposite signs (indicating a high-frequency zero-crossing oscillation), $-300 \cdot g_x \cdot g_{x, dx} > 0 \implies \arctan \rightarrow +\pi/2 \implies h_x \rightarrow 1.0$. If monotonic (a physical ramp edge), signs match $\implies -300 \cdot g_x \cdot g_{x, dx} < 0 \implies \arctan \rightarrow -\pi/2 \implies h_x \rightarrow 0.0$.
3. Gaussian edge suppression:
   $$w_x = \exp\left(-50 \cdot (g_x + g_{x, dx})^2\right), \quad w_y = \exp\left(-50 \cdot (g_y + g_{y, dy})^2\right)$$
4. Noise Map Formulation:
   $$\text{SWN}(x, y) = h_x \cdot h_y \cdot w_x \cdot w_y$$
   Regions with $Z_{\text{SWN}} > 2.0$ and contour area $> 50\text{ px}$ are extracted as anomalies (`swn_anomaly_ratio`). Saved to `{prefix}_swn_noise.jpg`.

---

### 3.5 Spectral Residual Saliency
* **Citation**: Hou & Zhang, *Saliency Detection: A Spectral Residual Approach*, CVPR 2007.
* **Objective**: Exposes generative transpose convolution checkerboards by subtracting the natural image spatial frequency background prior.
1. Evaluates log amplitude: $\mathcal{A}(u, v) = \ln(|\mathcal{F}\{I\}| + 10^{-8})$.
2. Computes smooth average spectrum via $3 \times 3$ box filter: $\bar{\mathcal{A}}(u, v) = h_{3 \times 3} * \mathcal{A}(u, v)$.
3. Extracts spectral residual:
   $$\mathcal{R}(u, v) = \mathcal{A}(u, v) - \bar{\mathcal{A}}(u, v)$$
4. Reconstructs spatial saliency map via Inverse FFT:
   $$\mathbf{S}(x, y) = \left| \mathcal{F}^{-1}\left[ \exp\left(\mathcal{R}(u, v) + i \cdot \text{Phase}(u, v)\right) \right] \right|^2$$
5. Evaluates spatial saliency variance $\text{Var}(\mathbf{S})$. High variance indicates sharp periodic grid spikes. Saved to `{prefix}_saliency_map.jpg`.

---

### 3.6 2D Cepstrum Analysis
Computes the power cepstrum (the inverse Fourier transform of the log magnitude spectrum) to detect resampling, downsampling, and generative lattice echoes:

$$\mathbf{C}(p, q) = \left| \mathcal{F}^{-1}\left[ \ln\left( |\mathcal{F}\{\mathbf{I} \odot \mathbf{W}_{\text{hann}}\}| + 1.0 \right) \right] \right|$$

* Centers the cepstrum and zeroes out the massive central $7 \times 7$ DC spike.
* Evaluates variance $\text{cepstrum\_var} = \text{Var}(\mathbf{C}_{\text{log}})$. High variance indicates structural echoes from generative latent lattices. Saved to `{prefix}_cepstrum.jpg`.

---

### 3.7 2D Haar Discrete Wavelet Transform (DWT)
Decomposes the image into four orthogonal spatial frequency quadrants using Haar scaling ($h = [\frac{1}{\sqrt{2}}, \frac{1}{\sqrt{2}}]$) and wavelet ($g = [-\frac{1}{\sqrt{2}}, \frac{1}{\sqrt{2}}]$) filter banks:
$$\text{DWT}_2(I) \rightarrow [LL, (LH, HL, HH)]$$
* $LL$: Approximation coefficients (Low-pass horizontal & vertical).
* $LH$: Horizontal detail coefficients ($h \otimes g$).
* $HL$: Vertical detail coefficients ($g \otimes h$).
* $HH$: Diagonal high-frequency detail coefficients ($g \otimes g$).
* Stitches into a $2 \times 2$ quadrant grid with white dividing crosshairs. Evaluates variance of diagonal details $\text{Var}(HH)$. Deepfakes show severe loss of high-frequency diagonal noise ($\text{Var}(HH) < 0.5$). Saved to `{prefix}_dwt_diagonal.jpg`.

---

### 3.8 Per-Channel Chrominance Spectral Consistency
Evaluates high-frequency energy ratio independently across R, G, and B:
$$\mathbf{r}_{\text{RGB}} = [r_R, r_G, r_B], \quad \text{channel\_variance} = \text{std}(\mathbf{r}_{\text{RGB}})$$
GAN generators often upsample RGB channels independently, causing anomalous imbalances (e.g. blue channel lacks texture while red and green contain normal energy).

---

### 3.9 PCA Spectral Decomposition
Performs Principal Component Analysis on flattened RGB pixels $\mathbf{X} \in \mathbb{R}^{N \times 3}$:
$$\mathbf{C} = \frac{1}{N} (\mathbf{X} - \bar{\mathbf{X}})^T (\mathbf{X} - \bar{\mathbf{X}})$$
Projects pixels onto the 3rd eigenvector ($\mathbf{e}_3$, smallest variance component):
$$\text{PC3} = (\mathbf{X} - \bar{\mathbf{X}}) \mathbf{e}_3$$
PC3 strips dominant illumination and highlights microscopic GAN color residuals. Saved to `{prefix}_pca_pc3.jpg`.

---

## 4. Anomaly Scoring Formulation & Calibration

The comprehensive `spectral_anomaly_score` synthesizes continuous piecewise interpolation modulated by the Image Quality Assessment multiplier $Q$:

### 4.1 Base Anomaly Calibration:
$$t_1 = 0.001 \cdot Q, \quad t_2 = 0.0002 \cdot Q, \quad t_3 = 0.00005 \cdot Q$$

$$S_{\text{base}} = \begin{cases} 
0.10 & \text{if } \text{hf\_ratio} \ge t_1 \\
0.10 + \frac{t_1 - \text{hf\_ratio}}{t_1 - t_2} \times 0.15 & \text{if } t_2 \le \text{hf\_ratio} < t_1 \\
0.25 + \frac{t_2 - \text{hf\_ratio}}{t_2 - t_3} \times 0.30 & \text{if } t_3 \le \text{hf\_ratio} < t_2 \\
0.75 & \text{if } \text{hf\_ratio} < t_3 
\end{cases}$$

### 4.2 Quality Multiplier ($Q$) Dynamic Scaling Proof:
* **High-Frequency Thresholds ($t \propto Q$)**: When an image is blurry or compressed ($Q < 1.0$), natural high frequencies are attenuated. Thresholds scale down proportionally ($0.001 \cdot Q$), ensuring authentic soft photos are not falsely convicted.
* **Variance Thresholds ($t \propto 1/Q$)**: Cross-channel variance ($0.02 / Q$) and PCA residual variance ($0.05 / Q$) scale inversely. In low-bitrate imagery, lossy compression artifacts naturally elevate channel disparities, so the threshold expands to absorb compression noise.

### 4.3 Additive Penalty Accumulator:
* **Azimuthal $1/f$ Deviation**:
  $$\text{IF } \sigma(\ln P - \text{fitted}) > 2.0 \implies S \leftarrow \min(S + 0.15, 0.95)$$
  $$\text{ELSE IF } \sigma(\ln P - \text{fitted}) > 1.0 \implies S \leftarrow \min(S + 0.05, 0.90)$$
* **Cross-Channel Variance**:
  $$\text{IF } \text{channel\_variance} > \frac{0.02}{Q} \implies S \leftarrow \min(S + 0.20, 0.95)$$
* **PCA PC3 Variance**:
  $$\text{IF } \text{pc3\_var\_ratio} > \frac{0.05}{Q} \implies S \leftarrow \min(S + 0.10, 0.95)$$
* **Spectral Saliency Checkerboard**:
  $$\text{IF } \text{saliency\_variance} > 1500 \implies S \leftarrow \min(S + 0.20, 0.95)$$
* **Wavelet & Cepstrum Penalties**:
  $$\text{IF } \text{dwt\_var} < 0.5 \implies S \leftarrow \min(S + 0.15, 0.95)$$
  $$\text{IF } \text{cepstrum\_var} > 0.05 \implies S \leftarrow \min(S + 0.15, 0.95)$$
* Final score: $\text{spectral\_anomaly\_score} = \text{clamp}(S, 0.0, 1.0)$.

---

## 5. Ten-Component Diagnostic Verdicts Matrix

| Sub-Test | FAIL Threshold | WARNING Threshold | PASS Threshold | Diagnostic Meaning |
| :--- | :---: | :---: | :---: | :--- |
| **`fft`** | $\le 0.0001$ | — | $> 0.0001$ | Global high-frequency energy ratio |
| **`dct`** | $\le 0.00001$ | — | $> 0.00001$ | Diagonal high-frequency DCT energy |
| **`block_dct`** | $> 5000.0$ | $1000.0 - 5000.0$ | $< 1000.0$ | $8 \times 8$ JPEG block boundary variance |
| **`high_pass`** | $\le 100.0$ | — | $> 100.0$ | Spatial high-pass residual edge variance |
| **`phase`** | $< 0.50$ | $0.50 - 1.50$ | $> 1.50$ | Structural Fourier phase coherence |
| **`swn`** | $> 0.05$ | $0.01 - 0.05$ | $< 0.01$ | Switching noise zero-crossing anomaly ratio |
| **`pca`** | $\ge 0.05$ | — | $< 0.05$ | 3rd Principal Component variance ratio |
| **`saliency`** | $> 1500.0$ | $500.0 - 1500.0$ | $< 500.0$ | Spectral residual transpose convolution grid |
| **`cepstrum`** | $> 0.05$ | $0.03 - 0.05$ | $< 0.03$ | Homomorphic 2D cepstral echo variance |
| **`dwt`** | $< 0.50$ | $0.50 - 1.00$ | $> 1.00$ | Haar diagonal ($HH$) wavelet detail energy |

---

## 6. Visual Artifacts Specification

| File Name | Transform Type | Colormap | Display Features |
| :--- | :--- | :---: | :--- |
| **`freq_fft_magnitude.jpg`** | 2D FFT Magnitude | `INFERNO` | Centered DC, 4 band rings, embedded radial profile mini-chart |
| **`freq_dct_spectrum.jpg`** | Full-Frame 2D DCT | `INFERNO` | Top-left DC, 4 diagonal arcs, diagonal guide line |
| **`freq_block_dct.jpg`** | Vectorized $8 \times 8$ Block DCT | `INFERNO` | Blended with grayscale, cyan anomaly contours, vertical colorbar |
| **`freq_swn_noise.jpg`** | Switching Noise Estimator | `INFERNO` | Blended with grayscale, cyan anomaly contours, vertical colorbar |
| **`freq_saliency_map.jpg`**| Spectral Residual Saliency | `HOT` | Highlights periodic transpose convolution checkerboards |
| **`freq_cepstrum.jpg`** | 2D Power Cepstrum | `JET` | DC-zeroed homomorphic echo spectrum |
| **`freq_dwt_diagonal.jpg`**| 2D Haar Wavelet DWT | `MAGMA` | $2 \times 2$ grid ($LL, LH, HL, HH$) with white crosshair dividers |
| **`freq_pca_pc3.jpg`** | PCA Decomposition | `TWILIGHT` | 3rd principal component color variance |
| **`freq_high_pass.jpg`** | FFT High-Pass Spatial Filter | `BONE` | Amplified spatial edges with inner $5\%$ DC blocked |
| **`freq_phase_spectrum.jpg`**| Fourier Phase Angle | `OCEAN` | Normalized phase field $\theta(u, v) \in [0, 255]$ |
### High-Efficiency Bandwidth Optimization:
All 10 spectral transformation artifacts are persisted via `save_optimized_image` ([`image_utils.py`](../pipeline/image_utils.py)), clamping resolutions exceeding 1080p and encoding at $Q=80$. This reduces the total spectral payload from $>10\text{ MB}$ to $<1.5\text{ MB}$, ensuring smooth A/B interactive viewport rendering on the web client.

---

## 7. Interface Specification & Schema

### Function Signature
```python
def analyze_frequency_domain(
    image_rgb: np.ndarray,
    output_dir: str,
    prefix: str = "freq",
    quality_multiplier: float = 1.0
) -> dict
```

### Return Payload:
```json
{
  "dct_spectrum_path": "uploads/job-id/freq_dct_spectrum.jpg",
  "block_dct_path": "uploads/job-id/freq_block_dct.jpg",
  "fft_magnitude_path": "uploads/job-id/freq_fft_magnitude.jpg",
  "pca_spectrum_path": "uploads/job-id/freq_pca_pc3.jpg",
  "high_pass_path": "uploads/job-id/freq_high_pass.jpg",
  "phase_spectrum_path": "uploads/job-id/freq_phase_spectrum.jpg",
  "swn_noise_path": "uploads/job-id/freq_swn_noise.jpg",
  "cepstrum_path": "uploads/job-id/freq_cepstrum.jpg",
  "dwt_diagonal_path": "uploads/job-id/freq_dwt_diagonal.jpg",
  "saliency_map_path": "uploads/job-id/freq_saliency_map.jpg",
  "high_freq_energy_ratio": 0.001425,
  "dct_hf_ratio": 0.000085,
  "channel_hf_ratios": [0.00142, 0.00145, 0.00141],
  "channel_variance": 0.000017,
  "pc3_variance_ratio": 0.0124,
  "block_variance": 421.5,
  "phase_variance": 2.14,
  "swn_anomaly_ratio": 0.004,
  "hpf_variance": 342.1,
  "cepstrum_var": 0.0125,
  "saliency_variance": 215.4,
  "dwt_var": 1.42,
  "spectral_anomaly_score": 0.10,
  "radial_profile_length": 256,
  "radial_profile": [142.1, 138.4, 132.0],
  "verdicts": {
    "fft": {"status": "Pass", "reason": "High-Freq ratio 0.00143 > 0.0001"},
    "dct": {"status": "Pass", "reason": "DCT HF energy ratio 0.000085 > 0.00001"},
    "block_dct": {"status": "Pass", "reason": "Normal block variance (421.5)"},
    "high_pass": {"status": "Pass", "reason": "Normal HF edge energy (342.1)"},
    "phase": {"status": "Pass", "reason": "Phase coherent (2.14)"},
    "swn": {"status": "Pass", "reason": "No spliced edges"},
    "pca": {"status": "Pass", "reason": "Normal PCA residuals (0.012)"},
    "saliency": {"status": "Pass", "reason": "Natural smooth edges"},
    "cepstrum": {"status": "Pass", "reason": "No structural echoes (0.0125)"},
    "dwt": {"status": "Pass", "reason": "Natural diagonal noise (1.42)"}
  },
  "explanation": {
    "what_happened": "Fourier Transforms (FFT) and Discrete Cosine Transforms (DCT) were applied to analyze the frequency-domain spectrum of the image.",
    "result": "Spectral energy appears naturally distributed.",
    "why_it_happened": "Neural networks generate images iteratively using transpose convolutions, which often leave behind microscopic, invisible 'checkerboard' artifacts in the high-frequency spectrum that physical cameras do not produce.",
    "variables": {
      "Spectral Anomaly Score": "0.10",
      "High-Freq Energy Ratio": "0.00143",
      "Saliency Variance": "215.4",
      "Block Variance": "421.5"
    }
  }
}
```

---

## 8. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `spectral_anomaly_score` feeds as **Input Feature Index 1** (`spectral_score`) into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Highly complementary to **Feature 4 (`noise_score`)** and **Feature 13 (`cfa_score`)**. When deepfake generators suppress or smooth high frequencies, the combination of CFA demosaicing failure and low spectral energy ratio provides decisive proof of synthetic generation.
* **Safety Guards Handled**:
  1. **Division-by-Zero Guards**: Guarded against zero total energy in FFT, DCT, DWT, and PCA across monochrome or black frames.
  2. **Windowing Edge Protection**: 2D Hanning window applied prior to FFT ensures spectral leakage crosshairs do not trigger false positive energy spikes.
  3. **IQA Normalization**: Dynamic scaling of anomaly thresholds by `quality_multiplier` $Q$ prevents blurry or compressed authentic images from falsely failing the high-frequency test.
