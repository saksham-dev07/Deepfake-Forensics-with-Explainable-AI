import React, { useState } from 'react';
import { Search, FileSearch } from 'lucide-react';
import { diagnosticData, formatPercent } from '../../utils/reportData';
import VerdictBadge from '../ui/VerdictBadge';
import TestDefinition from '../ui/TestDefinition';

export default function MetaTab({ result = {} }) {
  const { data, score, warnings } = diagnosticData(result, 'meta');
  const [query, setQuery] = useState('');
  const tags = data.extracted_tags && typeof data.extracted_tags === 'object' ? Object.entries(data.extracted_tags) : [];
  const filtered = tags.filter(([key, value]) => `${key} ${String(value)}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="diagnostic-view"><header className="view-heading"><div><p className="section-eyebrow">File context</p><h2>Container metadata</h2><p>Metadata extracted from the uploaded file. Missing tags and editing tools do not independently prove synthesis.</p></div><VerdictBadge status={score === null ? 'Unavailable' : 'Info'} reason={score === null ? 'Measurement unavailable' : `${formatPercent(score)} anomaly score`} /></header>
    {warnings.length > 0 && <div className="notice notice-warning"><ul>{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
    <section className="forensic-panel overview-panel"><div className="evidence-heading"><h3>Extracted tags <span className="count-badge">{tags.length}</span></h3><label className="search-field"><Search size={16} /><input type="search" aria-label="Filter metadata" placeholder="Filter metadata…" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
      {filtered.length ? <dl className="metadata-list">{filtered.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl> : <div className="evidence-empty compact"><FileSearch size={30} /><strong>{tags.length ? 'No matching tags' : 'No metadata tags returned'}</strong><p>{tags.length ? 'Try another search term.' : 'Many normal export and sharing workflows strip metadata.'}</p></div>}
    </section><TestDefinition testId="meta" /></section>;
}
