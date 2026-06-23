---
title: Deepfake Forensics API
emoji: 🕵️
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# Deepfake Forensics API (Backend)

This is the FastAPI backend for the **Deepfake Forensics Platform**. It provides a high-performance REST API to process video and audio files, extracting multi-modal anomaly scores across 15 distinct forensic dimensions.

## Features
- **Concurrent Processing:** Utilizes `ThreadPoolExecutor` to handle heavy OpenCV frame extractions and multi-model inferences in parallel.
- **REST API:** Fully documented interactive Swagger API accessible at `/docs`.
- **Explainable AI:** Computes Grad-CAM heatmaps for visual models.
- **Report Generation:** Aggregates scores into comprehensive PDF forensics reports.

## Structure
- `main.py`: The FastAPI application entry point.
- `pipeline/`: Contains the forensic extraction logic (audio, video, geometry, XAI, etc.).
- `kaggle_scripts/`: Python scripts designed for training models in Kaggle GPU environments (`kaggle_efficientnet_training.py`, `kaggle_meta_training.py`, `kaggle_voice_training.py`).
- `weights/`: Pre-trained `.pth` and `.onnx` model weights (EfficientNet-B4, SyncNet, Voice Liveness 2D-CNN, Meta-Classifier MLP).

## Installation & Setup

1. Create a Virtual Environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\Activate.ps1
   # On Linux/Mac:
   source venv/bin/activate
   ```

2. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Server:
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at `http://127.0.0.1:8000`.
