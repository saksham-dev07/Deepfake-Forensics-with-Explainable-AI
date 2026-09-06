import React from 'react';
import { UploadCloud, Search, Eye, Cpu, FileCheck, Activity, HeartPulse } from 'lucide-react';

const HowItWorks = ({ onStart }) => {
  return (
    <div className="how-it-works-page" style={{ maxWidth: '1000px', margin: '2rem auto', animation: 'fadeSlideIn 0.5s ease-out' }}>
      <div className="text-center" style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Forensic Inspection Architecture
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
          DeepForensics does not rely on heuristic guesswork. It deconstructs media across 15 physical, biological, spectral, and deep neural dimensions to provide court-grade mathematical attribution.
        </p>
      </div>

      <div className="pipeline-container">
        {/* Step 1 */}
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <UploadCloud size={22} color="var(--primary)" />
          </div>
          <div className="pipeline-content">
            <h3>1. Stream Ingestion, IQA &amp; Face Tracking</h3>
            <p>
              Media is ingested via asynchronous 1MB chunked streams with strict 100MB ceiling and post-stream binary magic-byte MIME validation. 
              Audio is demuxed into uncompressed 16 kHz mono PCM WAV, while frames are sampled using <strong>PySceneDetect</strong> camera-cut triggers. 
              The engine crops faces with a 20% margin using <strong>MediaPipe (468 landmarks)</strong> and tracks facial kinematics across frames via <strong>KCF/CSRT trackers</strong>, computing Laplacian variance for Image Quality Assessment (IQA).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <Cpu size={22} color="var(--primary)" />
          </div>
          <div className="pipeline-content">
            <h3>2. EfficientNet-B4 + CBAM Neural Feature Extraction</h3>
            <p>
              Cropped, ImageNet-normalized facial crops are evaluated in 32-frame sliding-window batches by a fine-tuned <strong>EfficientNet-B4</strong> backbone enhanced with <strong>CBAM (Convolutional Block Attention Module)</strong>. 
              Channel and Spatial attention heads jointly isolate GAN upsampling artifacts, boundary interpolation blurring, and checkerboard frequency leakage.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <Eye size={22} color="var(--primary)" />
          </div>
          <div className="pipeline-content">
            <h3>3. Dual-Resolution Explainable AI (XAI)</h3>
            <p>
              To satisfy legal admissibility (Daubert standard), decisions are grounded through two attribution layers: 
              <strong>Grad-CAM</strong> hooks the 1792-channel <code>conv_head</code> to highlight macroscopic facial areas driving the fake class, while 
              <strong>Guided Grad-CAM</strong> fuses Guided Backpropagation with 1st–99th percentile dynamic range contrast stretching and scientific <code>COLORMAP_INFERNO</code> rendering to expose microscopic pixel-level warping seams.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <Activity size={22} color="var(--primary)" />
          </div>
          <div className="pipeline-content">
            <h3>4. Bounded 4-Worker Parallel Sensory Audit</h3>
            <p>
              A fault-tolerant <code>ThreadPoolExecutor</code> dispatches 14 specialized analytical sub-engines in parallel:
              <strong>2D FFT &amp; 8x8 Block DCT</strong> spectral residuals, <strong>Error Level Analysis (ELA)</strong> at Q=95, 
              <strong>Lukas PRNU</strong> sensor noise via Non-Local Means, <strong>Bayer CFA Demosaicing</strong> grids, 
              <strong>Corneal Specular Highlights</strong> in LAB color space, <strong>3D Spherical Harmonics</strong> lighting vs Sobel background circular stats, 
              <strong>Remote Photoplethysmography (rPPG)</strong> subcutaneous heartbeat extraction via CHROM projection, 
              <strong>Eye Aspect Ratio (EAR)</strong> biological blink dynamics, <strong>DIS Optical Flow</strong> temporal jitter, 
              <strong>SyncNet</strong> 1024-D audio-visual lip-sync, and <strong>2D-CNN Depthwise Separable</strong> voice anti-spoofing.
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <HeartPulse size={22} color="var(--primary)" />
          </div>
          <div className="pipeline-content">
            <h3>5. PyTorch Meta-Classifier &amp; "Flawless Fake" Override</h3>
            <p>
              An 8-layer <strong>Tabular ResNet with 4-head Multi-Head Self-Attention</strong> trained on Class-Balanced Weighted Focal Loss fuses all 15 dimensional scores into an empirical probability. 
              If any critical biological sensor fails violently (e.g., zero eye blinking, vocoder voice clone, or audio desync &gt; 0.80), the <strong>"Catching Flawless Fakes" Heuristic Override</strong> boosts the verdict, preventing averaging dilution. 
              <strong>SHAP KernelExplainer</strong> attributes exact directional percentages (→ FAKE / → AUTHENTIC).
            </p>
          </div>
        </div>

        {/* Step 6 */}
        <div className="pipeline-card">
          <div className="pipeline-icon">
            <FileCheck size={22} color="var(--primary)" />
          </div>
          <div className="pipeline-content">
            <h3>6. Court-Admissible PDF Forensic Dossier</h3>
            <p>
              All metrics, telemetry, and exhibits are automatically compiled into a multi-page PDF report. 
              The report features an executive verdict banner, a 15-sensor progress gauge audit, complete metric parameter tables across 6 chapters, a 2-column visual evidence gallery hosting up to 30+ exhibits, and a legal evidentiary disclaimer.
            </p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <button className="btn btn-primary" onClick={onStart} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
          Initialize Forensic Scan
        </button>
      </div>

      <style>{`
        .pipeline-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          position: relative;
        }
        
        .pipeline-container::before {
          content: '';
          position: absolute;
          left: 31px;
          top: 20px;
          bottom: 20px;
          width: 2px;
          background: var(--glass-border);
          z-index: 0;
        }

        .pipeline-card {
          display: flex;
          gap: 1.5rem;
          background: var(--panel-bg);
          padding: 1.5rem;
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
          position: relative;
          z-index: 1;
          transition: border-color var(--transition-fast);
        }

        .pipeline-card:hover {
          border-color: var(--glass-border-hover);
        }

        .pipeline-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .pipeline-content h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .pipeline-content p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.6;
          font-size: 0.925rem;
        }

        @media (max-width: 768px) {
          .pipeline-container::before {
            display: none;
          }
          .pipeline-card {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default HowItWorks;
