import React from 'react';
import { Flame, Search, Info, ZoomIn } from 'lucide-react';

import TestDefinition from '../ui/TestDefinition';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const VisualTab = ({
  result,
  getScoreColor,
  setZoomedImage,
}) => {
  return (
    <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TestDefinition testId="visual" />

          <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'stretch' }}>
            
            {/* Neural Net Result Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="panel-header" style={{ marginBottom: 0 }}>
                <div className="panel-icon gradcam"><Flame size={20} color="var(--danger)" /></div>
                <div>
                  <div className="panel-title">Neural Network Analysis</div>
                  <div className="panel-subtitle">EfficientNet-B4 Spatial Processing</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>EfficientNet-B4 Anomaly</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: getScoreColor(result.nn_score) }}>
                    {(result.nn_score * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ width: '80px', height: '80px', position: 'relative' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={getScoreColor(result.nn_score)}
                      strokeWidth="3.5"
                      strokeDasharray={`${result.nn_score * 100}, 100`}
                      style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                    />
                  </svg>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>The core neural network scans the raw pixels of the image looking for deepfake artifacts like blending errors, unnatural textures, and warping.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>What this score means:</strong> A score of {(result.nn_score * 100).toFixed(1)}% indicates the base neural network's raw assessment of synthetic manipulation, before any other physical or biological forensic sensors are consulted.</p>
              </div>
            </div>

            {/* GradCAM Visualization Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.12)' }}><Search size={20} color="var(--accent)" /></div>
                <div>
                  <div className="panel-title">GradCAM Localization</div>
                  <div className="panel-subtitle">Where the neural network is looking</div>
                </div>
              </div>
              <div className="heatmap-container" style={{ position: 'relative', display: 'flex', gap: '1rem', overflowX: 'auto', background: 'transparent', padding: '0.5rem 0', flex: 1 }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Coarse Localization</h4>
                  <div 
                    className="zoomable-image-container" 
                    onClick={() => {
                      if (result.heatmaps && result.heatmaps.length > 0) {
                        setZoomedImage(`${API_BASE}/${result.heatmaps[0]}`);
                      }
                    }}
                  >
                    {result.heatmaps && result.heatmaps.length > 0 ? (
                      <img
                        src={`${API_BASE}/${result.heatmaps[0]}`}
                        alt="GradCAM Heatmap"
                        className="heatmap-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        <p>Heatmap unavailable</p>
                      </div>
                    )}
                    <div className="zoom-overlay">
                      <ZoomIn size={32} />
                    </div>
                  </div>
                </div>
                {result.heatmaps && result.heatmaps.length > 1 && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Pixel Gradients</h4>
                    <div 
                      className="zoomable-image-container"
                      onClick={() => setZoomedImage(`${API_BASE}/${result.heatmaps[1]}`)}
                    >
                      <img
                        src={`${API_BASE}/${result.heatmaps[1]}`}
                        alt="Guided GradCAM Heatmap"
                        className="heatmap-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="zoom-overlay">
                        <ZoomIn size={32} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="heatmap-legend" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>Red/warm areas = high neural network attention.</span>
              </div>
            </div>

          </div>
        </div>
    </>
  );
};

export default React.memo(VisualTab);
