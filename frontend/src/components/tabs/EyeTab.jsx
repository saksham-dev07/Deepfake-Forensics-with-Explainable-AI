import React from 'react';
import { AlertTriangle, ZoomIn, Focus } from 'lucide-react';

import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const EyeTab = ({
  result,
  getSyncColor,
  setZoomedImage,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Focus size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Biological Metric: Eye & Gaze Dynamics</div>
              <div className="panel-subtitle">Blink rate and gaze convergence consistency</div>
            </div>
          </div>

          <TestExplanation testId="eye" explanation={result.eye_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            {result.eye_analysis.eye_plot_path && (
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.eye_analysis.eye_plot_path}`)}>
<img 
                  src={`${API_BASE}/${result.eye_analysis.eye_plot_path}`} 
                  alt="Eye Tracking Plot" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem' }}>Eye Aspect Ratio (EAR) Tracker</div>
              </div>
            )}

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.eye_analysis.eye_anomaly_score} 
                  label="Eye Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Eye tracking Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="Blink Rate" 
                    value={`${result.eye_analysis.blink_rate_per_min} BPM`} 
                    subValue="Blinks per minute" 
                    type={result.eye_analysis.blink_rate_per_min < 5 || result.eye_analysis.blink_rate_per_min > 50 ? 'warning' : 'neutral'} 
                  />
                  <MetricCard 
                    label="Gaze Asymmetry" 
                    value={result.eye_analysis.gaze_asymmetry.toFixed(3)} 
                    subValue="Left vs Right Eye Gaze" 
                    type={getSyncColor(result.eye_analysis.eye_anomaly_score)} 
                  />
                  {result.eye_analysis.warnings && result.eye_analysis.warnings.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Detection Warnings
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                        {result.eye_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
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

export default React.memo(EyeTab);
