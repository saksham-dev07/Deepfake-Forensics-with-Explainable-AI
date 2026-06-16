from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import shutil
import os
import cv2
import torch
import numpy as np
import traceback
import concurrent.futures
from uuid import uuid4
from pipeline.video_processor import process_video
from pipeline.pdf_reporter import generate_pdf_report
from pipeline.models import DeepfakeDetector, SyncNetAnalyzer
from pipeline.xai_explainer import XAIExplainer
from pipeline.frequency_analysis import analyze_frequency_domain
from pipeline.ela_analysis import analyze_ela
from pipeline.face_geometry import analyze_face_geometry
from pipeline.noise_analysis import analyze_sensor_noise
from pipeline.color_analysis import analyze_chrominance
from pipeline.audio_sync import analyze_audio_visual_sync

app = FastAPI(title="Deepfake Forensics API", version="2.0.0")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "DeepForensics API is running. Please use the Vercel frontend to interact with this service."
    }

UPLOAD_DIR = "uploads"
REPORT_DIR = "reports"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(REPORT_DIR, exist_ok=True)

# Mount the uploads directory to serve images to the frontend
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# In-memory storage for analysis status
analysis_jobs = {}

# Initialize Models (lazy load or global)
print("Initializing AI Models...")
detector = DeepfakeDetector()
sync_analyzer = SyncNetAnalyzer()
explainer = XAIExplainer(detector.model)
print("Initialization complete.")

@app.post("/api/analyze")
async def analyze_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    job_id = str(uuid4())
    file_extension = file.filename.split(".")[-1]
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.{file_extension}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    analysis_jobs[job_id] = {"status": "processing", "progress": 0, "result": None}
    
    # Run the heavy processing in the background
    background_tasks.add_task(run_analysis_pipeline, job_id, file_path)
    
    return {"job_id": job_id, "status": "processing"}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in analysis_jobs:
        return JSONResponse(status_code=404, content={"message": "Job not found"})
    return analysis_jobs[job_id]

@app.get("/api/reports/{job_id}/pdf")
async def download_report(job_id: str):
    pdf_path = os.path.join(REPORT_DIR, f"{job_id}.pdf")
    if not os.path.exists(pdf_path):
        return JSONResponse(status_code=404, content={"message": "Report not found"})
    return FileResponse(pdf_path, media_type="application/pdf", filename=f"Forensic_Report_{job_id}.pdf")

def run_analysis_pipeline(job_id: str, file_path: str):
    try:
        # =============================================
        # STAGE 1: Extract frames and audio (0-10%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 5
        frames_dir, audio_path = process_video(file_path, job_id)
        analysis_jobs[job_id]["progress"] = 10
        
        frame_files = sorted([os.path.join(frames_dir, f) for f in os.listdir(frames_dir) if f.endswith(".jpg")])
        
        if not frame_files:
            raise ValueError("No frames could be extracted for analysis.")

        # Load the first frame for single-frame analyses
        first_frame = cv2.imread(frame_files[0])
        first_frame_rgb = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
        first_frame_resized = cv2.resize(first_frame_rgb, (380, 380))
        
        # Extract File Metadata
        file_size_bytes = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        original_resolution = f"{first_frame.shape[1]} × {first_frame.shape[0]}"
        has_audio = audio_path is not None and os.path.exists(audio_path)

        # =============================================
        # STAGE 2: Neural Network Prediction (15-30%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 15

        try:
            # Multi-frame scoring: run all extracted frames through the model
            all_frame_scores = []
            for idx, frame_path in enumerate(frame_files):
                frame = cv2.imread(frame_path)
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_resized = cv2.resize(frame_rgb, (380, 380))
                
                ft = torch.from_numpy(frame_resized).permute(2, 0, 1).unsqueeze(0).float() / 255.0
                
                prob = detector.predict(ft)[0]
                all_frame_scores.append(float(prob))
                
            nn_score = sum(all_frame_scores) / len(all_frame_scores) if all_frame_scores else 0.5
        except Exception as e:
            print(f"Error in Neural Network prediction: {e}")
            traceback.print_exc()
            nn_score = 0.5
            all_frame_scores = [0.5]
        
        analysis_jobs[job_id]["progress"] = 30

        # =============================================
        # STAGE 3: GradCAM Visual Explanations (30-45%)
        # =============================================
        analysis_jobs[job_id]["progress"] = 35
        heatmaps = []
        try:
            # Preprocess: normalize (no ImageNet mean/std for nikokons custom model)
            input_tensor = torch.from_numpy(first_frame_resized).permute(2, 0, 1).unsqueeze(0).float() / 255.0
            
            heatmap_path = os.path.join(frames_dir, "heatmap_0.jpg")
            hp, guided_hp = explainer.generate_heatmap(input_tensor, first_frame_resized, heatmap_path)
            if hp:
                heatmaps.append(hp.replace("\\", "/"))
            if guided_hp:
                heatmaps.append(guided_hp.replace("\\", "/"))
        except Exception as e:
            print(f"Error in GradCAM generation: {e}")
            traceback.print_exc()
        
        analysis_jobs[job_id]["progress"] = 45

        # =============================================
        # PARALLEL STAGES 4-7: Freq, ELA, Face, Sync
        # =============================================
        
        def run_with_fallback(func, fallback_val, *args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                import traceback
                print(f"Error in {func.__name__}: {e}")
                with open("error_log.txt", "a") as f:
                    f.write(f"Error in {func.__name__}: {e}\n")
                    traceback.print_exc(file=f)
                traceback.print_exc()
                return fallback_val

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
            future_freq = executor.submit(
                run_with_fallback, analyze_frequency_domain, 
                {"score": 0.5, "visualizations": []}, 
                first_frame_rgb, frames_dir, prefix="freq"
            )
            future_ela = executor.submit(
                run_with_fallback, analyze_ela, 
                {"score": 0.5, "visualizations": []}, 
                first_frame_rgb, frames_dir, prefix="ela"
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
                first_frame_rgb, frames_dir, prefix="noise"
            )
            future_color = executor.submit(
                run_with_fallback, analyze_chrominance,
                {"color_anomaly_score": 0.5},
                first_frame_rgb, frames_dir, prefix="color"
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

        # =============================================
        # EXPLAINABLE AI HEURISTIC: Grounding the Black Box
        # =============================================
        # Neural Networks often output False Positives (90%+) on blurry/noisy webcam images
        # because the compression mimics GAN artifacts. If our explainable physical sensors
        # (Frequency, Noise, ELA, Color) agree the image is authentic, we suppress the NN score.
        physical_score = (spectral_score + ela_score + noise_score + color_score) / 4.0
        if physical_score < 0.45 and nn_score > 0.70:
            print(f"XAI Intervention: Suppressing NN score ({nn_score:.2f}) due to authentic physical signals ({physical_score:.2f})")
            # Scale down NN score based on how authentic the physical sensors think it is
            nn_score = nn_score * (physical_score / 0.55)

        # Dynamic ensemble weights based on audio presence
        if audio_path:
            # Video: NN=40%, Freq=10%, ELA=10%, Geo=10%, Noise=10%, Color=10%, Sync=10%
            ensemble_score = (
                nn_score * 0.40 +
                spectral_score * 0.10 +
                ela_score * 0.10 +
                geometry_anomaly * 0.10 +
                noise_score * 0.10 +
                color_score * 0.10 +
                (1 - sync_score) * 0.10
            )
        else:
            # Image: NN=40%, Freq=15%, ELA=15%, Geo=10%, Noise=10%, Color=10%
            ensemble_score = (
                nn_score * 0.40 +
                spectral_score * 0.15 +
                ela_score * 0.15 +
                geometry_anomaly * 0.10 +
                noise_score * 0.10 +
                color_score * 0.10
            )
            
        ensemble_score = float(np.clip(ensemble_score, 0, 1))

        # Frame-level statistics
        frame_scores_std = float(np.std(all_frame_scores)) if len(all_frame_scores) > 1 else 0.0
        temporal_consistency = "Consistent" if frame_scores_std < 0.15 else "Inconsistent"

        # Determine verdict
        if ensemble_score > 0.70:
            verdict = "High Confidence Deepfake"
        elif ensemble_score > 0.55:
            verdict = "Suspected Manipulation"
        elif ensemble_score > 0.40:
            verdict = "Inconclusive - Manual Review Recommended"
        else:
            verdict = "Likely Authentic"

        # SHAP-style feature importance (now data-driven)
        shap_features = generate_shap_features(nn_score, spectral_score, ela_score, geometry_anomaly, noise_score, color_score, sync_score, face_results)
        
        analysis_jobs[job_id]["progress"] = 90

        # =============================================
        # STAGE 9: Generate PDF Report (90-100%)
        # =============================================
        result_data = {
            # Core verdict
            "overall_score": ensemble_score,
            "verdict": verdict,
            "frames_analyzed": len(frame_files),
            
            # Individual detector scores
            "nn_score": round(nn_score, 4),
            "spectral_anomaly_score": round(spectral_score, 4),
            "ela_score": round(ela_score, 4),
            "geometry_anomaly_score": round(geometry_anomaly, 4),
            "noise_score": round(noise_score, 4),
            "color_score": round(color_score, 4),
            "sync_score": sync_score,
            
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
            
            # XAI
            "shap_top_features": shap_features,
            "heatmaps": heatmaps,
            
            # Metadata
            "file_metadata": {
                "file_size_bytes": file_size_bytes,
                "original_resolution": original_resolution,
                "has_audio": has_audio,
            }
        }

        pdf_path = os.path.join(REPORT_DIR, f"{job_id}.pdf")
        generate_pdf_report(result_data, pdf_path)
        
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["progress"] = 100
        analysis_jobs[job_id]["result"] = result_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        analysis_jobs[job_id]["status"] = "failed"
        analysis_jobs[job_id]["error"] = str(e)


def generate_shap_features(nn_score, spectral_score, ela_score, geometry_score, noise_score, color_score, sync_score, face_results):
    """
    Generate ranked feature importance list based on actual analysis results.
    This replaces the hardcoded mock SHAP features with data-driven insights.
    """
    features = []
    
    # Rank features by their contribution to the final score
    signals = [
        (nn_score, "Neural network pixel-level artifact detection"),
        (spectral_score, "Frequency domain spectral anomalies (DCT/FFT)"),
        (ela_score, "JPEG compression inconsistency (Error Level Analysis)"),
        (geometry_score, "Facial boundary texture mismatch"),
        (noise_score, "Sensor noise (PRNU) inconsistency"),
        (color_score, "Chrominance (YCbCr) color space bleeding"),
        (1 - sync_score, "Audio-video temporal desynchronization"),
    ]
    
    # Add face-specific features if face was detected
    if face_results.get("face_detected"):
        symmetry = face_results.get("symmetry_score", 0.5)
        if symmetry < 0.85:
            signals.append((1 - symmetry, f"Facial asymmetry detected (score: {symmetry:.2f})"))
        
        noise = face_results.get("noise_consistency", 0.5)
        if noise < 0.7:
            signals.append((1 - noise, f"Inconsistent noise pattern at face boundary"))
    
    # Sort by score (highest contribution first)
    signals.sort(key=lambda x: x[0], reverse=True)
    
    for score, description in signals:
        if score > 0.1:  # Only include meaningful contributions
            features.append(f"{description} ({score*100:.0f}%)")
    
    return features[:6]  # Top 6 features
