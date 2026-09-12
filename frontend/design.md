# DeepForensics Suite — UI/UX Design System Specification (`design.md`)

> **Design Philosophy**: *Institutional Precision, Evidentiary Rigor, and Zero AI-Slop.*  
> Designed for forensic analysts, intelligence investigators, legal verifiers, and security researchers. Replaces generic SaaS tropes (excessive glowing neon gradients, giant empty cards, floating glassmorphic fluff) with a high-density, authoritative, and functional investigative console inspired by Palantir Foundry, Linear, and Bloomberg Terminal.

---

## 1. Visual Identity & Design Pillars

### 1.1 The Anti-“AI Slop” Manifesto
1. **Density over Void**: Forensics requires data juxtaposition, not 400px of empty frosted glass. Data density must be purposeful, legible, and compact.
2. **Deterministic Color Semantics**: Colors are strictly reserved for state and evidentiary signals. No decorative purple-to-pink gradient fills on backgrounds or borders.
3. **Monospaced Verification**: Hashes, timestamps, tensor dimensions, sensor values, and p-values must always be typeset in high-contrast tabular monospace typography.
4. **Interactive Evidence**: Never show static screenshot mockups where interactive scrubbers, side-by-side curtain comparisons, and zoomable heatmaps can exist.
5. **Auditable Hierarchy**: The interface must read like a legal forensic dossier:
   `Executive Verdict` $\rightarrow$ `Evidentiary Confidence` $\rightarrow$ `Multimodal Sensor Breakdown` $\rightarrow$ `Mathematical Attribution (XAI)` $\rightarrow$ `Raw Frame Telemetry`.

---

## 2. Color System & Theming

### 2.1 Color Palette (Dark Forensic Console)
The primary UI palette is built on deep carbon, slate, and precision borders with calibrated luminance steps.

```css
:root {
  /* Surface Layers (Matte Slate-Carbon, Non-Blurry) */
  --bg-app:             #0B0E14; /* Deepest baseline background */
  --bg-surface-1:       #111622; /* Primary panel background */
  --bg-surface-2:       #171F30; /* Elevated card / active state */
  --bg-surface-3:       #1E293F; /* Hover state / dropdown surface */
  --bg-inset:           #070A0F; /* Terminal boxes & media preview wells */

  /* Structural Dividers & Hairline Borders */
  --border-subtle:      #1F293D; /* Base container outline */
  --border-default:     #2D3A54; /* Card borders & dividers */
  --border-active:      #475569; /* Focused / active element borders */

  /* Typography Scales */
  --text-primary:       #F8FAFC; /* 100% contrast - Headings, verdicts, active values */
  --text-secondary:     #94A3B8; /* Body text, feature descriptions, table headers */
  --text-muted:         #64748B; /* Captions, timestamps, disabled labels */
  --text-code:          #38BDF8; /* Monospace hashes, tensor shapes, coordinates */

  /* Evidentiary State Colors (Strict Semantic Usage) */
  --forensic-deepfake:  #F43F5E; /* Rose 500: Deepfake / High Synthetic Tampering */
  --forensic-deepfake-bg:#3A141E;/* Subdued crimson pill background */
  --forensic-altered:   #F59E0B; /* Amber 500: AI-Altered / Benign Filter / Face Retouch */
  --forensic-altered-bg: #352309;/* Subdued amber pill background */
  --forensic-real:      #10B981; /* Emerald 500: Authentic Human / Hardware Pass */
  --forensic-real-bg:   #062A1E;/* Subdued emerald pill background */
  --forensic-neutral:   #3B82F6; /* Blue 500: Telemetry, active selection, neutral 0.5 */
  --forensic-neutral-bg:#0F2444;/* Subdued cobalt pill background */

  /* Typography Families */
  --font-sans:          'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono:          'JetBrains Mono', 'Geist Mono', 'SF Mono', Consolas, monospace;
  --font-editorial:     'Newsreader', 'Times New Roman', serif; /* For Court-Admissible seals */
}
```

---

## 3. Typography Hierarchy

| Level | Font Family | Size / Line-Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Header** | Sans | `28px` / `34px` | 800 (Bold) | `-0.03em` | Primary workspace title, Case ID |
| **Section Header** | Sans | `18px` / `24px` | 700 (Bold) | `-0.02em` | Panel titles, modal headings |
| **Card Header** | Sans | `14px` / `20px` | 600 (Semibold) | `-0.01em` | Sensor names, tab headers |
| **Eyebrow / Badge**| Mono | `11px` / `14px` | 700 (Bold) | `+0.06em` | Step labels, status chips, uppercase |
| **Body Primary** | Sans | `13px` / `20px` | 400 (Regular) | `normal` | Forensic findings, explanations |
| **Body Monospace** | Mono | `12px` / `18px` | 500 (Medium) | `normal` | Metrics, sensor readings, formulas |
| **Micro Monospace**| Mono | `10px` / `14px` | 500 (Medium) | `+0.02em` | SHA-256 hashes, timestamps, frame # |

---

## 4. Application Layout & Screen States

The application is structured into four primary workflows:
1. **Investigation Intake (Upload & Triage)**
2. **Analysis Console (Live Execution Scrubber)**
3. **Forensic Dossier (Inspection Workspace)**
4. **Reference Center (Model Weights & Forensic Math)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [DeepForensics]   CASE #DF-2026-9481   [Analyze]  [Dossier]  [Models] [PDF]│  ← Global Header
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   WORKSPACE GRID                                                            │
│   ┌────────────────────────┬────────────────────────────────────────────┐   │
│   │                        │                                            │   │
│   │   PANE A: EVIDENCE     │   PANE B: MULTI-SENSOR SPECTRUM            │   │
│   │   INSPECTOR            │   [Spatial] [Frequency] [Bio] [Audio] [XAI]│   │
│   │                        ├────────────────────────────────────────────┤   │
│   │   - Video Player /     │                                            │   │
│   │     Frame Canvas       │   Curtain Comparison Slider / 2D FFT /     │   │
│   │   - Interactive BBox   │   CHROM Pulse Waves / Lip Sync Desync      │   │
│   │   - Frame Scrubber     │                                            │   │
│   │   - EXIF Metadata      │                                            │   │
│   │                        │                                            │   │
│   ├────────────────────────┴────────────────────────────────────────────┤   │
│   │   PANE C: META-CLASSIFIER ARBITRATION & SENSOR MATRIX               │   │
│   │   - 15-Sensor Gauge Matrix with Uncertainty Ranges (95% CI)         │   │
│   │   - Tri-Tier Decision Engine Output (Authentic vs Altered vs Fake)  │   │
│   │   - Neural Attention Attribution (SHAP / Feature Permutation)       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Breakdown & Specifications

### 5.1 Investigation Intake (`UploadZone`)
* **Visual Style**: Clean architectural dashed container with matte charcoal fill, no bouncing cartoon animations.
* **Metadata Detection Pre-Flight**:
  - Drops trigger instantaneous client-side extraction of:
    - **Container Format**: MP4 / AVI / MOV / PNG / JPG
    - **File Size & Byte Count**: Formatted with exact bytes in tooltip
    - **Resolution**: Width $\times$ Height
    - **Audio Stream**: Detected vs. Absent (displays `SILENT_TRACK` pill if audio is missing)
* **Action Buttons**: Direct file selector, sample dataset picker (Loads Celeb-DF or StyleGAN test case directly).

### 5.2 Live Analysis Console (`AnalysisTerminal`)
* **Layout**: Two-column non-scrolling workspace.
* **Left Column (11-Stage Deterministic Pipeline)**:
  - Each stage shows:
    - State indicator: `Pending` (dashed circle), `Executing` (cyan spinning ring), `Complete` (emerald check with completion timestamp).
    - Milestone percentage bar ($0\% \rightarrow 100\%$) with millisecond elapsed timer.
* **Right Column (System Hardware & Live Telemetry)**:
  - **4-Grid Hardware Telemetry**:
    - `Active Architecture`: `Ensemble (EfficientNet-B4 + SyncNet + Tabular ResNet)`
    - `VRAM / Memory`: `CUDA 12.1 (4.2 / 16.0 GB)` or `CPU Execution Mode`
    - `Inference Engine`: `PyTorch 2.6 JIT + TorchScript`
    - `Batch Throughput`: `32 Frames/sec`
  - **Live Terminal Window**:
    - Monospaced console with internal scroll (never touches browser window).
    - Color-coded log entries: `[OK]`, `[INFO]`, `[WAIT]`, `[FAIL]`.
  - **Abort Action**: Prominent `[Cancel Analysis]` button to cleanly abort workers.

---

### 5.3 Forensic Dossier (`ReportDashboard`)

#### A. Executive Verdict Header
A high-authority, court-admissible status banner:
* **Three Primary Verdict Archetypes**:
  1. `AUTHENTIC_HUMAN_CAPTURE` (Emerald `#10B981`): All 15 sensors nominal; camera PRNU and natural rPPG heart rate rhythm verified.
  2. `AI_ALTERED_RETOUCHED` (Amber `#F59E0B`): Face geometry or color filter array modified, but neural backbone score $<0.40$. Non-malicious generative filter (Gemini / Inpainting / Lightroom skin smooth).
  3. `MALICIOUS_DEEPFAKE_IMPERSONATION` (Rose `#F43F5E`): Multi-modal consensus exceeded; synthetic face swap, diffusion generation, or neural voice clone detected.
* **Confidence Rating**:
  - Calibrated Probability $P(\text{Fake})$ with Confidence Interval: e.g., $99.8\% \pm 0.4\%$.
  - Brier Calibration Index ($<0.015$).

#### B. Media Canvas with Curtain Comparison Slider
* Allows user to slide a split divider across the facial crop:
  - **Left Side**: Original Unprocessed RGB Frame.
  - **Right Side**: Forensic Overlay:
    - Mode 1: **Grad-CAM Attention Heatmap** (Jet / Turbo color map showing boundary seam activations).
    - Mode 2: **Error Level Analysis (ELA)** (Compression residual divergence).
    - Mode 3: **Bayer Color Filter Array (CFA)** (Interpolation variance).
    - Mode 4: **3D Facial Landmark Wireframe** (68-point topological mesh with jawline displacement vectors).

#### C. The 15-Sensor Forensic Spectrum Matrix
A compact, highly structured grid displaying all 15 detectors:

| Sensor ID | Dimension Name | Anomaly Score | Threshold | Evidentiary Status | Technical Forensic Metric |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `s_nn` | Visual Neural Backbone | `0.984` | `0.50` | `CRITICAL_FAIL` | EfficientNet-B4 + CBAM Softmax |
| `s_sync` | Audio-Visual Lip Sync | `0.921` | `0.55` | `DESYNC_DETECTED`| Wav2Lip 1024-D L2 Distance |
| `s_voice` | Synthetic Voice Clone | `0.840` | `0.50` | `VOCODER_ARTIFACT`| 128-Mel Depthwise CNN Spoof |
| `s_rppg` | Biological Blood Pulse | `0.789` | `0.45` | `NO_PULSE_SIGNAL` | CHROM Sub-surface Hemoglobin SNR |
| `s_fft` | Frequency 2D FFT/DCT | `0.812` | `0.50` | `GRID_ANOMALY` | Transposed Convolution Peak Ratio |
| `s_cfa` | Bayer Filter Demosaic | `0.650` | `0.25` | `INTERPOLATION_IRR`| $2\times 2$ CFA Green Residual Variance |
| `s_prnu` | Sensor Pattern Noise | `0.710` | `0.40` | `FINGERPRINT_MISS`| Wavelet Denoised Cross-Correlation |
| `s_flow` | DIS Optical Flow Field | `0.612` | `0.50` | `TEMPORAL_JITTER` | Inter-frame Velocity Gradient Discontinuity |
| `s_geom` | 3D Landmark Geometry | `0.540` | `0.45` | `WARPING_DETECTED`| Facial Asymmetry Euclidean Delta |
| `s_light`| Photometric 3D Harmonics| `0.480` | `0.50` | `NOMINAL` | 9-Dimensional Spherical Harmonic Divergence|
| `s_corn` | Corneal Reflection | `0.420` | `0.50` | `MATCHED` | Bilateral Specular Gaze Ray Intersection |
| `s_blink`| Neuromotor Blink | `0.380` | `0.50` | `ORGANIC` | EAR (Eye Aspect Ratio) Duration Distribution |
| `s_ela` | Error Level Analysis | `0.550` | `0.40` | `COMPRESSION_MIS` | Quality 95 JPEG Subtraction Residual |
| `s_color`| Chrominance Degradation| `0.320` | `0.50` | `NATURAL` | Cb-Cr Color Space Scatter Variance |
| `s_meta` | Container Hex Atom EXIF| `0.210` | `0.50` | `CLEAN` | Apple QuickTime FourCC / Camera Tags |

---

### 5.4 Model Weights & Architecture Lab (`ModelsOverview`)
* **Three Dedicated Engineering Sub-Workspaces**:
  1. **Visual Backbone**:
     - Compound scaled inverted bottleneck diagram (EfficientNet-B4 + CBAM).
     - Interactive Confusion Matrix & Precision-Recall curves on Celeb-DF v2 ($99.81\%$) and 140k Faces ($99.96\%$).
  2. **Meta-Classifier Ensemble Engine**:
     - Architecture specs: 8-Layer Tabular ResNet with 4-Head Multi-Head Self-Attention.
     - Live convergence charts: 25 Epochs ($100.00\%$ Accuracy, ROC-AUC $1.0000$).
     - Permutation Feature Sensitivity Bar Chart directly visualizing feature importance hierarchy.
     - Active weights download / copy buttons (`ensemble_mlp.pth`, `ensemble_mlp_xgb.json`).
  3. **Audio & Temporal Stream**:
     - Dual-Stream 3D-CNN SyncNetMFCC correlation.
     - Depthwise 2D-CNN Voice Anti-Spoofing on 128-Mel Spectrograms.
     - ASVspoof 2019 validation metrics.

---

## 6. Micro-Interactions & Motion Design

1. **Deterministic Motion Curves**:
   - Standard transitions use `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out, $200\text{ms}$ to $350\text{ms}$).
   - No bouncy elastic easing. All animations must feel like precision industrial instrumentation.
2. **Interactive Lightbox Inspection**:
   - Any forensic diagnostic plot, heatmap, or frequency spectrum clicks into an edge-to-edge high-resolution modal with pan & zoom capabilities ($100\%$ to $400\%$).
3. **Copy Actions**:
   - One-click copy for Model Checkpoint paths, SHA-256 hashes, and terminal commands, accompanied by a discreet, non-blocking toast badge in the bottom-right corner.

---

## 7. Responsive Breakpoint Rules

| Viewport Width | Layout Adaptations |
| :--- | :--- |
| **$\ge 1440\text{px}$** | Full Tri-Pane Console: Evidence Canvas (45%) + Spectrum Tabs (55%) over Meta Matrix (100%). |
| **$1024\text{px} - 1439\text{px}$** | Dual-Column Grid: Evidence Canvas stacked on top; Spectrum Tabs & Sensor Matrix side-by-side. |
| **$< 1024\text{px}$** | Single Column Linear Dossier: Sticky mini-verdict header with tabbed sensor drawers. |

---

## 8. Court-Admissible PDF Export Specification
The PDF Report generator (`pdf_reporter.py`) adheres directly to the visual design system:
* **Header Seal**: High-resolution vector forensic emblem with Case Hash, Timestamp, and Operator ID.
* **Executive Summary Box**: Large prominent verdict box with cryptographic authenticity score.
* **15-Sensor Table**: Full audit table with threshold justifications.
* **Visual Exhibits**: Embedded high-resolution crops of RGB Frame, Grad-CAM Heatmap, and FFT Azimuthal Spectrum.
* **Chain of Custody Section**: Signature line, tool version (`v2.5`), and SHA-256 integrity seal.
