---
title: Deepfake Forensics API
emoji: 🕵️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# DeepForensics Backend: Explainable Multi-Modal AI Forensics Engine

The **DeepForensics Backend** is a high-throughput, court-admissible forensic analysis engine built with **FastAPI**, **PyTorch**, and **OpenCV**. It evaluates media integrity across **15 distinct multimodal forensic dimensions**—combining deep neural computer vision, acoustic biometrics, cardiovascular physiological signals, classical sensor noise physics, and mathematical Explainable AI (XAI).

---

## 1. Architectural Overview & System Topology

The backend functions as an asynchronous microservice architecture engineered for high-concurrency deployments, low latency, and sub-second cold starts:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEEPFORENSICS SYSTEM TOPOLOGY                                 │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                       [Client / Frontend / SDK Request]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             [API Key Security]               [SlowAPI Rate Limiter]
             Header: x-api-key                5 Requests / Minute / IP
             Validates API_KEY                Returns 429 Too Many Requests
                      │                                 │
                      └────────────────┬────────────────┘
                                       │
                         [POST /api/analyze Endpoint]
                         - 100 MB Hard Size Cap (1MB Async Streaming)
                         - Post-Stream True MIME Validation (python-magic)
                         - UUIDv4 Forensic Case Identifier
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
         [Return 200 OK + Job Token]       [BackgroundTasks Asynchronous Worker]
         Immediate Client Response         run_analysis_pipeline(job_id, file_path)
                      │                                 │
         ┌────────────┴────────────┐                    ▼
         ▼                         ▼        ┌──────────────────────────────────────┐
   [GET /status]            [GET /stream]   │ STAGE 1: Video Ingestion & IQA       │
   REST Polling JSON        SSE Event Stream│ STAGE 2: Batched ResNet Face Predict │
   Progress, Logs, VRAM     Real-Time Push  │ STAGE 3: Grad-CAM & Guided CAM XAI   │
                            (2KB NGINX Flush│ STAGES 4-7: 4-Worker Parallel Pool   │
                                            │ STAGE 8: Meta-Classifier & Overrides │
                                            │ STAGE 9: SHAP & Court-Admissible PDF │
                                            └──────────────────┬───────────────────┘
                                                               │
                                                               ▼
                                                  [GET /api/reports/{id}/pdf]
                                                  Download Forensic Report
```

---

## 2. The 15 Multimodal Forensic Sensory Dimensions

All analytical modules produce a normalized anomaly score $s \in [0.0, 1.0]$ where **$1.0$ indicates unequivocal synthetic manipulation** and **$0.0$ indicates pristine authentic capture**. These 15 scores assemble the exact input vector $\mathbf{x} \in \mathbb{R}^{15}$ ingested by the Meta-Classifier:

| Feature Index | Sensory Dimension | Analytical Domain | Theoretical Basis & Forensic Formulation | Technical Specification |
| :---: | :--- | :--- | :--- | :--- |
| **0** | **Neural Pixel Artifacts** (`nn_score`) | Deep Vision | **EfficientNet-B4 + CBAM Attention**: Compound scaling ($d=1.8, w=1.4, r=380$) + Dual Channel/Spatial Attention isolating GAN upsampling and blending artifacts. | [models.md](./documentation/models.md) |
| **1** | **Frequency Domain** (`spectral_score`) | Spectral Physics | **2D DCT & 2D FFT**: Hou & Zhang spectral residual saliency, $8\times 8$ block DCT quantization, and steep arctan switch $h_x$ detecting high-frequency spectral voids. | [frequency_analysis.md](./documentation/frequency_analysis.md) |
| **2** | **Error Level Analysis** (`ela_score`) | Compression Physics | **JPEG High-Pass Error**: Recompression difference against standard $Q=95$ quality matrix, isolating spatial compression grid discontinuities. | [ela_analysis.md](./documentation/ela_analysis.md) |
| **3** | **Facial Geometry** (`geometry_anomaly`) | Biometric Morphology | **MediaPipe 3D Mesh**: 468 landmarks, 3D Pose PnP solver (Euler angles), and bounding-box boundary Sobel texture gradient mismatch ($E_{\text{boundary}} / E_{\text{interior}}$). | [face_geometry.md](./documentation/face_geometry.md) |
| **4** | **Sensor Noise** (`noise_score`) | Hardware Physics | **Lukas PRNU Model**: Non-Local Means (NLM) patch denoising + Spatial Rich Models (SRM) 2nd-order derivative high-pass filter revealing missing sensor noise. | [noise_analysis.md](./documentation/noise_analysis.md) |
| **5** | **Chrominance Bleeding** (`color_score`) | Colorimetry | **YCbCr / CIELAB Color Space**: Color variance ratio ($\text{Var}(Cb)/\text{Var}(Y)$) and Gaussian-attenuated boundary color dispersion. | [color_analysis.md](./documentation/color_analysis.md) |
| **6** | **Audio-Visual Lip-Sync** (`sync_score`) | Metric Learning | **SyncNet Dual-Stream 3D-CNN**: Two-tower Siamese network mapping MFCCs and 5-frame 3D lip crops into 1024-D space (LSE-D / LSE-C metrics). | [audio_sync.md](./documentation/audio_sync.md) |
| **7** | **Container Metadata** (`metadata_score`) | Digital Forensics | **EXIF & Container Parser**: Generative AI keyword signatures (`midjourney`, `dall-e`, `stablediffusion`, `runway`, `lavf`), uninitialized timestamps, thumbnail mismatch. | [metadata_analysis.md](./documentation/metadata_analysis.md) |
| **8** | **Cardiovascular rPPG** (`rppg_score`) | Physiological Hemodynamics | **Remote Photoplethysmography (CHROM)**: Subcutaneous micro-vascular color modulation via 3rd-order zero-phase Butterworth filter ($0.7-2.5\text{ Hz}$) + Fourier SNR. | [rppg_analysis.md](./documentation/rppg_analysis.md) |
| **9** | **3D Lighting Consistency** (`lighting_score`) | Photometric Physics | **Spherical Harmonics ($l \le 2$)**: 9-coefficient real SH irradiance estimation over 3D facial mesh vs 2D Sobel background gradient circular variance ($1-R$). | [lighting_analysis.md](./documentation/lighting_analysis.md) |
| **10** | **Eye Gaze & Blinking** (`eye_score`) | Neuromotor Kinematics | **Eye Aspect Ratio (EAR)**: Temporal state machine tracking biological blink durations ($100-400\text{ ms}$) and pupil gaze asymmetry. | [eye_analysis.md](./documentation/eye_analysis.md) |
| **11** | **Voice Anti-Spoofing** (`voice_score`) | Acoustic Biometrics | **Lightweight 2D-CNN**: Depthwise separable convolutions on 128-mel spectrograms + cubic spline de-clipping + mobile microphone domain-shift veto. | [voice_spoofing.md](./documentation/voice_spoofing.md) |
| **12** | **Dense Optical Flow** (`flow_score`) | Temporal Kinematics | **DIS Optical Flow**: Kroeger et al. (ECCV 2016) Dense Inverse Search with constant Hessian $\mathbf{H}$ tracking boundary shimmering via Variance of Variances ($\text{Var}(\sigma_t^2)$). | [optical_flow.md](./documentation/optical_flow.md) |
| **13** | **CFA Demosaicing** (`cfa_score`) | Hardware Sensor Physics | **Bayer Grid Artifacts**: $3\times 3$ high-pass diagonal residual filter ($\frac{1}{4}[1, -2, 1; -2, 4, -2; 1, -2, 1]$) with $8\times 8$ local variance pooling. | [cfa_analysis.md](./documentation/cfa_analysis.md) |
| **14** | **Corneal Reflections** (`corneal_score`) | Optics & Geometry | **Ocular Specular Highlights**: LAB lightness top-10% thresholding, convex hull containment, and normalized cross-correlation (NCC) of corneal reflections. | [corneal_analysis.md](./documentation/corneal_analysis.md) |

---

## 3. Advanced Neural Architectures

### 3.1 EfficientNet-B4 + CBAM Spatial & Channel Attention
* **File**: [`pipeline/models.py`](./pipeline/models.py) (Full Docs: [models.md](./documentation/models.md))
* Compound scaling: $\text{Depth}=1.8, \text{Width}=1.4, \text{Resolution}=380\times 380$.
* **CBAM Attention**: Incorporates Channel Attention (Global Avg + Max Pooling through a shared $r=16$ MLP) and Spatial Attention (Channel Avg + Max Pooling through a $7\times 7$ Conv) to focus directly on manipulation boundaries.
* **Pretraining & Convergence**: Fine-tuned on 73,373 curated samples across 3 primary datasets ([140k Real & Fake Faces](https://www.kaggle.com/datasets/xhlulu/140k-real-and-fake-faces), [Celeb-DF v2](https://www.kaggle.com/datasets/reubensuju/celeb-df-v2), and [DFDC Train Sample](https://www.kaggle.com/datasets/francisbawa/dfdc-train-sample)) using Focal Loss ($\gamma=2.0$) with Cosine Annealing, achieving **99.52% validation accuracy** (val loss: $0.0053$). ([FaceForensics++ C23](https://www.kaggle.com/datasets/xdxd003/ff-c23) serves as a 100% unseen, out-of-distribution zero-shot test suite).
* **Official Celeb-DF (v2) Benchmark (Video)**: Tested against the official `List_of_testing_videos.txt` test split (518 videos: 178 Real, 340 Fake) with zero data leakage:
  - **Accuracy**: **99.81%** (517/518 correct) | **ROC-AUC**: **1.0000** | **Average Precision (AP)**: **1.0000**
  - **Recall (TPR)**: **100.00%** (340/340 deepfakes caught, **0 False Negatives**)
  - **Precision**: **99.71%** | **Specificity (TNR)**: **99.44%** | **F1-Score**: **99.85%**
  - **Equal Error Rate (EER)**: **0.00%** (Threshold: $0.7057$) | **Brier Calibration Score**: **0.0157**
  - **Confusion Matrix**: $[TN=177, FP=1, FN=0, TP=340]$
* **Official 140k Real & Fake Faces Benchmark (Image)**: Tested against all 20,000 official test images (10,000 FFHQ Real, 10,000 StyleGAN Fake):
  - **Accuracy**: **99.955%** (19,991/20,000 correct) | **ROC-AUC**: **1.0000** | **Average Precision (AP)**: **1.0000**
  - **Recall (TPR)**: **99.98%** (9,998/10,000 fakes caught, **only 2 False Negatives**)
  - **Precision**: **99.93%** | **Specificity (TNR)**: **99.93%** | **F1-Score**: **99.955%**
  - **Equal Error Rate (EER)**: **0.02%** (Threshold: $0.6132$) | **Brier Calibration Score**: **0.0139**
  - **Confusion Matrix**: $[TN=9993, FP=7, FN=2, TP=9998]$
* **FaceForensics++ (C23) Zero-Shot Benchmark & Shortcoming Audit (`improved_finetuned_model.pth`)**: Tested across 977 videos (140 Real, 837 Fake across 6 methods):
  - **Accuracy**: **32.96%** | **ROC-AUC**: **0.6563** | **Equal Error Rate (EER)**: **38.64%** (Threshold: $0.2076$)
  - **Recall (TPR)**: **23.18%** (**Severe False Negative Defect: 643/837 fakes missed**) | **Specificity (TNR)**: **91.43%**
  - **Confusion Matrix**: $[TN=128, FP=12, FN=643, TP=194]$
  - **Per-Method Accuracy Breakdown**:
    - *DeepFakeDetection*: 30.66% (Mean Fake Prob: 0.4061)
    - *Deepfakes*: 51.43% (Mean Fake Prob: 0.5270)
    - *Face2Face*: 15.71% (Mean Fake Prob: 0.3050) — *Re-enactment blindspot*
    - *FaceShifter*: 5.71% (Mean Fake Prob: 0.2290) — *Occlusion-handling blindspot*
    - *FaceSwap*: 20.71% (Mean Fake Prob: 0.3523)
    - *NeuralTextures*: 15.00% (Mean Fake Prob: 0.2806) — *Photometric rendering blindspot*
    - *Original (Real)*: 91.43% (Mean Fake Prob: 0.2363)
  - **Shortcoming Diagnosis**: The base model was trained without FaceForensics++ data; H.264 (C23) quantization and facial re-enactment algorithms led to severe underconfidence (mean manipulation probabilities ~0.23–0.40).
  - **V2 Continual Fine-Tuning**: To solve these failure modes, the backbone was continually fine-tuned using the FaceForensics++ dataset with an experience replay buffer (23,299 samples across FF++ C23, Celeb-DF v2, DFDC, and 140k Faces), achieving **96.80% peak validation accuracy** (Val Loss: **0.0187**) in [`backend/notebooks/train-finetune-model-v2.ipynb`](./notebooks/train-finetune-model-v2.ipynb), generating **`improved_finetuned_model_v2.pth`**.
  - **V2 Celeb-DF (v2) Re-Evaluation**: Testing `improved_finetuned_model_v2.pth` in [`backend/notebooks/celebdf-v2-benchmark-and-xai-evaluation-v2.ipynb`](./notebooks/celebdf-v2-benchmark-and-xai-evaluation-v2.ipynb) confirmed zero catastrophic forgetting: **99.61% accuracy**, **100.00% recall (0 False Negatives)**, **ROC-AUC: 1.0000**, **EER: 0.00%**, Confusion Matrix: $[TN=176, FP=2, FN=0, TP=340]$.
  - **V2 140k Faces Re-Evaluation**: Testing `improved_finetuned_model_v2.pth` in [`backend/notebooks/real-vs-fake-140k-benchmark-and-xai-v2.ipynb`](./notebooks/real-vs-fake-140k-benchmark-and-xai-v2.ipynb) confirmed zero catastrophic forgetting on static GANs: **99.94% accuracy**, **99.99% recall (only 1 False Negative / 10,000 fakes)**, **ROC-AUC: 1.0000**, **EER: 0.02%**, Confusion Matrix: $[TN=9989, FP=11, FN=1, TP=9999]$.
  - **V2 FaceForensics++ (C23) Re-Evaluation**: Testing `improved_finetuned_model_v2.pth` in [`backend/notebooks/faceforensics-evaluation-v2.ipynb`](./notebooks/faceforensics-evaluation-v2.ipynb) across 977 compressed videos confirmed successful domain adaptation under heavy H.264 quantization: **66.02% accuracy** (doubled from 32.96%), **64.28% recall** (538 / 837 fakes intercepted, up from 23.18%), **94.22% precision**, **ROC-AUC: 0.7671**, **PR-AUC: 0.9535**, **EER: 30.47%**, Confusion Matrix: $[TN=107, FP=33, FN=299, TP=538]$.
* **Research & Evaluation Notebooks Registry (All 8 Notebooks)**:

| Pipeline Domain / Benchmark Dataset | Version 1 Baseline Checkpoint (`v1`) | Version 2 Continual Checkpoint (`v2`) |
| :--- | :--- | :--- |
| **Training Pipeline** | [`train_improved_finetuned_model.ipynb`](./notebooks/train_improved_finetuned_model.ipynb) *(20 Epochs, Base Mixture)* | [`train-finetune-model-v2.ipynb`](./notebooks/train-finetune-model-v2.ipynb) *(5 Epochs, Replay Buffer)* |
| **Celeb-DF (v2) Test Split** | [`celebdf_v2_benchmark_and_xai_evaluation.ipynb`](./notebooks/celebdf_v2_benchmark_and_xai_evaluation.ipynb) *(99.81% Acc, 100% Rec)* | [`celebdf-v2-benchmark-and-xai-evaluation-v2.ipynb`](./notebooks/celebdf-v2-benchmark-and-xai-evaluation-v2.ipynb) *(99.61% Acc, 100% Rec, Anti-Forgetting)* |
| **140k Real & Fake Faces** | [`real-vs-fake-140k-benchmark-and-xai.ipynb`](./notebooks/real-vs-fake-140k-benchmark-and-xai.ipynb) *(99.96% Acc, 99.98% Rec)* | [`real-vs-fake-140k-benchmark-and-xai-v2.ipynb`](./notebooks/real-vs-fake-140k-benchmark-and-xai-v2.ipynb) *(99.94% Acc, 99.99% Rec, 1 FN / 10k)* |
| **FaceForensics++ (C23)** | [`faceforensics-evaluation.ipynb`](./notebooks/faceforensics-evaluation.ipynb) *(32.96% Acc, Blindspot Discovery)* | [`faceforensics-evaluation-v2.ipynb`](./notebooks/faceforensics-evaluation-v2.ipynb) *(66.02% Acc, +33% Gain, Domain Adaptation)* |

* **Weights**: Loaded automatically from `backend/weights/improved_finetuned_model_v2.pth` (with fallback to `improved_finetuned_model.pth`).

### 3.2 Dual-Stream Audio-Visual SyncNet Model
* **File**: [`pipeline/SyncNetModel.py`](./pipeline/SyncNetModel.py) (Full Docs: [syncnet_model.md](./documentation/syncnet_model.md))
* Siamese dual-tower network:
  - Acoustic Tower: 6-stage 2D-CNN converting audio MFCCs into a 1024-D embedding.
  - Lip Tower: 6-stage 3D-CNN spatiotemporal encoder fusing 5 consecutive video frames into a 1024-D embedding.
* Evaluates temporal synchronization distance (LSE-D) and peak confidence (LSE-C).

### 3.3 Tabular ResNet with Multi-Head Self-Attention (Meta-Classifier)
* **File**: [`pipeline/ensemble_classifier.py`](./pipeline/ensemble_classifier.py) (Full Docs: [ensemble_classifier.md](./documentation/ensemble_classifier.md))
* Integrates all 15 sensory inputs into an 8-layer Tabular ResNet architecture with skip connections, LayerNorm, and 4-head Multi-Head Self-Attention ($\mathbb{R}^{15} \rightarrow \mathbb{R}^{64} \rightarrow \mathbb{R}^{128} \rightarrow \mathbb{R}^{64} \rightarrow \mathbb{R}^1$).
* Trained using **Class-Balanced Weighted Focal Loss**:
  $$\mathcal{L}_{\text{FL}}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t) \quad \text{with } \gamma=2.0, \alpha=0.65$$

---

## 4. Explainable AI (XAI) & Evidentiary Safeguards

To meet legal admissibility standards (such as the Daubert standard), the backend avoids opaque black-box verdicts by providing multi-tiered explainability:

1. **Dual-Resolution Grad-CAM Heatmaps (`xai_explainer.py`):**
   - **Coarse Grad-CAM**: Hooked into `model.conv_head` (1792 channels) targeting Class 0 (`FAKE`), blended over original RGB via Jet colormap.
   - **High-Resolution Guided Grad-CAM**: Combines Guided Backpropagation with Grad-CAM masks, applying 1st–99th percentile dynamic range contrast stretching and scientific `COLORMAP_INFERNO` rendering:
     $$\mathbf{M}_{\text{HDR}}(x, y) = \text{clip}\left(\frac{\mathbf{M}(x, y) - p_1}{p_{99} - p_1}, \; 0, \; 1\right)$$
2. **True SHAP Explanations (`main.py`):**
   - Evaluates `shap.KernelExplainer` on the Meta-Classifier using a neutral uncertainty baseline ($\mathbf{X}_{\text{ref}} = [0.5]^{15}$).
   - Extracts directional impacts (e.g. `"Lack of biological heart pulse (rPPG) (Impact: 34.2% → FAKE)"`).
3. **The "Catching Flawless Fakes" Heuristic Override:**
   - If any critical biological sensor violently fails ($\max(\text{eye\_score}, \text{sync\_score}, \text{voice\_score}) > 0.80$), the final fake probability is boosted to match the critical failure ($\hat{p}_{\text{fake}} = \max$), preventing meta-classifier averaging from washing out decisive biological proof of forgery.
4. **Tri-Tier Evidentiary Decision Engine & AI-Altered Guardrail (`main.py`):**
   - Distinguishes non-malicious cosmetic beauty retouching, portrait filters, and generative inpainting (e.g. Gemini, Photoshop Generative Fill, Lightroom AI) from criminal deepfake identity theft.
   - When primary CNN score is low ($s_{\text{nn}} < 0.40$) and overall probability is low ($< 0.50$), but localized 3D geometry ($s_{\text{geom}} \ge 0.45$) or Bayer CFA demosaicing ($s_{\text{cfa}} \ge 0.25$) trigger, the engine classifies the media as **`AI-Altered / Retouched`** (`is_ai_altered = True`), protecting authentic human users from false convictions.
5. **Court-Admissible PDF Synthesis (`pdf_reporter.py`):**
   - Synthesizes multi-page corporate forensic dossiers featuring executive verdict banners, 15-sensor tabular audit with progress bars, metric parameter tables, legal evidentiary disclaimer, and a 2-column visual evidence gallery hosting up to 30+ figures.

---

## 5. Complete Technical Documentation Index

Detailed mathematical derivations, transfer functions, and code architectures for all pipeline files are maintained in [`backend/documentation/`](./documentation/):

| Documentation File | Target Component | Core Algorithms & Forensic Focus |
| :--- | :--- | :--- |
| **[main_api.md](./documentation/main_api.md)** | `main.py` | FastAPI gateway, rate limiting, SSE streaming, 9-stage pipeline orchestration. |
| **[models.md](./documentation/models.md)** | `pipeline/models.py` | EfficientNet-B4 compound scaling, MBConv, CBAM dual attention, Grad-CAM hooks. |
| **[ensemble_classifier.md](./documentation/ensemble_classifier.md)** | `pipeline/ensemble_classifier.py` | Tabular ResNet with Multi-Head Self-Attention, Focal Loss, 15-D fusion. |
| **[video_processor.md](./documentation/video_processor.md)** | `pipeline/video_processor.py` | PySceneDetect cut detection, FFmpeg `select` frame filter, 16 kHz PCM extraction. |
| **[audio_sync.md](./documentation/audio_sync.md)** | `pipeline/audio_sync.py` | 13-D MFCC feature extraction, 5-frame 3D lip crops, SyncNet LSE-D/LSE-C metrics. |
| **[syncnet_model.md](./documentation/syncnet_model.md)** | `pipeline/SyncNetModel.py` | Dual-stream 2D/3D CNN Siamese two-tower architecture in 1024-D space. |
| **[voice_model.md](./documentation/voice_model.md)** | `pipeline/voice_model.py` | Lightweight 2D-CNN with Depthwise Separable Convolutions for 128-mel spectrograms. |
| **[voice_spoofing.md](./documentation/voice_spoofing.md)** | `pipeline/voice_spoofing.py` | Cubic spline de-clipping, ZCR variance, 85% rolloff, mobile domain-shift veto. |
| **[frequency_analysis.md](./documentation/frequency_analysis.md)** | `pipeline/frequency_analysis.py` | 2D FFT, vectorized $8\times 8$ block DCT, Hou & Zhang saliency, arctan switch $h_x$. |
| **[ela_analysis.md](./documentation/ela_analysis.md)** | `pipeline/ela_analysis.py` | JPEG compression physics, $Q=95$ recompression error, dynamic contrast scaling. |
| **[face_geometry.md](./documentation/face_geometry.md)** | `pipeline/face_geometry.py` | MediaPipe 468 3D landmarks, PnP head pose, boundary Sobel energy mismatch. |
| **[noise_analysis.md](./documentation/noise_analysis.md)** | `pipeline/noise_analysis.py` | Lukas PRNU sensor noise, Non-Local Means patch denoising, 2nd-order SRM filter. |
| **[color_analysis.md](./documentation/color_analysis.md)** | `pipeline/color_analysis.py` | Multi-space chrominance bleeding in YCbCr/Lab with Gaussian edge attenuation. |
| **[lighting_analysis.md](./documentation/lighting_analysis.md)** | `pipeline/lighting_analysis.py` | 9-coefficient real Spherical Harmonics ($l \le 2$) vs Sobel background circular stats. |
| **[rppg_analysis.md](./documentation/rppg_analysis.md)** | `pipeline/rppg_analysis.py` | Subcutaneous hemodynamics, 3-polygon masking, 3rd-order Butterworth, CHROM rFFT. |
| **[eye_analysis.md](./documentation/eye_analysis.md)** | `pipeline/eye_analysis.py` | Eye Aspect Ratio (EAR), temporal blink duration state machine, gaze asymmetry. |
| **[optical_flow.md](./documentation/optical_flow.md)** | `pipeline/optical_flow.py` | Kroeger et al. DIS Optical Flow with constant Hessian, Variance of Variances jitter. |
| **[cfa_analysis.md](./documentation/cfa_analysis.md)** | `pipeline/cfa_analysis.py` | Bayer filter demosaicing grid residuals, $8\times 8$ local variance, facial ratio. |
| **[corneal_analysis.md](./documentation/corneal_analysis.md)** | `pipeline/corneal_analysis.py` | Corneal specular reflections in LAB, convex hull containment, structural similarity. |
| **[metadata_analysis.md](./documentation/metadata_analysis.md)** | `pipeline/metadata_analysis.py` | EXIF parsing, generative AI software keyword matching, FFmpeg container analysis. |
| **[xai_explainer.md](./documentation/xai_explainer.md)** | `pipeline/xai_explainer.py` | Grad-CAM, Guided Backprop, 1st-99th percentile HDR stretching, Inferno maps. |
| **[pdf_reporter.md](./documentation/pdf_reporter.md)** | `pipeline/pdf_reporter.py` | ForensicPDF class, Latin-1 text sanitization, auto-paginated 2-column evidence gallery. |

---

## 6. API Reference & Code Examples

### 6.1 Endpoints Specification

| Method | Endpoint | Authentication | Rate Limit | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| **`GET`** | `/` | None | None | Health check & service readiness probe |
| **`POST`**| `/api/analyze` | `x-api-key` | `5/minute` | Uploads media file, validates payload, begins background analysis |
| **`GET`** | `/api/status/{job_id}` | `x-api-key` | None | Polls analysis status, progress ($0-100\%$), logs, and result |
| **`GET`** | `/api/status/{job_id}/stream` | `x-api-key` | None | Server-Sent Events (SSE) stream yielding live telemetry |
| **`GET`** | `/api/reports/{job_id}/pdf` | None | None | Downloads the synthesized court-admissible PDF forensic report |

### 6.2 cURL Invocations

#### Ingest Media for Analysis:
```bash
curl -X POST "http://127.0.0.1:8000/api/analyze" \
     -H "x-api-key: deepforensics-dev-key" \
     -F "file=@suspect_video.mp4"
```
**Response (HTTP 200)**:
```json
{
  "job_id": "4b689a9f-e3c7-4d7a-8f5b-1c5cfa8e819b",
  "status": "processing"
}
```

#### Stream Real-Time Telemetry (SSE):
```bash
curl -N "http://127.0.0.1:8000/api/status/4b689a9f-e3c7-4d7a-8f5b-1c5cfa8e819b/stream" \
     -H "x-api-key: deepforensics-dev-key"
```

#### Poll Results via REST:
```bash
curl "http://127.0.0.1:8000/api/status/4b689a9f-e3c7-4d7a-8f5b-1c5cfa8e819b" \
     -H "x-api-key: deepforensics-dev-key"
```

#### Download Forensic PDF Report:
```bash
curl -O -J "http://127.0.0.1:8000/api/reports/4b689a9f-e3c7-4d7a-8f5b-1c5cfa8e819b/pdf"
```

### 6.3 Python SDK / Client Example
```python
import requests
import time

API_URL = "http://127.0.0.1:8000"
API_KEY = "deepforensics-dev-key"
HEADERS = {"x-api-key": API_KEY}

# 1. Upload Video
with open("suspect_video.mp4", "rb") as f:
    res = requests.post(f"{API_URL}/api/analyze", headers=HEADERS, files={"file": f})
job_id = res.json()["job_id"]
print(f"Analysis scheduled. Case ID: {job_id}")

# 2. Poll until completed
while True:
    status_res = requests.get(f"{API_URL}/api/status/{job_id}", headers=HEADERS).json()
    progress = status_res.get("progress", 0)
    status = status_res.get("status")
    print(f"Progress: {progress}% | Status: {status}")
    
    if status == "completed":
        result = status_res["result"]
        print("\n--- FORENSIC AUDIT COMPLETE ---")
        print(f"Final Verdict: {result['verdict']}")
        print(f"Ensemble Fake Probability: {result['overall_score'] * 100:.2f}%")
        print(f"Top Explanatory Factors: {result['shap_top_features']}")
        print(f"PDF Report URL: {API_URL}{result['report_pdf_url']}")
        break
    elif status == "failed":
        print(f"Analysis failed: {status_res.get('error')}")
        break
    time.sleep(2)
```

---

## 7. Installation, Setup & Model Weights

### 7.1 System Prerequisites
* **FFmpeg**: Must be installed and accessible in your system PATH (`ffmpeg -version`).
* **Python**: Recommended version `3.10` or `3.11`.
* **CUDA** (Optional): CUDA 11.8+ or 12.1+ supported for hardware-accelerated PyTorch inference.

### 7.2 Installation Steps
```bash
# 1. Navigate to backend directory
cd backend

# 2. Initialize virtual environment
python -m venv venv

# On Windows:
.\venv\Scripts\Activate.ps1

# On Linux/macOS:
source venv/bin/activate

# 3. Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 7.3 Model Weights Directory (`backend/weights/`)
Place the required pre-trained model weights into `backend/weights/`:
* `improved_finetuned_model_v2.pth` (or `improved_finetuned_model.pth`): Fine-tuned EfficientNet-B4 + CBAM weights (**96.80% multi-domain validation accuracy** across FaceForensics++ C23, Celeb-DF v2, 140k Faces, and DFDC). (Falls back to ImageNet timm if omitted).
* `ensemble_mlp.pth`: Weights for the PyTorch Tabular ResNet Meta-Classifier with Self-Attention gating (110 KB).
* `ensemble_mlp_xgb.json`: Companion XGBoost gradient-boosted decision tree model (309 KB).
* `voice_spoofing.pth`: Pretrained weights for `LightweightAudioAntiSpoof` 2D-CNN (171 KB).
* `syncnet_v2.model`: Official Wav2Lip SyncNet dual-stream 3D-CNN audio-visual weights (54.6 MB).
* `face_detection_yunet_2023mar.onnx`: High-speed YuNet OpenCV DNN face detector (233 KB).
* `face_landmarker.task`: MediaPipe 468 3D landmark mesh model (3.8 MB).

> [!NOTE]
> To retrain the Meta-Classifier with calibrated focal loss, run `python backend/scripts/train_ensemble_mlp.py`. Visual training diagnostics are saved to `backend/benchmark_artifacts/v2/ensemble/ensemble_training_report.png`.

### 7.4 Running the Local Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The server will bind to `http://127.0.0.1:8000`. Interactive OpenAPI documentation will be accessible at `http://127.0.0.1:8000/docs`.

---

## 8. Environment Variables

| Variable | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| **`API_KEY`** | `string` | `"deepforensics-dev-key"` | Master API key required in the `x-api-key` header. |
| **`ALLOWED_ORIGINS`** | `string` | `"*"` | Comma-separated list of allowed origins for CORS. |
| **`PORT`** | `integer` | `8000` | Target port for Uvicorn server execution. |

---

## 9. Security, Operational Limits & Safeguards

1. **Strict 100 MB Payload Ceiling**: Streaming requests exceeding $100 \times 1024 \times 1024\text{ bytes}$ are terminated immediately with `HTTP 413 Payload Too Large`.
2. **Post-Stream MIME Validation**: Analyzes binary magic bytes using `python-magic` *after* complete disk streaming to prevent Uvicorn TCP reset (`RST`) connection drops.
3. **60-Second Video Clamping**: Clips beyond $60\text{ seconds}$ are automatically clamped (`MAX_DURATION_SEC = 60`) to protect against compute exhaustion denial-of-service.
4. **Sliding-Window Batch Inference**: Runs frame inferences in batches of 32 (`BATCH_SIZE = 32`) coupled with active garbage collection (`gc.collect()`) to guarantee zero GPU VRAM Out-Of-Memory exceptions.
5. **SlowAPI Rate Limiting**: Ingestion is capped at **5 requests per minute per IP** to safeguard parallel CPU cores.
6. **Thread-Safe Headless Graphics**: All Matplotlib visualizations enforce `matplotlib.use('Agg')` and `FigureCanvasAgg` to prevent GUI thread deadlocks on Windows and Linux headless servers.
