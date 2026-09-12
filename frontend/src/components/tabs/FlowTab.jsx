import React from 'react';
import { Activity, AlertTriangle, ZoomIn, Info, Wind } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const FlowTab = ({
  result = {},
  getSyncColor = () => 'neutral',
  setZoomedImage = () => {},
}) => {
  const data = result.flow_analysis || {};
  const anomalyScore = typeof data.flow_anomaly_score === 'number' ? data.flow_anomaly_score : 0;
  const motionVar = typeof data.mean_motion_variance === 'number' ? data.mean_motion_variance : null;
  const jitter = data.explanation?.variables?.["Variance of Variances (Jitter)"] || (typeof data.jitter === 'number' ? data.jitter.toFixed(4) : 'N/A');

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const plotUrl = resolveImg(data.flow_plot_path);
  const fieldUrl = resolveImg(data.flow_field_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wind size={18} color="var(--info)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Dense Optical Flow &amp; Temporal Motion Kinematics
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Farnebäck dense polynomial motion field estimation, frame-to-frame pixel trajectory, and jitter spikes
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: Farnebäck Polynomial 2-Frame Flow
          </span>
        </div>

        {data.explanation && <TestExplanation testId="flow" explanation={data.explanation} />}

        {/* Dual Motion Exhibits (Plot & HSV Flow Field) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {plotUrl && (
            <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Temporal Motion Variance Tracker
                </span>
                <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Velocity Profile
                </span>
              </div>

              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(plotUrl)}
                style={{ maxHeight: '280px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
              >
                <img src={plotUrl} alt="Optical Flow Plot" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="zoom-overlay"><ZoomIn size={24} /></div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                Detects sudden frame-to-frame velocity discontinuities
              </div>
            </div>
          )}

          {fieldUrl && (
            <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  HSV Vector Motion Field
                </span>
                <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Hue = Angle | Value = Speed
                </span>
              </div>

              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(fieldUrl)}
                style={{ maxHeight: '280px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
              >
                <img src={fieldUrl} alt="Flow Field HSV" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                <div className="zoom-overlay"><ZoomIn size={24} /></div>
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                Dense pixel-level motion directionality map
              </div>
            </div>
          )}
        </div>

        {/* Score Ring & Motion Tracking Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '180px' }}>
            <ScoreRing 
              score={anomalyScore} 
              label="Motion Anomaly" 
              invert={false} 
              size={120} 
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
              {anomalyScore > 0.6 ? 'High Temporal Jitter' : 'Smooth Physical Continuity'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <MetricCard 
              label="Mean Motion Variance" 
              value={motionVar !== null ? motionVar.toFixed(4) : '0.0000'} 
              subValue="Kinematic Energy Dispersion" 
              type={getSyncColor(anomalyScore)} 
            />

            <MetricCard 
              label="Temporal Jitter Spikes" 
              value={jitter} 
              subValue="Variance of Inter-frame Variances" 
              type={anomalyScore > 0.6 ? 'danger' : 'neutral'} 
            />

            <MetricCard 
              label="Boundary Flow Coherence" 
              value={anomalyScore > 0.5 ? 'WARPING DETECTED' : 'HOMOGENEOUS'} 
              subValue="Perimeter Fluid Dynamics" 
              type={anomalyScore > 0.5 ? 'danger' : 'success'} 
            />
          </div>
        </div>

        {/* Warnings Banner */}
        {data.warnings && data.warnings.length > 0 && (
          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={15} /> Motion Tracking Warnings
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

export default React.memo(FlowTab);
