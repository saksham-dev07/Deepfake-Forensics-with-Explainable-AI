import React from 'react';
import { Volume2, CheckCircle2, AlertTriangle, ZoomIn, Info } from 'lucide-react';
import TestExplanation from '../ui/TestExplanation';
import MetricCard from '../ui/MetricCard';
import { API_BASE } from '../../constants/api';

const AudioTab = ({
  result = {},
  setZoomedImage = () => {},
}) => {
  const data = result.sync_analysis || result.audio_sync || {};

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const lseC = typeof data.lse_c === 'number' ? data.lse_c : null;
  const lseD = typeof data.lse_d === 'number' ? data.lse_d : null;
  const plotUrl = resolveImg(data.sync_plot_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Volume2 size={18} color="var(--warning)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Audio-Visual Synchronization (SyncNet 3D-CNN)
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Sub-millisecond audio-visual temporal alignment and phoneme-viseme correlation
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: 3D spatio-temporal conv
          </span>
        </div>

        {data.explanation && <TestExplanation testId="audio" explanation={data.explanation} />}

        {/* Sync Telemetry Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <MetricCard 
            label="Lip-Sync Confidence (LSE-C)"
            value={lseC !== null ? lseC.toFixed(2) : 'N/A'}
            subValue="Target: > 6.00 for Authentic"
            type={lseC !== null ? (lseC > 6 ? 'success' : 'danger') : 'neutral'}
          />

          <MetricCard 
            label="Feature Distance (LSE-D)"
            value={lseD !== null ? lseD.toFixed(2) : 'N/A'}
            subValue="Target: < 7.00 for Synchronous"
            type={lseD !== null ? (lseD < 7 ? 'success' : 'danger') : 'neutral'}
          />

          <MetricCard 
            label="Phoneme-Viseme Alignment"
            value={lseD !== null && lseC !== null ? (lseC > 6 && lseD < 7 ? 'SYNCHRONIZED' : 'DESYNCHRONIZED') : (data.error ? 'UNAVAILABLE' : 'AUDITED')}
            subValue="Acoustic-Oral Temporal Offset"
            type={lseD !== null && lseC !== null ? (lseC > 6 && lseD < 7 ? 'success' : 'danger') : 'neutral'}
          />
        </div>

        {/* Sync Plot Visual Exhibit */}
        <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Temporal Cross-Correlation Cross-Check
            </span>
            <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Offset Range: -15 to +15 Frames
            </span>
          </div>

          {plotUrl ? (
            <div 
              className="zoomable-image-container"
              onClick={() => setZoomedImage(plotUrl)}
              style={{ maxHeight: '360px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
            >
              <img 
                src={plotUrl} 
                alt="Audio-Visual Sync Plot" 
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }} 
              />
              <div className="zoom-overlay"><ZoomIn size={28} /></div>
            </div>
          ) : (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {data.error || 'Audio sync waveform telemetry not available for this medium (e.g. silent video or single still frame).'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>SyncNet calculates Euclidean distance between 3D-CNN lip motion embeddings and MFCC audio embeddings across sliding 5-frame temporal windows.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AudioTab);
