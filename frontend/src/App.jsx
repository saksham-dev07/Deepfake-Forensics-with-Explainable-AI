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
  Shield, ScanSearch, Info, Database, GitBranch, History
} from 'lucide-react';
import { useHistory } from './hooks/useHistory';
import Footer from './components/Footer';
import HowItWorks from './components/HowItWorks';

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

  const { history, saveToHistory, clearHistory } = useHistory();
  const [activeNav, setActiveNav] = useState('analyze');

  // Save to history automatically when a job completes
  React.useEffect(() => {
    if (status === 'complete' && result && jobId) {
      saveToHistory(jobId, result, file?.name);
    }
  }, [status, result, jobId, file?.name, saveToHistory]);

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
            <div className="navbar-logo"><Shield size={20} color="var(--primary)" /></div>
            <div className="navbar-title">
              Deep<span>Forensics</span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                border: '1px solid var(--glass-border)',
                padding: '0.1rem 0.4rem',
                borderRadius: '3px',
                marginLeft: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                verticalAlign: 'middle'
              }}>Suite</span>
            </div>
          </a>

          <div className="navbar-links">
            <button
              className={`nav-link ${activeNav === 'analyze' ? 'active' : ''}`}
              onClick={() => { setActiveNav('analyze'); if (status === 'complete') resetApp(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ScanSearch size={16} /> Analyze
            </button>
            <button
              className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
              onClick={() => setActiveNav('about')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Info size={16} /> Methodology
            </button>
            <button
              className={`nav-link ${activeNav === 'models' ? 'active' : ''}`}
              onClick={() => setActiveNav('models')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Database size={16} /> Model Weights
            </button>
            <button
              className={`nav-link ${activeNav === 'history' ? 'active' : ''}`}
              onClick={() => setActiveNav('history')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <History size={16} /> History
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              marginRight: '0.75rem'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></span>
              Core Online
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
                  <div className="dashboard-grid">
                    <div className="dashboard-grid-left">
                      <HeroSection />
                      <StatsGrid />
                    </div>
                    <div className="dashboard-grid-right">
                      <UploadZone onFileUpload={handleFileUpload} />
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
                <ReportDashboard result={result} resetApp={resetApp} jobId={jobId} fileName={file?.name} />
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
            <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
              <div className="section-header" style={{ marginBottom: '2rem' }}>
                <h2>Recent Scans</h2>
                <p>Your analysis history is stored securely in your browser.</p>
              </div>
              
              {history.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--glass-border)' }}>
                  <History size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ color: 'var(--text-secondary)' }}>No history yet</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Analyze your first media file to see it here.</p>
                  <button className="btn btn-primary" onClick={() => setActiveNav('analyze')}>
                    Start Analysis
                  </button>
                </div>
              ) : (
                <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <button className="btn btn-outline" onClick={clearHistory} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      Clear History
                    </button>
                  </div>
                  {history.map((item, idx) => (
                    <div key={idx} className="history-card" style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      background: 'var(--panel-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--glass-border)', transition: 'var(--transition-fast)' 
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {item.fileName}
                          <span style={{ 
                            fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', 
                            background: item.score > 0.55 ? 'var(--danger-glow)' : 'var(--success-glow)',
                            color: item.score > 0.55 ? 'var(--danger)' : 'var(--success)',
                            border: `1px solid ${item.score > 0.55 ? 'var(--danger)' : 'var(--success)'}33`
                          }}>
                            {item.verdict}
                          </span>
                        </h4>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', gap: '1rem' }}>
                          <span>ID: {item.jobId.substring(0,8)}...</span>
                          <span>Date: {new Date(item.date).toLocaleString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: item.score > 0.55 ? 'var(--danger)' : 'var(--success)' }}>
                            {(item.score * 100).toFixed(1)}%
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Confidence</div>
                        </div>
                      </div>
                    </div>
                  ))}
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
