# Deepfake Forensics Dashboard (Frontend)

This is the React + Vite frontend for the **Deepfake Forensics Platform**. It provides a sleek, modern, and highly interactive user interface for analysts to upload media, view real-time forensic processing, and review explainable AI (XAI) reports.

## Features
- **Component Modularization:** A clean, maintainable architecture broken down into components (`HeroSection`, `FeaturesGrid`, `AnalysisTerminal`, `UploadZone`).
- **Real-Time SSE Telemetry:** Subscribes to Server-Sent Events (`/api/status/{job_id}/stream`) for low-latency, real-time progress updates instead of interval polling.
- **Granular Error Feedback:** Enhanced toast notifications provide specific, actionable error messages directly from the backend modules (e.g., rate limits, missing faces).
- **Models Overview Dashboard:** Displays training metrics, architectures, and ROC-AUC curves for the core ensemble models (EfficientNet-B4 Visual Backbone, Meta-Classifier, Audio CNN, etc.).
- **Report Dashboard:** Parses the forensic JSON responses from the backend and renders visual evidence, including Grad-CAM heatmaps, bounding boxes, and true SHAP explanations.
- **Glassmorphism 2.0 (Deep Slate):** Features a breathtaking aesthetic overhaul utilizing a Deep Slate base, inner glass-rim shadows, floating pill UI components, professional typography (`Outfit` and `JetBrains Mono`), and advanced CSS micro-animations.

## Technologies
- **React 18**
- **Vite**
- **Recharts** (Data Visualization)
- **Lucide React** (Icons)

## Component Architecture
- `App.jsx`: The main entry point that manages global state, API polling, file upload constraints, and renders the primary navigation.
- `ModelsOverview.jsx`: A purely informational dashboard displaying deep learning architectures, dataset compositions, and evaluation metrics (ROC-AUC).
- `ReportDashboard.jsx`: The core analytical view that parses the 15-dimensional forensic JSON response and maps the data to interactive Recharts (Radar, Area, Bar charts). It dynamically updates as background tasks progress.

## Installation & Setup

1. Install Dependencies:
   ```bash
   npm install
   ```

2. Run the Development Server:
   ```bash
   npm run dev
   ```

The dashboard will be accessible at `http://localhost:5173`.

## Connecting to Backend

### Local Development
Ensure that the FastAPI backend is running on `http://127.0.0.1:8000`. By default, the application will attempt to connect to `http://localhost:8000` using the default dev API key. 

### Production Deployment (Vercel + Hugging Face)
When deploying this frontend to **Vercel** for production, your backend should be hosted on **Hugging Face Spaces**. 
Create a `.env` file (or set the Vercel Environment Variables in your project dashboard):
```env
# The URL of your Hugging Face Space (e.g. https://username-spacename.hf.space)
VITE_API_URL=https://your-huggingface-space.hf.space
# Your custom API key for security
VITE_API_KEY=your-custom-api-key
```
