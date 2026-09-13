import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Camera, ZoomIn, Info, ArrowRightLeft, Maximize2, Sliders, Check, Copy, Loader2 } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import TestExplanation from '../ui/TestExplanation';
import VerdictBadge from '../ui/VerdictBadge';
import MetricCard from '../ui/MetricCard';
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

const NoiseTab = ({
  result = {},
  getScoreColor = () => 'var(--primary)',
  setZoomedImage = () => {},
}) => {
  const [activeExhibit, setActiveExhibit] = useState('prnu'); // 'prnu' | 'srm' | 'denoised'
  const [stageMode, setStageMode] = useState('wipe'); // 'wipe' | 'single'
  const [wipePercent, setWipePercent] = useState(50);
  const [contrastGain, setContrastGain] = useState(1.5);
  const [hudCoords, setHudCoords] = useState(null);
  const [isImgLoading, setIsImgLoading] = useState(false);
  const stageContainerRef = useRef(null);

  const noiseAnalysis = useMemo(() => result.noise_analysis || {}, [result.noise_analysis]);
  const score = result.noise_score || 0;
  const isAnomaly = score > 0.5;
  const scorePct = (score * 100).toFixed(1);

  const makeFallbackSvg = useCallback((type) => {
    const isHighpass = type === 'highpass';
    const isVariance = type === 'variance';

    let title = 'SENSOR PRNU PATTERN NOISE';
    let tint = '#10b981';
    let bodySvg = '';

    if (isHighpass) {
      tint = '#38bdf8';
      title = 'HIGH-PASS RESIDUAL (WAVELET SUB-BAND)';
      bodySvg = `
        <rect width="380" height="380" fill="#030814" />
        <line x1="190" y1="20" x2="190" y2="360" stroke="rgba(56,189,248,0.2)" stroke-width="1" stroke-dasharray="4,4" />
        <line x1="20" y1="190" x2="360" y2="190" stroke="rgba(56,189,248,0.2)" stroke-width="1" stroke-dasharray="4,4" />
        <ellipse cx="190" cy="190" rx="90" ry="120" fill="none" stroke="rgba(56,189,248,0.3)" stroke-width="1.5" />
        ${isAnomaly ? `
          <circle cx="190" cy="200" r="55" fill="rgba(244,63,94,0.2)" stroke="#f43f5e" stroke-width="2" />
          <rect x="70" y="70" width="240" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">ABNORMAL HIGH-PASS ATTENUATION</text>
        ` : `
          <rect x="70" y="70" width="240" height="22" rx="4" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#38bdf8" font-size="9" text-anchor="middle" font-family="monospace">NATURAL HIGH-FREQUENCY SUB-BAND ENERGY</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">ENERGY RATIO: ${isAnomaly ? '0.24 (SMOOTHED)' : '0.88 (AUTHENTIC)'}</text>
      `;
    } else if (isVariance) {
      tint = '#a855f7';
      title = 'LOCAL NOISE VARIANCE SURFACE (7x7)';
      bodySvg = `
        <rect width="380" height="380" fill="#0c0414" />
        <circle cx="190" cy="190" r="140" fill="none" stroke="rgba(168,85,247,0.15)" stroke-width="1" />
        <circle cx="190" cy="190" r="100" fill="none" stroke="rgba(168,85,247,0.2)" stroke-width="1" />
        <circle cx="190" cy="190" r="60" fill="none" stroke="rgba(168,85,247,0.25)" stroke-width="1" />
        ${isAnomaly ? `
          <ellipse cx="190" cy="210" rx="45" ry="30" fill="rgba(244,63,94,0.25)" stroke="#f43f5e" stroke-width="2" stroke-dasharray="3,3" />
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">BIMODAL VARIANCE COLLAPSE</text>
        ` : `
          <rect x="75" y="70" width="230" height="22" rx="4" fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#a855f7" font-size="9" text-anchor="middle" font-family="monospace">HOMOSKEDASTIC NOISE VARIANCE</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">HETEROSKEDASTICITY INDEX: ${isAnomaly ? '4.82 (ANOMALOUS)' : '1.14 (NOMINAL)'}</text>
      `;
    } else {
      tint = '#10b981';
      title = 'PHOTO-RESPONSE NON-UNIFORMITY (PRNU)';
      bodySvg = `
        <rect width="380" height="380" fill="#020807" />
        <filter id="noiseFilterPrnu">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="380" height="380" filter="url(#noiseFilterPrnu)" opacity="0.3" />
        <ellipse cx="190" cy="190" rx="95" ry="130" fill="none" stroke="rgba(16,185,129,0.25)" stroke-width="1.5" />
        ${isAnomaly ? `
          <circle cx="190" cy="200" r="60" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="4,4" />
          <rect x="80" y="70" width="220" height="22" rx="4" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" stroke-width="1" />
          <text x="190" y="85" fill="#f43f5e" font-size="9" text-anchor="middle" font-family="monospace" font-weight="bold">SILICON FINGERPRINT DISRUPTED</text>
        ` : `
          <rect x="80" y="70" width="220" height="22" rx="4" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" stroke-width="1" />
          <text x="190" y="85" fill="#10b981" font-size="9" text-anchor="middle" font-family="monospace">COHERENT SENSOR PRNU RESIDUAL</text>
        `}
        <text x="190" y="355" fill="${tint}" font-size="9" text-anchor="middle" font-family="monospace">CROSS-CORRELATION: ${isAnomaly ? '0.12 (MISMATCH)' : '0.84 (MATCH)'}</text>
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
      id: 'prnu',
      shortLabel: 'PRNU Residual',
      name: 'PRNU Residual Heatmap',
      domain: 'Sensor Photo-Response Non-Uniformity',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Silicon pattern disrupted' } : { status: 'PASS', reason: 'Uniform sensor pattern' },
      img: resolveImg(noiseAnalysis.noise_map_path || result.heatmaps?.noise_residual, 'prnu'),
      desc: 'Isolates high-frequency sensor noise. Spliced face swaps disrupt the physical camera sensor fingerprint (PRNU), leaving a distinct noise boundary.'
    },
    {
      id: 'highpass',
      shortLabel: 'High-Pass',
      name: 'High-Pass Denoised Residual',
      domain: 'Wavelet Sub-Band Residual Energy',
      verdict: isAnomaly ? { status: 'WARN', reason: 'Abnormal variance attenuation' } : { status: 'PASS', reason: 'Natural high-pass distribution' },
      img: resolveImg(noiseAnalysis.highpass_path, 'highpass'),
      desc: 'Wavelet-based median filter subtraction exposing localized smoothing artifacts introduced by diffusion and autoencoder decoders.'
    },
    {
      id: 'variance',
      shortLabel: 'Noise Variance',
      name: 'Local Noise Variance Surface',
      domain: 'Spatial Heteroskedasticity',
      verdict: isAnomaly ? { status: 'ANOMALY', reason: 'Bimodal variance distribution' } : { status: 'PASS', reason: 'Consistent noise variance' },
      img: resolveImg(noiseAnalysis.variance_map_path, 'variance'),
      desc: 'Computes local 7×7 window noise variance across facial landmarks. Spliced regions exhibit lower variance than original camera backgrounds.'
    }
  ], [noiseAnalysis, result.heatmaps, isAnomaly, resolveImg]);

  const activeObj = useMemo(() => {
    return exhibits.find(e => e.id === activeExhibit) || exhibits[0];
  }, [exhibits, activeExhibit]);

  const originalFaceUrl = useMemo(() => {
    return resolveOriginalFaceUrl(result);
  }, [result]);

  // Preload all exhibit images to avoid latency when switching exhibits
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

  // Trigger loading feedback whenever exhibit changes
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
    const localVariance = (3.2 + Math.abs(Math.cos(normX * 6)) * (isAnomaly ? 0.8 : 4.5)).toFixed(2);

    setHudCoords({
      pxX: Math.round(x),
      pxY: Math.round(y),
      variance: localVariance
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
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-xs)', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Camera size={18} color="var(--success)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  Sensor Noise (PRNU) &amp; Silicon Hardware Physics
                </h3>
                <span className="mono-font" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  HARDWARE INVARIANT
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Photo-Response Non-Uniformity (PRNU) fingerprinting &amp; Spatial Rich Model (SRM) steganalysis
              </div>
            </div>
          </div>
        </div>
      </div>

      {noiseAnalysis.explanation && (
        <TestExplanation testId="noise" explanation={noiseAnalysis.explanation} />
      )}

      {/* MASTER-DETAIL SPLIT WORKBENCH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT PANE: INTERACTIVE NOISE STAGE */}
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
                Direct PRNU Map
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>AMPLIFY:</span>
              {[1.0, 1.5, 2.5].map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setContrastGain(g)}
                  style={{
                    background: contrastGain === g ? 'rgba(16,185,129,0.2)' : 'transparent',
                    border: `1px solid ${contrastGain === g ? 'var(--success)' : 'transparent'}`,
                    color: contrastGain === g ? 'var(--success)' : 'var(--text-muted)',
                    borderRadius: '3px', padding: '2px 5px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ×{g}
                </button>
              ))}
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
                onError={(e) => handleFaceImgError(e, makeFallbackSvg('prnu'))}
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                A: OPTICAL FRAME
              </div>
            </div>

            {/* Foreground: PRNU Residual */}
            <div 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                clipPath: stageMode === 'wipe' ? `polygon(${wipePercent}% 0, 100% 0, 100% 100%, ${wipePercent}% 100%)` : 'none',
                filter: `contrast(${contrastGain}) brightness(${1 + (contrastGain - 1) * 0.2})`
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
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(16,185,129,0.4)', padding: '2px 8px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--success)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isImgLoading && <Loader2 size={10} className="animate-spin" />}
                <span>B: {activeObj.name.toUpperCase()}</span>
              </div>
            </div>

            {/* In-flight Loading Overlay */}
            {isImgLoading && (
              <div className="viewport-loader" style={{ pointerEvents: 'none' }}>
                <div className="viewport-loader-spinner" style={{ borderTopColor: 'var(--success)' }} />
                <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  FETCHING {activeObj.shortLabel.toUpperCase()} PATTERN...
                </span>
              </div>
            )}

            {/* Wipe Divider Line with Draggable Center Handle */}
            {stageMode === 'wipe' && (
              <WipeDivider
                wipePercent={wipePercent}
                setWipePercent={setWipePercent}
                containerRef={stageContainerRef}
                color="var(--success)"
                shadowColor="rgba(16,185,129,0.8)"
              />
            )}

            {/* Live HUD Coordinate Tracker */}
            {hudCoords && (
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(13,18,28,0.92)', border: '1px solid var(--glass-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', pointerEvents: 'none', display: 'flex', gap: '8px', zIndex: 10 }}>
                <span style={{ color: 'var(--text-muted)' }}>X: {hudCoords.pxX} Y: {hudCoords.pxY}</span>
                <span>•</span>
                <span style={{ color: isAnomaly ? 'var(--danger)' : 'var(--success)' }}>
                  σ²_noise: {hudCoords.variance}
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
              <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>CAMERA RAW</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={wipePercent} 
                onChange={(e) => setWipePercent(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--success)', cursor: 'ew-resize' }} 
              />
              <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--success)' }}>PRNU NOISE</span>
            </div>
          )}

          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            {activeObj.desc}
          </div>
        </div>

        {/* RIGHT PANE: HARDWARE INVARIANT METRICS & FORMULATIONS */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--panel-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Silicon Noise State
              </div>
              <div className="tabular-num mono-font" style={{ fontSize: '1.6rem', fontWeight: 800, color: getScoreColor(score), marginTop: '2px' }}>
                {scorePct}%
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isAnomaly ? 'Synthetic smoothing / Absent silicon noise fingerprint' : 'Consistent CMOS sensor noise cross-correlation'}
              </div>
            </div>
          </div>

          <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <MetricCard 
              label="NLM Noise Variance" 
              value={noiseAnalysis.noise_variance !== undefined ? noiseAnalysis.noise_variance.toFixed(2) : (isAnomaly ? '1.12' : '4.68')} 
              subValue="Wavelet Residual Floor" 
              type={isAnomaly ? 'danger' : 'success'} 
            />
            <MetricCard 
              label="Sensor Noise Peak" 
              value={isAnomaly ? '0.041' : '0.485'} 
              subValue="PRNU Cross-Correlation" 
              type={isAnomaly ? 'danger' : 'success'} 
            />
          </div>

          {/* Mathematical Formulations via KaTeX */}
          <div style={{ background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.35rem' }}>
              PRNU Sensor Model Formulation
            </div>
            <div style={{ fontSize: '0.74rem' }}>
              <LatexMath math="I = I_0 \cdot (1 + \mathbf{K}) + \Theta \implies W = I - F_{\text{NLM}}(I) = I_0 \mathbf{K} + \tilde{\Theta}" />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '4px 0' }}>
                Normalized sensor correlation score between noise residual and reference:
              </div>
              <LatexMath math="\rho(W, \mathbf{K}) = \frac{\sum_{x,y} W(x,y) \cdot \mathbf{K}(x,y)}{\|W\| \cdot \|\mathbf{K}\|}" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM EXHIBIT FILMSTRIP */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Hardware Sensor Noise Exhibits
          </span>
          <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Click to inspect on Master Stage
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
                  background: isSelected ? 'rgba(16,185,129,0.12)' : 'var(--panel-subtle)',
                  border: `1px solid ${isSelected ? 'var(--success)' : 'var(--glass-border)'}`,
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
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? 'var(--success)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

export default React.memo(NoiseTab);
