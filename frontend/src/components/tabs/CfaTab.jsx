import React from 'react';
import { ZoomIn, ScanSearch } from 'lucide-react';

import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const CfaTab = ({
  result,
  getScoreColor,
  setZoomedImage,
}) => {
  return (
    <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TestExplanation testId="cfa" explanation={result.cfa_analysis.explanation} />

          <div className="glass-panel analysis-panel">
            <div className="panel-header">
              <div className="panel-icon shap"><ScanSearch size={20} color="var(--primary)" /></div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="panel-title">Bayer Filter Noise Map</div>
                  <div className="panel-subtitle">Highlighting underlying camera hardware signatures</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(result.cfa_analysis.cfa_score) }}>
                  {(result.cfa_analysis.cfa_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="heatmap-container" style={{ minHeight: '300px' }}>
              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(`${API_BASE}/${result.cfa_analysis.cfa_map_path}`)}
              >
                <img
                  src={`${API_BASE}/${result.cfa_analysis.cfa_map_path}`}
                  alt="CFA Heatmap"
                  className="heatmap-image"
                  style={{ maxHeight: '400px' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="zoom-overlay"><ZoomIn size={32} /></div>
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default React.memo(CfaTab);
