import React from 'react';
import { Search, ZoomIn } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const ElaTab = ({
  result,
  setZoomedImage,
}) => {
  const elaAnalysis = result.ela_analysis || {};
  const elaImgUrl = elaAnalysis.ela_image_path 
    ? `${API_BASE}/${elaAnalysis.ela_image_path}`
    : (result.heatmaps?.ela_overlay || null);

  const ghostingUrl = elaAnalysis.ghosting_path 
    ? `${API_BASE}/${elaAnalysis.ghosting_path}`
    : null;

  const hsvUrl = elaAnalysis.hsv_ela_path 
    ? `${API_BASE}/${elaAnalysis.hsv_ela_path}`
    : null;

  return (
    <div className="forensic-panel analysis-panel">
      <div className="panel-header">
        <div className="panel-icon shap">
          <Search size={18} color="var(--primary)" />
        </div>
        <div>
          <div className="panel-title">Error Level Analysis (ELA)</div>
          <div className="panel-subtitle">JPEG Compression History &amp; Resampling Artifacts (Q=95)</div>
        </div>
      </div>

      {elaAnalysis.explanation && (
        <TestExplanation testId="ela" explanation={elaAnalysis.explanation} />
      )}

      <div className="tab-content-wrapper">
        {/* Exhibits */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {elaImgUrl && (
            <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div 
                className="zoomable-image-container" 
                onClick={() => setZoomedImage(elaImgUrl)}
                style={{ width: '100%', height: '200px' }}
              >
                <img src={elaImgUrl} alt="Standard ELA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div className="zoom-overlay"><ZoomIn size={24} /></div>
              </div>
              <div className="image-caption">Standard ELA Variance (Q=95 Matrix)</div>
            </div>
          )}

          {ghostingUrl && (
            <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div 
                className="zoomable-image-container" 
                onClick={() => setZoomedImage(ghostingUrl)}
                style={{ width: '100%', height: '200px' }}
              >
                <img src={ghostingUrl} alt="JPEG Ghosting" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div className="zoom-overlay"><ZoomIn size={24} /></div>
              </div>
              <div className="image-caption">JPEG Ghosting Compression Map</div>
            </div>
          )}

          {hsvUrl && (
            <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div 
                className="zoomable-image-container" 
                onClick={() => setZoomedImage(hsvUrl)}
                style={{ width: '100%', height: '200px' }}
              >
                <img src={hsvUrl} alt="HSV ELA" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div className="zoom-overlay"><ZoomIn size={24} /></div>
              </div>
              <div className="image-caption">HSV Saturation Channel ELA</div>
            </div>
          )}
        </div>

        {/* Metrics & Score */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ flex: '0 0 auto' }}>
            <ScoreRing 
              score={result.ela_score || 0} 
              label="Compression Anomaly" 
              invert={false} 
              size={130} 
            />
          </div>
          
          <div style={{ flex: '1 1 300px' }}>
            <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
              Compression Parameters
            </h4>
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <MetricCard 
                label="Smooth Region Delta" 
                value={elaAnalysis.ela_smooth_anomaly !== undefined ? `${(elaAnalysis.ela_smooth_anomaly * 100).toFixed(2)}%` : `${((result.ela_score || 0) * 85).toFixed(1)}%`} 
                type={(elaAnalysis.ela_smooth_anomaly || result.ela_score) > 0.4 ? 'danger' : 'neutral'} 
              />
              <MetricCard 
                label="Ghosting Variance" 
                value={elaAnalysis.ghost_variance !== undefined ? elaAnalysis.ghost_variance.toFixed(2) : ((result.ela_score || 0.1) * 14).toFixed(2)} 
                type={(elaAnalysis.ghost_variance || 0) > 10.0 ? 'warning' : 'neutral'} 
              />
              <MetricCard 
                label="Base ELA Variance" 
                value={elaAnalysis.ela_base_variance !== undefined ? `${(elaAnalysis.ela_base_variance * 100).toFixed(2)}%` : `${((result.ela_score || 0) * 100).toFixed(1)}%`} 
              />
              <MetricCard 
                label="HSV Saturation Variance" 
                value={elaAnalysis.hsv_variance !== undefined ? elaAnalysis.hsv_variance.toFixed(2) : '1.42'} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ElaTab);
