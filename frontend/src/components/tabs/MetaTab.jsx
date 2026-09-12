import React, { useState, useMemo, useCallback } from 'react';
import { 
  FileText, ShieldAlert, CheckCircle2, Copy, Check, Info, Hash, Search, Layers, HardDrive, Cpu, Terminal
} from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import MetricCard from '../ui/MetricCard';
import TestDefinition from '../ui/TestDefinition';
import VerdictBadge from '../ui/VerdictBadge';

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

const MetaTab = ({
  result = {},
  fileName = 'Analyzed_Media',
  jobId = 'N/A'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedMath, setCopiedMath] = useState(false);

  const metaAnalysis = useMemo(() => result.metadata_analysis || {}, [result.metadata_analysis]);
  const fileMeta = useMemo(() => result.file_metadata || {}, [result.file_metadata]);
  const metaScore = typeof result.metadata_score === 'number' 
    ? result.metadata_score 
    : (typeof metaAnalysis.metadata_score === 'number' ? metaAnalysis.metadata_score : 0);
  const isAnomaly = metaScore > 0.5;

  const tags = useMemo(() => metaAnalysis.extracted_tags || {}, [metaAnalysis.extracted_tags]);
  const tagEntries = useMemo(() => Object.entries(tags), [tags]);
  const warnings = useMemo(() => metaAnalysis.warnings || [], [metaAnalysis.warnings]);

  const filteredTags = useMemo(() => {
    if (!searchTerm.trim()) return tagEntries;
    const lower = searchTerm.toLowerCase();
    return tagEntries.filter(([k, v]) => 
      k.toLowerCase().includes(lower) || String(v).toLowerCase().includes(lower)
    );
  }, [tagEntries, searchTerm]);

  const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const copyHash = useCallback(() => {
    navigator.clipboard.writeText(jobId);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }, [jobId]);

  const copyLatex = useCallback(() => {
    const formula = `H(X) = - \\sum_{i=1}^{n} P(x_i) \\log_2 P(x_i), \\quad \\text{SHA-256}(M) = \\mathcal{H}(M)`;
    navigator.clipboard.writeText(formula);
    setCopiedMath(true);
    setTimeout(() => setCopiedMath(false), 2000);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* HEADER BAR */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="panel-icon" style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.4rem', borderRadius: '6px' }}>
              <FileText size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                  EXIF, Bitstream &amp; Container Forensics
                </h3>
                <span className="mono-font" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                  FRE Rule 901 Chain-of-Custody
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                Cryptographic case hashing, hardware encoder atom markers, and synthetic generation bitstream signatures
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <VerdictBadge 
              status={isAnomaly ? 'ANOMALY' : 'PASS'} 
              reason={isAnomaly ? 'EXIF Strip / Synthetic Header Detected' : 'Authentic Hardware Container Signature'} 
            />
            <div className="mono-font tabular-num" style={{ fontSize: '1.25rem', fontWeight: 800, color: isAnomaly ? 'var(--danger)' : 'var(--success)' }}>
              {(metaScore * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.85rem' }}>
          <TestDefinition testId="meta" />
        </div>

        {/* Warnings Banner */}
        {warnings.length > 0 && (
          <div style={{ 
            marginTop: '0.85rem', 
            padding: '0.65rem 0.85rem', 
            background: 'rgba(244, 63, 94, 0.08)', 
            borderRadius: 'var(--radius-xs)', 
            borderLeft: '3px solid var(--danger)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--danger)' }}>Container &amp; Header Discrepancies:</strong>
              <ul style={{ margin: '0.2rem 0 0 0', paddingLeft: '1rem' }}>
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* FORENSIC TELEMETRY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
        <MetricCard label="File Identifier" value={fileName} type="primary" />
        <div 
          onClick={copyHash}
          style={{ cursor: 'pointer' }}
          title="Click to copy cryptographic case hash"
        >
          <MetricCard 
            label="Forensic Case Hash" 
            value={jobId.length > 16 ? `${jobId.slice(0, 14)}...` : jobId} 
            subValue={copiedHash ? "COPIED TO CLIPBOARD" : "Click to Copy SHA-256"} 
            type={copiedHash ? "success" : "neutral"} 
          />
        </div>
        <MetricCard 
          label="Analysis Timestamp" 
          value={new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} 
          subValue={new Date().toLocaleTimeString()} 
        />
        <MetricCard 
          label="Metadata Anomaly" 
          value={`${(metaScore * 100).toFixed(1)}%`} 
          subValue="EXIF & Stream Integrity" 
          type={isAnomaly ? 'danger' : 'success'} 
        />
        <MetricCard label="File Size" value={formatBytes(fileMeta.file_size_bytes)} subValue="Container Size on Disk" />
        <MetricCard label="Native Resolution" value={fileMeta.original_resolution || '380 × 380 (Normalized)'} subValue="Spatial Dimensions" />
        <MetricCard 
          label="Audio Bitstream" 
          value={fileMeta.has_audio ? 'DETECTED' : 'NO AUDIO TRACK'} 
          subValue={fileMeta.has_audio ? 'Available for SyncNet & Voice' : 'Silent / Visual Only'} 
          type={fileMeta.has_audio ? 'success' : 'neutral'} 
        />
        <MetricCard 
          label="Frames Sampled" 
          value={String(result.frames_analyzed || 1)} 
          subValue="Temporal Sample Count" 
        />
      </div>

      {/* TWO COLUMN WORKBENCH: EXIF TAG EXPLORER + MATHEMATICAL DERIVATION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.4fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        
        {/* LEFT COLUMN: EXTRACTED EXIF & CONTAINER TAG EXPLORER */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={14} color="var(--primary)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Extracted EXIF &amp; Bitstream Tags
              </span>
              <span className="mono-font" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                {filteredTags.length} Entries
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '0.2rem 0.5rem', gap: '0.35rem' }}>
              <Search size={12} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Filter EXIF tags..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.72rem', outline: 'none', width: '120px' }}
              />
            </div>
          </div>

          {filteredTags.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {filteredTags.map(([key, val]) => {
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
                      padding: '0.45rem 0.65rem', 
                      background: isSuspicious ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: '4px', 
                      border: isSuspicious ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(255,255,255,0.04)' 
                    }}
                  >
                    <span className="mono-font" style={{ color: isSuspicious ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.72rem' }}>
                      {key}
                    </span>
                    <span 
                      className="mono-font"
                      style={{ 
                        color: isSuspicious ? 'var(--danger)' : 'var(--text-main)', 
                        fontWeight: isSuspicious ? 700 : 500, 
                        fontSize: '0.72rem', 
                        maxWidth: '65%', 
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
            <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No standard EXIF header markers present. Typical of web-compressed, screenshot, or purely synthetic generation pipelines.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ARCHITECTURE BLUEPRINT & ENTROPY DERIVATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          
          {/* Multi-Modal Architecture Blueprint */}
          <div className="glass-panel" style={{ padding: '0.85rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <Layers size={14} />
              <span>Inference Pipeline Specifications</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Visual Backbone</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>EfficientNet-B4 + CBAM</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Tabular Fusion</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>ResNet-8 (15D Sensors)</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Context Fusion</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>4-Head Cross-Attention</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.45rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>XAI Attribution</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>Dual Grad-CAM &amp; SHAP</div>
              </div>
            </div>
          </div>

          {/* KaTeX Shannon Entropy & Hash Formulations */}
          <div className="glass-panel" style={{ padding: '0.85rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <span className="mono-font" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.04em' }}>
                SHANNON BITSTREAM ENTROPY
              </span>
              <button
                type="button"
                onClick={copyLatex}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem' }}
                title="Copy LaTeX formulation"
              >
                {copiedMath ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                {copiedMath ? 'Copied' : 'LaTeX'}
              </button>
            </div>

            <div style={{ background: '#03060f', padding: '0.55rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.65rem' }}>
              <LatexMath 
                math="H(X) = - \sum_{i=1}^{n} P(x_i) \log_2 P(x_i), \quad \text{SHA-256}(M) = \mathcal{H}(M)" 
              />
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Standard JPEG or MP4 containers produce byte distribution entropy <LatexMath inline math="H \approx 7.95" /> bits/byte. Re-compressed or synthetic bitstreams lacking hardware quantization tables exhibit abnormal entropy drops in low-frequency header slices.
            </div>
          </div>

          {/* Daubert Admissibility & Judicial Standard */}
          <div style={{ 
            padding: '0.65rem 0.85rem', 
            background: 'rgba(56, 189, 248, 0.04)', 
            borderLeft: '3px solid var(--primary)', 
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <Info size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-main)' }}>FRE Rule 901(b)(1) Chain of Custody:</strong> Cryptographic SHA-256 case digest hashing guarantees digital media integrity and immutability throughout courtroom proceedings.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default React.memo(MetaTab);
