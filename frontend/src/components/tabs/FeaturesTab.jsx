import React from 'react';
import { ArrowRight, Info, ChartNoAxesCombined } from 'lucide-react';
import { DIAGNOSTICS } from '../../constants/diagnostics';
import { diagnosticData, finiteNumber, formatPercent, scoreColor, scoreStatus } from '../../utils/reportData';
import TestDefinition from '../ui/TestDefinition';

export default function FeaturesTab({ result = {}, isVideo = false, onSelectTest = () => {} }) {
  const tests = Object.entries(DIAGNOSTICS).filter(([, config]) => (!config.video || isVideo) && (!config.audio || result.file_metadata?.has_audio));
  const measured = tests.map(([id]) => ({ id, ...diagnosticData(result, id) }));
  const features = Array.isArray(result.shap_top_features) ? result.shap_top_features.flatMap(item => {
    if (item && typeof item === 'object' && typeof item.feature === 'string' && finiteNumber(item.importance)) {
      return [{ name: item.feature, value: Math.abs(item.importance) * 100, direction: item.direction === 'FAKE' ? 'Raises anomaly score' : item.direction === 'AUTHENTIC' ? 'Lowers anomaly score' : 'Direction unavailable' }];
    }
    if (typeof item !== 'string') return [];
    const match = item.match(/\((?:Impact:\s*)?(\d+(?:\.\d+)?)%\s*(.*?)\)/i);
    return match ? [{ name: item.replace(match[0], '').trim(), value: Number(match[1]), direction: /FAKE/i.test(match[2]) ? 'Raises anomaly score' : 'Lowers anomaly score' }] : [];
  }) : [];
  const maxImpact = Math.max(1, ...features.map(feature => feature.value));
  return <section className="diagnostic-view" aria-labelledby="overview-title">
    <header className="view-heading"><div><p className="section-eyebrow">Report overview</p><h2 id="overview-title">Evidence at a glance</h2><p>{measured.filter(test => test.score !== null).length} of {tests.length} applicable detector scores available. Open a detector to review its source measurements.</p></div></header>
    <div className="overview-columns">
      <section className="forensic-panel overview-panel"><h3>Detector results</h3><p className="section-description">Anomaly estimates from the report. Missing values stay unavailable.</p><div className="score-list">{measured.map(test => <button type="button" key={test.id} className="score-row" onClick={() => onSelectTest(test.id)} aria-label={`Open ${test.config.title}`}><span className="score-row-heading"><span>{test.config.title}</span><strong style={{ color: scoreColor(test.score) }}>{formatPercent(test.score)}</strong><ArrowRight size={15} /></span><span className="score-track" aria-hidden="true"><span style={{ width: `${(test.score ?? 0) * 100}%`, background: scoreColor(test.score) }} /></span><span className="score-row-status">{scoreStatus(test.score)}</span></button>)}</div></section>
      <div className="diagnostic-details"><section className="forensic-panel overview-panel"><h3>What influenced the prediction</h3><p className="section-description">Reported SHAP feature influence on the combined model output.</p>{features.length ? <ol className="attribution-list">{features.map((feature, index) => <li key={index}><div><strong>{feature.name}</strong><span>{feature.value.toFixed(1)}%</span></div><span className="score-track" aria-hidden="true"><span style={{ width: `${Math.min(100, feature.value / maxImpact * 100)}%`, background: 'var(--primary)' }} /></span><small>{feature.direction}</small></li>)}</ol> : <div className="evidence-empty compact"><ChartNoAxesCombined size={30} /><strong>Attribution unavailable</strong><p>No measured SHAP contribution was returned.</p></div>}</section>
      <section className="notice notice-info"><Info size={18} /><div><strong>Interpret the evidence together</strong><p>The model does not verify identity, intent, camera origin, or legal admissibility. A low score means limited detected anomalies, not proven authenticity.</p></div></section></div>
    </div>
    <TestDefinition testId="features" />
  </section>;
}
