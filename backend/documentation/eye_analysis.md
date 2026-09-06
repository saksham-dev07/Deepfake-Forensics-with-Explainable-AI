# Technical Specification & Forensic Architecture: Dynamic Eye Movement, Blinking & Gaze Analysis (`eye_analysis.py`)

**Implementation File**: [`backend/pipeline/eye_analysis.py`](../pipeline/eye_analysis.py)  
**Analytical Classification**: Physiological Biometrics / Ocular Dynamics & Involuntary Reflex Forensics  
**Upstream Dependencies**: `OpenCV (cv2)`, `NumPy`, `MediaPipe FaceLandmarker`, `Matplotlib`  
**Primary Interface**: `analyze_eye_movements(video_path, output_dir, prefix="eye")`  
**Meta-Classifier Vector Position**: Input Feature Index 10 (`eye_score`)

---

## 1. Executive Summary & Physiological Theory

`eye_analysis.py` tracks and evaluates temporal ocular dynamics, spontaneous blink rates, and bilateral gaze conjugacy across sequential video frames. In biological humans, spontaneous blinking and gaze convergence are involuntary neuro-muscular reflexes governed by shared cranial nerve pathways. AI generative models (e.g., DeepFaceLab, FaceSwap, SadTalker, LivePortrait) frequently generate unnatural eye behaviors—including total blink starvation, high-frequency temporal eyelid glitching, and asynchronous monocular blinking ("lazy eye").

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            OCULAR DYNAMICS FORENSIC TOPOLOGY                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                     [Input Video Stream]
                                              │
                              MediaPipe 478-Point FaceLandmarker
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
            [Right Eye: 6 Landmarks]                        [Left Eye: 6 Landmarks]
            EAR_R = (v1 + v2) / (2·h)                       EAR_L = (v1 + v2) / (2·h)
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              │
                               Average EAR Sequence EAR(t)
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
          [Dynamic Blink Detection]                         [Gaze Asymmetry Metric]
          Median Resting EAR_rest                           Pearson Correlation r(EAR_L, EAR_R)
          Threshold τ = min(0.8·EAR, EAR - 0.03)            gaze_asymmetry = 1.0 - max(0, r)
          Finite State Debounce Engine                                 │
          Blink Rate (blinks / min)                                    │
                     │                                                 │
                     └────────────────────────┬────────────────────────┘
                                              │
                             Physiological Anomaly Scoring
                                   eye_anomaly_score
                                  clamp(·, 0.10, 0.90)
```

### 1.1 The Neuro-Physiological Reality of Human Blinking
1. **Autonomic Central Control**: Spontaneous blinking is an involuntary reflex regulated by dopaminergic circuits in the substantia nigra and the basal ganglia, transmitting motor commands to the orbicularis oculi via the facial nerve (Cranial Nerve VII).
2. **Healthy Resting Blink Rate**: Under normal ambient conditions, a resting adult blinks **$10 - 20\text{ times per minute}$** (approximately once every $3 - 6\text{ seconds}$).
3. **Bilateral Conjugate Synchrony**: Because the oculomotor (CN III), trochlear (CN IV), abducens (CN VI), and facial (CN VII) motor nuclei receive bilateral innervation from the paramedian pontine reticular formation, human blinking is strictly **conjugate and synchronous**: both eyelids close and reopen in unison with Pearson correlation coefficients $r \ge 0.95$.

### 1.2 Generative AI & Deepfake Vulnerabilities
* **Training Data Selection Bias (Li et al., CVPRW 2018)**: Most deepfake face-swap models are trained on scraped web imagery (celebrity photographs, interview stills). Because photographers almost never publish photos where subjects have their eyes closed, training sets suffer from extreme **closed-eye underrepresentation**.
* **Failure Modes**:
  1. **Blink Starvation**: The subject stares for 10–15 seconds with completely static, unblinking eyes ($\text{blink\_rate} < 5\text{ blinks/min}$).
  2. **Asymmetric Eyelid Dynamics ("Lazy Eye")**: Due to per-eye independent latent generation, one eyelid closes during a blink while the other remains frozen or half-open ($r < 0.75$).
  3. **High-Frequency Glitching**: Jittery eyelid flickering where EAR drops for 1–2 isolated frames without smooth muscular ramp-down ($\text{blink\_rate} > 45\text{ blinks/min}$).

---

## 2. Eye Aspect Ratio (EAR) Formulation & Landmarks

The engine computes the **Eye Aspect Ratio (EAR)** (Soukupová & Čech, 2016), an orientation-invariant scalar metric that measures palpebral aperture width.

### 2.1 Landmark Coordinate Mapping
For each eye, 6 anatomical landmark vertices are extracted from MediaPipe FaceLandmarker:

```
                  p2       p3
                   •       •
           p1 •                 • p4
                   •       •
                  p6       p5
```

* **Right Eye** (Subject Right / Image Left):
  $$\mathcal{I}_R = [p_1=33, p_2=160, p_3=158, p_4=133, p_5=153, p_6=144]$$
  * $p_1=33$: Lateral canthus (outer corner)
  * $p_4=133$: Medial canthus (inner corner)
  * $p_2=160, p_3=158$: Superior palpebral margin (upper eyelid)
  * $p_6=144, p_5=153$: Inferior palpebral margin (lower eyelid)
* **Left Eye** (Subject Left / Image Right):
  $$\mathcal{I}_L = [p_1=362, p_2=385, p_3=387, p_4=263, p_5=373, p_6=380]$$
  * $p_1=362$: Medial canthus (inner corner)
  * $p_4=263$: Lateral canthus (outer corner)
  * $p_2=385, p_3=387$: Superior palpebral margin (upper eyelid)
  * $p_6=380, p_5=373$: Inferior palpebral margin (lower eyelid)

### 2.2 Mathematical EAR Calculation: `calculate_ear()`
The 2D Euclidean distance vectors:
$$v_1 = \|p_2 - p_6\|_2 = \sqrt{(x_{p_2} - x_{p_6})^2 + (y_{p_2} - y_{p_6})^2}$$
$$v_2 = \|p_3 - p_5\|_2 = \sqrt{(x_{p_3} - x_{p_5})^2 + (y_{p_3} - y_{p_5})^2}$$
$$h = \|p_1 - p_4\|_2 = \sqrt{(x_{p_1} - x_{p_4})^2 + (y_{p_1} - y_{p_4})^2}$$

$$\text{EAR} = \frac{v_1 + v_2}{2.0 \cdot h + 10^{-6}}$$

#### Properties:
* **Fully Open Eye**: $\text{EAR} \in [0.25, 0.38]$ (depending on subject's natural palpebral shape).
* **Fully Closed Eye (Blink Apex)**: $\text{EAR} \le 0.15$.
* **Scale Invariant**: Because $v_1, v_2$ are normalized by horizontal fissure width $h$, EAR is robust to changes in distance from camera.

---

## 3. Person-Specific Dynamic Blink Detection

Static thresholding (e.g. a hardcoded $\text{EAR} < 0.20$) produces unacceptable false positives across diverse human demographics (e.g. subjects with epicanthic folds or hooded eyelids naturally exhibit lower baseline EARs). The engine implements an adaptive, person-specific thresholding model.

### 3.1 Resting EAR Estimation
$$\text{EAR}_{\text{resting}} = \text{median}\left(\{\text{EAR}(t)\}_{t=1}^N\right)$$
* *Mathematical Rationale*: Because a normal blink lasts only $100 - 400\text{ ms}$ ($3 - 12\text{ frames}$ at $30\text{ FPS}$), the eyes are open during $>90\%$ of video duration. The statistical **median** ignores transient blink dips and isolates the subject's true resting ocular baseline.

### 3.2 Dual Relative/Absolute Dynamic Threshold ($\tau$)
```python
threshold = min(resting_ear * 0.80, resting_ear - 0.03)
threshold = np.clip(threshold, 0.05, 0.35)
```
$$\tau = \text{clamp}\left(\min\left(0.80 \cdot \text{EAR}_{\text{resting}}, \text{EAR}_{\text{resting}} - 0.03\right), 0.05, 0.35\right)$$

#### Mathematical Proof of Dual Thresholding:
* **Case 1: Wide Eyes ($\text{EAR}_{\text{resting}} = 0.35$)**:
  $$\tau_1 = 0.35 \times 0.80 = 0.28, \quad \tau_2 = 0.35 - 0.03 = 0.32$$
  $$\tau = \min(0.28, 0.32) = 0.28$$
  The relative $80\%$ criterion controls, requiring a true $20\%$ vertical aperture drop before a blink is recognized.
* **Case 2: Narrow / Hooded Eyes ($\text{EAR}_{\text{resting}} = 0.18$)**:
  $$\tau_1 = 0.18 \times 0.80 = 0.144, \quad \tau_2 = 0.18 - 0.03 = 0.150$$
  $$\tau = \min(0.144, 0.150) = 0.144$$
  Prevents minor tracker noise from triggering blinks while reliably detecting full closure.
* **Case 3: Safety Clamping**:
  The outer clamp $[0.05, 0.35]$ prevents threshold collapse in extreme edge cases (e.g. extreme downward gaze).

### 3.3 State Machine Blink Counter
To prevent a single multi-frame blink from registering as multiple blinks:
```
State: in_blink = False

For each EAR(t):
    IF EAR(t) < τ:
        IF NOT in_blink:
            in_blink = True
            blinks += 1
    ELSE:
        in_blink = False
```

### 3.4 Extrapolated Blink Rate
$$T_{\text{minutes}} = \frac{N_{\text{frames}}}{f_{\text{fps}} \times 60.0}$$
$$\text{blink\_rate} = \frac{\text{blinks}}{T_{\text{minutes}}}$$

---

## 4. Bilateral Gaze Asymmetry Formulation

Authentic human eyes move conjugately. To quantify bilateral synchrony, the engine computes the Pearson correlation coefficient between the left and right EAR time series:

$$\mathbf{e}_L = \{\text{EAR}_L(t)\}_{t=1}^N, \quad \mathbf{e}_R = \{\text{EAR}_R(t)\}_{t=1}^N$$

$$r = \frac{\sum_{t=1}^N \left(\text{EAR}_L(t) - \bar{\mathbf{e}}_L\right) \left(\text{EAR}_R(t) - \bar{\mathbf{e}}_R\right)}{\sqrt{\sum_{t=1}^N \left(\text{EAR}_L(t) - \bar{\mathbf{e}}_L\right)^2 \sum_{t=1}^N \left(\text{EAR}_R(t) - \bar{\mathbf{e}}_R\right)^2}}$$

### 4.1 Division-by-Zero & Static Video Protection
If an unblinking subject remains completely motionless, $\text{std}(\mathbf{e}) \rightarrow 0$. The engine explicitly guards:
```python
if len(left_ear_seq) > 1 and np.std(left_ear_seq) > 1e-5 and np.std(right_ear_seq) > 1e-5:
    correlation = np.corrcoef(left_ear_seq, right_ear_seq)[0, 1]
    if np.isnan(correlation): correlation = 1.0
else:
    correlation = 1.0
```
Defaulting to $r = 1.0$ ensures static footage is not falsely penalized for "asymmetry" (it is penalized under the blink rate rule instead).

### 4.2 Asymmetry Metric:
$$\text{gaze\_asymmetry} = 1.0 - \max(0.0, r)$$

* **Authentic Subject**: Left and right eyes close simultaneously ($r \ge 0.90 \implies \text{gaze\_asymmetry} \le 0.10$).
* **Deepfake / Spliced Face**: Eyelids desynchronize or one eye drops while the other freezes ($r < 0.60 \implies \text{gaze\_asymmetry} > 0.40$).

---

## 5. Decision Rules & Anomaly Calibration

The engine begins with a baseline clean score of $S = 0.10$ and elevates anomaly confidence based on biological constraints:

```
Nominal Baseline: anomaly_score = 0.10

1. Blink Rate Evaluation:
   IF blink_rate < 5.0 AND duration > 6.0 sec:
       anomaly_score = max(anomaly_score, 0.70)
   ELSE IF blink_rate > 45.0:
       anomaly_score = max(anomaly_score, 0.85)

2. Gaze Asymmetry Evaluation:
   IF gaze_asymmetry > 0.40:
       anomaly_score = max(anomaly_score, 0.90)
   ELSE IF gaze_asymmetry > 0.25:
       anomaly_score = max(anomaly_score, 0.60)
```

### Forensic Justification Matrix:

| Condition | Observed Range | Anomaly Assignment | Forensic Significance |
| :--- | :---: | :---: | :--- |
| **Normal Human** | $10 \le \text{Rate} \le 25\text{ blinks/min}, \text{Asym} \le 0.20$ | `0.10` | Normal conjugate autonomic blinking |
| **Blink Starvation** | $\text{Rate} < 5.0\text{ blinks/min}$ (for $T > 6\text{s}$) | `0.70` | Unnatural staring; training set lacks closed-eye data |
| **Glitching / Flutter**| $\text{Rate} > 45.0\text{ blinks/min}$ | `0.85` | High-frequency frame-by-frame generative instability |
| **Moderate Asymmetry**| $0.25 < \text{Asym} \le 0.40$ | `0.60` | Partial eyelid desynchronization |
| **Severe Asymmetry** | $\text{Asym} > 0.40$ | `0.90` | "Lazy eye" artifact; physically impossible ocular divergence |

---

## 6. Diagnostic Visualization Artifact: `eye_plot.png`

The engine generates a publication-grade temporal wave plot saved to `{output_dir}/{prefix}_plot.png`:
* **Background**: Slate dark theme (`#0f172a`).
* **Traces**:
  * Left Eye EAR ($\mathbf{e}_L$): Blue curve (`#3b82f6`, width 1.5).
  * Right Eye EAR ($\mathbf{e}_R$): Red curve (`#ef4444`, width 1.5).
* **Reference Baseline**: Horizontal dashed white line (`alpha=0.5`) indicating the dynamic threshold $\tau$.
* **Diagnostic Interpretation**:
  * Authentic videos display synchronized, parallel downward spikes where both red and blue lines dip below $\tau$ simultaneously.
  * Deepfakes show flat horizontal lines (no dips) or isolated single-color dips where one line crosses $\tau$ while the other remains high.

---

## 7. Interface Specification & Schema

### Function Signature
```python
def analyze_eye_movements(
    video_path: str,
    output_dir: str,
    prefix: str = "eye"
) -> dict
```

### Parameters:
* **`video_path`** (`str`): File path to the video media (`.mp4`, `.mov`, `.avi`).
* **`output_dir`** (`str`): Target storage directory for the temporal plot.
* **`prefix`** (`str`, default `"eye"`): Output filename prefix.

### Return Payload:
```json
{
  "eye_anomaly_score": 0.10,
  "blink_count": 4,
  "blink_rate_per_min": 16.0,
  "gaze_asymmetry": 0.042,
  "eye_plot_path": "uploads/job-id/eye_plot.png",
  "warnings": [],
  "explanation": {
    "what_happened": "Blink rate and gaze convergence consistency over time were evaluated using Eye Aspect Ratio (EAR) mapping.",
    "result": "Gaze and blink characteristics appear biologically natural.",
    "why_it_happened": "Deepfakes often fail to render both eyes blinking synchronously or struggle with steady gaze convergence, leading to a 'lazy eye' effect or missing blinks entirely.",
    "variables": {
      "Blinks Detected": 4,
      "Blink Rate (per min)": "16.0",
      "Gaze Asymmetry Score": "0.042",
      "Anomaly Score": "0.10"
    }
  }
}
```

---

## 8. Meta-Classifier Integration & Failure Modes

* **Ensemble Position**: `eye_anomaly_score` feeds as **Input Feature Index 10** (`eye_score`) into the PyTorch Tabular ResNet (`ensemble_classifier.py`).
* **Interactions**:
  * Acts as a biological gate alongside **Feature 8 (`rppg_score`)** and **Feature 14 (`corneal_score`)**. When a video passes general image quality tests but displays blink starvation or asynchronous gaze, the meta-classifier recognizes a generative talking-head deepfake.
* **Safety Guards Handled**:
  1. **Short Video Protection**: If video duration is $<2\text{ seconds}$ ($< 2 \times \text{FPS}$ frames), returns early with `results["warnings"].append("Video too short...")` to avoid inaccurate rate extrapolation.
  2. **Tracking Dropouts**: When face landmarks drop temporarily, duplicates the previous valid EAR sample (`ear_sequence.append(ear_sequence[-1])`) to maintain continuous temporal alignment.
  3. **Zero Variance Protection**: Guarded against zero standard deviation before correlation calculation to avoid division by zero on static images.
  4. **Duration Cap**: Processing is bounded to 15 seconds (`max_frames = int(fps * 15)`) to maintain strict backend response guarantees.
