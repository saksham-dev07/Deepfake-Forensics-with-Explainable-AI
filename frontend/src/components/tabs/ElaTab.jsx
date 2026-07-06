import React from 'react';
import { Search, ZoomIn } from 'lucide-react';

import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const ElaTab = ({
  result,
  setZoomedImage,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Search size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Error Level Analysis (ELA)</div>
              <div className="panel-subtitle">JPEG Compression History & Chrominance Anomalies</div>
            </div>
          </div>

          <TestExplanation testId="ela" explanation={result.ela_analysis.explanation} />

          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {result.ela_analysis.ela_image_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.ela_image_path}`)}>
                  <img src={`${API_BASE}/${result.ela_analysis.ela_image_path}`} alt="Standard ELA" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>Standard ELA Variance</div>
                </div>
              )}
              {result.ela_analysis.ghosting_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.ghosting_path}`)}>
                  <img src={`${API_BASE}/${result.ela_analysis.ghosting_path}`} alt="JPEG Ghosting" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>JPEG Ghosting Map</div>
                </div>
              )}
              {result.ela_analysis.hsv_ela_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.hsv_ela_path}`)}>
                  <img src={`${API_BASE}/${result.ela_analysis.hsv_ela_path}`} alt="HSV ELA" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>HSV Saturation ELA</div>
                </div>
              )}
            </div>

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.ela_score} 
                  label="Compression Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Compression Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="Smooth Region Anomaly" 
                    value={result.ela_analysis.ela_smooth_anomaly !== undefined ? `${(result.ela_analysis.ela_smooth_anomaly * 100).toFixed(2)}%` : 'N/A'} 
                    type={result.ela_analysis.ela_smooth_anomaly > 0.4 ? 'danger' : 'neutral'} 
                  />
                  <MetricCard 
                    label="JPEG Ghosting Variance" 
                    value={result.ela_analysis.ghost_variance !== undefined ? result.ela_analysis.ghost_variance.toFixed(2) : 'N/A'} 
                    type={result.ela_analysis.ghost_variance > 10.0 ? 'warning' : 'neutral'} 
                  />
                  <MetricCard 
                    label="Base ELA Variance" 
                    value={result.ela_analysis.ela_base_variance !== undefined ? `${(result.ela_analysis.ela_base_variance * 100).toFixed(2)}%` : 'N/A'} 
                  />
                  <MetricCard 
                    label="HSV Saturation Variance" 
                    value={result.ela_analysis.hsv_variance !== undefined ? result.ela_analysis.hsv_variance.toFixed(2) : 'N/A'} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default React.memo(ElaTab);
