# Technical Specification & Forensic Architecture: Multimodal Meta-Classifier & Fusion Engine (`ensemble_classifier.py`)

**Implementation File**: [`backend/pipeline/ensemble_classifier.py`](../pipeline/ensemble_classifier.py)  
**Analytical Classification**: Multimodal Forensic Decision Fusion / Tabular ResNet & Gradient-Boosted Trees  
**Architectural Components**: PyTorch Tabular ResNet with Self-Attention (`DeepfakeMetaClassifier`) + XGBoost (`XGBClassifier`)  
**Pretrained Weights**: `backend/weights/ensemble_mlp.pth` (PyTorch) / `backend/weights/ensemble_mlp_xgb.json` (XGBoost)  
**Primary Interface**: `predict(feature_dict)`  
**Input Dimension**: 15-dimensional continuous feature vector $\mathbf{x} \in [0.0, 1.0]^{15}$

---

## 1. Executive Summary & Multimodal Fusion Theory

`ensemble_classifier.py` is the central meta-classification and decision fusion engine of the DeepForensics platform. Rather than relying solely on a deep neural network (which is vulnerable to adversarial perturbations and out-of-distribution drift) or heuristic voting (which fails when background regions dilute facial anomalies), the Meta-Classifier synthesizes **15 independent analytical vectors** spanning deep vision backbones, classical signal processing, hardware sensor forensics, physical optics, and biometrics.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           MULTIMODAL FORENSIC FUSION TOPOLOGY                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  [15 Orthogonal Forensic Sensors]
  ├─ 0: nn_score (EfficientNet-B4 + CBAM)      ├─  8: rppg_score (Biological Pulse)
  ├─ 1: spectral_score (FFT/DCT Spectral)      ├─  9: lighting_score (3D Illumination Vector)
  ├─ 2: ela_score (Error Level Analysis)       ├─ 10: eye_score (EAR & Blink Dynamics)
  ├─ 3: geometry_anomaly (Landmark Symmetry)   ├─ 11: voice_score (2D-CNN Vocoder Check)
  ├─ 4: noise_score (Sensor PRNU Residuals)    ├─ 12: flow_score (DIS Motion Jitter)
  ├─ 5: color_score (Chrominance Dispersion)   ├─ 13: cfa_score (Bayer Grid Demosaicing)
  ├─ 6: sync_score (3D-CNN SyncNet Viseme)     ├─ 14: corneal_score (Purkinje Symmetry)
  └─ 7: metadata_score (EXIF & Software Tags)
                                     │
                        Feature Vector x ∈ ℝ¹⁵
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
  [PyTorch Tabular ResNet]                           [XGBoost Classifier]
  Linear(15, 64) -> BatchNorm -> ReLU               200 Trees, Depth 5, LR 0.05
  ResidualBlock(64)                                  Evaluates Non-Linear Decision Rules
  SelfAttention(64) [Cross-Sensor Gating]            Primary Production Predictor
  ResidualBlock(64)                                            │
  Linear(64, 32) -> Linear(32, 1) -> Sigmoid                   │
           │                                                   │
           └─────────────────────────┬─────────────────────────┘
                                     ▼
                     Deepfake Probability P(Fake) ∈ [0.0, 1.0]
```

### 1.1 Why Simple Ensembling Fails in Deepfake Forensics
1. **The Dilution Fallacy (High-Quality Face Swaps)**:
   In high-grade face swaps (e.g., *Celeb-DF*, *DeepFaceLab*), the background environment is genuine camera footage. Consequently, background-derived sensors (CFA demosaicing, PRNU sensor noise, lighting divergence) output authentic scores ($\approx 0.15$). Only face-specific sensors (visual neural net, ELA boundaries, landmark geometry) detect anomalies ($\approx 0.85$). A simple arithmetic mean dilutes the facial alert and outputs $\approx 0.30$ (False Negative).
2. **The Fragility Fallacy (Physical False Positives)**:
   An authentic human video may feature a subject wearing thick eyeglasses (triggering high corneal reflection mismatch) or recorded in low light with motion blur (triggering high landmark geometry asymmetry). A naive majority-voting system incorrectly convicts authentic media.
3. **The Multimodal Decoupling Problem (Audio-Only Clones)**:
   In audio-driven dubbing or voice cloning (e.g., ElevenLabs + static footage), the visual stream is $100\%$ authentic camera footage ($13$ visual sensors $\approx 0.20$), while the audio and lip-sync engines report anomalies ($2$ sensors $\approx 0.90$).

The Meta-Classifier uses **Self-Attention Gating** and **Gradient-Boosted Decision Trees** to learn complex non-linear interactions across these modalities.

---

## 2. Feature Vector Schema ($\mathbf{x} \in \mathbb{R}^{15}$)

The input vector must strictly adhere to the following index ordering:

| Index | Feature Key | Source Analytical Engine | Forensic Domain | Output Range |
| :---: | :--- | :--- | :--- | :---: |
| **0** | `nn_score` | `models.py` (`DeepfakeDetector`) | Deep Learning (EfficientNet-B4 + CBAM) | $[0.0, 1.0]$ |
| **1** | `spectral_score` | `frequency_analysis.py` | Signal Processing (2D-FFT, Block-DCT, DWT) | $[0.0, 1.0]$ |
| **2** | `ela_score` | `ela_analysis.py` | Compression (Error Level Analysis & Ghosting) | $[0.0, 1.0]$ |
| **3** | `geometry_anomaly` | `face_geometry.py` | Biometrics (YuNet & MediaPipe 3D Landmark Symmetry) | $[0.0, 1.0]$ |
| **4** | `noise_score` | `sensor_noise.py` | Hardware (Photo-Response Non-Uniformity & SRM) | $[0.0, 1.0]$ |
| **5** | `color_score` | `color_analysis.py` | Biophysics (YCbCr, HSV, LAB Hemodynamics) | $[0.0, 1.0]$ |
| **6** | `sync_score` | `audio_sync.py` | Multimodal (SyncNet 3D-CNN Viseme Alignment) | $[0.0, 1.0]$ |
| **7** | `metadata_score` | `metadata_forensics.py`| File Structure (EXIF, MP4 Headers, Generative Tags) | $[0.0, 1.0]$ |
| **8** | `rppg_score` | `rppg_analysis.py` | Physiology (Remote Photoplethysmography Cardiac Pulse) | $[0.0, 1.0]$ |
| **9** | `lighting_score` | `lighting_analysis.py` | Photometry (3D Face vs Background Light Vectors) | $[0.0, 1.0]$ |
| **10**| `eye_score` | `eye_analysis.py` | Physiology (Eye Aspect Ratio, Blinking, Gaze) | $[0.0, 1.0]$ |
| **11**| `voice_score` | `voice_spoofing.py` | Acoustics (128-Mel Spectrogram 2D-CNN Anti-Spoofing) | $[0.0, 1.0]$ |
| **12**| `flow_score` | `optical_flow.py` | Temporal Dynamics (Dense DIS / Farneback Motion) | $[0.0, 1.0]$ |
| **13**| `cfa_score` | `cfa_analysis.py` | Hardware (Bayer CFA Demosaicing Inconsistency) | $[0.0, 1.0]$ |
| **14**| `corneal_score` | `corneal_analysis.py` | Optics (Purkinje Specular Highlight Congruence) | $[0.0, 1.0]$ |

---

## 3. Deep Neural Architecture: Tabular ResNet with Self-Attention

### 3.1 Residual Block (`ResidualBlock`)
Implements residual skip connections for tabular feature representations:
$$\mathbf{y} = \mathbf{x} + \text{Dropout}_{0.2}\left( \text{ReLU}\left( \text{BatchNorm1d}\left( \mathbf{W}\mathbf{x} + \mathbf{b} \right) \right) \right)$$
* Preserves gradient flow through tabular layers.
* Dimension: $\mathbb{R}^{64} \rightarrow \mathbb{R}^{64}$.

### 3.2 Dynamic Self-Attention Gating (`SelfAttention`)
Enables cross-sensor dynamic feature re-weighting:
1. Reshapes input $\mathbf{x} \in \mathbb{R}^{B \times D}$ to $\mathbf{X} \in \mathbb{R}^{B \times 1 \times D}$ ($D = 64$).
2. Computes Query ($\mathbf{Q}$), Key ($\mathbf{K}$), and Value ($\mathbf{V}$) projections via learned linear layers:
   $$\mathbf{Q} = \mathbf{X} \mathbf{W}_Q^T, \quad \mathbf{K} = \mathbf{X} \mathbf{W}_K^T, \quad \mathbf{V} = \mathbf{X} \mathbf{W}_V^T$$
3. Evaluates scaled dot-product attention:
   $$\mathbf{S} = \frac{\mathbf{Q} \mathbf{K}^T}{\sqrt{D}} \in \mathbb{R}^{B \times 1 \times 1}$$
   $$\mathbf{A} = \text{softmax}(\mathbf{S})$$
   $$\mathbf{Y} = \mathbf{A} \mathbf{V} + \mathbf{X} \quad (\text{Includes residual connection})$$
* **Forensic Significance**: When `voice_score` (Index 11) is high, the attention layer dynamically increases the sensitivity of `sync_score` (Index 6), detecting coordinated audio-visual synthesis.

### 3.3 Complete Network Topology
```
Input Layer:        Linear(15, 64) -> BatchNorm1d(64) -> ReLU()
Block 1:            ResidualBlock(64)
Attention Layer:    SelfAttention(64) [Dynamic Sensor Weighing]
Block 2:            ResidualBlock(64)
Bottleneck:         Linear(64, 32) -> BatchNorm1d(32) -> ReLU() -> Dropout(0.2)
Classification:     Linear(32, 1) -> Sigmoid()
Output:             P(Fake) ∈ [0.0, 1.0]
```

---

## 4. XGBoost Decision Engine Specification

When `xgboost` is installed, the engine instantiates an optimized `XGBClassifier`:
```python
self.xgb_model = xgb.XGBClassifier(
    n_estimators=200, 
    learning_rate=0.05, 
    max_depth=5, 
    subsample=0.8, 
    colsample_bytree=0.8, 
    eval_metric='logloss'
)
```

### XGBoost vs. Neural Net Operating Logic:
* **Production Priority**: If trained weights exist at `weights/ensemble_mlp_xgb.json`, `predict()` defaults to XGBoost:
  $$\hat{y} = \text{XGBoost}.\text{predict\_proba}(\mathbf{x})[0][1]$$
* **Why XGBoost Excel on Tabular Forensics**: Decision trees naturally construct sharp, orthogonal threshold partitions (e.g. `IF corneal_score > 0.8 AND rppg_score > 0.7 THEN FAKE`), avoiding the smooth boundary blurring typical of gradient-based neural networks on tabular data.
* **Dual Fallback**: If XGBoost is unavailable or unweighted, execution automatically routes to the PyTorch Tabular ResNet.

---

## 5. Procedural Synthetic Dataset Generation (`generate_synthetic_dataset`)

To train the meta-classifier without overfitting to specific video generators, the module procedurally generates $10,000$ synthetic vectors modeling real-world forensic distributions:

```
Total Dataset: 10,000 Samples (5,000 Authentic + 5,000 Synthetic)
```

### 5.1 Authentic ("Real") Sample Generation ($50\%$, Soft Label $y = 0.15$)
* **Nominal Distribution**: $\mathbf{x} \sim \text{clamp}(\mathcal{N}(\mu=0.20, \sigma=0.15), 0.0, 1.0)$.
* **Perturbation 1 (Visual Backbone False Positives, $10\%$)**:
  * Visual deep learning model is tricked ($x_0 \in [0.60, 0.90]$), but physical sensors remain authentic ($x_{1..14} \le 0.35$).
* **Perturbation 2 (Physical Sensor False Positives, $20\%$)**:
  * Real video with glasses (corneal failure) or motion blur (geometry failure).
  * $x_0 \in [0.05, 0.35]$ (NN knows it is real), but $1$ or $2$ physical sensors spike to $[0.60, 0.95]$.
  * *Training Effect*: Teaches the classifier not to convict a video based on a solitary physical false positive.

### 5.2 Manipulated ("Fake") Sample Generation ($50\%$, Soft Label $y = 0.85$)
* **Distribution 1: Low-Quality Deepfake ($30\%$)**:
  * Global degradation across all features: $\mathbf{x} \sim \text{clamp}(\mathcal{N}(\mu=0.70, \sigma=0.20), 0.0, 1.0)$.
* **Distribution 2: High-Quality Diffusion / Midjourney ($30\%$)**:
  * Visual NN is fooled ($x_0 \in [0.10, 0.40]$), but hardware and spectral sensors (PRNU Noise $x_4$, CFA $x_{13}$, Spectral $x_1$) spike to $[0.70, 1.00]$.
* **Distribution 3: High-Quality Face Swap / Celeb-DF ($15\%$)**:
  * Background is authentic ($x_4, x_9, x_{13} \le 0.25$), but visual NN catches face ($x_0 \in [0.60, 1.00]$) and face boundary sensors (ELA $x_2$, Geometry $x_3$, Eye $x_{10}$, Corneal $x_{14}$) spike to $[0.60, 1.00]$.
* **Distribution 4: NN Completely Fooled ($15\%$)**:
  * $x_0 \in [0.10, 0.40]$, but at least two biological sensors (Corneal $x_{14}$, Geometry $x_3$, Eye $x_{10}$, rPPG $x_8$) catch the manipulation at $[0.70, 1.00]$.
* **Distribution 5: Audio-Only Spoofing ($10\%$)**:
  * Visual sensors are authentic ($x_{0..5, 8..10, 12..14} \approx 0.20$), but Voice $x_{11} \in [0.80, 1.00]$ and Sync $x_6 \in [0.70, 1.00]$.
* **Anti-Shortcut Regularization**:
  * In all samples, `metadata_score` ($x_7$) is uniformly randomized ($U(0.0, 1.0)$) to prevent the network from treating metadata as a predictive shortcut.
* **Label Smoothing**: Soft labels ($y = 0.15$ and $y = 0.85$) prevent cross-entropy overconfidence and gradient saturation.

---

## 6. Training Dynamics & Backward Compatibility

### 6.1 Training Execution (`train_model`)
* **PyTorch Model Optimization**:
  * Objective: Binary Cross-Entropy Loss:
    $$\mathcal{L} = -\frac{1}{N} \sum_{i=1}^N \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right]$$
  * Optimizer: `Adam(lr=0.01)`.
  * Batch Size: 64 | Epochs: 50.
* **Weights Checkpoint**: Saved via `torch.save(self.state_dict(), save_path)`.

### 6.2 Legacy V1 Architecture Auto-Downgrade (`load_model`)
When loading weights from `weights/ensemble_mlp.pth`:
```python
is_legacy = "network.0.weight" in state_dict and state_dict["network.0.weight"].shape[0] == 32
```
* **V1 Detection**: If `network.0.weight` has output dimension 32, the loader dynamically reconstructs the legacy 3-layer MLP (`Linear(15, 32) -> Linear(32, 16) -> Linear(16, 1)`) without crashing.
* **V2 Detection**: If output dimension is 64, it loads the full Tabular ResNet with Self-Attention.
* **Robust Filepath Resolution**:
  ```python
  if model_path is None:
      model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "weights", "ensemble_mlp.pth")
  ```
  Resolves dynamically relative to `__file__`, guaranteeing seamless operation whether executed from `backend/` or the repo root.

---

## 7. Inference Interface Specification: `predict()`

### Function Signature
```python
def predict(self, feature_dict: dict) -> float
```

### Parameters:
* **`feature_dict`** (`dict`): Dictionary mapping feature names to continuous float values in $[0.0, 1.0]$.
  * Unsupplied features automatically default to a neutral `0.5`:
    ```python
    x_vector = [feature_dict.get(key, 0.5) for key in feature_order]
    ```

### Return Value:
* `confidence` (`float`): Continuous probability $P(\text{Fake}) \in [0.0, 1.0]$.

### Fallback Behavior:
If the model weights are not found on disk, the function gracefully falls back to an arithmetic average:
```python
return sum(feature_dict.values()) / len(feature_dict)
```

---

## 8. Failure Modes & Edge Cases Handled

1. **Missing XGBoost Library**: Caught via `try...except ImportError`, smoothly falling back to the PyTorch neural network.
2. **Missing Sensor Inputs**: Automatically filled with neutral $0.5$ via `.get(key, 0.5)` without crashing.
3. **Legacy Weights Migration**: Handled by state_dict inspection and on-the-fly architectural recreation.
4. **Execution Directory Agnostic**: Absolute path resolution prevents `weights not found` errors when invoked from external directories.

---

## 9. Tri-Tier Evidentiary Decision Engine & AI-Altered Guardrails

In real-world deployment, binary classification ($0 = \text{Authentic}$, $1 = \text{Deepfake}$) presents a severe failure mode when handling **benign generative photo enhancements** (e.g., Google Gemini image enhancement, Photoshop Generative Fill, Lightroom AI skin-smoothing, beauty filters). While these tools modify facial contours or Bayer CFA filter patterns, they do not commit malicious identity theft.

To prevent false convictions of authentic humans, the platform executes a post-ensemble **Tri-Tier Decision Engine**:

```
                       Meta-Classifier Probability P(Fake)
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
       P(Fake) ≥ 0.50                                  P(Fake) < 0.50
    [Deepfake / Impersonation]                                │
                                             ┌────────────────┴────────────────┐
                                             ▼                                 ▼
                                   Altered Heuristics Fired?              All Nominal
                                   - Geometry Anomaly ≥ 0.45                   │
                                   - CFA Pattern Anomaly ≥ 0.25                ▼
                                   - NN Backbone Score < 0.40          [Authentic Capture]
                                             │
                                             ▼
                                  [AI-Altered / Retouched]
                                  Non-Malicious Portrait Filter
```

### Mathematical Guardrail Formulation
Let $s_{\text{nn}}$ be the convolutional backbone score, $s_{\text{geom}}$ be the 3D facial landmark geometry anomaly, and $s_{\text{cfa}}$ be the Bayer filter residual score:
$$\text{IsAltered} = \left( (s_{\text{geom}} \ge 0.45) \lor (s_{\text{cfa}} \ge 0.25) \right) \land (s_{\text{nn}} < 0.40) \land (\hat{p}_{\text{fake}} < 0.50)$$

When triggered:
1. `result.is_ai_altered = True`
2. `result.verdict = "AI-Altered / Retouched"`
3. `result.alteration_type = "AI Facial Enhancement & Retouching (e.g., Gemini / Inpainting)"`
4. `result.alteration_details = "Underlying human identity is authentic, but localized AI retouching detected (Facial Geometry Reshaping, Color Filter Array Disruption, Software Re-encoding Traces)."`

