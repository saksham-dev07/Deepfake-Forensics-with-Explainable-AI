import React from 'react';
import { Camera } from 'lucide-react';

import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const NoiseTab = ({
  result,
  getScoreColor,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon freq"><Camera size={20} color="var(--text-muted)" /></div>
            <div>
              <div className="panel-title">Sensor Noise (PRNU) Consistency</div>
              <div className="panel-subtitle">Analysis of invisible camera sensor noise patterns</div>
            </div>
          </div>
          
          <TestExplanation testId="noise" explanation={result.noise_analysis.explanation} />

          <div className="analysis-grid">
            <div className="image-container" style={{ flex: '1.5' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {result.noise_analysis?.denoised_map_path && (
                  <div>
                    <img src={`${API_BASE}/${result.noise_analysis.denoised_map_path}`} alt="Denoised Image" className="result-img" style={{ height: '240px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">Step 1: Edge-Preserved NLM Denoising</div>
                  </div>
                )}
                {result.noise_analysis?.noise_map_path && (
                  <div>
                    <img src={`${API_BASE}/${result.noise_analysis.noise_map_path}`} alt="Noise Residual Map" className="result-img" style={{ height: '240px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">Step 2: Amplified PRNU Noise Print</div>
                  </div>
                )}
              </div>
              
              {result.noise_analysis?.srm_map_path && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div>
                    <img src={`${API_BASE}/${result.noise_analysis.srm_map_path}`} alt="SRM Noise Filter" className="result-img" style={{ height: '240px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption" style={{ background: 'rgba(236,72,153,0.1)' }}>Step 3: Spatial Rich Model (SRM) High-Pass Filter — Reveals manipulation boundaries</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="metrics-container">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Noise Extraction Metrics
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Noise Variance</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {result.noise_analysis?.noise_variance !== undefined ? result.noise_analysis.noise_variance.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Anomaly Score</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: getScoreColor(result.noise_score) }}>
                      {(result.noise_score * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  A very low noise variance typically indicates synthetic smoothing by a generative AI model.
                </p>
              </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default React.memo(NoiseTab);
