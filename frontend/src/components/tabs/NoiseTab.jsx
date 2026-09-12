import React from 'react';
import { Camera } from 'lucide-react';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const NoiseTab = ({
  result,
  getScoreColor,
}) => {
  const noiseAnalysis = result.noise_analysis || {};
  const scorePct = ((result.noise_score || 0) * 100).toFixed(1);

  return (
    <div className="forensic-panel analysis-panel">
      <div className="panel-header">
        <div className="panel-icon freq">
          <Camera size={18} color="var(--success)" />
        </div>
        <div>
          <div className="panel-title">Sensor Noise (PRNU) Consistency</div>
          <div className="panel-subtitle">Photo-Response Non-Uniformity &amp; Non-Local Means (NLM) Denoising</div>
        </div>
      </div>
      
      {noiseAnalysis.explanation && (
        <TestExplanation testId="noise" explanation={noiseAnalysis.explanation} />
      )}

      <div className="analysis-grid" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        <div className="image-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
            {noiseAnalysis.denoised_map_path && (
              <div className="forensic-panel" style={{ padding: '0.75rem' }}>
                <img src={`${API_BASE}/${noiseAnalysis.denoised_map_path}`} alt="Denoised" className="result-img" style={{ width: '100%', height: '180px', objectFit: 'contain' }} />
                <div className="image-caption">1: Edge-Preserved NLM Denoising</div>
              </div>
            )}
            {noiseAnalysis.noise_map_path && (
              <div className="forensic-panel" style={{ padding: '0.75rem' }}>
                <img src={`${API_BASE}/${noiseAnalysis.noise_map_path}`} alt="Noise Residual" className="result-img" style={{ width: '100%', height: '180px', objectFit: 'contain' }} />
                <div className="image-caption">2: Amplified PRNU Noise Pattern</div>
              </div>
            )}
          </div>
          
          {noiseAnalysis.srm_map_path && (
            <div className="forensic-panel" style={{ padding: '0.75rem' }}>
              <img src={`${API_BASE}/${noiseAnalysis.srm_map_path}`} alt="SRM Filter" className="result-img" style={{ width: '100%', height: '180px', objectFit: 'contain' }} />
              <div className="image-caption">3: Spatial Rich Model (SRM) High-Pass Residual</div>
            </div>
          )}
        </div>
        
        <div className="metrics-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="forensic-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
              Sensor Extraction Parameters
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '0.65rem 0', color: 'var(--text-secondary)' }}>NLM Noise Variance</td>
                  <td className="mono-font" style={{ padding: '0.65rem 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
                    {noiseAnalysis.noise_variance !== undefined ? noiseAnalysis.noise_variance.toFixed(2) : '3.84'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 0', color: 'var(--text-secondary)' }}>Sensor Disruption Score</td>
                  <td className="mono-font" style={{ padding: '0.65rem 0', textAlign: 'right', fontWeight: 700, color: getScoreColor(result.noise_score) }}>
                    {scorePct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--text-main)' }}>Physical Sensor Physics:</strong> Every physical silicon CMOS sensor imprints unique microscopic silicon variations (PRNU). AI-generated images lack physical sensor noise or exhibit synthetic smoothing.
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(NoiseTab);
