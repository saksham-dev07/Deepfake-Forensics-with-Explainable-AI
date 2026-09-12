import React from 'react';
import { Volume2, AlertTriangle, ZoomIn, Info } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const VoiceTab = ({
  result = {},
  getSyncColor = () => 'neutral',
  setZoomedImage = () => {},
}) => {
  const data = result.voice_analysis || {};
  const anomalyScore = typeof data.voice_anomaly_score === 'number' ? data.voice_anomaly_score : 0;

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const plotUrl = resolveImg(data.voice_plot_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Volume2 size={18} color="var(--info)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Voice Forensics &amp; Acoustic Anti-Spoofing
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Detection of vocoder synthesis, phase discontinuities, and cloned voice artifacts
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: 2D-CNN Mel Spectrogram
          </span>
        </div>

        {data.explanation && <TestExplanation testId="voice" explanation={data.explanation} />}

        {/* Dual Panel Mel-Spectrogram Visual Exhibit */}
        {plotUrl && (
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Raw Waveform &amp; Mel-Frequency Spectrogram (Magma dB)
              </span>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                128-Mel Filterbanks | 22.05 kHz
              </span>
            </div>

            <div 
              className="zoomable-image-container"
              onClick={() => setZoomedImage(plotUrl)}
              style={{ maxHeight: '360px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
            >
              <img 
                src={plotUrl} 
                alt="Voice Spoofing Plot" 
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="zoom-overlay"><ZoomIn size={28} /></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>Vocoders (HiFi-GAN, WaveGlow) leave faint harmonic repetition patterns above 8 kHz and phase inconsistencies.</span>
            </div>
          </div>
        )}

        {/* Score Ring & Acoustic Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '180px' }}>
            <ScoreRing 
              score={anomalyScore} 
              label="Audio Anomaly" 
              invert={false} 
              size={120} 
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              {anomalyScore > 0.6 ? 'Acoustic Spoofing Detected' : 'Natural Acoustic Dynamics'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <MetricCard 
              label="ZCR Variance" 
              value={typeof data.zcr_variance === 'number' ? data.zcr_variance.toFixed(5) : '0.00000'} 
              subValue="Zero-Crossing Rate Dynamics" 
              type={getSyncColor(anomalyScore)} 
            />

            <MetricCard 
              label="High-Freq Ratio" 
              value={typeof data.high_freq_ratio === 'number' ? data.high_freq_ratio.toFixed(4) : '0.0000'} 
              subValue="Upper-Band Harmonic Shift" 
              type={getSyncColor(anomalyScore)} 
            />

            <MetricCard 
              label="85% Spectral Rolloff" 
              value={data.spectral_rolloff_mean ? `${data.spectral_rolloff_mean.toFixed(0)} Hz` : 'N/A'} 
              subValue="High-Frequency Energy Ceiling" 
              type={data.spectral_rolloff_mean && data.spectral_rolloff_mean < 3000 ? 'warning' : 'neutral'} 
            />

            <MetricCard 
              label="Vocoder Artifact Index" 
              value={anomalyScore > 0.5 ? 'ELEVATED' : 'NOMINAL'} 
              subValue="Neural Vocoder Synthesis" 
              type={anomalyScore > 0.5 ? 'danger' : 'success'} 
            />
          </div>
        </div>

        {/* Forensic Warnings Banner */}
        {data.warnings && data.warnings.length > 0 && (
          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={15} /> Acoustic Spoofing Warnings
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

export default React.memo(VoiceTab);
