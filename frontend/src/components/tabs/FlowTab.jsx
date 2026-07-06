import React from 'react';
import { Activity, AlertTriangle, ZoomIn } from 'lucide-react';

import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FlowTab = ({
  result,
  getSyncColor,
  setZoomedImage,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Activity size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Dense Optical Flow Analysis</div>
              <div className="panel-subtitle">Temporal consistency and motion vector tracking</div>
            </div>
          </div>

          <TestExplanation testId="flow" explanation={result.flow_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {result.flow_analysis.flow_plot_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.flow_analysis.flow_plot_path}`)}>
                  <img src={`${API_BASE}/${result.flow_analysis.flow_plot_path}`} alt="Optical Flow Plot" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>Motion Variance Tracker</div>
                </div>
              )}
              {result.flow_analysis.flow_field_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.flow_analysis.flow_field_path}`)}>
                  <img src={`${API_BASE}/${result.flow_analysis.flow_field_path}`} alt="Flow Field HSV" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>HSV Motion Vector Field (Pixel Flow)</div>
                </div>
              )}
            </div>

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.flow_analysis.flow_anomaly_score} 
                  label="Motion Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Motion Tracking Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="Mean Motion Variance" 
                    value={result.flow_analysis.mean_motion_variance.toFixed(4)} 
                    type={getSyncColor(result.flow_analysis.flow_anomaly_score)} 
                  />
                  {result.flow_analysis.warnings && result.flow_analysis.warnings.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Jitter Warnings
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                        {result.flow_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
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

export default React.memo(FlowTab);
