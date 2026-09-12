import React, { useMemo } from 'react';
import { Flame, Search, Info, ZoomIn, Eye } from 'lucide-react';
import TestDefinition from '../ui/TestDefinition';
import { API_BASE } from '../../constants/api';

const VisualTab = ({
  result,
  getScoreColor,
  setZoomedImage,
}) => {
  // Resolve heatmaps whether returned as array of filenames or object of URLs
  const coarseGradcamUrl = useMemo(() => {
    if (!result.heatmaps) return null;
    if (Array.isArray(result.heatmaps)) {
      return result.heatmaps[0] ? `${API_BASE}/${result.heatmaps[0]}` : null;
    }
    return result.heatmaps.gradcam_overlay || null;
  }, [result.heatmaps]);

  const guidedGradcamUrl = useMemo(() => {
    if (!result.heatmaps) return null;
    if (Array.isArray(result.heatmaps)) {
      return result.heatmaps[1] ? `${API_BASE}/${result.heatmaps[1]}` : null;
    }
    return result.heatmaps.guided_gradcam || null;
  }, [result.heatmaps]);

  const originalFaceUrl = useMemo(() => {
    if (!result.heatmaps) return null;
    if (typeof result.heatmaps === 'object' && !Array.isArray(result.heatmaps)) {
      return result.heatmaps.original_face || null;
    }
    return null;
  }, [result.heatmaps]);

  const anomalyPct = (result.nn_score * 100).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <TestDefinition testId="visual" />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)', gap: '1.25rem', alignItems: 'stretch' }}>
        
        {/* Left: Neural Net Backbone Score & Telemetry */}
        <div className="forensic-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
          <div className="panel-header" style={{ marginBottom: 0 }}>
            <div className="panel-icon gradcam">
              <Flame size={18} color="var(--danger)" />
            </div>
            <div>
              <div className="panel-title">Neural Network Analysis</div>
              <div className="panel-subtitle">EfficientNet-B4 + CBAM Dual-Domain Attention Head</div>
            </div>
          </div>
          
          {/* Anomaly Score Card */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.25rem 1.5rem', background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                Backbone Anomaly Score
              </div>
              <div className="mono-font" style={{ fontSize: '2.4rem', fontWeight: 800, color: getScoreColor(result.nn_score) }}>
                {anomalyPct}%
              </div>
            </div>

            {/* Circular Gauge */}
            <div style={{ width: '74px', height: '74px', position: 'relative' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="3.5"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={getScoreColor(result.nn_score)}
                  strokeWidth="3.5"
                  strokeDasharray={`${result.nn_score * 100}, 100`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1.2s ease-out' }}
                />
              </svg>
            </div>
          </div>

          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            <p>
              The visual backbone scans 380×380 normalized facial crops using compound-scaled MBConv blocks and Convolutional Block Attention (CBAM) to isolate spatial boundary seams and upsampling checkerboard artifacts.
            </p>
            <p style={{ marginTop: '0.65rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>Diagnostic Interpretation:</strong> A score of {anomalyPct}% indicates the raw deep learning conviction before Tabular ResNet ensemble fusion.
            </p>
          </div>
        </div>

        {/* Right: Grad-CAM Evidence Gallery */}
        <div className="forensic-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>
            <div className="panel-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.25)' }}>
              <Search size={18} color="var(--primary)" />
            </div>
            <div>
              <div className="panel-title">Explainability Heatmaps (XAI)</div>
              <div className="panel-subtitle">Dual-layer visual attribution (Coarse conv_head + Guided HDR)</div>
            </div>
          </div>

          {/* Exhibits Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: guidedGradcamUrl ? '1fr 1fr' : '1fr', gap: '1rem', flex: 1 }}>
            {/* Exhibit 1: Coarse Grad-CAM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                Coarse Grad-CAM (conv_head)
              </div>
              <div 
                className="zoomable-image-container"
                onClick={() => coarseGradcamUrl && setZoomedImage(coarseGradcamUrl)}
                style={{ height: '220px' }}
              >
                {coarseGradcamUrl ? (
                  <img
                    src={coarseGradcamUrl}
                    alt="Coarse Grad-CAM Heatmap"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Exhibit unavailable
                  </div>
                )}
                <div className="zoom-overlay">
                  <ZoomIn size={26} />
                </div>
              </div>
            </div>

            {/* Exhibit 2: Guided Grad-CAM */}
            {guidedGradcamUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                  Guided Grad-CAM (Inferno HDR)
                </div>
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(guidedGradcamUrl)}
                  style={{ height: '220px' }}
                >
                  <img
                    src={guidedGradcamUrl}
                    alt="Guided Grad-CAM Heatmap"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay">
                    <ZoomIn size={26} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Exhibit Footer Note */}
          <div style={{
            marginTop: '1rem',
            padding: '0.65rem 0.85rem',
            background: 'rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}>
            <Info size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
            <span>
              Click any exhibit to inspect in full-resolution modal. Red/warm regions indicate spatial pixels responsible for synthetic classification.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default React.memo(VisualTab);
