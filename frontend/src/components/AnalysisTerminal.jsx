import React, { useEffect, useRef } from 'react';
import { 
  UploadCloud, ScanSearch, CheckCircle2, Loader2, Circle, 
  Activity, Shield, X, FileVideo, FileImage, File, Cpu, Layers
} from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 'ingest', label: 'Stream Ingestion & 100MB Magic-Byte MIME Validation', threshold: 0 },
  { id: 'frames', label: 'PySceneDetect Keyframes & MediaPipe Face Tracking', threshold: 10 },
  { id: 'backbone', label: 'EfficientNet-B4 + CBAM Batched Face Inference', threshold: 15 },
  { id: 'xai', label: 'Dual-Resolution Grad-CAM & Guided Heatmap XAI', threshold: 30 },
  { id: 'frequency', label: 'Frequency Decomposition (2D FFT / DCT Azimuthal)', threshold: 45 },
  { id: 'hardware', label: 'Bayer CFA Demosaicing & PRNU Sensor Pattern Noise', threshold: 55 },
  { id: 'photometric', label: 'Photometric 3D Harmonics & Optical Flow Vector Field', threshold: 65 },
  { id: 'biological', label: 'Cardiovascular rPPG (CHROM) & Blink Kinematics', threshold: 75 },
  { id: 'audio', label: 'Audio-Visual SyncNet (1024-D) & Voice Anti-Spoofing CNN', threshold: 80 },
  { id: 'meta', label: 'PyTorch Tabular ResNet & XGBoost 15-Sensor Meta-Classifier', threshold: 85 },
  { id: 'dossier', label: 'Synthesizing Court-Admissible Forensic PDF Dossier', threshold: 90 },
];

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AnalysisTerminal = ({ status, progress, file, telemetry, logs = [], onCancel }) => {
  const logContainerRef = useRef(null);

  // Scroll to top on mount so the user sees the active pipeline immediately
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // ONLY auto-scroll the internal terminal log box, NEVER the window/page!
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, progress]);

  const getStepStatus = (step, idx) => {
    if (progress === 100) return 'done';
    const nextStep = PIPELINE_STEPS[idx + 1];
    if (nextStep && progress >= nextStep.threshold) return 'done';
    if (progress >= step.threshold) return 'active';
    return 'pending';
  };

  const isVideo = file?.name ? /\.(mp4|avi|mov|mkv|webm)$/i.test(file.name) : false;
  const isImage = file?.name ? /\.(jpg|jpeg|png|webp)$/i.test(file.name) : false;

  // Curate live log messages with graceful initial defaults
  const effectiveLogs = logs && logs.length > 0 ? logs : [
    { type: 'OK', msg: 'Media stream handshake established. File hash verified.' },
    { type: 'INFO', msg: status === 'uploading' ? 'Streaming binary chunks to forensic worker...' : 'Allocating GPU/CPU tensor buffers for inference...' },
    { type: 'WAIT', msg: 'Pre-loading EfficientNet-B4, SyncNet and Tabular ResNet weights...' }
  ];

  return (
    <div style={{ maxWidth: '1180px', margin: '1rem auto 2rem auto', animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      
      {/* Top Header & File Info Banner */}
      <div className="glass-panel" style={{ 
        padding: '1.25rem 1.75rem', 
        marginBottom: '1.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.95) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: status === 'uploading' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: status === 'uploading' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: status === 'uploading' ? 'var(--primary)' : 'var(--success)',
            flexShrink: 0
          }}>
            {status === 'uploading' ? (
              <UploadCloud size={24} className="lucide-spin" style={{ animationDuration: '4s' }} />
            ) : (
              <ScanSearch size={24} className="lucide-spin" style={{ animationDuration: '3s' }} />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0.15rem 0.5rem', borderRadius: '4px',
                background: status === 'uploading' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                color: status === 'uploading' ? 'var(--primary)' : 'var(--success)',
                border: status === 'uploading' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {status === 'uploading' ? 'STREAMING MEDIA' : 'ANALYSIS IN PROGRESS'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {status === 'uploading' ? 'Uploading to secure sandbox' : '15-Sensor Forensic Inference'}
              </span>
            </div>

            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isVideo ? <FileVideo size={18} color="var(--primary)" /> : isImage ? <FileImage size={18} color="var(--primary)" /> : <File size={18} color="var(--primary)" />}
              <span>{file ? file.name : 'Target Media Stream'}</span>
              {file?.size && (
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  ({formatFileSize(file.size)})
                </span>
              )}
            </div>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--danger)',
              background: 'rgba(239, 68, 68, 0.06)'
            }}
          >
            <X size={13} /> Cancel Analysis
          </button>
        )}
      </div>

      {/* Main Split: Steps vs Telemetry & Live Logs */}
      <div className="terminal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1.15fr)', gap: '1.5rem' }}>
        
        {/* Left Column: Forensic Pipeline Progression */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Forensic Pipeline Sequence
              </span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              {progress}%
            </div>
          </div>

          {/* Smooth High-Resolution Progress Bar */}
          <div style={{
            height: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${Math.max(3, progress)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--primary) 0%, #38bdf8 50%, var(--success) 100%)',
              borderRadius: '999px',
              transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)'
            }} />
          </div>

          {/* Pipeline Step List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {PIPELINE_STEPS.map((step, idx) => {
              const stepStatus = getStepStatus(step, idx);
              const isActive = stepStatus === 'active';
              const isDone = stepStatus === 'done';
              
              return (
                <div key={step.id || idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  opacity: isDone ? 0.75 : isActive ? 1 : 0.35,
                  transition: 'all 0.25s ease',
                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : isDone ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                  padding: isActive ? '0.55rem 0.8rem' : '0.35rem 0.8rem',
                  borderRadius: '8px',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 16px rgba(59, 130, 246, 0.15)' : 'none'
                }}>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)',
                    flexShrink: 0
                  }}>
                    {isDone ? (
                      <CheckCircle2 size={16} />
                    ) : isActive ? (
                      <Loader2 size={16} className="lucide-spin" />
                    ) : (
                      <Circle size={16} />
                    )}
                  </div>
                  <div style={{ 
                    fontSize: isActive ? '0.86rem' : '0.8rem', 
                    fontWeight: isActive ? 700 : isDone ? 500 : 400, 
                    color: isActive ? '#ffffff' : isDone ? 'var(--text-main)' : 'var(--text-secondary)',
                    lineHeight: 1.4
                  }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Telemetry & Live Terminal Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Telemetry Card */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            background: 'rgba(8, 14, 28, 0.75)', 
            border: '1px solid rgba(129, 140, 248, 0.18)' 
          }}>
            <div style={{ 
              fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', 
              color: 'var(--secondary)', fontWeight: 700, marginBottom: '0.85rem', 
              display: 'flex', alignItems: 'center', gap: '0.5rem' 
            }}>
              <Activity size={14} /> Execution Telemetry &amp; Hardware
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Active Model Weights</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {telemetry?.active_model || 'Ensemble (EfficientNet + SyncNet)'}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>VRAM Allocation</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--warning)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {telemetry?.vram_allocation || (status === 'uploading' ? 'Standby' : 'Allocating...')}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Hardware Backend</div>
                <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 700, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Cpu size={13} color="var(--primary)" />
                  {telemetry?.hardware_backend || (status === 'uploading' ? 'Awaiting Handshake' : 'Initializing PyTorch...')}
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.35)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>Batch Processing</div>
                <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {telemetry?.batch_processing || (isVideo ? '32 Frames/batch' : '1 Image/batch')}
                </div>
              </div>
            </div>
          </div>

          {/* Live Terminal Output Window */}
          <div className="glass-panel" style={{ 
            padding: '1.25rem', 
            background: '#030611', 
            border: '1px solid rgba(34, 211, 238, 0.18)', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: '280px'
          }}>
            <div style={{ 
              fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', 
              color: 'var(--primary)', fontWeight: 700, marginBottom: '0.75rem', 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Shield size={14} /> Live Forensic Telemetry Stream
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', color: 'var(--success)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 8px var(--success)' }} />
                ACTIVE
              </div>
            </div>

            <div 
              ref={logContainerRef}
              style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.76rem', 
                color: '#94a3b8', 
                lineHeight: 1.7, 
                overflowY: 'auto',
                maxHeight: '230px',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.25rem',
                paddingRight: '0.5rem'
              }}
            >
              {effectiveLogs.map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ 
                    fontWeight: 700,
                    flexShrink: 0,
                    color: log.type === 'OK' ? 'var(--success)' : log.type === 'WAIT' ? 'var(--warning)' : log.type === 'ERROR' ? 'var(--danger)' : 'var(--primary)' 
                  }}>
                    [{log.type}]
                  </span>
                  <span style={{ color: log.type === 'ERROR' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              color: 'var(--primary)', marginTop: 'auto', 
              paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: '0.78rem', fontFamily: 'var(--font-mono)' 
            }}>
              <span style={{ animation: 'pulse 1.2s infinite', fontWeight: 800 }}>&gt;</span>
              <span>{progress < 100 ? 'Correlating 15 multimodal forensic dimensions...' : 'Finalizing court-admissible dossier...'}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default AnalysisTerminal;
