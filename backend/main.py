import sys
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import hashlib
import hmac
import time
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import shutil
import os
import traceback
import concurrent.futures
import threading
from uuid import uuid4
from fastapi import HTTPException, Security, Depends, Request
from fastapi.security.api_key import APIKeyHeader
from fastapi.responses import StreamingResponse
import json
import asyncio
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

app = FastAPI(title="Deepfake Forensics API", version="2.0.0")

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Configuration
API_KEY = os.environ.get("API_KEY") or "deepforensics-dev-key"
API_KEY_NAME = "x-api-key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=True)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if hmac.compare_digest(api_key_header.encode(), API_KEY.encode()):
        return api_key_header
    raise HTTPException(status_code=401, detail="Invalid API Key")

def signed_asset_url(path: str):
    """Grant read access to one artifact for one hour without exposing the API key."""
    path = "/" + path.replace("\\", "/").lstrip("/")
    expires = str(int(time.time()) + 3600)
    token = hmac.new(API_KEY.encode(), f"{path}:{expires}".encode(), hashlib.sha256).hexdigest()
    return f"{quote(path)}?expires={expires}&token={token}"

def serialize_job(job_data):
    def sign(value):
        if isinstance(value, dict):
            return {key: sign(item) for key, item in value.items() if key != "file_path"}
        if isinstance(value, list):
            return [sign(item) for item in value]
        if isinstance(value, str) and value.replace("\\", "/").lstrip("/").startswith("uploads/"):
            return signed_asset_url(value)
        return value
    return sign(job_data)

@app.middleware("http")
async def protect_artifacts(request: Request, call_next):
    path = request.url.path
    if path.startswith(("/uploads/", "/api/reports")) or path == "/reports":
        authorized = hmac.compare_digest(request.headers.get(API_KEY_NAME, "").encode(), API_KEY.encode())
        if not authorized and request.method in {"GET", "HEAD"} and (
            path.startswith("/uploads/") or (path.startswith("/api/reports/") and path.endswith("/pdf"))
        ):
            expires = request.query_params.get("expires", "")
            token = request.query_params.get("token", "")
            if expires.isascii() and expires.isdigit() and len(expires) <= 12 and int(expires) >= time.time():
                expected = hmac.new(API_KEY.encode(), f"{path}:{expires}".encode(), hashlib.sha256).hexdigest()
                authorized = hmac.compare_digest(token.encode(), expected.encode())
        if not authorized:
            return JSONResponse(status_code=401, content={"detail": "Invalid or missing artifact credentials"})
    response = await call_next(request)
    if path.startswith(("/uploads/", "/api/reports")) or path == "/reports":
        response.headers["Cache-Control"] = "private, no-store"
    return response

# Allow CORS for specific origins
ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "deepfake-forensics",
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    index_file = os.path.join("static", "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "online",
        "message": "DeepForensics API is running. Please use the web console to interact with this service."
    }

UPLOAD_DIR = "uploads"
REPORT_DIR = "reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

class CachedStaticFiles(StaticFiles):
    """Private upload artifacts; authentication is enforced by middleware."""
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        if response.status_code == 200:
            response.headers["Cache-Control"] = "private, no-store"
        return response

# Mount the uploads directory to serve images to the frontend with caching
app.mount("/uploads", CachedStaticFiles(directory="uploads"), name="uploads")

# Mount built static assets if available (e.g. Hugging Face Spaces multi-stage container)
if os.path.isdir("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="static_assets")

# In-memory storage for analysis status
analysis_jobs = {}

# Lazy Loading Models
_models = {}
_model_load_lock = threading.RLock()

def get_detector():
    with _model_load_lock:
        if "detector" not in _models:
            print("Lazy loading DeepfakeDetector...")
            from pipeline.models import DeepfakeDetector
            _models["detector"] = DeepfakeDetector()
        return _models["detector"]


def get_explainer():
    with _model_load_lock:
        if "explainer" not in _models:
            print("Lazy loading XAIExplainer...")
            from pipeline.xai_explainer import XAIExplainer
            _models["explainer"] = XAIExplainer(get_detector().model)
        return _models["explainer"]


def get_meta_classifier():
    with _model_load_lock:
        if "meta_classifier" not in _models:
            print("Lazy loading DeepfakeMetaClassifier...")
            from pipeline.ensemble_classifier import DeepfakeMetaClassifier
            candidate = DeepfakeMetaClassifier()
            candidate.load_model()
            _models["meta_classifier"] = candidate
        return _models["meta_classifier"]

@app.post("/api/analyze")
@limiter.limit("5/minute")
async def analyze_video(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...), api_key: str = Depends(get_api_key)):
    job_id = str(uuid4())
    file_extension = file.filename.split(".")[-1].lower()
    
    # 1. File Type & True MIME-Type Validation
    ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "png", "jpg", "jpeg", "webp"}
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    # 2. File Size Validation & Saving (100 MB Limit)
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.{file_extension}")
    MAX_SIZE_BYTES = 100 * 1024 * 1024
    file_size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # Read in 1MB chunks asynchronously
            file_size += len(chunk)
            if file_size > MAX_SIZE_BYTES:
                buffer.close()
                os.remove(file_path)
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 100 MB.")
            buffer.write(chunk)
            
    # 3. True MIME-Type Validation (Executed AFTER stream consumption to prevent TCP RST on Uvicorn)
    try:
        import magic
        mime_type = magic.from_file(file_path, mime=True)
        if not mime_type.startswith(('video/', 'image/')):
            os.remove(file_path)
            raise HTTPException(status_code=400, detail=f"Malicious payload detected. File is disguised as {file_extension} but is actually {mime_type}.")
    except ImportError:
        print("Warning: python-magic not installed, skipping strict MIME validation.")
    
    analysis_jobs[job_id] = {
        "status": "processing",
        "progress": 0,
        "result": None,
        "file_path": file_path,
        "filename": getattr(file, "filename", "Unknown File")
    }
    
    # Run the heavy processing in the background
    background_tasks.add_task(run_analysis_pipeline, job_id, file_path)
    
    return {"job_id": job_id, "status": "processing"}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str, api_key: str = Depends(get_api_key)):
    if job_id not in analysis_jobs:
        return JSONResponse(status_code=404, content={"message": "Job not found"})
    
    job_data = analysis_jobs[job_id]
    
    # Dynamically compute REAL telemetry
    try:
        import torch
        if torch.cuda.is_available():
            mem_alloc = torch.cuda.memory_allocated() / 1e9
            mem_total = torch.cuda.get_device_properties(0).total_memory / 1e9
            vram_alloc = f"{mem_alloc:.1f} GB / {mem_total:.1f} GB"
            backend_name = f"CUDA 12.1 ({torch.cuda.get_device_name(0)})"
        else:
            vram_alloc = "CPU Mode"
            backend_name = "CPU (PyTorch)"
    except Exception:
        vram_alloc = "Unknown"
        backend_name = "Unknown"

    is_video = str(job_data.get("file_path", "")).lower().endswith(("mp4", "avi", "mov", "mkv", "webm"))

    job_data["telemetry"] = {
        "active_model": "Ensemble (EfficientNet + SyncNet)",
        "vram_allocation": vram_alloc,
        "hardware_backend": backend_name,
        "batch_processing": "Up to 16 sampled frames" if is_video else "1 Image/batch"
    }

    progress = job_data.get("progress", 0)
    logs = []
    if progress > 0: logs.append({"type": "OK", "msg": "Upload validated. Analysis started."})
    if progress >= 5: logs.append({"type": "INFO", "msg": "Extracting raw data stream..."})
    if progress >= 15: logs.append({"type": "WAIT", "msg": f"Loading weights to {backend_name}..."})
    if progress >= 35: logs.append({"type": "OK", "msg": "Neural net inference complete."})
    if progress >= 45: logs.append({"type": "INFO", "msg": "Computing SHAP & GradCAM gradients..."})
    if progress >= 55: logs.append({"type": "INFO", "msg": "Running DCT on 8x8 blocks..."})
    if progress >= 65: logs.append({"type": "OK", "msg": "Frequency domain mapped."})
    if progress >= 75: logs.append({"type": "WAIT", "msg": "Meta-Classifier aggregating 15 sensors..."})
    if progress >= 85: logs.append({"type": "INFO", "msg": "Synthesizing explainability PDF..."})
    job_data["logs"] = logs

    return serialize_job(job_data)

@app.get("/api/status/{job_id}/stream")
async def stream_status(job_id: str, request: Request, api_key: str = Depends(get_api_key)):
    if job_id not in analysis_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        # Force flush NGINX proxy buffers by sending 2KB of dummy padding
        yield ": " + " " * 2048 + "\n\n"
        
        while True:
            if await request.is_disconnected():
                break
            
            job_data = analysis_jobs[job_id]
            current_progress = job_data.get("progress", 0)
            status = job_data.get("status", "processing")
            
            import copy
            data_to_send = copy.deepcopy(job_data)
            
            try:
                import torch
                if torch.cuda.is_available():
                    mem_alloc = torch.cuda.memory_allocated() / 1e9
                    mem_total = torch.cuda.get_device_properties(0).total_memory / 1e9
                    vram_alloc = f"{mem_alloc:.1f} GB / {mem_total:.1f} GB"
                    backend_name = f"CUDA 12.1 ({torch.cuda.get_device_name(0)})"
                else:
                    vram_alloc = "CPU Mode"
                    backend_name = "CPU (PyTorch)"
            except Exception:
                vram_alloc = "Unknown"
                backend_name = "Unknown"

            is_video = str(data_to_send.get("file_path", "")).lower().endswith(("mp4", "avi", "mov", "mkv", "webm"))
            data_to_send["telemetry"] = {
                "active_model": "Ensemble (EfficientNet + SyncNet)",
                "vram_allocation": vram_alloc,
                "hardware_backend": backend_name,
                "batch_processing": "Up to 16 sampled frames" if is_video else "1 Image/batch"
            }
            
            logs = []
            if current_progress > 0: logs.append({"type": "OK", "msg": "Upload validated. Analysis started."})
            if current_progress >= 5: logs.append({"type": "INFO", "msg": "Extracting raw data stream..."})
            if current_progress >= 15: logs.append({"type": "WAIT", "msg": f"Loading weights to {backend_name}..."})
            if current_progress >= 35: logs.append({"type": "OK", "msg": "Neural net inference complete."})
            if current_progress >= 45: logs.append({"type": "INFO", "msg": "Computing SHAP & GradCAM gradients..."})
            if current_progress >= 55: logs.append({"type": "INFO", "msg": "Running DCT on 8x8 blocks..."})
            if current_progress >= 65: logs.append({"type": "OK", "msg": "Frequency domain mapped."})
            if current_progress >= 75: logs.append({"type": "WAIT", "msg": "Meta-Classifier aggregating 15 sensors..."})
            if current_progress >= 85: logs.append({"type": "INFO", "msg": "Synthesizing explainability PDF..."})
            data_to_send["logs"] = logs

            yield f"data: {json.dumps(serialize_job(data_to_send))}\n\n"
            
            if status in ["completed", "failed"]:
                break
                
            await asyncio.sleep(0.5)
            
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

class PDFGenerationRequest(BaseModel):
    job_id: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,80}$")
    filename: Optional[str] = "Forensic_Report"
    result: Dict[str, Any]

@app.get("/api/reports/{job_id}/pdf")
async def download_report(job_id: str):
    pdf_path = os.path.join(REPORT_DIR, f"{job_id}.pdf")
    
    # 1. Existing PDF on disk
    if os.path.exists(pdf_path):
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"Forensic_Report_{job_id}.pdf")
        
    # 2. On-demand fallback: Check active memory
    if job_id in analysis_jobs:
        job_data = analysis_jobs[job_id]
        if job_data.get("status") == "processing":
            return JSONResponse(status_code=202, content={"message": "Analysis is still in progress. Please wait for completion before downloading the report."})
        result = job_data.get("result")
        if result:
            try:
                from pipeline.pdf_reporter import generate_pdf_report
                result_for_pdf = result.copy()
                result_for_pdf["job_id"] = job_id
                result_for_pdf["filename"] = job_data.get("filename", "Media Analysis")
                generate_pdf_report(result_for_pdf, pdf_path)
                if os.path.exists(pdf_path):
                    return FileResponse(pdf_path, media_type="application/pdf", filename=f"Forensic_Report_{job_id}.pdf")
            except Exception as e:
                print(f"Error on-demand generating PDF for job {job_id}: {e}")

    # 3. On-demand fallback: Check persisted JSON report
    json_path = os.path.join(REPORT_DIR, f"{job_id}.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as jf:
                result_data = json.load(jf)
            from pipeline.pdf_reporter import generate_pdf_report
            generate_pdf_report(result_data, pdf_path)
            if os.path.exists(pdf_path):
                return FileResponse(pdf_path, media_type="application/pdf", filename=f"Forensic_Report_{job_id}.pdf")
        except Exception as e:
            print(f"Error generating PDF from cached JSON {json_path}: {e}")

    return JSONResponse(
        status_code=404, 
        content={"message": "Report not found. The server instance may have restarted or the session expired. Please re-run the scan to generate a fresh report."}
    )

@app.post("/api/reports/generate")
async def generate_report_endpoint(req: PDFGenerationRequest):
    try:
        from pipeline.pdf_reporter import generate_pdf_report
        target_id = req.job_id or str(uuid4())
        pdf_path = os.path.join(REPORT_DIR, f"{target_id}.pdf")
        
        result_copy = req.result.copy()
        result_copy["job_id"] = target_id
        result_copy["filename"] = req.filename or "Forensic_Report"
        
        generate_pdf_report(result_copy, pdf_path)
        
        if os.path.exists(pdf_path):
            return FileResponse(pdf_path, media_type="application/pdf", filename=f"Forensic_Report_{target_id}.pdf")
        else:
            return JSONResponse(status_code=500, content={"message": "Failed to create PDF on server disk."})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"message": f"PDF Generation Error: {str(e)}"})

@app.get("/api/reports")
async def list_reports():
    """Administrative Audit API: Lists all stored PDF reports and active storage consumption."""
    import datetime
    reports = []
    total_bytes = 0
    if os.path.exists(REPORT_DIR):
        for fname in sorted(os.listdir(REPORT_DIR)):
            if fname.endswith(".pdf"):
                fpath = os.path.join(REPORT_DIR, fname)
                size_bytes = os.path.getsize(fpath)
                total_bytes += size_bytes
                mtime = os.path.getmtime(fpath)
                created_at = datetime.datetime.fromtimestamp(mtime, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                job_id = fname[:-4]
                reports.append({
                    "job_id": job_id,
                    "filename": fname,
                    "size_bytes": size_bytes,
                    "size_kb": round(size_bytes / 1024, 2),
                    "size_mb": round(size_bytes / (1024 * 1024), 2),
                    "download_url": signed_asset_url(f"/api/reports/{job_id}/pdf"),
                    "created_at": created_at
                })
    return {
        "status": "success",
        "storage_directory": os.path.abspath(REPORT_DIR),
        "total_reports": len(reports),
        "total_storage_consumed_mb": round(total_bytes / (1024 * 1024), 2),
        "total_storage_consumed_bytes": total_bytes,
        "reports": reports
    }

@app.get("/reports", response_class=HTMLResponse)
async def reports_vault_ui():
    """Visual Forensic Storage Explorer directly viewable in the browser & HF Spaces."""
    import datetime
    reports = []
    total_bytes = 0
    if os.path.exists(REPORT_DIR):
        for fname in sorted(os.listdir(REPORT_DIR), reverse=True):
            if fname.endswith(".pdf"):
                fpath = os.path.join(REPORT_DIR, fname)
                size_bytes = os.path.getsize(fpath)
                total_bytes += size_bytes
                mtime = os.path.getmtime(fpath)
                created_at = datetime.datetime.fromtimestamp(mtime, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
                job_id = fname[:-4]
                reports.append({
                    "job_id": job_id,
                    "filename": fname,
                    "size_mb": round(size_bytes / (1024 * 1024), 2),
                    "size_kb": round(size_bytes / 1024, 1),
                    "download_url": signed_asset_url(f"/api/reports/{job_id}/pdf"),
                    "created_at": created_at
                })
    total_mb = round(total_bytes / (1024 * 1024), 2)
    storage_dir = os.path.abspath(REPORT_DIR)
    
    rows_html = ""
    for r in reports:
        rows_html += f"""
        <tr>
            <td style="font-family:monospace; color:#38bdf8; font-weight:600;">{r['job_id']}</td>
            <td><span style="background:rgba(59,130,246,0.15); color:#60a5fa; padding:3px 8px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid rgba(59,130,246,0.3);">Court PDF</span></td>
            <td style="font-family:monospace; font-weight:bold; color:#f8fafc;">{r['size_mb']} MB <span style="color:#94a3b8; font-size:11px;">({r['size_kb']} KB)</span></td>
            <td style="color:#94a3b8; font-size:13px;">{r['created_at']}</td>
            <td>
                <a href="{r['download_url']}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; background:#2563eb; color:#ffffff; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600; margin-right:8px;">View PDF ↗</a>
                <a href="{r['download_url']}" download="{r['filename']}" style="display:inline-flex; align-items:center; gap:4px; background:#1e293b; color:#cbd5e1; border:1px solid #334155; padding:6px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:600;">Download 💾</a>
            </td>
        </tr>
        """
    
    if not reports:
        rows_html = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:#64748b;">No PDF dossiers generated yet. Run an analysis in the Web Console to generate your first dossier!</td></tr>'

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepForensics | Evidentiary Storage Vault</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 2rem; min-height: 100vh; }}
        .container {{ max-width: 1100px; margin: 0 auto; }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }}
        .brand {{ display: flex; align-items: center; gap: 12px; }}
        .brand-badge {{ background: linear-gradient(135deg, #3b82f6, #1d4ed8); width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; }}
        .title {{ font-size: 1.4rem; font-weight: 800; }}
        .subtitle {{ font-size: 0.85rem; color: #94a3b8; margin-top: 2px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }}
        .card {{ background: #111827; border: 1px solid #1e293b; border-radius: 10px; padding: 1.25rem; }}
        .card-label {{ font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 0.4rem; font-weight: 600; }}
        .card-val {{ font-size: 1.6rem; font-weight: 800; color: #f8fafc; font-family: monospace; }}
        .card-sub {{ font-size: 0.75rem; color: #64748b; margin-top: 4px; }}
        .table-wrap {{ background: #111827; border: 1px solid #1e293b; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }}
        table {{ width: 100%; border-collapse: collapse; text-align: left; }}
        th {{ background: #1a2234; padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 700; border-bottom: 1px solid #1e293b; }}
        td {{ padding: 14px 16px; border-bottom: 1px solid #1e293b; font-size: 14px; }}
        tr:hover {{ background: rgba(255,255,255,0.02); }}
        .nav-btn {{ background: #1e293b; color: #f8fafc; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; border: 1px solid #334155; }}
        .nav-btn:hover {{ background: #334155; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="brand">
                <div class="brand-badge">🛡️</div>
                <div>
                    <div class="title">DeepForensics <span style="color:#38bdf8;">Evidentiary Storage Vault</span></div>
                    <div class="subtitle">Live Server Storage &amp; Case Dossier Registry</div>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <a href="/" class="nav-btn">← Back to Web Console</a>
                <a href="/api/reports" target="_blank" class="nav-btn">JSON Telemetry API ↗</a>
            </div>
        </div>

        <div class="stats-grid">
            <div class="card">
                <div class="card-label">Server Storage Directory</div>
                <div class="card-val" style="font-size:0.95rem; word-break:break-all; color:#38bdf8;">{storage_dir}</div>
                <div class="card-sub">Linux Container Local Mount</div>
            </div>
            <div class="card">
                <div class="card-label">Total Stored PDF Dossiers</div>
                <div class="card-val" style="color:#10b981;">{len(reports)}</div>
                <div class="card-sub">Verified Evidence Files</div>
            </div>
            <div class="card">
                <div class="card-label">Active Disk Space Consumed</div>
                <div class="card-val" style="color:#f59e0b;">{total_mb} MB</div>
                <div class="card-sub">{total_bytes:,} bytes on disk</div>
            </div>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Case / Job UUID</th>
                        <th>Evidence Type</th>
                        <th>Storage Consumed</th>
                        <th>Synthesized At (UTC)</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
"""
    return HTMLResponse(content=html_content)


def run_analysis_pipeline(job_id: str, file_path: str):
    try:
        # =============================================
        # LAZY IMPORTS: Only load heavy libraries when an analysis job actually starts.
        # This allows FastAPI to boot in <1 second on HF Spaces free tier.
        # =============================================
        import cv2
        import torch
        import numpy as np
        import shutil
    
        frames_dir = None
        audio_path = None
        from pipeline.video_processor import process_video
        from pipeline.image_utils import save_optimized_image
        from pipeline.pdf_reporter import generate_pdf_report
        from pipeline.frequency_analysis import analyze_frequency_domain
        from pipeline.ela_analysis import analyze_ela
        from pipeline.face_geometry import analyze_face_geometry
        from pipeline.noise_analysis import analyze_sensor_noise
        from pipeline.color_analysis import analyze_chrominance
        from pipeline.audio_sync import analyze_audio_visual_sync
        from pipeline.metadata_analysis import analyze_metadata
        from pipeline.rppg_analysis import extract_rppg_signal
        from pipeline.lighting_analysis import analyze_lighting
        from pipeline.eye_analysis import analyze_eye_movements
        from pipeline.voice_spoofing import analyze_voice_spoofing
        from pipeline.optical_flow import analyze_optical_flow
        from pipeline.cfa_analysis import analyze_cfa_artifacts
        from pipeline.corneal_analysis import analyze_corneal_reflections

        # =============================================
        # STAGE 1: Extract frames and audio (0-10%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 5
        frames_dir, audio_path = process_video(file_path, job_id)
        analysis_jobs[job_id]["progress"] = 10
        
        frame_files = sorted(os.path.join(frames_dir, name) for name in os.listdir(frames_dir)
                             if name.startswith("frame_") and name.lower().endswith((".png", ".jpg")))
        
        if not frame_files:
            raise ValueError("No frames could be extracted for analysis.")

        # Load the first frame for single-frame analyses
        first_frame = cv2.imread(frame_files[0])
        first_frame_rgb = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
        
        # CRITICAL FIX: The neural network was trained on CROPPED FACES. 
        # Squishing a 1080p full frame into 380x380 destroys all facial high-frequency 
        # artifacts and causes the model to blindly predict "Authentic".
        def get_face_bbox(img_rgb):
            from pipeline.face_geometry import detect_face
            try:
                landmarks = detect_face(img_rgb)
                if landmarks and "face_bbox" in landmarks:
                    return landmarks["face_bbox"]
            except Exception as e:
                print(f"Face bbox detection failed: {e}")
            return None

        def crop_from_bbox(img_rgb, bbox):
            if bbox is None:
                # Fallback to center crop
                fh, fw = img_rgb.shape[:2]
                min_dim = min(fh, fw)
                y1, x1 = (fh - min_dim) // 2, (fw - min_dim) // 2
                return img_rgb[y1:y1+min_dim, x1:x1+min_dim]
            x, y, w, h = bbox
            exp = int(0.2 * w) # 20% expansion margin
            x1, y1 = max(0, int(x - exp)), max(0, int(y - exp))
            x2, y2 = min(img_rgb.shape[1], int(x + w + exp)), min(img_rgb.shape[0], int(y + h + exp))
            return img_rgb[y1:y2, x1:x2]

        first_bbox = get_face_bbox(first_frame_rgb)
        first_frame_cropped = crop_from_bbox(first_frame_rgb, first_bbox) if first_bbox is not None else None
        first_frame_resized = cv2.resize(first_frame_cropped, (380, 380)) if first_frame_cropped is not None else None
        
        # Save cropped original face for frontend A/B wipe and biometric inspection
        face_crop_path = os.path.join(frames_dir, "face_crop.jpg") if first_frame_resized is not None else None
        if face_crop_path:
            save_optimized_image(face_crop_path, cv2.cvtColor(first_frame_resized, cv2.COLOR_RGB2BGR))
        
        # Extract File Metadata
        file_size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        original_resolution = f"{first_frame.shape[1]} × {first_frame.shape[0]}"
        has_audio = audio_path is not None and os.path.exists(audio_path)

        # Image Quality Assessment (IQA)
        first_frame_gray = cv2.cvtColor(first_frame, cv2.COLOR_BGR2GRAY)
        
        # Crop to the center 50% to evaluate sharpness. Highly textured backgrounds (like curtains)
        # can trick the Laplacian Variance into thinking a blurry webcam image is a sharp DSLR image!
        h, w = first_frame_gray.shape
        center_crop = first_frame_gray[int(h*0.25):int(h*0.75), int(w*0.25):int(w*0.75)]
        laplacian_var = cv2.Laplacian(center_crop, cv2.CV_64F).var()
        
        # Base sharpness threshold (e.g. 100 is blurry, 400 is sharp)
        # Normalize to a quality_multiplier between 0.3 and 1.3
        quality_multiplier = float(np.clip(laplacian_var / 250.0, 0.3, 1.3))
        image_quality_str = "High Quality (Sharp)" if quality_multiplier > 0.8 else "Low Quality (Blurry/Webcam)"

        # =============================================
        # STAGE 2: Neural Network Prediction (15-30%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 15

        try:
            # Multi-frame scoring: run all extracted frames through the model
            # OPTIMIZATION: Multi-frame scoring using a single batched PyTorch inference
            # OPTIMIZATION: Face Tracking to avoid running Mediapipe on every frame
            frame_tensors = []
            import torchvision.transforms.functional as TF
            
            for idx, frame_path in enumerate(frame_files):
                frame = cv2.imread(frame_path)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Samples can straddle scene cuts; an adjacent-frame tracker is inappropriate.
                current_bbox = first_bbox if idx == 0 else get_face_bbox(frame_rgb)
                if current_bbox is None:
                    continue
                frame_cropped = crop_from_bbox(frame_rgb, current_bbox)
                
                frame_resized = cv2.resize(frame_cropped, (380, 380))
                
                ft = torch.from_numpy(frame_resized).permute(2, 0, 1).float() / 255.0
                ft = TF.normalize(ft, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                frame_tensors.append(ft)
                
            # OOM PREVENTION: Process frames in chunks (sliding window)
            BATCH_SIZE = 32
            all_frame_scores = []
            
            for i in range(0, len(frame_tensors), BATCH_SIZE):
                batch_chunk = frame_tensors[i:i + BATCH_SIZE]
                batch_tensor = torch.stack(batch_chunk)
                
                # Run inference on the current batch
                probs = get_detector().predict(batch_tensor)
                all_frame_scores.extend([float(p) for p in probs])
                
                del batch_chunk
                del batch_tensor
                del probs
                
            nn_score = sum(all_frame_scores) / len(all_frame_scores) if all_frame_scores else 0.5
        except Exception as e:
            raise RuntimeError("Visual detector inference failed; no authenticity verdict was generated.") from e
        
        analysis_jobs[job_id]["progress"] = 30
        import gc
        gc.collect()
        
        # =============================================
        # STAGE 3: GradCAM Visual Explanations (30-45%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 35
        heatmaps = []
        try:
            if first_frame_resized is None:
                raise ValueError("No detected face in the reference sample; attention exhibit unavailable")
            # Preprocess: normalize WITH ImageNet mean/std because the Kaggle model expects it!
            import torchvision.transforms.functional as TF
            input_tensor = torch.from_numpy(first_frame_resized).permute(2, 0, 1).unsqueeze(0).float() / 255.0
            input_tensor = TF.normalize(input_tensor, mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            
            heatmap_path = os.path.join(frames_dir, "heatmap_0.jpg")
            hp, guided_hp = get_explainer().generate_heatmap(input_tensor, first_frame_resized, heatmap_path)
            if hp:
                heatmaps.append(hp.replace("\\", "/"))
            if guided_hp:
                heatmaps.append(guided_hp.replace("\\", "/"))
        except Exception as e:
            print(f"Error in GradCAM generation: {e}")
            traceback.print_exc()

        import gc
        gc.collect()
        
        analysis_jobs[job_id]["progress"] = 45

        # =============================================
        # PARALLEL STAGES 4-7: Freq, ELA, Face, Sync
        # =============================================
        
        module_errors = []

        def run_with_fallback(func, fallback_val, *args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                import traceback
                error_msg = f"{func.__name__} failed: {str(e)}"
                print(error_msg)
                module_errors.append(error_msg)
                with open("error_log.txt", "a") as f:
                    f.write(error_msg + "\n")
                    traceback.print_exc(file=f)
                return {**fallback_val, "available": False, "eligible_for_fusion": False, "error": error_msg}

        is_video = Path(file_path).suffix.lower() in {".mp4", ".avi", ".mov", ".mkv", ".webm"}
        
        # OPTIMIZATION: Removed artificial max_workers=3 bottleneck, but capped to 4 for Hugging Face Spaces stability.
        # Python will safely scale across the 2 available CPU cores without thrashing memory.
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_freq = executor.submit(
                run_with_fallback, analyze_frequency_domain, 
                {"score": 0.5, "visualizations": []}, 
                first_frame_rgb, frames_dir, prefix="freq", quality_multiplier=quality_multiplier
            )
            future_ela = executor.submit(
                run_with_fallback, analyze_ela, 
                {"score": 0.5, "visualizations": []}, 
                first_frame_rgb, frames_dir, prefix="ela", quality_multiplier=quality_multiplier
            )
            future_face = executor.submit(
                run_with_fallback, analyze_face_geometry, 
                {"score": 0.5, "visualizations": []}, 
                first_frame_rgb, frames_dir, prefix="face", frame_files=frame_files
            )
            future_sync = executor.submit(
                run_with_fallback, analyze_audio_visual_sync, 
                {"sync_score": 0.5, "error": "fallback"}, 
                file_path, audio_path, frames_dir, prefix="sync"
            )
            future_noise = executor.submit(
                run_with_fallback, analyze_sensor_noise,
                {"noise_score": 0.5},
                first_frame_rgb, frames_dir, prefix="noise", quality_multiplier=quality_multiplier
            )
            future_color = executor.submit(
                run_with_fallback, analyze_chrominance,
                {"color_anomaly_score": 0.5},
                first_frame_rgb, frames_dir, prefix="color", quality_multiplier=quality_multiplier
            )
            future_metadata = executor.submit(
                run_with_fallback, analyze_metadata,
                {"metadata_anomaly_score": 0.5, "warnings": []},
                file_path
            )
            future_rppg = executor.submit(
                run_with_fallback, extract_rppg_signal,
                {"rppg_anomaly_score": 0.5, "has_pulse": False},
                file_path, frames_dir, prefix="rppg"
            )
            future_lighting = executor.submit(
                run_with_fallback, analyze_lighting,
                {"lighting_anomaly_score": 0.5},
                first_frame_rgb, frames_dir, prefix="lighting", quality_multiplier=quality_multiplier
            )
            future_eye = executor.submit(
                run_with_fallback, analyze_eye_movements,
                {"eye_anomaly_score": 0.5, "warnings": []},
                file_path, frames_dir, prefix="eye"
            ) if is_video else None
            future_voice = executor.submit(
                run_with_fallback, analyze_voice_spoofing,
                {"voice_anomaly_score": 0.5, "warnings": []},
                audio_path, frames_dir, prefix="voice"
            ) if has_audio else None
            future_flow = executor.submit(
                run_with_fallback, analyze_optical_flow,
                {"flow_anomaly_score": 0.5, "warnings": []},
                file_path, frames_dir, prefix="flow"
            ) if is_video else None
            future_cfa = executor.submit(
                run_with_fallback, analyze_cfa_artifacts,
                {"cfa_score": 0.5, "warnings": []},
                frame_files[0], save_dir=frames_dir, face_results={"face_detected": first_bbox is not None, "face_bbox": first_bbox}, quality_multiplier=quality_multiplier
            )
            future_corneal = executor.submit(
                run_with_fallback, analyze_corneal_reflections,
                {"corneal_score": 0.5, "warnings": []},
                frame_files[0], save_dir=frames_dir, face_results=None, quality_multiplier=quality_multiplier
            )

            freq_results = future_freq.result()
            analysis_jobs[job_id]["progress"] = 55
            
            ela_results = future_ela.result()
            analysis_jobs[job_id]["progress"] = 65
            
            face_results = future_face.result()
            analysis_jobs[job_id]["progress"] = 75
            
            sync_results = future_sync.result()
            sync_score = sync_results.get("sync_score", 0.5) if isinstance(sync_results, dict) else 0.5
            analysis_jobs[job_id]["progress"] = 78
            
            noise_results = future_noise.result()
            analysis_jobs[job_id]["progress"] = 80
            
            color_results = future_color.result()
            metadata_results = future_metadata.result()
            rppg_results = future_rppg.result()
            lighting_results = future_lighting.result()
            eye_results = future_eye.result() if future_eye else {"eye_anomaly_score": 0.5}
            voice_results = future_voice.result() if future_voice else {"voice_anomaly_score": 0.5}
            flow_results = future_flow.result() if future_flow else {"flow_anomaly_score": 0.5}
            cfa_results = future_cfa.result()
            corneal_results = future_corneal.result()
            
            analysis_jobs[job_id]["progress"] = 82

        # =============================================
        # STAGE 8: Compute Ensemble Score (82-90%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 85

        # Individual scores
        nn_score = float(np.mean(all_frame_scores)) if all_frame_scores else 0.5
        spectral_score = freq_results.get("spectral_anomaly_score", 0.5)
        ela_score = ela_results.get("ela_score", 0.5)
        
        geometry_anomaly = face_results.get("geometry_anomaly_score", 0.5) if face_results.get("face_detected") else 0.5
        noise_score = noise_results.get("noise_score", 0.5)
        color_score = color_results.get("color_anomaly_score", 0.5)
        metadata_score = metadata_results.get("metadata_anomaly_score", 0.1)
        rppg_score = rppg_results.get("rppg_anomaly_score", 0.5)
        lighting_score = lighting_results.get("lighting_anomaly_score", 0.5)
        eye_score = eye_results.get("eye_anomaly_score", 0.5)
        voice_score = voice_results.get("voice_anomaly_score", 0.5)
        flow_score = flow_results.get("flow_anomaly_score", 0.5)
        cfa_score = cfa_results.get("cfa_score", 0.5)
        corneal_score = corneal_results.get("corneal_score", 0.5)

        classifier_features = {
            "nn_score": nn_score, "spectral_score": spectral_score, "ela_score": ela_score,
            "geometry_anomaly": geometry_anomaly, "noise_score": noise_score, "color_score": color_score,
            "sync_score": sync_score, "metadata_score": metadata_score, "rppg_score": rppg_score,
            "lighting_score": lighting_score, "eye_score": eye_score, "voice_score": voice_score,
            "flow_score": flow_score, "cfa_score": cfa_score, "corneal_score": corneal_score,
        }
        observations = {
            "nn_score": {"available": bool(all_frame_scores)}, "spectral_score": freq_results,
            "ela_score": ela_results, "geometry_anomaly": face_results, "noise_score": noise_results,
            "color_score": color_results, "sync_score": sync_results, "metadata_score": metadata_results,
            "rppg_score": rppg_results, "lighting_score": lighting_results, "eye_score": eye_results,
            "voice_score": voice_results, "flow_score": flow_results, "cfa_score": cfa_results,
            "corneal_score": corneal_results,
        }
        classifier_features, fusion_availability = prepare_fusion_features(
            classifier_features, observations, is_video, has_audio)
        meta_model = get_meta_classifier()
        fake_prob = meta_model.predict(classifier_features)
        # One detector is not a proof: do not replace trained fusion with max(score).
        ensemble_score = float(fake_prob)
        overall_score_available = fusion_availability["nn_score"]["used_for_fusion"]
        if not overall_score_available:
            ensemble_score = 0.5
            verdict = "Inconclusive - no usable face-model observations"
        elif ensemble_score > 0.70:
            verdict = "Elevated manipulation signals"
        elif ensemble_score > 0.55:
            verdict = "Potential manipulation signals"
        elif ensemble_score > 0.40:
            verdict = "Inconclusive - manual review recommended"
        else:
            verdict = "Limited manipulation signals"
        # These detectors do not identify a person or establish the use of a particular AI editor.
        is_ai_altered, alteration_type, alteration_details = False, None, None
        excluded_features = [key for key, state in fusion_availability.items() if not state["used_for_fusion"]]
        analysis_warnings = [
            "The combined output is an experimental, uncalibrated model score, not a probability of authenticity.",
            "Detector measurements and feature distributions have changed; the stored ensemble requires labeled-data re-evaluation.",
        ]
        if excluded_features:
            analysis_warnings.append("Unavailable or inapplicable detector scores were excluded from fusion using the existing neutral input convention.")
        if not overall_score_available:
            analysis_warnings.append("The visual checkpoint requires detected faces; unrelated center crops are not treated as face evidence.")
        print(f"Experimental fusion score: {ensemble_score:.4f} | {verdict}")

        # Frame-level statistics
        frame_scores_std = float(np.std(all_frame_scores)) if len(all_frame_scores) > 1 else 0.0
        temporal_consistency = "Consistent" if frame_scores_std < 0.15 else "Inconsistent"

        # True SHAP (SHapley Additive exPlanations)
        shap_features = generate_shap_features(classifier_features, has_audio, is_video) if overall_score_available else []
        
        analysis_jobs[job_id]["progress"] = 90

        # =============================================
        # STAGE 9: Generate Explainable AI Report
        # ==============================================
        result_data = {
            # Core verdict
            "overall_score": ensemble_score,
            "overall_score_available": overall_score_available,
            "score_calibrated": False,
            "analysis_warnings": analysis_warnings,
            "fusion_details": {"predictor": "xgboost" if meta_model.is_xgb_trained else "tabular_resnet", "inputs": classifier_features, "availability": fusion_availability, "excluded_features": excluded_features, "max_override_applied": False},
            "verdict": verdict,
            "is_ai_altered": is_ai_altered,
            "alteration_type": alteration_type,
            "alteration_details": alteration_details,
            "frames_analyzed": len(frame_files),
            
            # Individual detector scores
            "nn_score": round(nn_score, 4),
            "nn_score_available": bool(all_frame_scores),
            "neural_frames_analyzed": len(all_frame_scores),
            "spectral_anomaly_score": round(spectral_score, 4),
            "ela_score": round(ela_score, 4),
            "geometry_anomaly_score": round(geometry_anomaly, 4),
            "noise_score": round(noise_score, 4),
            "color_score": round(color_score, 4),
            "sync_score": sync_score,
            "metadata_score": round(metadata_score, 4),
            "rppg_score": round(rppg_score, 4),
            "lighting_score": round(lighting_score, 4),
            "eye_score": round(eye_score, 4),
            "voice_score": round(voice_score, 4),
            "flow_score": round(flow_score, 4),
            "cfa_score": round(cfa_score, 4),
            "corneal_score": round(corneal_score, 4),
            
            # Multi-frame analysis
            "frame_scores": [round(s, 4) for s in all_frame_scores],
            "frame_scores_std": round(frame_scores_std, 4),
            "temporal_consistency": temporal_consistency,
            
            # Sub-module results
            "frequency_analysis": freq_results,
            "ela_analysis": ela_results,
            "face_geometry": face_results,
            "noise_analysis": noise_results,
            "color_analysis": color_results,
            "sync_analysis": sync_results if isinstance(sync_results, dict) else {},
            "metadata_analysis": metadata_results,
            "rppg_analysis": rppg_results,
            "lighting_analysis": lighting_results,
            "eye_analysis": eye_results,
            "voice_analysis": voice_results,
            "flow_analysis": flow_results,
            "cfa_analysis": cfa_results,
            "corneal_analysis": corneal_results,
            
            # XAI & Media Assets
            "shap_top_features": shap_features,
            "heatmaps": heatmaps,
            "face_crop_path": face_crop_path.replace("\\", "/") if face_crop_path else None,
            "first_frame_path": frame_files[0].replace("\\", "/") if frame_files else None,
            
            # Add dynamic weights for frontend to display
            "weights": None,
            
            # Error tracking
            "module_errors": module_errors,
            
            # Metadata
            "file_metadata": {
                "file_size_bytes": file_size_bytes,
                "original_resolution": original_resolution,
                "has_audio": has_audio,
                "image_quality": image_quality_str,
                "laplacian_variance": round(laplacian_var, 2)
            }
        }

        # Generate PDF Report & Persist Raw Report JSON
        try:
            pdf_path = os.path.join(REPORT_DIR, f"{job_id}.pdf")
            json_path = os.path.join(REPORT_DIR, f"{job_id}.json")
            from pipeline.pdf_reporter import generate_pdf_report
            # Add some context to the result data
            result_data_for_pdf = result_data.copy()
            result_data_for_pdf['job_id'] = job_id
            result_data_for_pdf['filename'] = analysis_jobs.get(job_id, {}).get("filename", "Media Analysis")

            # Persist JSON report for on-demand regeneration
            try:
                with open(json_path, "w", encoding="utf-8") as jf:
                    json.dump(result_data_for_pdf, jf, default=str)
            except Exception as j_err:
                print(f"Warning: Failed to save JSON report cache: {j_err}")

            generate_pdf_report(result_data_for_pdf, pdf_path)
            result_data['report_pdf_url'] = f"/api/reports/{job_id}/pdf"
            
            analysis_jobs[job_id]["status"] = "completed"
            analysis_jobs[job_id]["progress"] = 100
            analysis_jobs[job_id]["result"] = result_data
        except Exception as e:
            import traceback
            traceback.print_exc()
            # If PDF fails, still return the dashboard data, just warn in logs
            print(f"Warning: PDF Generation failed: {e}")
            analysis_jobs[job_id]["status"] = "completed"
            analysis_jobs[job_id]["progress"] = 100
            analysis_jobs[job_id]["result"] = result_data
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        analysis_jobs[job_id]["status"] = "failed"
        analysis_jobs[job_id]["error"] = str(e)
    
    # NOTE: We cannot immediately delete frames_dir or file_path here 
    # because the frontend React dashboard needs to fetch these images 
    # (heatmaps, waveforms) via HTTP to render the report. 
    # A background cron job should be used to delete files older than 1 hour instead.


def prepare_fusion_features(features, observations, is_video, has_audio):
    """Keep inapplicable evidence out of the checkpoint's fixed 15-column input."""
    import math
    from numbers import Real
    temporal = {"eye_score", "rppg_score", "flow_score"}
    acoustic = {"voice_score", "sync_score"}
    values, availability = {}, {}
    for key, value in features.items():
        observation = observations.get(key, {}) or {}
        applicable = (key not in temporal or is_video) and (key not in acoustic or (is_video and has_audio))
        finite = isinstance(value, Real) and not isinstance(value, bool) and math.isfinite(value) and 0 <= value <= 1
        available = finite and observation.get("available", True) is not False and not observation.get("error") and observation.get("face_detected", True) is not False
        used = bool(applicable and available and observation.get("score_available", True) is not False and observation.get("eligible_for_fusion", True) is not False)
        values[key] = float(value) if used else 0.5
        availability[key] = {"available": bool(available), "applicable": applicable, "used_for_fusion": used}
    return values, availability

def generate_shap_features(classifier_features, has_audio, is_video=True):
    """
    Generate true SHAP (SHapley Additive exPlanations) values for the Meta-Classifier prediction.
    """
    try:
        import shap
        import numpy as np
        
        meta_model = get_meta_classifier()
        if not meta_model.is_trained:
            return ["Meta-Classifier is untrained (Fallback mode)"]
            
        # Feature names strictly matching the order in ensemble_classifier.py
        feature_order = meta_model.FEATURE_ORDER
        
        feature_descriptions = {
            "nn_score": "Visual model class score",
            "spectral_score": "Frequency domain spectral anomalies (DCT/FFT)",
            "ela_score": "JPEG compression inconsistency (Error Level Analysis)",
            "geometry_anomaly": "Facial boundary texture mismatch",
            "noise_score": "Denoising residual heuristic",
            "color_score": "Chrominance (YCbCr) color space bleeding",
            "metadata_score": "Suspicious file EXIF/metadata footprint",
            "rppg_score": "Tracked color pulse-band heuristic",
            "lighting_score": "Illumination divergence across composited elements",
            "eye_score": "Observed eyelid dynamics heuristic",
            "voice_score": "Audio model class score",
            "flow_score": "Blocky temporal motion jitter (Optical Flow)",
            "cfa_score": "Missing or disrupted Bayer filter (CFA) pattern",
            "corneal_score": "Corneal highlight-mask comparison",
            "sync_score": "Audio-video embedding-distance measurement"
        }

        x_vector = [classifier_features.get(key, 0.5) for key in feature_order]
        
        def shap_predict(X_numpy):
            return np.asarray(meta_model.predict_batch(X_numpy))
            
        # Background dataset representing total uncertainty (0.5 for all 15 features)
        background = np.full((1, 15), 0.5)
        
        explainer = shap.KernelExplainer(shap_predict, background)
        # Explain the current instance
        shap_values = explainer.shap_values(np.array([x_vector]), silent=True)
        
        # In newer SHAP versions, explainer.shap_values might return an Explanation object
        # or a numpy array. For a single output single instance, it's usually 1D or 2D array.
        if hasattr(shap_values, "values"):
            shap_values = shap_values.values
        
        # If the output is wrapped in another dimension, extract it
        if isinstance(shap_values, list):
            shap_values = shap_values[0]
        if len(np.shape(shap_values)) > 1:
            shap_values = shap_values[0]
            
        shap_contributions = []
        for idx, feature_name in enumerate(feature_order):
            contrib = float(shap_values[idx])
            if abs(contrib) > 0.001:
                shap_contributions.append((contrib, feature_descriptions[feature_name]))
                
        # Sort by highest absolute contribution
        shap_contributions.sort(key=lambda x: abs(x[0]), reverse=True)
        
        features_list = []
        for contrib, desc in shap_contributions[:5]:
            impact_prob = abs(contrib) * 100
            if impact_prob >= 0.1:  # Only show meaningful impacts
                direction = "→ FAKE" if contrib > 0 else "→ AUTHENTIC"
                features_list.append(f"{desc} (Impact: {impact_prob:.1f}% {direction})")
            
        if not features_list:
            features_list.append("No isolated anomaly factors detected.")
            
        return features_list
    except Exception as e:
        import traceback
        traceback.print_exc()
        return [f"SHAP Explainer Error: {str(e)}"]

# Single Page Application (SPA) client-side fallback for static web console
if os.path.isdir("static"):
    @app.get("/{full_path:path}")
    async def serve_spa_route(full_path: str):
        if any(full_path.startswith(prefix) for prefix in ["api", "uploads", "reports", "docs", "openapi.json", "redoc"]):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        static_root = Path("static").resolve()
        file_path = (static_root / full_path).resolve()
        if not file_path.is_relative_to(static_root):
            raise HTTPException(status_code=404, detail="Resource not found")
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join("static", "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Resource not found")


