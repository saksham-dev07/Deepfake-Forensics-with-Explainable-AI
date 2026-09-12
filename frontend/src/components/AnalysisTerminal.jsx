import React, { useEffect, useRef, useState } from 'react';
import { 
  ScanSearch, CheckCircle2, Loader2, 
  Shield, X, FileVideo, FileImage, File, Cpu, Terminal
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, progress]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStepStatus = (step, idx) => {
    if (progress === 100) return 'done';
    const nextStep = PIPELINE_STEPS[idx + 1];
    if (nextStep && progress >= nextStep.threshold) return 'done';
    if (progress >= step.threshold) return 'active';
    return 'pending';
  };

  const isVideo = file?.name ? /\.(mp4|avi|mov|mkv|webm)$/i.test(file.name) : false;
  const isImage = file?.name ? /\.(jpg|jpeg|png|webp)$/i.test(file.name) : false;

  const effectiveLogs = logs && logs.length > 0 ? logs : [
    { type: 'OK', msg: 'Media stream handshake established. Header verified.' },
    { type: 'INFO', msg: status === 'uploading' ? 'Streaming binary chunks to forensic worker...' : 'Allocating GPU/CPU tensor buffers for inference...' },
    { type: 'SYS', msg: 'Pre-loading EfficientNet-B4, SyncNet, and Tabular ResNet weights...' }
  ];

  return (
    <div style={{ maxWidth: '1080px', margin: '1rem auto 3rem auto' }}>
      {/* Top Media Target Banner */}
      <div className="forensic-panel" style={{
        padding: '1.25rem 1.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--primary)', flexShrink: 0
          }}>
            <ScanSearch size={20} className="lucide-spin" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0.15rem 0.5rem', borderRadius: '4px',
                background: status === 'uploading' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: status === 'uploading' ? 'var(--primary)' : 'var(--success)',
                fontFamily: 'var(--font-mono)'
              }}>
                {status === 'uploading' ? 'INGESTING STREAM' : '15-SENSOR FORENSIC AUDIT'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>•</span>
              <span className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Elapsed: {formatTimer(elapsedSeconds)}
              </span>
            </div>

            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isVideo ? <FileVideo size={16} color="var(--primary)" /> : isImage ? <FileImage size={16} color="var(--primary)" /> : <File size={16} color="var(--primary)" />}
              <span>{file ? file.name : 'Target Media Stream'}</span>
              {file?.size && (
                <span className="mono-font" style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                  ({formatFileSize(file.size)})
                </span>
              )}
            </div>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline"
            style={{ fontSize: '0.775rem', padding: '0.45rem 0.85rem' }}
          >
            <X size={13} /> Cancel Audit
          </button>
        )}
      </div>

      {/* Progress Bar with Phase Telemetry */}
      <div className="forensic-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu size={15} color="var(--primary)" />
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Execution Progress
            </span>
          </div>
          <span className="mono-font" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress Track */}
        <div style={{
          width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)'
        }}>
          <div style={{
            width: `${Math.min(100, Math.max(2, progress))}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary) 0%, #38bdf8 100%)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Sensor Checklist Stepper */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.6rem',
          marginTop: '1.25rem'
        }}>
          {PIPELINE_STEPS.slice(0, 8).map((step, idx) => {
            const st = getStepStatus(step, idx);
            return (
              <div key={step.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.72rem',
                color: st === 'done' ? 'var(--text-main)' : st === 'active' ? 'var(--primary)' : 'var(--text-muted)'
              }}>
                {st === 'done' ? (
                  <CheckCircle2 size={13} color="var(--success)" style={{ flexShrink: 0 }} />
                ) : st === 'active' ? (
                  <Loader2 size={13} color="var(--primary)" className="lucide-spin" style={{ flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', margin: '0 3px', flexShrink: 0 }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {step.label.split('(')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Output Log */}
      <div className="terminal-monitor">
        <div className="terminal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div className="terminal-dots">
              <div className="terminal-dot red" />
              <div className="terminal-dot yellow" />
              <div className="terminal-dot green" />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              forensic-engine: stdout stream
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Terminal size={12} />
            <span>CUDA / OpenMP Multi-Threaded</span>
          </div>
        </div>

        <div className="terminal-logs" ref={logContainerRef}>
          {effectiveLogs.map((log, i) => {
            const isOk = log.type === 'OK';
            const isErr = log.type === 'ERR';
            const isInfo = log.type === 'INFO';
            const color = isOk ? 'var(--success)' : isErr ? 'var(--danger)' : isInfo ? 'var(--accent)' : 'var(--text-muted)';
            return (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color, fontWeight: 700, minWidth: '48px', userSelect: 'none' }}>
                  [{log.type || 'SYS'}]
                </span>
                <span style={{ color: isErr ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {log.msg || log}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalysisTerminal;
