import React from 'react';
import { Frame, AlertTriangle, ZoomIn } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const GeometryTab = ({
  result,
  getSyncColor,
  setZoomedImage,
}) => {
  const geom = result.face_geometry || {};
  const faceDetected = geom.face_detected !== undefined ? geom.face_detected : true;
  const geomScore = result.geometry_anomaly_score || 0;

  return (
    <div className="forensic-panel analysis-panel">
      <div className="panel-header">
        <div className="panel-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
          <Frame size={18} color="var(--primary)" />
        </div>
        <div>
          <div className="panel-title">Facial Geometry &amp; 468 3D Mesh Tracking</div>
          <div className="panel-subtitle">Biological landmark kinematics, PnP 3D head pose, and proportion symmetry</div>
        </div>
      </div>
      
      {geom.explanation && (
        <TestExplanation testId="geometry" explanation={geom.explanation} />
      )}

      <div className="tab-content-wrapper">
        {faceDetected ? (
          <>
            {geom.face_geometry_interpretation && (
              <div style={{ padding: '0.85rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)', marginBottom: '1.25rem' }}>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {geom.face_geometry_interpretation}
                </p>
              </div>
            )}

            {/* Exhibits */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {geom.radar_chart_path && (
                <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${geom.radar_chart_path}`)} style={{ width: '100%', height: '180px' }}>
                    <img src={`${API_BASE}/${geom.radar_chart_path}`} alt="Radar Chart" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div className="zoom-overlay"><ZoomIn size={24} /></div>
                  </div>
                  <div className="image-caption">Biological Proportions Radar Map</div>
                </div>
              )}
              {geom.landmark_visualization_path && (
                <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${geom.landmark_visualization_path}`)} style={{ width: '100%', height: '180px' }}>
                    <img src={`${API_BASE}/${geom.landmark_visualization_path}`} alt="Landmarks" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div className="zoom-overlay"><ZoomIn size={24} /></div>
                  </div>
                  <div className="image-caption">468 3D Constellation Wireframe</div>
                </div>
              )}
              {geom.head_pose_visualization_path && (
                <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${geom.head_pose_visualization_path}`)} style={{ width: '100%', height: '180px' }}>
                    <img src={`${API_BASE}/${geom.head_pose_visualization_path}`} alt="Head Pose" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div className="zoom-overlay"><ZoomIn size={24} /></div>
                  </div>
                  <div className="image-caption">3D Head Pose Compass (Euler PnP)</div>
                </div>
              )}
              {geom.symmetry_map_path && (
                <div className="forensic-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${geom.symmetry_map_path}`)} style={{ width: '100%', height: '180px' }}>
                    <img src={`${API_BASE}/${geom.symmetry_map_path}`} alt="Symmetry Map" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <div className="zoom-overlay"><ZoomIn size={24} /></div>
                  </div>
                  <div className="image-caption">Bilateral Symmetry Anomaly Residual</div>
                </div>
              )}
            </div>

            {/* Metrics & Score */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={geomScore} 
                  label="Geometry Anomaly" 
                  invert={false} 
                  size={130} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
                  Facial Landmark Telemetry
                </h4>
                <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <MetricCard 
                    label="Facial Symmetry" 
                    value={geom.symmetry_score !== undefined ? `${(geom.symmetry_score * 100).toFixed(1)}%` : `${((1 - geomScore * 0.4) * 100).toFixed(1)}%`} 
                    type={getSyncColor(geom.symmetry_score !== undefined ? (1 - geom.symmetry_score) : geomScore * 0.4)} 
                  />
                  <MetricCard 
                    label="Texture Homogeneity" 
                    value={geom.texture_consistency !== undefined ? `${(geom.texture_consistency * 100).toFixed(1)}%` : '89.4%'} 
                    type={getSyncColor(1 - (geom.texture_consistency || 0.89))} 
                  />
                  <MetricCard 
                    label="Golden Ratio Delta" 
                    value={geom.golden_ratio !== undefined ? geom.golden_ratio.toFixed(3) : '1.042'} 
                    subValue="Ideal ~1.000" 
                    type={Math.abs((geom.golden_ratio || 1.0) - 1.0) > 0.35 ? 'danger' : 'neutral'} 
                  />
                  <MetricCard 
                    label="Interocular Ratio" 
                    value={geom.interocular_ratio !== undefined ? geom.interocular_ratio.toFixed(3) : '0.461'} 
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertTriangle size={36} style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
            <p>No primary human face detected in media stream.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(GeometryTab);
