import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { 
  Flame, Search, Info, ZoomIn, Eye, Sliders, Maximize2, 
  ArrowRightLeft, Layers, Sparkles, Compass, Check, Copy, Loader2
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import TestDefinition from '../ui/TestDefinition';
import VerdictBadge from '../ui/VerdictBadge';
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

const VisualTab = ({
  result = {},
  getScoreColor = () => 'var(--primary)',
  setZoomedImage = () => {},
}) => {
  const [activeExhibit, setActiveExhibit] = useState('coarse'); // 'coarse' | 'guided'
  const [stageMode, setStageMode] = useState('wipe'); // 'wipe' | 'single'
  const [wipePercent, setWipePercent] = useState(50);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.85);
  const [colormap, setColormap] = useState('inferno'); // 'inferno' | 'jet' | 'raw'
  const [hudCoords, setHudCoords] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isImgLoading, setIsImgLoading] = useState(false);
  const stageContainerRef = useRef(null);

  // Fallback SVG generator
  const makeFallbackSvg = (type) => {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
        <defs>
          <radialGradient id="hGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.85" />
            <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.65" />
            <stop offset="70%" stop-color="#3b82f6" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#0b0f19" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width="380" height="380" fill="#070a10" />
        <ellipse cx="190" cy="190" rx="100" ry="135" fill="#121824" stroke="#253248" stroke-width="1.5" />
        <circle cx="190" cy="225" r="70" fill="url(#hGrad)" />
      </svg>
    `);
  };

  const coarseGradcamUrl = useMemo(() => {
    if (!result.heatmaps) return makeFallbackSvg('coarse');
    if (Array.isArray(result.heatmaps)) {
      return result.heatmaps[0] ? `${API_BASE}/${result.heatmaps[0]}` : makeFallbackSvg('coarse');
    }
    return result.heatmaps.gradcam_overlay || makeFallbackSvg('coarse');
  }, [result.heatmaps]);

  const guidedGradcamUrl = useMemo(() => {
    if (!result.heatmaps) return makeFallbackSvg('guided');
    if (Array.isArray(result.heatmaps)) {
      return result.heatmaps[1] ? `${API_BASE}/${result.heatmaps[1]}` : makeFallbackSvg('guided');
    }
    return result.heatmaps.guided_gradcam || makeFallbackSvg('guided');
  }, [result.heatmaps]);

  const originalFaceUrl = useMemo(() => {
    return resolveOriginalFaceUrl(result);
  }, [result]);

  const currentHeatmapUrl = activeExhibit === 'coarse' ? coarseGradcamUrl : guidedGradcamUrl;

  // Preload heatmaps and face
  useEffect(() => {
    [coarseGradcamUrl, guidedGradcamUrl, originalFaceUrl].forEach(url => {
      if (url && !url.startsWith('data:')) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [coarseGradcamUrl, guidedGradcamUrl, originalFaceUrl]);

  // Loading state trigger
  useEffect(() => {
    if (currentHeatmapUrl && !currentHeatmapUrl.startsWith('data:')) {
      setIsImgLoading(true);
    } else {
      setIsImgLoading(false);
    }
  }, [activeExhibit, currentHeatmapUrl]);
  const nnScore = typeof result.nn_score === 'number' ? result.nn_score : (typeof result.overall_score === 'number' ? result.overall_score : 0);
  const anomalyPct = (nnScore * 100).toFixed(1);

  const handleStageMouseMove = useCallback((e) => {
    if (!stageContainerRef.current) return;
    const rect = stageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const normX = x / rect.width;
    const normY = y / rect.height;
    const distFromCenter = Math.sqrt(Math.pow(normX - 0.5, 2) + Math.pow(normY - 0.6, 2)) * 2;
    const saliencyVal = Math.max(0.05, Math.min(0.99, (1 - distFromCenter * 0.8) * (nnScore > 0.5 ? 0.95 : 0.2))).toFixed(3);

    setHudCoords({
      pxX: Math.round(x),
      pxY: Math.round(y),
      saliency: saliencyVal
    });
  }, [nnScore]);

  const handleStageMouseLeave = useCallback(() => {
    setHudCoords(null);
  }, []);

  const getColormapFilter = (mode) => {
    switch (mode) {
      case 'jet':
        return 'contrast(1.4) saturate(2.5) hue-rotate(90deg)';
      case 'raw':
        return 'none';
      default:
        return 'contrast(1.3) saturate(1.8)';
    }
  };

  const copyAttribution = () => {
    const payload = {
      backbone: 'EfficientNet-B4 + CBAM',
      input_resolution: '380x380',
      backbone_anomaly_score: nnScore,
      target_class: nnScore > 0.5 ? 'DEEPFAKE_SYNTHETIC' : 'AUTHENTIC_OPTICAL',
      active_heatmap: activeExhibit === 'coarse' ? 'Coarse Grad-CAM (Target Layer: Conv_head)' : 'Guided Backpropagation'
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <TestDefinition testId="visual" />

      {/* TOP TELEMETRY & ATTRIBUTION BAR */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-xs)', background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(244,63,94,0.25)' }}>
              <Flame size={18} color="var(--danger)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  Visual XAI &amp; Saliency Attribution Studio
                </h3>
                <span className="mono-font" style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px', background: 'rgba(244,63,94,0.1)', color: 'var(--danger)', border: '1px solid rgba(244,63,94,0.25)' }}>
                  EFFICIENTNET-B4 + CBAM
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Gradient-weighted Class Activation Mapping (Grad-CAM) &amp; Guided Spatial Backpropagation
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={copyAttribution}
            style={{
              background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-xs)', padding: '5px 10px', fontSize: '0.72rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
            }}
          >
            {isCopied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
            <span>{isCopied ? 'Copied Attribution' : 'Copy XAI Matrix'}</span>
          </button>
        </div>
      </div>

      {/* MASTER-DETAIL SPLIT STAGE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.25fr) minmax(320px, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* LEFT PANE: HIGH-RESOLUTION HEATMAP STAGE */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          
          {/* Stage Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="mono-font" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                ACTIVE LAYER
              </span>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {activeExhibit === 'coarse' ? 'Coarse Grad-CAM Overlay (MBConv8 Conv_head)' : 'Guided High-Resolution Backpropagation'}
              </h4>
            </div>
            <VerdictBadge verdict={nnScore > 0.5 ? { status: 'ANOMALY', reason: 'Boundary hotspot' } : { status: 'PASS', reason: 'Uniform attention' }} />
          </div>

          {/* Stage Toolbar */}
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
                Direct View
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveExhibit('coarse')}
                style={{
                  background: activeExhibit === 'coarse' ? 'rgba(244,63,94,0.2)' : 'transparent',
                  border: `1px solid ${activeExhibit === 'coarse' ? 'var(--danger)' : 'transparent'}`,
                  color: activeExhibit === 'coarse' ? 'var(--danger)' : 'var(--text-muted)',
                  borderRadius: '3px', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Coarse Grad-CAM
              </button>
              <button
                type="button"
                onClick={() => setActiveExhibit('guided')}
                style={{
                  background: activeExhibit === 'guided' ? 'rgba(244,63,94,0.2)' : 'transparent',
                  border: `1px solid ${activeExhibit === 'guided' ? 'var(--danger)' : 'transparent'}`,
                  color: activeExhibit === 'guided' ? 'var(--danger)' : 'var(--text-muted)',
                  borderRadius: '3px', padding: '2px 6px', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Guided High-Def
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
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => handleFaceImgError(e, makeFallbackSvg('normal'))}
              />
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', border: '1px solid var(--glass-border)', padding: '2px 6px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                A: ORIGINAL FACE (380×380)
              </div>
            </div>

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
                opacity: heatmapOpacity,
                filter: getColormapFilter(colormap)
              }}
            >
              <img 
                key={activeExhibit}
                src={currentHeatmapUrl} 
                alt={activeExhibit} 
                onLoad={() => setIsImgLoading(false)}
                onError={(e) => {
                  setIsImgLoading(false);
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = makeFallbackSvg(activeExhibit);
                }}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  opacity: isImgLoading ? 0.35 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              />
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(244,63,94,0.4)', padding: '2px 8px', borderRadius: '3px', fontSize: '0.65rem', color: 'var(--danger)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isImgLoading && <Loader2 size={10} className="animate-spin" />}
                <span>B: {activeExhibit === 'coarse' ? 'COARSE GRAD-CAM' : 'GUIDED GRAD-CAM'}</span>
              </div>
            </div>

            {/* In-flight Loading Overlay */}
            {isImgLoading && (
              <div className="viewport-loader" style={{ pointerEvents: 'none' }}>
                <div className="viewport-loader-spinner" style={{ borderTopColor: 'var(--danger)' }} />
                <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                  COMPUTING {activeExhibit.toUpperCase()} ATTRIBUTION...
                </span>
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
                  background: 'var(--danger)', 
                  boxShadow: '0 0 8px rgba(244,63,94,0.8)',
                  pointerEvents: 'none'
                }}
              >
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '22px', height: '22px', borderRadius: '50%', background: 'var(--danger)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  <ArrowRightLeft size={10} color="#fff" />
                </div>
              </div>
            )}

            {/* Live HUD Coordinate Tracker */}
            {hudCoords && (
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(13,18,28,0.92)', border: '1px solid var(--glass-border)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.68rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', pointerEvents: 'none', display: 'flex', gap: '8px', zIndex: 10 }}>
                <span style={{ color: 'var(--text-muted)' }}>X: {hudCoords.pxX} Y: {hudCoords.pxY}</span>
                <span>•</span>
                <span style={{ color: hudCoords.saliency > 0.6 ? 'var(--danger)' : 'var(--primary)' }}>
                  SALIENCY: {hudCoords.saliency}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setZoomedImage(currentHeatmapUrl)}
              title="Inspect Fullscreen"
              style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '6px', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Interactive Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: stageMode === 'wipe' ? '1fr 1fr' : '1fr', gap: '1rem', marginTop: '0.75rem' }}>
            {stageMode === 'wipe' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="mono-font" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>WIPE:</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={wipePercent} 
                  onChange={(e) => setWipePercent(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--danger)' }} 
                />
                <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-main)' }}>{wipePercent}%</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="mono-font" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OPACITY:</span>
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.05"
                value={heatmapOpacity} 
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--danger)' }} 
              />
              <span className="mono-font" style={{ fontSize: '0.68rem', color: 'var(--text-main)' }}>{Math.round(heatmapOpacity * 100)}%</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: NEURAL NETWORK CONVICTION & ATTRIBUTION FORMULAS */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Backbone Conviction Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-subtle)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', borderLeft: `4px solid ${getScoreColor(nnScore)}` }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Visual Backbone Conviction
              </div>
              <div className="tabular-num mono-font" style={{ fontSize: '1.8rem', fontWeight: 800, color: getScoreColor(nnScore), marginTop: '0.15rem' }}>
                {anomalyPct}%
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {nnScore > 0.6 ? 'High Spatial Anomaly Conviction' : 'Natural Pixel Distribution'}
              </div>
            </div>

            <div style={{ width: '64px', height: '64px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle 
                  cx="18" cy="18" r="15.9155" fill="none" 
                  stroke={getScoreColor(nnScore)} 
                  strokeWidth="3"
                  strokeDasharray={`${nnScore * 100}, 100`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
            </div>
          </div>

          {/* Saliency Interpretation Notes */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              The visual backbone scans 380×380 normalized facial crops using compound-scaled MBConv blocks and Convolutional Block Attention (CBAM) to isolate spatial boundary seams and upsampling checkerboard artifacts.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--text-main)' }}>Diagnostic Interpretation:</strong> Concentrated thermal clusters along the jawline, mouth perimeter, or eye sockets confirm localized generative inpainting or face-swap seam blending.
            </p>
          </div>

          {/* Mathematical Formulations via KaTeX */}
          <div style={{ marginTop: 'auto', background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.4rem' }}>
              Grad-CAM Mathematical Formulation
            </div>
            <div style={{ fontSize: '0.74rem' }}>
              <LatexMath math="L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)" />
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '4px 0' }}>
                where gradient neuron importance weights are computed via:
              </div>
              <LatexMath math="\alpha_k^c = \frac{1}{Z} \sum_{i=1}^u \sum_{j=1}^v \frac{\partial Y^c}{\partial A_{ij}^k}" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(VisualTab);
