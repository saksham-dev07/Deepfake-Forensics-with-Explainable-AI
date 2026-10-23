import React, { useEffect, useState } from 'react';
import { Cpu, Layers, AudioLines, ExternalLink, Info } from 'lucide-react';
import { resolvePublicAssetUrl } from '../utils/mediaUrl';
import { formatPercent, formatValue } from '../utils/reportData';
import ImageDialog from './ui/ImageDialog';
import SkeletonLoader from './ui/SkeletonLoader';

const BENCHMARKS = [
  { id: 'ff-v2', label: 'FaceForensics++ · v2', folder: 'v2/faceforensics', file: 'metrics_summary_ff.json', image: 'diagnostic_curves_ff.png' },
  { id: 'celeb-v1', label: 'Celeb-DF · v1', folder: 'v1/celebdf', file: 'metrics_summary.json', image: 'diagnostic_curves.png' },
  { id: 'faces-v1', label: '140k Faces · v1', folder: 'v1/140k', file: 'metrics_summary_140k.json', image: 'diagnostic_curves_140k.png' },
];
const MODELS = [
  { icon: Cpu, title: 'Visual detector', subtitle: 'EfficientNet-B4 + CBAM', detail: 'Evaluates normalized 380 × 380 face crops. Class 0 represents the model’s fake class; Grad-CAM uses the final convolutional layer to visualize attention.', checkpoint: 'improved_finetuned_model_v2.pth', source: 'models.py' },
  { icon: Layers, title: 'Ensemble classifier', subtitle: 'XGBoost with a trained neural fallback', detail: 'Combines 15 ordered detector features. A trained Tabular ResNet is used when XGBoost cannot load. Critical-score override rules are part of the production decision and SHAP calculation.', checkpoint: 'ensemble_mlp_xgb.json / ensemble_mlp.pth', source: 'ensemble_classifier.py' },
  { icon: AudioLines, title: 'Audio models', subtitle: 'SyncNet + lightweight voice CNN', detail: 'SyncNet compares 25 Hz mouth windows with 16 kHz audio features. The voice model uses mel spectrograms. These outputs are unavailable when the required audio or observations are missing.', checkpoint: 'syncnet_v2.model / voice_spoofing.pth', source: 'audio_sync.py' },
];

export default function ModelsOverview() {
  const [selected, setSelected] = useState(BENCHMARKS[0].id);
  const [records, setRecords] = useState({});
  const [zoom, setZoom] = useState(null);
  const [imageFailed, setImageFailed] = useState(null);
  const benchmark = BENCHMARKS.find(item => item.id === selected);
  const state = records[selected];
  const data = state?.data;
  const base = `benchmark_artifacts/${benchmark.folder}/`;
  const jsonUrl = resolvePublicAssetUrl(base + benchmark.file);
  const imageUrl = resolvePublicAssetUrl(base + benchmark.image);
  useEffect(() => {
    const controller = new AbortController();
    fetch(resolvePublicAssetUrl(`benchmark_artifacts/${benchmark.folder}/${benchmark.file}`), { signal: controller.signal })
      .then(response => { if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('This archived benchmark record is unavailable. Select another dataset or try again later.'); return response.json(); })
      .then(value => { if (!controller.signal.aborted) setRecords(previous => ({ ...previous, [benchmark.id]: { data: value } })); })
      .catch(error => { if (!controller.signal.aborted) setRecords(previous => ({ ...previous, [benchmark.id]: { error: error.message } })); });
    return () => controller.abort();
  }, [benchmark]);
  const matrix = data?.Confusion_Matrix;
  return <section className="models-view diagnostic-view" aria-labelledby="models-title">
    <header className="view-heading"><div><p className="section-eyebrow">Models &amp; evaluation</p><h1 id="models-title">Understand the system behind the result</h1><p>Implementation details and archived evaluation records. Dataset-specific results are not a guarantee for new media.</p></div></header>
    <div className="model-card-grid">{MODELS.map(model => { const Icon = model.icon; return <article className="forensic-panel overview-panel model-card" key={model.title}><Icon size={25} /><h2>{model.title}</h2><strong>{model.subtitle}</strong><p>{model.detail}</p><code>{model.checkpoint}</code><a href={`https://github.com/saksham-dev07/Deepfake-Forensics-with-Explainable-AI/blob/main/backend/pipeline/${model.source}`} target="_blank" rel="noopener noreferrer">View implementation <ExternalLink size={14} /></a></article>; })}</div>
    <div className="notice notice-info"><Info size={20} /><div><strong>Training validation and independent testing are different</strong><p>The archived v2 FaceForensics++ test record covers 977 videos and reports 66.02% accuracy and 64.28% recall. The 96.80% training-validation figure is not that test accuracy. These stored records have not been re-evaluated after the pipeline corrections.</p></div></div>
    <section className="forensic-panel overview-panel"><div className="view-heading"><div><p className="section-eyebrow">Stored benchmark records</p><h2>Inspect the evidence behind a metric</h2></div><a href={jsonUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Open source JSON <ExternalLink size={15} /></a></div>
      <div className="exhibit-picker" aria-label="Benchmark datasets">{BENCHMARKS.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>
      {!state ? <div role="status" aria-label="Loading benchmark"><SkeletonLoader type="card" /></div> : state.error ? <p className="notice notice-warning" role="status">{state.error}</p> : <>
        <dl className="benchmark-metrics">{[['Samples', formatValue(data.Total_Videos ?? data.Total_Images, 'integer')], ['Accuracy', formatPercent(data.Overall_Accuracy ?? data.Accuracy, 2)], ['Precision', formatPercent(data.Precision, 2)], ['Recall', formatPercent(data.Recall_TPR, 2)], ['Specificity', formatPercent(data.Specificity_TNR, 2)], ['ROC AUC', formatValue(data.ROC_AUC)]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="overview-columns"><div><h3>Recorded confusion matrix</h3><p className="section-description">Counts from the selected JSON record. No simulated operating threshold is applied.</p><dl className="confusion-grid">{[['TN','Real samples predicted real'],['FP','Real samples predicted fake'],['FN','Fake samples predicted real'],['TP','Fake samples predicted fake']].map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{formatValue(matrix?.[key], 'integer')}</dd></div>)}</dl></div>
        <div><h3>Archived diagnostic curves</h3>{imageFailed === imageUrl ? <p className="notice notice-warning">This archived image is unavailable. Use the source JSON above.</p> : <button type="button" className="benchmark-preview" aria-label="Expand benchmark curves" onClick={() => setZoom(imageUrl)}><img src={imageUrl} alt={`${benchmark.label} archived diagnostic curves`} loading="lazy" onError={() => setImageFailed(imageUrl)} /><span>Expand image <ExternalLink size={15} /></span></button>}</div></div>
      </>}
    </section>
    <section className="forensic-panel overview-panel"><h2>Known limits</h2><ul className="method-limits"><li>Detector scores and heuristic thresholds need representative labeled-data validation.</li><li>Compression, resizing, lighting, missing faces, and dataset shift affect results.</li><li>Procedurally generated ensemble training data are not an independent benchmark.</li><li>A lower anomaly score does not verify identity, camera origin, or legal admissibility.</li></ul></section>
    {zoom && <ImageDialog src={zoom} onClose={() => setZoom(null)} />}
  </section>;
}
