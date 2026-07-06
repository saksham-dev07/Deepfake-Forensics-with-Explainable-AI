
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

1. System Dependencies:
   - Ensure you have `ffmpeg` installed and available in your system's PATH, as it is required for video and audio processing.

2. Create a Virtual Environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\Activate.ps1
   # On Linux/Mac:
   source venv/bin/activate
   ```

3. Install Dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Server:
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at `http://127.0.0.1:8000`.

## Environment Variables
The application uses the following optional environment variables for configuration:
- `API_KEY`: Secures the API endpoints. (Defaults to `"deepforensics-dev-key"`). You must pass this in the `x-api-key` header when making requests.
- `ALLOWED_ORIGINS`: A comma-separated list of origins for CORS. (Defaults to `"*"`).

## Required Model Weights
Ensure the following pre-trained weight files are placed in the `weights/` directory for full functionality:
- `improved_finetuned_model.pth` or `finetuned_model.pth`: Custom EfficientNet-B4 weights. If missing, the system falls back to the standard ImageNet pre-trained timm model.
- `ensemble_mlp.pth`: Weights for the Meta-Classifier MLP.
- `voice_spoofing.pth`: Weights for the Acoustic Anti-Spoofing 2D-CNN.
- `syncnet_v2.model`: Pre-trained Wav2Lip SyncNet model (can be downloaded from the Wav2Lip official repository).

## API Specifications
- **Upload Limit:** Maximum file size is strictly capped at **100 MB**.
- **Supported Formats:** `mp4`, `avi`, `mov`, `mkv`, `webm`, `png`, `jpg`, `jpeg`.
- **Processing Time limit:** Video analyses are capped at the first 60 seconds of playback to prevent memory overflow.
