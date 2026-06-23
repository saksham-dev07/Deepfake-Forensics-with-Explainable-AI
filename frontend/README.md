# Deepfake Forensics Dashboard (Frontend)

This is the React + Vite frontend for the **Deepfake Forensics Platform**. It provides a sleek, modern, and highly interactive user interface for analysts to upload media, view real-time forensic processing, and review explainable AI (XAI) reports.

## Features
- **Models Overview Dashboard:** Displays training metrics, architectures, and ROC-AUC curves for the core ensemble models (EfficientNet-B4 Visual Backbone, Meta-Classifier, Audio CNN, etc.).
- **Report Dashboard:** Parses the forensic JSON responses from the backend and renders visual evidence, including Grad-CAM heatmaps, bounding boxes, and biological signal charts.
- **Glassmorphic UI:** Modern dark-mode aesthetic built with Tailwind CSS / custom vanilla CSS, utilizing `lucide-react` for iconography and `recharts` for data visualization.

## Technologies
- **React 18**
- **Vite**
- **Recharts** (Data Visualization)
- **Lucide React** (Icons)

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
Ensure that the FastAPI backend is running on `http://127.0.0.1:8000` (or update your API base URL accordingly) so that video uploads and API requests can be successfully routed.
