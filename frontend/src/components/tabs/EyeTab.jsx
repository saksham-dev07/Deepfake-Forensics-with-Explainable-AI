import React from 'react';
import { Focus, AlertTriangle, ZoomIn, Info } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const EyeTab = ({
  result = {},
  getSyncColor = () => 'neutral',
  setZoomedImage = () => {},
}) => {
  const data = result.eye_analysis || {};
  const anomalyScore = typeof data.eye_anomaly_score === 'number' ? data.eye_anomaly_score : 0;
  const blinkRate = typeof data.blink_rate_per_min === 'number' ? data.blink_rate_per_min : null;
  const gazeAsym = typeof data.gaze_asymmetry === 'number' ? data.gaze_asymmetry : null;

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const plotUrl = resolveImg(data.eye_plot_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Focus size={18} color="var(--info)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Biological Metric: Eye Gaze Dynamics &amp; Blink Telemetry
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Eye Aspect Ratio (EAR) temporal tracking, spontaneous blink frequency, and stereo optical convergence
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: 68-Point Landmark EAR
          </span>
        </div>

        {data.explanation && <TestExplanation testId="eye" explanation={data.explanation} />}

        {/* EAR Tracker Visual Exhibit */}
        {plotUrl && (
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Temporal Eye Aspect Ratio (EAR) Curve &amp; Blink Signatures
              </span>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Soukupová &amp; Čech Algorithm
              </span>
            </div>

            <div 
              className="zoomable-image-container"
              onClick={() => setZoomedImage(plotUrl)}
              style={{ maxHeight: '360px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
            >
              <img 
                src={plotUrl} 
                alt="Eye Tracking Plot" 
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }} 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="zoom-overlay"><ZoomIn size={28} /></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>EAR measures vertical-to-horizontal landmark distance. Authentic blinks drop below 0.20 for 100–400ms. AI deepfakes either fail to blink or close eyes unnaturally.</span>
            </div>
          </div>
        )}

        {/* Score Ring & Eye Tracking Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '180px' }}>
            <ScoreRing 
              score={anomalyScore} 
              label="Gaze Anomaly" 
              invert={false} 
              size={120} 
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              {anomalyScore > 0.6 ? 'Abnormal Ocular Behavior' : 'Normal Physiological Gaze'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <MetricCard 
              label="Spontaneous Blink Rate" 
              value={blinkRate !== null ? `${blinkRate} BPM` : 'N/A'} 
              subValue="Normal Baseline: 12 – 20 BPM" 
              type={blinkRate !== null ? ((blinkRate < 5 || blinkRate > 50) ? 'warning' : 'success') : 'neutral'} 
            />

            <MetricCard 
              label="Stereo Gaze Asymmetry" 
              value={gazeAsym !== null ? gazeAsym.toFixed(3) : '0.000'} 
              subValue="Pupillary Vector Alignment" 
              type={getSyncColor(anomalyScore)} 
            />

            <MetricCard 
              label="Corneal Landmark Rigidity" 
              value={anomalyScore > 0.5 ? 'DEGRADED' : 'NOMINAL'} 
              subValue="6-Point Sclera Geometry" 
              type={anomalyScore > 0.5 ? 'danger' : 'success'} 
            />
          </div>
        </div>

        {/* Warnings Banner */}
        {data.warnings && data.warnings.length > 0 && (
          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={15} /> Ocular Kinematic Warnings
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

export default React.memo(EyeTab);
