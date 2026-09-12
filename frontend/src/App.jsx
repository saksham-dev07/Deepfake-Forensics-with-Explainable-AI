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
  Shield, ScanSearch, Info, Database, GitBranch, History, Trash2, ArrowRight
} from 'lucide-react';
import { useHistory } from './hooks/useHistory';
import Footer from './components/Footer';
import HowItWorks from './components/HowItWorks';
import { SAMPLE_REPORTS } from './constants/sampleReports';

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
    loadSampleResult,
    resetApp
  } = useAnalysisPipeline();

  const { history, saveToHistory, clearHistory } = useHistory();
  const [activeNav, setActiveNav] = useState('analyze');

  // Save to history automatically when a job completes
  React.useEffect(() => {
    if (status === 'complete' && result && jobId) {
      saveToHistory(jobId, result, file?.name);
    }
  }, [status, result, jobId, file?.name, saveToHistory]);

  const handleSelectSample = (sampleKey) => {
    const sample = SAMPLE_REPORTS[sampleKey];
    if (sample) {
      loadSampleResult(sample);
    }
  };

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
          <a className="navbar-brand" href="#" onClick={(e) => { e.preventDefault(); resetApp(); setActiveNav('analyze'); }}>
            <div className="navbar-logo">
              <Shield size={18} color="var(--primary)" />
            </div>
            <div className="navbar-title">
              Deep<span className="brand-accent">Forensics</span>
              <span className="navbar-badge">v2.4 Studio</span>
            </div>
          </a>

          <div className="navbar-links">
            <button
              type="button"
              className={`nav-link ${activeNav === 'analyze' ? 'active' : ''}`}
              onClick={() => { setActiveNav('analyze'); if (status === 'complete') resetApp(); }}
            >
              <ScanSearch size={15} /> Ingest &amp; Analyze
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
              onClick={() => setActiveNav('about')}
            >
              <Info size={15} /> Methodology
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'models' ? 'active' : ''}`}
              onClick={() => setActiveNav('models')}
            >
              <Database size={15} /> Model Weights
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'history' ? 'active' : ''}`}
              onClick={() => setActiveNav('history')}
            >
              <History size={15} /> Audit Log ({history.length})
            </button>

            <div style={{ height: '20px', width: '1px', background: 'var(--glass-border)', margin: '0 0.5rem' }} />

            <div className="status-indicator-pill">
              <div className="status-dot" />
              <span>CORE ONLINE</span>
            </div>

            <a 
              href="https://github.com/saksham-dev07/Deepfake-Forensics-with-Explainable-AI" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="nav-link" 
              title="GitHub Source Code"
              style={{ padding: '0.45rem' }}
            >
              <GitBranch size={16} />
            </a>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="page-content">

          {/* ====== ANALYZE TAB ====== */}
          {activeNav === 'analyze' && (
            <>
              {/* IDLE STATE: Hero + Upload + Capabilities */}
              {status === 'idle' && (
                <>
                  <div className="dashboard-grid">
                    <div className="dashboard-grid-left">
                      <HeroSection />
                      <StatsGrid />
                    </div>
                    <div className="dashboard-grid-right">
                      <UploadZone 
                        onFileUpload={handleFileUpload} 
                        onSelectSample={handleSelectSample} 
                      />
                    </div>
                  </div>
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
                  onCancel={resetApp}
                />
              )}

              {/* COMPLETE STATE */}
              {status === 'complete' && result && (
                <ReportDashboard 
                  result={result} 
                  resetApp={resetApp} 
                  jobId={jobId} 
                  fileName={file?.name} 
                />
              )}
            </>
          )}

          {/* ====== MODELS TAB ====== */}
          {activeNav === 'models' && <ModelsOverview />}

          {/* ====== ABOUT TAB ====== */}
          {activeNav === 'about' && (
            <HowItWorks onStart={() => { setActiveNav('analyze'); resetApp(); }} />
          )}

          {/* ====== HISTORY TAB ====== */}
          {activeNav === 'history' && (
            <div style={{ maxWidth: '860px', margin: '1.5rem auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    Local Forensic Audit Trail
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Indexed browser audit session logs. Media files remain local to your client session.
                  </p>
                </div>
                {history.length > 0 && (
                  <button 
                    type="button"
                    className="btn btn-outline" 
                    onClick={clearHistory}
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                  >
                    <Trash2 size={13} /> Clear Audit History
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="forensic-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                  <History size={40} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.4 }} />
                  <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>
                    No audit records found
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Execute a media stream inspection or load an instant forensic sample to record an audit.
                  </p>
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    onClick={() => { setActiveNav('analyze'); resetApp(); }}
                  >
                    Launch Ingestion Console
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {history.map((item, idx) => {
                    const isHigh = item.score > 0.55;
                    const statusColor = isHigh ? 'var(--danger)' : 'var(--success)';
                    return (
                      <div 
                        key={idx} 
                        className="forensic-panel" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '1.25rem 1.5rem',
                          transition: 'border-color var(--transition-fast)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                              {item.fileName}
                            </span>
                            <span style={{ 
                              fontSize: '0.68rem', 
                              fontWeight: 700, 
                              fontFamily: 'var(--font-mono)',
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '4px', 
                              background: `${statusColor}15`,
                              color: statusColor,
                              border: `1px solid ${statusColor}35`
                            }}>
                              {item.verdict}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', gap: '1.25rem', fontFamily: 'var(--font-mono)' }}>
                            <span>CASE: #{item.jobId?.substring(0, 10) || 'AUDIT'}</span>
                            <span>{new Date(item.date).toLocaleString()}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mono-font" style={{ fontSize: '1.3rem', fontWeight: 800, color: statusColor }}>
                              {(item.score * 100).toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Anomaly Index
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

export default App;
