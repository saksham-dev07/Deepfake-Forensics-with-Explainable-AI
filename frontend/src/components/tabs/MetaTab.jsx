import React from 'react';
import { FileText, ShieldAlert, Cpu, HardDrive, Hash, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import MetricCard from '../ui/MetricCard';
import TestDefinition from '../ui/TestDefinition';

const MetaTab = ({
  result = {},
  fileName = 'Analyzed_Media',
  jobId = 'N/A'
}) => {
  const metaAnalysis = result.metadata_analysis || {};
  const fileMeta = result.file_metadata || {};
  const metaScore = typeof result.metadata_score === 'number' 
    ? result.metadata_score 
    : (typeof metaAnalysis.metadata_score === 'number' ? metaAnalysis.metadata_score : 0);

  const tags = metaAnalysis.extracted_tags || {};
  const tagEntries = Object.entries(tags);
  const warnings = metaAnalysis.warnings || [];

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                EXIF, Container &amp; Bitstream Forensics
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Hardware encoder signatures, camera metadata tags, and synthetic generation fingerprints
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: EXIF / FFprobe / Hex Header
          </span>
        </div>

        <TestDefinition testId="meta" />

        {/* Forensic Warnings */}
        {warnings.length > 0 && (
          <div style={{ margin: '1rem 0', padding: '0.85rem 1rem', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <ShieldAlert size={15} /> Container &amp; Header Discrepancies
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              {warnings.map((w, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Basic File Properties */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Media File Specification
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <MetricCard label="File Identifier" value={fileName} type="primary" />
            <MetricCard label="Forensic Case Hash" value={jobId} subValue="Cryptographic Run ID" />
            <MetricCard label="Analysis Timestamp" value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} subValue={new Date().toLocaleTimeString()} />
            <MetricCard 
              label="Metadata Anomaly" 
              value={`${(metaScore * 100).toFixed(1)}%`} 
              subValue="EXIF & Stream Integrity" 
              type={metaScore > 0.5 ? 'danger' : 'neutral'} 
            />
            <MetricCard label="File Size" value={formatBytes(fileMeta.file_size_bytes)} subValue="Container Size on Disk" />
            <MetricCard label="Native Resolution" value={fileMeta.original_resolution || '380 × 380 (Normalized)'} subValue="Spatial Dimensions" />
            <MetricCard 
              label="Audio Stream" 
              value={fileMeta.has_audio ? 'DETECTED' : 'NO AUDIO TRACK'} 
              subValue={fileMeta.has_audio ? 'Available for SyncNet & Voice' : 'Visual Only'} 
              type={fileMeta.has_audio ? 'success' : 'neutral'} 
            />
            <MetricCard 
              label="Frames Analyzed" 
              value={String(result.frames_analyzed || 1)} 
              subValue="Temporal Sample Count" 
            />
          </div>
        </div>

        {/* Extracted EXIF Tags Table */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Extracted EXIF &amp; Structural Tags
            </span>
            <span className="mono-font" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {tagEntries.length} Records Found
            </span>
          </div>

          {tagEntries.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem' }}>
              {tagEntries.map(([key, val]) => {
                const strVal = String(val);
                const lower = strVal.toLowerCase();
                const isSuspicious = lower.includes('midjourney') || lower.includes('photoshop') || lower.includes('stable diffusion') || lower.includes('dall-e') || lower.includes('gan') || lower.includes('deepface');
                return (
                  <div 
                    key={key} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.6rem 0.85rem', 
                      background: isSuspicious ? 'rgba(244, 63, 94, 0.08)' : 'var(--panel-subtle)', 
                      borderRadius: 'var(--radius-sm)', 
                      border: isSuspicious ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid var(--glass-border)' 
                    }}
                  >
                    <span className="mono-font" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{key}</span>
                    <span 
                      className="mono-font"
                      style={{ 
                        color: isSuspicious ? 'var(--danger)' : 'var(--text-main)', 
                        fontWeight: isSuspicious ? 700 : 500, 
                        fontSize: '0.75rem', 
                        maxWidth: '60%', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }} 
                      title={strVal}
                    >
                      {strVal}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--panel-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              No standard EXIF header markers present. Typical of web-compressed, screenshot, or purely synthetic generation pipelines.
            </div>
          )}
        </div>

        {/* Multi-Modal Architecture Blueprint */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Inference Pipeline Architecture
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <MetricCard label="Visual Feature Extractor" value="EfficientNet-B4" subValue="Depth 1.8, Width 1.4, Res 380" />
            <MetricCard label="Visual Attention" value="CBAM Head" subValue="Channel & Spatial Attention" />
            <MetricCard label="Meta Classifier" value="Tabular ResNet-8" subValue="15-D Continuous Sensor Fusion" />
            <MetricCard label="Contextual Fusion" value="Self-Attention" subValue="4-Head Multi-Head Module" />
            <MetricCard label="XAI Attribution" value="Dual Grad-CAM & SHAP" subValue="Coarse & Guided Infernos" />
            <MetricCard label="Inference Engine" value="PyTorch 2.x + CUDA" subValue="FP16 Tensor Cores Active" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MetaTab);
