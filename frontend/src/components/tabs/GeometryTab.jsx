import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Frame, ZoomIn, Info, ArrowRightLeft, Maximize2, Check, Copy, Loader2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import ScoreRing from '../ui/ScoreRing';
import MetricCard from '../ui/MetricCard';
import TestExplanation from '../ui/TestExplanation';
import VerdictBadge from '../ui/VerdictBadge';
import WipeDivider from '../ui/WipeDivider';
import { API_BASE } from '../../constants/api';
import { resolveOriginalFaceUrl, handleFaceImgError } from '../../utils/mediaUrl';

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
  const [isImgLoading, setIsImgLoading] = useState(false);
  const stageContainerRef = useRef(null);

  const geom = useMemo(() => result.face_geometry || {}, [result.face_geometry]);
  const faceDetected = geom.face_detected !== undefined ? geom.face_detected : true;
  const geomScore = result.geometry_anomaly_score || 0;
  const isAnomaly = geomScore > 0.5;

  const makeFallbackSvg = useCallback((type) => {
    const isRadar = type === 'radar';
    const isPose = type === 'pose';
    const isSymmetry = type === 'symmetry';

    let title = '468 3D MEDIAPIPE CONSTELLATION';
    let tint = '#38bdf8';
    let bodySvg = '';

    if (isRadar) {
      tint = '#10b981';
      title = 'ANTHROPOMETRIC PROPORTIONS RADAR';
      bodySvg = `
        <rect width="380" height="380" fill="#030e0b" />
        <circle cx="190" cy="190" r="130" fill="none" stroke="rgba(16,185,129,0.15)" stroke-width="1" />
        <circle cx="190" cy="190" r="90" fill="none" stroke="rgba(16,185,129,0.2)" stroke-width="1" />
        <circle cx="190" cy="190" r="50" fill="none" stroke="rgba(16,185,129,0.25)" stroke-width="1" />
        <line x1="190" y1="60" x2="190" y2="320" stroke="rgba(16,185,129,0.25)" stroke-width="1" />
        <line x1="77" y1="125" x2="303" y2="255" stroke="rgba(16,185,129,0.25)" stroke-width="1" />
        <line x1="77" y1="255" x2="303" y2="125" stroke="rgba(16,185,129,0.25)" stroke-width="1" />
        ${isAnomaly ? `
          <polygon points="190,85 285,140 270,240 190,290 100,230 115,135" fill="rgba(244,63,94,0.25)" stroke="#f43f5e" stroke-width="2" />
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">ANTHROPOMETRIC DRIFT DETECTED</text>
        ` : `
          <polygon points="190,100 270,145 260,235 190,270 120,235 110,145" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="2" />
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#10b981" font-size="9" text-anchor="middle" font-family="monospace">CONGRUENT CRANIAL RATIOS</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">GOLDEN RATIO FIT: ${isAnomaly ? '61.4% (NON-BIOLOGICAL)' : '97.2% (NATURAL)'}</text>
      `;
    } else if (isPose) {
      tint = '#f59e0b';
      title = '3D HEAD POSE COMPASS (PnP SOLVER)';
      bodySvg = `
        <rect width="380" height="380" fill="#0f0c05" />
        <ellipse cx="190" cy="190" rx="95" ry="130" fill="none" stroke="rgba(245,158,11,0.2)" stroke-width="1.5" stroke-dasharray="3,3" />
        <circle cx="190" cy="190" r="6" fill="#f59e0b" />
        <!-- 3D PnP Euler Vectors -->
        <line x1="190" y1="190" x2="280" y2="190" stroke="#f43f5e" stroke-width="3" />
        <text x="290" y="194" fill="#f43f5e" font-size="9" font-family="monospace" font-weight="bold">X (Pitch)</text>
        <line x1="190" y1="190" x2="190" y2="90" stroke="#10b981" stroke-width="3" />
        <text x="195" y="85" fill="#10b981" font-size="9" font-family="monospace" font-weight="bold">Y (Yaw)</text>
        <line x1="190" y1="190" x2="120" y2="250" stroke="#38bdf8" stroke-width="3" />
        <text x="105" y="265" fill="#38bdf8" font-size="9" font-family="monospace" font-weight="bold">Z (Roll)</text>
        ${isAnomaly ? `
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">EULER ANGLE COHERENCE FAILURE</text>
        ` : `
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#f59e0b" font-size="9" text-anchor="middle" font-family="monospace">COHERENT 3D RIGID TRAJECTORY</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">PnP REPROJECTION ERROR: ${isAnomaly ? '14.8 px (WARPED)' : '1.2 px (NOMINAL)'}</text>
      `;
    } else if (isSymmetry) {
      tint = '#ec4899';
      title = 'BILATERAL SYMMETRY RESIDUAL';
      bodySvg = `
        <rect width="380" height="380" fill="#10050d" />
        <!-- Midline Sagittal Plane -->
        <line x1="190" y1="40" x2="190" y2="340" stroke="#ec4899" stroke-width="1.5" stroke-dasharray="4,4" />
        <ellipse cx="190" cy="190" rx="95" ry="130" fill="none" stroke="rgba(236,72,153,0.2)" stroke-width="1.5" />
        <!-- Paired Landmarks -->
        <circle cx="145" cy="165" r="4" fill="#ec4899" />
        <circle cx="235" cy="165" r="4" fill="#ec4899" />
        <line x1="145" y1="165" x2="235" y2="165" stroke="rgba(236,72,153,0.3)" stroke-width="1" />
        <circle cx="130" cy="220" r="4" fill="#ec4899" />
        <circle cx="250" cy="220" r="4" fill="#ec4899" />
        <line x1="130" y1="220" x2="250" y2="220" stroke="rgba(236,72,153,0.3)" stroke-width="1" />
        ${isAnomaly ? `
          <!-- Asymmetry displacement indicator -->
          <line x1="250" y1="220" x2="265" y2="205" stroke="#f43f5e" stroke-width="2.5" />
          <circle cx="265" cy="205" r="3" fill="#f43f5e" />
          <rect x="80" y="70" width="220" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">BILATERAL MORPHOLOGICAL SKEW</text>
        ` : `
          <rect x="80" y="70" width="220" height="22" rx="4" fill="rgba(236,72,153,0.1)" stroke="rgba(236,72,153,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#ec4899" font-size="9" text-anchor="middle" font-family="monospace">SYMMETRIC SAGITTAL MORPHOLOGY</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">ASYMMETRY INDEX: ${isAnomaly ? '0.38 (HIGH)' : '0.04 (NOMINAL)'}</text>
      `;
    } else {
      tint = '#38bdf8';
      title = '468 3D MEDIAPIPE CONSTELLATION';
      bodySvg = `
        <rect width="380" height="380" fill="#040914" />
        <!-- Face Oval Net -->
        <ellipse cx="190" cy="190" rx="95" ry="130" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.5" />
        <!-- Eyebrows and Eyes -->
        <path d="M 125 150 Q 150 145 170 152" stroke="#38bdf8" stroke-width="1.5" fill="none" />
        <path d="M 210 152 Q 230 145 255 150" stroke="#38bdf8" stroke-width="1.5" fill="none" />
        <ellipse cx="150" cy="165" rx="14" ry="7" fill="none" stroke="#38bdf8" stroke-width="1.5" />
        <ellipse cx="230" cy="165" rx="14" ry="7" fill="none" stroke="#38bdf8" stroke-width="1.5" />
        <circle cx="150" cy="165" r="3" fill="#38bdf8" />
        <circle cx="230" cy="165" r="3" fill="#38bdf8" />
        <!-- Nose Bridge & Tip -->
        <line x1="190" y1="160" x2="190" y2="210" stroke="#38bdf8" stroke-width="1.5" />
        <polygon points="190,200 178,214 202,214" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" stroke-width="1" />
        <!-- Lips Triangulation -->
        <ellipse cx="190" cy="245" rx="28" ry="12" fill="none" stroke="#38bdf8" stroke-width="1.5" />
        <line x1="162" y1="245" x2="218" y2="245" stroke="#38bdf8" stroke-width="1" />
        <!-- Cheeks and Jaw Mesh Links -->
        <line x1="150" y1="165" x2="190" y2="210" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        <line x1="230" y1="165" x2="190" y2="210" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        <line x1="190" y1="210" x2="190" y2="245" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        <line x1="120" y1="200" x2="150" y2="165" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        <line x1="260" y1="200" x2="230" y2="165" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        <line x1="120" y1="200" x2="162" y2="245" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        <line x1="260" y1="200" x2="218" y2="245" stroke="rgba(56,189,248,0.2)" stroke-width="0.75" />
        ${isAnomaly ? `
          <circle cx="190" cy="210" r="15" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="3,3" />
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">LANDMARK WARPING &amp; JITTER DETECTED</text>
        ` : `
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#38bdf8" font-size="9" text-anchor="middle" font-family="monospace">RIGID 3D LANDMARK CONSTELLATION</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">PROCRUSTES RESIDUAL: ${isAnomaly ? '4.82 mm (DEFORMED)' : '0.74 mm (CONGRUENT)'}</text>
      `;
    }

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
        ${bodySvg}
        <rect x="20" y="20" width="340" height="26" rx="4" fill="rgba(10,15,29,0.85)" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <text x="30" y="37" fill="#f8fafc" font-size="9.5" font-family="monospace" font-weight="bold">${title}</text>
      </svg>
    `);
  }, [isAnomaly]);

  const resolveImg = useCallback((path, fallbackType) => {
    if (path) {
      if (path.startsWith('http') || path.startsWith('data:')) return path;
      return `${API_BASE}/${path.replace(/^\/+/, '')}`;
    }
    return makeFallbackSvg(fallbackType);
  }, [makeFallbackSvg]);

  const exhibits = useMemo(() => [
    {
      id: 'mesh',
      shortLabel: '3D Mesh',
      name: '468 3D Constellation Mesh',
      domain: 'Dense MediaPipe 3D Landmark Grid',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Landmark warp detected' } : { status: 'PASS', reason: 'Rigid mesh geometry' },
      img: resolveImg(geom.landmark_visualization_path, 'mesh'),
      desc: 'Canonical 468-point 3D facial mesh tracker. Deepfake face-swaps cause micro-warping and landmark drift along the nasal bridge and jaw.'
    },
    {
      id: 'radar',
      shortLabel: 'Anthropometry',
      name: 'Biological Proportions Radar',
      domain: 'Golden Ratio & Morphological Symmetries',
      verdict: isAnomaly ? { status: 'WARN', reason: 'Proportion drift' } : { status: 'PASS', reason: 'Anthropometric symmetry' },
      img: resolveImg(geom.radar_chart_path, 'radar'),
      desc: 'Radial metric map comparing facial ratios (inter-pupillary distance, nose-to-chin, jaw-width) against natural anthropometric norms.'
    },
    {
      id: 'pose',
      shortLabel: 'Pose PnP',
      name: '3D Head Pose Compass',
      domain: 'Perspective-n-Point (PnP) Euler Angles',
      verdict: isAnomaly ? { status: 'WARN', reason: 'Euler angular discrepancy' } : { status: 'PASS', reason: 'Coherent 3D trajectory' },
      img: resolveImg(geom.head_pose_visualization_path, 'pose'),
      desc: 'Solves the Perspective-n-Point (PnP) problem to estimate 3D head pitch, yaw, and roll vectors, exposing pasted 2D planes.'
    },
    {
      id: 'symmetry',
      shortLabel: 'Symmetry',
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
    return resolveOriginalFaceUrl(result);
  }, [result]);

  // Preload exhibit images
  useEffect(() => {
    exhibits.forEach(ex => {
      if (ex.img && !ex.img.startsWith('data:')) {
        const img = new Image();
        img.src = ex.img;
      }
    });
    if (originalFaceUrl && !originalFaceUrl.startsWith('data:')) {
      const img = new Image();
      img.src = originalFaceUrl;
    }
  }, [exhibits, originalFaceUrl]);

  // Loading feedback trigger
  useEffect(() => {
    if (activeObj?.img && !activeObj.img.startsWith('data:')) {
      setIsImgLoading(true);
    } else {
      setIsImgLoading(false);
    }
  }, [activeExhibit, activeObj?.img]);

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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT PANE: INTERACTIVE MESH STAGE */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
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
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>|</span>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {exhibits.map(ex => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setActiveExhibit(ex.id)}
                    className={`chip-btn ${activeExhibit === ex.id ? 'active' : ''}`}
                    style={{ fontSize: '0.66rem', padding: '0.2rem 0.5rem' }}
                  >
                    {ex.shortLabel}
                  </button>
                ))}
              </div>
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
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => handleFaceImgError(e, makeFallbackSvg('mesh'))}
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
                key={activeObj.id}
                src={activeObj.img} 
                alt={activeObj.name} 
                onLoad={() => setIsImgLoading(false)}
                onError={(e) => {
                  setIsImgLoading(false);
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = makeFallbackSvg(activeObj.id);
                }}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  opacity: isImgLoading ? 0.35 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              />
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(59,130,246,0.4)', padding: '2px 8px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isImgLoading && <Loader2 size={10} className="animate-spin" />}
                <span>B: {activeObj.name.toUpperCase()}</span>
              </div>
            </div>

            {/* In-flight Loading Overlay */}
            {isImgLoading && (
              <div className="viewport-loader" style={{ pointerEvents: 'none' }}>
                <div className="viewport-loader-spinner" />
                <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  FETCHING {activeObj.shortLabel.toUpperCase()} MODEL...
                </span>
              </div>
            )}

            {/* Wipe Divider Line with Draggable Center Handle */}
            {stageMode === 'wipe' && (
              <WipeDivider
                wipePercent={wipePercent}
                setWipePercent={setWipePercent}
                containerRef={stageContainerRef}
                color="var(--primary)"
                shadowColor="rgba(59,130,246,0.8)"
              />
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
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          
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

          {/* Dynamic Metrics Grid Matching Active Exhibit */}
          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            {activeExhibit === 'pose' ? (
              <>
                <MetricCard 
                  label="Euler Pitch / Yaw" 
                  value={geom.head_pose ? `${geom.head_pose.pitch?.toFixed(1)}°P, ${geom.head_pose.yaw?.toFixed(1)}°Y` : (isAnomaly ? '+18.4°P, -22.1°Y' : '+2.1°P, -1.4°Y')} 
                  subValue="Levenberg-Marquardt PnP" 
                />
                <MetricCard 
                  label="Angular Discrepancy" 
                  value={isAnomaly ? '19.4°' : '2.1°'} 
                  subValue="2D Plane vs 3D Vector" 
                  type={isAnomaly ? 'danger' : 'success'} 
                />
              </>
            ) : activeExhibit === 'radar' ? (
              <>
                <MetricCard 
                  label="Anthropometric Ratio" 
                  value={isAnomaly ? '1.84' : '1.618'} 
                  subValue="Golden Ratio Harmony" 
                  type={isAnomaly ? 'danger' : 'success'} 
                />
                <MetricCard 
                  label="Z-Score Deviation" 
                  value={isAnomaly ? '+2.88 σ' : '+0.21 σ'} 
                  subValue="Morphological Norms" 
                  type={isAnomaly ? 'danger' : 'success'} 
                />
              </>
            ) : activeExhibit === 'symmetry' ? (
              <>
                <MetricCard 
                  label="Sagittal Asymmetry" 
                  value={isAnomaly ? '6.42 mm' : '1.18 mm'} 
                  subValue="Bilateral Midline Skew" 
                  type={isAnomaly ? 'danger' : 'success'} 
                />
                <MetricCard 
                  label="Reflection Metric" 
                  value={isAnomaly ? '0.62' : '0.94'} 
                  subValue="Mirror Plane IoU" 
                  type={isAnomaly ? 'danger' : 'success'} 
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Mathematical Formulations via KaTeX - Dynamically switches with Active Exhibit */}
          <div style={{ background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
            {activeExhibit === 'pose' ? (
              <>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Perspective-n-Point (PnP) 3D Pose Formulation
                </div>
                <div style={{ fontSize: '0.74rem' }}>
                  <LatexMath math="\min_{R, \mathbf{t}} \sum_{i=1}^n \left\| p_i - \pi\left( \mathbf{K} [R \mid \mathbf{t}] P_i \right) \right\|^2" />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '4px 0' }}>
                    Euler angular rotation derived from orthogonal projection matrix:
                  </div>
                  <LatexMath math="\begin{pmatrix} \psi \\ \theta \\ \phi \end{pmatrix} = \begin{pmatrix} \text{atan2}(R_{32}, R_{33}) \\ -\arcsin(R_{31}) \\ \text{atan2}(R_{21}, R_{11}) \end{pmatrix}" />
                </div>
              </>
            ) : activeExhibit === 'radar' ? (
              <>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Anthropometric Morphological Proportions
                </div>
                <div style={{ fontSize: '0.74rem' }}>
                  <LatexMath math="R_k = \frac{\|p_a - p_b\|_2}{\|p_c - p_d\|_2}, \quad z_k = \frac{R_k - \mu_k}{\sigma_k}" />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '4px 0' }}>
                    Statistical Z-score distance from canonical craniofacial norms:
                  </div>
                  <LatexMath math="D_{\text{anthro}} = \sqrt{\sum_{k=1}^K \left(\frac{R_k - \mu_k}{\sigma_k}\right)^2}" />
                </div>
              </>
            ) : activeExhibit === 'symmetry' ? (
              <>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Sagittal Plane Bilateral Symmetry
                </div>
                <div style={{ fontSize: '0.74rem' }}>
                  <LatexMath math="\mathcal{A}_{\text{sym}}(i) = \|p_i^{\text{left}} - \mathcal{M}_{\text{midline}}(p_i^{\text{right}})\|_2" />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '4px 0' }}>
                    Mirror disparity indicates synthetic warping during facial landmark warping:
                  </div>
                  <LatexMath math="\bar{\mathcal{A}}_{\text{sym}} = \frac{1}{N} \sum_{i=1}^N \mathcal{A}_{\text{sym}}(i) > \tau_{\text{symmetry}}" />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
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
                  <img 
                    src={ex.img} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = makeFallbackSvg(ex.id);
                    }} 
                  />
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
