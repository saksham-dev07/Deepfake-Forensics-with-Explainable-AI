# Technical Specification & Forensic Architecture: Error Level Analysis (ELA) & Compression Forensics (`ela_analysis.py`)

**Implementation File**: [`backend/pipeline/ela_analysis.py`](../pipeline/ela_analysis.py)  
**Analytical Classification**: JPEG Quantization Forensics / Multi-Spectral Error Discrepancy  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `OS`, `tempfile`  
**Primary Interface**: `analyze_ela(image_rgb, output_dir, prefix="ela", quality_multiplier=1.0)`  
**Meta-Classifier Vector Position**: Input Feature Index 3 (`ela_score`)

---

## 1. Executive Summary & Forensic Theory of Error Level Analysis

`ela_analysis.py` implements an enhanced multi-tier **Error Level Analysis (ELA)** suite. By re-quantizing an image at calibrated JPEG quality levels and analyzing the resulting rate of degradation, the engine detects non-uniform compression states, composite splice boundaries, inpainting, and synthetic face swaps.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ELA FORENSIC TOPOLOGY                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input RGB Image]
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
 [Standard ELA]       [ELA Heatmap]                 [JPEG Ghosting]           [HSV ELA]
 Re-compress Q=90     Re-compress Q=90              Multi-Q [50,65,75,85,95]  Saturation Channel
 32×32 Block CV       Gaussian Smooth (11×11)       Variance across Q-axis    Turbo Colormap
 Base ELA (Weight 0.4) Jet Colormap Overlay          Ghost Var (Weight 0.2)    HSV Var (Weight 0.1)
      │                                                      │                      │
      └──────────────────────┬───────────────────────────────┴──────────────────────┘
                             │
            [Edge-Aware Smooth Region Isolation]
            Canny(50, 150) -> Dilate 5×5 -> Invert Mask
            Measures ELA specifically in smooth regions
            Edge Anomaly Score (Weight 0.3)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
    [Four-Factor Ensemble]          [Component Verdicts]
    final_ela_score ∈ [0.0, 1.0]     Standard, Ghost, HSV, Smooth
```

### 1.1 The Mathematical Principle of JPEG Equilibrium
The standard JPEG lossy compression pipeline divides an image into non-overlapping $8 \times 8$ pixel blocks, maps them to the spatial frequency domain using the forward 2D Discrete Cosine Transform (DCT):

$$F(u, v) = \frac{1}{4} C(u) C(v) \sum_{x=0}^{7} \sum_{y=0}^{7} f(x, y) \cos\left[\frac{(2x+1)u\pi}{16}\right] \cos\left[\frac{(2y+1)v\pi}{16}\right]$$

Where:
$$C(u), C(v) = \begin{cases} \frac{1}{\sqrt{2}} & \text{if } u, v = 0 \\ 1 & \text{otherwise} \end{cases}$$

Coefficients are then quantized using a standardized quantization matrix $\mathbf{Q}(u, v)$:
$$F^Q(u, v) = \text{round}\left( \frac{F(u, v)}{\mathbf{Q}(u, v)} \right)$$

#### Re-quantization Dynamics:
When the image is decompressed, the reconstructed pixel block is obtained via the Inverse 2D-DCT:
$$\hat{f}(x, y) = \text{IDCT}\left( F^Q(u, v) \times \mathbf{Q}(u, v) \right)$$

* **Quantization Error Equilibrium**: When an authentic image is saved once, all $8 \times 8$ blocks across the entire frame settle into a homogeneous error equilibrium relative to local surface texture. Upon re-saving at quality $Q_{\text{target}} = 90$, previously quantized background regions undergo minimal additional degradation.
* **The Splicing / Deepfake Anomaly**:
  1. A newly inserted face (from a GAN, diffusion model, or another image saved at quality $Q_{\text{donor}} \ne Q_{\text{target}}$) has **not** reached quantization equilibrium with the background.
  2. When re-saved at $Q = 90$, the donor region undergoes severe rounding jumps in its DCT coefficients:
     $$\Delta F(u, v) = \left| F_{\text{donor}}^Q(u, v) \times \mathbf{Q}_1(u, v) - \text{round}\left(\frac{F_{\text{donor}}^Q(u, v) \times \mathbf{Q}_1(u, v)}{\mathbf{Q}_{90}(u, v)}\right) \times \mathbf{Q}_{90}(u, v) \right| \gg 0$$
  3. Computing the absolute difference between the source image and its re-saved counterpart exposes this discrepancy as bright, high-energy error halos.

---

## 2. Multi-Tier Analytical Sub-Engines

### 2.1 Standard Block-Variance ELA: `compute_ela()`
* **Re-compression Target**: Standardized to $Q = 90$ using `cv2.IMWRITE_JPEG_QUALITY`:
  $$\mathbf{I}_{\text{recomp}} = \text{JPEG}_{Q=90}(\mathbf{I}_{\text{bgr}})$$
* **Absolute Error Extraction**:
  $$\mathbf{D}(x, y, c) = |\mathbf{I}_{\text{bgr}}(x, y, c) - \mathbf{I}_{\text{recomp}}(x, y, c)|$$
* **Contrast Amplification**:
  $$\mathbf{E}(x, y, c) = \text{clamp}\left(\mathbf{D}(x, y, c) \times 15, 0, 255\right)$$
  *(Amplifies subtle 1–3 unit quantization errors into visible 15–45 unit spikes).*
* **Local Block Variance Formulation ($32 \times 32$ Grid)**:
  The difference image is converted to grayscale $D_{\text{gray}}$ and partitioned into non-overlapping $32 \times 32$ spatial blocks:
  $$\sigma^2_k = \text{Var}\left(D_{\text{gray}}[32u:32u+32, 32v:32v+32]\right)$$
* **Coefficient of Variation (CV)**:
  Rather than relying on raw variance (which varies with image contrast), the engine computes the Coefficient of Variation across the block variance field:
  $$CV = \frac{\text{std}(\{\sigma^2_k\})}{\text{mean}(\{\sigma^2_k\}) + \epsilon}$$
  * *Forensic Rationale*: A uniform image produces a tight distribution of block variances ($CV \ll 1.0$). A composite face-swap introduces wild, localized variance spikes, driving $CV$ upward.
* **Base Score Normalization**:
  $$\text{base\_ela\_score} = \min\left(1.0, \frac{CV}{3.0}\right)$$

---

### 2.2 Smooth Gaussian Heatmap: `compute_ela_heatmap()`
Provides a qualitative visual overlay for human analysts:
1. Grayscale difference is amplified by $20\times$:
   $$\mathbf{D}_{\text{amp}} = \text{clamp}(D_{\text{gray}} \times 20, 0, 255)$$
2. Blurs high-frequency noise using an $11 \times 11$ Gaussian kernel (`cv2.GaussianBlur(..., (11, 11), 0)`).
3. Applies the `cv2.COLORMAP_JET` pseudocolor palette (blue = zero difference $\rightarrow$ red = high compression error).
4. Blends 50/50 with the original image:
   $$\mathbf{I}_{\text{heatmap}} = 0.5 \cdot \mathbf{I}_{\text{bgr}} + 0.5 \cdot \mathbf{H}_{\text{jet}}$$
   Saved to `{output_dir}/{prefix}_heatmap.jpg`.

---

### 2.3 Multi-Quality JPEG Ghosting: `compute_jpeg_ghosting()`
JPEG Ghosting identifies whether specific regions were previously compressed at a different JPEG quality than the rest of the image:
1. Re-compresses the image across an array of five distinct quality levels:
   $$\mathcal{Q} = [50, 65, 75, 85, 95]$$
2. Computes the grayscale difference for each quality level:
   $$\mathbf{D}_q(x, y) = |I_{\text{gray}}(x, y) - \text{JPEG}_q(I_{\text{gray}}(x, y))| \quad \text{for } q \in \mathcal{Q}$$
3. Stacks differences into a 3D volume $\mathbf{S} \in \mathbb{R}^{H \times W \times 5}$ and evaluates the variance along the quality dimension:
   $$\mathbf{V}_{\text{ghost}}(x, y) = \text{Var}_{q \in \mathcal{Q}}\left(\mathbf{D}_q(x, y)\right)$$
4. Normalizes to $[0, 255]$, applies a $5 \times 5$ Gaussian blur, maps with `cv2.COLORMAP_INFERNO`, and alpha-blends ($0.4 \times \mathbf{I}_{\text{bgr}} + 0.8 \times \mathbf{G}_{\text{inferno}}$).
5. Scalar Ghost Metric:
   $$\text{ghost\_var} = \frac{\text{Var}(\mathbf{G}_{\text{smooth}})}{255.0}$$
   Saved to `{output_dir}/{prefix}_ghosting.jpg`.

---

### 2.4 Chrominance Saturation ELA: `compute_hsv_ela()`
Standard ELA operates primarily on luminance. However, lossy video and image encoders heavily downsample chrominance via $4:2:0$ chroma subsampling.
1. Converts the image to HSV and extracts the Saturation channel $S$.
2. Re-compresses at $Q = 90$ and extracts the re-compressed Saturation channel $S_{\text{recomp}}$.
3. Computes amplified absolute difference:
   $$\mathbf{S}_{\text{diff}} = \text{clamp}(|S - S_{\text{recomp}}| \times 15, 0, 255)$$
4. Maps via `cv2.COLORMAP_TURBO` and blends ($0.4 \times \mathbf{I}_{\text{bgr}} + 0.8 \times \mathbf{S}_{\text{turbo}}$).
5. Scalar HSV Metric:
   $$\text{hsv\_var} = \frac{\text{Var}(\mathbf{S}_{\text{diff}})}{255.0}$$
   Saved to `{output_dir}/{prefix}_hsv.jpg`.

---

### 2.5 Edge-Aware Smooth Region Anomaly Engine
* **The Forensic Challenge of False Positives on High-Frequency Edges**:
  Natural physical edges (hair strands, text, sharp silhouettes) naturally generate high ELA intensity because high-frequency DCT coefficients suffer more quantization loss than low-frequency coefficients. Naive ELA tools produce severe false positives on sharp edges.
* **The Algorithmic Solution**:
  True digital splicing or synthetic inpainting manifests as **unexpectedly high compression error in flat, smooth regions** (e.g. cheeks, forehead, solid background).
1. **Edge Masking**:
   Applies Canny edge detection with hysteresis thresholds $(50, 150)$:
   $$\mathbf{E}_{\text{canny}} = \text{Canny}(I_{\text{gray}}, 50, 150)$$
2. **Morphological Expansion**:
   Dilates edges with a $5 \times 5$ kernel to mask out the entire edge-transition boundary:
   $$\mathbf{M}_{\text{edge}} = \text{Dilate}(\mathbf{E}_{\text{canny}}, \mathbf{K}_{5 \times 5})$$
   $$\mathbf{M}_{\text{smooth}} = \neg \mathbf{M}_{\text{edge}}$$
3. **Smooth-Region ELA Extraction**:
   $$\mathbf{E}_{\text{smooth}} = \mathbf{E}_{\text{gray}} \land \mathbf{M}_{\text{smooth}}$$
4. **Smooth Anomaly Scoring**:
   $$\mu_{\text{smooth}} = \frac{1}{|S|} \sum_{(x, y) \in S} \mathbf{E}_{\text{smooth}}(x, y)$$
   $$\text{edge\_anomaly\_score} = \min\left(1.0, \frac{\mu_{\text{smooth}}}{15.0 \times Q}\right)$$
   Where $Q \in [0.3, 1.3]$ is the Image Quality Assessment multiplier.

---

## 3. Four-Factor Ensemble Formulation & Scoring

The comprehensive `ela_score` synthesizes all four analytical vectors:

$$\text{final\_ela\_score} = \underbrace{0.40 \cdot S_{\text{base}}}_{\text{Global Block Variation}} + \underbrace{0.30 \cdot S_{\text{edge}}}_{\text{Smooth Area Error}} + \underbrace{0.20 \cdot \min\left(1.0, \frac{\text{ghost\_var}}{30.0 \cdot Q}\right)}_{\text{Multi-Q Ghosting}} + \underbrace{0.10 \cdot \min\left(1.0, \frac{\text{hsv\_var}}{40.0 \cdot Q}\right)}_{\text{Saturation Subsampling}}$$

### Quality Multiplier Normalization Proof:
Each component denominator is modulated by $Q$:
* In soft / compressed imagery ($Q = 0.5$): Denominators shrink ($15 \cdot Q = 7.5, 30 \cdot Q = 15.0, 40 \cdot Q = 20.0$), boosting sensitivity to detect subtle compression traces in low-bitrate media.
* In sharp / uncompressed imagery ($Q = 1.2$): Denominators expand ($18.0, 36.0, 48.0$), preventing sharp natural textures from triggering false alarms.

### Forensic Interpretations:
* **$\text{final\_ela\_score} > 0.60$**: High compression inconsistency detected (Smooth Region Anomaly) — strong indicator of splicing/compositing.
* **$0.30 < \text{final\_ela\_score} \le 0.60$**: Moderate compression variations found — potential minor retouching or re-saving.
* **$\text{final\_ela\_score} \le 0.30$**: Compression levels appear uniform — consistent with an unmodified single-source image.

---

## 4. Component Verdicts Specification

In addition to continuous numerical scores, the engine generates discrete forensic diagnostics:

| Sub-Test | FAIL Threshold | WARNING Threshold | PASS Threshold | Diagnostic Meaning |
| :--- | :---: | :---: | :---: | :--- |
| **Standard ELA** | $> 0.40$ | $0.15 - 0.40$ | $\le 0.15$ | High global block coefficient of variation |
| **JPEG Ghosting** | $> 15.0$ | $5.0 - 15.0$ | $\le 5.0$ | Extreme variance across quality sweep (multiple resaves) |
| **HSV Saturation** | $> 20.0$ | $10.0 - 20.0$ | $\le 10.0$ | Saturation chrominance compression mismatch |
| **Smooth Region** | $> 0.50$ | $0.20 - 0.50$ | $\le 0.20$ | High quantization error present inside flat smooth skin |

---

## 5. Summary of Diagnostic Visualizations

| Artifact File | Colormap Palette | Amplification | Blending Ratio | Forensic Target |
| :--- | :---: | :---: | :---: | :--- |
| **`ela_analysis.jpg`** | Direct RGB Difference | $15\times$ | None (Direct diff) | Macro quantization discrepancies across entire frame |
| **`ela_heatmap.jpg`** | `COLORMAP_JET` | $20\times$ | $0.5 \cdot \mathbf{I} + 0.5 \cdot \mathbf{H}$ | High-level heat overlay highlighting hot zones |
| **`ela_ghosting.jpg`** | `COLORMAP_INFERNO` | Multi-Q Variance | $0.4 \cdot \mathbf{I} + 0.8 \cdot \mathbf{G}$ | Multi-generation resave ghosts & quality shifts |
| **`ela_hsv.jpg`** | `COLORMAP_TURBO` | $15\times$ | $0.4 \cdot \mathbf{I} + 0.8 \cdot \mathbf{S}$ | $4:2:0$ chroma subsampling anomalies in saturation |
### High-Efficiency Bandwidth Optimization:
All visual exhibits are saved via `save_optimized_image` ([`image_utils.py`](../pipeline/image_utils.py)), clamping maximum dimensions to 1080p via area interpolation (`cv2.INTER_AREA`) and applying optimized JPEG compression ($Q=80$). This prevents client viewport stalls when streaming over high-latency networks.

---

## 6. Interface Specification & Schema

### Function Signature
```python
def analyze_ela(
    image_rgb: np.ndarray,
    output_dir: str,
    prefix: str = "ela",
    quality_multiplier: float = 1.0
) -> dict
```

### Parameters:
* **`image_rgb`** (`np.ndarray`): Input RGB matrix of shape $(H, W, 3)$.
* **`output_dir`** (`str`): Target storage directory for visualization maps.
* **`prefix`** (`str`, default `"ela"`): File naming prefix.
* **`quality_multiplier`** (`float`, default `1.0`): IQA scaling factor derived from Laplacian blur variance.

### Return Payload:
```json
{
  "ela_image_path": "uploads/job-id/ela_analysis.jpg",
  "ela_heatmap_path": "uploads/job-id/ela_heatmap.jpg",
  "ghosting_path": "uploads/job-id/ela_ghosting.jpg",
  "hsv_ela_path": "uploads/job-id/ela_hsv.jpg",
  "ela_score": 0.1245,
  "ela_base_variance": 0.0812,
  "ela_smooth_anomaly": 0.0415,
  "ghost_variance": 3.8412,
  "hsv_variance": 6.1294,
  "smooth_mean_intensity": 1.42,
  "ela_interpretation": "Compression levels appear uniform - consistent with an unmodified single-source image.",
  "verdicts": {
    "standard": {"status": "PASS", "reason": "Uniform baseline compression"},
    "ghosting": {"status": "PASS", "reason": "No compression ghosts found"},
    "hsv": {"status": "PASS", "reason": "Natural chrominance integration"},
    "smooth": {"status": "PASS", "reason": "Smooth areas cleanly compressed"}
  },
  "explanation": {
    "what_happened": "Mathematically exposed areas of the image saved at different JPEG compression levels.",
    "result": "Authentic Compression",
    "why_it_happened": "Compression levels appear uniform - consistent with an unmodified single-source image.",
    "variables": {
      "Smooth Anomaly": "0.04",
      "Ghost Variance": "3.8",
      "HSV Variance": "6.1"
    }
  }
}
```

---

## 7. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `ela_score` feeds as **Input Feature Index 3** into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Highly complementary to **Feature 7 (`prnu_score`)** and **Feature 13 (`cfa_score`)**. While CFA and PRNU detect hardware-level sensor noise, ELA captures software-level file saving and compositing discrepancies.
* **Temporary File Lifecycle**: All intermediate JPEG files are written to `tempfile.gettempdir()` and encapsulated in `try...finally` blocks to guarantee automatic deletion, preventing disk accumulation during high-throughput analysis.
