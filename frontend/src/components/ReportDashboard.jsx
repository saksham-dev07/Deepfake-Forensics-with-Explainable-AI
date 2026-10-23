import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, Download, Info, Loader2, RotateCcw } from 'lucide-react';
import { DIAGNOSTICS, DOMAIN_GROUPS } from '../constants/diagnostics';
import { availableTests, diagnosticData, finiteNumber, formatPercent, formatValue, scoreColor, scoreStatus } from '../utils/reportData';
import { resolveOriginalFaceUrl } from '../utils/mediaUrl';
import { downloadReport } from '../utils/downloadReport';
import Toast from './Toast';
import ErrorBoundary from './ui/ErrorBoundary';
import ImageDialog from './ui/ImageDialog';
import SkeletonLoader from './ui/SkeletonLoader';

const DiagnosticTab = lazy(() => import('./ui/DiagnosticTab'));
const FeaturesTab = lazy(() => import('./tabs/FeaturesTab'));
const MetaTab = lazy(() => import('./tabs/MetaTab'));

export default function ReportDashboard({ result = {}, resetApp = () => {}, jobId, fileName = '' }) {
  const [activeId, setActiveId] = useState('features');
  const [selections, setSelections] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportRun = useRef(null);
  const copyTimer = useRef(null);
  const viewRef = useRef(null);
  const displayName = fileName || result.filename || 'Media analysis';
  const testIds = availableTests(result, displayName);
  const rows = testIds.map(id => ({ id, ...diagnosticData(result, id) }));
  const measured = rows.filter(row => row.score !== null).length;
  const group = DOMAIN_GROUPS.find(item => item.tests.includes(activeId)) || DOMAIN_GROUPS[0];
  const score = finiteNumber(result.overall_score) && result.overall_score >= 0 && result.overall_score <= 1 ? result.overall_score : null;
  const altered = result.is_ai_altered === true;
  const conclusion = score === null ? 'Evaluation unavailable' : altered ? 'Editing signals detected'
    : score > 0.7 ? 'Elevated manipulation signals' : score > 0.55 ? 'Potential manipulation detected'
      : score > 0.4 ? 'Evaluation inconclusive' : 'Limited manipulation signals';
  const original = result.face_crop_path || result.heatmaps?.original_face ? resolveOriginalFaceUrl(result) : null;
  const [sourceFailed, setSourceFailed] = useState(null);
  useEffect(() => () => { exportRun.current?.abort(); clearTimeout(copyTimer.current); }, []);

  const selectTest = (id, focusView = true) => {
    const target = DOMAIN_GROUPS.find(item => item.tests.includes(id));
    if (target) setSelections(previous => ({ ...previous, [target.id]: id }));
    setActiveId(id);
    if (focusView) viewRef.current?.focus({ preventScroll: true });
    viewRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const exportPdf = async () => {
    if (exporting || result.is_demo) return;
    const controller = new AbortController();
    exportRun.current = controller;
    setExporting(true);
    setReportError(null);
    try { await downloadReport({ jobId, result, fileName: displayName, signal: controller.signal }); }
    catch (error) { if (!controller.signal.aborted) setReportError(error.name === 'TimeoutError' ? 'PDF export timed out. Try again shortly.' : error.message || 'The PDF could not be downloaded.'); }
    finally { if (!controller.signal.aborted) setExporting(false); }
  };
  const copyId = async () => {
    try { await navigator.clipboard.writeText(jobId); setCopied(true); clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 2000); }
    catch { setReportError('Clipboard access is unavailable. The full case ID is shown in the source details.'); }
  };
  const resolution = result.file_metadata?.original_resolution;
  const resolutionText = Array.isArray(resolution) ? `${resolution[1]} × ${resolution[0]} px` : typeof resolution === 'string' ? resolution : 'N/A';
  const moduleErrors = Array.isArray(result.module_errors) ? result.module_errors.filter(item => typeof item === 'string') : [];

  return <div className="report-workspace">
    {reportError && <Toast message={reportError} onClose={() => setReportError(null)} />}
    {result.is_demo && <div className="demo-notice" role="status"><Info size={20} /><div><strong>Demo report</strong><p>Illustrative sample data. No uploaded media was analyzed. PDF export is available after a real scan.</p></div></div>}
    <header className="report-header forensic-panel" style={{ '--report-color': altered ? 'var(--warning)' : scoreColor(score) }}>
      <div className="report-heading"><p className="section-eyebrow">Analysis report</p><h1>{conclusion}</h1><p className="report-filename">{displayName}</p><p>Review the measured evidence alongside the source media. Results are estimates and do not establish authenticity.</p></div>
      <div className="report-summary"><strong className="report-score">{formatPercent(score)}</strong><span>Combined anomaly score</span><div className="report-actions"><button type="button" className="btn btn-primary" onClick={exportPdf} disabled={exporting || result.is_demo || !jobId}>{exporting ? <Loader2 size={16} className="spin-animation" /> : <Download size={16} />}{exporting ? 'Preparing PDF…' : 'Export PDF report'}</button><button type="button" className="btn btn-secondary" onClick={resetApp}><RotateCcw size={16} /> New audit</button></div></div>
    </header>
    {moduleErrors.length > 0 && <details className="notice notice-warning"><summary>{moduleErrors.length} detector issue{moduleErrors.length === 1 ? '' : 's'} reported</summary><ul>{moduleErrors.map((error, index) => <li key={index}>{error}</li>)}</ul></details>}
    <div className="report-layout">
      <aside className="report-sidebar" aria-label="Source and detectors">
        <details className="forensic-panel source-details" open><summary>Source details</summary>
          {original && sourceFailed !== original && <button type="button" className="source-preview" aria-label="Expand original face image" onClick={() => setZoomedImage(original)}><img src={original} alt="Original face crop" onError={() => setSourceFailed(original)} /><span>View source crop <ArrowRight size={14} /></span></button>}
          <dl className="source-metadata"><div><dt>Case ID</dt><dd className="case-id">{jobId || 'N/A'} {jobId && <button type="button" className="icon-button" aria-label="Copy full case ID" onClick={copyId}>{copied ? <Check size={14} /> : <Copy size={14} />}</button>}</dd></div><div><dt>Resolution</dt><dd>{resolutionText}</dd></div><div><dt>File size</dt><dd>{finiteNumber(result.file_metadata?.file_size_bytes) ? `${formatValue(result.file_metadata.file_size_bytes / 1048576)} MB` : 'N/A'}</dd></div><div><dt>Sampled frames</dt><dd>{formatValue(result.frames_analyzed, 'integer')}</dd></div><div><dt>Available scores</dt><dd>{measured} / {testIds.length}</dd></div></dl>
        </details>
        <nav className="forensic-panel detector-navigation" aria-label="Detector navigation"><h2>Jump to detector</h2>{rows.map(row => <button type="button" key={row.id} className="detector-link" aria-label={`Open ${row.config.title} test`} aria-current={activeId === row.id ? 'true' : undefined} onClick={() => selectTest(row.id)}><span>{row.config.title}</span><span style={{ color: scoreColor(row.score) }}>{formatPercent(row.score)}</span><small>{scoreStatus(row.score)}</small></button>)}</nav>
      </aside>
      <div className="report-main" ref={viewRef} tabIndex={-1}>
        <label className="mobile-detector-nav">Detector view<select aria-label="Choose detector" value={activeId} onChange={event => selectTest(event.target.value, false)}><option value="features">Report overview</option>{DOMAIN_GROUPS.filter(item => item.tests.length).map(item => <optgroup key={item.id} label={item.label}>{item.tests.filter(id => testIds.includes(id)).map(id => <option key={id} value={id}>{DIAGNOSTICS[id].title}</option>)}</optgroup>)}</select></label>
        <nav className="workbench-tabs" aria-label="Report sections">{DOMAIN_GROUPS.map(item => {
          const ids = item.tests.filter(id => testIds.includes(id));
          if (item.id !== 'dossier' && ids.length === 0) return null;
          return <button type="button" key={item.id} className={`workbench-tab-btn ${group.id === item.id ? 'active' : ''}`} aria-current={group.id === item.id ? 'page' : undefined} onClick={() => selectTest(item.id === 'dossier' ? 'features' : (ids.includes(selections[item.id]) ? selections[item.id] : ids[0]))}>{item.label}</button>;
        })}</nav>
        {group.tests.length > 1 && <nav className="subview-pills" aria-label={`${group.label} detectors`}>{group.tests.filter(id => testIds.includes(id)).map(id => <button type="button" key={id} className={`subview-pill ${activeId === id ? 'active' : ''}`} aria-pressed={activeId === id} onClick={() => selectTest(id)}>{DIAGNOSTICS[id].title}</button>)}</nav>}
        <ErrorBoundary key={activeId}><Suspense fallback={<div role="status" aria-label="Loading detector view"><SkeletonLoader type="card" /></div>}>
          {activeId === 'features' ? <FeaturesTab result={result} isVideo={/\.(mp4|avi|mov|mkv|webm)$/i.test(displayName)} onSelectTest={selectTest} /> : activeId === 'meta' ? <MetaTab result={result} /> : <DiagnosticTab key={activeId} id={activeId} result={result} setZoomedImage={setZoomedImage} />}
        </Suspense></ErrorBoundary>
        <div className="report-footnote"><Info size={15} /><span>Missing observations are unavailable evidence. A neutral score is not a passed authenticity test.</span></div>
      </div>
    </div>
    {zoomedImage && <ImageDialog src={zoomedImage} onClose={() => setZoomedImage(null)} />}
  </div>;
}
