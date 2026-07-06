import React from 'react';
import { Lightbulb } from 'lucide-react';

import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LightingTab = ({
  result,
  getScoreColor,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Illumination Estimation</div>
              <div className="panel-subtitle">Detecting spliced lighting inconsistencies</div>
            </div>
          </div>
          
          <TestExplanation testId="lighting" explanation={result.lighting_analysis.explanation} />
          
          <div className="analysis-grid">
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Divergence Angle</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: result.lighting_analysis.angle_difference > 45 ? 'var(--danger)' : 'var(--success)' }}>
                {result.lighting_analysis.angle_difference}°
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Difference between Face & BG light source
              </div>
            </div>
            
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Anomaly Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: getScoreColor(result.lighting_analysis.lighting_anomaly_score) }}>
                {(result.lighting_analysis.lighting_anomaly_score * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Higher = Inconsistent Lighting
              </div>
            </div>
          </div>

          {result.lighting_analysis.lighting_map_path && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <img 
                src={`${API_BASE}/${result.lighting_analysis.lighting_map_path}`} 
                alt="Lighting Direction Vectors" 
                className="result-img" 
                style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }} 
              />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Arrows indicate the dominant 2D illumination direction extracted from image gradients.
              </p>
            </div>
          )}
          
          {result.lighting_analysis.warnings && result.lighting_analysis.warnings.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)' }}>
              {result.lighting_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>• {w}</div>)}
            </div>
          )}
        </div>
    </>
  );
};

export default React.memo(LightingTab);
