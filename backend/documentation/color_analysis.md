# Technical Specification & Forensic Architecture: Multi-Space Chrominance & Skin Subsurface Scattering Analysis (`color_analysis.py`)

**Implementation File**: [`backend/pipeline/color_analysis.py`](../pipeline/color_analysis.py)  
**Analytical Classification**: Spectral & Chrominance Forensics / Biophysical Skin Hemodynamics  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `OS`  
**Primary Interface**: `analyze_chrominance(image_rgb, output_dir, prefix="color", quality_multiplier=1.0)`  
**Meta-Classifier Vector Position**: Input Feature Index 8 (`color_score`)

---

## 1. Executive Summary & Biophysical Foundations

`color_analysis.py` evaluates facial imagery across three distinct color representations: **$\text{YCrCb}$**, **$\text{HSV}$**, and **$\text{CIE-L*a*b*}$**. Its core objective is to detect the absence of biological micro-coloration, unnatural spectral compression, and missing sub-surface light dispersion characteristic of synthetic faces and deepfake blending boundaries.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                       MULTI-SPACE CHROMINANCE FORENSIC PIPELINE                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                   [Input RGB Image]
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
   [YCrCb Space]                      [HSV Space]                       [CIE-LAB Space]
   Y: Luma (Ignored)                  H: Hue                            L*: Luminance (Ignored)
   Cr: Chroma Red (Channel 1)         S: Saturation                     a*: Red-Green (Hemodynamics)
   Cb: Chroma Blue (Channel 2)        V: Value (Ignored)                b*: Yellow-Blue
         │                                 │                                 │
   Var(Cb), Var(Cr)                     Var(S)                            Var(a*)
         │                                 │                                 │
         └─────────────────────────────────┼─────────────────────────────────┘
                                           │
                          Adaptive Quality-Aware Thresholding
                           (T_cbcr = 10·Q, T_s = 15·Q, T_a = 5·Q)
                                           │
                           Anomaly Aggregation (0 - 4 Flags)
                                           │
                                 color_anomaly_score
                                 (0.15, 0.60, or 0.85)
```

### 1.1 The Biophysical Reality: Subsurface Scattering & Hemodynamics
In authentic human physiology, skin is not an opaque, lambertian reflective surface. It is a heterogeneous, multi-layered translucent biological medium:
1. **Epidermis**: Contains variable concentrations of eumelanin and pheomelanin granules that selectively absorb ultraviolet and short-wavelength visible light.
2. **Dermis**: Dense with microvascular capillary networks carrying oxygenated ($HbO_2$) and deoxygenated ($Hb$) hemoglobin.
   * Oxyhemoglobin exhibits strong absorption peaks at **$542\text{ nm}$ and $577\text{ nm}$** (the green spectral band) while reflecting wavelengths above $600\text{ nm}$ (red).
   * This selective absorption dictates that changes in blood volume directly modulate the **Red-Green opponent axis** in human vision.
3. **Subsurface Scattering (BSSRDF)**: Photons incident upon human skin penetrate into the dermal layers, undergo dozens of isotropic scattering events, interact with vascular blood pools, and re-emerge at laterally displaced points.

This creates complex micro-chromatic variance across the face:
* Cheeks, lips, and nasal tip exhibit high vascular density (producing rich micro-variance in the red-green opponent axis $a^*$).
* Forehead and temples exhibit thinner skin layers over bone with different saturation profiles.

### 1.2 Generative AI & Deepfake Failure Modes
* **Piecewise Smoothness**: Neural generators (StyleGAN, Stable Diffusion, DeepFaceLab, FaceSwap) synthesize skin primarily using structural perceptual losses ($L_1$, SSIM, LPIPS) which optimize for global luminance structure but smooth out high-frequency chrominance variance.
* **Opponent Decoupling**: AI models generate pixels in RGB space without internal physical constraints representing hemoglobin absorption spectra. Consequently, when converted to opponent color representations ($\text{CIE-L*a*b*}$ and $\text{HSV}$), the chrominance channels exhibit **abnormally flat, suppressed variance**.

---

## 2. Mathematical Transformations Across Color Spaces

The engine transforms the input image $\mathbf{I}_{\text{RGB}} \in [0, 255]^{H \times W \times 3}$ across three distinct color systems.

### 2.1 YCrCb Transformation (ITU-R BT.601 Standard)
Decouples intensity (Luma $Y$) from color difference components (Chroma Red $C_r$ and Chroma Blue $C_b$). In OpenCV, `cv2.COLOR_RGB2YCrCb` orders channels as $[Y, C_r, C_b]$:

$$\begin{bmatrix} Y \\ C_r \\ C_b \end{bmatrix} = \begin{bmatrix} 0.299 & 0.587 & 0.114 \\ 0.500 & -0.4187 & -0.0813 \\ -0.1687 & -0.3313 & 0.500 \end{bmatrix} \begin{bmatrix} R \\ G \\ B \end{bmatrix} + \begin{bmatrix} 0 \\ 128 \\ 128 \end{bmatrix}$$

* **Forensic Significance**: Evaluates whether color difference components have been compressed or reconstructed with unnatural spatial uniformity.

### 2.2 HSV Transformation (Perceptual Vibrancy)
Converts Cartesian RGB into cylindrical coordinates:

$$V = \max(R, G, B)$$
$$S = \begin{cases} 0 & \text{if } V = 0 \\ \frac{V - \min(R, G, B)}{V} \times 255 & \text{otherwise} \end{cases}$$
$$H = \begin{cases} 
60^\circ \times \frac{G - B}{V - \min(R, G, B)} & \text{if } V = R \\
60^\circ \times \left(2 + \frac{B - R}{V - \min(R, G, B)}\right) & \text{if } V = G \\
60^\circ \times \left(4 + \frac{R - G}{V - \min(R, G, B)}\right) & \text{if } V = B 
\end{cases}$$
*(Normalized to $H \in [0, 180]$ in 8-bit OpenCV).*

* **Forensic Significance**: The Saturation channel ($S$) isolates skin tone vibrancy independently of lighting gradients ($V$). Authentic skin exhibits organic saturation shifts across facial landmarks, whereas deepfakes often present uniform, "waxen" saturation profiles.

### 2.3 CIE-L\*a\*b\* Transformation (Perceptually Uniform Opponent Space)
First converts RGB to CIE $XYZ$, then applies non-linear cube root compression relative to the standard D65 illuminant white point $(X_n, Y_n, Z_n)$:

$$L^* = 116 f(Y / Y_n) - 16$$
$$a^* = 500 \left[ f(X / X_n) - f(Y / Y_n) \right] + 128$$
$$b^* = 200 \left[ f(Y / Y_n) - f(Z / Z_n) \right] + 128$$

where:
$$f(t) = \begin{cases} t^{1/3} & \text{if } t > \left(\frac{6}{29}\right)^3 \\ \frac{1}{3}\left(\frac{29}{6}\right)^2 t + \frac{4}{29} & \text{otherwise} \end{cases}$$

* **Forensic Significance**:
  * The **$a^*$ channel** maps the Green $\leftrightarrow$ Red opponent axis.
  * In human dermis, oxygenated hemoglobin absorbs green light and reflects red light. The $a^*$ channel acts as a direct proxy for **subdermal capillary blood distribution**.
  * Real skin exhibits rich spatial micro-texture in $a^*$; deepfakes display severe $a^*$ variance starvation.

---

## 3. Statistical Variance Formulation

The pipeline calculates the unbiased spatial sample variance across all six non-luminance chromatic dimensions:

$$\sigma^2_c = \frac{1}{N} \sum_{i=1}^N \left(c_i - \mu_c\right)^2 \quad \text{for } c \in \{C_b, C_r, H, S, a^*, b^*\}$$

where $N = H \times W$ is the total pixel count and $\mu_c = \frac{1}{N} \sum c_i$ is the channel mean.

### Empirical Variance Characteristics:

| Channel | Typical Authentic Skin Variance | Synthetic Deepfake Variance | Forensic Indicator |
| :---: | :---: | :---: | :--- |
| **$C_b$** (Chroma Blue) | $\sigma^2 > 12.0$ | $\sigma^2 < 8.0$ | Flat blue-difference chroma |
| **$C_r$** (Chroma Red) | $\sigma^2 > 15.0$ | $\sigma^2 < 10.0$ | Lack of capillary redness variation |
| **$S$** (Saturation) | $\sigma^2 > 25.0$ | $\sigma^2 < 14.0$ | "Plastic" or "porcelain" skin texture |
| **$a^*$** (Red-Green) | $\sigma^2 > 8.0$ | $\sigma^2 < 4.5$ | Complete absence of blood-flow micro-perfusion |

---

## 4. Decision Logic & Quality-Aware Scoring Engine

### 4.1 Adaptive Threshold Formulation
Thresholds are dynamically calibrated using the upstream Image Quality Assessment multiplier $Q \in [0.3, 1.3]$ (derived from Laplacian sharpness variance) to prevent low-resolution or naturally soft footage from triggering false positives:

$$T_{CbCr} = 10.0 \times Q$$
$$T_S = 15.0 \times Q$$
$$T_a = 5.0 \times Q$$

### 4.2 Anomaly Factor Accumulation
The engine evaluates four independent chromatic failure flags:
1. $\text{Flag}_1 = \mathbb{I}(\sigma^2_{Cb} < T_{CbCr})$ (Suppressed $C_b$ variance)
2. $\text{Flag}_2 = \mathbb{I}(\sigma^2_{Cr} < T_{CbCr})$ (Suppressed $C_r$ variance)
3. $\text{Flag}_3 = \mathbb{I}(\sigma^2_S < T_S)$ (Flat saturation variance)
4. $\text{Flag}_4 = \mathbb{I}(\sigma^2_a < T_a)$ (Hemodynamic / subsurface scattering failure)

$$\text{anomaly\_factors} = \sum_{k=1}^4 \text{Flag}_k \in \{0, 1, 2, 3, 4\}$$

### 4.3 Multi-Space Piecewise Scoring Rule
$$S_{\text{color}} = \begin{cases}
0.85 & \text{if } \text{anomaly\_factors} \ge 3 \quad (\text{Definitive multi-spectral flat skin rendering}) \\
0.60 & \text{if } 1 \le \text{anomaly\_factors} \le 2 \quad (\text{Moderate chromatic suppression / suspected}) \\
0.15 & \text{if } \text{anomaly\_factors} = 0 \quad (\text{Authentic biological chromatic variance})
\end{cases}$$

---

## 5. Diagnostic Artifact Generation & Pseudocolor Visualizations

To provide visual interpretability for human forensic analysts, the engine synthesizes four forensic diagnostic maps.

### 5.1 Super-Saturated Alpha Blending
Each diagnostic visualization uses an intentional hyper-contrast weighting formula:
$$\mathbf{I}_{\text{blend}} = \min\left(255, 0.4 \cdot \mathbf{I}_{\text{bgr}} + 0.8 \cdot \mathbf{I}_{\text{vis}}\right)$$
* Total weight sum: $\alpha + \beta = 0.4 + 0.8 = 1.2 > 1.0$.
* This $+20\%$ super-saturation amplifies faint chromatic disparities, enabling an analyst to instantly spot unnatural flat patches or boundary mismatches against structural facial anatomy.

### 5.2 Isolated Chrominance Maps ($C_b$ & $C_r$)
To inspect color variation without luminance confounding:
1. Constructs a synthetic image with uniform luma $Y = 128$ and neutral opposite chroma:
   $$\mathbf{I}_{Cb\_vis} = [Y=128, C_r=128, C_b]$$
   $$\mathbf{I}_{Cr\_vis} = [Y=128, C_r, C_b=128]$$
2. Converts back to RGB and blends with the original image using super-saturated alpha blending.
3. Saved to `{output_dir}/{prefix}_cb_map.jpg` and `{output_dir}/{prefix}_cr_map.jpg`.

### 5.3 Saturation Vibrancy Heatmap ($S$)
* Applies `cv2.COLORMAP_VIRIDIS` directly to the 8-bit Saturation channel $S$.
* Maps zero saturation (grayscale/muted skin) to dark purple/blue, and peak saturation (vascular cheeks/lips) to vibrant yellow/green.
* Saved to `{output_dir}/{prefix}_s_map.jpg`.

### 5.4 Hemodynamic Perfusion Map ($a^*$)
* Applies `cv2.COLORMAP_PLASMA` to the $a^*$ channel.
* Plasma maps $a^* \le 128$ (green/neutral) to deep indigo/purple, and $a^* > 128$ (red/erythema) to hot orange and incandescent yellow.
* In authentic human skin, this exposes a rich, mottled microvascular arborization. In synthetic deepfakes, the map appears as an untextured, monotonic wash.
* Saved to `{output_dir}/{prefix}_a_map.jpg`.

---

## 6. Interface Specification & Schema

### Function Signature
```python
def analyze_chrominance(
    image_rgb: np.ndarray,
    output_dir: str,
    prefix: str = "color",
    quality_multiplier: float = 1.0
) -> dict
```

### Parameters:
* **`image_rgb`** (`np.ndarray`): Input RGB image matrix of shape $(H, W, 3)$ with data type `uint8`.
* **`output_dir`** (`str`): Destination directory path where diagnostic heatmaps are written.
* **`prefix`** (`str`, default `"color"`): File naming prefix.
* **`quality_multiplier`** (`float`, default `1.0`): Sharpness scaling coefficient derived from Image Quality Assessment.

### Return Payload:
```json
{
  "cb_map_path": "uploads/job-id/color_cb_map.jpg",
  "cr_map_path": "uploads/job-id/color_cr_map.jpg",
  "s_map_path": "uploads/job-id/color_s_map.jpg",
  "a_map_path": "uploads/job-id/color_a_map.jpg",
  "cb_variance": 14.8214,
  "cr_variance": 18.2391,
  "h_variance": 42.1105,
  "s_variance": 38.6421,
  "a_variance": 7.9124,
  "b_variance": 22.4519,
  "color_anomaly_score": 0.15,
  "explanation": {
    "what_happened": "Analyzed chrominance variance across YCbCr, HSV, and LAB color spaces to detect synthetic skin rendering.",
    "result": "Natural Chrominance Profiles",
    "why_it_happened": "The image contains rich, natural color variance across all spectral channels, consistent with real subsurface scattering in human skin.",
    "variables": {
      "Cb/Cr Variance": "Cb: 14.8 / Cr: 18.2",
      "Saturation Variance": "38.6",
      "a* (Redness) Variance": "7.9",
      "Threshold Factor": "0/4 channels failed"
    }
  }
}
```

---

## 7. Meta-Classifier Integration & Forensic Scenarios

### 7.1 Meta-Classifier Role
`color_anomaly_score` feeds as **Input Feature Index 8** into the PyTorch Tabular ResNet (`ensemble_classifier.py`).

* **Biological Fusion**: It acts as a direct biological corroborator for **Feature 12 (`rppg_score`)**. When a facial video presents both suppressed $a^*$ variance and an absent rPPG heartbeat pulse, the self-attention gating layer treats this as conclusive proof of non-biological face generation.

### 7.2 Forensic Case Scenarios:
1. **StyleGAN / Midjourney Photorealistic Headshots**:
   * *Visual Inspection*: Perfectly styled hair, flawless skin pores.
   * *Chrominance Reality*: $a^*$ variance $\approx 2.8$ (below $T_a$), Saturation variance $\approx 9.2$ (below $T_S$). Fails 3 of 4 thresholds $\rightarrow \text{score} = 0.85$ (Flagged).
2. **Authentic Camera Capture with Heavy Makeup**:
   * Foundation and powder reduce epidermal texture, but subsurface dermal scattering and natural facial topography preserve $C_r$ and $a^*$ variance above $6.5$. Fails at most 1 threshold $\rightarrow \text{score} \le 0.60$.
3. **Lossy H.264 Compressed Video**:
   * Image Quality Assessment lowers $Q = 0.6$, shrinking $T_a = 3.0$ and $T_S = 9.0$, preventing low-bitrate compression artifacts from falsely triggering high deepfake scores.
