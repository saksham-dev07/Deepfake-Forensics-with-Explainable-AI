import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

import MetricCard from '../ui/MetricCard';
import TestDefinition from '../ui/TestDefinition';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const MetaTab = ({
  result,
  fileName,
  jobId
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon meta"><FileText size={20} color="var(--primary)" /></div>
            <div>
              <div className="panel-title">EXIF & File Metadata Analysis</div>
              <div className="panel-subtitle">Technical specifications and digital footprint</div>
            </div>
          </div>
          
          <TestDefinition testId="meta" />
          
          <div className="tab-content-wrapper">
            {result.metadata_analysis && result.metadata_analysis.warnings && result.metadata_analysis.warnings.length > 0 && (
              <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={18} /> Forensic Warnings
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                  {result.metadata_analysis.warnings.map((w, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{w}</li>)}
                </ul>
              </div>
            )}

            <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Basic File Properties
            </h4>
            <div className="metric-grid" style={{ marginBottom: '2rem' }}>
              <MetricCard label="File Name" value={fileName || 'N/A'} type="primary" />
              <MetricCard label="Job ID" value={jobId} subValue="Unique Analysis ID" />
              <MetricCard label="Analysis Date" value={new Date().toLocaleString()} />
              {result.file_metadata && (
                <>
                  <MetricCard label="File Size" value={`${(result.file_metadata.file_size_bytes / (1024*1024)).toFixed(2)} MB`} />
                  <MetricCard label="Original Resolution" value={result.file_metadata.original_resolution} />
                  <MetricCard label="Audio Track" value={result.file_metadata.has_audio ? 'Detected' : 'None'} type={result.file_metadata.has_audio ? 'success' : 'neutral'} />
                </>
              )}
            </div>

            {result.metadata_analysis && result.metadata_analysis.extracted_tags && Object.keys(result.metadata_analysis.extracted_tags).length > 0 && (
              <>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Extracted EXIF Tags
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.5rem', marginBottom: '2rem' }}>
                  {Object.entries(result.metadata_analysis.extracted_tags).map(([key, val]) => {
                    const strVal = String(val).toLowerCase();
                    const isSuspicious = strVal.includes('midjourney') || strVal.includes('photoshop');
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: isSuspicious ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: isSuspicious ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{key}</span>
                        <span style={{ color: isSuspicious ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isSuspicious ? 600 : 400, fontSize: '0.85rem', wordBreak: 'break-all' }}>{String(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Model Configuration
            </h4>
            <div className="metric-grid">
              <MetricCard label="Model Engine" value="EfficientNet-B4" subValue="Contrastive SBI" />
              <MetricCard label="Feature Dimension" value="1792-d" subValue="Vector Space" />
              <MetricCard label="Input Resolution" value="380 × 380" subValue="Cropped Face" />
              <MetricCard label="XAI Interventions" value="GradCAM, SHAP" />
              <MetricCard label="Frames Analyzed" value={result.frames_analyzed || 'N/A'} />
            </div>
          </div>
        </div>
    </>
  );
};

export default React.memo(MetaTab);
