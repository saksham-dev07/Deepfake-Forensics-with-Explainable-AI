import React, { useRef, useState } from 'react';
import { UploadCloud, Play, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SAMPLE_REPORTS } from '../constants/sampleReports';

const UploadZone = ({ onFileUpload, onSelectSample }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };
  
  const triggerFileSelect = () => fileInputRef.current.click();
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="upload-card-wrapper">
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={triggerFileSelect}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          style={{ display: 'none' }}
          accept="video/*,image/*"
        />

        <div className="upload-icon-box">
          <UploadCloud size={24} color="var(--primary)" />
        </div>

        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
          Select or drop media stream
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', textAlign: 'center' }}>
          Ingest video or image file to execute parallel forensic audit
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
          {['MP4', 'MOV', 'MKV', 'AVI', 'JPG', 'PNG', 'WEBP'].map(ext => (
            <span key={ext} className="format-chip">
              {ext}
            </span>
          ))}
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)' }}>
          <span>Max 100 MB • Binary Magic-Byte Check • 15 Sensors</span>
        </div>
      </div>

      {/* Quick Interactive Forensic Demos */}
      <div className="sample-presets-panel">
        <div className="sample-presets-header">
          <div className="sample-presets-title">
            <Sparkles size={13} color="var(--primary)" />
            <span>Instant Forensic Evaluation Demos</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            1-Click Pre-Audited
          </span>
        </div>

        <button
          type="button"
          className="sample-preset-btn"
          onClick={() => onSelectSample && onSelectSample('deepfake_face')}
        >
          <div className="preset-btn-left">
            <div style={{
              width: '28px', height: '28px', borderRadius: '4px',
              background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)'
            }}>
              <AlertTriangle size={14} />
            </div>
            <div>
              <div className="preset-title">{SAMPLE_REPORTS.deepfake_face.meta.title}</div>
              <div className="preset-subtitle">High probability face-swap • CFA &amp; rPPG failure</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.12)', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
              88.4% ANOMALY
            </span>
            <Play size={12} color="var(--text-muted)" />
          </div>
        </button>

        <button
          type="button"
          className="sample-preset-btn"
          onClick={() => onSelectSample && onSelectSample('pristine_capture')}
        >
          <div className="preset-btn-left">
            <div style={{
              width: '28px', height: '28px', borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)'
            }}>
              <ShieldCheck size={14} />
            </div>
            <div>
              <div className="preset-title">{SAMPLE_REPORTS.pristine_capture.meta.title}</div>
              <div className="preset-subtitle">Authentic camera sensor • Valid PRNU &amp; corneal highlights</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
              GENUINE 95.2%
            </span>
            <Play size={12} color="var(--text-muted)" />
          </div>
        </button>

        <button
          type="button"
          className="sample-preset-btn"
          onClick={() => onSelectSample && onSelectSample('ai_altered')}
        >
          <div className="preset-btn-left">
            <div style={{
              width: '28px', height: '28px', borderRadius: '4px',
              background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)'
            }}>
              <Sparkles size={14} />
            </div>
            <div>
              <div className="preset-title">{SAMPLE_REPORTS.ai_altered.meta.title}</div>
              <div className="preset-subtitle">Authentic face • Localized generative retouching / ELA seam</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
              ALTERED 58.2%
            </span>
            <Play size={12} color="var(--text-muted)" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default UploadZone;
