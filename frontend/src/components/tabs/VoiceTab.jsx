import React from 'react';
import { Volume2, AlertTriangle, ZoomIn } from 'lucide-react';

import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const VoiceTab = ({
  result,
  getSyncColor,
  setZoomedImage,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Volume2 size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Audio Forensics: Voice Anti-Spoofing</div>
              <div className="panel-subtitle">Detecting synthetic voice clones and vocoder artifacts</div>
            </div>
          </div>

          <TestExplanation testId="voice" explanation={result.voice_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            {result.voice_analysis.voice_plot_path && (
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.voice_analysis.voice_plot_path}`)}>
<img 
                  src={`${API_BASE}/${result.voice_analysis.voice_plot_path}`} 
                  alt="Voice Spoofing Plot" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem' }}>Dual-Panel Audio Waveform & Spectral Power Density</div>
              </div>
            )}

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.voice_analysis.voice_anomaly_score} 
                  label="Audio Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Mel-Frequency Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="ZCR Variance" 
                    value={result.voice_analysis.zcr_variance.toFixed(5)} 
                    subValue="Zero-Crossing Rate" 
                    type={getSyncColor(result.voice_analysis.voice_anomaly_score)} 
                  />
                  <MetricCard 
                    label="High-Freq Ratio" 
                    value={result.voice_analysis.high_freq_ratio.toFixed(4)} 
                    subValue="Synthesized Pitch Shift" 
                    type={getSyncColor(result.voice_analysis.voice_anomaly_score)} 
                  />
                  {result.voice_analysis.warnings && result.voice_analysis.warnings.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Spoofing Warnings
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                        {result.voice_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default React.memo(VoiceTab);
