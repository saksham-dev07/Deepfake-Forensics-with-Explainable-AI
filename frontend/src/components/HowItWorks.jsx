import React from 'react';
import { UploadCloud, Search, Eye, Cpu, FileCheck } from 'lucide-react';

const HowItWorks = ({ onStart }) => {
  return (
    <div className="how-it-works-page" style={{ maxWidth: '1000px', margin: '2rem auto', animation: 'fadeSlideIn 0.5s ease-out' }}>
      <div className="text-center" style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          How the Pipeline Works
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Our forensic engine doesn't just guess. It breaks down media frame-by-frame, combining cutting-edge classification with explainable AI to show you exactly why a video is authentic or manipulated.
        </p>
      </div>

      <div className="pipeline-container">
        {/* Step 1 */}
        <div className="pipeline-card">
          <div className="pipeline-icon" style={{ background: 'rgba(34, 211, 238, 0.1)', color: 'var(--primary)', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
            <UploadCloud size={24} />
          </div>
          <div className="pipeline-content">
            <h3>1. Media Ingestion & Pre-processing</h3>
            <p>You upload a video or image. Our engine automatically extracts the audio track (if present), detects faces using MTCNN, and splits the video into a sequence of normalized, high-resolution frames.</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="pipeline-card">
          <div className="pipeline-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
            <Cpu size={24} />
          </div>
          <div className="pipeline-content">
            <h3>2. EfficientNet-B4 Meta-Classification</h3>
            <p>The extracted faces are passed through our fine-tuned EfficientNet-B4 neural network. This model has been specifically trained on massive deepfake datasets (like FaceForensics++) to detect subtle, pixel-level manipulation artifacts.</p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="pipeline-card">
          <div className="pipeline-icon" style={{ background: 'rgba(251, 113, 133, 0.1)', color: '#fb7185', border: '1px solid rgba(251, 113, 133, 0.2)' }}>
            <Eye size={24} />
          </div>
          <div className="pipeline-content">
            <h3>3. XAI (Explainable AI) Generation</h3>
            <p>Instead of a "black box" answer, we use <strong>GradCAM</strong> (Gradient-weighted Class Activation Mapping) and <strong>SHAP</strong> values. These algorithms generate heatmaps directly on the image, highlighting the exact pixels and regions the AI looked at to make its decision.</p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="pipeline-card">
          <div className="pipeline-icon" style={{ background: 'rgba(52, 211, 153, 0.1)', color: 'var(--success)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
            <Search size={24} />
          </div>
          <div className="pipeline-content">
            <h3>4. SyncNet Temporal Validation</h3>
            <p>For videos, manipulating the face often breaks the synchronization between the person's lip movements and the spoken audio track. Our SyncNet implementation calculates the offset/delay, acting as a powerful secondary check for lip-sync deepfakes.</p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="pipeline-card">
          <div className="pipeline-icon" style={{ background: 'rgba(251, 191, 36, 0.1)', color: 'var(--warning)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <FileCheck size={24} />
          </div>
          <div className="pipeline-content">
            <h3>5. Final Forensic Verdict</h3>
            <p>All multimodal signals (visual artifacts, audio-visual sync, and explainability maps) are synthesized into a final confidence score. You receive a court-grade forensic report detailing the findings.</p>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '4rem' }}>
        <button className="btn btn-primary" onClick={onStart} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
          Try It Yourself
        </button>
      </div>

      <style>{`
        .pipeline-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: relative;
        }
        
        .pipeline-container::before {
          content: '';
          position: absolute;
          left: 35px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(180deg, var(--primary) 0%, #a78bfa 30%, #fb7185 60%, var(--success) 100%);
          opacity: 0.3;
          z-index: 0;
        }

        .pipeline-card {
          display: flex;
          gap: 2rem;
          background: var(--panel-bg);
          padding: 2rem;
          border-radius: var(--radius-lg);
          border: 1px solid var(--glass-border);
          position: relative;
          z-index: 1;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .pipeline-card:hover {
          transform: translateX(5px);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .pipeline-icon {
          width: 70px;
          height: 70px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #000;
        }

        .pipeline-content h3 {
          margin: 0 0 0.75rem 0;
          font-size: 1.25rem;
          color: var(--text-main);
        }

        .pipeline-content p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        @media (max-width: 768px) {
          .pipeline-container::before {
            display: none;
          }
          .pipeline-card {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};

export default HowItWorks;
