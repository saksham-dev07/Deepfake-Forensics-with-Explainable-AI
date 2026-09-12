import React from 'react';
import { Activity, AlertTriangle, ZoomIn, Info, Heart } from 'lucide-react';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const RppgTab = ({
  result = {},
  setZoomedImage = () => {},
}) => {
  const data = result.rppg_analysis || {};
  const hasPulse = Boolean(data.has_pulse);
  const hr = data.heart_rate ?? null;
  const snr = typeof data.snr === 'number' ? data.snr : null;

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const plotUrl = resolveImg(data.signal_plot_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color={hasPulse ? 'var(--success)' : 'var(--danger)'} />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Biological Hemodynamic Pulse (Remote Photoplethysmography / rPPG)
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Sub-dermal blood perfusion pulse extraction via CHROM &amp; POS algorithmic chrominance filtering
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: Chrominance PPG
          </span>
        </div>

        {data.explanation && <TestExplanation testId="rppg" explanation={data.explanation} />}

        {/* Dual-Panel PPG Waveform & Power Spectrum */}
        {plotUrl && (
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Extracted Hemodynamic Waveform &amp; Fourier Power Spectrum
              </span>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Bandpass: 0.75 Hz – 2.5 Hz (45 – 150 BPM)
              </span>
            </div>

            <div 
              className="zoomable-image-container"
              onClick={() => setZoomedImage(plotUrl)}
              style={{ maxHeight: '360px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
            >
              <img 
                src={plotUrl} 
                alt="rPPG Signal Spectrum" 
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="zoom-overlay"><ZoomIn size={28} /></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>Real human faces display periodic capillary flush matching cardiac cycles. Generative deepfakes lack systemic hemodynamic blood flow.</span>
            </div>
          </div>
        )}

        {/* Telemetry Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <MetricCard 
            label="Cardiovascular Pulse State" 
            value={hasPulse ? 'PULSE DETECTED' : 'ABSENT / SYNTHETIC'} 
            subValue={hasPulse ? 'Physiological Micro-Flush' : 'No Cardiovascular Periodicity'} 
            type={hasPulse ? 'success' : 'danger'} 
          />

          <MetricCard 
            label="Estimated Heart Rate" 
            value={hr ? `${hr} BPM` : 'None / Static'} 
            subValue="Spectral Peak Frequency" 
            type={hasPulse ? 'success' : 'danger'} 
          />

          <MetricCard 
            label="Signal-to-Noise Ratio (SNR)" 
            value={snr !== null ? `${snr.toFixed(2)} dB` : (data.snr || 'N/A')} 
            subValue="Fourier Peak Prominence" 
            type={snr !== null && snr > 1.5 ? 'success' : (hasPulse ? 'warning' : 'danger')} 
          />
        </div>

        {/* Forensic Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={15} /> Biological Telemetry Warnings
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              {data.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(RppgTab);
