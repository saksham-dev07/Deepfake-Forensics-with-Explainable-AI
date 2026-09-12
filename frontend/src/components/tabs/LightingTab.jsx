import React from 'react';
import { Lightbulb, AlertTriangle, ZoomIn, Info, Compass } from 'lucide-react';
import TestExplanation from '../ui/TestExplanation';
import MetricCard from '../ui/MetricCard';
import { API_BASE } from '../../constants/api';

const LightingTab = ({
  result = {},
  getScoreColor = () => 'var(--primary)',
  setZoomedImage = () => {},
}) => {
  const data = result.lighting_analysis || {};
  const angleDiff = typeof data.angle_difference === 'number' ? data.angle_difference : null;
  const anomalyScore = typeof data.lighting_anomaly_score === 'number' ? data.lighting_anomaly_score : 0;

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const mapUrl = resolveImg(data.lighting_map_path);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={18} color="var(--warning)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Physical Illumination &amp; Spherical Harmonics
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                3D Spherical Harmonics (Order 2, 9D coefficients) &amp; background circular lighting vector divergence
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: 3D Spherical Harmonics
          </span>
        </div>

        {data.explanation && <TestExplanation testId="lighting" explanation={data.explanation} />}

        {/* Telemetry Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <MetricCard 
            label="Light Divergence Angle" 
            value={angleDiff !== null ? `${angleDiff.toFixed(1)}°` : 'N/A'} 
            subValue="Target: < 45.0° for Coherent Scene" 
            type={angleDiff !== null ? (angleDiff > 45 ? 'danger' : 'success') : 'neutral'} 
          />

          <MetricCard 
            label="Lighting Anomaly Score" 
            value={`${(anomalyScore * 100).toFixed(1)}%`} 
            subValue="Higher = Directional Discrepancy" 
            type={anomalyScore > 0.6 ? 'danger' : anomalyScore > 0.35 ? 'warning' : 'success'} 
          />

          <MetricCard 
            label="Illumination Coherence" 
            value={angleDiff !== null ? (angleDiff > 45 ? 'DIVERGENT LIGHT' : 'COHERENT LIGHT') : 'AUDITED'} 
            subValue="Subject vs Background Geometry" 
            type={angleDiff !== null ? (angleDiff > 45 ? 'danger' : 'success') : 'neutral'} 
          />
        </div>

        {/* Lighting Map Visual Exhibit */}
        {mapUrl && (
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Estimated 3D Illumination Direction Vectors
              </span>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Virtual Chrome Sphere Probe
              </span>
            </div>

            <div 
              className="zoomable-image-container"
              onClick={() => setZoomedImage(mapUrl)}
              style={{ maxHeight: '360px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05070a', borderRadius: '4px' }}
            >
              <img 
                src={mapUrl} 
                alt="Lighting Direction Vectors" 
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }} 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="zoom-overlay"><ZoomIn size={28} /></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>Vector arrows and chrome probe illustrate estimated environmental lighting. Spliced face swaps frequently have shadows inconsistent with background light sources.</span>
            </div>
          </div>
        )}

        {/* Warnings Banner */}
        {data.warnings && data.warnings.length > 0 && (
          <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <AlertTriangle size={15} /> Optical Illumination Warnings
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

export default React.memo(LightingTab);
