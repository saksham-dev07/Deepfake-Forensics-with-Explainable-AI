import React, { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import ReportDashboard from './components/ReportDashboard';
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
import { SAMPLE_REPORTS } from './constants/sampleReports';
import SkeletonLoader from './components/ui/SkeletonLoader';
import HistoryView from './components/HistoryView';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useHashNavigation } from './hooks/useHashNavigation';

const ModelsOverview = lazy(() => import('./components/ModelsOverview'));

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
  const { activeNav, navigate } = useHashNavigation();

  // Save to history automatically when a job completes
  React.useEffect(() => {
    if (status === 'complete' && result && jobId) {
      saveToHistory(jobId, result, file?.name);
    }
  }, [status, result, jobId, file?.name, saveToHistory]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = `${({ analyze: 'Analyze media', about: 'Methodology', models: 'Models', history: 'History' })[activeNav]} · DeepForensics`;
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [activeNav, status]);

  const handleSelectSample = (sampleKey) => {
    const sample = SAMPLE_REPORTS[sampleKey];
    if (sample) {
      loadSampleResult(sample);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      {error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setError(null)} 
        />
      )}
      
      {/* Navigation Bar */}
      <a href="#main-content" className="skip-link">Skip to content</a>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-inner">
          <a className="navbar-brand" href="#analyze" onClick={(e) => { e.preventDefault(); navigate('analyze'); }}>
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
              aria-current={activeNav === 'analyze' ? 'page' : undefined}
              onClick={() => navigate('analyze')}
            >
              <ScanSearch size={15} /> Analyze
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'about' ? 'active' : ''}`}
              aria-current={activeNav === 'about' ? 'page' : undefined}
              onClick={() => navigate('about')}
            >
              <Info size={15} /> Methodology
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'models' ? 'active' : ''}`}
              aria-current={activeNav === 'models' ? 'page' : undefined}
              onClick={() => navigate('models')}
            >
              <Database size={15} /> Models
            </button>
            <button
              type="button"
              className={`nav-link ${activeNav === 'history' ? 'active' : ''}`}
              aria-current={activeNav === 'history' ? 'page' : undefined}
              onClick={() => navigate('history')}
            >
              <History size={15} /> History ({history.length})
            </button>

            <div className="navbar-meta" style={{ height: '20px', width: '1px', background: 'var(--glass-border)', margin: '0 0.5rem' }} />

            <div className="status-indicator-pill navbar-meta">
              <div className="status-dot" />
              <span>FORENSIC CONSOLE</span>
            </div>

            <a 
              href="https://github.com/saksham-dev07/Deepfake-Forensics-with-Explainable-AI" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="nav-link navbar-meta"
              title="GitHub Source Code"
              style={{ padding: '0.45rem' }}
            >
              <GitBranch size={16} />
            </a>
          </div>
        </div>
      </nav>

      <main id="main-content" className="container" tabIndex={-1}>
        <div className="page-content">
          <ErrorBoundary key={activeNav}>

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
                  key={jobId}
                  result={result} 
                  resetApp={resetApp} 
                  jobId={jobId} 
                  fileName={file?.name} 
                />
              )}
            </>
          )}

          {/* ====== MODELS TAB ====== */}
          {activeNav === 'models' && (
            <Suspense fallback={<SkeletonLoader type="card" />}>
              <ModelsOverview />
            </Suspense>
          )}

          {/* ====== ABOUT TAB ====== */}
          {activeNav === 'about' && (
            <HowItWorks onStart={() => navigate('analyze')} />
          )}

          {/* ====== HISTORY TAB ====== */}
          {activeNav === 'history' && <HistoryView history={history} clearHistory={clearHistory} onStart={() => navigate('analyze')} onDemo={id => {
            const sample = Object.values(SAMPLE_REPORTS).find(item => item.meta.id === id);
            if (sample) { loadSampleResult(sample); navigate('analyze'); }
            else setError('This demo is no longer available. Choose a current sample from Analyze.');
          }} />}
          </ErrorBoundary>
        </div>
      </main>

      <Footer />
    </MotionConfig>
  );
}

export default App;
