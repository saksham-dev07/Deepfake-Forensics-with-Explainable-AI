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
      className={`glass-panel upload-zone ${dragActive ? 'drag-active' : ''}`}
      style={{
        padding: '5rem 2rem',
        border: dragActive ? '2px dashed var(--primary)' : '2px dashed rgba(56, 189, 248, 0.3)',
        borderRadius: 'var(--radius-xl)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        background: dragActive ? 'rgba(56, 189, 248, 0.05)' : 'var(--panel-bg)',
        boxShadow: dragActive ? '0 0 40px rgba(56, 189, 248, 0.2), inset 0 0 20px rgba(56, 189, 248, 0.1)' : 'var(--glass-shadow)'
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
      <div className="upload-icon-container" style={{
        width: '100px', height: '100px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '2rem',
        boxShadow: '0 0 30px rgba(56, 189, 248, 0.2), inset 0 2px 10px rgba(255,255,255,0.1)',
        transform: dragActive ? 'scale(1.1) translateY(-5px)' : 'scale(1) translateY(0)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: 'float 6s ease-in-out infinite'
      }}>
        <div className="upload-icon" style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.8))' }}>
          <UploadCloud size={48} color="var(--primary)" />
        </div>
      </div>
      <div className="upload-text outfit-font" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
        Initialize Forensic Scan
      </div>
      <div className="upload-hint" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Drag & drop media file here or click to browse
      </div>
      <div className="upload-formats" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['MP4', 'AVI', 'MOV', 'MKV', 'JPG', 'PNG', 'WEBP'].map(ext => (
          <span key={ext} className="mono-font" style={{
            fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)',
            background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '0.3rem 0.8rem', borderRadius: '12px', letterSpacing: '1px'
          }}>
            {ext}
          </span>
        ))}
      </div>
    </div>
  );
};

export default UploadZone;
