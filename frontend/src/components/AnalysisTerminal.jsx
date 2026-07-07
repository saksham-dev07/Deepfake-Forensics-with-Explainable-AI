import React from 'react';
import { UploadCloud, ScanSearch, CheckCircle2, Loader2, Circle, Activity, Shield } from 'lucide-react';

const PIPELINE_STEPS = [
  { label: 'Extracting video frames & audio track', threshold: 5 },
  { label: 'Acoustic Pre-Processing (De-Clipping & Denoising)', threshold: 10 },
  { label: 'Running EfficientNet-B4 visual classifier', threshold: 20 },
  { label: 'Generating GradCAM visual explanations', threshold: 30 },
  { label: 'Frequency domain analysis (DCT + FFT)', threshold: 40 },
  { label: 'Error Level Analysis (JPEG compression)', threshold: 50 },
  { label: 'Biological sensors (Eye Gaze & Heartbeat)', threshold: 60 },
  { label: 'Temporal consistency (Optical Flow & Jitter)', threshold: 68 },
  { label: 'Audio forensics (PyTorch CNN & SyncNet)', threshold: 75 },
  { label: 'Running PyTorch AI Meta-Classifier', threshold: 85 },
  { label: 'Compiling court-grade forensic PDF', threshold: 90 },
];

const AnalysisTerminal = ({ status, progress, file, telemetry, logs }) => {
  const getStepStatus = (step, idx) => {
    if (progress >= step.threshold + 10 || progress === 100) return 'done';
    if (progress >= step.threshold) return 'active';
    return 'pending';
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto', animation: 'fade-in-up 0.5s ease-out' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '100px', background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.15, pointerEvents: 'none' }}></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.3)', color: 'var(--primary)', marginBottom: '1.5rem', boxShadow: '0 0 30px rgba(34, 211, 238, 0.1)' }}>
          {status === 'uploading' ? <UploadCloud size={36} /> : <ScanSearch size={36} className="lucide-spin" style={{ animationDuration: '3s' }} />} 
        </div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-1px' }}>
          {status === 'uploading' ? 'Secure Data Transfer...' : 'Running AI Meta-Classifier...'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          {file ? `Target: ${file.name}` : 'Establishing secure connection...'}
        </p>
      </div>

      {/* Main Progress Split */}
      <div className="terminal-grid">
        
        {/* Left: Pipeline Steps */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700 }}>Forensic Pipeline</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>{progress}%</div>
          </div>

          <div className="progress-bar-bg" style={{ height: '6px', margin: 0, background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--secondary), var(--primary))', boxShadow: '0 0 10px var(--primary)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            {PIPELINE_STEPS.map((step, idx) => {
              const stepStatus = getStepStatus(step, idx);
              const isActive = stepStatus === 'active';
              const isDone = stepStatus === 'done';
              
              return (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'center', gap: '1rem', 
                  opacity: isDone ? 0.6 : isActive ? 1 : 0.3,
                  transform: isActive ? 'scale(1.02) translateX(5px)' : 'scale(1) translateX(0)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActive ? 'rgba(34, 211, 238, 0.08)' : 'transparent',
                  padding: isActive ? '0.75rem 1rem' : '0.4rem 1rem',
                  borderRadius: '8px',
                  border: isActive ? '1px solid rgba(34, 211, 238, 0.2)' : '1px solid transparent'
                }}>
                  <div style={{ color: isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {isDone ? <CheckCircle2 size={18} /> : isActive ? <Loader2 size={18} className="lucide-spin" /> : <Circle size={18} />}
                  </div>
                  <div style={{ fontSize: isActive ? '0.95rem' : '0.85rem', fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : 'inherit' }}>
                    {step.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Technical Readout & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* GPU / Model Stats Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(10, 15, 30, 0.6)', border: '1px solid rgba(129, 140, 248, 0.15)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--secondary)', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={14} /> System Telemetry
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Active Model Weights</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600, fontFamily: 'monospace' }}>{telemetry?.active_model || 'Loading...'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>VRAM Allocation</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--warning)', fontWeight: 600, fontFamily: 'monospace' }}>{telemetry?.vram_allocation || 'Querying GPU...'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Hardware Backend</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{telemetry?.hardware_backend || 'Initializing...'}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Batch Processing</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{telemetry?.batch_processing || 'Waiting for stream...'}</div>
              </div>
            </div>
          </div>

          {/* Live Terminal Output Simulation */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: '#03050a', border: '1px solid rgba(34, 211, 238, 0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={14} /> Live Analysis Log
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#8b9bb4', lineHeight: 1.8, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', flex: 1, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, #03050a 0%, transparent 100%)', zIndex: 1 }}></div>
              
              {logs.map((log, i) => (
                <div key={i} style={{ animation: 'fade-in-up 0.3s ease-out' }}>
                  <span style={{ color: log.type === 'OK' ? 'var(--success)' : log.type === 'WAIT' ? 'var(--warning)' : 'var(--info)' }}>[{log.type}]</span> {log.msg}
                </div>
              ))}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
                <span style={{ animation: 'pulse 1s infinite' }}>_</span> {progress < 100 ? 'Analyzing tensors...' : 'Finalizing output...'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Skeleton Dashboard Preview */}
      {progress > 5 && progress < 100 && (
        <div style={{ marginTop: '4rem', transition: 'all 1s ease-in', animation: 'fade-in-up 1s ease-out' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', opacity: 0.7 }}>
            <div className="w-12 h-12 rounded-full bg-[#1e293b] animate-pulse"></div>
            <div className="flex flex-col gap-2 w-48 justify-center">
              <div className="h-4 bg-[#1e293b] rounded w-full animate-pulse"></div>
              <div className="h-3 bg-[#1e293b] rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', opacity: 0.4 }}>
            <div className="p-5 border border-[#334155] rounded-xl flex flex-col gap-4 bg-[#0f172a]">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#334155] animate-pulse"></div><div className="h-5 bg-[#334155] rounded w-1/3 animate-pulse"></div></div>
              <div className="h-[200px] bg-[#1e293b] rounded-lg animate-pulse"></div>
            </div>
            <div className="p-5 border border-[#334155] rounded-xl flex flex-col gap-4 bg-[#0f172a]">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#334155] animate-pulse"></div><div className="h-5 bg-[#334155] rounded w-1/3 animate-pulse"></div></div>
              <div className="h-[200px] bg-[#1e293b] rounded-lg animate-pulse"></div>
            </div>
            <div className="p-5 border border-[#334155] rounded-xl flex flex-col gap-4 bg-[#0f172a]">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#334155] animate-pulse"></div><div className="h-5 bg-[#334155] rounded w-1/3 animate-pulse"></div></div>
              <div className="h-[200px] bg-[#1e293b] rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalysisTerminal;
