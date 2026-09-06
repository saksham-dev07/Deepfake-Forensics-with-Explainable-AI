# Technical Specification & System Architecture: Core FastAPI Server & Pipeline Coordinator (`main.py`)

**Implementation File**: [`backend/main.py`](../main.py)  
**Analytical Classification**: Asynchronous Web Application / Microservice Gateway / Parallel Forensic Pipeline Orchestrator  
**Framework Stack**: `FastAPI 0.110+`, `Uvicorn`, `PyTorch`, `SlowAPI (Rate Limiting)`, `concurrent.futures`  
**Network Protocol**: REST JSON API / Server-Sent Events (SSE `text/event-stream`) / Static File Serving  
**Worker Concurrency**: 4-Thread Bounded ThreadPoolExecutor with Graceful Fallbacks  
**Primary Responsibilities**: Media Ingestion, Security & Rate Limiting, Lazy Model Loading, Parallel Forensic Dispatch, Meta-Classification, XAI Heuristic Overrides, SHAP Explanations, PDF Generation  

---

## 1. Executive Summary & Architectural Topology

`main.py` serves as the central nervous system of the DeepForensics platform. It coordinates client communication, enforces security parameters, ingests and validates media streams, dispatches asynchronous forensic workers across parallel CPU threads, fuses 15 multimodal sensory outputs via the PyTorch Meta-Classifier, and compiles Explainable AI reports.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DEEPFORENSICS API CORE ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                       [Client / Frontend / SDK Request]
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
             [API Key Security]               [SlowAPI Rate Limiter]
             Header: x-api-key                5 Requests / Minute / IP
             Validates deepforensics-dev-key  Returns 429 Too Many Requests
                      │                                 │
                      └────────────────┬────────────────┘
                                       │
                         [POST /api/analyze Endpoint]
                         - 100 MB Maximum Size Validation
                         - Streaming Asynchronous Ingestion
                         - True MIME-Type Validation (python-magic)
                         - UUIDv4 Job Token Generation
                                       │
                      ┌────────────────┴────────────────┐
                      ▼                                 ▼
         [Return 200 OK + Job Token]       [BackgroundTasks Asynchronous Worker]
         Immediate Client Response         run_analysis_pipeline(job_id, file_path)
                      │                                 │
         ┌────────────┴────────────┐                    ▼
         ▼                         ▼        ┌──────────────────────────────────────┐
   [GET /status]            [GET /stream]   │ STAGE 1: Video/Audio Extraction      │
   REST Polling JSON        SSE Event Stream│ STAGE 2: Batched ResNet Face Predict │
   Progress, Logs, VRAM     Real-Time Push  │ STAGE 3: Grad-CAM & Guided CAM XAI   │
                                            │ STAGES 4-7: 4-Worker Parallel Pool   │
                                            │ STAGE 8: Meta-Classifier & Overrides │
                                            │ STAGE 9: SHAP & Court-Admissible PDF │
                                            └──────────────────┬───────────────────┘
                                                               │
                                                               ▼
                                                  [GET /api/reports/{id}/pdf]
                                                  Download Forensic Report
```

---

## 2. Security, Rate Limiting & Middleware Configuration

### 2.1 API Key Authentication Dependency
```python
API_KEY = os.environ.get("API_KEY") or "deepforensics-dev-key"
API_KEY_NAME = "x-api-key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    raise HTTPException(status_code=401, detail="Invalid API Key")
```
* Protects all analytical endpoints (`/api/analyze`, `/api/status/{id}`, `/api/status/{id}/stream`).
* Configurable via environment variable `API_KEY`.

### 2.2 Rate Limiting (SlowAPI)
* Employs SlowAPI based on client IP: `limiter = Limiter(key_func=get_remote_address)`.
* `@limiter.limit("5/minute")`: Caps media upload analysis to 5 invocations per minute per IP address, mitigating resource exhaustion.

### 2.3 CORS & Static File Mounts
* **CORS**: Configurable via `ALLOWED_ORIGINS` (defaults to `*`), enabling cross-origin integration with web frontends.
* **Static File Mount**: Mounts `/uploads` directly to disk to allow the React dashboard to fetch intermediate visual artifacts (heatmaps, waveforms, spectra).

---

## 3. Ingestion & Multi-Stage Payload Validation

The `/api/analyze` endpoint implements a 3-tier validation sequence:

```python
@app.post("/api/analyze")
@limiter.limit("5/minute")
async def analyze_video(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...), api_key: str = Depends(get_api_key)):
```

1. **Extension Whitelisting**:
   $$\text{Allowed} = \{\text{'mp4'}, \text{'avi'}, \text{'mov'}, \text{'mkv'}, \text{'webm'}, \text{'png'}, \text{'jpg'}, \text{'jpeg'}\}$$
2. **Asynchronous Streaming Chunking with 100 MB Hard Limit**:
   Ingests media in $1\text{ MB}$ chunks (`file.read(1024 * 1024)`). If cumulative bytes exceed $100 \times 1024 \times 1024\text{ bytes}$ ($100\text{ MB}$), closes the stream, purges the partial file from disk, and raises `HTTP 413 Payload Too Large`.
3. **True MIME-Type Magic Byte Validation**:
   Inspects the file's binary magic bytes using `python-magic` *after* the stream has been completely written to disk:
   ```python
   mime_type = magic.from_file(file_path, mime=True)
   if not mime_type.startswith(('video/', 'image/')):
       os.remove(file_path)
       raise HTTPException(status_code=400, detail=f"Malicious payload detected...")
   ```
   * *Critical Engineering Architecture*: Executing MIME validation *after* stream consumption prevents TCP reset (`RST`) packets that crash Uvicorn workers when uploads are terminated prematurely.

---

## 4. Lazy Model Loading Architecture

Deep neural networks consume significant memory and initialization time. To allow the FastAPI application to boot in $<1.0\text{ second}$ on serverless or resource-constrained hosting (such as Hugging Face Spaces free tier), model weights are loaded lazily upon the first analysis request:

```python
_models = {}

def get_detector():
    if "detector" not in _models:
        from pipeline.models import DeepfakeDetector
        _models["detector"] = DeepfakeDetector()
    return _models["detector"]

def get_explainer():
    if "explainer" not in _models:
        from pipeline.xai_explainer import XAIExplainer
        _models["explainer"] = XAIExplainer(get_detector().model)
    return _models["explainer"]

def get_meta_classifier():
    if "meta_classifier" not in _models:
        from pipeline.ensemble_classifier import DeepfakeMetaClassifier
        _models["meta_classifier"] = DeepfakeMetaClassifier()
        _models["meta_classifier"].load_model()
    return _models["meta_classifier"]
```

---

## 5. Real-Time Telemetry & SSE Streaming Architecture

### 5.1 Dynamic Telemetry Computation
Both polling and streaming endpoints evaluate live hardware states:
* **CUDA VRAM**: If GPU is available, extracts `torch.cuda.memory_allocated()` and device properties to return allocations (e.g. `"1.8 GB / 16.0 GB"`).
* **Hardware Backend**: Identifies exact GPU architecture (e.g. `"CUDA 12.1 (NVIDIA RTX A5000)"`) or falls back to `"CPU (PyTorch)"`.

### 5.2 Server-Sent Events (SSE): `/api/status/{job_id}/stream`
Implements HTTP/1.1 EventSource streaming (`text/event-stream`):
1. **NGINX Proxy Buffer Flushing**:
   Immediately yields a 2KB space comment buffer (`": " + " " * 2048 + "\n\n"`). This forces downstream NGINX reverse proxies to bypass initial chunk buffering and open the stream to the browser immediately without lag.
2. **Asynchronous Polling Loop**: Loops at $0.5\text{ s}$ intervals (`await asyncio.sleep(0.5)`), checking job progress and client disconnects (`await request.is_disconnected()`).
3. **Response Headers**:
   ```python
   headers = {
       "Cache-Control": "no-cache",
       "Connection": "keep-alive",
       "X-Accel-Buffering": "no"
   }
   ```

---

## 6. Execution Stages of the Forensic Pipeline (`run_analysis_pipeline`)

The orchestration pipeline proceeds through 9 sequential and parallel stages:

### 6.1 Stage 1: Ingestion & Frame Extraction ($0\% - 10\%$)
* Calls `process_video(file_path, job_id)`.
* Clamps video duration to $60\text{ seconds}$ (`MAX_DURATION_SEC = 60`).
* Extracts 16 keyframes and converts audio to 16 kHz mono PCM WAV.
* Computes center-50% Laplacian variance to establish Image Quality Assessment multiplier $Q$:
  $$Q = \text{clip}\left(\frac{\text{Var}(\nabla^2 I_{\text{center}})}{250.0}, \; 0.3, \; 1.3\right)$$

### 6.2 Stage 2: Batched Neural Network Prediction ($15\% - 30\%$)
* **Cropped Face Tracking**: Uses `TrackerKCF_create()` or `TrackerCSRT_create()` with $20\%$ expansion margins to crop facial regions, preventing full-frame downscaling from diluting manipulation artifacts.
* **ImageNet Normalization**: Normalizes crops to $[380, 380]$ using $\mu = [0.485, 0.456, 0.406]$ and $\sigma = [0.229, 0.224, 0.225]$.
* **Sliding Window Batching**: Evaluates frames in batches of 32 (`BATCH_SIZE = 32`) to prevent CUDA Out-Of-Memory exceptions on long clips, followed by explicit `gc.collect()`.

### 6.3 Stage 3: Grad-CAM Visual Explanations ($30\% - 45\%$)
* Calls `XAIExplainer.generate_heatmap` on the primary frame.
* Generates both standard coarse Grad-CAM (`heatmap_0.jpg`) and high-resolution Guided Grad-CAM (`heatmap_0_guided.jpg`).

### 6.4 Stages 4–7: Bounded Parallel Forensic Dispatch ($45\% - 82\%$)
Executes remaining forensic sub-engines concurrently using `ThreadPoolExecutor(max_workers=4)` wrapped in `run_with_fallback`:

```python
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    future_freq = executor.submit(run_with_fallback, analyze_frequency_domain, ...)
    future_ela = executor.submit(run_with_fallback, analyze_ela, ...)
    future_face = executor.submit(run_with_fallback, analyze_face_geometry, ...)
    future_sync = executor.submit(run_with_fallback, analyze_audio_visual_sync, ...)
    future_noise = executor.submit(run_with_fallback, analyze_sensor_noise, ...)
    future_color = executor.submit(run_with_fallback, analyze_chrominance, ...)
    future_metadata = executor.submit(run_with_fallback, analyze_metadata, ...)
    future_rppg = executor.submit(run_with_fallback, extract_rppg_signal, ...)
    future_lighting = executor.submit(run_with_fallback, analyze_lighting, ...)
    future_eye = executor.submit(run_with_fallback, analyze_eye_movements, ...) if is_video else None
    future_voice = executor.submit(run_with_fallback, analyze_voice_spoofing, ...) if has_audio else None
    future_flow = executor.submit(run_with_fallback, analyze_optical_flow, ...) if is_video else None
    future_cfa = executor.submit(run_with_fallback, analyze_cfa_artifacts, ...)
    future_corneal = executor.submit(run_with_fallback, analyze_corneal_reflections, ...)
```
* **Fault-Tolerant Fallbacks**: If any individual worker raises an uncaught exception, `run_with_fallback` logs the trace to `error_log.txt` and returns a default neutral result dictionary, guaranteeing the total analysis never fails due to a single sub-module.

---

## 7. Meta-Classifier Fusion & XAI Heuristic Vetoes ($82\% - 90\%$)

### 7.1 Blur Adjustment
If the primary frame is detected as blurry ($\text{Laplacian Variance} < 100$), the high-frequency spectral anomaly score is discounted by $60\%$ ($0.40\times$) to prevent compression blur from being misidentified as GAN frequency starvation.

### 7.2 Neural Meta-Classification
Constructs the 15-dimensional input vector and evaluates the PyTorch Meta-Classifier:
$$\hat{p}_{\text{fake}} = \mathcal{M}_{\text{meta}}(\mathbf{x}) \in [0.0, 1.0]$$

### 7.3 The "Catching Flawless Fakes" Heuristic Override
In sophisticated deepfakes, advanced post-processing can fool 13 out of 15 sensors. A simple weighted average would wash out the anomaly, resulting in a false-negative verdict.

To enforce biological reality, the engine applies an explicit heuristic override:
```python
critical_scores = []
if is_video:
    critical_scores.append(eye_score)         # Lack of blinking / unnatural gaze
    if has_audio:
        critical_scores.append(sync_score)    # Audio-visual desynchronization
        critical_scores.append(voice_score)   # Vocoder voice spoofing

if critical_scores and max(critical_scores) > 0.80:
    fake_prob = max(fake_prob, max(critical_scores))
```
* *Forensic Rationale*: A video cannot be biologically authentic if the subject never blinks or if the voice is an AI vocoder clone. A single decisive biological failure overrides neural meta-classifier averaging.

### 7.4 Verdict Classification Tiers & Tri-Tier Guardrails
$$\text{Verdict} = \begin{cases} 
\text{High Confidence Deepfake} & \text{if } \hat{p}_{\text{fake}} > 0.70 \\
\text{Suspected Manipulation} & \text{if } 0.55 < \hat{p}_{\text{fake}} \le 0.70 \\
\text{AI-Altered / Retouched} & \text{if } \hat{p}_{\text{fake}} \le 0.50 \text{ and } (s_{\text{geom}} \ge 0.45 \lor s_{\text{cfa}} \ge 0.25) \text{ and } s_{\text{nn}} < 0.40 \\
\text{Inconclusive - Manual Review} & \text{if } 0.40 < \hat{p}_{\text{fake}} \le 0.55 \\
\text{Likely Authentic} & \text{if } \hat{p}_{\text{fake}} \le 0.40 
\end{cases}$$

When the **AI-Altered Guardrail** fires:
- `is_ai_altered`: `True` (boolean flag exposed to the frontend)
- `alteration_type`: `"AI Facial Enhancement & Retouching (e.g., Gemini / Inpainting)"`
- `alteration_details`: Concise explanation distinguishing non-malicious cosmetic editing from deepfake identity theft.


---

## 8. Explainable AI: SHAP Feature Attribution

The function `generate_shap_features` applies **SHapley Additive exPlanations (SHAP)** (Lundberg & Lee, NeurIPS 2017) using `shap.KernelExplainer`:
1. **Background Reference**: Represents complete neutral uncertainty: $\mathbf{X}_{\text{ref}} = [0.5, 0.5, \dots, 0.5] \in \mathbb{R}^{1 \times 15}$.
2. **Kernel Explainer Evaluation**: Solves local linear surrogate models around $\mathbf{x}$, attributing additive positive or negative contributions $\phi_i$ to each sensor:
   $$\hat{y} = \phi_0 + \sum_{i=1}^{15} \phi_i$$
3. **Directional Impact Formatting**:
   Ranks features by absolute impact $|\phi_i|$:
   $$\text{Direction} = \begin{cases} \rightarrow \text{FAKE} & \text{if } \phi_i > 0 \\ \rightarrow \text{AUTHENTIC} & \text{if } \phi_i < 0 \end{cases}$$
   Example output: `"Lack of biological heart pulse (rPPG) (Impact: 34.2% → FAKE)"`.

---

## 9. Stage 9: Court-Admissible PDF Generation ($90\% - 100\%$)

* Calls `generate_pdf_report(result_data, pdf_path)` from `pipeline/pdf_reporter.py`.
* Compiles the 15-sensor audit, telemetry, SHAP attributions, and up to 30 visual exhibits into `reports/{job_id}.pdf`.
* Exposes the report via `GET /api/reports/{job_id}/pdf`.
* Marks `analysis_jobs[job_id]["status"] = "completed"`.

---

## 10. API Specification & Endpoints

| Method | Path | Auth | Parameters | Description |
| :--- | :--- | :---: | :--- | :--- |
| **`GET`** | `/` | None | None | Service health check and welcome message |
| **`POST`**| `/api/analyze` | `x-api-key` | `file: UploadFile` | Ingests media file, validates size/MIME, spawns pipeline |
| **`GET`** | `/api/status/{id}` | `x-api-key` | `job_id: str` | Polling endpoint returning progress ($0-100\%$), logs, result |
| **`GET`** | `/api/status/{id}/stream` | `x-api-key` | `job_id: str` | Server-Sent Events (SSE) streaming real-time status |
| **`GET`** | `/api/reports/{id}/pdf` | None | `job_id: str` | Downloads synthesized multi-page forensic PDF report |
