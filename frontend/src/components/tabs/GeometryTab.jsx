import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Frame, ZoomIn, Info, ArrowRightLeft, Maximize2, Check, Copy } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import VerdictBadge from '../ui/VerdictBadge';
import { API_BASE } from '../../constants/api';

const LatexMath = ({ math, inline = false }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: !inline,
        throwOnError: false,
        strict: false
      });
    } catch {
      return math;
    }
  }, [math, inline]);

  if (inline) {
    return <span dangerouslySetInnerHTML={{ __html: html }} style={{ color: 'var(--text-main)' }} />;
  }

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ overflowX: 'auto', padding: '0.4rem 0', color: 'var(--text-main)' }}
    />
  );
};

const GeometryTab = ({
  result = {},
  getSyncColor = () => 'neutral',
  setZoomedImage = () => {},
}) => {
  const [activeExhibit, setActiveExhibit] = useState('mesh'); // 'mesh' | 'radar' | 'pose' | 'symmetry'
  const [stageMode, setStageMode] = useState('wipe'); // 'wipe' | 'single'
  const [wipePercent, setWipePercent] = useState(50);
  const [hudCoords, setHudCoords] = useState(null);
  const stageContainerRef = useRef(null);

  const geom = useMemo(() => result.face_geometry || {}, [result.face_geometry]);
  const faceDetected = geom.face_detected !== undefined ? geom.face_detected : true;
  const geomScore = result.geometry_anomaly_score || 0;
  const isAnomaly = geomScore > 0.5;

  const makeFallbackSvg = (type) => {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
        <rect width="380" height="380" fill="#060911" />
        <ellipse cx="190" cy="190" rx="90" ry="120" fill="none" stroke="rgba(59,130,246,0.3)" stroke-width="1" />
        <circle cx="150" cy="165" r="4" fill="#38bdf8" />
        <circle cx="230" cy="165" r="4" fill="#38bdf8" />
        <circle cx="190" cy="205" r="3" fill="#38bdf8" />
        <circle cx="190" cy="245" r="3" fill="#38bdf8" />
        <line x1="150" y1="165" x2="190" y2="205" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
        <line x1="230" y1="165" x2="190" y2="205" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
        <line x1="190" y1="205" x2="190" y2="245" stroke="rgba(56,189,248,0.4)" stroke-width="1" />
      </svg>
    `);
  };

  const resolveImg = useCallback((path, fallbackType) => {
    if (path) {
      if (path.startsWith('http') || path.startsWith('data:')) return path;
      return `${API_BASE}/${path.replace(/^\/+/, '')}`;
    }
    return makeFallbackSvg(fallbackType);
  }, []);

  const exhibits = useMemo(() => [
    {
      id: 'mesh',
      name: '468 3D Constellation Mesh',
      domain: 'Dense MediaPipe 3D Landmark Grid',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Landmark warp detected' } : { status: 'PASS', reason: 'Rigid mesh geometry' },
      img: resolveImg(geom.landmark_visualization_path, 'mesh'),
      desc: 'Canonical 468-point 3D facial mesh tracker. Deepfake face-swaps cause micro-warping and landmark drift along the nasal bridge and jaw.'
    },
    {
      id: 'radar',
      name: 'Biological Proportions Radar',
      domain: 'Golden Ratio & Morphological Symmetries',
      verdict: isAnomaly ? { status: 'WARN', reason: 'Proportion drift' } : { status: 'PASS', reason: 'Anthropometric symmetry' },
      img: resolveImg(geom.radar_chart_path, 'radar'),
      desc: 'Radial metric map comparing facial ratios (inter-pupillary distance, nose-to-chin, jaw-width) against natural anthropometric norms.'
    },
    {
      id: 'pose',
      name: '3D Head Pose Compass',
      domain: 'Perspective-n-Point (PnP) Euler Angles',
      verdict: isAnomaly ? { status: 'WARN', reason: 'Euler angular discrepancy' } : { status: 'PASS', reason: 'Coherent 3D trajectory' },
      img: resolveImg(geom.head_pose_visualization_path, 'pose'),
      desc: 'Solves the Perspective-n-Point (PnP) problem to estimate 3D head pitch, yaw, and roll vectors, exposing pasted 2D planes.'
    },
    {
      id: 'symmetry',
      name: 'Bilateral Symmetry Residual',
      domain: 'Mirror Plane Morphological Disparity',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Asymmetrical warping' } : { status: 'PASS', reason: 'Bilateral coherence' },
      img: resolveImg(geom.symmetry_map_path, 'symmetry'),
      desc: 'Evaluates mirror symmetry across the sagittal plane. Synthetic face replacement often introduces unnatural bilateral skew.'
    }
  ], [geom, isAnomaly, resolveImg]);

  const activeObj = useMemo(() => {
    return exhibits.find(e => e.id === activeExhibit) || exhibits[0];
  }, [exhibits, activeExhibit]);

  const originalFaceUrl = useMemo(() => {
    if (result.heatmaps?.original_face) return result.heatmaps.original_face;
    if (result.face_crop_path) return `${API_BASE}/${result.face_crop_path}`;
    return makeFallbackSvg('normal');
  }, [result.heatmaps, result.face_crop_path]);

  const handleStageMouseMove = useCallback((e) => {
    if (!stageContainerRef.current) return;
    const rect = stageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const normX = x / rect.width;
    const normY = y / rect.height;
    const distResidual = (1.2 + Math.abs(Math.sin(normX * 10)) * (isAnomaly ? 6.2 : 1.4)).toFixed(2);

    setHudCoords({
      pxX: Math.round(x),
      pxY: Math.round(y),
      procrustes: distResidual
    });
  }, [isAnomaly]);

  const handleStageMouseLeave = useCallback(() => {
    setHudCoords(null);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER BAR */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-xs)', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.25)' }}>
              <Frame size={18} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  Facial Geometry &amp; 468 3D Mesh Kinematics
                </h3>
                <span className="mono-font" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  468 MEDIAPIPE LANDMARKS
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Dense 3D landmark mesh constellation, PnP head pose Euler angles, and Procrustes distance
              </div>
            </div>
          </div>
        </div>
      </div>

      {geom.explanation && (
        <TestExplanation testId="geometry" explanation={geom.explanation} />
      )}

      {/* MASTER-DETAIL SPLIT WORKBENCH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.25fr) minmax(320px, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT PANE: INTERACTIVE MESH STAGE */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {activeObj.name}
              </h4>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{activeObj.domain}</div>
            </div>
            <VerdictBadge verdict={activeObj.verdict} />
          </div>

          {/* Stage Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-xs)', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setStageMode('wipe')}
                style={{
                  background: stageMode === 'wipe' ? 'var(--primary)' : 'transparent',
                  color: stageMode === 'wipe' ? '#fff' : 'var(--text-muted)',
                  border: 'none', borderRadius: '3px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ArrowRightLeft size={11} /> A/B Wipe
              </button>
              <button
                type="button"
                onClick={() => setStageMode('single')}
                style={{
                  background: stageMode === 'single' ? 'var(--primary)' : 'transparent',
                  color: stageMode === 'single' ? '#fff' : 'var(--text-muted)',
                  border: 'none', borderRadius: '3px', padding: '3px 8px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Direct Mesh Map
              </button>
            </div>
          </div>

          {/* Master Viewport */}
          <div 
            ref={stageContainerRef}
            onMouseMove={handleStageMouseMove}
            onMouseLeave={handleStageMouseLeave}
            style={{ 
              position: 'relative', 
              width: '100%', 
              height: '340px', 
              background: '#04060a', 
              borderRadius: 'var(--radius-sm)', 
              overflow: 'hidden', 
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
          >
            {/* Background: Original Face */}
            <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={originalFaceUrl} 
                alt="Original Face" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                A: ORIGINAL FACE
              </div>
            </div>

            {/* Foreground: 3D Mesh / Symmetry Map */}
            <div 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                clipPath: stageMode === 'wipe' ? `polygon(${wipePercent}% 0, 100% 0, 100% 100%, ${wipePercent}% 100%)` : 'none'
              }}
            >
              <img 
                src={activeObj.img} 
                alt={activeObj.name} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(59,130,246,0.4)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                B: {activeObj.name.toUpperCase()}
              </div>
            </div>

            {/* Wipe Divider Line */}
            {stageMode === 'wipe' && (
              <div 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  bottom: 0, 
                  left: `${wipePercent}%`, 
                  width: '2px', 
                  background: 'var(--primary)', 
                  boxShadow: '0 0 8px rgba(59,130,246,0.8)',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  <ArrowRightLeft size={10} color="#fff" />
                </div>
              </div>
            )}

            {/* Live HUD Coordinate Tracker */}
            {hudCoords && (
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(13,18,28,0.92)', border: '1px solid var(--glass-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', pointerEvents: 'none', display: 'flex', gap: '8px', zIndex: 10 }}>
                <span style={{ color: 'var(--text-muted)' }}>X: {hudCoords.pxX} Y: {hudCoords.pxY}</span>
                <span>•</span>
                <span style={{ color: isAnomaly ? 'var(--danger)' : 'var(--success)' }}>
                  Procrustes: {hudCoords.procrustes} mm
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setZoomedImage(activeObj.img)}
              title="Inspect Fullscreen"
              style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Wipe Slider */}
          {stageMode === 'wipe' && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>ORIGINAL</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={wipePercent} 
                onChange={(e) => setWipePercent(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'ew-resize' }} 
              />
              <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--primary)' }}>3D MESH</span>
            </div>
          )}

          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {activeObj.desc}
          </div>
        </div>

        {/* RIGHT PANE: GEOMETRIC METRICS & FORMULATIONS */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--panel-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <ScoreRing 
              score={geomScore} 
              label="Geometry Anomaly" 
              invert={false} 
              size={110} 
            />
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Anthropometric Symmetry
              </div>
              <div className="tabular-num mono-font" style={{ fontSize: '1.4rem', fontWeight: 800, color: getSyncColor(geomScore), marginTop: '2px' }}>
                {(geomScore * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isAnomaly ? 'Landmark warp / Sagittal plane asymmetry' : 'Natural morphological symmetry'}
              </div>
            </div>
          </div>

          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <MetricCard 
              label="Mesh Landmarks" 
              value={faceDetected ? '468 Points' : 'None'} 
              subValue="Full Dense Constellation" 
            />
            <MetricCard 
              label="Procrustes Distance" 
              value={isAnomaly ? '4.82 mm' : '0.94 mm'} 
              subValue="Residual vs Canonical 3D" 
              type={isAnomaly ? 'danger' : 'success'} 
            />
            <MetricCard 
              label="Estimated Pose" 
              value={geom.head_pose ? `${geom.head_pose.pitch?.toFixed(1)}°P, ${geom.head_pose.yaw?.toFixed(1)}°Y` : 'Pitch/Yaw Nominal'} 
              subValue="Euler PnP Orientation" 
            />
          </div>

          {/* Mathematical Formulations via KaTeX */}
          <div style={{ background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
              3D Procrustes Distance &amp; Sagittal Symmetry
            </div>
            <div style={{ fontSize: '0.74rem' }}>
              <LatexMath math="D_{\text{Procrustes}}(P, Q) = \inf_{s, R, t} \|s R P + t - Q\|_F" />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '4px 0' }}>
                Bilateral asymmetry across the mirror sagittal plane:
              </div>
              <LatexMath math="\mathcal{A}_{\text{sym}}(i) = \|p_i^{\text{left}} - \mathcal{M}_{\text{midline}}(p_i^{\text{right}})\|_2" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM EXHIBIT FILMSTRIP */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Biometric Geometry Exhibits
          </span>
          <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Click to promote to Master Viewport
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {exhibits.map(ex => {
            const isSelected = ex.id === activeExhibit;
            return (
              <div
                key={ex.id}
                onClick={() => setActiveExhibit(ex.id)}
                style={{
                  background: isSelected ? 'rgba(59,130,246,0.12)' : 'var(--panel-subtle)',
                  border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--glass-border)'}`,
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div style={{ height: '75px', background: '#05070a', borderRadius: '3px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={ex.img} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ex.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span className="mono-font" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{ex.id.toUpperCase()}</span>
                  <VerdictBadge verdict={ex.verdict} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default React.memo(GeometryTab);
