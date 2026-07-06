import React from 'react';
import { Activity, AlertTriangle, ZoomIn } from 'lucide-react';

import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const RppgTab = ({
  result,
  setZoomedImage,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon"><Activity size={20} color={result.rppg_analysis.has_pulse ? "var(--success)" : "var(--danger)"} /></div>
            <div>
              <div className="panel-title">Biological Signal (rPPG)</div>
              <div className="panel-subtitle">Heartbeat detection via micro-color changes</div>
            </div>
          </div>
          
          <TestExplanation testId="rppg" explanation={result.rppg_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            {result.rppg_analysis.signal_plot_path && (
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.rppg_analysis.signal_plot_path}`)}>
<img 
                  src={`${API_BASE}/${result.rppg_analysis.signal_plot_path}`} 
                  alt="rPPG Signal Spectrum" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem' }}>Dual-Panel PPG Waveform & Power Spectrum (FFT)</div>
              </div>
            )}

            {/* METRICS GRID */}
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <MetricCard 
                label="Detected Heart Rate" 
                value={result.rppg_analysis.has_pulse ? `${result.rppg_analysis.heart_rate} BPM` : 'None'} 
                subValue={result.rppg_analysis.has_pulse ? 'Human Pulse Detected' : 'Static/Synthetic Face'} 
                type={result.rppg_analysis.has_pulse ? 'success' : 'danger'} 
              />
              <MetricCard 
                label="Signal-to-Noise Ratio (SNR)" 
                value={result.rppg_analysis.snr} 
                subValue="Peak Prominence" 
                type={result.rppg_analysis.snr > 1.5 ? 'success' : 'warning'} 
              />
            </div>

            {result.rppg_analysis.warnings && result.rppg_analysis.warnings.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Analysis Warnings
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                  {result.rppg_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
    </>
  );
};

export default React.memo(RppgTab);
