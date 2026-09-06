# Technical Specification & Forensic Architecture: Facial Landmark Consistency, 3D Pose & Morphological Geometry (`face_geometry.py`)

**Implementation File**: [`backend/pipeline/face_geometry.py`](../pipeline/face_geometry.py)  
**Analytical Classification**: 3D Morphometry / Computer Vision Biometrics / Perspective-n-Point Photogrammetry  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `MediaPipe Tasks (FaceLandmarker)`, `Matplotlib`  
**Pretrained Weights**: `backend/weights/face_detection_yunet_2023mar.onnx`, `backend/weights/face_landmarker.task`  
**Primary Interface**: `analyze_face_geometry(image_rgb, output_dir, prefix="face", frame_files=None)`  
**Meta-Classifier Vector Position**: Input Feature Index 3 (`geometry_anomaly`)

---

## 1. Executive Summary & Morphological Biometric Theory

`face_geometry.py` provides a multi-layered forensic examination of spatial facial structure, biological proportions, 3D projective head pose dynamics, and temporal landmark stability. 

Generative deepfake pipelines (e.g. DeepFaceLab, FaceSwap, GANs, and Latent Diffusion models) fundamentally struggle to maintain biological proportionality and 3D geometric rigidity simultaneously. While deepfakes can generate visually appealing textures, they frequently violate:
1. **Bilateral Facial Symmetry**: Biological human skulls exhibit bounded bilateral proportions relative to the sagittal midline.
2. **Boundary Texture Consistency**: Blending masks create abrupt Laplacian variance discontinuities at the jaw and hairline.
3. **Biological Proportions**: Vertical golden ratio ($\phi$) and horizontal interocular distances distort under 2D affine warping.
4. **3D Rigid Body Mechanics**: Projecting 2D landmarks onto a canonical 3D human skull model via Perspective-n-Point ($solvePnP$) reveals erratic angular velocity snapping (jitter) between frames that is physically impossible for biological human neck muscles.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          FACIAL GEOMETRY FORENSIC TOPOLOGY                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Image / Video]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          [YuNet ONNX Detector]                           [MediaPipe FaceLandmarker]
          BBox, Tilt/Occlusion Handling                   478 Dense 3D Landmarks
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
         [Spatial Biometrics]       [3D Head Pose Engine]      [Boundary Consistency]
         - Geometric Symmetry       - 8 Landmark Anchors       - Laplacian Variance Inner vs Outer
         - Golden Ratio (φ)         - solvePnP Iterative       - Sensor PRNU Noise Consistency
         - Interocular Ratio        - Euler Pitch, Yaw, Roll
         - Nose-Mouth Ratio                   │
                    │                         │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                             [Temporal Jitter Video Analyzer]
                             - Samples up to 20 frames across video
                             - Proportion variance across time
                             - Angular velocity variance (pose snap)
                                              │
                                              ▼
                             [Worst-Metric Anomaly Aggregation]
                             spatial_anomaly = 1.0 - min(sym, tex, noise)
                             geometry_anomaly_score ∈ [0.0, 1.0]
```

---

## 2. Detection Subsystem: YuNet + MediaPipe Hybrid Architecture

To guarantee robustness against extreme angles, low lighting, and partial occlusions, the engine implements a hybrid detector with thread-local storage (`threading.local()`):

### 2.1 Primary Bounding Box: OpenCV YuNet ONNX
* **Model**: `weights/face_detection_yunet_2023mar.onnx`
* **Inference Engine**: `cv2.FaceDetectorYN.create()` with `score_threshold=0.8` and `nms_threshold=0.3`.
* **Capability**: Accurately tracks small faces down to $30\text{ px}$, off-axis yaw/pitch angles up to $\pm 45^\circ$, and partially occluded faces.

### 2.2 Dense 3D Mesh Extraction: MediaPipe FaceLandmarker
* **Model**: `weights/face_landmarker.task`
* **Output Topology**: 478 3D vertices ($x, y$ normalized by image dimensions, $z$ normalized by face width).
* **Iris Centers**:
  * Person's Right Iris: Landmark index `468`
  * Person's Left Iris: Landmark index `473`
* **Sagittal Anchors**: Nose tip (`1`), Right mouth corner (`61`), Left mouth corner (`291`), Chin (`152`), Left temple (`454`), Right temple (`234`).

---

## 3. Spatial Biometric Forensics

### 3.1 Geometric Symmetry Formulation: `compute_face_symmetry()`
Rather than evaluating raw pixel intensity (which produces false alarms under asymmetric side lighting), the engine evaluates Euclidean distances between anatomical anchors and the sagittal midline:

$$\mathbf{p}_{re} = \text{Right Eye}(468), \quad \mathbf{p}_{le} = \text{Left Eye}(473), \quad \mathbf{p}_{nt} = \text{Nose Tip}(1)$$
$$\mathbf{p}_{rm} = \text{Right Mouth}(61), \quad \mathbf{p}_{lm} = \text{Left Mouth}(291)$$

The Euclidean asymmetry terms:
$$d_{\text{eye}} = \frac{\left| \|\mathbf{p}_{re} - \mathbf{p}_{nt}\|_2 - \|\mathbf{p}_{le} - \mathbf{p}_{nt}\|_2 \right|}{\max\left(1, \max\left(\|\mathbf{p}_{re} - \mathbf{p}_{nt}\|_2, \|\mathbf{p}_{le} - \mathbf{p}_{nt}\|_2\right)\right)}$$

$$d_{\text{mouth}} = \frac{\left| \|\mathbf{p}_{rm} - \mathbf{p}_{nt}\|_2 - \|\mathbf{p}_{lm} - \mathbf{p}_{nt}\|_2 \right|}{\max\left(1, \max\left(\|\mathbf{p}_{rm} - \mathbf{p}_{nt}\|_2, \|\mathbf{p}_{lm} - \mathbf{p}_{nt}\|_2\right)\right)}$$

$$d_{\text{jaw}} = \frac{\left| \|\mathbf{p}_{re} - \mathbf{p}_{rm}\|_2 - \|\mathbf{p}_{le} - \mathbf{p}_{lm}\|_2 \right|}{\max\left(1, \max\left(\|\mathbf{p}_{re} - \mathbf{p}_{rm}\|_2, \|\mathbf{p}_{le} - \mathbf{p}_{lm}\|_2\right)\right)}$$

$$\bar{d}_{\text{asym}} = \frac{d_{\text{eye}} + d_{\text{mouth}} + d_{\text{jaw}}}{3}$$
$$\text{symmetry\_score} = \max\left(0.0, 1.0 - 2.0 \cdot \bar{d}_{\text{asym}}\right)$$

* **Visual Map**: The face is horizontally bisected, the right half mirrored (`cv2.flip(1)`), absolute differences calculated, mapped to `cv2.COLORMAP_MAGMA`, and alpha-blended over the face crop. Saved to `{prefix}_symmetry_map.jpg`.

---

### 3.2 Boundary Texture Consistency: `compute_texture_consistency()`
Face-swapping algorithms composite a synthetic face onto a target body using Poisson image editing or Gaussian feathering. This leaves an unnatural transition in spatial frequency variance at the boundary.

1. Extracts a $15\%$ padded bounding box around the face.
2. Computes the 2D Laplacian operator:
   $$\nabla^2 I(x, y) = \frac{\partial^2 I}{\partial x^2} + \frac{\partial^2 I}{\partial y^2}$$
3. Partitions the region into:
   * **Inner Core**: Inset by an inner margin $m = 0.20 \cdot \min(H, W)$.
   * **Boundary Ring**: The outer peripheral $20\%$ border.
4. Evaluates Laplacian variance:
   $$\sigma^2_{\text{inner}} = \text{Var}\left(\nabla^2 I_{\text{inner}}\right), \quad \sigma^2_{\text{boundary}} = \text{Var}\left(\nabla^2 I_{\text{boundary}}\right)$$
5. Evaluates texture consistency ratio:
   $$\text{texture} = 1.0 - \frac{|\sigma^2_{\text{inner}} - \sigma^2_{\text{boundary}}|}{\max(\sigma^2_{\text{inner}}, \sigma^2_{\text{boundary}})}$$
* **Visual Map**: Laplacian field is normalized, colored via `cv2.COLORMAP_TWILIGHT_SHIFTED`, and alpha-blended over the original crop. Saved to `{prefix}_texture_map.jpg`.

---

### 3.3 Sensor Noise Consistency: `compute_noise_consistency()`
Real digital cameras imprint high-frequency Photo-Response Non-Uniformity (PRNU) across the entire frame. Generative synthesis replaces the face with smooth latent noise.

1. Approximates high-frequency sensor noise:
   $$N(x, y) = I_{\text{gray}}(x, y) - \text{GaussianBlur}(I_{\text{gray}}(x, y), (5, 5), 1.0)$$
2. Compares noise standard deviation inside the face bounding box ($\sigma_{\text{face}}$) vs background ($\sigma_{\text{bg}}$):
   $$\text{noise} = \frac{\min(\sigma_{\text{face}}, \sigma_{\text{bg}})}{\max(\sigma_{\text{face}}, \sigma_{\text{bg}})}$$

---

### 3.4 Biological Facial Proportion Metrics

| Metric | Mathematical Formulation | Nominal Target ($\mu$) | Tolerance ($\tau$) | Forensic Significance |
| :--- | :--- | :---: | :---: | :--- |
| **Golden Ratio** | $\frac{|y_{\text{nose}} - y_{\text{eye\_center}}|}{|y_{\text{mouth\_center}} - y_{\text{nose}}|}$ | $1.40$ | $0.60$ | MediaPipe 2D projection vertical balance |
| **Interocular Ratio** | $\frac{\|\mathbf{p}_{re} - \mathbf{p}_{le}\|_2}{\|\mathbf{p}_{rm} - \mathbf{p}_{lm}\|_2}$ | $1.30$ | $0.50$ | Eye spacing vs mouth width |
| **Face Aspect Ratio**| $\frac{H_{\text{bbox}}}{W_{\text{bbox}}}$ | $1.30$ | $0.30$ | Bounding box cranial proportions |
| **Nose-Mouth Ratio** | $\frac{\|\mathbf{p}_{nt} - \mathbf{p}_{\text{mouth\_center}}\|_2}{\|\mathbf{p}_{rm} - \mathbf{p}_{lm}\|_2}$ | $0.65$ | $0.30$ | Philtrum vertical elongation |
| **Eye Alignment Angle**| $|\arctan2(\Delta y_{\text{eyes}}, \Delta x_{\text{eyes}})| \times \frac{180}{\pi}$ | $0.0^\circ$ | $15.0^\circ$ | Planar ocular tilt |

---

## 4. 3D Head Pose Photogrammetry via Perspective-n-Point (`compute_3d_head_pose`)

To verify whether the facial features lie on a geometrically plausible 3D human skull, the module projects 2D image coordinates onto a calibrated 3D anthropometric skull model using OpenCV's Levenberg-Marquardt iterative solver (`cv2.solvePnP`).

### 4.1 Canonical 3D Skull Model ($\mathbf{M} \in \mathbb{R}^{8 \times 3}$)
```python
model_points = np.array([
    (0.0, 0.0, 0.0),          # Nose tip (Origin)
    (225.0, 170.0, 135.0),    # Left mouth corner
    (-225.0, 170.0, 135.0),   # Right mouth corner
    (225.0, -150.0, 125.0),   # Left eye
    (-225.0, -150.0, 125.0),  # Right eye
    (0.0, 330.0, 65.0),       # Chin
    (350.0, -50.0, 200.0),    # Left temple
    (-350.0, -50.0, 200.0)    # Right temple
])
```

### 4.2 Camera Intrinsic Matrix ($\mathbf{K}$)
Assuming a zero-distortion pinhole camera model where focal length approximates image width:
$$\mathbf{K} = \begin{bmatrix} W & 0 & W/2 \\ 0 & W & H/2 \\ 0 & 0 & 1 \end{bmatrix}, \quad \mathbf{D} = \mathbf{0}_{4 \times 1}$$

### 4.3 Pose Decomposition:
$$\mathbf{p}_{\text{2D}} \sim \mathbf{K} [\mathbf{R} \mid \mathbf{t}] \mathbf{P}_{\text{3D}}$$
1. Solves for rotation vector $\mathbf{r}$ and translation vector $\mathbf{t}$ via `cv2.solvePnP(flags=cv2.SOLVEPNP_ITERATIVE)`.
2. Computes the $3 \times 3$ rotation matrix via Rodrigues transform: $\mathbf{R} = \text{Rodrigues}(\mathbf{r})$.
3. Decomposes the projection matrix $\mathbf{P} = [\mathbf{R} \mid \mathbf{t}]$ via `cv2.decomposeProjectionMatrix` into true Euler angles:
   $$\boldsymbol{\theta} = (\text{Pitch}, \text{Yaw}, \text{Roll})$$

### 4.4 Non-Overlapping HUD Text Rendering:
When drawing projected 3D axes on `face_head_pose.jpg`, the engine calculates projected 2D vector length:
$$\mathbf{d} = \begin{cases} \frac{\mathbf{p}_{\text{end}} - \mathbf{p}_{\text{nose}}}{\|\mathbf{p}_{\text{end}} - \mathbf{p}_{\text{nose}}\|_2} & \text{if } \|\mathbf{p}_{\text{end}} - \mathbf{p}_{\text{nose}}\|_2 > 15\text{ px} \\ \mathbf{d}_{\text{fallback}} & \text{otherwise} \end{cases}$$
* Where fallback vectors handle camera-facing axes:
  * Z (Roll Axis): $(-0.7, 0.7)$
  * Y (Yaw Axis): $(0.0, -1.0)$
  * X (Pitch Axis): $(1.0, 0.0)$
* Text is pushed 25 pixels past the arrow tip with two-pass drop shadow (thickness 3 black background, thickness 1 color foreground) to guarantee readability over complex backgrounds.

---

## 5. Temporal Geometric Jitter & Video Kinematics

When processing video files (`frame_files`), the engine samples up to 20 frames uniformly across the video duration:
```python
sample_count = min(20, len(frame_files))
indices = np.linspace(0, len(frame_files) - 1, sample_count, dtype=int)
```

### 5.1 Proportion Jitter Metric:
Tracks time-series histories of all biological proportions: $\mathbf{H}_{gr}, \mathbf{H}_{io}, \mathbf{H}_{ar}, \mathbf{H}_{nm}, \mathbf{H}_{sym}$.
$$\text{avg\_var} = \frac{1}{5} \left( \frac{\sigma(gr)}{0.50} + \frac{\sigma(io)}{0.50} + \frac{\sigma(ar)}{0.60} + \frac{\sigma(nm)}{0.60} + \frac{\sigma(sym)}{0.30} \right)$$
$$\text{temporal\_jitter} = \min(1.0, \text{avg\_var} \times 0.30)$$

### 5.2 3D Head Pose Angular Velocity Variance (Snap Jitter):
Biological neck muscles produce continuous, smooth angular accelerations. Generative deepfake engines produce discontinuous angular velocity jumps:
1. Calculates angular velocity vector between consecutive sampled frames:
   $$\Delta \boldsymbol{\theta}_t = \boldsymbol{\theta}_t - \boldsymbol{\theta}_{t-1} \quad \text{for } t = 2 \dots N$$
2. Evaluates variance across Pitch, Yaw, and Roll:
   $$\text{head\_pose\_jitter} = \min\left(1.0, \frac{\text{Var}(\Delta\text{Pitch}) + \text{Var}(\Delta\text{Yaw}) + \text{Var}(\Delta\text{Roll})}{3000.0}\right)$$
* *Sparse Sampling Normalization*: The divisor $3000.0$ accommodates sparse sampling across full video durations (1 frame every 2–3 seconds), preventing natural head turns from causing false alarms.

### 5.3 Unified Percentage Deviation Normalization:
In `face_temporal_jitter.jpg`, all time series are normalized relative to their individual means:
$$\tilde{h}_i = \frac{h_i - \bar{h}}{\bar{h}} \times 100\%$$
Plotted on a dark slate canvas (`#0f172a`) to visualize subtle frame-by-frame warping.

---

## 6. Anomaly Aggregation: Worst-Metric Architecture

A fundamental vulnerability of naive averaging in forensics is that an attacker can create a face-swap with flawless symmetry while leaving severe boundary texture blurring. Averaging would mask the failure.

The engine implements a **Worst-Metric Selection Policy**:

### 6.1 Spatial Anomaly:
$$\text{worst\_spatial\_metric} = \min(\text{symmetry}, \text{texture}, \text{noise})$$
$$\text{spatial\_anomaly} = 1.0 - \text{worst\_spatial\_metric}$$

### 6.2 Total Anomaly Calibration:
$$\text{temporal\_anomaly} = \frac{\text{temporal\_jitter} + \text{head\_pose\_jitter}}{2.0}$$
$$\text{anomaly\_score} = \max(\text{spatial\_anomaly}, \text{temporal\_anomaly}) \quad (\text{if video})$$

### 6.3 Secondary Morphological Penalties:
$$\text{anomaly\_score} \leftarrow \text{anomaly\_score} + \text{eye\_penalty} + \text{mouth\_penalty} + \text{gr\_penalty} + \text{io\_penalty}$$
Where:
* $\text{eye\_penalty} = \min(0.15, \max(0, \theta_{\text{eye}} - 15) / 100)$
* $\text{mouth\_penalty} = (1.0 - \text{mouth\_sym}) \times 0.10$
* $\text{gr\_penalty} = \min(0.20, |\text{golden\_ratio} - 1.40| \times 0.15)$
* $\text{io\_penalty} = \min(0.15, \text{deviation from } [1.0, 1.6] \times 0.50)$
* Final score is clamped: $\text{geometry\_anomaly\_score} = \text{clamp}(\text{anomaly\_score}, 0.0, 1.0)$.

---

## 7. Holographic Graphics Pipeline & Visual Artifacts

```python
# Multi-Pass Glow Compositing
overlay_with_glow = cv2.addWeighted(overlay, 0.9, glow, 0.6, 0)
vis = cv2.addWeighted(vis, 0.6, overlay_with_glow, 1.2, 0)
```
* The source image is dimmed to $60\%$ so that the mint hologram mesh (`(200, 248, 129)`) and dual-concentric white/black keypoint markers appear with high contrast without clipping skin pixels.

### Artifact Suite:
| Artifact Name | Visual Style | Colormap / Styling | Forensic Target |
| :--- | :--- | :--- | :--- |
| **`face_landmarks.jpg`** | 468-point 3D hologram mesh | Mint `(200, 248, 129)` with Gaussian glow | Structural mesh tracking & landmark placement |
| **`face_head_pose.jpg`** | Clean image with 3D axes | Red (X Pitch), Green (Y Yaw), Blue (Z Roll) | 3D skull orientation and solvePnP convergence |
| **`face_symmetry_map.jpg`** | Mirrored absolute difference | `COLORMAP_MAGMA` overlay | Anatomical sagittal asymmetry |
| **`face_texture_map.jpg`** | 2D Laplacian field | `COLORMAP_TWILIGHT_SHIFTED` | Boundary blending blur & edge feathering |
| **`face_radar_chart.jpg`** | 8-axis polar radar diagram | Purple `#a855f7` on Slate `#0f172a` | Multi-dimensional biological proportion profile |
| **`face_temporal_jitter.jpg`**| Multi-trace time series | Normalized % deviation from mean | Frame-by-frame proportion stability over time |

---

## 8. Interface Specification & Schema

### Function Signature
```python
def analyze_face_geometry(
    image_rgb: np.ndarray,
    output_dir: str,
    prefix: str = "face",
    frame_files: list = None
) -> dict
```

### Return Payload:
```json
{
  "face_detected": true,
  "detection_confidence": 0.95,
  "symmetry_score": 0.9214,
  "texture_consistency": 0.8845,
  "noise_consistency": 0.8124,
  "geometry_anomaly_score": 0.1876,
  "landmark_visualization_path": "uploads/job-id/face_landmarks.jpg",
  "head_pose_visualization_path": "uploads/job-id/face_head_pose.jpg",
  "symmetry_map_path": "uploads/job-id/face_symmetry_map.jpg",
  "texture_map_path": "uploads/job-id/face_texture_map.jpg",
  "radar_chart_path": "uploads/job-id/face_radar_chart.jpg",
  "temporal_jitter_score": 0.0821,
  "head_pose_jitter_score": 0.0412,
  "temporal_jitter_plot_path": "uploads/job-id/face_temporal_jitter.jpg",
  "eye_alignment_angle": 1.42,
  "mouth_symmetry": 0.9412,
  "golden_ratio": 1.382,
  "interocular_ratio": 1.285,
  "face_aspect_ratio": 1.312,
  "nose_mouth_ratio": 0.641,
  "face_geometry_interpretation": "Facial geometry appears consistent. 3D pose tracking, biological proportions, and temporal stability are natural.",
  "explanation": {
    "what_happened": "Extracted 468 3D facial landmarks and analyzed biological proportions, spatial symmetry, and temporal pose jitter.",
    "result": "Biologically Authentic Geometry",
    "why_it_happened": "Facial geometry appears consistent. 3D pose tracking, biological proportions, and temporal stability are natural.",
    "variables": {
      "Symmetry Anomaly": "7.9%",
      "Temporal Jitter": "8.2%",
      "3D Head Pose Snap": "4.1%",
      "Worst Spatial Mismatch": "18.8%"
    }
  }
}
```

---

## 9. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `geometry_anomaly_score` feeds as **Input Feature Index 3** into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Acts in concert with **Feature 0 (`nn_score`)**, **Feature 2 (`ela_score`)**, and **Feature 14 (`corneal_score`)**. When a deepfake has clean overall texture but fails boundary alignment or displays temporal pose snap, this module drives detection.
* **Safety Guards Handled**:
  1. **Thread-Safe Model Instances**: YuNet and MediaPipe instances reside in `threading.local()` to prevent memory corruption across concurrent asynchronous requests.
  2. **Graceful Failure**: If no face is detected, returns `face_detected: False` and neutral scores without crashing downstream reporting pipelines.
  3. **Sparse Sampling Robustness**: Normalization factor for head pose velocity variance ($3000.0$) accommodates sparse sampling across long videos without generating false jitter alarms.
  4. **Tri-Tier AI-Altered Retouching Guardrail**: When 3D landmark contours exhibit generative smoothing or warping ($s_{\text{geom}} \ge 0.45$) while the deep vision backbone confirms genuine human identity ($s_{\text{nn}} < 0.40$), this module triggers the **`AI-Altered / Retouched`** verdict instead of falsely accusing the user of malicious deepfake impersonation.

