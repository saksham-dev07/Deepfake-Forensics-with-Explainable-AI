## Technical Specification & Forensic Architecture: Color Filter Array (CFA) Demosaicing Analysis (`cfa_analysis.py`)

**Implementation File**: [`backend/pipeline/cfa_analysis.py`](../pipeline/cfa_analysis.py)  
**Analytical Classification**: Hardware Sensor Forensics / Photosite Interpolation Artifact Verification  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `SciPy (convolve2d)`, `Matplotlib`  
**Primary Interface**: `analyze_cfa_artifacts(image_path, save_dir=None, face_results=None, quality_multiplier=1.0)`  
**Meta-Classifier Vector Position**: Input Feature Index 13 (`cfa_score`)

---

## 1. Executive Summary & Physics of Digital Image Sensors

`cfa_analysis.py` evaluates the presence, periodicity, and spatial consistency of **Color Filter Array (CFA)** demosaicing artifacts across digital imagery. It exposes deepfake face replacements, composited synthetic heads, and pure diffusion/GAN generations by detecting the absence or localized disruption of sensor-level hardware interpolation patterns.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           CFA DEMOSAICING FORENSIC PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Input Image] ──> Grayscale Conversion ──> 2D Separable Filter (K_cfa) ──> Residual R(x,y)
                                                                                  │
                                                                       8×8 Block Variance Mapping
                                                                                  │
                                                                       Variance Field σ²(u, v)
                                                                                  │
                                                         ┌────────────────────────┴────────────────────────┐
                                                         ▼                                                 ▼
                                                 [Face Region F]                                  [Background Mask B]
                                                 σ²_face = Mean(F)                                σ²_bg = Mean(B)
                                                         │                                                 │
                                                         └────────────────────────┬────────────────────────┘
                                                                                  │
                                                                    Variance Ratio ρ = σ²_face / σ²_bg
                                                                                  │
                                                                    Non-Linear Scoring & Codec Guard
                                                                                  │
                                                                            cfa_score ∈ [0.05, 0.95]
```

### 1.1 The Physical Principle: Bayer Pattern Demosaicing
Physical digital camera sensors (CCD and CMOS) are inherently monochromatic intensity meters incapable of discerning photon wavelength directly. To produce full-color imagery, manufacturers place a microscopic spectral mosaic—the **Bayer Color Filter Array**—over the silicon photosites:
* **Green ($G$) photosites**: Comprise $50\%$ of the sensor array arranged in a quincunx lattice (matching the peak luminous sensitivity of human photopic vision).
* **Red ($R$) and Blue ($B$) photosites**: Each comprise $25\%$ of the sensor grid in alternating row configurations (e.g., $RGGB$, $BGGR$, $GRBG$).

Because each individual photosite records only one spectral band, the missing two color channels at every pixel coordinate must be mathematically reconstructed via **demosaicing algorithms** (e.g., Adaptive Homogeneity-Directed, Bilinear, or Hamilton-Adams interpolation).

```
   Bayer CFA Matrix (2×2 Block)
       ┌────────┬────────┐
       │ Green  │  Red   │
       ├────────┼────────┤
       │  Blue  │ Green  │
       └────────┴────────┘
```

This mathematical interpolation leaves an indelible, deterministic, high-frequency spatial correlation pattern across every camera photograph.

### 1.2 Generative AI & Splicing Vulnerability
* **Pure Generative Media (Midjourney, DALL-E, Stable Diffusion, StyleGAN)**: Diffusion models and GANs synthesize full RGB tensors directly in latent space without simulating the physical optical capture through photosites. They fundamentally lack the periodic demosaicing correlations of physical cameras.
* **Deepfake Face-Swaps & Facial Splicing**: When an AI-generated face is composited into an authentic video frame:
  1. The authentic background preserves the camera's original demosaicing signature.
  2. The spliced face either completely lacks CFA periodic noise or exhibits double-interpolation blurring resulting from resampling, affine alignment, and feathering.

---

## 2. Mathematical Formulation & Frequency Analysis

### 2.1 CFA Residual Extraction Kernel
To isolate the high-frequency demosaicing grid from dominant low-frequency image content (textures, skin tones, illumination gradients), the module applies a specialized $3 \times 3$ 2D spatial convolution kernel $K_{\text{cfa}}$:

$$K_{\text{cfa}} = \begin{bmatrix} 
-0.25 &  0.50 & -0.25 \\ 
 0.50 & -1.00 &  0.50 \\ 
-0.25 &  0.50 & -0.25 
\end{bmatrix}$$

### 2.2 Frequency Response Derivation
The continuous 2D Fourier Transform of $K_{\text{cfa}}$ reveals its precise filtering characteristics:

$$\mathcal{F}\{K_{\text{cfa}}\}(\omega_x, \omega_y) = -1.0 + 0.5(e^{j\omega_x} + e^{-j\omega_x}) + 0.5(e^{j\omega_y} + e^{-j\omega_y}) - 0.25(e^{j(\omega_x+\omega_y)} + e^{-j(\omega_x+\omega_y)} + e^{j(\omega_x-\omega_y)} + e^{-j(\omega_x-\omega_y)})$$

Using Euler's identity $\cos(\theta) = \frac{e^{j\theta} + e^{-j\theta}}{2}$:

$$H(\omega_x, \omega_y) = -1.0 + \cos(\omega_x) + \cos(\omega_y) - \cos(\omega_x)\cos(\omega_y)$$
$$H(\omega_x, \omega_y) = -(1 - \cos(\omega_x))(1 - \cos(\omega_y))$$

#### Critical Frequency Properties:
1. **Zero DC Response**: At $(\omega_x = 0, \omega_y = 0)$:
   $$H(0, 0) = -(1 - 1)(1 - 1) = 0$$
   Constant lighting and flat regions produce zero output.
2. **Axis Attenuation**: Along the pure horizontal or vertical axes ($\omega_x = 0$ or $\omega_y = 0$):
   $$H(0, \omega_y) = 0, \quad H(\omega_x, 0) = 0$$
   Horizontal and vertical image edges (door frames, horizons, facial contours) are completely suppressed.
3. **Diagonal Nyquist Resonance**: At the diagonal Nyquist folding limit $(\omega_x = \pi, \omega_y = \pi)$:
   $$H(\pi, \pi) = -(1 - (-1))(1 - (-1)) = -(2)(2) = -4.0$$
   The kernel reaches its maximum amplification at the exact spatial frequency of the **Bayer Green quincunx lattice**.

### 2.3 2D Spatial Convolution
The residual map $R(x, y)$ is computed across the grayscale luminance channel $I_{\text{gray}}$:
$$R(x, y) = I_{\text{gray}}(x, y) * K_{\text{cfa}} = \sum_{m=-1}^{1} \sum_{n=-1}^{1} I_{\text{gray}}(x - m, y - n) \cdot K_{\text{cfa}}(m, n)$$
Boundary conditions utilize symmetric reflection (`boundary='symm'`) to prevent boundary discontinuities from generating false edge spikes.

---

## 3. Local Block Variance Mapping

Demosaicing traces manifest as structured micro-variance. The engine partitions $R(x, y)$ into non-overlapping $8 \times 8$ pixel blocks:
* Spatial dimensions: $H \times W$
* Grid dimensions:
  $$H_B = \left\lfloor \frac{H}{8} \right\rfloor, \quad W_B = \left\lfloor \frac{W}{8} \right\rfloor$$

For each block $(u, v) \in [0, H_B - 1] \times [0, W_B - 1]$:
$$\mu_{u, v} = \frac{1}{64} \sum_{x=8u}^{8u+7} \sum_{y=8v}^{8v+7} R(x, y)$$
$$\sigma^2(u, v) = \frac{1}{64} \sum_{x=8u}^{8u+7} \sum_{y=8v}^{8v+7} \left( R(x, y) - \mu_{u, v} \right)^2$$

The resulting matrix $\mathbf{V} = [\sigma^2(u, v)] \in \mathbb{R}^{H_B \times W_B}$ represents the localized demosaicing energy distribution across the frame.

---

## 4. Regional Discrepancy & Bounding Geometry

When facial coordinates $[x, y, w, h]$ are supplied from upstream facial geometry detection, they are mapped into block space:
$$bx_1 = \max\left(0, \left\lfloor \frac{x}{8} \right\rfloor\right), \quad by_1 = \max\left(0, \left\lfloor \frac{y}{8} \right\rfloor\right)$$
$$bx_2 = \min\left(W_B, \left\lfloor \frac{x + w}{8} \right\rfloor\right), \quad by_2 = \min\left(H_B, \left\lfloor \frac{y + h}{8} \right\rfloor\right)$$

### 4.1 Regional Energy Aggregation
* **Face Region $F$**: The submatrix block area $[by_1:by_2, bx_1:bx_2]$:
  $$\sigma^2_{\text{face}} = \frac{1}{|F|} \sum_{(u, v) \in F} \sigma^2(u, v)$$
* **Background Region $B$**: The boolean complementary mask $\neg F$:
  $$\sigma^2_{\text{bg}} = \frac{1}{|B|} \sum_{(u, v) \in B} \sigma^2(u, v)$$

### 4.2 Variance Ratio Metric
$$\rho = \frac{\sigma^2_{\text{face}}}{\sigma^2_{\text{bg}} + \epsilon}, \quad \epsilon = 10^{-6}$$

---

## 5. Decision Rules, Non-Linear Mapping & Codec Guardrails

### 5.1 Piecewise Forensic Scoring Curve
In an authentic, unmanipulated photograph, the demosaicing energy across the face and background is homogeneous ($\rho \approx 1.0$):

$$S_{\text{cfa}} = \begin{cases}
1.0 - \frac{\rho}{0.5} & \text{if } \rho < 0.5 \quad (\text{Face lacks CFA noise} \rightarrow \text{AI Synthetic}) \\
\min\left(1.0, \frac{\rho - 2.0}{2.0}\right) & \text{if } \rho > 2.0 \quad (\text{Incompatible splicing / high noise boundary}) \\
0.5 \times |1.0 - \rho| & \text{if } 0.5 \le \rho \le 2.0 \quad (\text{Natural intra-sensor variation})
\end{cases}$$

```
  CFA Score
    1.0 ┼──────\                                  /──────
        │       \                                /
    0.5 │        \                              /
        │         \                            /
    0.0 ┼──────────\__________/\______________/──────────
        0.0        0.5       1.0            2.0         4.0
                   <-- Face Synthetic -->   <-- Spliced -->
                             Variance Ratio (ρ)
```

### 5.2 Heavy Compression Guardrail (H.264 / HEVC Compensation)
Standard lossy video codecs (H.264, H.265) apply heavy $4:2:0$ chroma subsampling and aggressive high-frequency quantization, which can destroy subtle Bayer demosaicing artifacts across the entire frame:
```python
if face_cfa_variance < 15.0 and bg_cfa_variance < 15.0:
    cfa_score = max(0.0, min(1.0, (5 - global_variance) / 5)) * 0.4
```
* **Guardrail Mechanism**: If both $\sigma^2_{\text{face}} < 15.0$ and $\sigma^2_{\text{bg}} < 15.0$, the ratio $\rho$ becomes mathematically unstable ($\frac{0}{0}$).
* **Action**: Bypasses the ratio penalty and caps the confidence score at $0.4$, preventing compressed genuine videos from triggering false deepfake verdicts.

### 5.3 Global Smoothness Override (Full-Frame Generation / No Face)
If no bounding box is provided (e.g. pure synthetic landscape or full-frame generation):
$$\bar{\sigma}^2 = \frac{1}{H_B \cdot W_B} \sum_{u, v} \sigma^2(u, v)$$
$$S_{\text{cfa}} = \text{clamp}\left(\frac{5.0 - \bar{\sigma}^2}{5.0}, 0.0, 1.0\right)$$

If an entire image has $\bar{\sigma}^2 < 10.0$ despite high resolution:
$$S_{\text{cfa}} = \max\left(S_{\text{cfa}}, \min\left(1.0, \frac{15.0 - \bar{\sigma}^2}{15.0}\right)\right)$$

### 5.4 Quality Multiplier & Clamping
The raw score is scaled by the Image Quality Assessment (IQA) Laplacian sharpness multiplier ($Q \in [0.3, 1.3]$):
$$S_{\text{final}} = \text{clamp}\left(S_{\text{cfa}} \times Q, 0.05, 0.95\right)$$

---

## 6. Visualization & Diagnostic Artifact Generation

The engine compiles three distinct analytical diagnostic visualizations saved to the output directory:

### 6.1 Periodicity Map (`cfa_map_path`)
Saved to `{save_dir}/cfa_{uuid}.png`:
1. **Nearest-Neighbor Scaling**: The block variance map $\mathbf{V}_{\text{norm}} = \frac{\mathbf{V}}{\max(\mathbf{V})}$ is resized to $(W, H)$ via `cv2.INTER_NEAREST` to preserve distinct $8 \times 8$ block energy step boundaries without interpolation blurring.
2. **Colormap**: Rendered with the `inferno` thermal palette:
   * **Black / Deep Indigo**: Zero demosaicing residual (synthetic or heavily compressed).
   * **Vibrant Orange / White**: Strong, consistent Bayer interpolation grid (authentic camera hardware).
3. **Facial Inspection Bounding Box**: Overlaid as a cyan dashed rectangle (`patches.Rectangle`) at $[x, y, w, h]$.
4. **Web Path Resolution**: Automatically inspects destination path; if within `"uploads"`, resolves to `"uploads/{job_id}/cfa_{uuid}.png"`.

### 6.2 2D Fourier Magnitude Spectrum (`cfa_fourier_path`)
Saved to `{save_dir}/cfa_fourier_{uuid}.png`:
1. Computes the 2D Fast Fourier Transform (FFT) $\mathcal{F}\{R(x, y)\}$ of the high-frequency CFA residual map.
2. Performs frequency centering via quadrant swap (`np.fft.fftshift`).
3. Computes log-magnitude spectrum $M(u, v) = \log(1 + |\mathcal{F}_{\text{shift}}(u, v)|)$ and normalizes to $[0, 255]$.
4. Applies the `COLORMAP_VIRIDIS` palette and renders a circular Nyquist reticle and cardinal frequency crosshairs with telemetry annotations.
5. In authentic camera imagery, persistent harmonic peaks appear at the $(\pm \pi, \pm \pi)$ diagonal Nyquist corners; AI diffusion/GAN outputs produce an isotropic circular blur devoid of discrete Bayer peaks.

### 6.3 Sub-Pixel Bayer Lattice Residual (`bayer_grid_path`)
Saved to `{save_dir}/cfa_bayer_grid_{uuid}.png`:
1. Decomposes the residual along the alternating $2 \times 2$ GRBG photosite lattice.
2. Amplifies sub-pixel inter-channel interpolation errors and colormaps the residual using `COLORMAP_MAGMA`.
3. Alpha-blends the thermal Bayer lattice directly over the input imagery ($\alpha = 0.55$) with a cyan inspection reticle over the detected face boundary.

---

## 7. Interface Specification & Schema

### Function Signature
```python
def analyze_cfa_artifacts(
    image_path: str,
    save_dir: str = None,
    face_results: dict = None,
    quality_multiplier: float = 1.0
) -> dict
```

### Parameters:
* **`image_path`** (`str`): Filesystem path to the analyzed image or extracted frame (`.jpg`, `.png`).
* **`save_dir`** (`str`, optional): Destination directory for visualization artifacts.
* **`face_results`** (`dict`, optional): Detection dictionary containing:
  * `"face_detected"` (`bool`): Face detection state.
  * `"box"` (`tuple`): `[x, y, width, height]` bounding coordinates.
* **`quality_multiplier`** (`float`, default `1.0`): IQA multiplier derived from Laplacian sharpness variance.

### Return Payload:
```json
{
  "cfa_score": 0.05,
  "face_variance": 42.1852,
  "bg_variance": 44.8914,
  "cfa_map_path": "uploads/ab12cd34/cfa_e5f6g7h8.png",
  "cfa_fourier_path": "uploads/ab12cd34/cfa_fourier_e5f6g7h8.png",
  "bayer_grid_path": "uploads/ab12cd34/cfa_bayer_grid_e5f6g7h8.png",
  "explanation": {
    "what_happened": "Extracted the microscopic Color Filter Array (Bayer) grid pattern created by physical camera sensors.",
    "result": "Authentic Sensor Grid",
    "why_it_happened": "The physical camera pixel grid is perfectly consistent across the entire image.",
    "variables": {
      "Face Grid Variance": "42.1852",
      "Background Grid Variance": "44.8914",
      "Mismatch Ratio": "1.06x"
    }
  }
}
```

---

## 8. Failure Modes & Edge Cases Handled

1. **Unreadable / Missing Image File**: Guard check returns `{"cfa_score": 0.5, "error": "Could not read image"}`.
2. **Solid Color / Synthetic Monochromatic Frames**: Handled by `if np.max(variance_map) > 0:` check to prevent division by zero.
3. **Small Face Bounding Boxes ($<8\text{ px}$)**: Clamped via `max(0, ...)` and `min(W_B, ...)` coordinates.
4. **Division by Zero in Ratio**: Protected by epsilon term $\epsilon = 10^{-6}$.
5. **Exception Encapsulation**: Entire routine wrapped in `try...except` returning fallback score `0.5` and error trace to ensure pipeline resilience.
