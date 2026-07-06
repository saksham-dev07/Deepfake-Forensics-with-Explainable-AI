import React from 'react';
import { AlertTriangle, ZoomIn, Focus } from 'lucide-react';
import { Area } from 'recharts';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const CornealTab = ({
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
              <div className="panel-title">Corneal Optics & Reflection</div>
              <div className="panel-subtitle">Comparing left vs right eye lighting consistency</div>
            </div>
          </div>

          <TestExplanation testId="corneal" explanation={result.corneal_analysis.explanation} />
          
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <strong style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={14} /> WARNING: Inaccuracy on Blurry/Far Images
            </strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              This metric requires extremely high-resolution, clear, and well-lit closeups of the eyes to function correctly. If the person is far away, the image is blurry, or lighting is extremely dim, the anomaly score may be inaccurate or highly elevated. Its weight in the final ensemble calculation is heavily reduced to prevent false positives.
            </p>
          </div>

          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(`${API_BASE}/${result.corneal_analysis.corneal_map_path}`)}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <img
                  src={`${API_BASE}/${result.corneal_analysis.corneal_map_path}`}
                  alt="Corneal Highlights"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="zoom-overlay"><ZoomIn size={32} /></div>
              </div>
              <div className="image-caption" style={{ marginTop: '0.5rem' }}>Isolated Specular Highlights (Left vs Right Eye)</div>
            </div>

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.corneal_analysis.corneal_score} 
                  label="Corneal Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              {result.corneal_analysis.iou !== undefined && (
                <div style={{ flex: '1 1 300px' }}>
                  <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    Highlight Consistency Metrics
                  </h4>
                  <div className="metric-grid">
                    <MetricCard 
                      label="Highlight IoU" 
                      value={`${(result.corneal_analysis.iou * 100).toFixed(1)}%`} 
                      subValue="Intersection over Union" 
                      type={getSyncColor(1 - result.corneal_analysis.iou)} 
                    />
                    <MetricCard 
                      label="Structural Similarity" 
                      value={`${(result.corneal_analysis.ssim * 100).toFixed(1)}%`} 
                      subValue="SSIM between left and right mask" 
                      type={getSyncColor(1 - result.corneal_analysis.ssim)} 
                    />
                    {result.corneal_analysis.suppressed && (
                      <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', borderLeft: '3px solid var(--warning)', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          <AlertTriangle size={16} /> False Positive Suppressed
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {result.corneal_analysis.suppression_reason} The mathematical anomaly score was aggressively reduced to prevent a false positive.
                        </p>
                        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                          <div><strong style={{ color: 'var(--text-muted)' }}>Total Glare Area:</strong> {result.corneal_analysis.total_glare_area?.toFixed(1)} px</div>
                          <div><strong style={{ color: 'var(--text-muted)' }}>Asymmetry Ratio:</strong> {(result.corneal_analysis.area_diff_ratio * 100)?.toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  );
};

export default React.memo(CornealTab);
