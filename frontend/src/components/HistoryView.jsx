import React, { useEffect, useRef, useState } from 'react';
import { Download, History, Loader2, Search, ScanSearch, Trash2 } from 'lucide-react';
import { downloadReport } from '../utils/downloadReport';
import { formatPercent } from '../utils/reportData';
import VerdictBadge from './ui/VerdictBadge';
import Toast from './Toast';

export default function HistoryView({ history, clearHistory, onStart, onDemo }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  const filtered = history.filter(item => `${item.fileName} ${item.jobId} ${item.verdict}`.toLowerCase().includes(query.toLowerCase()));
  const download = async item => {
    const controller = new AbortController();
    request.current = controller;
    setBusy(item.jobId);
    setError(null);
    try { await downloadReport({ jobId: item.jobId, fileName: item.fileName, signal: controller.signal }); }
    catch (failure) { if (!controller.signal.aborted) setError(failure.name === 'TimeoutError' ? 'The PDF request timed out. Try again.' : failure.message); }
    finally { if (!controller.signal.aborted) setBusy(null); }
  };
  return <section className="history-view" aria-labelledby="history-title">
    {error && <Toast message={error} onClose={() => setError(null)} />}
    <div className="history-header"><div><p className="section-eyebrow">Your workspace</p><h1 id="history-title">Analysis history</h1><p>Up to 20 summaries are stored in this browser. Real reports can be downloaded while retained by the backend.</p></div>{history.length > 0 && <button type="button" className="btn btn-outline" onClick={clearHistory}><Trash2 size={15} /> Clear history</button>}</div>
    {history.length > 0 && <label className="search-field history-search"><Search size={17} /><input type="search" aria-label="Search analysis history" placeholder="Search file name, case ID, or result…" value={query} onChange={event => setQuery(event.target.value)} /></label>}
    {filtered.length ? <ul className="history-list">{filtered.map(item => <li key={item.jobId} className="forensic-panel history-card"><div className="history-details"><h2 className="history-filename">{item.fileName}</h2><div className="history-meta"><span>CASE {item.jobId.slice(0, 10)}</span><time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time>{item.isDemo && <span className="demo-tag">Demo</span>}</div><div className="history-actions">{item.isDemo ? <button type="button" className="btn btn-outline" onClick={() => onDemo(item.jobId)}>Open demo</button> : <button type="button" className="btn btn-outline" disabled={busy !== null} onClick={() => download(item)}>{busy === item.jobId ? <Loader2 size={15} className="spin-animation" /> : <Download size={15} />}{busy === item.jobId ? 'Downloading…' : 'Download PDF'}</button>}</div></div><div className="history-result"><VerdictBadge verdict={item.verdict} /><span className="mono-font">{formatPercent(item.score)} anomaly score</span></div></li>)}</ul>
      : <div className="forensic-panel history-empty"><History size={36} aria-hidden="true" /><h2>{history.length ? 'No matching analyses' : 'No analyses yet'}</h2><p>{history.length ? 'Try another search term.' : 'Upload media or explore a demo to save a summary here.'}</p>{history.length ? <button type="button" className="btn btn-outline" onClick={() => setQuery('')}>Clear search</button> : <button type="button" className="btn btn-primary" onClick={onStart}><ScanSearch size={15} /> Start an analysis</button>}</div>}
  </section>;
}
