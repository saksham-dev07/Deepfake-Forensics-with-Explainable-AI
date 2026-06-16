import React, { useState, useRef } from 'react';
import ReportDashboard from './components/ReportDashboard';
import { 
  Shield, Zap, ScanSearch, Info, Lock, BrainCircuit, Target, 
  BarChart3, Volume2, UploadCloud, CheckCircle2, Loader2, Circle, GitBranch, Settings, Activity, Focus, Camera
} from 'lucide-react';

const PIPELINE_STEPS = [
  { label: 'Extracting video frames & audio track', threshold: 5 },
  { label: 'Running EfficientNet-B4 multi-frame classifier', threshold: 15 },
  { label: 'Generating GradCAM visual explanations', threshold: 35 },
  { label: 'Frequency domain analysis (DCT + FFT)', threshold: 48 },
  { label: 'Error Level Analysis (JPEG compression)', threshold: 58 },
  { label: 'Facial geometry & noise consistency', threshold: 68 },
  { label: 'Audio-video synchronization (SyncNet)', threshold: 78 },
  { label: 'Computing weighted ensemble score', threshold: 85 },
  { label: 'Compiling court-grade forensic PDF', threshold: 90 },
];

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
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
        } else if (data.status === 'completed') {
          clearInterval(interval);
          setProgress(100);
          setStatus('complete');
          setResult(data.result);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setStatus('idle');
          alert('Analysis failed: ' + (data.error || 'Unknown error'));
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
    setFile(null); setStatus('idle'); setProgress(0); setJobId(null); setResult(null);
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
            <div className="nav-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '1.5rem' }}>
              <Zap size={14} /> AI Powered
            </div>
            <div style={{ height: '24px', width: '1px', background: 'var(--glass-border)', margin: '0 0.5rem' }}></div>
            <a href="#" className="nav-link" title="Source Code Repository" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem' }}>
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
                        <BrainCircuit size={16} className="stat-card-icon" /> Base Model
                      </div>
                      <div className="stat-card-value">EfficientNet-B4</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contrastive SBI Trained</div>
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
                      <div className="stat-card-value">SyncNet</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lip-sync Desynchronization</div>
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
                        <div className="step-title">AI Analysis</div>
                        <div className="step-desc">EfficientNet-B4 with contrastive learning extracts deepfake artifacts at the pixel level.</div>
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
                </>
              )}

              {/* PROCESSING STATE */}
              {(status === 'uploading' || status === 'processing') && (
                <div className="processing-container">
                  <div className="processing-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      {status === 'uploading' ? <UploadCloud /> : <ScanSearch />} 
                      {status === 'uploading' ? 'Uploading Media...' : 'Analyzing Forensics...'}
                    </h2>
                    <p>{file ? `Processing: ${file.name}` : 'Securely transferring file'}</p>
                  </div>

                  <div className="glass-panel progress-card">
                    <div className="progress-info">
                      <span>Pipeline Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="pipeline-steps">
                      {PIPELINE_STEPS.map((step, idx) => {
                        const stepStatus = getStepStatus(step, idx);
                        return (
                          <div key={idx} className={`pipeline-step ${stepStatus}`}>
                            <div className="pipeline-step-icon">
                              {stepStatus === 'done' ? <CheckCircle2 size={16} /> : stepStatus === 'active' ? <Loader2 size={16} className="lucide-spin" /> : <Circle size={16} />}
                            </div>
                            <div className="pipeline-step-label">{step.label}</div>
                          </div>
                        );
                      })}
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
            <a href="https://huggingface.co/nikokons/contrastive-deepfake-detector" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>Base Model Weights</a>
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
