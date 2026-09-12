import React from 'react';
import { ZoomIn, ScanSearch } from 'lucide-react';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const CfaTab = ({
  result,
  getScoreColor,
  setZoomedImage,
}) => {
  const cfaAnalysis = result.cfa_analysis || {};
  const cfaScore = cfaAnalysis.cfa_score !== undefined ? cfaAnalysis.cfa_score : (result.cfa_score || 0);
  const cfaImgUrl = cfaAnalysis.cfa_map_path ? `${API_BASE}/${cfaAnalysis.cfa_map_path}` : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {cfaAnalysis.explanation && (
        <TestExplanation testId="cfa" explanation={cfaAnalysis.explanation} />
      )}

      <div className="forensic-panel analysis-panel">
        <div className="panel-header">
          <div className="panel-icon shap">
            <ScanSearch size={18} color="var(--primary)" />
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="panel-title">Bayer CFA Demosaicing Residuals</div>
              <div className="panel-subtitle">High-pass 3×3 residual matrix isolating sensor demosaicing periodicity</div>
            </div>
            <div className="mono-font" style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(cfaScore) }}>
              {(cfaScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div style={{ minHeight: '260px' }}>
          {cfaImgUrl ? (
            <div 
              className="zoomable-image-container"
              onClick={() => setZoomedImage(cfaImgUrl)}
              style={{ maxHeight: '360px' }}
            >
              <img
                src={cfaImgUrl}
                alt="CFA Heatmap"
                className="heatmap-image"
                style={{ maxHeight: '360px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="zoom-overlay"><ZoomIn size={26} /></div>
            </div>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              Bayer CFA grid map unavailable for this media stream
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CfaTab);
