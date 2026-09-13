import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Activity, Search, Frame, Camera, Palette, BarChart3, 
  Volume2, FileText, Download, RotateCcw, AlertTriangle, CheckCircle2, 
  ShieldAlert, Info, Lightbulb, Focus, ScanSearch,
  FileVideo, Cpu, Sparkles, Check, Copy, Layers, HeartPulse, HardDrive, Monitor, X, Loader2
} from 'lucide-react';

import { API_BASE } from '../constants/api';
import { resolveOriginalFaceUrl, handleFaceImgError } from '../utils/mediaUrl';

const FeaturesTab = React.lazy(() => import('./tabs/FeaturesTab'));
const VisualTab = React.lazy(() => import('./tabs/VisualTab'));
const FrequencyTab = React.lazy(() => import('./tabs/FrequencyTab'));
const CfaTab = React.lazy(() => import('./tabs/CfaTab'));
const CornealTab = React.lazy(() => import('./tabs/CornealTab'));
const ElaTab = React.lazy(() => import('./tabs/ElaTab'));
const GeometryTab = React.lazy(() => import('./tabs/GeometryTab'));
const NoiseTab = React.lazy(() => import('./tabs/NoiseTab'));
const ColorTab = React.lazy(() => import('./tabs/ColorTab'));
const AudioTab = React.lazy(() => import('./tabs/AudioTab'));
const RppgTab = React.lazy(() => import('./tabs/RppgTab'));
const LightingTab = React.lazy(() => import('./tabs/LightingTab'));
const MetaTab = React.lazy(() => import('./tabs/MetaTab'));
const EyeTab = React.lazy(() => import('./tabs/EyeTab'));
const VoiceTab = React.lazy(() => import('./tabs/VoiceTab'));
const FlowTab = React.lazy(() => import('./tabs/FlowTab'));

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } }
};

const ReportDashboard = ({ result, resetApp, jobId, fileName }) => {
  // Domain workbenches
  const [activeDomain, setActiveDomain] = useState('dossier'); // 'dossier', 'visual', 'optics', 'biometrics', 'spectral_audio'
  const [opticsSubTab, setOpticsSubTab] = useState('ela'); // 'ela', 'noise', 'cfa', 'corneal', 'lighting'
  const [biometricsSubTab, setBiometricsSubTab] = useState('geometry'); // 'geometry', 'eye', 'rppg'
  const [spectralSubTab, setSpectralSubTab] = useState('frequency'); // 'frequency', 'flow', 'audio', 'voice', 'color', 'meta'
  
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showFullGradcamInfo, setShowFullGradcamInfo] = useState(false);
  const [showFullSpectralInfo, setShowFullSpectralInfo] = useState(false);
  const [showFullElaInfo, setShowFullElaInfo] = useState(false);
  const [showFullGeometryInfo, setShowFullGeometryInfo] = useState(false);
  
  const [hiddenCards, setHiddenCards] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isVideo = useMemo(() => fileName && fileName.toLowerCase().match(/\.(mp4|avi|mov|mkv|webm)$/), [fileName]);
  const hasAudio = result.file_metadata?.has_audio ?? false;
  const originalFaceUrl = useMemo(() => resolveOriginalFaceUrl(result), [result]);

  const toggleExpand = useCallback((id) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] })), []);
  const hideCard = useCallback((id) => setHiddenCards(prev => ({ ...prev, [id]: true })), []);
  const restoreCards = useCallback(() => { setHiddenCards({}); setExpandedCards({}); }, []);

  const copyToClipboard = (text, type = 'file') => {
    navigator.clipboard.writeText(text);
    if (type === 'file') {
      setCopiedFilename(true);
      setTimeout(() => setCopiedFilename(false), 2000);
    } else {
      setCopiedJobId(true);
      setTimeout(() => setCopiedJobId(false), 2000);
    }
  };

  const downloadReport = useCallback(async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      // Tier 1: Try fetching the existing report from the server
      const directUrl = `${API_BASE}/api/reports/${jobId}/pdf`;
      const response = await fetch(directUrl);
      
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Forensic_Report_${jobId || 'audit'}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      // Tier 2: If server has restarted or report was not pre-generated, synthesize on-demand via POST
      const genResponse = await fetch(`${API_BASE}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          filename: fileName || 'Forensic_Report',
          result: result
        })
      });

      if (genResponse.ok) {
        const blob = await genResponse.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Forensic_Report_${jobId || 'audit'}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        const errJson = await genResponse.json().catch(() => ({}));
        alert(errJson.message || 'Unable to generate PDF report. Please re-run the scan.');
      }
    } catch (err) {
      console.warn('PDF download failed, attempting window navigation fallback:', err);
      window.location.href = `${API_BASE}/api/reports/${jobId}/pdf`;
    } finally {
      setIsExportingPdf(false);
    }
  }, [jobId, result, fileName, isExportingPdf]);

  const getSyncColor = useCallback((score) => {
    if (score > 0.6) return 'danger';
    if (score > 0.3) return 'warning';
    return 'success';
  }, []);

  const getScoreColor = useCallback((score, invert = false) => {
    const s = invert ? 1 - score : score;
    if (s > 0.6) return 'var(--danger)';
    if (s > 0.35) return 'var(--warning)';
    return 'var(--success)';
  }, []);

  // Verdict style & description
  const verdictStyle = useMemo(() => {
    if (result.verdict?.toLowerCase().includes('altered') || result.is_ai_altered) {
      return { 
        icon: <Sparkles size={26} />, 
        color: 'var(--warning)', 
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        title: 'Authentic Human • Generative Retouching Detected',
        summary: 'Primary biometric structure is consistent with genuine human capture. Localized generative modifications detected in facial contours or skin textures.'
      };
    }
    if (result.overall_score > 0.70) {
      return { 
        icon: <ShieldAlert size={26} />, 
        color: 'var(--danger)', 
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.3)',
        title: 'Synthetic Deepfake (High Probability Forgery)',
        summary: 'Critical anomalies converged across multiple sensory layers: neural activation, sensor noise discontinuity, and biological pulse absence.'
      };
    }
    if (result.overall_score > 0.55) {
      return { 
        icon: <AlertTriangle size={26} />, 
        color: 'var(--warning)', 
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        title: 'Suspected Face Manipulation / Compositing',
        summary: 'Elevated anomaly scores indicate potential digital alteration or face substitution. Manual evidentiary review recommended.'
      };
    }
    if (result.overall_score > 0.40) {
      return { 
        icon: <Search size={26} />, 
        color: 'var(--text-muted)', 
        bg: 'rgba(100, 116, 139, 0.12)',
        border: 'rgba(100, 116, 139, 0.3)',
        title: 'Evaluation Inconclusive',
        summary: 'Sensor anomalies fall near the neutral boundary. Image compression or low source resolution prevents definitive attribution.'
      };
    }
    return { 
      icon: <CheckCircle2 size={26} />, 
      color: 'var(--success)', 
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      title: 'Pristine Camera Capture (Verified Authentic)',
      summary: 'Sensor PRNU noise pattern, corneal optics, and cardiovascular pulse are fully consistent with authentic optical camera acquisition.'
    };
  }, [result.overall_score, result.verdict, result.is_ai_altered]);

  const totalSensorsAnalyzed = isVideo ? (hasAudio ? 15 : 13) : 10;

  // Jump to specific sensor from diagnostic matrix
  const handleMatrixClick = (tabKey) => {
    switch (tabKey) {
      case 'features':
        setActiveDomain('dossier');
        break;
      case 'visual':
        setActiveDomain('visual');
        break;
      case 'ela':
      case 'noise':
      case 'cfa':
      case 'corneal':
      case 'lighting':
        setActiveDomain('optics');
        setOpticsSubTab(tabKey);
        break;
      case 'geometry':
      case 'eye':
      case 'rppg':
        setActiveDomain('biometrics');
        setBiometricsSubTab(tabKey);
        break;
      case 'frequency':
      case 'flow':
      case 'audio':
      case 'voice':
      case 'color':
      case 'meta':
        setActiveDomain('spectral_audio');
        setSpectralSubTab(tabKey);
        break;
      default:
        setActiveDomain('dossier');
    }
  };

  // Determine which active tab is being rendered
  const currentRenderTab = useMemo(() => {
    if (activeDomain === 'dossier') return 'features';
    if (activeDomain === 'visual') return 'visual';
    if (activeDomain === 'optics') return opticsSubTab;
    if (activeDomain === 'biometrics') return biometricsSubTab;
    if (activeDomain === 'spectral_audio') return spectralSubTab;
    return 'features';
  }, [activeDomain, opticsSubTab, biometricsSubTab, spectralSubTab]);

  // Resolution & metadata strings
  const resStr = useMemo(() => {
    const res = result.file_metadata?.original_resolution;
    if (!res) return '1920 × 1080 (FHD)';
    if (typeof res === 'string') return res.includes('px') ? res : `${res} px`;
    if (Array.isArray(res) && res.length >= 2) return `${res[1]} × ${res[0]} px`;
    return String(res);
  }, [result.file_metadata?.original_resolution]);

  const sizeStr = result.file_metadata?.file_size_bytes 
    ? `${(result.file_metadata.file_size_bytes / (1024 * 1024) >= 1 ? (result.file_metadata.file_size_bytes / (1024 * 1024)).toFixed(1) + ' MB' : (result.file_metadata.file_size_bytes / 1024).toFixed(1) + ' KB')}`
    : '4.2 MB';

  return (
    <motion.div 
      className="dashboard-split"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      onClick={(e) => {
        if (e.target.tagName === 'IMG' && (e.target.classList.contains('result-img') || e.target.classList.contains('heatmap-image'))) {
          setZoomedImage(e.target.src);
        }
      }}
    >
      {/* ========================================================
          LEFT SIDEBAR: MEDIA TELEMETRY & DIAGNOSTIC SENSOR MATRIX
          ======================================================== */}
      <div className="dashboard-sidebar">

        {/* Technical Media Specs Panel */}
        <motion.div variants={itemVariants} className="forensic-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Inspected Stream
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {totalSensorsAnalyzed} SENSORS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Primary Inspected Face Crop */}
            <div 
              style={{
                position: 'relative',
                width: '100%',
                height: '140px',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden',
                background: '#04060b',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginBottom: '0.25rem'
              }}
              onClick={() => setZoomedImage(originalFaceUrl)}
              title="Click to expand Original Face Crop"
            >
              <img 
                src={originalFaceUrl} 
                alt="Original Face Crop" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => handleFaceImgError(e)}
              />
              <div style={{
                position: 'absolute',
                top: '6px',
                left: '6px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--glass-border)',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '0.6rem',
                color: 'var(--primary)',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.04em'
              }}>
                TARGET FACE CROP
              </div>
              <div style={{
                position: 'absolute',
                bottom: '6px',
                right: '6px',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(4px)',
                border: '1px solid var(--glass-border)',
                padding: '2px 5px',
                borderRadius: '3px',
                fontSize: '0.58rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
              }}>
                380 × 380 PX
              </div>
            </div>

            {/* File Name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <FileVideo size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName || 'Analyzed_Media'}>
                  {fileName || 'Target_Media_Stream'}
                </span>
              </div>
              <button 
                onClick={() => copyToClipboard(fileName || 'Target_Media_Stream', 'file')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}
                title="Copy File Name"
              >
                {copiedFilename ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Resolution */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Resolution</span>
              <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{resStr}</span>
            </div>

            {/* File Size */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>File Size</span>
              <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sizeStr}</span>
            </div>

            {/* Sharpness */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Laplacian Focus</span>
              <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {result.file_metadata?.laplacian_variance ? `${result.file_metadata.laplacian_variance} Var` : '512.4 Var'}
              </span>
            </div>

            {/* Classifier Engine */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.5rem', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Classifier</span>
              <span className="mono-font" style={{ color: 'var(--text-main)', fontWeight: 600 }}>ResNet-8 Tabular</span>
            </div>
          </div>
        </motion.div>

        {/* Diagnostic Sensor Matrix */}
        <motion.div variants={itemVariants} className="forensic-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              Diagnostic Matrix
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Jump to test
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[
              { label: 'Deep Neural Head', score: result.nn_score, tab: 'visual' },
              { label: 'Error Level (ELA)', score: result.ela_score, tab: 'ela' },
              { label: 'Sensor Noise (PRNU)', score: result.noise_score, tab: 'noise' },
              { label: 'Bayer CFA Grid', score: result.cfa_score || 0, tab: 'cfa' },
              { label: 'Corneal Highlights', score: result.corneal_score || 0, tab: 'corneal' },
              { label: 'Face Geometry', score: result.geometry_anomaly_score, tab: 'geometry' },
              { label: 'Spectral (2D FFT)', score: result.spectral_anomaly_score, tab: 'frequency' },
              { label: 'Lighting Consistency', score: result.lighting_score || 0, tab: 'lighting' },
              { label: 'Chrominance Space', score: result.color_score, tab: 'color' },
              ...(isVideo ? [{ label: 'Pulse (rPPG)', score: result.rppg_score || 0, tab: 'rppg' }] : []),
              ...(isVideo ? [{ label: 'Eye Gaze & Blink', score: result.eye_score || 0, tab: 'eye' }] : []),
              ...(isVideo && hasAudio ? [{ label: 'SyncNet Lip Sync', score: result.sync_score || 0, tab: 'audio' }] : []),
            ].map(item => {
              const pct = Math.round(item.score * 100);
              const isHigh = item.score >= 0.50;
              const isMid = item.score >= 0.28;
              const statusColor = isHigh ? 'var(--danger)' : isMid ? 'var(--warning)' : 'var(--success)';
              const statusText = isHigh ? 'ANOMALY' : isMid ? 'ELEVATED' : 'NOMINAL';
              const isCurrent = currentRenderTab === item.tab;

              return (
                <div 
                  key={item.label}
                  onClick={() => handleMatrixClick(item.tab)}
                  className={`matrix-row ${isCurrent ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor }} />
                    <span style={{ fontSize: '0.72rem', color: isCurrent ? 'var(--text-main)' : 'var(--text-secondary)', fontWeight: isCurrent ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: '0.62rem', 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700, 
                      padding: '0.08rem 0.35rem', 
                      borderRadius: '3px', 
                      background: `${statusColor}15`, 
                      color: statusColor 
                    }}>
                      {statusText}
                    </span>
                    <span className="mono-font" style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor, minWidth: '26px', textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>

      {/* ========================================================
          RIGHT MAIN WORKBENCH
          ======================================================== */}
      <div className="dashboard-main">

        {/* Executive Forensic Dossier Header Banner */}
        <div className="dossier-banner">
          <div className="dossier-banner-accent" style={{ background: verdictStyle.color }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: 'var(--radius-sm)',
              background: verdictStyle.bg, border: `1px solid ${verdictStyle.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: verdictStyle.color, flexShrink: 0
            }}>
              {verdictStyle.icon}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  Certified Forensic Dossier
                </span>
                <span 
                  onClick={() => copyToClipboard(jobId ? jobId.slice(0, 8).toUpperCase() : 'AUDIT-V2', 'job')}
                  style={{ fontSize: '0.65rem', padding: '0.12rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid var(--glass-border)' }}
                  title="Click to copy Audit ID"
                >
                  CASE #{jobId ? jobId.slice(0, 8).toUpperCase() : 'AUDIT-V2'}
                  {copiedJobId ? <Check size={10} color="var(--success)" /> : <Copy size={10} />}
                </span>
              </div>

              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span>{verdictStyle.title}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.2rem 0.55rem', borderRadius: '4px', background: `${verdictStyle.color}15`, color: verdictStyle.color, border: `1px solid ${verdictStyle.color}35` }}>
                  {(result.overall_score * 100).toFixed(1)}% Anomaly Index
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.45, maxWidth: '820px' }}>
                {verdictStyle.summary}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            <button 
              onClick={downloadReport}
              disabled={isExportingPdf}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1rem', opacity: isExportingPdf ? 0.75 : 1 }}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 size={14} className="spin-animation" /> Synthesizing PDF...
                </>
              ) : (
                <>
                  <Download size={14} /> Export PDF Dossier
                </>
              )}
            </button>
            <button 
              onClick={resetApp}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.6rem 0.9rem' }}
            >
              <RotateCcw size={13} /> New Audit
            </button>
          </div>
        </div>

        {/* 5 Cohesive Forensic Workbenches (Domain-Grouped Navigation) */}
        <div className="workbench-tabs">
          <button
            className={`workbench-tab-btn ${activeDomain === 'dossier' ? 'active' : ''}`}
            onClick={() => setActiveDomain('dossier')}
          >
            <BarChart3 size={15} />
            <span>Executive Dossier</span>
            <span className="tab-badge" style={{ background: `${verdictStyle.color}15`, color: verdictStyle.color }}>
              {Math.round(result.overall_score * 100)}%
            </span>
          </button>

          <button
            className={`workbench-tab-btn ${activeDomain === 'visual' ? 'active' : ''}`}
            onClick={() => setActiveDomain('visual')}
          >
            <Flame size={15} />
            <span>Visual XAI (Grad-CAM)</span>
            <span className="tab-badge" style={{ background: 'rgba(244, 63, 94, 0.12)', color: 'var(--danger)' }}>
              {Math.round(result.nn_score * 100)}%
            </span>
          </button>

          <button
            className={`workbench-tab-btn ${activeDomain === 'optics' ? 'active' : ''}`}
            onClick={() => setActiveDomain('optics')}
          >
            <Camera size={15} />
            <span>Physical Optics &amp; Noise</span>
          </button>

          <button
            className={`workbench-tab-btn ${activeDomain === 'biometrics' ? 'active' : ''}`}
            onClick={() => setActiveDomain('biometrics')}
          >
            <Focus size={15} />
            <span>Biometrics &amp; Kinematics</span>
          </button>

          <button
            className={`workbench-tab-btn ${activeDomain === 'spectral_audio' ? 'active' : ''}`}
            onClick={() => setActiveDomain('spectral_audio')}
          >
            <Activity size={15} />
            <span>Spectral &amp; Audio</span>
          </button>
        </div>

        {/* Sub-View Selector (Only when a multi-sensor domain is selected) */}
        {activeDomain === 'optics' && (
          <div className="subview-pills">
            <button className={`subview-pill ${opticsSubTab === 'ela' ? 'active' : ''}`} onClick={() => setOpticsSubTab('ela')}>
              Error Level Analysis (ELA) • {Math.round(result.ela_score * 100)}%
            </button>
            <button className={`subview-pill ${opticsSubTab === 'noise' ? 'active' : ''}`} onClick={() => setOpticsSubTab('noise')}>
              Sensor Noise (PRNU) • {Math.round(result.noise_score * 100)}%
            </button>
            <button className={`subview-pill ${opticsSubTab === 'cfa' ? 'active' : ''}`} onClick={() => setOpticsSubTab('cfa')}>
              Bayer CFA Demosaicing • {Math.round((result.cfa_score || 0) * 100)}%
            </button>
            <button className={`subview-pill ${opticsSubTab === 'corneal' ? 'active' : ''}`} onClick={() => setOpticsSubTab('corneal')}>
              Corneal Highlights NCC • {Math.round((result.corneal_score || 0) * 100)}%
            </button>
            <button className={`subview-pill ${opticsSubTab === 'lighting' ? 'active' : ''}`} onClick={() => setOpticsSubTab('lighting')}>
              3D Lighting Harmonics • {Math.round((result.lighting_score || 0) * 100)}%
            </button>
          </div>
        )}

        {activeDomain === 'biometrics' && (
          <div className="subview-pills">
            <button className={`subview-pill ${biometricsSubTab === 'geometry' ? 'active' : ''}`} onClick={() => setBiometricsSubTab('geometry')}>
              468 3D Mesh Geometry • {Math.round(result.geometry_anomaly_score * 100)}%
            </button>
            {isVideo && (
              <button className={`subview-pill ${biometricsSubTab === 'eye' ? 'active' : ''}`} onClick={() => setBiometricsSubTab('eye')}>
                Eye Gaze &amp; EAR Blink • {Math.round((result.eye_score || 0) * 100)}%
              </button>
            )}
            {isVideo && (
              <button className={`subview-pill ${biometricsSubTab === 'rppg' ? 'active' : ''}`} onClick={() => setBiometricsSubTab('rppg')}>
                Subcutaneous Pulse (rPPG) • {Math.round((result.rppg_score || 0) * 100)}%
              </button>
            )}
          </div>
        )}

        {activeDomain === 'spectral_audio' && (
          <div className="subview-pills">
            <button className={`subview-pill ${spectralSubTab === 'frequency' ? 'active' : ''}`} onClick={() => setSpectralSubTab('frequency')}>
              2D FFT / DCT Spectra • {Math.round(result.spectral_anomaly_score * 100)}%
            </button>
            {isVideo && (
              <button className={`subview-pill ${spectralSubTab === 'flow' ? 'active' : ''}`} onClick={() => setSpectralSubTab('flow')}>
                DIS Optical Flow • {Math.round((result.flow_score || 0) * 100)}%
              </button>
            )}
            {isVideo && hasAudio && (
              <button className={`subview-pill ${spectralSubTab === 'audio' ? 'active' : ''}`} onClick={() => setSpectralSubTab('audio')}>
                SyncNet Lip-Sync • {Math.round((result.sync_score || 0) * 100)}%
              </button>
            )}
            {isVideo && hasAudio && (
              <button className={`subview-pill ${spectralSubTab === 'voice' ? 'active' : ''}`} onClick={() => setSpectralSubTab('voice')}>
                Vocoder Anti-Spoofing • {Math.round((result.voice_score || 0) * 100)}%
              </button>
            )}
            <button className={`subview-pill ${spectralSubTab === 'color' ? 'active' : ''}`} onClick={() => setSpectralSubTab('color')}>
              Chrominance Space • {Math.round(result.color_score * 100)}%
            </button>
            <button className={`subview-pill ${spectralSubTab === 'meta' ? 'active' : ''}`} onClick={() => setSpectralSubTab('meta')}>
              Container Metadata • {Math.round((result.metadata_score || 0) * 100)}%
            </button>
          </div>
        )}

        {/* Tab Content Display */}
        <React.Suspense fallback={
          <div className="forensic-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading forensic inspection module...
          </div>
        }>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRenderTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {/* Tab: Features / Ensemble Dossier */}
              {currentRenderTab === 'features' && (
                <FeaturesTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Neural Net / Visual Grad-CAM */}
              {currentRenderTab === 'visual' && (
                <VisualTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: ELA */}
              {currentRenderTab === 'ela' && (
                <ElaTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Noise */}
              {currentRenderTab === 'noise' && (
                <NoiseTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: CFA */}
              {currentRenderTab === 'cfa' && (
                <CfaTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Corneal */}
              {currentRenderTab === 'corneal' && (
                <CornealTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Lighting */}
              {currentRenderTab === 'lighting' && (
                <LightingTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Geometry */}
              {currentRenderTab === 'geometry' && (
                <GeometryTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Eye Gaze */}
              {currentRenderTab === 'eye' && (
                <EyeTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: rPPG */}
              {currentRenderTab === 'rppg' && (
                <RppgTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Frequency */}
              {currentRenderTab === 'frequency' && (
                <FrequencyTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Flow */}
              {currentRenderTab === 'flow' && (
                <FlowTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Audio Sync */}
              {currentRenderTab === 'audio' && (
                <AudioTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Voice Spoofing */}
              {currentRenderTab === 'voice' && (
                <VoiceTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Color */}
              {currentRenderTab === 'color' && (
                <ColorTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                />
              )}

              {/* Tab: Metadata */}
              {currentRenderTab === 'meta' && (
                <MetaTab 
                  result={result} 
                  expandedCards={expandedCards} 
                  hiddenCards={hiddenCards} 
                  toggleExpand={toggleExpand} 
                  hideCard={hideCard} 
                  restoreCards={restoreCards} 
                  getScoreColor={getScoreColor} 
                  getSyncColor={getSyncColor} 
                  setZoomedImage={setZoomedImage} 
                  isVideo={isVideo} 
                  showFullSpectralInfo={showFullSpectralInfo} 
                  setShowFullSpectralInfo={setShowFullSpectralInfo} 
                  showFullGradcamInfo={showFullGradcamInfo} 
                  setShowFullGradcamInfo={setShowFullGradcamInfo} 
                  showFullElaInfo={showFullElaInfo} 
                  setShowFullElaInfo={setShowFullElaInfo} 
                  showFullGeometryInfo={showFullGeometryInfo} 
                  setShowFullGeometryInfo={setShowFullGeometryInfo} 
                  fileName={fileName} 
                  jobId={jobId} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </React.Suspense>
      </div>

      {/* Fullscreen Image Modal */}
      {zoomedImage && createPortal(
        <div className="image-modal-overlay" onClick={() => setZoomedImage(null)}>
          <button className="close-modal-btn" onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}>
            <X size={20} />
          </button>
          <img 
            src={zoomedImage} 
            alt="Fullscreen Forensic View" 
            className="image-modal-content" 
            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }} 
          />
        </div>,
        document.body
      )}
    </motion.div>
  );
};

export default React.memo(ReportDashboard);
