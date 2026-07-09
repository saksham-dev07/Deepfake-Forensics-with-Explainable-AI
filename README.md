---
title: Deepfake Forensics API
emoji: 🚀
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---
# Deepfake Forensics & Explainable AI (XAI) Engine

<div align="center">
  <p><strong>An Enterprise-Grade, Multi-Modal Ensemble System for Detecting AI-Generated Media, Digital Manipulation, and Deepfakes.</strong></p>
  <p>
    <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10+-blue.svg?logo=python&logoColor=white" alt="Python Version"></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-Modern_API-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI"></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-Vite_Frontend-61DAFB.svg?logo=react&logoColor=black" alt="React"></a>
    <a href="https://pytorch.org/"><img src="https://img.shields.io/badge/PyTorch-Deep_Learning-EE4C2C.svg?logo=pytorch&logoColor=white" alt="PyTorch"></a>
    <a href="https://opencv.org/"><img src="https://img.shields.io/badge/OpenCV-Computer_Vision-5C3EE8.svg?logo=opencv&logoColor=white" alt="OpenCV"></a>
    <a href="https://www.framer.com/motion/"><img src="https://img.shields.io/badge/Framer_Motion-UI_Animations-0055FF.svg?logo=framer&logoColor=white" alt="Framer Motion"></a>
  </p>
</div>

---

## Executive Summary

As generative AI models (GANs, Diffusion Models, and sophisticated deepfake pipelines like Wav2Lip and Roop) approach total photorealism, human visual inspection is no longer a mathematically reliable metric for media authenticity. 

The **Deepfake Forensics Platform** operates as a state-of-the-art digital forensics laboratory. Rather than relying on a monolithic "black-box" classifier, the system implements a **Multi-Modal Ensemble Architecture**. By dissecting media across biological, physical, frequency, and spectral dimensions in real-time, it achieves highly robust detection against out-of-distribution adversarial examples. Furthermore, it integrates **Explainable AI (XAI)** to generate court-grade PDF reports that mathematically justify its verdicts with interpretable visual evidence, heatmaps, and signal plots.

---

## Datasets & Model Training Methodology

This platform relies on a combination of foundational academic weights and custom-trained models tuned specifically for robust deepfake detection. 

### 1. Spatial Image Forensics (EfficientNet-B4)
* **Datasets Utilized:** Deepfake Detection Challenge (DFDC), FaceForensics++ (FF++), Celeb-DF, and StyleGAN.
* **Training Methodology:** The core frame-by-frame visual detector utilizes an EfficientNet-B4 backbone. Instead of a simple binary classification approach, the model was fine-tuned using **Contrastive Learning**. By employing a Triplet Loss function, the network was forced to map authentic faces and GAN-generated faces into widely separated clusters in the latent embedding space. It was then capped with a binary cross-entropy classifier. The final convolutional layers (`_conv_head`) are preserved specifically to generate bounding-box localized Grad-CAM heatmaps for XAI tracking.
* **Performance:** Achieved a peak Validation Accuracy of **99.37%** (ROC-AUC 0.998) on a heavily imbalanced dataset of 53,000+ extracted frames.

### 2. Acoustic Anti-Spoofing (Voice Liveness 2D-CNN)
* **Dataset Utilized:** ASVspoof 2019 (Automatic Speaker Verification Spoofing and Countermeasures Challenge) Logical Access (LA) database.
* **Training Methodology:** The `voice_spoofing.pth` model was trained from scratch. The ASVspoof audio tracks were converted into 128-channel Mel-Frequency Spectrograms, effectively treating audio spoofing as an image classification problem. A lightweight PyTorch 2D-CNN was trained to detect the invisible high-frequency spectral rolloffs and vocoder artifacts left behind by TTS engines like ElevenLabs and VITS.

### 3. Native Audio-Visual SyncNet
* **Datasets Utilized:** LRS2 (Lip Reading Sentences 2) and VoxCeleb2.
* **Training Methodology:** This module imports the heavy `syncnet_v2.model` weights originally trained for the Wav2Lip architecture. The model employs a dual-stream 3D-CNN. During training, millions of 5-frame video mouth crops and corresponding 0.2-second audio MFCCs were fed into the network. The network was optimized using contrastive loss to minimize the L2 distance (LSE-D) for synchronized audio-visual pairs, and maximize the distance for artificially shifted, out-of-sync pairs.

### 4. Meta-Classifier Ensemble MLP
* **Dataset Utilized:** A procedurally generated synthetic dataset of 500,000 multi-dimensional anomaly scores.
* **Training Methodology:** Because real-world deepfakes vary wildly (e.g., an authentic video with cloned audio, or a synthesized face with authentic audio), a 3-layer Multi-Layer Perceptron (MLP) was trained to aggregate the 15 forensic dimensions. It was trained using **Soft Labels** (0.15 for Real, 0.85 for Fake) using Binary Cross-Entropy Loss to prevent overconfidence. The synthetic dataset injects advanced probabilistic rules, teaching the Meta-Classifier to flag a video if biological sensors (like rPPG or Geometry) spike, even if the primary Neural Network is successfully fooled by a highly realistic GAN.

---

## Recent Architectural & ML Upgrades

- **Security & Integrity:** Integrated `python-magic` for true binary MIME-type validation to prevent malicious payloads, alongside intelligent **Scene-Cut Detection** via `PySceneDetect` to extract frames across all camera angles.
- **True SHAP Explanations:** The XAI engine utilizes `shap.KernelExplainer` to compute exact marginal contributions from the Meta-Classifier.
- **Batched Inference & Lazy Loading:** Deep learning models are lazy-loaded to conserve idle VRAM, and processing uses chunked batching (sliding window) to prevent GPU OOM errors on large video files.
- **Optimized Face Tracking:** Replaced frame-by-frame Mediapipe face detection with an optimized OpenCV KCF/CSRT tracker, vastly improving pre-processing speed.
- **Real-Time Telemetry:** The FastAPI backend streams progress updates via Server-Sent Events (SSE) instead of traditional HTTP polling.
- **Aesthetic Overhaul (Glassmorphism 2.0):** The React dashboard features a breathtaking "Deep Slate" aesthetic with floating pills, professional typography (`Outfit` and `JetBrains Mono`), and advanced CSS micro-animations.

---

## 15-Dimensional Detection Architecture

The platform executes a massive parallel processing pipeline, routing visual and auditory streams through rigorous forensic methodologies that feed into the final Meta-Classifier Ensemble.

### 1. Neural Network Attention (EfficientNet-B4 + CBAM + XAI)
* **Convolutional Block Attention Module (CBAM):** Integrates custom spatial and channel attention layers into the EfficientNet backbone to aggressively isolate deepfake features.
* **Grad-CAM Heatmaps:** Reverse-engineers the network's spatial attention to generate heatmaps, isolating the exact pixels (e.g., blending boundaries, unnatural eye-reflections) that triggered the synthetic classification.
* **SHAP Feature Importance:** Applies a heuristic-simulated game-theoretic approach to rank which specific forensic dimensions mathematically contributed most to the anomaly variance.

### 2. Spectral & Frequency Analysis
Generative AI inherently struggles to perfectly reconstruct the high-frequency macroscopic details inherent to physical camera sensors.
* **FFT & 2D DCT Spectrum:** Maps two-dimensional frequency coefficients to detect synthetic frequency-domain smoothing.
* **PCA (Principal Component Analysis):** Extracts the 3rd Principal Component (PC3) to reveal hidden periodic GAN artifacts.
* **Switching Noise (SWN):** Isolates high-frequency noise by finding zero-crossings in mathematical gradients, illuminating deepfake splicing seams.

### 3. Biological Face Geometry & Temporal Consistency
Maps 468 3D facial landmarks utilizing **MediaPipe Face Mesh** to evaluate biological impossibility.
* **Temporal Geometric Jitter:** Detects micro-stutters and physically impossible inter-frame vertex shifts, which are common in temporal GAN generation.
* **Proportional Asymmetry:** Analyzes structural interocular proportions against the facial Golden Ratio using normalized Euclidian distance equations.

### 4. Eye Movement & Dynamic Blink Analysis
* **EAR (Eye Aspect Ratio):** Computes EAR continuously over time to detect unnaturally low blink rates or extreme glitching.
* **Dynamic Median Thresholding:** Unlike hard-coded systems, this pipeline uses dynamic median-based thresholding (80% of resting state) to calculate accurate blink sequences irrespective of diverse human facial structures or camera angles.
* **Gaze Asymmetry:** Detects "lazy eye" artifacts characteristic of poorly rendered generative faces.

### 5. Physical Optics & Sensor Artifacts (CFA & Corneal)
Generative models struggle to accurately simulate physical optics and camera sensor hardware properties.
* **Corneal Specular Highlights:** Maps the reflection of light sources on the eyes. Computes Intersection-over-Union (IoU) and Structural Similarity (SSIM) between the left and right eye reflections. AI models frequently render impossible, mismatched 3D reflections.
* **Color Filter Array (CFA) Artifacts:** Analyzes the Bayer filter interpolation. Genuine digital photos possess distinct periodic demosaicing patterns that AI generators overwrite or fail to produce.

### 6. Native 3D-CNN Audio-Visual Desynchronization (SyncNet)
Armed with the official architecture from **Wav2Lip/SyncNet**, the system catches synthetic "lip-sync" deepfakes by extracting raw audio embeddings and visual lip movements.
* **Deep Embedding L2 Distance:** Extracts 13 MFCC features from the audio and isolated `224x224` visual mouth crops across 5 consecutive frames. Both are passed through independent 3D-CNN encoders.
* **LSE-D & LSE-C:** Mathematically computes the absolute Lip Sync Error Distance (LSE-D). Authentic videos score below `8.0`, while Lip-Sync AI fails to maintain this perfect synchronization, causing the distance to radically diverge.

### 7. Acoustic Anti-Spoofing (Voice Liveness)
Analyzes an audio track for synthetic artifacts common in AI voice clones (e.g. ElevenLabs, VITS) by evaluating Mel-Frequency Spectrograms.
* **Pre-Processing Pipelines:** Handles real-world audio corruption via *Cubic Spline De-Clipping* and *Spectral Gating Denoising* prior to inference.
* **Spectral Rolloff & High-Frequency Ratios:** Measures the unnatural high-frequency energy decay often left by generative vocoders.

### 8. Physiological Forensics (rPPG)
Deepfakes frequently fail to synthesize the microscopic, heartbeat-induced color changes in human skin.
* **Remote Photoplethysmography (rPPG):** Extracts subtle volumetric blood flow signals from facial regions of interest using spatial pooling. Applies Fast Fourier Transforms (FFT) to detect if a physiological pulse exists. Generates an anomaly score based on the physiological impossibility of the detected BPM.

### 9. Error Level Analysis (ELA)
Detects heterogeneous compression signatures. When a fake face is spliced onto a real body, the manipulated region possesses a different JPEG compression quality than the original background. Re-saves the image at 95% quality and calculates the absolute pixel-wise difference.

### 10. Temporal Optical Flow & Jitter Analysis
* **Farneback Dense Optical Flow:** Analyzes temporal consistency on 320x240 resized spatial frames. Computes the variance of motion vectors over a 60-frame buffer to detect micro-jittering, mask boundaries, and blocky temporal flickering common in deepfakes.

### 11. Sensor Noise (PRNU/SRM)
* **Spatial Rich Model (SRM):** Applies high-pass linear filtering to strip away primary image content, isolating the raw noise map. AI-generated face swaps violently disrupt this continuous noise matrix.

### 12. Chrominance Color Space Mapping
Identifies mathematical anomalies in the **YCbCr** (Chrominance separation) and **LAB** (a* channel) spaces, as GANs frequently produce statistical aberrations in human-vision color spaces that are invisible in RGB.

### 13. Cryptographic Metadata Integrity (EXIF)
Analyzes file headers to detect stripped EXIF data or specific cryptographic signatures left behind by generative manipulation software.

---

## Court-Ready PDF Reporting
All automated analyses are compiled into a comprehensive, multi-page PDF report. The document is strictly formatted to provide an interpretable chain-of-evidence:
1. **Executive Verdict:** The overall ensemble confidence score and binary classification.
2. **Detailed Module Breakdown:** Isolated confidence metrics across all analytical engines.
3. **Visual Evidence Gallery:** Embedded high-resolution heatmaps, gradient maps, and XAI overlays.
4. **Metadata Integrity:** Secure UUID assignment and ISO-8601 timestamping.

*(Disclaimer: Reports are generated by automated diagnostic algorithms and should be independently peer-reviewed by a certified forensic analyst prior to legal admission.)*

---

## Getting Started

### Prerequisites
* Python 3.10+
* Node.js (v18+)
* `ffmpeg` installed and globally accessible via the system PATH.

### 1. Initialize the Backend (FastAPI / PyTorch)
The backend is architected for maximum throughput, utilizing a concurrent `ThreadPoolExecutor` to execute heavy OpenCV computations in parallel, bypassing the Python Global Interpreter Lock (GIL).

It is **highly recommended** to use a Virtual Environment to avoid cluttering your global system drive with PyTorch and OpenCV binaries.

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```
*The REST API will initialize and bind to `http://127.0.0.1:8000`*

### 2. Initialize the Frontend Dashboard (React / Vite)
The user interface is a responsive, modern React application styled with custom CSS, featuring dark-mode glassmorphism and subtle micro-animations.

```bash
cd frontend
npm install
npm run dev
```
*The analytical dashboard will be accessible at `http://localhost:5173`*

---

## Production Deployment Architecture

This platform is architected for a decoupled, highly-scalable production deployment:

### 1. Frontend (Vercel)
The React/Vite dashboard is designed to be hosted on **Vercel** for global Edge CDN delivery. 
- During deployment on Vercel, simply configure the `VITE_API_URL` environment variable to point to your Hugging Face Space URL.
- The Vercel instance serves only static assets and handles no heavy computations.

### 2. AI Backend Engine (Hugging Face Spaces)
The FastAPI engine and PyTorch models are deployed as a Docker container on **Hugging Face Spaces**.
- The root `Dockerfile` natively installs CPU-only PyTorch and OpenCV.
- Hugging Face manages the heavy deep-learning inference. 
- Ensure your Space is configured to expose Port `7860`. The backend handles CORS internally to accept requests from your Vercel frontend.

---

## Configuration & Constraints

Before deploying the platform, be aware of the following system constraints and configurations:

* **File Upload Limits:** For memory protection during tensor allocations, the API enforces a strict **100 MB** upload limit. Video analysis is capped at the first **60 seconds** of playback. Supported extensions include `mp4`, `avi`, `mov`, `mkv`, `webm`, `png`, `jpg`, and `jpeg`.
* **API Security:** The FastAPI backend is secured via an API Key. By default, it expects the `x-api-key` header to equal `deepforensics-dev-key`. You can override this by setting the `API_KEY` environment variable in the backend, and configuring a `.env` file in the frontend with `VITE_API_KEY=your-key`.
* **Required Model Weights:** Ensure the following pre-trained models are downloaded into the `backend/weights/` directory:
    * `improved_finetuned_model.pth` (EfficientNet Backbone)
    * `ensemble_mlp.pth` (Meta-Classifier)
    * `voice_spoofing.pth` (Audio Anti-Spoofing CNN)
    * `syncnet_v2.model` (Wav2Lip Audio-Visual Sync)

---

## System Architecture

```mermaid
flowchart TD
    %% Styling Definitions
    classDef frontend fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef backend fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef processor fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef module fill:#1e293b,stroke:#475569,stroke-width:1px,color:#f8fafc,rx:4px,ry:4px;
    classDef meta fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff,rx:8px,ry:8px;
    classDef output fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff,rx:8px,ry:8px;

    %% Client & API Layer
    UI[React/Vite Glassmorphic Dashboard]:::frontend -->|Multipart Media Upload| API[FastAPI High-Performance Gateway]:::backend
    API --> VP[Video Processor: Frame Extraction & Audio Split]:::processor
    VP --> TP[Concurrent Thread Pool Executor]:::processor
    
    %% The 15-Dimensional Forensic Engines
    subgraph Core_Neural_Analysis["Core Neural Analysis"]
        NN[EfficientNet-B4 + GradCAM XAI]:::module
    end
    
    subgraph Biological_Physiological["Biological & Physiological"]
        GEO[Face Geometry & Asymmetry]:::module
        EYE[Dynamic Blink & Gaze Analysis]:::module
        PHYS[rPPG Volumetric Heartbeat]:::module
    end
    
    subgraph Digital_Physical_Optics["Physical Optics & Sensors"]
        NOISE[Sensor Noise: PRNU & SRM]:::module
        CFA[Bayer CFA Interpolation]:::module
        CORNEAL[Corneal Specular Highlights]:::module
        LIGHT[Lighting Consistency]:::module
        COLOR[Chrominance YCbCr/LAB Mapping]:::module
    end
    
    subgraph Temporal_Artifacts["Temporal & Compression"]
        ELA[Error Level Analysis]:::module
        FLOW[Dense Optical Flow & Jitter]:::module
    end
    
    subgraph Audio_Forensics["Acoustic Forensics"]
        SYNC[Native 3D-CNN A/V SyncNet]:::module
        VOICE[Voice Liveness Anti-Spoofing]:::module
    end

    subgraph Spectral_Integrity["Spectral & Integrity"]
        FA[Frequency: 2D-DCT & FFT]:::module
        META[Cryptographic Metadata & EXIF]:::module
    end

    %% Routing to modules
    TP --> NN & GEO & EYE & PHYS & NOISE & CFA & CORNEAL & LIGHT & COLOR & ELA & FLOW & SYNC & VOICE & FA & META

    %% Meta-Classifier Aggregation
    NN & GEO & EYE & PHYS & NOISE & CFA & CORNEAL & LIGHT & COLOR & ELA & FLOW & SYNC & VOICE & FA & META --> AGG

    AGG{Meta-Classifier Ensemble MLP}:::meta
    
    %% Outputs
    AGG -->|Inference Complete| PDF[Court-Ready PDF Report Generator]:::output
    AGG -->|JSON Response| JSON[REST API JSON Payload]:::output
    
    JSON -->|State Update| UI
    PDF -->|Download| UI
```

---

## Codebase Architecture (File Map)

The following diagram maps the high-level logical architecture directly to the underlying physical files and Python/React modules powering the platform:

```mermaid
flowchart TD

subgraph group_frontend["Frontend (React)"]
  node_ui["UI<br/>React app<br/>[App.jsx]"]
  node_dashboard["Report view<br/>React component<br/>[ReportDashboard.jsx]"]
  node_models_ui["Models view<br/>React component<br/>[ModelsOverview.jsx]"]
end

subgraph group_backend["Backend (FastAPI)"]
  node_api["API<br/>[main.py]"]
  node_processor["Video prep<br/>media ingestion<br/>[video_processor.py]"]
  node_pipeline["Pipeline<br/>forensic workflow<br/>[__init__.py]"]
  
  subgraph group_visual["Visual & Artifact Engines"]
      node_models["Core NN<br/>EfficientNet-B4<br/>[models.py]"]
      node_face["Face signals<br/>visual analysis<br/>[face_geometry.py]"]
      node_eye["Eye dynamics<br/>blink analysis<br/>[eye_analysis.py]"]
      node_image_artifacts["Image cues<br/>artifact analysis<br/>[lighting_analysis.py]"]
      node_motion["Motion cues<br/>temporal analysis<br/>[optical_flow.py]"]
      node_ela["Compression analysis<br/>error level<br/>[ela_analysis.py]"]
      node_noise["Sensor noise<br/>rich model<br/>[noise_analysis.py]"]
      node_color["Color space<br/>chrominance<br/>[color_analysis.py]"]
      node_rppg["Physiological cues<br/>heartbeat<br/>[rppg_analysis.py]"]
      node_cfa["Optics analysis<br/>bayer filter<br/>[cfa_analysis.py]"]
      node_corneal["Optics analysis<br/>corneal reflections<br/>[corneal_analysis.py]"]
  end
  
  subgraph group_audio["Audio & Spectral Engines"]
      node_audio["Audio cues<br/>audio analysis<br/>[audio_sync.py]"]
      node_voice_spoof["Acoustic spoofing<br/>voice analysis<br/>[voice_spoofing.py]"]
      node_freq["Spectral analysis<br/>frequency domain<br/>[frequency_analysis.py]"]
      node_metadata["Metadata<br/>file analysis<br/>[metadata_analysis.py]"]
  end
  
  subgraph group_fusion["Fusion & Reporting"]
      node_ensemble["Fusion<br/>ensemble classifier<br/>[ensemble_classifier.py]"]
      node_xai["Explainability<br/>XAI output<br/>[xai_explainer.py]"]
      node_report["PDF report<br/>report generator<br/>[pdf_reporter.py]"]
  end
  
  node_syncnet["SyncNet<br/>AV model<br/>[SyncNetModel.py]"]
  node_voice_model["Voice model<br/>spoof model<br/>[voice_model.py]"]
end

subgraph group_assets["Model Assets"]
  node_weights[("Weights<br/>model assets")]
end

%% Client to API
node_ui -->|"uploads"| node_api
node_dashboard -->|"fetches results"| node_api
node_models_ui -->|"views signals"| node_api
node_api -->|"ingests"| node_processor
node_processor -->|"hands off"| node_pipeline

%% Pipeline Routing
node_pipeline -->|"routes"| node_models & node_face & node_eye & node_image_artifacts & node_motion & node_audio & node_metadata & node_freq & node_ela & node_noise & node_color & node_rppg & node_voice_spoof & node_cfa & node_corneal

%% Scoring to Ensemble
node_models & node_face & node_eye & node_image_artifacts & node_motion & node_audio & node_metadata & node_freq & node_ela & node_noise & node_color & node_rppg & node_voice_spoof & node_cfa & node_corneal -->|"scores"| node_ensemble

%% Model Dependencies
node_syncnet -.->|"powers"| node_audio
node_voice_model -.->|"powers"| node_voice_spoof

node_weights -.->|"loads"| node_syncnet & node_voice_model & node_ensemble & node_models

%% Explainability & Output
node_pipeline -->|"explains"| node_xai
node_models -.->|"exposes targets"| node_xai
node_ensemble -->|"exposes"| node_xai
node_pipeline -->|"packages"| node_report
node_api -->|"returns"| node_report

%% Clickable Links
click node_ui "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/frontend/src/App.jsx"
click node_dashboard "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/frontend/src/components/ReportDashboard.jsx"
click node_models_ui "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/frontend/src/components/ModelsOverview.jsx"
click node_api "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/main.py"
click node_processor "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/video_processor.py"
click node_pipeline "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/__init__.py"
click node_models "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/models.py"
click node_face "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/face_geometry.py"
click node_eye "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/eye_analysis.py"
click node_image_artifacts "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/lighting_analysis.py"
click node_motion "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/optical_flow.py"
click node_audio "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/audio_sync.py"
click node_metadata "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/metadata_analysis.py"
click node_freq "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/frequency_analysis.py"
click node_ela "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/ela_analysis.py"
click node_noise "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/noise_analysis.py"
click node_color "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/color_analysis.py"
click node_rppg "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/rppg_analysis.py"
click node_voice_spoof "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/voice_spoofing.py"
click node_cfa "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/cfa_analysis.py"
click node_corneal "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/corneal_analysis.py"
click node_ensemble "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/ensemble_classifier.py"
click node_xai "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/xai_explainer.py"
click node_report "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/pdf_reporter.py"
click node_syncnet "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/SyncNetModel.py"
click node_voice_model "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/blob/main/backend/pipeline/voice_model.py"
click node_weights "https://github.com/saksham-dev07/deepfake-forensics-with-explainable-ai/tree/main/backend/weights"

%% Styling
classDef toneNeutral fill:#f8fafc,stroke:#334155,stroke-width:1.5px,color:#0f172a
classDef toneBlue fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#172554
classDef toneAmber fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f
classDef toneRose fill:#ffe4e6,stroke:#e11d48,stroke-width:1.5px,color:#881337
class node_ui,node_dashboard,node_models_ui toneBlue
class node_api,node_processor,node_pipeline,node_face,node_eye,node_image_artifacts,node_motion,node_audio,node_metadata,node_freq,node_ela,node_noise,node_color,node_rppg,node_voice_spoof,node_cfa,node_corneal,node_models,node_ensemble,node_xai,node_report,node_syncnet,node_voice_model toneAmber
class node_weights toneRose
```

---

## Academic References & Citations
* **EfficientNet:** Tan, M., & Le, Q. (2019). *EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks*. ICML. ([Link](https://arxiv.org/abs/1905.11946))
* **Grad-CAM:** Selvaraju, R. R., et al. (2017). *Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization*. ICCV. ([Link](https://arxiv.org/abs/1610.02391))
* **SyncNet / Lip-Sync Analysis:** Chung, J. S., & Zisserman, A. (2016). *Out of time: automated lip sync in the wild*. ACCV. ([Link](https://arxiv.org/abs/1607.05046))
* **Sensor Noise (SRM):** Fridrich, J., & Kodovsky, J. (2012). *Rich Models for Steganalysis of Digital Images*. IEEE Transactions on Information Forensics and Security. ([Link](https://ieeexplore.ieee.org/document/6205615))
* **DFDC:** Dolhansky, B., et al. (2020). *The Deepfake Detection Challenge (DFDC) Dataset*. ([Link](https://arxiv.org/abs/2006.07397))
* **Face Mesh:** Grishchenko, I., et al. (2020). *Attention Mesh: High-fidelity Face Mesh Prediction in Real-time*. CVPR Workshop. ([Link](https://arxiv.org/abs/2006.10214))
* **ELA:** Krawetz, N. (2007). *A Picture's Worth: Digital Image Analysis and Forensics*. Black Hat. ([Link](https://www.hackerfactor.com/papers/bh-usa-07-krawetz-wp.pdf))

### Academic & Technical Deepfake Forensics References
* **Wav2Lip Audio-Visual Sync:** Prajwal, K. R., et al. (2020). *A Lip Sync Expert Is All You Need for Speech to Lip Generation In the Wild*. ACM Multimedia. ([Link](https://arxiv.org/abs/2008.10010))
* **Frequency Domain Discrepancies:** Dzanic, T., et al. (2020). *Fourier Spectrum Discrepancies in Deep Network Generated Images*. NeurIPS. ([Link](https://arxiv.org/abs/1911.06465))
* **CNN Spatial Artifacts:** Wang, S. Y., et al. (2020). *CNN-generated images are surprisingly easy to spot... for now*. CVPR. ([Link](https://arxiv.org/abs/1912.08195))
* **Face Warping Artifacts:** Li, Y., & Lyu, S. (2018). *Exposing DeepFake Videos By Detecting Face Warping Artifacts*. IEEE CVPRW. ([Link](https://arxiv.org/abs/1811.00656))
* **Switching Noise Filter (SWN):** Ranjbaran, M., et al. (2015). *A New Method for Impulse Noise Detection in Digital Images*. ([Link](https://ieeexplore.ieee.org/document/7306019))

---

## License & Ethical Use
This software is strictly provided for research, digital forensics, and investigative journalism purposes. Any malicious use, or utilizing these analytical pipelines to reverse-engineer and train adversary deepfake generators, is fundamentally prohibited.

**Deepfake Forensics Platform © 2026**

