# Technical Specification & Forensic Architecture: 3D Spherical Harmonic Lighting & Photometric Inconsistency Analysis (`lighting_analysis.py`)

**Implementation File**: [`backend/pipeline/lighting_analysis.py`](../pipeline/lighting_analysis.py)  
**Analytical Classification**: Physics-Based Vision / Photometric Forensics / Spherical Harmonics Decomposition  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `MediaPipe 3D Landmarks`, `Math`  
**Primary Interface**: `analyze_lighting(image_rgb, output_dir, prefix="lighting", quality_multiplier=1.0)`  
**Meta-Classifier Vector Position**: Input Feature Index 9 (`lighting_score`)

---

## 1. Executive Summary & Photometric Forensic Theory

`lighting_analysis.py` models and compares the 3D directional illumination falling upon a human subject's face against the global ambient lighting field of the surrounding background.

When a human is photographed in a real-world environment, both facial skin and background surfaces receive irradiance from the same physical light field (e.g. overhead luminaires, sunlight from a window, or directional spotlights). In synthetic face-swapping pipelines (e.g., DeepFaceLab, FaceSwap, or diffusion-based inpainting), the donor face is captured under an illumination field $\mathbf{L}_{\text{donor}}$, whereas the target scene operates under $\mathbf{L}_{\text{target}}$. Because existing deepfake pipelines generate textures in latent space without enforcing physical inverse rendering or 3D ray-traced relighting, they leave an unresolvable **angular divergence between facial 3D lighting vectors and background illumination**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          LIGHTING ANALYSIS FORENSIC TOPOLOGY                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input RGB Image]
                                             │
                       5% Low-Pass Spatial Smoothing (Destroys ISO Grain)
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
          [3D Facial Surface Field]                    [Background Gradient Field]
          478 3D MediaPipe Landmarks                   Face Bounding Box Inverted
          Estimated Skull Origin (cx, cy, cz)          Sobel 1st Derivative (dx, dy)
          Outward Surface Normals n(x, y, z)           Top 30% Gradient Magnitudes
                      │                                             │
                      ▼                                             ▼
          [Spherical Harmonic Engine]                  [Circular Statistics Engine]
          9 Real SH Basis Functions (l ≤ 2)            Mean Vector Angle θ_bg
          Linear Least-Squares Regression              Circular Variance Var_circ = 1 - R
          Primary Light Vector L = (v3, v1)            Textured Background Discount
          Face Light Angle θ_face                                   │
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             │
                           Angular Divergence Δθ ∈ [0°, 180°]
                           Piecewise Quality Multiplier Thresholds
                           Confidence Discount: (1.0 - 2·(Var - 0.5))
                                             │
                                             ▼
                         [lighting_anomaly_score ∈ [0.10, 0.90]]
                                             │
                                  [Visual Diagnostics]
                                  - Ray-Traced 3D Light Probe
                                  - Vector Directional Overlay
```

---

## 2. Photometric Foundations: Spherical Harmonic Illumination

### 2.1 The Ramamoorthi-Hanrahan Irradiance Representation
Under the Lambertian reflectance model, the irradiance $E(\mathbf{n})$ of an arbitrary 3D surface with unit normal $\mathbf{n}$ under an incident light field $L(\boldsymbol{\omega})$ is given by the hemisphere integral:

$$E(\mathbf{n}) = \int_{\Omega} L(\boldsymbol{\omega}) \max(0, \mathbf{n} \cdot \boldsymbol{\omega}) \, d\boldsymbol{\omega}$$

As proven by Ramamoorthi & Hanrahan (*A Spherical Harmonic Analysis of Diffuse Reflections*, SIGGRAPH 2001), the clamped cosine convolution kernel $\max(0, \mathbf{n} \cdot \boldsymbol{\omega})$ acts as an aggressive low-pass filter with transfer coefficients $\hat{A}_l$:

$$\hat{A}_0 = \pi, \quad \hat{A}_1 = \frac{2\pi}{3}, \quad \hat{A}_2 = \frac{\pi}{4}, \quad \hat{A}_l = 0 \text{ for odd } l > 1$$

Because higher-order coefficients decay rapidly ($\hat{A}_4 = -\pi/24 \approx -0.13$), diffuse Lambertian irradiance is captured to **over $99.2\%$ energy accuracy using only the first 9 basis functions ($l \le 2$)**:

$$E(\mathbf{n}) \approx \sum_{i=0}^{8} v_i Y_i(\mathbf{n})$$

Where $\mathbf{n} = (n_x, n_y, n_z)$ is the unit surface normal vector, $v_i$ are the learned illumination coefficients, and $Y_i(\mathbf{n})$ are the 9 real basis polynomials.

### 2.2 The 9 Real Spherical Harmonic Basis Polynomials
The module explicitly evaluates the 9 orthonormal basis functions for each facial normal $\mathbf{n}$:

| Order ($l$) | Degree ($m$) | Index ($i$) | Basis Function $Y_i(n_x, n_y, n_z)$ | Physical Meaning |
| :---: | :---: | :---: | :--- | :--- |
| **$0$** | $0$ | $Y_0$ | $1.0$ | Ambient DC illumination baseline |
| **$1$** | $-1$| $Y_1$ | $n_y$ | Directional light along Y-axis (Vertical tilt) |
| **$1$** | $0$ | $Y_2$ | $n_z$ | Directional light along Z-axis (Depth / Frontal) |
| **$1$** | $1$ | $Y_3$ | $n_x$ | Directional light along X-axis (Horizontal tilt) |
| **$2$** | $-2$| $Y_4$ | $n_x n_y$ | Diagonal quadratic cross-term |
| **$2$** | $-1$| $Y_5$ | $n_y n_z$ | Vertical quadratic cross-term |
| **$2$** | $0$ | $Y_6$ | $3 n_z^2 - 1.0$ | Axial quadratic elongation |
| **$2$** | $1$ | $Y_7$ | $n_x n_z$ | Horizontal depth cross-term |
| **$2$** | $2$ | $Y_8$ | $n_x^2 - n_y^2$ | Bi-axial saddle cross-term |

---

## 3. Sub-Engine Architecture & Mathematical Formulations

### 3.1 Pre-filtering: Sensor Noise Attenuation
Illumination is a low-frequency environmental property. Camera sensor grain, thermal noise, and skin pore textures act as high-frequency noise that distorts gradient vectors.
```python
blur_size = int(max(5, min(w, h) * 0.05)) | 1
gray_smooth = cv2.GaussianBlur(gray, (blur_size, blur_size), 0)
```
* **$5\%$ Kernel Dimension**: Sized adaptively to image resolution, ensuring complete attenuation of micro-textures while preserving the macro light-to-shadow transitions.
* **Bitwise OR (`| 1`)**: Guarantees an odd kernel dimension required by OpenCV Gaussian filters.

---

### 3.2 3D Facial Normal Extraction
To evaluate Spherical Harmonics, the engine reconstructs the 3D surface normal vector $\mathbf{n}$ for every MediaPipe landmark vertex $\mathbf{p} = (x, y, z)$:

1. **Skull Center Estimation**:
   $$c_x = \frac{1}{N}\sum_{k=1}^N x_k, \quad c_y = \frac{1}{N}\sum_{k=1}^N y_k, \quad c_z = \frac{1}{N}\sum_{k=1}^N z_k + \frac{W_{\text{bbox}}}{2}$$
   *(The Z-center is offset into the skull interior, accounting for the fact that MediaPipe coordinates place negative Z toward the camera).*
2. **Outward Normal Normalization**:
   $$\mathbf{n}(x, y) = \frac{\mathbf{p} - \mathbf{c}}{\|\mathbf{p} - \mathbf{c}\|_2} = \left(\frac{p_x - c_x}{\|\mathbf{d}\|}, \frac{p_y - c_y}{\|\mathbf{d}\|}, \frac{p_z - c_z}{\|\mathbf{d}\|}\right)$$
3. **Linear System Construction**:
   For each landmark vertex inside frame boundaries, the design matrix row $\mathbf{M}_k \in \mathbb{R}^9$ and intensity observation $B_k \in \mathbb{R}$ are logged:
   $$\mathbf{M} = \begin{bmatrix} Y_0(\mathbf{n}_1) & \dots & Y_8(\mathbf{n}_1) \\ \vdots & \ddots & \vdots \\ Y_0(\mathbf{n}_N) & \dots & Y_8(\mathbf{n}_N) \end{bmatrix}, \quad \mathbf{B} = \begin{bmatrix} I(x_1, y_1) \\ \vdots \\ I(x_N, y_N) \end{bmatrix}$$
4. **Least-Squares Solver**:
   Solves for coefficient vector $\mathbf{v} \in \mathbb{R}^9$ via `np.linalg.lstsq`:
   $$\mathbf{v} = (\mathbf{M}^T \mathbf{M})^{-1} \mathbf{M}^T \mathbf{B}$$
5. **Dominant Face Light Angle**:
   The primary directional light vector in the image plane is given by the linear 1st-order harmonic coefficients $L_x = v_3$ and $L_y = v_1$:
   $$\theta_{\text{face}} = \left(\text{atan2}(v_1, v_3) \times \frac{180}{\pi} + 360^\circ\right) \bmod 360^\circ$$

---

### 3.3 Background Directional Estimation via Circular Statistics
Background surfaces lack known 3D geometry, so the engine measures 2D luminance gradients across background pixels:

1. **Gradient Extraction**:
   $$g_x = \text{Sobel}(I_{\text{smooth}}, k=5, dx=1, dy=0), \quad g_y = \text{Sobel}(I_{\text{smooth}}, k=5, dx=0, dy=1)$$
   $$\text{Mag}(x, y) = \sqrt{g_x^2 + g_y^2}, \quad \theta(x, y) = \text{atan2}(g_y, g_x)$$
2. **Foreground Isolation**:
   Evaluates only pixels outside the face bounding box (`bg_mask`) that exceed the 70th percentile of gradient magnitude (`strong_edges`):
   $$\text{Mask}_{\text{valid}} = \neg \text{FaceMask} \land (\text{Mag} > P_{70})$$
3. **Directional Circular Mean**:
   Because angles wrap at $360^\circ$, arithmetic averaging is invalid. The engine computes directional vector sums:
   $$S = \sum_{k \in \text{valid}} \sin(\theta_k), \quad C = \sum_{k \in \text{valid}} \cos(\theta_k)$$
   $$\theta_{\text{bg}} = \left(\text{atan2}(S, C) \times \frac{180}{\pi} + 360^\circ\right) \bmod 360^\circ$$
4. **Mean Resultant Vector Length ($R$) & Circular Variance**:
   $$R = \frac{\sqrt{S^2 + C^2}}{N_{\text{valid}}}$$
   $$\text{Var}_{\text{circ}} = 1.0 - R \in [0.0, 1.0]$$
   *Proof*: If all gradients align along a single angle $\theta_0$, $S = N \sin\theta_0, C = N \cos\theta_0 \implies \sqrt{S^2+C^2} = N \implies R = 1.0 \implies \text{Var}_{\text{circ}} = 0.0$. If gradients point randomly, $S \approx 0, C \approx 0 \implies R \rightarrow 0 \implies \text{Var}_{\text{circ}} \rightarrow 1.0$.

---

### 3.4 Textured Background Discounting Safeguard
* **The False-Positive Dilemma**: If the background contains complex textures (e.g. bookshelves, wallpaper patterns, foliage), edge gradients point in arbitrary pseudo-random directions. The circular variance spikes ($\text{Var}_{\text{circ}} \rightarrow 1.0$). In this regime, the estimated background angle represents texture noise rather than environmental illumination.
* **The Mathematical Discount Factor**:
  ```python
  confidence = 1.0
  if bg_variance > 0.5:
      confidence = max(0.1, 1.0 - ((bg_variance - 0.5) * 2.0))
  results["lighting_anomaly_score"] = max(0.10, base_score * confidence)
  ```
  * When $\text{Var}_{\text{circ}} \le 0.50$, confidence is $1.0$ (clean environmental lighting).
  * When $\text{Var}_{\text{circ}} \rightarrow 0.95$, confidence drops to the floor ($0.10$), preventing spurious deepfake convictions on textured walls.

---

## 4. Angular Divergence & Scoring Calibration

The angular divergence between face and background illumination is computed along the shortest arc of the circle:

$$\Delta \theta = \min(|\theta_{\text{face}} - \theta_{\text{bg}}|, 360^\circ - |\theta_{\text{face}} - \theta_{\text{bg}}|) \in [0^\circ, 180^\circ]$$

### 4.1 Image Quality Assessment (IQA) Dynamic Thresholds
Thresholds scale inversely with the quality multiplier $Q$:
$$t_1 = \frac{75^\circ}{Q}, \quad t_2 = \frac{50^\circ}{Q}, \quad t_3 = \frac{25^\circ}{Q}$$

$$\text{base\_score} = \begin{cases} 
0.90 & \text{if } \Delta\theta > t_1 \\
0.70 & \text{if } \Delta\theta > t_2 \\
0.40 & \text{if } \Delta\theta > t_3 \\
0.10 & \text{otherwise} 
\end{cases}$$

$$\text{lighting\_anomaly_score} = \max(0.10, \text{base\_score} \times \text{confidence})$$

### 4.2 Forensic Interpretation:
* **$\text{Score} > 0.50$**: **Lighting Mismatch (Deepfake)** — The illumination vector incident on the subject's face diverges significantly from background lighting, proving the face was composited from an alien scene.
* **$\text{Score} \le 0.50$**: **Consistent Global Illumination** — 3D facial lighting angles are congruent with the environmental background.

---

## 5. Visual Diagnostics & 3D Light Probe Rendering

The engine generates `{prefix}_lighting_map.jpg` containing two diagnostic graphics:

### 5.1 Ray-Traced 3D Synthetic Light Probe
In the top-right corner of the image, the module synthesizes an ideal 3D specular sphere:
1. Sized adaptively: $R = \max(40, 0.10 \cdot \min(W, H))$.
2. For each pixel $(x, y)$ inside the disc $x^2 + y^2 \le R^2$:
   $$z = -\sqrt{R^2 - x^2 - y^2}$$
   $$\mathbf{n} = \left(\frac{x}{R}, \frac{y}{R}, \frac{z}{R}\right)$$
3. Renders diffuse irradiance by dot-product evaluation with the learned 9 SH coefficients:
   $$I_{\text{probe}} = \sum_{i=0}^8 v_i Y_i(\mathbf{n})$$
4. Tints the probe with a metallic blue-gold spectrum ($B = 0.90 I, G = 0.95 I, R = 1.00 I$) and adds a specular rim ring (`cv2.circle(..., 1, cv2.LINE_AA)`).

### 5.2 Directional Vector Arrow Overlay
* **Red Arrow**: Originates at the facial centroid pointing along $\theta_{\text{face}}$ (length $80\text{ px}$, thickness 3, shadowed).
* **Blue Arrow**: Originates in the background margin pointing along $\theta_{\text{bg}}$ (length $80\text{ px}$, thickness 3, shadowed).
* **HUD Labels**: Displays numerical angles in degrees at the bottom of the canvas.

---

## 6. Interface Specification & Schema

### Function Signature
```python
def analyze_lighting(
    image_rgb: np.ndarray,
    output_dir: str,
    prefix: str = "lighting",
    quality_multiplier: float = 1.0
) -> dict
```

### Return Payload:
```json
{
  "lighting_anomaly_score": 0.10,
  "face_light_angle": 42.5,
  "bg_light_angle": 48.1,
  "angle_difference": 5.6,
  "lighting_map_path": "uploads/job-id/lighting_lighting_map.jpg",
  "warnings": [],
  "explanation": {
    "what_happened": "Reconstructed a 3D Spherical Harmonic environment map of the face and compared its light source angle to the background's 2D lighting gradients.",
    "result": "Consistent Global Illumination",
    "why_it_happened": "The 3D lighting on the face perfectly matches the environmental light source in the background.",
    "variables": {
      "Face Light Angle": "42.5°",
      "Background Light Angle": "48.1°",
      "Angle Difference": "5.6°",
      "Background Texture Variance": "0.18"
    }
  }
}
```

---

## 7. Meta-Classifier Integration & Safeguards

* **Ensemble Position**: `lighting_anomaly_score` feeds as **Input Feature Index 9** into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Highly complementary to **Feature 14 (`corneal_score`)**. While corneal analysis examines specular Purkinje reflections inside the eye, lighting analysis measures macroscopic diffuse shading across the entire head and room.
* **Safety Guards Handled**:
  1. **No Face Detected**: Safely returns `lighting_anomaly_score: 0.50` with a descriptive warning without raising exceptions.
  2. **Insufficient SH Points**: If 3D landmarks are occluded ($N \le 9$), falls back safely without executing invalid least-squares operations.
  3. **Circular Variance Protection**: Protects against textured background false alarms via dynamic confidence discounting.
