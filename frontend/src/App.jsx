import React, { useState } from 'react';
import ReportDashboard from './components/ReportDashboard';
import ModelsOverview from './components/ModelsOverview';
import HeroSection from './components/HeroSection';
import StatsGrid from './components/StatsGrid';
import FeaturesGrid from './components/FeaturesGrid';
import UploadZone from './components/UploadZone';
import AnalysisTerminal from './components/AnalysisTerminal';
import Toast from './components/Toast';
import { useAnalysisPipeline } from './hooks/useAnalysisPipeline';
import { 
  Shield, Zap, ScanSearch, Info, Database, GitBranch
} from 'lucide-react';

function App() {
  const {
    file,
    status,
    progress,
    telemetry,
    logs,
    jobId,
    result,
    error,
    setError,
    handleFileUpload,
    resetApp
  } = useAnalysisPipeline();

  const [activeNav, setActiveNav] = useState('analyze');

  return (
    <>
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError(null)} 
        />
      )}
      
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
                  <HeroSection />
                  <StatsGrid />
                  <UploadZone onFileUpload={handleFileUpload} />
                  <FeaturesGrid />
                </>
              )}

              {/* PROCESSING STATE */}
              {(status === 'uploading' || status === 'processing') && (
                <AnalysisTerminal 
                  status={status} 
                  progress={progress} 
                  file={file} 
                  telemetry={telemetry} 
                  logs={logs} 
                />
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
              <HeroSection />
              <StatsGrid />
              <FeaturesGrid />
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
