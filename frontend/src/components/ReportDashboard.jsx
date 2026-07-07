import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Flame, Activity, Search, Frame, Camera, Palette, BarChart3, 
  Volume2, FileText, Download, RotateCcw, AlertTriangle, CheckCircle2, 
  ShieldAlert, Info, Lightbulb, Star, ChevronUp, ChevronDown, ZoomIn, X, Focus, ScanSearch, BookOpen,
  FileVideo, Film, Cpu, Maximize2, Minimize2
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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

  const toggleExpand = useCallback((id) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] })), []);
  const hideCard = useCallback((id) => setHiddenCards(prev => ({ ...prev, [id]: true })), []);
  const restoreCards = useCallback(() => { setHiddenCards({}); setExpandedCards({}); }, []);

  const downloadReport = useCallback(() => {
    // Navigate directly to the download endpoint. 
    // This allows IDM or the browser to natively handle the file download without throwing JavaScript fetch errors.
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
    if (result.overall_score > 0.70) return { icon: <ShieldAlert size={48} />, color: 'var(--danger)', bg: 'rgba(251,113,133,0.06)' };
    if (result.overall_score > 0.55) return { icon: <AlertTriangle size={48} />, color: 'var(--warning)', bg: 'rgba(251,191,36,0.06)' };
    if (result.overall_score > 0.40) return { icon: <Search size={48} />, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.06)' };
    return { icon: <CheckCircle2 size={48} />, color: 'var(--success)', bg: 'rgba(52,211,153,0.06)' };
  }, [result.overall_score]);

  const verdictStyle = useMemo(() => getVerdictDetails(), [getVerdictDetails]);

  const beginnerTabs = useMemo(() => [
    { id: 'features', icon: <BarChart3 size={16} />, label: 'Ensemble' },
    { id: 'visual', icon: <Flame size={16} />, label: 'Neural Net' },
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'audio', icon: <Volume2 size={16} />, label: 'Audio Sync' }] : []),
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'voice', icon: <Volume2 size={16} />, label: 'Voice Spoofing' }] : []),
    { id: 'meta', icon: <FileText size={16} />, label: 'Metadata' },
  ], [isVideo, result.file_metadata?.has_audio]);

  const advancedTabs = useMemo(() => [
    { id: 'geometry', icon: <Frame size={16} />, label: 'Face Geometry' },
    { id: 'corneal', icon: <Focus size={16} />, label: 'Corneal Optics' },
    ...(isVideo ? [{ id: 'eye', icon: <Activity size={16} />, label: 'Eye & Gaze' }] : []),
    { id: 'color', icon: <Palette size={16} />, label: 'Color Space' },
    { id: 'ela', icon: <Search size={16} />, label: 'ELA' },
    { id: 'noise', icon: <Camera size={16} />, label: 'Sensor Noise' },
    { id: 'cfa', icon: <ScanSearch size={16} />, label: 'CFA Artifacts' },
    { id: 'frequency', icon: <Activity size={16} />, label: 'Frequency' },
    ...(isVideo ? [{ id: 'rppg', icon: <Activity size={16} />, label: 'Pulse (rPPG)' }] : []),
    { id: 'lighting', icon: <Lightbulb size={16} />, label: 'Lighting' },
    ...(isVideo ? [{ id: 'flow', icon: <Activity size={16} />, label: 'Optical Flow' }] : []),
  ], [isVideo]);

  return (
    <div 
      className="dashboard-split fade-in-up"
      onClick={(e) => {
        if (e.target.tagName === 'IMG' && (e.target.classList.contains('result-img') || e.target.classList.contains('heatmap-image'))) {
          setZoomedImage(e.target.src);
        }
      }}
    >
      {/* Left Sidebar */}
      <div className="dashboard-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button 
            onClick={downloadReport}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(34, 211, 238, 0.1)', color: 'var(--primary)', border: '1px solid rgba(34, 211, 238, 0.2)', padding: '0.8rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <Download size={16} /> Export PDF
          </button>
          <button 
            onClick={resetApp}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-secondary)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.8rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>

        {/* Main Verdict Card */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Top Banner / Glow effect based on verdict */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: verdictStyle.color, boxShadow: `0 0 20px ${verdictStyle.color}` }}></div>
          <div style={{ position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '100px', background: verdictStyle.color, filter: 'blur(60px)', opacity: 0.15, borderRadius: '50%', pointerEvents: 'none' }}></div>

          <div style={{ padding: '2.5rem 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: verdictStyle.bg, border: `1px solid ${verdictStyle.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: verdictStyle.color, marginBottom: '1.25rem', boxShadow: `0 0 30px ${verdictStyle.bg}` }}>
              {React.cloneElement(verdictStyle.icon, { size: 40 })}
            </div>
            
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              Final Meta-Verdict
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: verdictStyle.color, lineHeight: 1.1, letterSpacing: '-0.5px', marginBottom: '1.5rem' }}>
              {result.verdict}
            </div>

            <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Ensemble Confidence</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{(result.overall_score * 100).toFixed(1)}%</div>
              </div>
              <div style={{ width: '50px', height: '50px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={verdictStyle.color} strokeWidth="4" strokeDasharray={`${result.overall_score * 100}, 100`} />
                </svg>
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1rem' }}>Forensic Metadata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileVideo size={12} color="var(--primary)" /></div>
                <span className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Analyzed_Media'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film size={12} color="var(--accent)" /></div>
                <span className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{result.frames_analyzed} frames analyzed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Cpu size={12} color="var(--success)" /></div>
                <span className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ResNet Meta-Classifier</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.4)', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={12} color="var(--warning)" /></div>
                <span className="mono-font" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{isVideo ? (result.file_metadata?.has_audio ? 14 : 12) : 10} sensory inputs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Score Grid */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1rem' }}>Sub-Model Signals</div>
          <div className="mini-score-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Neural Net', score: result.nn_score, key: 'nn' },
              { label: 'Spectral', score: result.spectral_anomaly_score, key: 'sp' },
              { label: 'ELA', score: result.ela_score, key: 'el' },
              { label: 'Geometry', score: result.geometry_anomaly_score, key: 'geo' },
              { label: 'Noise', score: result.noise_score, key: 'ns' },
              { label: 'Color', score: result.color_score, key: 'cl' },
              { label: 'Lighting', score: result.lighting_score || 0, key: 'li' },
              { label: 'CFA', score: result.cfa_score || 0, key: 'cfa' },
              { label: 'Corneal', score: result.corneal_score || 0, key: 'corn' },
              ...(isVideo ? [{ label: 'rPPG', score: result.rppg_score || 0, key: 'rppg' }] : []),
              ...(isVideo ? [{ label: 'Eye/Gaze', score: result.eye_score || 0, key: 'eye' }] : []),
              ...(isVideo ? [{ label: 'Opt Flow', score: result.flow_score || 0, key: 'flow' }] : []),
              ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Desync', score: result.sync_score, key: 'syn' }] : []),
              ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Voice', score: result.voice_score || 0, key: 'voice' }] : []),
            ].map(item => (
              <div key={item.key} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span className="mono-font" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</span>
                  <span className="mono-font" style={{ fontSize: '0.65rem', fontWeight: 600, color: getScoreColor(item.score) }}>{(item.score * 100).toFixed(0)}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '2px', margin: 0, background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                  <div className="progress-bar-fill" style={{ width: `${item.score * 100}%`, background: getScoreColor(item.score), animation: 'none', borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Right Main Content */}
      <div className="dashboard-main">
        {/* Tab Bar */}
      <div className="tab-bar-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
            <div style={{ width: '4px', height: '14px', background: 'var(--primary)', borderRadius: '2px' }}></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Core Analysis</div>
          </div>
          <div className="modern-tab-container">
            {beginnerTabs.map(tab => (
              <button
                key={tab.id}
                className={`modern-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
            <div style={{ width: '4px', height: '14px', background: 'var(--secondary)', borderRadius: '2px' }}></div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700 }}>Advanced Forensics</div>
          </div>
          <div className="modern-tab-container">
            {advancedTabs.map(tab => (
              <button
                key={tab.id}
                className={`modern-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

            <React.Suspense fallback={<div className="glass-panel" style={{padding: '4rem', textAlign: 'center', color: 'var(--text-muted)'}}>Loading analysis module...</div>}>
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
    </div>
  );
};

export default React.memo(ReportDashboard);
