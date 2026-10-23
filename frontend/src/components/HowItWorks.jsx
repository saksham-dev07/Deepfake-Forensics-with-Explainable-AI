import React from 'react';
import { UploadCloud, Eye, Cpu, FileCheck, Activity, HeartPulse, ArrowRight } from 'lucide-react';

const STEPS = [
  { step: '01', icon: UploadCloud, title: 'Choose media to inspect', detail: 'Upload an image or video up to 100 MB. Video analysis uses sampled frames from the first 60 seconds. The backend extracts an audio track when available.' },
  { step: '02', icon: Cpu, title: 'Evaluate the visual model', detail: 'The trained EfficientNet-B4 visual model evaluates face crops. Its score estimates manipulation-related patterns; it does not verify a person’s identity.' },
  { step: '03', icon: Eye, title: 'Review visual explanations', detail: 'Grad-CAM and guided attention maps show regions influencing the visual model. They explain model behavior and are not independent proof that a region was edited.' },
  { step: '04', icon: Activity, title: 'Compare available detector evidence', detail: 'Compression, noise residuals, frequency structure, face geometry, lighting, and metadata add context. Video and audio inputs enable additional temporal and acoustic measurements. Missing observations are marked unavailable.' },
  { step: '05', icon: HeartPulse, title: 'Understand the combined estimate', detail: 'The meta-classifier combines available detector features and applies the configured override rules. SHAP attribution, when returned, describes which features influenced that prediction. Accuracy depends on source quality and similarity to the training data.' },
  { step: '06', icon: FileCheck, title: 'Export findings for review', detail: 'The report brings detector values, warnings, and available exhibits together in a PDF. Review the original source and independent evidence before making a consequential decision. Automated output does not establish legal admissibility.' },
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
          From upload to evidence
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', marginBottom: '0.75rem' }}>
          How the analysis works
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
          DeepForensics combines a trained visual model with supporting forensic heuristics. Review what was measured, what was unavailable, and where the analysis is uncertain.
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
          <span>Open analysis workspace</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};

export default HowItWorks;
