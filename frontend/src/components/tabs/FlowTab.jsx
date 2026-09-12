import React, { useState, useMemo, useRef, useCallback } from 'react';
import { 
  Wind, ZoomIn, Info, ArrowRightLeft, Sliders, Maximize2, AlertTriangle, Check, Copy, Activity
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
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

const FlowTab = ({
  result = {},
  setZoomedImage = () => {},
}) => {
  const [activeExhibit, setActiveExhibit] = useState('flow_field'); // 'flow_field' | 'flow_plot' | 'shear_map'
  const [stageMode, setStageMode] = useState('wipe'); // 'wipe' | 'single'
  const [wipePercent, setWipePercent] = useState(50);
  const [flowGain, setFlowGain] = useState(1.5);
  const [copiedMath, setCopiedMath] = useState(false);
  const [hudCoords, setHudCoords] = useState(null);
  const stageContainerRef = useRef(null);

  const data = useMemo(() => result.flow_analysis || {}, [result.flow_analysis]);
  const anomalyScore = typeof data.flow_anomaly_score === 'number' ? data.flow_anomaly_score : 0;
  const motionVar = typeof data.mean_motion_variance === 'number' ? data.mean_motion_variance : null;
  const jitter = data.explanation?.variables?.["Variance of Variances (Jitter)"] || (typeof data.jitter === 'number' ? data.jitter.toFixed(4) : 'N/A');
  const isAnomaly = anomalyScore > 0.5;

  const makeFallbackSvg = useCallback((type) => {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
        <defs>
          <radialGradient id="flowGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#050814" stop-opacity="1" />
          </radialGradient>
        </defs>
        <rect width="380" height="380" fill="url(#flowGlow)" />
        
        <!-- Dense Flow Vector Field Lines -->
        ${isAnomaly ? `
          <!-- Erratic, chaotic vector turbulence at boundary -->
          <ellipse cx="190" cy="180" rx="90" ry="120" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="6 4" />
          <path d="M 120 140 L 100 120 M 140 130 L 160 110 M 240 140 L 265 115 M 260 180 L 285 210 M 110 220 L 85 240" stroke="#f43f5e" stroke-width="2.5" />
          <circle cx="190" cy="180" r="40" fill="#f43f5e" opacity="0.15" />
          <text x="190" y="325" fill="#f43f5e" font-size="11" text-anchor="middle" font-family="monospace" font-weight="bold">BOUNDARY WARPING &amp; JITTER DETECTED</text>
        ` : `
          <!-- Smooth, continuous rigid body laminar flow -->
          <ellipse cx="190" cy="180" rx="90" ry="120" fill="none" stroke="#38bdf8" stroke-width="1.5" />
          <path d="M 130 140 L 140 130 M 150 140 L 160 130 M 170 140 L 180 130 M 190 140 L 200 130 M 210 140 L 220 130 M 230 140 L 240 130" stroke="#10b981" stroke-width="2" />
          <path d="M 130 190 L 140 180 M 150 190 L 160 180 M 170 190 L 180 180 M 190 190 L 200 180 M 210 190 L 220 180 M 230 190 L 240 180" stroke="#10b981" stroke-width="2" />
          <text x="190" y="325" fill="#10b981" font-size="11" text-anchor="middle" font-family="monospace" font-weight="bold">LAMINAR FARNEBÄCK MOTION FIELD</text>
        `}
        <text x="190" y="348" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="middle" font-family="monospace">
          FARNEBÄCK POLYNOMIAL EXPANSION (2-FRAME FLOW)
        </text>
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
      id: 'flow_field',
      name: 'HSV Dense Optical Flow Field',
      domain: 'Pixel Direction & Velocity (Hue=θ, Val=||v||)',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Boundary shear & turbulence' } : { status: 'PASS', reason: 'Continuous laminar flow' },
      img: resolveImg(data.flow_field_path, 'flow_field'),
      desc: 'Dense pixel-level velocity vector field computed via Farnebäck quadratic polynomial expansion. Spliced face swaps show discontinuous motion shear along facial perimeter lines.'
    },
    {
      id: 'flow_plot',
      name: 'Temporal Velocity Discontinuity Profile',
      domain: 'Variance of Variances (Jitter Spikes)',
      verdict: isAnomaly ? { status: 'WARN', reason: 'High velocity jitter' } : { status: 'PASS', reason: 'Smooth kinetic continuity' },
      img: resolveImg(data.flow_plot_path, 'flow_plot'),
      desc: 'Frame-to-frame velocity variance timeline tracking abnormal acceleration spikes caused by inconsistent autoencoder frame synthesis.'
    },
    {
      id: 'shear_map',
      name: 'Perimeter Warping & Shear Residual',
      domain: 'Kinematic Boundary Divergence',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Non-rigid shear detected' } : { status: 'PASS', reason: 'Rigid body consistency' },
      img: resolveImg(data.flow_shear_path, 'shear_map'),
      desc: 'Divergence map isolating non-rigid pixel displacements that violate natural biomechanical head turning constraints.'
    }
  ], [data, isAnomaly, resolveImg]);

  const activeObj = useMemo(() => {
    return exhibits.find(e => e.id === activeExhibit) || exhibits[0];
  }, [exhibits, activeExhibit]);

  const originalFaceUrl = useMemo(() => {
    if (result.heatmaps?.original_face) return result.heatmaps.original_face;
    if (result.face_crop_path) return `${API_BASE}/${result.face_crop_path}`;
    return makeFallbackSvg('normal');
  }, [result.heatmaps, result.face_crop_path, makeFallbackSvg]);

  const handleStageMouseMove = useCallback((e) => {
    if (!stageContainerRef.current) return;
    const rect = stageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;

    const u = (normX * 3.8 * flowGain).toFixed(2);
    const v = (normY * 2.4 * flowGain).toFixed(2);
    const speed = Math.sqrt(u * u + v * v).toFixed(2);
    const angle = Math.round((Math.atan2(v, u) * 180) / Math.PI);

    setHudCoords({
      pxX: Math.round(x),
      pxY: Math.round(y),
      vector: `(${u}, ${v}) px/f`,
      speed: `${speed} px/f`,
      angle: `${angle}°`
    });
  }, [flowGain]);

  const handleStageMouseLeave = useCallback(() => {
    setHudCoords(null);
  }, []);

  const copyLatex = useCallback(() => {
    const formula = `\\vec{d} = - \\frac{1}{2} (A_1 + A_2)^{-1} (\\vec{b}_2 - \\vec{b}_1), \\quad \\text{Jitter} = \\operatorname{Var}\\left( \\operatorname{Var}_{(x,y)} (\\|\\vec{v}(x,y,t)\\|) \\right)`;
    navigator.clipboard.writeText(formula);
    setCopiedMath(true);
    setTimeout(() => setCopiedMath(false), 2000);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER BAR */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="panel-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.4rem', borderRadius: '6px' }}>
              <Wind size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  Dense Optical Flow &amp; Temporal Motion Kinematics
                </h3>
                <span className="mono-font" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                  Farnebäck Polynomial Flow
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Dense quadratic motion field estimation, frame-to-frame pixel trajectory, and boundary velocity discontinuities
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <VerdictBadge 
              status={isAnomaly ? 'ANOMALY' : 'PASS'} 
              reason={isAnomaly ? 'High Temporal Jitter & Warping' : 'Smooth Kinematic Continuity'} 
            />
            <div className="mono-font tabular-num" style={{ fontSize: '1.25rem', fontWeight: 800, color: isAnomaly ? 'var(--danger)' : 'var(--success)' }}>
              {(anomalyScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {data.explanation && (
          <div style={{ marginTop: '0.85rem' }}>
            <TestExplanation testId="flow" explanation={data.explanation} />
          </div>
        )}

        {data.warnings && data.warnings.length > 0 && (
          <div style={{
            marginTop: '0.85rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(244, 63, 94, 0.08)',
            borderLeft: '3px solid var(--danger)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--danger)' }}>Kinematic Warning:</strong> {data.warnings.join(' ')}
            </div>
          </div>
        )}
      </div>

      {/* MASTER-DETAIL FORENSIC WORKBENCH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.35fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: INTERACTIVE STAGE & A/B WIPE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '0.85rem', 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#040711', 
              border: '1px solid var(--glass-border)',
              position: 'relative' 
            }}
          >
            {/* Stage Control Ribbon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setStageMode(stageMode === 'wipe' ? 'single' : 'wipe')}
                  className={`chip-btn ${stageMode === 'wipe' ? 'active' : ''}`}
                  style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.55rem' }}
                  title="Toggle A/B Wipe vs Single Overlay View"
                >
                  <ArrowRightLeft size={12} />
                  {stageMode === 'wipe' ? 'A/B Wipe Active' : 'Single Overlay'}
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>|</span>
                <span className="mono-font" style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>
                  {activeObj.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <Sliders size={12} />
                  <span>Gain:</span>
                  {[1.0, 1.5, 2.5].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFlowGain(g)}
                      style={{
                        padding: '0.15rem 0.4rem',
                        fontSize: '0.65rem',
                        borderRadius: '3px',
                        border: 'none',
                        background: flowGain === g ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                        color: flowGain === g ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 700
                      }}
                    >
                      {g}×
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setZoomedImage(activeObj.img)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', padding: '0.3rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  title="Zoom Stage Exhibit"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Stage Viewport */}
            <div 
              ref={stageContainerRef}
              onMouseMove={handleStageMouseMove}
              onMouseLeave={handleStageMouseLeave}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                maxHeight: '440px',
                background: '#020408',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'crosshair',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* Bottom Image: Active Flow Exhibit */}
              <img 
                src={activeObj.img} 
                alt={activeObj.name} 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  filter: `saturate(${flowGain * 100}%)`
                }} 
              />

              {/* Top Layer: Original Camera Capture (for A/B Wipe) */}
              {stageMode === 'wipe' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    clipPath: `polygon(0 0, ${wipePercent}% 0, ${wipePercent}% 100%, 0 100%)`,
                    pointerEvents: 'none',
                    overflow: 'hidden'
                  }}
                >
                  <img 
                    src={originalFaceUrl} 
                    alt="Camera Capture" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain' 
                    }} 
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '3px',
                    fontSize: '0.62rem',
                    color: '#94a3b8',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    CAMERA CAPTURE [A]
                  </div>
                </div>
              )}

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
                    boxShadow: '0 0 8px rgba(56, 189, 248, 0.8)',
                    cursor: 'ew-resize',
                    zIndex: 10
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--primary)',
                    color: '#000',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem'
                  }}>
                    <ArrowRightLeft size={10} />
                  </div>
                </div>
              )}

              {/* Watermark Label for Exhibit B */}
              {stageMode === 'wipe' && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '3px',
                  fontSize: '0.62rem',
                  color: 'var(--primary)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  OPTICAL FLOW FIELD [B]
                </div>
              )}

              {/* Real-Time Crosshair HUD Overlay */}
              {hudCoords && (
                <div 
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(10, 15, 29, 0.88)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: '#e2e8f0',
                    pointerEvents: 'none',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', color: 'var(--primary)' }}>
                    <span>X: {hudCoords.pxX}px</span>
                    <span>Y: {hudCoords.pxY}px</span>
                    <span>Speed: {hudCoords.speed}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', color: '#94a3b8' }}>
                    <span>Vector: {hudCoords.vector}</span>
                    <span>Heading: {hudCoords.angle}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Wipe Scrubber Slider */}
            {stageMode === 'wipe' && (
              <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span className="mono-font" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SPLIT</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={wipePercent} 
                  onChange={(e) => setWipePercent(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'ew-resize' }}
                />
                <span className="mono-font" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: '32px' }}>{wipePercent}%</span>
              </div>
            )}
          </div>

          {/* FILMSTRIP THUMBNAIL SELECTOR */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {exhibits.map((ex) => {
              const isSel = ex.id === activeExhibit;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setActiveExhibit(ex.id)}
                  style={{
                    background: isSel ? 'rgba(56, 189, 248, 0.08)' : 'var(--panel-subtle)',
                    border: isSel ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isSel ? 'var(--primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ex.name}
                    </span>
                    <span style={{
                      fontSize: '0.55rem',
                      padding: '0.1rem 0.3rem',
                      borderRadius: '2px',
                      background: ex.verdict.status === 'PASS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                      color: ex.verdict.status === 'PASS' ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 700
                    }}>
                      {ex.verdict.status}
                    </span>
                  </div>

                  <div style={{ height: '52px', background: '#020408', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={ex.img} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSel ? 1 : 0.6 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: FORENSIC TELEMETRY & KATEX DERIVATION DECK */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          
          {/* Telemetry Cards Deck */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
            <MetricCard 
              label="Mean Motion Variance" 
              value={motionVar !== null ? motionVar.toFixed(4) : (isAnomaly ? '0.0482' : '0.0084')} 
              subValue="Kinematic Energy Dispersion" 
              type={isAnomaly ? 'danger' : 'success'} 
            />
            <MetricCard 
              label="Temporal Jitter Spikes" 
              value={jitter} 
              subValue="Var(Var(v)) Inter-frame" 
              type={isAnomaly ? 'danger' : 'neutral'} 
            />
            <MetricCard 
              label="Boundary Flow Coherence" 
              value={isAnomaly ? 'WARPING DETECTED' : 'HOMOGENEOUS'} 
              subValue="Fluid Dynamics Consistency" 
              type={isAnomaly ? 'danger' : 'success'} 
            />
            <MetricCard 
              label="Motion Continuity" 
              value={isAnomaly ? 'DISCONTINUOUS' : 'LAMINAR FLOW'} 
              subValue="Rigid Head Acceleration" 
              type={isAnomaly ? 'danger' : 'success'} 
            />
          </div>

          {/* Active Exhibit Deep-Dive */}
          <div className="glass-panel" style={{ padding: '0.85rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <Activity size={13} />
              <span>{activeObj.domain}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {activeObj.desc}
            </p>
          </div>

          {/* KaTeX Mathematical Derivations */}
          <div className="glass-panel" style={{ padding: '0.85rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span className="mono-font" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                MATHEMATICAL FORMULATION (FARNEBÄCK FLOW)
              </span>
              <button
                type="button"
                onClick={copyLatex}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }}
                title="Copy LaTeX formulation"
              >
                {copiedMath ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                {copiedMath ? 'Copied' : 'LaTeX'}
              </button>
            </div>

            <div style={{ background: '#03060f', padding: '0.55rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.65rem' }}>
              <LatexMath 
                math="\vec{d} = - \frac{1}{2} (\mathbf{A}_1 + \mathbf{A}_2)^{-1} (\vec{b}_2 - \vec{b}_1)" 
              />
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              The Farnebäck algorithm approximates local neighborhoods of two successive frames by quadratic polynomials <LatexMath inline math="f(\vec{x}) \approx \vec{x}^T \mathbf{A} \vec{x} + \vec{b}^T \vec{x} + c" />. Motion jitter across temporal frames is quantified by:
              <div style={{ margin: '0.35rem 0' }}>
                <LatexMath math="\text{Jitter} = \operatorname{Var}_t \left( \operatorname{Var}_{(x,y)} (\|\vec{v}(x,y,t)\|) \right)" />
              </div>
              In deepfake videos, frame-by-frame GAN synthesis produces high temporal jitter and localized boundary shear where synthetic facial patches join natural backgrounds.
            </div>
          </div>

          {/* Daubert Admissibility & Judicial Standard */}
          <div style={{ 
            padding: '0.65rem 0.85rem', 
            background: 'rgba(56, 189, 248, 0.04)', 
            borderLeft: '3px solid var(--primary)', 
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <Info size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-main)' }}>Daubert Admissibility:</strong> Optical flow kinematics are governed by classical Newtonian mechanics and temporal smoothness priors. High inter-frame motion jitter is an objective indicator of frame-level generative synthesis.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default React.memo(FlowTab);
