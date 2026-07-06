import React from 'react';
import { Frame, AlertTriangle, ZoomIn } from 'lucide-react';
import { Radar } from 'recharts';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const GeometryTab = ({
  result,
  getSyncColor,
  setZoomedImage,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon" style={{ background: 'rgba(52,211,153,0.12)' }}><Frame size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Facial Geometry & Texture Analysis</div>
              <div className="panel-subtitle">Biological proportion mapping and anomaly detection</div>
            </div>
          </div>
          
          <TestExplanation testId="geometry" explanation={result.face_geometry.explanation} />

          <div className="tab-content-wrapper">
            {result.face_geometry.face_detected ? (
              <>
                <div style={{ padding: '1rem', background: 'rgba(52,211,153,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52,211,153,0.1)', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {result.face_geometry.face_geometry_interpretation}
                  </p>
                </div>

                {/* HERO VISUALS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {result.face_geometry.radar_chart_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.radar_chart_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.radar_chart_path}`} alt="Radar Chart" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>Biological Proportions Radar Map</div>
                    </div>
                  )}
                  {result.face_geometry.landmark_visualization_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.landmark_visualization_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.landmark_visualization_path}`} alt="Landmarks" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>3D Constellation Wireframe</div>
                    </div>
                  )}
                  {result.face_geometry.head_pose_visualization_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.head_pose_visualization_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.head_pose_visualization_path}`} alt="3D Head Pose" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>3D Head Pose Compass (Pitch/Yaw/Roll)</div>
                    </div>
                  )}
                  {result.face_geometry.symmetry_map_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.symmetry_map_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.symmetry_map_path}`} alt="Symmetry Map" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>Symmetry Anomaly Heatmap</div>
                    </div>
                  )}
                  {result.face_geometry.temporal_jitter_plot_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: '1 / -1' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.temporal_jitter_plot_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.temporal_jitter_plot_path}`} alt="Temporal Jitter" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>Temporal Jitter Tracker (All Proportions)</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                  {/* MAIN SCORE RING */}
                  <div style={{ flex: '0 0 auto' }}>
                    <ScoreRing 
                      score={result.geometry_anomaly_score} 
                      label="Geometry Anomaly" 
                      invert={false} 
                      size={140} 
                    />
                  </div>
                  
                  {/* METRICS GRID */}
                  <div style={{ flex: '1 1 300px' }}>
                    <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                      Core Biological Metrics
                    </h4>
                    <div className="metric-grid">
                      {result.face_geometry.temporal_jitter_score != null && (
                        <MetricCard 
                          label="Temporal Jitter" 
                          value={`${(result.face_geometry.temporal_jitter_score * 100).toFixed(1)}%`} 
                          type={getSyncColor(result.face_geometry.temporal_jitter_score)} 
                        />
                      )}
                      <MetricCard 
                        label="Facial Symmetry" 
                        value={`${(result.face_geometry.symmetry_score * 100).toFixed(1)}%`} 
                        type={getSyncColor(1 - result.face_geometry.symmetry_score)} 
                      />
                      <MetricCard 
                        label="Texture Consistency" 
                        value={`${(result.face_geometry.texture_consistency * 100).toFixed(1)}%`} 
                        type={getSyncColor(1 - result.face_geometry.texture_consistency)} 
                      />
                      <MetricCard 
                        label="Noise Consistency" 
                        value={`${(result.face_geometry.noise_consistency * 100).toFixed(1)}%`} 
                        type={getSyncColor(1 - result.face_geometry.noise_consistency)} 
                      />
                      {result.face_geometry.golden_ratio != null && (
                        <MetricCard 
                          label="Vertical Proportion" 
                          value={result.face_geometry.golden_ratio.toFixed(3)} 
                          subValue="Ideal ~1.000" 
                          type={Math.abs(result.face_geometry.golden_ratio - 1.0) > 0.35 ? 'danger' : 'neutral'} 
                        />
                      )}
                      {result.face_geometry.interocular_ratio != null && (
                        <MetricCard 
                          label="Interocular Ratio" 
                          value={result.face_geometry.interocular_ratio.toFixed(3)} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertTriangle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>No face detected in the analyzed frame.</p>
              </div>
            )}
          </div>
        </div>
    </>
  );
};

export default React.memo(GeometryTab);
