# DeepForensics Dashboard (Frontend)

This is the high-performance **React 18 + Vite** client application for the **DeepForensics Multi-Modal Forensics Platform**. It provides an interactive, court-grade evidentiary console for forensic analysts, investigators, and researchers to inspect media authenticity across **15 distinct forensic dimensions**, view live Server-Sent Events (SSE) telemetry, and examine Explainable AI (XAI) attributions.

---

## 1. Core Architectural Features

- **Component Modularization**: Clean, scalable React architecture partitioned into specialized views:
  - `HeroSection.jsx` & `StatsGrid.jsx`: System status overview and forensic capability indicators.
  - `UploadZone.jsx`: Drag-and-drop media ingestion interface enforcing client-side validation.
  - `AnalysisTerminal.jsx`: Real-time streaming terminal with active CUDA VRAM and batch rate telemetry.
  - `FeaturesGrid.jsx`: Detailed interactive breakdown of the 15 sensory dimensions and workflow steps.
  - `HowItWorks.jsx`: Complete 6-stage forensic inspection pipeline specification.
  - `ModelsOverview.jsx`: Neural architecture explorer with interactive Recharts loss and accuracy curves.
  - `ReportDashboard.jsx`: Single authoritative Forensic Dossier Header with case reference tracking, one-sentence plain-English findings, export PDF / scan CTAs, a streamlined Inspected Media sidebar with **Target Face Crop Preview Card**, interactive Diagnostic Sensor Matrix, and live tab badges.
- **Interactive A/B Forensics Split Workbench**:
  - **Dynamic Layer Badges**: Viewport headers dynamically reflect active exhibits (e.g., `B: HSV SATURATION ELA`, `B: PRNU SILICON NOISE`) the instant they are promoted.
  - **In-Flight Visual Feedback**: Smooth opacity fade transitions and a dedicated `.viewport-loader` pulsing spinner overlay provide unmistakable visual confirmation while matrices are streaming.
  - **Proactive Background Prefetching**: Client-side prefetch hooks (`new Image().src = ex.img`) preload all exhibit thumbnails and high-res layers on tab mount, eliminating network delays when toggling between analytical maps.
  - **Segmented Forensic Chip Controls**: Styled `.chip-btn` and `.chip-btn.active` indicators with glowing cyan/blue focus states for rapid stage mode toggling (`A/B Wipe` vs `Direct Map`) and gain scaling.
- **Universal Media URL & Face Crop Resolver (`mediaUrl.js`)**:
  - `resolveOriginalFaceUrl(result)`: Multi-tier fallback hierarchy prioritizing direct backend `face_crop_path`, preset `heatmaps.original_face`, session-relative path derivations, and raw video frames.
  - `handleFaceImgError`: Graceful image error handler that automatically cascades from face crops to raw frames before falling back to procedural SVG graphics.
  - Guaranteed pixel-perfect 380×380 alignment between Slide [A] (original face) and Slide [B] (forensic heatmaps).
- **Real-Time SSE Telemetry (`useAnalysisPipeline.js`)**: Subscribes to Server-Sent Events (`/api/status/{job_id}/stream`) with 2KB buffer bypass, receiving real-time progress ($0-100\%$), forensic execution logs, and live GPU/CPU telemetry without polling overhead.
- **Dual-Layer Explainable AI (XAI) Visualizer**: Renders both coarse **Grad-CAM** overlays (hooking the 1792-channel convolutional head) and microscopic **Guided Grad-CAM** maps (1st–99th percentile HDR contrast stretched in scientific Inferno colormaps).
- **True SHAP Explanations**: Visualizes mathematical directional attributions from `shap.KernelExplainer` ($\rightarrow \text{FAKE}$ / $\rightarrow \text{AUTHENTIC}$) with impact percentages.
- **Balanced 2-Column Forensic Workspace (`FeaturesTab.jsx`)**:
  - **Left Column**: Full-width **Feature Attribution (SHAP)** waterfall with directional bars and plain-English impact tags, plus the 5-stage **Meta-Classifier Architecture Pipeline** with an interactive toggle to the Forensic Guide.
  - **Right Column**: Dual-polygon **Forensic Fingerprint Radar** comparing media footprint to unmanipulated camera baseline (~12%), paired with a structured **Investigative Findings Brief**.
- **15 Specialized Sensory Tabs**: Dedicated analytical views for every forensic dimension:
  1. `VisualTab.jsx`: Grad-CAM & Guided Grad-CAM heatmaps.
  2. `FeaturesTab.jsx`: 2-column forensic workspace with SHAP waterfall & dual radar.
  3. `FrequencyTab.jsx`: 2D FFT, 8x8 block DCT, and Hou & Zhang spectral residuals.
  4. `ElaTab.jsx`: Error Level Analysis (ELA) recompression error maps.
  5. `NoiseTab.jsx`: PRNU sensor noise & Spatial Rich Models (SRM).
  6. `CfaTab.jsx`: Color Filter Array (CFA) Bayer demosaicing grid residuals.
  7. `GeometryTab.jsx`: 3D head pose Euler angles & boundary Sobel gradient energy.
  8. `CornealTab.jsx`: Corneal specular highlights & Normalized Cross-Correlation (NCC).
  9. `ColorTab.jsx`: YCbCr / CIELAB chrominance bleeding.
  10. `LightingTab.jsx`: 9-coefficient 3D Spherical Harmonics ($l \le 2$) light probes.
  11. `RppgTab.jsx`: Cardiovascular blood volume pulse (BVP) & Fourier spectral SNR.
  12. `EyeTab.jsx`: Eye Aspect Ratio (EAR) biological blink timing & gaze convergence.
  13. `VoiceTab.jsx`: 128-mel spectrogram & vocoder audio anti-spoofing.
  14. `AudioTab.jsx`: SyncNet 1024-D audio-visual lip-sync error metrics (LSE-D / LSE-C).
  15. `FlowTab.jsx`: Dense Inverse Search (DIS) optical flow temporal jitter.
  16. `MetaTab.jsx`: EXIF metadata, generative AI signatures, and container streams.
- **Glassmorphism 2.0 Design System**: Deep Slate base (`#0f172a`), inner glass-rim shadows, translucent floating panels, crisp typography (`Outfit` and `JetBrains Mono`), and fluid Framer Motion animations.

---

## 2. Technology Stack

- **Framework**: React 18.2 with Vite bundler
- **Data Visualization**: Recharts (Radar, Area, Line, and Bar charts)
- **Icons & UI Graphics**: Lucide React
- **Animations**: Framer Motion & Vanilla CSS keyframe transitions
- **Styling**: Tailored Modern CSS Design System (no Tailwind bloat)

---

## 3. Installation & Local Development

### 3.1 Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher

### 3.2 Setup Steps
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 4. Backend Connection & Environment Variables

### 4.1 Local Development
By default, the frontend connects to the local FastAPI server running on `http://127.0.0.1:8000` with the master development API key (`deepforensics-dev-key`).

### 4.2 Production Configuration
When deploying to **Vercel** or other cloud platforms, configure environment variables in `.env` or the platform dashboard:

```env
# URL pointing to your backend FastAPI deployment (e.g. Hugging Face Spaces or Cloud Run)
VITE_API_URL=https://your-backend-instance.hf.space

# API Key matching the backend API_KEY environment variable
VITE_API_KEY=your-secure-api-key
```

---

## 5. Build for Production

To validate types and bundle optimized static assets:
```bash
npm run build
```
Compiled static assets are placed in the `frontend/dist/` directory ready for deployment to Vercel, Netlify, or static web servers.
