import React from 'react';
import { UploadCloud, Eye, Cpu, FileCheck, Activity, HeartPulse, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: UploadCloud,
    title: 'Stream Ingestion, IQA & Face Tracking',
    detail: 'Media is ingested via asynchronous 1MB chunked streams with strict 100MB ceiling and post-stream binary magic-byte MIME validation. Audio is demuxed into uncompressed 16 kHz mono PCM WAV, while frames are sampled using PySceneDetect camera-cut triggers. The engine crops faces with a 20% margin using MediaPipe (468 landmarks) and tracks facial kinematics across frames via KCF/CSRT trackers, computing Laplacian variance for Image Quality Assessment (IQA).'
  },
  {
    step: '02',
    icon: Cpu,
    title: 'EfficientNet-B4 + CBAM Neural Feature Extraction',
    detail: 'Cropped, ImageNet-normalized facial crops are evaluated in 32-frame sliding-window batches by a fine-tuned EfficientNet-B4 backbone enhanced with CBAM (Convolutional Block Attention Module). Channel and Spatial attention heads jointly isolate GAN upsampling artifacts, boundary interpolation blurring, and checkerboard frequency leakage.'
  },
  {
    step: '03',
    icon: Eye,
    title: 'Dual-Resolution Explainable AI (XAI)',
    detail: 'To satisfy legal admissibility (Daubert standard), decisions are grounded through two attribution layers: Grad-CAM hooks the 1792-channel conv_head to highlight macroscopic facial areas driving the fake class, while Guided Grad-CAM fuses Guided Backpropagation with 1st–99th percentile dynamic range contrast stretching and scientific COLORMAP_INFERNO rendering to expose microscopic pixel-level warping seams.'
  },
  {
    step: '04',
    icon: Activity,
    title: 'Bounded 4-Worker Parallel Sensory Audit',
    detail: 'A fault-tolerant ThreadPoolExecutor dispatches 14 specialized analytical sub-engines in parallel: 2D FFT & 8x8 Block DCT spectral residuals, Error Level Analysis (ELA) at Q=95, Lukas PRNU sensor noise via Non-Local Means, Bayer CFA Demosaicing grids, Corneal Specular Highlights in LAB color space, 3D Spherical Harmonics lighting vs Sobel background circular stats, Remote Photoplethysmography (rPPG) subcutaneous heartbeat extraction via CHROM projection, Eye Aspect Ratio (EAR) biological blink dynamics, DIS Optical Flow temporal jitter, SyncNet 1024-D audio-visual lip-sync, and 2D-CNN Depthwise Separable voice anti-spoofing.'
  },
  {
    step: '05',
    icon: HeartPulse,
    title: 'PyTorch Meta-Classifier & "Flawless Fake" Override',
    detail: 'An 8-layer Tabular ResNet with 4-head Multi-Head Self-Attention trained on Class-Balanced Weighted Focal Loss fuses all 15 dimensional scores into an empirical probability. If any critical biological sensor fails violently (e.g., zero eye blinking, vocoder voice clone, or audio desync > 0.80), the "Catching Flawless Fakes" Heuristic Override boosts the verdict, preventing averaging dilution. SHAP KernelExplainer attributes exact directional percentages (→ FAKE / → AUTHENTIC).'
  },
  {
    step: '06',
    icon: FileCheck,
    title: 'Court-Admissible PDF Forensic Dossier',
    detail: 'All metrics, telemetry, and exhibits are automatically compiled into a multi-page PDF report. The report features an executive verdict banner, a 15-sensor progress gauge audit, complete metric parameter tables across 6 chapters, a 2-column visual evidence gallery hosting up to 30+ exhibits, and a legal evidentiary disclaimer.'
  }
];

const HowItWorks = ({ onStart }) => {
  return (
    <div style={{ maxWidth: '960px', margin: '1rem auto 4rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
          padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-xs)',
          background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.22)',
          color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 600,
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: '0.85rem'
        }}>
          Evidentiary Pipeline Specification
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          Forensic Inspection Architecture
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
          DeepForensics does not rely on heuristic guesswork. It systematically deconstructs media across 15 physical, biological, spectral, and deep neural dimensions to provide court-grade mathematical attribution.
        </p>
      </div>

      <div className="pipeline-container">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="pipeline-card">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <div className="pipeline-icon">
                  <Icon size={20} color="var(--primary)" />
                </div>
                <span className="mono-font" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  STAGE {s.step}
                </span>
              </div>
              <div className="pipeline-content">
                <h3>{s.title}</h3>
                <p>{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <button 
          type="button"
          className="btn btn-primary" 
          onClick={onStart} 
          style={{ padding: '0.75rem 2rem', fontSize: '0.9rem' }}
        >
          <span>Launch Ingestion Console</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default HowItWorks;
