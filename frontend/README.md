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
Ensure that the FastAPI backend is running on `http://127.0.0.1:8000`. By default, the application will attempt to connect to `http://localhost:8000` using the default dev API key. 
If your backend is running on a different URL/port, or you've configured a custom API key for security, create a `.env` file in the root of the `frontend` directory:
```env
VITE_API_URL=http://your-backend-ip:8000
VITE_API_KEY=your-custom-api-key
```
