import React, { useState, useRef } from 'react';
import ReportDashboard from './components/ReportDashboard';
import ModelsOverview from './components/ModelsOverview';
import { 
  Shield, Zap, ScanSearch, Info, Lock, BrainCircuit, Target, Database,
  BarChart3, Volume2, UploadCloud, CheckCircle2, Loader2, Circle, GitBranch, Settings, Activity, Focus, Camera, Lightbulb, FileText
} from 'lucide-react';

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

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [telemetry, setTelemetry] = useState(null);
  const [logs, setLogs] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [activeNav, setActiveNav] = useState('analyze');
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setStatus('uploading');

    const formData = new FormData();
    formData.append('file', selectedFile);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setJobId(data.job_id);
      setStatus('processing');
      pollStatus(data.job_id);
    } catch (error) {
      console.error(error);
      setStatus('idle');
      alert('Error uploading file. Please ensure the backend server is running.');
    }
  };

  const pollStatus = (currentJobId) => {
    const interval = setInterval(async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
        const response = await fetch(`${API_BASE}/api/status/${currentJobId}`, {
          headers: {
            'x-api-key': API_KEY,
          }
        });
        const data = await response.json();

        if (data.status === 'processing') {
          setProgress(data.progress || 0);
          if (data.telemetry) setTelemetry(data.telemetry);
          if (data.logs) setLogs(data.logs);
        } else if (data.status === 'completed') {
          clearInterval(interval);
          setProgress(100);
          setStatus('complete');
          setResult(data.result);
        } else if (data.status === 'failed' || !data.status) {
          clearInterval(interval);
          setStatus('idle');
          alert('Analysis failed: ' + (data.error || data.message || 'Job not found or unknown error'));
        }
      } catch (error) {
        console.error('Status poll error', error);
      }
    }, 1500);
  };

  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  };
  const triggerFileSelect = () => fileInputRef.current.click();
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
  };
  const resetApp = () => {
    setFile(null); setStatus('idle'); setProgress(0); setJobId(null); setResult(null); setTelemetry(null); setLogs([]);
  };

  const getStepStatus = (step, idx) => {
    if (progress >= step.threshold + 10 || progress === 100) return 'done';
    if (progress >= step.threshold) return 'active';
    return 'pending';
  };

  return (
    <>
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); resetApp(); }}>
            <div className="navbar-logo"><Shield size={24} color="var(--primary)" /></div>
            <div className="navbar-title">Deep<span>Forensics</span></div>
          </a>

          <div className="navbar-links">
            <button
              className={`nav-link ${activeNav === 'analyze' ? 'active' : ''}`}
              onClick={() => { setActiveNav('analyze'); if (status === 'complete') resetApp(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ScanSearch size={18} /> Analyze
            </button>
            <button
              className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
              onClick={() => setActiveNav('about')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Info size={18} /> How It Works
            </button>
            <button
              className={`nav-link ${activeNav === 'models' ? 'active' : ''}`}
              onClick={() => setActiveNav('models')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Database size={18} /> Models & Research
            </button>
            <div className="nav-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '1.5rem' }}>
              <Zap size={14} /> AI Powered
            </div>
            <div style={{ height: '24px', width: '1px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>
            <a href="https://github.com/saksham-dev07/Deepfake-Forensics-with-Explainable-AI" target="_blank" rel="noopener noreferrer" className="nav-link" title="Source Code Repository" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
              <GitBranch size={20} />
            </a>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="page-content">

          {/* ====== ANALYZE TAB ====== */}
          {activeNav === 'analyze' && (
            <>
              {/* IDLE STATE: Hero + Upload */}
              {status === 'idle' && (
                <>
                  <section className="hero">
                    <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Lock size={14} /> Court-Grade Forensic Analysis
                    </div>
                    <h1>Deepfake Detection<br />with Explainable AI</h1>
                    <p className="hero-subtitle">
                      An enterprise-grade, multi-modal pipeline for synthetic media detection. 
                      Upload any video or image to generate comprehensive visual evidence and a court-ready PDF report.
                    </p>
                  </section>

                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <BrainCircuit size={16} className="stat-card-icon" /> Core Engine
                      </div>
                      <div className="stat-card-value">PyTorch Meta-Classifier</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>15-Feature ML Ensemble</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <ScanSearch size={16} className="stat-card-icon" style={{ color: 'var(--primary)' }} /> Explainability
                      </div>
                      <div className="stat-card-value">GradCAM & SHAP</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visual Evidence Heatmaps</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <Activity size={16} className="stat-card-icon" style={{ color: 'var(--danger)' }} /> Signal Analysis
                      </div>
                      <div className="stat-card-value">Frequency & ELA</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DCT & Compression Analysis</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <Camera size={16} className="stat-card-icon" style={{ color: '#a855f7' }} /> Sensor Forensics
                      </div>
                      <div className="stat-card-value">PRNU Extraction</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Camera Noise Fingerprinting</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <Focus size={16} className="stat-card-icon" style={{ color: 'var(--warning)' }} /> Temporal
                      </div>
                      <div className="stat-card-value">Face Geometry</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frame-by-frame Jitter Tracking</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-header">
                        <Volume2 size={16} className="stat-card-icon" style={{ color: 'var(--secondary)' }} /> Audio-Visual
                      </div>
                      <div className="stat-card-value">PyTorch 2D-CNN</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Anti-Spoofing & SyncNet</div>
                    </div>
                  </div>

                  <div
                    className={`glass-panel upload-zone ${dragActive ? 'drag-active' : ''}`}
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
                    <div className="upload-icon-container">
                      <div className="upload-icon"><UploadCloud size={48} color="var(--primary)" /></div>
                    </div>
                    <div className="upload-text">Drag & Drop Media File</div>
                    <div className="upload-hint">or click to browse from your device</div>
                    <div className="upload-formats">
                      <span className="format-tag">MP4</span>
                      <span className="format-tag">AVI</span>
                      <span className="format-tag">MOV</span>
                      <span className="format-tag">MKV</span>
                      <span className="format-tag">JPG</span>
                      <span className="format-tag">PNG</span>
                      <span className="format-tag">WEBP</span>
                    </div>
                  </div>

                  <section className="how-it-works">
                    <div className="section-title">How It Works</div>
                    <div className="steps-grid">
                      <div className="glass-panel step-card step-1">
                        <div className="step-number">01</div>
                        <div className="step-title">Upload Media</div>
                        <div className="step-desc">Upload any video or image file for analysis. Supports all major media formats.</div>
                      </div>
                      <div className="glass-panel step-card step-2">
                        <div className="step-number">02</div>
                        <div className="step-title">Multi-Modal AI Engine</div>
                        <div className="step-desc">15 distinct AI sensors extract visual, temporal, and biological anomalies. The PyTorch Meta-Classifier computes the final verdict.</div>
                      </div>
                      <div className="glass-panel step-card step-3">
                        <div className="step-number">03</div>
                        <div className="step-title">XAI Explanations</div>
                        <div className="step-desc">GradCAM heatmaps and SHAP features explain exactly why the AI flagged manipulation.</div>
                      </div>
                      <div className="glass-panel step-card step-4">
                        <div className="step-number">04</div>
                        <div className="step-title">Forensic Report</div>
                        <div className="step-desc">Download a comprehensive PDF report with visual evidence suitable for court proceedings.</div>
                      </div>
                    </div>
                  </section>

                  <section className="detailed-features" style={{ marginTop: '4rem', marginBottom: '2rem' }}>
                    <div className="section-title" style={{ marginBottom: '2rem', textAlign: 'center' }}>How We Detect Deepfakes</div>
                    
                    <div className="feature-showcase" style={{ display: 'grid', gap: '2rem' }}>
                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={24} /> Spectral & Frequency Analysis</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Real cameras capture a natural balance of high and low frequencies. AI generators, however, struggle to reproduce microscopic high-frequency details (like skin pores or natural sensor noise), resulting in mathematically "smooth" pixels. We use Fast Fourier Transforms (FFT) and Discrete Cosine Transforms (DCT) to detect this unnatural lack of high-frequency energy.
                          </p>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '2rem' }}>
                          <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li>• <strong>Switching Noise (SWN):</strong> Isolates pure AI generation noise and highlights deepfake splicing seams.</li>
                            <li>• <strong>8x8 Block DCT:</strong> Detects localized disruptions in the JPEG compression grid.</li>
                            <li>• <strong>Phase Spectrum:</strong> Identifies structural phase angle anomalies caused by face swapping.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: '#a855f7', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ScanSearch size={24} /> Hardware Noise & ELA Forensics</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Images taken by real physical cameras have a baked-in Bayer filter pattern (CFA) and uniform JPEG compression. We analyze these microscopic spatial properties.
                          </p>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '2rem' }}>
                          <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li>• <strong>Error Level Analysis (ELA):</strong> Exposes differences in JPEG compression histories to reveal spliced fake faces.</li>
                            <li>• <strong>CFA Artifacts:</strong> Generative AI (Midjourney/DALL-E) completely lacks the Color Filter Array demosaicing patterns produced by real camera hardware.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--warning)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Focus size={24} /> Face Geometry & Temporal Jitter</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            While AI can generate a perfect fake face in a single frame, it struggles to keep the 3D geometry of that face perfectly stable across time in a video. We track 468 facial landmarks across every frame to measure micro-jitters, unnatural head pose variations, and blinking anomalies that human eyes can't detect.
                          </p>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '2rem' }}>
                          <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <li>• <strong>Landmark Jitter:</strong> Microscopic shaking of facial anchor points.</li>
                            <li>• <strong>Optical Flow:</strong> Tracks dense pixel motion vectors to flag blocky unnatural flickering around fake masks.</li>
                            <li>• <strong>Eye Aspect Ratio (EAR):</strong> Detection of unnatural "lazy eye" or missing blink patterns.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Volume2 size={24} /> Audio CNN & Forensic Pre-Processing</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Audio deepfakes and lip-syncing (Wav2Lip) are common manipulation techniques. We process audio through a robust forensic pipeline including <strong>Cubic Spline De-Clipping</strong> and <strong>Spectral Gating Denoising</strong> to handle real-world corruption. The cleaned audio is then fed into a <strong>Lightweight PyTorch 2D-CNN</strong> that analyzes 128-channel Mel-Spectrograms to calculate a highly accurate voice spoofing probability. Lip-sync desynchronization is concurrently measured using a dual-stream SyncNet architecture.
                          </p>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BrainCircuit size={24} /> PyTorch AI Meta-Classifier</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Instead of relying on rigid, hardcoded thresholds that cause false positives, our system uses a fully trained Multi-Layer Perceptron (MLP). The AI Meta-Classifier evaluates the outputs of all 15 visual, biological, and acoustic sensors simultaneously, learning their mathematical relationships to determine an ironclad, explainable final verdict.
                          </p>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={24} /> Biological Signal (rPPG) Detection</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Real human faces exhibit microscopic color changes with every heartbeat as blood pumps through the capillaries. AI-generated and swapped faces completely lack these photoplethysmography (rPPG) signals. We isolate the green color channel of the face and run a Fast Fourier Transform to search for a human pulse frequency.
                          </p>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--info)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lightbulb size={24} /> Illumination & Optics Analysis</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            When a face is spliced into a new image, or generated entirely by an AI, the 3D lighting environment almost never matches perfectly. We compute image gradients to estimate 2D illumination directions. Additionally, we extract and compare the <strong>Corneal Specular Highlights</strong> (the reflections in the eyes)—GANs notoriously fail to render matching geometric reflections in both eyes.
                          </p>
                        </div>
                      </div>

                      <div className="glass-panel" style={{ display: 'flex', gap: '2rem', padding: '2rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={24} /> EXIF & Metadata Forensics</h3>
                          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            Generative AI tools (Midjourney, Stable Diffusion) and editing software (Photoshop) often leave distinct signatures in the file metadata. We automatically extract and analyze the EXIF payload, detecting manipulation software signatures, stripped metadata, and suspicious generation timestamps.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* PROCESSING STATE */}
              {/* PROCESSING STATE */}
              {(status === 'uploading' || status === 'processing') && (
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    
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
                </div>
              )}

              {/* COMPLETE STATE */}
              {status === 'complete' && result && (
                <ReportDashboard result={result} resetApp={resetApp} jobId={jobId} fileName={file?.name} />
              )}
            </>
          )}

          {/* ====== MODELS TAB ====== */}
          {activeNav === 'models' && <ModelsOverview />}

          {/* ====== ABOUT TAB ====== */}
          {activeNav === 'about' && (
            <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
              <section className="hero" style={{ paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '2.5rem' }}>How It Works</h1>
                <p className="hero-subtitle">
                  Our multi-modal forensics pipeline combines state-of-the-art deep learning
                  with explainable AI techniques to detect and visualize deepfake manipulation.
                </p>
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BrainCircuit size={24} /> EfficientNet-B4 Classifier
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    We use a fine-tuned EfficientNet-B4 backbone trained with a hybrid loss combining
                    cross-entropy and contrastive learning using the Self-Blended Images (SBI) framework.
                    The model extracts a 1792-dimensional feature vector from 380×380 face crops, achieving
                    over 99.8% validation accuracy on FaceForensics++ benchmarks.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ScanSearch size={24} /> GradCAM Visual Explanations
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    Gradient-weighted Class Activation Mapping (GradCAM) generates spatial heatmaps
                    highlighting which regions of the face the neural network focused on when making
                    its deepfake classification. Red areas indicate strong evidence of manipulation artifacts.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={24} /> SHAP Feature Importance
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    SHapley Additive exPlanations (SHAP) quantify how each facial region contributes
                    to the model's final decision. This provides human-interpretable evidence that can
                    be presented alongside the visual heatmaps in forensic proceedings.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={24} /> Frequency & Signal Forensics
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    We analyze the frequency domain (DCT and FFT) to detect unnatural high-frequency suppression typical of GANs. We also measure compression artifacts via Error Level Analysis (ELA) and employ Switching Noise (SWN) filters to reveal hidden splicing boundaries and synthetic noise zero-crossings.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Focus size={24} /> Biological & Sensor Tracking
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    Deepfakes often fail to replicate perfect temporal consistency and camera hardware fingerprints. Our pipeline tracks facial geometry frame-by-frame to catch temporal jitter, and extracts Photo Response Non-Uniformity (PRNU) to verify sensor consistency across the image.
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Volume2 size={24} /> SyncNet Audio Analysis
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem' }}>
                    For video files with audio, our pipeline uses a SyncNet-based model to detect
                    micro-desynchronization between lip movements and speech audio — a common
                    artifact in lip-sync deepfakes that is imperceptible to the human eye.
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button className="btn btn-primary" onClick={() => { setActiveNav('analyze'); resetApp(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ScanSearch size={18} /> Start Analyzing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="footer" style={{ marginTop: '4rem', borderTop: '1px solid var(--glass-border)', padding: '3rem 2rem', background: 'rgba(6, 10, 19, 0.8)', backdropFilter: 'blur(10px)' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontWeight: 'bold' }}>
            <Shield size={20} color="var(--primary)" /> DeepForensics Platform
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', maxWidth: '600px', lineHeight: '1.6' }}>
            Court-grade multimedia forensic analysis powered by EfficientNet-B4, GradCAM spatial grounding, SHAP feature attribution, and SyncNet temporal validation.
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success)' }}>Running Custom Fine-Tuned Weights</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            &copy; {new Date().getFullYear()} DeepForensics. All rights reserved. Version 1.1.0
          </p>
        </div>
      </footer>
    </>
  );
}

export default App;
