import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

const UploadZone = ({ onFileUpload }) => {
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
    <div
      className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
      style={{
        padding: '3rem 2rem',
        minHeight: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: dragActive ? '2px dashed var(--primary)' : '1px dashed #334155',
        borderRadius: 'var(--radius-lg)',
        background: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'var(--panel-bg)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        position: 'relative'
      }}
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
      <div style={{
        width: '56px',
        height: '56px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.25rem'
      }}>
        <UploadCloud size={28} color="var(--primary)" />
      </div>
      <div style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
        Select or drop media for analysis
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', textAlign: 'center' }}>
        Upload any video or image to run the full forensic inspection pipeline
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.25rem' }}>
        {['MP4', 'AVI', 'MOV', 'MKV', 'JPG', 'PNG', 'WEBP'].map(ext => (
          <span key={ext} className="mono-font" style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-sm)'
          }}>
            {ext}
          </span>
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span>Max size: 100 MB • Clamped to 60s • 15 Multimodal Forensic Sensors</span>
      </div>
    </div>
  );
};

export default UploadZone;
