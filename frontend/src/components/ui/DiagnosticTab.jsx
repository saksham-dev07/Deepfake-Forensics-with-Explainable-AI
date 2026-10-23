import React, { useState } from 'react';
import { ImageOff, Maximize2, ArrowRightLeft, AlertTriangle, RotateCcw } from 'lucide-react';
import { diagnosticData, formatPercent, formatValue, readPath, scoreStatus } from '../../utils/reportData';
import { resolveMediaUrl, resolveOriginalFaceUrl, resolveOriginalFrameUrl } from '../../utils/mediaUrl';
import WipeDivider from './WipeDivider';
import ScoreRing from './ScoreRing';
import MetricCard from './MetricCard';
import TestExplanation from './TestExplanation';
import TestDefinition from './TestDefinition';
import VerdictBadge from './VerdictBadge';

export default function DiagnosticTab({ id, result = {}, setZoomedImage = () => {} }) {
  const { config, data, score, warnings } = diagnosticData(result, id);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('wipe');
  const [wipePercent, setWipePercent] = useState(50);
  const [images, setImages] = useState({});
  const [retry, setRetry] = useState(0);
  const containerRef = React.useRef(null);

  const exhibits = config.exhibits.flatMap(exhibit => {
    let path = readPath(data, exhibit.path);
    if (id === 'visual' && !Array.isArray(result.heatmaps)) path = result.heatmaps?.[exhibit.id === 'coarse' ? 'gradcam_overlay' : 'guided_gradcam'];
    if (id === 'ela' && exhibit.id === 'heatmap') path ??= result.heatmaps?.ela_overlay;
    return typeof path === 'string' && path ? [{ ...exhibit, src: resolveMediaUrl(path) }] : [];
  });
  const active = exhibits.find(exhibit => exhibit.id === selectedId) || exhibits[0];
  const original = config.input === 'face'
    ? (result.face_crop_path || result.heatmaps?.original_face || result.heatmaps?.face_crop ? resolveOriginalFaceUrl(result) : null)
    : (result.first_frame_path || result.heatmaps?.original_frame ? resolveOriginalFrameUrl(result) : null);
  const originalSize = images[original];
  const activeSize = images[active?.src];
  const sameRatio = !originalSize?.width || !activeSize?.width || Math.abs(originalSize.width / originalSize.height - activeSize.width / activeSize.height) < 0.01;
  const canCompare = Boolean(active?.spatial && original && sameRatio && !originalSize?.failed && !activeSize?.failed);
  const wipe = canCompare && mode === 'wipe';
  const imageLoaded = event => {
    const { currentSrc, naturalWidth, naturalHeight } = event.currentTarget;
    setImages(previous => ({ ...previous, [currentSrc]: { width: naturalWidth, height: naturalHeight } }));
  };
  const imageFailed = src => setImages(previous => ({ ...previous, [src]: { failed: true } }));

  return (
    <section className="diagnostic-view" aria-label={config.title}>
      <header className="view-heading">
        <div><p className="section-eyebrow">Detector evidence</p><h2>{config.title}</h2><p>{config.description}</p></div>
        <VerdictBadge status={scoreStatus(score)} reason={score === null ? 'Measurement unavailable' : `${formatPercent(score)} anomaly score`} />
      </header>

      {warnings.length > 0 && <div className="notice notice-warning" role="status"><AlertTriangle size={18} aria-hidden="true" /><div><strong>Observation limits</strong><ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div></div>}

      <div className="analysis-workspace diagnostic-workspace">
        <div className="forensic-panel evidence-panel">
          <div className="evidence-heading"><div><p className="section-eyebrow">Exhibit viewer</p><h3>{active?.label || 'No exhibit available'}</h3></div>
            {canCompare && <div className="segmented-control" aria-label="Image viewing mode">
              <button type="button" aria-pressed={wipe} onClick={() => setMode('wipe')}><ArrowRightLeft size={14} /> Compare</button>
              <button type="button" aria-pressed={!wipe} onClick={() => setMode('direct')}>Direct view</button>
            </div>}
          </div>

          <div className="comparison-stage evidence-stage" ref={containerRef}>
            {active ? <>
              {wipe && <div className="evidence-image-layer"><img src={original} alt={config.input === 'face' ? 'Original face crop' : 'Original source frame'} onLoad={imageLoaded} onError={() => imageFailed(original)} draggable={false} /><span className="exhibit-label exhibit-label-left">Original</span></div>}
              <div className="comparison-layer evidence-image-layer" style={{ clipPath: wipe ? `inset(0 0 0 ${wipePercent}%)` : undefined }}>
                {!activeSize?.failed ? <img key={`${active.src}:${retry}`} src={active.src} alt={active.label} onLoad={imageLoaded} onError={() => imageFailed(active.src)} draggable={false} />
                  : <div className="evidence-empty"><ImageOff size={30} /><strong>Image could not be loaded</strong><p>The exhibit may be unavailable or its access link may have expired.</p><button type="button" className="btn btn-outline" onClick={() => { setImages(previous => ({ ...previous, [active.src]: undefined })); setRetry(value => value + 1); }}><RotateCcw size={14} /> Retry image</button></div>}
                <span className="exhibit-label exhibit-label-right">{active.label}</span>
              </div>
              {wipe && <WipeDivider wipePercent={wipePercent} setWipePercent={setWipePercent} containerRef={containerRef} />}
              {!activeSize?.failed && <button type="button" className="exhibit-expand" aria-label={`Expand ${active.label}`} onClick={() => setZoomedImage(active.src)}><Maximize2 size={18} /></button>}
            </> : <div className="evidence-empty"><ImageOff size={34} aria-hidden="true" /><strong>No image was returned for this detector</strong><p>Available measurements are shown alongside. Missing exhibits are never replaced with simulated findings.</p></div>}
          </div>

          {wipe && <div className="comparison-range"><span>Original</span><input type="range" aria-label="Comparison position control" min="0" max="100" value={wipePercent} onChange={event => setWipePercent(Number(event.target.value))} /><output>{wipePercent}%</output><span>Analysis</span></div>}
          {active && <p className="evidence-caption">{active.note || (active.spatial ? (canCompare ? 'Both layers use the same source coordinates. Drag the divider or use the arrow keys to compare.' : 'Direct view: a matching source frame or image geometry is unavailable.') : 'Chart or cropped diagnostic. Shown directly because its coordinates differ from the source image.')}</p>}

          {exhibits.length > 1 && <div className="exhibit-picker" aria-label="Available exhibits">{exhibits.map(exhibit => <button type="button" key={exhibit.id} aria-pressed={active?.id === exhibit.id} onClick={() => setSelectedId(exhibit.id)}>{exhibit.label}</button>)}</div>}
        </div>

        <aside className="diagnostic-details" aria-label={`${config.title} measurements`}>
          <div className="forensic-panel score-summary"><ScoreRing score={score} label="Anomaly score" size={112} /><div><h3>{scoreStatus(score)}</h3><p>{score === null ? 'This detector did not return a usable measurement.' : 'A detector estimate, not an authenticity certificate.'}</p></div></div>
          <dl className="measurement-grid">{config.metrics.map(metric => <MetricCard key={metric.key} label={metric.label} value={score === null ? 'N/A' : formatValue(data[metric.key], metric.format, metric.unit)} />)}</dl>
          <div className="forensic-panel evidence-context"><h3>How to read this result</h3><p>{config.note}</p></div>
        </aside>
      </div>

      {data.explanation ? <TestExplanation explanation={data.explanation} testId={id} score={score} /> : <TestDefinition testId={id} />}
    </section>
  );
}
