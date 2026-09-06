# Technical Specification & Forensic Architecture: Audio-Visual Synchronization Engine (`audio_sync.py`)

**Implementation File**: [`backend/pipeline/audio_sync.py`](../pipeline/audio_sync.py)  
**Model Architecture**: [`backend/pipeline/SyncNetModel.py`](../pipeline/SyncNetModel.py)  
**Neural Checkpoint**: `backend/weights/syncnet_v2.model` (54,573,114 bytes)  
**Primary Interface**: `analyze_audio_visual_sync(video_path, audio_path, output_dir, prefix="sync")`

---

## 1. Theoretical Foundation & Forensic Principles

### 1.1 Articulatory Phonetics vs. Generative Speech Synthesis
In authentic human speech production, acoustic vocalization and articulatory facial dynamics form an indivisible, physically coupled biophysical system governed by the physiology of the vocal tract:
* **Bilabial Plosives** ($/p/, /b/, /m/$): Require complete hermetic lip seal and intra-oral pressure buildup prior to explosive burst release.
* **Labiodental Fricatives** ($/f/, /v/$): Mandate physical contact between the incisal edges of the maxillary teeth and the lower labial vermilion.
* **Vocalic Formants** ($/a/, /i/, /u/, /o/$): Require continuous, predictable jaw opening and labial rounding tied to specific acoustic resonant frequencies ($F_1, F_2$).

Generative video manipulation frameworks—including lip-sync deepfakes (e.g., *Wav2Lip*, *SadTalker*, *LivePortrait*, *HeyGen*) and audio-driven face replacement—break down this physical coupling in observable ways:
1. **Phonetic Phase Drift**: Generative models frequently introduce persistent or jittery temporal offsets ($\Delta t \ne 0$), where lip movements systematically lead or lag acoustic emissions.
2. **Viseme-to-Phoneme Incongruence**: Open mouth geometry during unvoiced consonants, or static closed lips during prolonged vowel formants.
3. **Temporal Smearing**: Loss of sharp, transient lip contact dynamics during rapid speech articulation due to temporal smoothing losses.

### 1.2 The SyncNet Joint Embedding Space
To quantify this physical relationship, the pipeline utilizes an adapted **SyncNet** architecture (Chung & Zisserman, *“Out of time: automated lip sync in the wild”*, ACCV 2016). SyncNet transforms continuous 5-frame video segments ($200\text{ ms}$) and synchronized audio windows into a unified **1024-dimensional latent embedding space** $\mathbb{R}^{1024}$.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYNCNET PIPELINE TOPOLOGY                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘

[Raw Audio .wav] ──> Resample 16kHz ──> 13-bin MFCC (100Hz) ──> Window [1, 13, 20]
                                                                        │
                                                                 [2D Audio CNN]
                                                                        │
                                                             Latent Vector f_aud ∈ ℝ¹⁰²⁴
                                                                        │
                                                                 ┌──────┴──────┐
                                                                 │  Euclidean  │──> LSE-D / LSE-C
                                                                 │  L₂ Metric  │──> sync_score
                                                                 └──────┬──────┘
                                                                        │
                                                             Latent Vector f_lip ∈ ℝ¹⁰²⁴
                                                                        │
                                                                 [3D Visual CNN]
                                                                        │
[Raw Video .mp4] ──> MediaPipe Mesh ──> Mouth Crop (224×224) ──> Volume [3, 5, 224, 224]
```

---

## 2. Signal Preprocessing & Mathematical Windowing

### 2.1 Acoustic Signal Representation
* **Sampling Rate**: Resampled to $f_s = 16,000\text{ Hz}$ mono PCM float32.
* **Spectral Analysis Parameters**:
  * FFT analysis window: $N_{\text{fft}} = 512$ samples ($32.0\text{ ms}$).
  * Hop length: $H = 160$ samples ($10.0\text{ ms}$).
  * Number of Mel-Frequency Cepstral Coefficients: $n_{\text{mfcc}} = 13$.
* **Temporal Resolution Derivation**:
  $$\text{Audio Feature Rate} = \frac{f_s}{H} = \frac{16,000\text{ samples/sec}}{160\text{ samples/frame}} = 100\text{ Hz}$$
  Each column of the extracted MFCC matrix corresponds to a time slice of $10\text{ ms}$.

### 2.2 Temporal Alignment & Window Formulation
* SyncNet evaluates temporal slices of **$200\text{ ms}$ ($0.2\text{ s}$)**:
  * For standard $25\text{ FPS}$ video footage:
    $$\text{Frames per Window} = 0.2\text{ s} \times 25\text{ FPS} = 5\text{ frames}$$
  * For $100\text{ Hz}$ acoustic features:
    $$\text{MFCC Time Bins} = 0.2\text{ s} \times 100\text{ Hz} = 20\text{ time steps}$$
* For videos of arbitrary frame rate $f_v$:
  $$\text{audio\_frames\_per\_video\_frame} = \frac{100.0}{f_v}$$
  $$\text{start\_idx}_i = \left\lfloor i \times \frac{100.0}{f_v} \right\rfloor, \quad \text{end\_idx}_i = \text{start\_idx}_i + 20$$
* Each individual acoustic slice produces a matrix of shape:
  $$\mathbf{A}_i \in \mathbb{R}^{13 \times 20}$$

### 2.3 Visual ROI Extraction: `get_mouth_roi()`
* **Face Mesh Landmarks**: Evaluated using MediaPipe 3D FaceLandmarker (478 vertices).
* **Anatomical Boundary Isolation**:
  * Outer and inner vermilion lips, philtrum, and mental protuberance (chin).
  * Rather than tightly bounding the lips, the engine isolates the lower third of the face (sub-nasal boundary to mandible):
    $$y_{\text{mid}} = \left\lfloor \frac{y_{\min} + y_{\max}}{2} \right\rfloor$$
  * To preserve isotropic scale and prevent geometric distortion during network ingestion:
    $$\text{box\_w} = x_{\max} - x_{\min}, \quad \text{box\_h} = y_{\max} - y_{\text{mid}}$$
    $$\text{size} = \max(\text{box\_w}, \text{box\_h})$$
    $$\text{half\_size} = \lfloor \text{size} \times 0.6 \rfloor \quad (\text{applies 20\% margin padding})$$
  * Centered bounding box coordinates:
    $$x_1 = \max(0, c_x - \text{half\_size}), \quad x_2 = \min(W, c_x + \text{half\_size})$$
    $$y_1 = \max(0, c_y - \text{half\_size}), \quad y_2 = \min(H, c_y + \text{half\_size})$$
  * Bounding box patch is cropped and resized to $[224, 224]$ via bilinear interpolation.
  * **Fallback Handling**: If landmarks temporarily drop due to occlusion or fast turning, the previous valid crop is carried forward:
    ```python
    video_frames.append(video_frames[-1])
    ```

---

## 3. Dual-Stream Neural Network Specification (`SyncNetModel.py`)

SyncNet contains two distinct sub-networks: a 2D-CNN acoustic branch (`netcnnaud` + `netfcaud`) and a 3D spatio-temporal visual branch (`netcnnlip` + `netfclip`).

### 3.1 Acoustic Sub-Network Layer Progression

*Input Tensor*: $\mathbf{X}_{\text{aud}} \in \mathbb{R}^{B \times 1 \times 13 \times 20}$

| Layer Index | Operation | Kernel Size | Stride | Padding | Output Shape ($C \times H \times W$) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **0** | `Input` | — | — | — | $1 \times 13 \times 20$ |
| **1** | `Conv2d` + `BN` + `ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $64 \times 13 \times 20$ |
| **2** | `MaxPool2d` | $(1, 1)$ | $(1, 1)$ | $0$ | $64 \times 13 \times 20$ |
| **3** | `Conv2d` + `BN` + `ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $192 \times 13 \times 20$ |
| **4** | `MaxPool2d` | $(3, 3)$ | $(1, 2)$ | $0$ | $192 \times 13 \times 9$ |
| **5** | `Conv2d` + `BN` + `ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $384 \times 13 \times 9$ |
| **6** | `Conv2d` + `BN` + `ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $256 \times 13 \times 9$ |
| **7** | `Conv2d` + `BN` + `ReLU` | $(3, 3)$ | $(1, 1)$ | $(1, 1)$ | $256 \times 13 \times 9$ |
| **8** | `MaxPool2d` | $(3, 3)$ | $(2, 2)$ | $0$ | $256 \times 6 \times 4$ |
| **9** | `Conv2d` + `BN` + `ReLU` | $(5, 4)$ | $(1, 1)$ | $(0, 0)$ | $512 \times 2 \times 1$ |
| **10** | `Flatten` | — | — | — | $1024$ (Flattened) |
| **11** | `Linear` + `BN` + `ReLU` | — | — | — | $512$ |
| **12** | `Linear` (Projection) | — | — | — | **$1024$** (`feat_a`) |

---

### 3.2 Visual Sub-Network Layer Progression

*Input Tensor*: $\mathbf{X}_{\text{lip}} \in \mathbb{R}^{B \times 3 \times 5 \times 224 \times 224}$ (Channels $\times$ Temporal Frames $\times$ Height $\times$ Width)

| Layer Index | Operation | Kernel Size ($T, H, W$) | Stride | Padding | Output Shape ($C \times T \times H \times W$) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **0** | `Input` | — | — | — | $3 \times 5 \times 224 \times 224$ |
| **1** | `Conv3d` + `BN` + `ReLU` | $(5, 7, 7)$ | $(1, 2, 2)$ | $(0, 0, 0)$ | $96 \times 1 \times 109 \times 109$ |
| **2** | `MaxPool3d` | $(1, 3, 3)$ | $(1, 2, 2)$ | $0$ | $96 \times 1 \times 54 \times 54$ |
| **3** | `Conv3d` + `BN` + `ReLU` | $(1, 5, 5)$ | $(1, 2, 2)$ | $(0, 1, 1)$ | $256 \times 1 \times 26 \times 26$ |
| **4** | `MaxPool3d` | $(1, 3, 3)$ | $(1, 2, 2)$ | $(0, 1, 1)$ | $256 \times 1 \times 13 \times 13$ |
| **5** | `Conv3d` + `BN` + `ReLU` | $(1, 3, 3)$ | $(1, 1, 1)$ | $(0, 1, 1)$ | $256 \times 1 \times 13 \times 13$ |
| **6** | `Conv3d` + `BN` + `ReLU` | $(1, 3, 3)$ | $(1, 1, 1)$ | $(0, 1, 1)$ | $256 \times 1 \times 13 \times 13$ |
| **7** | `Conv3d` + `BN` + `ReLU` | $(1, 3, 3)$ | $(1, 1, 1)$ | $(0, 1, 1)$ | $256 \times 1 \times 13 \times 13$ |
| **8** | `MaxPool3d` | $(1, 3, 3)$ | $(1, 2, 2)$ | $0$ | $256 \times 1 \times 6 \times 6$ |
| **9** | `Conv3d` + `BN` + `ReLU` | $(1, 6, 6)$ | $(1, 1, 1)$ | $(0, 0, 0)$ | $512 \times 1 \times 1 \times 1$ |
| **10** | `Flatten` | — | — | — | $512$ (Flattened) |
| **11** | `Linear` + `BN` + `ReLU` | — | — | — | $512$ |
| **12** | `Linear` (Projection) | — | — | — | **$1024$** (`feat_v`) |

---

## 4. Distance Formulations & Training Objective

### 4.1 Contrastive Loss Formulation
SyncNet is optimized using the Siamese contrastive loss with a positive margin $m$:
$$\mathcal{L}(\mathbf{v}, \mathbf{a}, y) = \frac{1}{2} y \, d(\mathbf{v}, \mathbf{a})^2 + \frac{1}{2} (1 - y) \max\left(0, m - d(\mathbf{v}, \mathbf{a})\right)^2$$
Where:
* $y = 1$ if the visual and audio segments are synchronized (temporal offset $\Delta t = 0$).
* $y = 0$ if the audio and visual segments are desynchronized ($\Delta t \ne 0$).
* $m = 15.0$ is the contrastive separation margin.
* $d(\mathbf{v}, \mathbf{a}) = \|\mathbf{f}_{\text{lip}} - \mathbf{f}_{\text{aud}}\|_2$ is the Euclidean distance in $\mathbb{R}^{1024}$.

### 4.2 Distance Evaluation at Inference
For each temporal evaluation window $k \in \{1, \dots, K\}$:
$$d_k = \sqrt{\sum_{j=1}^{1024} \left(f_{\text{aud}, j}^{(k)} - f_{\text{lip}, j}^{(k)}\right)^2}$$

### 4.3 Aggregation Metrics
1. **Lip-Sync Error Distance ($\text{LSE-D}$)**:
   $$\text{LSE-D} = \frac{1}{K} \sum_{k=1}^K d_k$$
   $\text{LSE-D}$ represents the central tendency of latent distance. Lower values indicate physical agreement.
2. **Lip-Sync Error Confidence ($\text{LSE-C}$)**:
   $$\text{LSE-C} = \max(0.0, 15.0 - \text{LSE-D})$$
   Derived directly from the training contrastive margin ($m = 15.0$), $\text{LSE-C}$ measures the margin of confidence below the complete desynchronization boundary.

---

## 5. Decision Thresholds & Non-Linear Mapping

Based on statistical distributions observed on benchmark corpora (VoxCeleb2, LRS2, DFDC):

$$\text{sync\_score} = \begin{cases}
0.10 & \text{if } \text{LSE-D} < 8.0 \quad (\text{Authentic Human Speech}) \\
0.40 & \text{if } 8.0 \le \text{LSE-D} < 9.5 \quad (\text{Ambiguous / Acoustic Noise / Low FPS}) \\
0.70 & \text{if } 9.5 \le \text{LSE-D} < 11.0 \quad (\text{Probable Synthetic Dubbing / Disrupted Sync}) \\
0.95 & \text{if } \text{LSE-D} \ge 11.0 \quad (\text{Definitive Deepfake / Artificial Visemes})
\end{cases}$$

### Benchmark Empirical Values
* **Authentic High-Definition Video**: $\text{LSE-D} \in [5.8, 7.6]$, $\text{LSE-C} \in [7.4, 9.2]$.
* **Wav2Lip Manipulated Media**: $\text{LSE-D} \in [9.8, 12.4]$, $\text{LSE-C} \in [2.6, 5.2]$.
* **Desynchronized / Splice-Dubbed Media**: $\text{LSE-D} \ge 11.5$, $\text{LSE-C} \le 3.5$.

---

## 6. Integration with Meta-Classifier (`ensemble_classifier.py`)

In the DeepForensics multimodal architecture:
* `sync_score` feeds as **Input Feature Index 6** into the 15-dimensional tabular input vector:
  $$\mathbf{x} = [x_0, \dots, x_6 = \text{sync\_score}, \dots, x_{14}] \in \mathbb{R}^{15}$$
* **Self-Attention Interaction**:
  The PyTorch Tabular ResNet contains dynamic Self-Attention gating:
  * When `sync_score` is high ($>0.7$) and `voice_score` (Feature 11) is simultaneously high, the self-attention layer boosts mutual weighting, confirming multimodal synthesis (e.g., ElevenLabs cloned audio spliced with Wav2Lip facial animation).
  * When visual backbone confidence is borderline ($x_0 \approx 0.55$), an $\text{LSE-D} > 11.0$ serves as a decisive veto that pushes the final ensemble classification into the deepfake regime.

---

## 7. Complete Execution Flow & Memory Safeguards

1. **Guard Clauses**: Returns neutral `0.5` if `.wav` audio track or video stream is missing.
2. **Temporal Windowing**: Bounds analysis to the first $15\text{ seconds}$ ($15 \times \text{FPS}$ frames) to constrain maximum GPU VRAM and processing latency.
3. **Mini-Batching**:
   ```python
   batch_size = 64
   for i in range(0, len(batch_audio), batch_size):
       # Evaluates in chunks to prevent CUDA OOM
   ```
4. **Diagnostic Visualization**:
   Generates a publication-grade diagnostic plot saved to `{output_dir}/{prefix}_sync_plot.jpg`:
   * Canvas background: Dark slate (`#111827`).
   * Distance progression: Solid coral trace (`#fb7185`) plotting $d_k$ across all evaluation windows.
   * Forensic baseline: Emerald dashed horizontal line (`#34d399`) fixed at threshold $y = 8.0$.
5. **Garbage Collection**: Explicitly purges audio/video tensor lists to keep backend memory footprint minimal.
