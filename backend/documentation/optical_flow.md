# Technical Specification & Forensic Architecture: Dense Optical Flow & Temporal Jitter Forensics (`optical_flow.py`)

**Implementation File**: [`backend/pipeline/optical_flow.py`](../pipeline/optical_flow.py)  
**Analytical Classification**: Video Forensics / Dense Motion Field Analysis / Temporal Consistency & Jitter Quantification  
**Motion Estimation Algorithm**: Dense Inverse Search (DIS) Optical Flow (`cv2.DISOpticalFlow`)  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `Matplotlib`, `face_geometry.detect_face`  
**Primary Interface**: `analyze_optical_flow(video_path, output_dir, prefix="flow")`  
**Meta-Classifier Vector Position**: Input Feature Index 11 (`flow_score`)

---

## 1. Executive Summary & Temporal Forensic Theory

`optical_flow.py` evaluates the inter-frame temporal coherence and kinematic smoothness of facial motion across video sequences.

Real-world human faces move according to rigid-body kinematics and smooth soft-tissue viscoelastic deformations. The 2D velocity vector field across an authentic face during speech or head rotation varies smoothly across adjacent frames. Conversely, deepfake generation pipelines (e.g. DeepFaceLab, FaceSwap, SimSwap, Wav2Lip) generate frames sequentially or in short sliding windows. Landmark localization jitter across consecutive frames introduces microscopic spatial misalignments, resulting in:
1. **Mask Boundary Shimmering & Flickering**: Blending seams between the synthetic face and authentic background oscillate at high frequencies.
2. **Turbulent Local Velocity Vectors**: Incongruent warp fields produce high spatial variance in local motion magnitudes.
3. **Variance of Variances ($\text{Var}(\sigma^2)$) Spikes**: While physical head movement causes smooth accelerations, deepfakes produce erratic, jagged spikes in per-frame motion variance.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          DENSE OPTICAL FLOW FORENSIC TOPOLOGY                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Video Stream]
                                             │
                        Downscale to 320×240 (High Throughput)
                                             │
                          [Face Landmark Extraction: Frame 1]
                          Isolate Facial Bounding Box ROI [x1:x2, y1:y2]
                                             │
                       Iterative Sliding Window (Max 60 Frames / ~2s)
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
             [Frame t (prvs_gray)]                         [Frame t+1 (next_gray)]
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │
                          [Dense Inverse Search (DIS) Flow]
                          Vector Field V(x, y) = (u, v)
                                             │
                          Polar Conversion: (Mag ρ, Angle θ)
                          Mask to Facial ROI: ρ_ROI(x, y)
                                             │
                          Per-Frame Spatial Variance: σ_t² = Var(ρ_ROI)
                                             │
                          Collect Temporal Vector: [σ_1², σ_2², ..., σ_T²]
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
           Mean Motion Variance μ_σ²                    Variance of Variances Var(σ²)
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │
                            Threshold Evaluation: Var(σ²)
                            - Var(σ²) > 15.0 => Score = 0.85 (Severe Flickering)
                            - Var(σ²) > 5.0  => Score = 0.65 (Moderate Jitter)
                            - Default        => Score = 0.10 (Smooth Kinematics)
                                             │
                                             ▼
                            [flow_anomaly_score ∈ [0.10, 0.85]]
                                             │
                                  [Visual Diagnostics]
                                  - flow_plot.png (Emerald Dark Waveform)
                                  - flow_field.jpg (HSV Vector Map)
```

---

## 2. Dense Inverse Search (DIS) Optical Flow Formulation

While classical optical flow algorithms (such as Horn-Schunck or Lucas-Kanade) are either computationally prohibitive or overly sparse, the module leverages **Dense Inverse Search (DIS)** (Kroeger et al., *Fast Optical Flow using Dense Inverse Search*, ECCV 2016):

```python
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
flow = dis.calc(prvs, next_gray, None)
```

### 2.1 The Optical Flow Constraint Equation
The fundamental assumption of optical flow states that pixel luminance $I(x, y, t)$ remains constant along a motion trajectory over an infinitesimal time step $\delta t$:

$$I(x, y, t) = I(x + \delta x, y + \delta y, t + \delta t)$$

First-order Taylor series expansion yields the gradient constraint:
$$\nabla I \cdot \mathbf{v} + \frac{\partial I}{\partial t} = 0 \implies \frac{\partial I}{\partial x} u + \frac{\partial I}{\partial y} v + \frac{\partial I}{\partial t} = 0$$

### 2.2 The Inverse Compositional Formulation in DIS
DIS achieves extreme computational speed ($>100\text{ FPS}$) by reversing the parameter optimization direction. Instead of warping the template patch at every iteration, it inverts the transformation and evaluates image gradients on the stationary patch $\mathbf{T}$:

$$\sum_{\mathbf{x}} \left\| \mathbf{I}(\mathbf{W}(\mathbf{x}; \mathbf{p})) - \mathbf{T}(\mathbf{W}(\mathbf{x}; \Delta \mathbf{p})) \right\|^2$$

Solving for $\Delta \mathbf{p}$ yields closed-form patch updates using a precomputed, constant Hessian matrix:
$$\Delta \mathbf{p} = \mathbf{H}^{-1} \sum_{\mathbf{x}} \left[ \nabla \mathbf{T} \right]^T \left[ \mathbf{I}(\mathbf{W}(\mathbf{x}; \mathbf{p})) - \mathbf{T}(\mathbf{x}) \right]$$
$$\mathbf{H} = \sum_{\mathbf{x}} \left[ \nabla \mathbf{T} \right]^T \left[ \nabla \mathbf{T} \right]$$

---

## 3. Sub-Engine Architecture & Mathematical Formulations

### 3.1 Region of Interest (ROI) Facial Isolation
Evaluating optical flow across the entire video frame exposes the pipeline to background false positives (e.g. moving cars, panning camera, walking bystanders).
* The engine detects facial landmarks on Frame 1 via `face_geometry.detect_face`:
  $$\text{ROI} = [x_{\min} : x_{\min} + W_{\text{box}}, \; y_{\min} : y_{\min} + H_{\text{box}}]$$
* If face detection fails, defaults to a central spatial crop:
  $$x \in [0.20 W, 0.80 W], \quad y \in [0.10 H, 0.90 H]$$

---

### 3.2 Polar Vector Decomposition
For each pixel in the dense flow tensor $\mathbf{F} \in \mathbb{R}^{H \times W \times 2}$:
$$\rho(x, y) = \sqrt{u(x, y)^2 + v(x, y)^2}, \quad \theta(x, y) = \text{atan2}(v(x, y), u(x, y))$$

---

### 3.3 Spatial Motion Magnitude Variance ($\sigma_t^2$)
For each frame $t$, the module computes the spatial variance of flow magnitudes within the facial ROI:

$$\mu_{\rho, t} = \frac{1}{|\text{ROI}|} \sum_{(x, y) \in \text{ROI}} \rho_t(x, y)$$

$$\sigma_t^2 = \frac{1}{|\text{ROI}|} \sum_{(x, y) \in \text{ROI}} (\rho_t(x, y) - \mu_{\rho, t})^2$$

* **Forensic Significance**: In an authentic face undergoing rigid translation, all facial pixels move with roughly identical velocities ($\sigma_t^2 \approx 0$). When a synthetic mask suffers from boundary warping or regional expression deformation, $\sigma_t^2$ spikes sharply.

---

### 3.4 Temporal Jitter Metric: Variance of Variances ($\text{Var}(\sigma^2)$)
Over a temporal sequence of $T$ frames ($T \le 60$, corresponding to $\approx 2.0\text{ seconds}$ at $30\text{ FPS}$):

$$\mu_{\text{var}} = \frac{1}{T}\sum_{t=1}^T \sigma_t^2$$

$$\text{Var}(\sigma^2) = \frac{1}{T}\sum_{t=1}^T \left( \sigma_t^2 - \mu_{\text{var}} \right)^2$$

* **Physical Interpretation**:
  * Smooth natural human gestures produce a slowly varying continuous curve of $\sigma_t^2$, resulting in a very low variance of variances ($\text{Var}(\sigma^2) < 5.0$).
  * Deepfake generative jitter causes erratic frame-by-frame fluctuations, driving $\text{Var}(\sigma^2) \gg 15.0$.

---

## 4. Anomaly Scoring Decision Rules

```python
anomaly_score = 0.10
if var_of_vars > 15.0:
    anomaly_score = max(anomaly_score, 0.85)
    results["warnings"].append(f"Severe temporal flickering detected (Var of Vars: {var_of_vars:.1f})")
elif var_of_vars > 5.0:
    anomaly_score = max(anomaly_score, 0.65)
    results["warnings"].append(f"Moderate jittering detected (Var of Vars: {var_of_vars:.1f})")
```

| Metric Condition | Anomaly Score | Forensic Diagnosis |
| :--- | :---: | :--- |
| **$\text{Var}(\sigma^2) > 15.0$** | `0.85` | **Severe Temporal Flickering (Deepfake)**: Violent frame-to-frame mask boundary fluttering. |
| **$5.0 < \text{Var}(\sigma^2) \le 15.0$**| `0.65` | **Moderate Jittering**: Unstable landmark tracking or local generative warping. |
| **$\text{Var}(\sigma^2) \le 5.0$** | `0.10` | **Consistent Temporal Kinematics (Real)**: Physically coherent velocity trajectories. |

---

## 5. Visual Diagnostics Specification

### 5.1 Temporal Motion Variance Waveform (`{prefix}_plot.png`)
* Generates an 8×3 inch dark-themed chart (`facecolor='#0f172a'`).
* Plots the continuous trajectory of $\sigma_t^2$ across all $T$ frames using an emerald vector line (`#10b981`, linewidth 2).
* **Diagnostic Signature**: Deepfakes manifest distinct "teeth" (high-frequency spikes), whereas authentic movement exhibits smooth, rolling bell curves.

### 5.2 Dense Optical Flow Field (`{prefix}_field.jpg`)
Captures the mid-sequence frame ($t = T/2$) and encodes the 2D vector field in HSV color space:
* **Hue ($H$)**: Flow direction angle $\theta$:
  $$H = \left(\theta \times \frac{180}{\pi \times 2}\right) \in [0, 180)$$
* **Saturation ($S$)**: Clamped to maximum ($255$) for high chromatic visibility.
* **Value ($V$)**: Normalized flow magnitude $\rho \in [0, 255]$ via `cv2.NORM_MINMAX`.
* Converted to BGR (`cv2.COLOR_HSV2BGR`) and saved to disk.

---

## 6. Interface Specification & Schema

### Function Signature
```python
def analyze_optical_flow(
    video_path: str,
    output_dir: str,
    prefix: str = "flow"
) -> dict
```

### Return Payload:
```json
{
  "flow_anomaly_score": 0.10,
  "mean_motion_variance": 1.428,
  "flow_plot_path": "uploads/job-id/flow_plot.png",
  "flow_field_path": "uploads/job-id/flow_field.jpg",
  "warnings": [],
  "explanation": {
    "what_happened": "Temporal consistency was analyzed using Farneback Dense Optical Flow to track pixel movement across consecutive frames.",
    "result": "Motion vectors appear temporally consistent.",
    "why_it_happened": "The 3D facial movement across video frames obeys smooth physical kinematics without mask jitter.",
    "variables": {
      "Mean Motion Variance": "1.428",
      "Variance of Variances (Jitter)": "2.14",
      "Anomaly Score": "0.10"
    }
  }
}
```

---

## 7. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `flow_anomaly_score` feeds as **Input Feature Index 11** (`flow_score`) into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Closely coordinated with **Feature 10 (`rppg_score`)** and **Feature 12 (`sync_score`)**. While rPPG detects pulse oscillations and SyncNet evaluates lip timing, Optical Flow detects the physical mask boundaries jittering in 2D space.
* **Safety Guards Handled**:
  1. **Short Video Guard**: If fewer than 10 frames are read ($T < 10$), immediately flags `"Video too short for temporal consistency check."` and returns neutral score `0.50`.
  2. **File Missing Guard**: Checks `os.path.exists(video_path)`, returning an error dictionary if unreadable.
  3. **Headless Plotting**: Enforces `matplotlib.use('Agg')` prior to imports, preventing GUI thread crashes in headless production environments.
