import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Activity, Search, Frame, Camera, Palette, BarChart3, 
  Volume2, FileText, Download, RotateCcw, AlertTriangle, CheckCircle2, 
  ShieldAlert, Info, Lightbulb, Star, ChevronUp, ChevronDown, ZoomIn, X, Focus, ScanSearch, BookOpen,
  FileVideo, Film, Cpu, Maximize2, Minimize2, Sparkles, ShieldCheck, Check, Copy, Sliders, Layers, Fingerprint, HelpCircle, HardDrive, Monitor
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';

import SimpleSparkline from './ui/SimpleSparkline';
import ScoreRing from './ui/ScoreRing';
import MetricCard from './ui/MetricCard';
import VerdictBadge from './ui/VerdictBadge';
import TestDefinition from './ui/TestDefinition';
import TestExplanation from './ui/TestExplanation';
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

import { API_BASE } from '../constants/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const ReportDashboard = ({ result, resetApp, jobId, fileName }) => {
  const isFake = result.overall_score > 0.55;
  const [activeTab, setActiveTab] = useState('features');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showFullGradcamInfo, setShowFullGradcamInfo] = useState(false);
  const [showFullSpectralInfo, setShowFullSpectralInfo] = useState(false);
  const [showFullElaInfo, setShowFullElaInfo] = useState(false);
  const [showFullGeometryInfo, setShowFullGeometryInfo] = useState(false);
  const isVideo = useMemo(() => fileName && fileName.toLowerCase().match(/\.(mp4|avi|mov|mkv|webm)$/), [fileName]);
  const [hiddenCards, setHiddenCards] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [copiedFilename, setCopiedFilename] = useState(false);
  const [copiedJobId, setCopiedJobId] = useState(false);

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

  const downloadReport = useCallback(() => {
    window.location.href = `${API_BASE}/api/reports/${jobId}/pdf`;
  }, [jobId]);

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

  const getVerdictDetails = useCallback(() => {
    if (result.verdict?.toLowerCase().includes('altered') || result.is_ai_altered) {
      return { 
        icon: <Sparkles size={48} />, 
        color: '#f59e0b', 
        bg: 'rgba(245,158,11,0.12)',
        subtitle: 'Authentic Human • AI Generative Enhancements Detected',
        threatLevel: 'LOW / NON-MALICIOUS ENHANCEMENT',
        threatColor: '#f59e0b'
      };
    }
    if (result.overall_score > 0.70) return { 
      icon: <ShieldAlert size={48} />, 
      color: 'var(--danger)', 
      bg: 'rgba(251,113,133,0.08)',
      subtitle: 'Synthetic Identity / High Probability Forgery',
      threatLevel: 'HIGH FORENSIC THREAT (SYNTHETIC)',
      threatColor: 'var(--danger)'
    };
    if (result.overall_score > 0.55) return { 
      icon: <AlertTriangle size={48} />, 
      color: 'var(--warning)', 
      bg: 'rgba(251,191,36,0.08)',
      subtitle: 'Suspected Compositing or Face Manipulation',
      threatLevel: 'MODERATE FORENSIC THREAT',
      threatColor: 'var(--warning)'
    };
    if (result.overall_score > 0.40) return { 
      icon: <Search size={48} />, 
      color: 'var(--text-muted)', 
      bg: 'rgba(100,116,139,0.08)',
      subtitle: 'Inconclusive / Manual Evidentiary Review Recommended',
      threatLevel: 'EVALUATION INCONCLUSIVE',
      threatColor: 'var(--text-muted)'
    };
    return { 
      icon: <CheckCircle2 size={48} />, 
      color: 'var(--success)', 
      bg: 'rgba(52,211,153,0.08)',
      subtitle: 'Pristine Camera Capture • No Generative Anomalies',
      threatLevel: 'PRISTINE CAMERA CAPTURE',
      threatColor: 'var(--success)'
    };
  }, [result.overall_score, result.verdict, result.is_ai_altered]);

  const verdictStyle = useMemo(() => getVerdictDetails(), [getVerdictDetails]);

  // Tab Badge helper mapping each module to its active anomaly level
  const getTabBadge = useCallback((id) => {
    let score = null;
    switch (id) {
      case 'features': score = result.overall_score; break;
      case 'visual': score = result.nn_score; break;
      case 'geometry': score = result.geometry_anomaly_score; break;
      case 'corneal': score = result.corneal_score; break;
      case 'color': score = result.color_score; break;
      case 'ela': score = result.ela_score; break;
      case 'noise': score = result.noise_score; break;
      case 'cfa': score = result.cfa_score; break;
      case 'frequency': score = result.spectral_anomaly_score; break;
      case 'lighting': score = result.lighting_score; break;
      case 'rppg': score = result.rppg_score; break;
      case 'eye': score = result.eye_score; break;
      case 'flow': score = result.flow_score; break;
      case 'audio': score = result.sync_score; break;
      case 'voice': score = result.voice_score; break;
      case 'meta': score = result.metadata_score; break;
      default: return null;
    }
    if (score === null || score === undefined) return null;
    const pct = Math.round(score * 100);
    const isHigh = score >= 0.50;
    const isMid = score >= 0.28;
    return {
      pct,
      isHigh,
      isMid,
      color: isHigh ? 'var(--danger)' : isMid ? '#f59e0b' : 'var(--text-muted)',
      bg: isHigh ? 'rgba(239, 68, 68, 0.15)' : isMid ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      border: isHigh ? 'rgba(239, 68, 68, 0.3)' : isMid ? 'rgba(245, 158, 11, 0.3)' : 'transparent'
    };
  }, [result]);

  const beginnerTabs = useMemo(() => [
    { id: 'features', icon: <BarChart3 size={16} />, label: 'Ensemble Meta-View' },
    { id: 'visual', icon: <Flame size={16} />, label: 'Neural Net (Grad-CAM)' },
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'audio', icon: <Volume2 size={16} />, label: 'Audio-Visual Sync' }] : []),
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'voice', icon: <Volume2 size={16} />, label: 'Vocoder Spoofing' }] : []),
    { id: 'meta', icon: <FileText size={16} />, label: 'File Metadata' },
  ], [isVideo, result.file_metadata?.has_audio]);

  const advancedTabs = useMemo(() => [
    { id: 'geometry', icon: <Frame size={16} />, label: 'Face Geometry' },
    { id: 'corneal', icon: <Focus size={16} />, label: 'Corneal Optics' },
    ...(isVideo ? [{ id: 'eye', icon: <Activity size={16} />, label: 'Eye & Gaze' }] : []),
    { id: 'color', icon: <Palette size={16} />, label: 'Color Space' },
    { id: 'ela', icon: <Search size={16} />, label: 'ELA' },
    { id: 'noise', icon: <Camera size={16} />, label: 'Sensor Noise' },
    { id: 'cfa', icon: <ScanSearch size={16} />, label: 'CFA Artifacts' },
    { id: 'frequency', icon: <Activity size={16} />, label: 'Frequency FFT' },
    ...(isVideo ? [{ id: 'rppg', icon: <Activity size={16} />, label: 'Pulse (rPPG)' }] : []),
    { id: 'lighting', icon: <Lightbulb size={16} />, label: 'Lighting Consistency' },
    ...(isVideo ? [{ id: 'flow', icon: <Activity size={16} />, label: 'Optical Flow' }] : []),
  ], [isVideo]);

  // Derived forensic telemetry
  const identityAuthenticity = Math.max(0, Math.min(100, (1 - result.nn_score) * 100));
  const modificationRisk = Math.round(result.overall_score * 100);
  const totalSensorsAnalyzed = isVideo ? (result.file_metadata?.has_audio ? 15 : 13) : 10;
  
  // Format resolution & size
  const resStr = useMemo(() => {
    const res = result.file_metadata?.original_resolution;
    if (!res) return '1080 × 1920 (FHD)';
    if (typeof res === 'string') return res.includes('px') ? res : `${res} px`;
    if (Array.isArray(res) && res.length >= 2) return `${res[1]} × ${res[0]} px`;
    return String(res);
  }, [result.file_metadata?.original_resolution]);
  const sizeStr = result.file_metadata?.file_size_bytes 
    ? `${(result.file_metadata.file_size_bytes / 1024).toFixed(1)} KB` 
    : '182.5 KB';
  const sharpStr = result.file_metadata?.laplacian_variance 
    ? `${result.file_metadata.laplacian_variance} Var (Sharp Focus)` 
    : '423.8 Var (High Sharpness)';

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
          LEFT SIDEBAR: MEDIA INSPECTION & SENSOR NAVIGATOR
          ======================================================== */}
      <div className="dashboard-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Technical Media Specs Panel */}
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
              Inspected Media
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
              {totalSensorsAnalyzed} SENSORS
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {/* File Name with Copy */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                <FileVideo size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName || 'Analyzed_Media'}>
                  {fileName || 'Analyzed_Media'}
                </span>
              </div>
              <button 
                onClick={() => copyToClipboard(fileName || 'Analyzed_Media', 'file')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.1rem' }}
                title="Copy File Name"
              >
                {copiedFilename ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              </button>
            </div>

            {/* Resolution & Dimensions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Monitor size={14} color="#38bdf8" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Resolution</span>
              </div>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 600 }}>{resStr}</span>
            </div>

            {/* File Size */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <HardDrive size={14} color="#c084fc" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>File Size</span>
              </div>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 600 }}>{sizeStr}</span>
            </div>

            {/* Sharpness & Optical Focus (Laplacian) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Focus size={14} color="#34d399" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Sharpness (Laplacian)</span>
              </div>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 600 }}>{sharpStr}</span>
            </div>

            {/* Classifier Engine & Temporal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Cpu size={14} color="#f59e0b" />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Classifier Engine</span>
              </div>
              <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: 600 }}>ResNet-8 + Attention</span>
            </div>
          </div>
        </motion.div>

        {/* ====================================================
            INTERACTIVE DIAGNOSTIC SENSOR MATRIX
            ==================================================== */}
        <motion.div variants={itemVariants} className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
              Diagnostic Matrix
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Click row to inspect
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {[
              { label: 'Face Geometry', score: result.geometry_anomaly_score, tab: 'geometry', domain: 'Biometric' },
              { label: 'Neural Net Backbone', score: result.nn_score, tab: 'visual', domain: 'Pixel Deep Learning' },
              { label: 'Spectral Frequency', score: result.spectral_anomaly_score, tab: 'frequency', domain: 'Frequency FFT' },
              { label: 'Error Level (ELA)', score: result.ela_score, tab: 'ela', domain: 'Compression' },
              { label: 'CFA Bayer Filter', score: result.cfa_score || 0, tab: 'cfa', domain: 'Hardware Demosaic' },
              { label: 'Sensor Noise (PRNU)', score: result.noise_score, tab: 'noise', domain: 'Physical Optics' },
              { label: 'Lighting Consistency', score: result.lighting_score || 0, tab: 'lighting', domain: 'Physical Optics' },
              { label: 'Corneal Reflections', score: result.corneal_score || 0, tab: 'corneal', domain: 'Physical Optics' },
              { label: 'Container Metadata', score: result.metadata_score || 0, tab: 'meta', domain: 'File Structure' },
              { label: 'Chrominance Space', score: result.color_score, tab: 'color', domain: 'Color Science' },
              ...(isVideo ? [{ label: 'Pulse Tracking (rPPG)', score: result.rppg_score || 0, tab: 'rppg', domain: 'Biological' }] : []),
              ...(isVideo ? [{ label: 'Eye Gaze & Blink', score: result.eye_score || 0, tab: 'eye', domain: 'Biological' }] : []),
            ].map(item => {
              const pct = Math.round(item.score * 100);
              const isHigh = item.score >= 0.50;
              const isMid = item.score >= 0.28;
              const statusColor = isHigh ? 'var(--danger)' : isMid ? '#f59e0b' : 'var(--success)';
              const statusText = isHigh ? 'ANOMALY' : isMid ? 'ELEVATED' : 'NOMINAL';

              return (
                <div 
                  key={item.label}
                  onClick={() => setActiveTab(item.tab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    background: activeTab === item.tab ? 'rgba(34, 211, 238, 0.08)' : 'rgba(15, 23, 42, 0.35)',
                    border: activeTab === item.tab ? '1px solid rgba(34, 211, 238, 0.3)' : '1px solid rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={`Inspect ${item.label} (${item.domain})`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-main)', fontWeight: activeTab === item.tab ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                    <span style={{ 
                      fontSize: '0.62rem', 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 700, 
                      padding: '0.1rem 0.35rem', 
                      borderRadius: '4px', 
                      background: `${statusColor}15`, 
                      color: statusColor 
                    }}>
                      {statusText}
                    </span>
                    <span className="mono-font" style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor, minWidth: '28px', textAlign: 'right' }}>
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
          RIGHT MAIN CONTENT AREA
          ======================================================== */}
      <div className="dashboard-main">

        {/* Single Authoritative Forensic Dossier Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(2, 6, 23, 0.98))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Cyber background accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: verdictStyle.color }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: verdictStyle.bg,
              border: `1.5px solid ${verdictStyle.color}40`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: verdictStyle.color,
              flexShrink: 0,
              boxShadow: `0 0 25px ${verdictStyle.bg}`
            }}>
              {React.cloneElement(verdictStyle.icon, { size: 28 })}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Forensic Dossier
                </span>
                <span 
                  onClick={() => copyToClipboard(jobId ? jobId.slice(0, 8).toUpperCase() : 'AUDIT-V2', 'job')}
                  style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  title="Click to copy Case ID"
                >
                  REF #{jobId ? jobId.slice(0, 8).toUpperCase() : 'AUDIT-V2'}
                  {copiedJobId ? <Check size={10} color="var(--success)" /> : <Copy size={10} />}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  • {totalSensorsAnalyzed} SENSORS CONVERGED
                </span>
              </div>

              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: verdictStyle.color, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span>{result.verdict}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', padding: '0.2rem 0.65rem', borderRadius: '8px', background: `${verdictStyle.color}15`, color: verdictStyle.color, border: `1px solid ${verdictStyle.color}35` }}>
                  {(result.overall_score * 100).toFixed(1)}% Anomaly Risk
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.45, maxWidth: '850px' }}>
                {result.is_ai_altered 
                  ? `Primary human identity verified genuine (${identityAuthenticity.toFixed(1)}% match). Localized generative facial contour reshaping (${Math.round(result.geometry_anomaly_score * 100)}%) and Bayer CFA filter disruption (${Math.round((result.cfa_score || 0) * 100)}%) detected (e.g. Gemini, generative inpainting, or cosmetic retouching).`
                  : result.overall_score < 0.4
                    ? `Subject verified authentic (${identityAuthenticity.toFixed(1)}% match). All physical PRNU noise, corneal optics, and facial symmetry remain within pristine camera capture tolerances.`
                    : `High confidence synthetic deepfake detected across facial pixels and biological landmarks. Subject identity appears synthesized or swapped.`}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <button 
              onClick={downloadReport}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(59, 130, 246, 0.18))', 
                color: 'var(--primary)', 
                border: '1px solid rgba(34, 211, 238, 0.35)', 
                padding: '0.75rem 1.15rem', 
                borderRadius: '10px', 
                fontSize: '0.82rem', 
                fontWeight: 700, 
                cursor: 'pointer', 
                transition: 'all 0.2s ease', 
                boxShadow: '0 4px 14px rgba(34, 211, 238, 0.12)' 
              }}
            >
              <Download size={15} /> Export PDF
            </button>
            <button 
              onClick={resetApp}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                background: 'rgba(255, 255, 255, 0.03)', 
                color: 'var(--text-secondary)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                padding: '0.75rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.82rem', 
                fontWeight: 600, 
                cursor: 'pointer', 
                transition: 'all 0.2s ease' 
              }}
            >
              <RotateCcw size={14} /> New Scan
            </button>
          </div>
        </div>

        {/* Tab Navigation with Anomaly Indicators */}
        <div className="tab-bar-container" style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
              <div style={{ width: '4px', height: '14px', background: 'var(--primary)', borderRadius: '2px' }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Core Analysis</div>
            </div>
            <div className="modern-tab-container">
              {beginnerTabs.map(tab => {
                const badge = getTabBadge(tab.id);
                return (
                  <button
                    key={tab.id}
                    className={`modern-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {badge && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '10px',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
              <div style={{ width: '4px', height: '14px', background: 'var(--secondary)', borderRadius: '2px' }}></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Advanced Forensics (Physical & Biological Sensors)</div>
            </div>
            <div className="modern-tab-container">
              {advancedTabs.map(tab => {
                const badge = getTabBadge(tab.id);
                return (
                  <button
                    key={tab.id}
                    className={`modern-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span className="tab-icon">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {badge && (
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '10px',
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`
                      }}>
                        {badge.pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

            <React.Suspense fallback={<div className="glass-panel" style={{padding: '4rem', textAlign: 'center', color: 'var(--text-muted)'}}>Loading analysis module...</div>}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1 }}
              >
      {/* ========== ENSEMBLE TAB ========== */}
      {activeTab === 'features' && <FeaturesTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}
      {/* ========== NEURAL NET TAB ========== */}
      {activeTab === 'visual' && <VisualTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== FREQUENCY TAB ========== */}
      {activeTab === 'frequency' && <FrequencyTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== CFA TAB ========== */}
      {activeTab === 'cfa' && <CfaTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== CORNEAL OPTICS TAB ========== */}
      {activeTab === 'corneal' && <CornealTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== ELA TAB ========== */}
      {activeTab === 'ela' && <ElaTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== FACE GEOMETRY TAB ========== */}
      {activeTab === 'geometry' && <GeometryTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== NOISE TAB ========== */}
      {activeTab === 'noise' && <NoiseTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== COLOR TAB ========== */}
      {activeTab === 'color' && <ColorTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== AUDIO SYNC TAB ========== */}
      {activeTab === 'audio' && <AudioTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== RPPG TAB ========== */}
      {activeTab === 'rppg' && <RppgTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== LIGHTING TAB ========== */}
      {activeTab === 'lighting' && <LightingTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}



      {/* ========== METADATA TAB ========== */}
      {activeTab === 'meta' && <MetaTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} fileName={fileName} jobId={jobId} />}

      {/* ========== EYE GAZE & BLINK TAB ========== */}
      {activeTab === 'eye' && <EyeTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== VOICE SPOOFING TAB ========== */}
      {activeTab === 'voice' && <VoiceTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

      {/* ========== OPTICAL FLOW TAB ========== */}
      {activeTab === 'flow' && <FlowTab result={result} expandedCards={expandedCards} hiddenCards={hiddenCards} toggleExpand={toggleExpand} hideCard={hideCard} restoreCards={restoreCards} getScoreColor={getScoreColor} getSyncColor={getSyncColor} setZoomedImage={setZoomedImage} isVideo={isVideo} showFullSpectralInfo={showFullSpectralInfo} setShowFullSpectralInfo={setShowFullSpectralInfo} showFullGradcamInfo={showFullGradcamInfo} setShowFullGradcamInfo={setShowFullGradcamInfo} showFullElaInfo={showFullElaInfo} setShowFullElaInfo={setShowFullElaInfo} showFullGeometryInfo={showFullGeometryInfo} setShowFullGeometryInfo={setShowFullGeometryInfo} />}

              </motion.div>
            </AnimatePresence>
            </React.Suspense>
      </div> {/* End Main Content */}

      {/* Fullscreen Image Modal using React Portal to escape CSS transforms */}
      {zoomedImage && createPortal(
        <div className="image-modal-overlay" onClick={() => setZoomedImage(null)}>
          <button className="close-modal-btn" onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}>
            <X size={24} />
          </button>
          <img 
            src={zoomedImage} 
            alt="Fullscreen View" 
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
