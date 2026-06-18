import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Flame, Activity, Search, Frame, Camera, Palette, BarChart3, 
  Volume2, FileText, Download, RotateCcw, AlertTriangle, CheckCircle2, 
  ShieldAlert, Info, Lightbulb, Star, ChevronUp, ChevronDown, ZoomIn, X, Focus, ScanSearch
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper component to render a simple SVG line chart
const SimpleSparkline = ({ data, color, label, ideal }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data, ideal || Infinity);
  const max = Math.max(...data, ideal || -Infinity);
  const range = max - min || 1;
  const padding = 10;
  const width = 200;
  const height = 40;
  
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const idealY = ideal !== undefined ? padding + (1 - (ideal - min) / range) * (height - 2 * padding) : null;

  return (
    <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {idealY !== null && (
          <line x1={0} y1={idealY} x2={width} y2={idealY} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {data.map((val, i) => {
          const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
          const y = padding + (1 - (val - min) / range) * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
        })}
      </svg>
    </div>
  );
};

const VerdictBadge = ({ verdict }) => {
  if (!verdict) return null;
  
  const status = typeof verdict === 'string' ? verdict : verdict.status;
  const reason = typeof verdict === 'string' ? null : verdict.reason;
  
  if (!status) return null;

  const isPass = status.toLowerCase().includes('pass');
  const isWarn = status.toLowerCase().includes('warn');
  const bgColor = isPass ? 'rgba(16, 185, 129, 0.15)' : isWarn ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const textColor = isPass ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444';
  const icon = isPass ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 'auto' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem',
        fontWeight: 600, backgroundColor: bgColor, color: textColor,
      }}>
        {icon} {status.toUpperCase()}
      </div>
      {reason && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '180px', textAlign: 'right', lineHeight: '1.2' }}>
          {reason}
        </div>
      )}
    </div>
  );
};

const ReportDashboard = ({ result, resetApp, jobId, fileName }) => {
  const isFake = result.overall_score > 0.55;
  const [activeTab, setActiveTab] = useState('features');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showFullGradcamInfo, setShowFullGradcamInfo] = useState(false);
  const [showFullSpectralInfo, setShowFullSpectralInfo] = useState(false);
  const [showFullElaInfo, setShowFullElaInfo] = useState(false);
  const [showFullGeometryInfo, setShowFullGeometryInfo] = useState(false);
  const isVideo = fileName && fileName.toLowerCase().match(/\.(mp4|avi|mov|mkv|webm)$/);

  const downloadReport = async () => {
    try {
      const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
      const response = await fetch(`${API_BASE}/api/reports/${jobId}/pdf`, {
        headers: { 'x-api-key': API_KEY }
      });
      if (!response.ok) {
        alert("Could not download the report. The analysis may have expired from the temporary server memory, or it was not generated correctly.");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeepForensics_Report_${fileName || jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("An error occurred while downloading the PDF.");
    }
  };

  const getSyncColor = (score) => {
    if (score > 0.6) return 'danger';
    if (score > 0.3) return 'warning';
    return 'success';
  };

  const getScoreColor = (score, invert = false) => {
    const s = invert ? 1 - score : score;
    if (s > 0.6) return 'var(--danger)';
    if (s > 0.35) return 'var(--warning)';
    return 'var(--success)';
  };

  const getVerdictDetails = () => {
    if (result.overall_score > 0.70) return { icon: <ShieldAlert size={48} />, color: 'var(--danger)', bg: 'rgba(251,113,133,0.06)' };
    if (result.overall_score > 0.55) return { icon: <AlertTriangle size={48} />, color: 'var(--warning)', bg: 'rgba(251,191,36,0.06)' };
    if (result.overall_score > 0.40) return { icon: <Search size={48} />, color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.06)' };
    return { icon: <CheckCircle2 size={48} />, color: 'var(--success)', bg: 'rgba(52,211,153,0.06)' };
  };

  const verdictStyle = getVerdictDetails();

  const beginnerTabs = [
    { id: 'features', icon: <BarChart3 size={16} />, label: 'Ensemble' },
    { id: 'visual', icon: <Flame size={16} />, label: 'GradCAM' },
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'audio', icon: <Volume2 size={16} />, label: 'Audio Sync' }] : []),
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'voice', icon: <Volume2 size={16} />, label: 'Voice Spoofing' }] : []),
    { id: 'meta', icon: <FileText size={16} />, label: 'Metadata' },
  ];

  const advancedTabs = [
    { id: 'geometry', icon: <Frame size={16} />, label: 'Face Geometry' },
    ...(!isVideo ? [{ id: 'corneal', icon: <Focus size={16} />, label: 'Corneal Optics' }] : []),
    ...(isVideo ? [{ id: 'eye', icon: <Activity size={16} />, label: 'Eye & Gaze' }] : []),
    { id: 'color', icon: <Palette size={16} />, label: 'Color Space' },
    { id: 'ela', icon: <Search size={16} />, label: 'ELA' },
    { id: 'noise', icon: <Camera size={16} />, label: 'Sensor Noise' },
    ...(!isVideo ? [{ id: 'cfa', icon: <ScanSearch size={16} />, label: 'CFA Artifacts' }] : []),
    { id: 'frequency', icon: <Activity size={16} />, label: 'Frequency' },
    ...(isVideo ? [{ id: 'rppg', icon: <Activity size={16} />, label: 'Pulse (rPPG)' }] : []),
    { id: 'lighting', icon: <Lightbulb size={16} />, label: 'Lighting' },
    ...(isVideo ? [{ id: 'flow', icon: <Activity size={16} />, label: 'Optical Flow' }] : []),
  ];

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
      <div className="dashboard-sidebar">

      {/* Action Buttons at top of sidebar */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={downloadReport}><Download size={14} /> Download PDF</button>
        <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={resetApp}><RotateCcw size={14} /> New Analysis</button>
      </div>

      {/* Verdict Card */}
      <div className={`glass-panel verdict-card ${!isFake ? 'authentic' : 'verdict-fake'}`}>
        <div className="verdict-icon">{verdictStyle.icon}</div>
        <div className="verdict-label">Final Verdict — Multi-Modal Ensemble</div>
        <div className="verdict-result" style={{ color: verdictStyle.color }}>{result.verdict}</div>
        <div className="verdict-score">
          Ensemble Confidence: <strong style={{ color: verdictStyle.color }}>{(result.overall_score * 100).toFixed(1)}%</strong>
        </div>
        <div className="verdict-meta">
          <span className="verdict-meta-item">📁 {fileName || 'Uploaded File'}</span>
          <span className="verdict-meta-item">🖼️ {result.frames_analyzed} frames</span>
          <span className="verdict-meta-item">🧠 EfficientNet-B4 Ensemble</span>
          <span className="verdict-meta-item"><Activity size={20} color="var(--primary)" /> {result.weights ? Object.values(result.weights).filter(w => w > 0).length : (isVideo ? (result.file_metadata?.has_audio ? 13 : 11) : 9)} detectors</span>
          <span className="verdict-meta-item">🕐 {result.timestamp || new Date().toLocaleString()}</span>
        </div>

        {/* Mini score bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
          {[
            { label: 'Neural Net', score: result.nn_score, key: 'nn' },
            { label: 'Spectral', score: result.spectral_anomaly_score, key: 'sp' },
            { label: 'ELA', score: result.ela_score, key: 'el' },
            { label: 'Geometry', score: result.geometry_anomaly_score, key: 'geo' },
            { label: 'Noise', score: result.noise_score, key: 'ns' },
            { label: 'Color', score: result.color_score, key: 'cl' },
            { label: 'Lighting', score: result.lighting_score || 0, key: 'li' },
            ...(!isVideo ? [{ label: 'CFA', score: result.cfa_score || 0, key: 'cfa' }] : []),
            ...(!isVideo ? [{ label: 'Corneal', score: result.corneal_score || 0, key: 'corn' }] : []),
            ...(isVideo ? [{ label: 'rPPG', score: result.rppg_score || 0, key: 'rppg' }] : []),
            ...(isVideo ? [{ label: 'Eye/Gaze', score: result.eye_score || 0, key: 'eye' }] : []),
            ...(isVideo ? [{ label: 'Opt Flow', score: result.flow_score || 0, key: 'flow' }] : []),
            ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Sync', score: 1 - result.sync_score, key: 'syn' }] : []),
            ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Voice', score: result.voice_score || 0, key: 'voice' }] : []),
          ].map(item => (
            <div key={item.key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: getScoreColor(item.score) }}>{(item.score * 100).toFixed(0)}%</div>
              <div className="progress-bar-bg" style={{ height: '3px', marginTop: '0.3rem' }}>
                <div className="progress-bar-fill" style={{ width: `${item.score * 100}%`, background: getScoreColor(item.score), animation: 'none' }}></div>
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
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700, paddingLeft: '0.5rem' }}>Core / Beginner Analysis</div>
          <div className="tab-bar">
            {beginnerTabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700, paddingLeft: '0.5rem' }}>Advanced Physical Forensics</div>
          <div className="tab-bar">
            {advancedTabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========== GRADCAM TAB ========== */}
      {activeTab === 'visual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Info Callout */}
          <div className="info-callout">
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--primary)" /></div>
            <div className="info-callout-content">
              <h4>How Explainable AI (XAI) Visualizations Work</h4>
              <p style={{ marginBottom: showFullGradcamInfo ? '1rem' : '0' }}>
                Deep neural networks are often considered "black boxes", making it difficult to trust their decisions in forensic analysis. To solve this, we use two state-of-the-art XAI algorithms to reverse-engineer the model's thought process: <strong>GradCAM</strong> and <strong>SHAP</strong>.
              </p>
              
              {showFullGradcamInfo && (
                <>
                  <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0 0 1rem 0' }}>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>GradCAM (Gradient-weighted Class Activation Mapping):</strong> This calculates the mathematical gradients flowing through the final convolutional layer of our EfficientNet-B4. It produces a spatial heatmap. <strong style={{ color: 'var(--danger)' }}>Red/Warm areas</strong> indicate where the network found strong evidence of manipulation (e.g., blending boundaries). <strong style={{ color: 'var(--info)' }}>Blue/Cool areas</strong> indicate natural, unmanipulated textures.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Guided GradCAM:</strong> Combines GradCAM with high-resolution pixel gradients, providing a sharper, more detailed map of the exact pixels (like noise anomalies or edge artifacts) that triggered the deepfake alert.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>SHAP (SHapley Additive exPlanations):</strong> A game-theoretic approach that assigns an "importance value" to each facial feature. It tells us which specific region (e.g., "Left Eye", "Mouth", "Jawline") contributed the most percentage to the final verdict.
                    </li>
                  </ul>
                </>
              )}
              
              <button className="btn btn-ghost" style={{ padding: '0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: showFullGradcamInfo ? '0' : '0.5rem' }} onClick={() => setShowFullGradcamInfo(!showFullGradcamInfo)}>
                {showFullGradcamInfo ? <><ChevronUp size={14} /> Show Less</> : <><ChevronDown size={14} /> Read More</>}
              </button>
            </div>
          </div>

          <div className="analysis-grid">
            <div className="glass-panel analysis-panel">
            <div className="panel-header">
              <div className="panel-icon gradcam"><Flame size={20} color="var(--danger)" /></div>
              <div>
                <div className="panel-title">GradCAM Heatmap</div>
                <div className="panel-subtitle">Neural attention visualization on frame</div>
              </div>
            </div>
            <div className="heatmap-container" style={{ position: 'relative', display: 'flex', gap: '1.5rem', overflowX: 'auto', background: 'transparent', padding: '1rem 0' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>Coarse Localization (Grad-CAM)</h4>
                <div 
                  className="zoomable-image-container" 
                  onClick={() => {
                    if (result.heatmaps && result.heatmaps.length > 0) {
                      setZoomedImage(`${API_BASE}/${result.heatmaps[0]}`);
                    }
                  }}
                >
                  {result.heatmaps && result.heatmaps.length > 0 ? (
                    <img
                      src={`${API_BASE}/${result.heatmaps[0]}`}
                      alt="GradCAM Heatmap"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                      <p>Heatmap unavailable</p>
                    </div>
                  )}
                  <div className="zoom-overlay">
                    <ZoomIn size={32} />
                  </div>
                </div>
              </div>
              {result.heatmaps && result.heatmaps.length > 1 && (
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>High-Res Pixel Gradients</h4>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => setZoomedImage(`${API_BASE}/${result.heatmaps[1]}`)}
                  >
                    <img
                      src={`${API_BASE}/${result.heatmaps[1]}`}
                      alt="Guided GradCAM Heatmap"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="zoom-overlay">
                      <ZoomIn size={32} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="heatmap-legend">
              <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
              <span>Red/warm areas = high neural network attention on potential manipulation artifacts. Blue/cool = normal regions.</span>
            </div>
          </div>
          <div className="glass-panel analysis-panel">
            <div className="panel-header">
              <div className="panel-icon shap"><BarChart3 size={20} color="var(--success)" /></div>
              <div>
                <div className="panel-title">SHAP Feature Importance</div>
                <div className="panel-subtitle">Data-driven feature rankings</div>
              </div>
            </div>
            <ul className="feature-list">
              {result.shap_top_features.map((feature, idx) => (
                <li key={idx} className="feature-item">
                  <span className={`feature-dot ${idx === 0 ? 'high' : idx < 3 ? 'medium' : 'low'}`}></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      )}

      {/* ========== FREQUENCY TAB ========== */}
      {activeTab === 'frequency' && result.frequency_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Info Callout */}
          <div className="info-callout">
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How Spectral & Frequency Analysis Works</h4>
              <p style={{ marginBottom: showFullSpectralInfo ? '1rem' : '0' }}>
                Frequency analysis mathematically decomposes an image into its constituent wave frequencies. Real cameras capture a natural balance of <strong>low frequencies</strong> (smooth gradients like skin) and <strong>high frequencies</strong> (sharp edges, pores, and natural sensor noise). AI-generated deepfakes often struggle to reproduce this microscopic high-frequency detail, resulting in an image that is mathematically "too smooth" at the pixel level.
              </p>
              
              {showFullSpectralInfo && (
                <>
                  <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0 0 1rem 0' }}>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>FFT (Fast Fourier Transform):</strong> Converts the image into a 2D spectrum map. The bright center represents low-frequency energy (smooth areas), while the outer rings represent high-frequency detail (sharp edges). A deepfake often lacks energy in the outer rings.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>DCT (Discrete Cosine Transform):</strong> Similar to FFT, but used heavily in JPEG compression. We analyze the grid of DCT coefficients (top-left is low frequency, bottom-right is high frequency) to look for unnatural quantization or missing high-frequency coefficients typical of GAN generation.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>High-Freq Energy Ratio:</strong> A direct mathematical measurement of how much energy exists in the high frequencies compared to the total image energy. Very low numbers (like 0.001%) usually mean the image is extremely compressed or synthetically smoothed by AI.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>PCA (Principal Component Analysis):</strong> Inspired by satellite hyperspectral imaging, we mathematically separate the image's Red, Green, and Blue color channels into their "Principal Components." The 3rd component (PC3) holds the least natural image variance, meaning it is where <strong>hidden GAN artifacts and artificial generation residuals</strong> are trapped. PC3 acts as a forensic microscope!
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>High-Pass Spatial Filter:</strong> Mathematically deletes the low frequencies (smooth skin tones, lighting) via Inverse FFT, completely isolating high-frequency edges and noise. Deepfake blending borders light up brilliantly here.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Phase Spectrum:</strong> Visualizes the structural phase angle of the FFT. Spliced face-swaps break the continuous phase coherence of the original photograph, causing visible structural anomalies.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>8x8 Block DCT High-Frequency Map:</strong> Computes the DCT on every 8x8 pixel block independently. Deepfake generation and splicing disrupt the natural JPEG 8x8 grid, causing a glowing mismatch in localized frequency energy.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Switching Noise Estimator (SWN):</strong> Based on the Ranjbaran et al. filtering algorithm, this technique specifically isolates high-frequency noise by finding zero-crossings in the mathematical gradient of the image. By mathematically suppressing physical edges (like jawlines or glasses), the SWN isolates pure generation noise, lighting up deepfake splicing seams like a neon sign.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Cepstrum Echo Analysis:</strong> The "spectrum of a spectrum." Resizing or rotating a pasted fake face leaves microscopic periodic interpolation echoes in the image, which show up as bright stars in the Cepstrum domain.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Discrete Wavelet Transform (DWT):</strong> Decomposes the image into high-frequency local details. We isolate the "Diagonal Details" (HH) channel because AI generators notoriously fail to synthesize consistent diagonal noise compared to real cameras.
                    </li>
                  </ul>
                  
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <em>Note: Blurry or low-quality laptop webcam photos will naturally have low high-frequency energy due to built-in camera denoising, which is why our XAI engine cross-references multiple sensors!</em>
                  </p>
                </>
              )}
              
              <button 
                onClick={() => setShowFullSpectralInfo(!showFullSpectralInfo)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-color)',
                  cursor: 'pointer', padding: 0, marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}
              >
                {showFullSpectralInfo ? <>Show Less <ChevronUp size={14} /></> : <>Read More Detailed Breakdown <ChevronDown size={14} /></>}
              </button>
            </div>
          </div>

          {/* Quantitative Metrics Summary */}
          <div className="glass-panel analysis-panel" style={{ padding: '1.5rem', borderLeft: '4px solid ' + (result.frequency_analysis.spectral_anomaly_score > 0.6 ? 'var(--danger)' : result.frequency_analysis.spectral_anomaly_score > 0.4 ? 'var(--warning)' : 'var(--success)') }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} color="var(--primary)" /> Spectral & Frequency Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Spectral Anomaly</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: result.frequency_analysis.spectral_anomaly_score > 0.6 ? 'var(--danger)' : 'var(--success)' }}>
                  {(result.frequency_analysis.spectral_anomaly_score * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Higher = Likely Synthetic</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High-Freq Energy Ratio</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.frequency_analysis.high_freq_energy_ratio.toExponential(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Expected: {'>'} 1e-3 for real photos</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RGB Cross-Channel Variance</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: result.frequency_analysis.channel_variance > 0.01 ? 'var(--warning)' : 'var(--text-primary)' }}>
                  {result.frequency_analysis.channel_variance < 0.0001 ? result.frequency_analysis.channel_variance.toExponential(2) : result.frequency_analysis.channel_variance.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>High variance = GAN artifact</div>
              </div>
            </div>
          </div>

          {/* Beginner-Friendly Visualizations Grid */}
          <div className="analysis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(234,88,12,0.12)' }}><Camera size={20} color="#ea580c" /></div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Switching Noise (SWN) <span style={{fontSize: '0.7rem', background: 'var(--success)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: '#000'}}>Beginner Friendly</span></div>
                    <div className="panel-subtitle">Zero-crossing artifact detector mapped onto original image</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.swn} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.swn_noise_path}`)}
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                >
                  <img
                    src={result.frequency_analysis.swn_noise_path ? `${API_BASE}/${result.frequency_analysis.swn_noise_path}` : '/gradcam-mockup.png'}
                    alt="Switching Noise SWN"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div className="heatmap-legend" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>The easiest way to spot fakes: pure AI generation noise and deepfake splicing seams light up brightly here, directly superimposed on the original video frame.</span>
              </div>
            </div>
            
            <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>🧱</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">8x8 Block DCT High-Frequency Map <span style={{fontSize: '0.7rem', background: 'var(--success)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: '#000'}}>Beginner Friendly</span></div>
                    <div className="panel-subtitle">Localized JPEG grid anomaly detection mapped onto original image</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.block_dct} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.block_dct_path}`)}
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.block_dct_path}`}
                    alt="Block DCT Artifacts"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div className="heatmap-legend" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>Visualizes the high-frequency energy of every 8x8 block. Artificial face splicing often disrupts the natural grid, creating a glowing mismatch against the background.</span>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Advanced Mathematical Spectra
          </h4>

          {/* Visualizations Grid */}
          <div className="analysis-grid">
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(34,211,238,0.12)' }}><Activity size={20} color="var(--primary)" /></div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">FFT Magnitude Spectrum</div>
                    <div className="panel-subtitle">Frequency domain representation</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.fft} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.fft_magnitude_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.fft_magnitude_path}`}
                    alt="FFT Magnitude Spectrum"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Bright center = low-freq energy. Outer ring = high-freq detail.
              </div>
            </div>

            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(129,140,248,0.12)' }}>🌊</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">DCT Spectrum</div>
                    <div className="panel-subtitle">Discrete Cosine Transform coefficients</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.dct} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.dct_spectrum_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.dct_spectrum_path}`}
                    alt="DCT Spectrum"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Top-left = lowest freq. Bottom-right = highest freq.
              </div>
            </div>
          </div>
          


          <div className="analysis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(236,72,153,0.12)' }}>⚡</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">High-Pass Filter</div>
                    <div className="panel-subtitle">Blending artifacts</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.high_pass} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.high_pass_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.high_pass_path}`}
                    alt="High Pass Filter"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
            </div>

            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(52,211,153,0.12)' }}>🌀</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Phase Spectrum</div>
                    <div className="panel-subtitle">Structural phase discontinuities</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.phase} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.phase_spectrum_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.phase_spectrum_path}`}
                    alt="Phase Spectrum"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
            </div>


          </div>

          {/* PCA & Advanced Visualizations */}
          {result.frequency_analysis.pca_spectrum_path && (
            <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {/* PCA Panel */}
              <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.12)' }}>🔬</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="panel-title">PCA Spectral Component</div>
                      <div className="panel-subtitle">Hidden periodic artifacts (PC3)</div>
                    </div>
                    {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.pca} />}
                  </div>
                </div>
                <div className="heatmap-container" style={{ flex: 1 }}>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.pca_spectrum_path}`)}
                  >
                    <img
                      src={`${API_BASE}/${result.frequency_analysis.pca_spectrum_path}`}
                      alt="PCA Spectrum"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>3rd Principal Component — reveals GAN residuals</div>
                </div>
              </div>

              {/* Cepstrum Panel */}
              <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>📡</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="panel-title">Cepstrum Echoes</div>
                      <div className="panel-subtitle">Detects resizing and rotation</div>
                    </div>
                    {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.cepstrum} />}
                  </div>
                </div>
                <div className="heatmap-container" style={{ flex: 1 }}>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => {
                      if (result.frequency_analysis.cepstrum_path) {
                        setZoomedImage(`${API_BASE}/${result.frequency_analysis.cepstrum_path}`);
                      }
                    }}
                  >
                    {result.frequency_analysis.cepstrum_path ? (
                      <img
                        src={`${API_BASE}/${result.frequency_analysis.cepstrum_path}`}
                        alt="Cepstrum Analysis"
                        className="heatmap-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        <p>Visualization unavailable</p>
                      </div>
                    )}
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bright spikes indicate synthetic resampling</div>
                </div>
              </div>

              {/* DWT Panel */}
              <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>🌊</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="panel-title">DWT 4-Band Decomposition</div>
                      <div className="panel-subtitle">Wavelet (LL, LH, HL, HH) extraction</div>
                    </div>
                    {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.dwt} />}
                  </div>
                </div>
                <div className="heatmap-container" style={{ flex: 1 }}>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.dwt_diagonal_path}`)}
                  >
                    <img
                      src={result.frequency_analysis.dwt_diagonal_path ? `${API_BASE}/${result.frequency_analysis.dwt_diagonal_path}` : '/gradcam-mockup.png'}
                      alt="DWT Analysis"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analyzes localized HH diagonal high-frequencies</div>
                </div>
              </div>
              
              {/* Advanced Metrics Table */}
              <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1' }}>
                <div style={{ padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Advanced Raw Metrics
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>High-Freq Energy Ratio</td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                          {(result.frequency_analysis.high_freq_energy_ratio * 100).toFixed(4)}%
                        </td>
                      </tr>
                      {result.frequency_analysis.channel_hf_ratios && (
                        <>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>R / G / B HF Ratios</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                              <span style={{ color: '#f87171' }}>{(result.frequency_analysis.channel_hf_ratios[0] * 100).toFixed(3)}%</span>{' / '}
                              <span style={{ color: '#4ade80' }}>{(result.frequency_analysis.channel_hf_ratios[1] * 100).toFixed(3)}%</span>{' / '}
                              <span style={{ color: '#60a5fa' }}>{(result.frequency_analysis.channel_hf_ratios[2] * 100).toFixed(3)}%</span>
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Cross-Channel Variance</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: result.frequency_analysis.channel_variance > 0.01 ? 'var(--danger)' : 'var(--success)' }}>
                              {result.frequency_analysis.channel_variance?.toFixed(6) || 'N/A'}
                            </td>
                          </tr>
                        </>
                      )}
                      {result.frequency_analysis.pc3_variance_ratio !== undefined && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>PC3 Variance Ratio</td>
                          <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                            {(result.frequency_analysis.pc3_variance_ratio * 100).toFixed(3)}%
                          </td>
                        </tr>
                      )}
                      {result.frequency_analysis.block_variance !== undefined && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Block Variance</td>
                          <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: result.frequency_analysis.block_variance > 5000 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {result.frequency_analysis.block_variance.toFixed(2)}
                          </td>
                        </tr>
                      )}
                      {result.frequency_analysis.phase_variance !== undefined && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Phase Variance</td>
                          <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: result.frequency_analysis.phase_variance < 0.5 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {result.frequency_analysis.phase_variance.toFixed(4)}
                          </td>
                        </tr>
                      )}
                      {result.frequency_analysis.cepstrum_var !== undefined && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Cepstrum Variance</td>
                          <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: result.frequency_analysis.cepstrum_var > 0.05 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {result.frequency_analysis.cepstrum_var.toFixed(6)}
                          </td>
                        </tr>
                      )}
                      {result.frequency_analysis.dwt_var !== undefined && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>DWT Variance</td>
                          <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: result.frequency_analysis.dwt_var < 5.0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                            {result.frequency_analysis.dwt_var.toFixed(4)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Spectral Anomaly Score</td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: getScoreColor(result.frequency_analysis.spectral_anomaly_score) }}>
                          {(result.frequency_analysis.spectral_anomaly_score * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== CFA TAB ========== */}
      {activeTab === 'cfa' && result.cfa_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="info-callout">
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--primary)" /></div>
            <div className="info-callout-content">
              <h4>Color Filter Array (CFA) Forensics</h4>
              <p>
                Real digital cameras capture images through a microscopic "Bayer filter" grid, leaving behind a subtle mathematical signature (CFA demosaicing artifacts) across the entire photo. Purely AI-generated images lack this grid entirely, and face-swaps have a disrupted grid on the face compared to the background.
              </p>
            </div>
          </div>

          <div className="glass-panel analysis-panel">
            <div className="panel-header">
              <div className="panel-icon shap"><ScanSearch size={20} color="var(--primary)" /></div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="panel-title">Bayer Filter Noise Map</div>
                  <div className="panel-subtitle">Highlighting underlying camera hardware signatures</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(result.cfa_analysis.cfa_score) }}>
                  {(result.cfa_analysis.cfa_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="heatmap-container" style={{ minHeight: '300px' }}>
              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(`${API_BASE}/${result.cfa_analysis.cfa_map_path}`)}
              >
                <img
                  src={`${API_BASE}/${result.cfa_analysis.cfa_map_path}`}
                  alt="CFA Heatmap"
                  className="heatmap-image"
                  style={{ maxHeight: '400px' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="zoom-overlay"><ZoomIn size={32} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CORNEAL OPTICS TAB ========== */}
      {activeTab === 'corneal' && result.corneal_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="info-callout">
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--info)" /></div>
            <div className="info-callout-content">
              <h4>Corneal Specular Highlights</h4>
              <p>
                A person's eyes act as spherical mirrors. In a real, unedited photo, the reflection of light sources (specular highlights) must be geometrically consistent across both eyes. Generative AI models struggle with 3D physical consistency and often render mismatched reflections in the left and right eyes.
              </p>
            </div>
          </div>

          <div className="glass-panel analysis-panel">
            <div className="panel-header">
              <div className="panel-icon shap"><Focus size={20} color="var(--info)" /></div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="panel-title">Eye Reflection Consistency Map</div>
                  <div className="panel-subtitle">Comparing left vs right eye lighting</div>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: getScoreColor(result.corneal_analysis.corneal_score) }}>
                  {(result.corneal_analysis.corneal_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="heatmap-container" style={{ minHeight: '200px' }}>
              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(`${API_BASE}/${result.corneal_analysis.corneal_map_path}`)}
              >
                <img
                  src={`${API_BASE}/${result.corneal_analysis.corneal_map_path}`}
                  alt="Corneal Highlights"
                  className="heatmap-image"
                  style={{ maxHeight: '250px' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="zoom-overlay"><ZoomIn size={32} /></div>
              </div>
            </div>
            
            {result.corneal_analysis.iou !== undefined && (
              <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="metric-box">
                  <div className="metric-label">Highlight IoU</div>
                  <div className="metric-value">{(result.corneal_analysis.iou * 100).toFixed(1)}%</div>
                  <div className="metric-desc">Intersection over union of bright spots</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Structural Similarity</div>
                  <div className="metric-value">{(result.corneal_analysis.ssim * 100).toFixed(1)}%</div>
                  <div className="metric-desc">SSIM between left and right mask</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== ELA TAB ========== */}
      {activeTab === 'ela' && result.ela_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Info Callout */}
          <div className="info-callout">
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How Error Level Analysis (ELA) Works</h4>
              <p style={{ marginBottom: showFullElaInfo ? '1rem' : '0' }}>
                Error Level Analysis mathematically exposes areas of an image that have been saved at different JPEG compression levels. Because JPEGs compress the entire image uniformly, any spliced or AI-generated regions that were added later will compress differently than the original background.
              </p>
              
              {showFullElaInfo && (
                <>
                  <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0 0 1rem 0' }}>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Standard ELA Variance:</strong> We look for regions that "light up" brightly in the difference map. If a face lights up significantly brighter than the background, it indicates the face has undergone a different number of JPEG saves than the body—a classic sign of face-swapping.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Edge-Aware Smooth Anomaly:</strong> Natural images always show high ELA around sharp edges. However, if ELA lights up brightly in <em>smooth</em> regions (like cheeks or walls), it is a massive red flag indicating synthetic blending or GAN generation.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>JPEG Ghosting:</strong> We analyze the image across a stack of multiple quality levels (50% to 95%). Spliced regions have different compression histories, meaning they "bottom out" (have minimum variance) at different qualities than the background, leaving a visible "ghost".
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>HSV Color Space ELA:</strong> We run compression analysis specifically on the Saturation color channel. Deepfakes often struggle with microscopic chrominance blending at the splicing boundaries, which this map isolates perfectly.
                    </li>
                  </ul>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <em>What to look for: Ignore thin bright lines around sharp objects. Look for solid bright glowing patches on faces, skin, or areas that look like they were "painted" or blurred out.</em>
                  </p>
                </>
              )}
              
              <button 
                onClick={() => setShowFullElaInfo(!showFullElaInfo)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-color)',
                  cursor: 'pointer', padding: 0, marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}
              >
                {showFullElaInfo ? <>Show Less <ChevronUp size={14} /></> : <>Read More Detailed Breakdown <ChevronDown size={14} /></>}
              </button>
            </div>
          </div>

          <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {/* Standard ELA Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(251,113,133,0.12)' }}><Search size={20} color="#fb7185" /></div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Standard ELA Variance</div>
                    <div className="panel-subtitle">Amplified compression difference</div>
                  </div>
                  {result.ela_analysis?.verdicts && <VerdictBadge verdict={result.ela_analysis.verdicts.standard} />}
                </div>
              </div>
              <div className="heatmap-container" style={{ flex: 1 }}>
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.ela_image_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.ela_analysis.ela_image_path}`}
                    alt="ELA Analysis"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>White patches indicate high compression difference</div>
              </div>
            </div>
            
            {/* JPEG Ghosting Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.12)' }}>👻</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">JPEG Ghosting Map</div>
                    <div className="panel-subtitle">Multi-quality compression history</div>
                  </div>
                  {result.ela_analysis?.verdicts && <VerdictBadge verdict={result.ela_analysis.verdicts.ghosting} />}
                </div>
              </div>
              <div className="heatmap-container" style={{ flex: 1 }}>
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.ghosting_path}`)}
                >
                  <img
                    src={result.ela_analysis.ghosting_path ? `${API_BASE}/${result.ela_analysis.ghosting_path}` : '/gradcam-mockup.png'}
                    alt="JPEG Ghosting"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highlights spliced regions with different JPEG origins</div>
              </div>
            </div>

            {/* HSV ELA Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(59,130,246,0.12)' }}><Palette size={20} color="#3b82f6" /></div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">HSV Saturation ELA</div>
                    <div className="panel-subtitle">Chrominance blending anomalies</div>
                  </div>
                  {result.ela_analysis?.verdicts && <VerdictBadge verdict={result.ela_analysis.verdicts.hsv} />}
                </div>
              </div>
              <div className="heatmap-container" style={{ flex: 1 }}>
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.hsv_ela_path}`)}
                >
                  <img
                    src={result.ela_analysis.hsv_ela_path ? `${API_BASE}/${result.ela_analysis.hsv_ela_path}` : '/gradcam-mockup.png'}
                    alt="HSV ELA"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Exposes unnatural deepfake color transitions</div>
              </div>
            </div>

            {/* Advanced Metrics Table */}
            <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1' }}>
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Advanced Raw Metrics
                  </h4>
                  {result.ela_analysis?.verdicts && <VerdictBadge verdict={result.ela_analysis.verdicts.smooth} />}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Ensemble ELA Score</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: getScoreColor(result.ela_score) }}>
                        {(result.ela_score * 100).toFixed(2)}%
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Base ELA Variance</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                        {result.ela_analysis.ela_base_variance !== undefined ? (result.ela_analysis.ela_base_variance * 100).toFixed(2) + '%' : 'N/A'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Smooth Region Anomaly</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: result.ela_analysis.ela_smooth_anomaly > 0.4 ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {result.ela_analysis.ela_smooth_anomaly !== undefined ? (result.ela_analysis.ela_smooth_anomaly * 100).toFixed(2) + '%' : 'N/A'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>JPEG Ghosting Variance</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600, color: result.ela_analysis.ghost_variance > 10.0 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {result.ela_analysis.ghost_variance !== undefined ? result.ela_analysis.ghost_variance.toFixed(2) : 'N/A'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>HSV Saturation Variance</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                        {result.ela_analysis.hsv_variance !== undefined ? result.ela_analysis.hsv_variance.toFixed(2) : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>AI Interpretation</td>
                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontSize: '0.8rem', lineHeight: '1.3', maxWidth: '400px' }}>
                        {result.ela_analysis.ela_interpretation}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== FACE GEOMETRY TAB ========== */}
      {activeTab === 'geometry' && result.face_geometry && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon" style={{ background: 'rgba(52,211,153,0.12)' }}><Frame size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Facial Geometry & Texture Analysis</div>
              <div className="panel-subtitle">Biological proportion mapping and anomaly detection</div>
            </div>
          </div>
          
          {/* Info Callout */}
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How Facial Geometry Analysis Works</h4>
              <p style={{ marginBottom: showFullGeometryInfo ? '1rem' : '0' }}>
                Facial Geometry Analysis maps the exact 3D positioning of a face using deep neural networks to extract microscopic landmarks. While Deepfakes have gotten excellent at generating photorealistic skin, they often make critical mistakes in <strong>biological proportions, symmetry, and depth</strong>.
              </p>
              
              {showFullGeometryInfo && (
                <>
                  <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0 0 1rem 0' }}>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Facial Golden Ratio:</strong> New feature! We measure the vertical proportions of the face (Distance from eyes-to-nose vs nose-to-mouth). Human faces naturally align closely with the mathematical Golden Ratio (~1.618). GAN-generated faces often hallucinate these distances, resulting in unnatural ratios.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Interocular Proportion:</strong> We compare the width of the mouth to the distance between the eyes. Deepfakes frequently paste mouths that are slightly too wide or eyes that are slightly too close together.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Texture & Noise Consistency:</strong> If a face was swapped onto a real body, the synthetic face will have a completely different microscopic camera noise signature (PRNU) and texture density than the surrounding forehead or neck. We mathematically compare the inside of the face to its outer boundary.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Symmetry Anomaly Heatmap:</strong> Artificial GAN generation often introduces subtle asymmetric flaws (like one eye being rendered slightly differently than the other). We generate a full-face structural difference map by mirroring the facial features and highlighting mathematical asymmetries.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Texture Variance Map:</strong> Deepfakes tend to blur or over-smooth the skin texture. This map isolates and measures the high-frequency textural variance of the skin. Fake faces appear glowing white (over-smoothed) or pitch black (unnaturally sharp) compared to natural skin.
                    </li>
                  </ul>
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <em>What to look for: The visualization below shows the exact landmarks we extract to measure these biological inconsistencies.</em>
                  </p>
                </>
              )}
              
              <button 
                onClick={() => setShowFullGeometryInfo(!showFullGeometryInfo)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-color)',
                  cursor: 'pointer', padding: 0, marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600,
                  display: 'inline-block'
                }}
              >
                {showFullGeometryInfo ? 'Show Less <ChevronUp size={14} />' : 'Read More Detailed Breakdown <ChevronDown size={14} />'}
              </button>
            </div>
          </div>

          <div className="analysis-grid">
            {/* LEFT COLUMN: IMAGES */}
            <div className="image-container" style={{ flex: '1.5', padding: '0 1rem 1rem 1rem' }}>
              {result.face_geometry.face_detected ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {result.face_geometry.landmark_visualization_path && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <img
                        src={`${API_BASE}/${result.face_geometry.landmark_visualization_path}`}
                        alt="Face Landmarks"
                        className="result-img"
                        style={{ height: '280px', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}
                      />
                      <div className="image-caption">Constellation Wireframe</div>
                    </div>
                  )}
                  {result.face_geometry.symmetry_map_path && (
                    <div>
                      <img
                        src={`${API_BASE}/${result.face_geometry.symmetry_map_path}`}
                        alt="Facial Symmetry Map"
                        className="result-img"
                        style={{ height: '200px', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}
                      />
                      <div className="image-caption">Symmetry Anomaly Heatmap</div>
                    </div>
                  )}
                  {result.face_geometry.texture_map_path && (
                    <div>
                      <img
                        src={`${API_BASE}/${result.face_geometry.texture_map_path}`}
                        alt="Facial Texture Map"
                        className="result-img"
                        style={{ height: '200px', objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}
                      />
                      <div className="image-caption">Texture / Edge Gradient Heatmap</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p>⚠️ No face detected in the analyzed frame.</p>
                </div>
              )}
            </div>
            
            {/* RIGHT COLUMN: METRICS */}
            <div className="metrics-container">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Geometry & Texture Metrics
              </h4>
              
              {result.face_geometry.face_detected ? (
                <>
                  <div style={{ padding: '1rem', background: 'rgba(52,211,153,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52,211,153,0.1)', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {result.face_geometry.face_geometry_interpretation}
                    </p>
                  </div>
                  
                  {result.face_geometry.temporal_history && result.face_geometry.temporal_history.golden_ratio.length > 1 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Temporal Jitter Visualization</h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Observe how facial ratios fluctuate across video frames.</p>
                      <SimpleSparkline 
                        data={result.face_geometry.temporal_history.golden_ratio} 
                        color="var(--primary)" 
                        label="Biological Golden Ratio (Target ~1.618)" 
                        ideal={1.618} 
                      />
                      <SimpleSparkline 
                        data={result.face_geometry.temporal_history.interocular_ratio} 
                        color="var(--secondary)" 
                        label="Interocular Proportion" 
                      />
                    </div>
                  )}

                  <details className="expert-accordion">
                    <summary style={{ color: 'var(--text-secondary)', fontWeight: 600, paddingBottom: '0.5rem' }}>View Advanced Expert Metrics</summary>
                    <table className="meta-table" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <tbody>
                        <tr>
                          <td>Geometry Anomaly Score</td>
                          <td style={{ color: getScoreColor(result.geometry_anomaly_score), fontWeight: 'bold' }}>
                            {(result.geometry_anomaly_score * 100).toFixed(1)}%
                          </td>
                        </tr>
                        {result.face_geometry.temporal_jitter_score != null && (
                          <tr>
                            <td>Temporal Geometric Jitter</td>
                            <td style={{ color: result.face_geometry.temporal_jitter_score > 0.4 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 'bold' }}>
                              {(result.face_geometry.temporal_jitter_score * 100).toFixed(1)}%
                            </td>
                          </tr>
                        )}
                        {result.face_geometry.golden_ratio != null && (
                          <tr>
                            <td>Biological Golden Ratio</td>
                            <td style={{ color: Math.abs(result.face_geometry.golden_ratio - 1.618) > 0.4 ? 'var(--danger)' : 'var(--text-primary)' }}>
                              {result.face_geometry.golden_ratio.toFixed(3)}
                              <span style={{ fontSize: '0.7em', marginLeft: '4px', color: 'var(--text-muted)' }}>(Ideal ~1.618)</span>
                            </td>
                          </tr>
                        )}
                        {result.face_geometry.interocular_ratio != null && (
                          <tr>
                            <td>Interocular Proportion</td>
                            <td>
                              {result.face_geometry.interocular_ratio.toFixed(3)}
                            </td>
                          </tr>
                        )}
                        {result.face_geometry.face_aspect_ratio != null && (
                          <tr>
                            <td>Face Aspect Ratio</td>
                            <td>
                              {result.face_geometry.face_aspect_ratio.toFixed(3)}
                            </td>
                          </tr>
                        )}
                        {result.face_geometry.nose_mouth_ratio != null && (
                          <tr>
                            <td>Nose-Mouth Ratio</td>
                            <td>
                              {result.face_geometry.nose_mouth_ratio.toFixed(3)}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td>Facial Symmetry Score</td>
                          <td>{(result.face_geometry.symmetry_score * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td>Texture Consistency</td>
                          <td>{(result.face_geometry.texture_consistency * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td>Noise Consistency</td>
                          <td>{(result.face_geometry.noise_consistency * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td>Detection Confidence</td>
                          <td>{(result.face_geometry.detection_confidence * 100).toFixed(1)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </details>
                </>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Metrics unavailable</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== NOISE TAB ========== */}
      {activeTab === 'noise' && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon freq"><Camera size={20} color="var(--text-muted)" /></div>
            <div>
              <div className="panel-title">Sensor Noise (PRNU) Consistency</div>
              <div className="panel-subtitle">Analysis of invisible camera sensor noise patterns</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How PRNU Sensor Noise Analysis Works</h4>
              <p>
                Every physical camera sensor has microscopic manufacturing imperfections that leave a unique, invisible "noise print" (Photo Response Non-Uniformity or PRNU) on every photo it takes. Our engine uses an advanced <strong>Non-Local Means (NLM)</strong> algorithm to filter out the image's structural details and isolate this raw noise print.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>What to look for:</strong> Real images have a consistent noise pattern across the entire image. Deepfakes generated by AI (which don't have physical camera sensors) lack this physical signature. In the amplified noise map, synthetic AI faces will appear completely smooth or have drastically different variance compared to the real background!
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Spatial Rich Model (SRM) Filter:</strong> We also apply a highly aggressive mathematical high-pass convolution kernel (SRM) to the image. This filter completely strips away image content (skin, lighting) and violently exposes low-level pixel manipulation, splicing lines, and blending boundaries commonly left behind when a deepfake face is merged into a real video frame.
              </p>
            </div>
          </div>

          <div className="analysis-grid">
            <div className="image-container" style={{ flex: '1.5' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {result.noise_analysis?.denoised_map_path && (
                  <div>
                    <img src={`${API_BASE}/${result.noise_analysis.denoised_map_path}`} alt="Denoised Image" className="result-img" style={{ height: '240px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">Step 1: Edge-Preserved NLM Denoising</div>
                  </div>
                )}
                {result.noise_analysis?.noise_map_path && (
                  <div>
                    <img src={`${API_BASE}/${result.noise_analysis.noise_map_path}`} alt="Noise Residual Map" className="result-img" style={{ height: '240px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">Step 2: Amplified PRNU Noise Print</div>
                  </div>
                )}
              </div>
              
              {result.noise_analysis?.srm_map_path && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                  <div>
                    <img src={`${API_BASE}/${result.noise_analysis.srm_map_path}`} alt="SRM Noise Filter" className="result-img" style={{ height: '240px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption" style={{ background: 'rgba(236,72,153,0.1)' }}>Step 3: Spatial Rich Model (SRM) High-Pass Filter — Reveals manipulation boundaries</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="metrics-container">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Noise Extraction Metrics
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Noise Variance</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {result.noise_analysis?.noise_variance !== undefined ? result.noise_analysis.noise_variance.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Anomaly Score</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: getScoreColor(result.noise_score) }}>
                      {(result.noise_score * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  A very low noise variance typically indicates synthetic smoothing by a generative AI model.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== COLOR TAB ========== */}
      {activeTab === 'color' && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon ela"><Palette size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Chrominance (Color Space) Analysis</div>
              <div className="panel-subtitle">Detection of GAN color bleeding and synthetic skin tones</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How Chrominance Analysis Works</h4>
              <p>
                Digital images are stored using the <strong>YCbCr color space</strong>: 'Y' is brightness, 'Cb' is blue-difference, and 'Cr' is red-difference. While Deepfake AI models are incredibly good at faking the brightness (Y) to make a face look structurally real, they notoriously struggle to replicate the complex micro-coloration of real human skin caused by blood flow and subsurface light scattering.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>What to look for:</strong> We isolate the invisible 'Cb' and 'Cr' channels. Real human skin has a rich, textured variance in these color channels. Fake faces often appear completely flat, heavily desaturated, or have color "bleeding" out of the facial boundaries!
              </p>
            </div>
          </div>

          <div className="analysis-grid">
            <div className="image-container" style={{ flex: '1.5' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {result.color_analysis?.cb_map_path ? (
                  <div>
                    <img src={`${API_BASE}/${result.color_analysis.cb_map_path}`} alt="Cb Channel" className="result-img" style={{ height: '180px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">YCbCr: Blue-Diff (Cb)</div>
                  </div>
                ) : null}
                {result.color_analysis?.cr_map_path ? (
                  <div>
                    <img src={`${API_BASE}/${result.color_analysis.cr_map_path}`} alt="Cr Channel" className="result-img" style={{ height: '180px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">YCbCr: Red-Diff (Cr)</div>
                  </div>
                ) : null}
                {result.color_analysis?.s_map_path ? (
                  <div>
                    <img src={`${API_BASE}/${result.color_analysis.s_map_path}`} alt="Saturation Channel" className="result-img" style={{ height: '180px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">HSV: Saturation Variance</div>
                  </div>
                ) : null}
                {result.color_analysis?.a_map_path ? (
                  <div>
                    <img src={`${API_BASE}/${result.color_analysis.a_map_path}`} alt="a* Channel" className="result-img" style={{ height: '180px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
                    <div className="image-caption">LAB: a* Channel (Blood flow)</div>
                  </div>
                ) : null}
              </div>
            </div>
            
            <div className="metrics-container">
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Color Variance Metrics
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Cb Variance</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {result.color_analysis?.cb_variance !== undefined ? result.color_analysis.cb_variance.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Cr Variance (Red-Diff)</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {result.color_analysis?.cr_variance !== undefined ? result.color_analysis.cr_variance.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>HSV Saturation Variance</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {result.color_analysis?.s_variance !== undefined ? result.color_analysis.s_variance.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>LAB a* Variance (Blood flow)</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 600 }}>
                      {result.color_analysis?.a_variance !== undefined ? result.color_analysis.a_variance.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>Anomaly Score</td>
                    <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 700, color: getScoreColor(result.color_score) }}>
                      {(result.color_score * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========== AUDIO SYNC TAB ========== */}
      {activeTab === 'audio' && isVideo && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon" style={{ background: 'rgba(52,211,153,0.12)' }}><Volume2 size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Audio-Visual Synchronization (SyncNet Heuristic)</div>
              <div className="panel-subtitle">Mathematical correlation between lip movement and audio energy</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How Sync Analysis Works</h4>
              <p>
                When humans speak, the physical movement of the lips perfectly correlates with the energy envelope of the audio produced. Deepfakes generated by LipSync AI models (like Wav2Lip) often fail to maintain this perfect synchronization, resulting in micro-desynchronizations or completely uncorrelated audio tracks.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Explainable Visualizer:</strong> We extract the Mouth Aspect Ratio (MAR) across the video frames and mathematically correlate it with the RMS energy of the audio track. The plot below visualizes both signals. A high correlation (signals matching) means the video is likely authentic. A low or negative correlation strongly indicates synthetic audio or facial manipulation!
              </p>
            </div>
          </div>

          <div className="analysis-grid" style={{ gridTemplateColumns: '1fr' }}>
            {result.sync_analysis?.sync_plot_path ? (
              <div style={{ textAlign: 'center' }}>

                <img 
                  src={`${API_BASE}/${result.sync_analysis.sync_plot_path}`} 
                  alt="Audio-Visual Sync Plot" 
                  className="result-img" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                  <div title="Pearson Correlation between visually extracted Mouth Aspect Ratio and Audio MFCC (Phonetic Shape).">
                    Pearson Correlation: <strong style={{ color: getScoreColor(result.sync_score) }}>{result.sync_analysis.correlation?.toFixed(3) || 'N/A'}</strong>
                  </div>
                  {result.sync_analysis.lse_c !== undefined && (
                    <div title="Lip-Sync Expert Confidence (LSE-C): Confidence score of the audio-visual sync. Higher is better (Typical Real > 7).">
                      LSE-C (Confidence): <strong style={{ color: result.sync_analysis.lse_c > 6 ? 'var(--success)' : 'var(--danger)' }}>{result.sync_analysis.lse_c?.toFixed(2)}</strong>
                    </div>
                  )}
                  {result.sync_analysis.lse_d !== undefined && (
                    <div title="Lip-Sync Expert Distance (LSE-D): Feature distance error between lip movements and audio. Lower is better (Typical Real < 6).">
                      LSE-D (Distance): <strong style={{ color: result.sync_analysis.lse_d < 7 ? 'var(--success)' : 'var(--danger)' }}>{result.sync_analysis.lse_d?.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                {result.sync_analysis?.error || 'Audio Sync visualization unavailable.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== RPPG TAB ========== */}
      {activeTab === 'rppg' && result.rppg_analysis && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon"><Activity size={20} color={result.rppg_analysis.has_pulse ? "var(--success)" : "var(--danger)"} /></div>
            <div>
              <div className="panel-title">Biological Signal (rPPG)</div>
              <div className="panel-subtitle">Heartbeat detection via micro-color changes</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--primary)" /></div>
            <div className="info-callout-content">
              <h4>How Remote Photoplethysmography (rPPG) Works</h4>
              <p>
                Every time your heart beats, a pulse of blood flows through your face, causing microscopic fluctuations in skin color (specifically absorbing green light). Real videos of humans capture these invisible color changes. 
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                AI video generators like Sora or DeepFaceLab completely fail to synthesize a biologically accurate, continuous heartbeat hidden within the pixel data! By applying Fast Fourier Transforms (FFT) to the spatial color averages over time, we can detect if a physiological pulse exists.
              </p>
            </div>
          </div>
          
          <div className="analysis-grid">
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Detected Heart Rate</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: result.rppg_analysis.has_pulse ? 'var(--success)' : 'var(--danger)' }}>
                {result.rppg_analysis.has_pulse ? `${result.rppg_analysis.heart_rate} BPM` : 'None'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {result.rppg_analysis.has_pulse ? 'Human Pulse Detected' : 'Static/Synthetic Face'}
              </div>
            </div>
            
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Signal-to-Noise Ratio</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>
                {result.rppg_analysis.snr}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Peak Prominence
              </div>
            </div>
          </div>

          {result.rppg_analysis.signal_plot_path && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <img 
                src={`${API_BASE}/${result.rppg_analysis.signal_plot_path}`} 
                alt="rPPG Signal Spectrum" 
                className="result-img" 
                style={{ width: '100%', maxWidth: '600px', borderRadius: '8px' }} 
              />
            </div>
          )}
          
          {result.rppg_analysis.warnings && result.rppg_analysis.warnings.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)' }}>
              {result.rppg_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>• {w}</div>)}
            </div>
          )}
        </div>
      )}

      {/* ========== LIGHTING TAB ========== */}
      {activeTab === 'lighting' && result.lighting_analysis && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Illumination Estimation</div>
              <div className="panel-subtitle">Detecting spliced lighting inconsistencies</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--primary)" /></div>
            <div className="info-callout-content">
              <h4>How 2D Illumination Estimation Works</h4>
              <p>
                When a fake face is spliced onto a real body (like in many standard deepfakes), the lighting environment of the spliced face almost never perfectly matches the lighting of the background scene.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                Based on seminal digital forensics research, we extract the 2D surface normals and pixel intensity gradients of both the Face and the Background independently. By calculating the dominant directional vector of the light source for both regions, we can measure the divergence angle. A large angle strongly indicates a lighting mismatch caused by image splicing!
              </p>
            </div>
          </div>
          
          <div className="analysis-grid">
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Divergence Angle</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: result.lighting_analysis.angle_difference > 45 ? 'var(--danger)' : 'var(--success)' }}>
                {result.lighting_analysis.angle_difference}°
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Difference between Face & BG light source
              </div>
            </div>
            
            <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Anomaly Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: getScoreColor(result.lighting_analysis.lighting_anomaly_score) }}>
                {(result.lighting_analysis.lighting_anomaly_score * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Higher = Inconsistent Lighting
              </div>
            </div>
          </div>

          {result.lighting_analysis.lighting_map_path && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <img 
                src={`${API_BASE}/${result.lighting_analysis.lighting_map_path}`} 
                alt="Lighting Direction Vectors" 
                className="result-img" 
                style={{ width: '100%', maxWidth: '500px', borderRadius: '8px' }} 
              />
              <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Arrows indicate the dominant 2D illumination direction extracted from image gradients.
              </p>
            </div>
          )}
          
          {result.lighting_analysis.warnings && result.lighting_analysis.warnings.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)' }}>
              {result.lighting_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>• {w}</div>)}
            </div>
          )}
        </div>
      )}

      {/* ========== ENSEMBLE TAB ========== */}
      {activeTab === 'features' && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><BarChart3 size={20} color="var(--success)" /></div>
            <div>
              <div className="panel-title">Multi-Modal Ensemble Breakdown</div>
              <div className="panel-subtitle">Weighted combination of all detection techniques</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--primary)" /></div>
            <div className="info-callout-content">
              <h4>How the Ensemble Works</h4>
              <p>
                No single forensic technique is perfect. Deepfakes can easily fool a neural network by adding artificial noise, or trick a geometric analyzer by keeping the original face shape. To solve this, our engine runs a <strong>Multi-Modal Ensemble</strong>, analyzing the image across 7 radically different physical and statistical domains. 
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                We use an <strong>Image Quality Assessment (IQA)</strong> orchestrator to dynamically weight these tests. If the video is highly compressed or blurry from a webcam, the engine mathematically lowers its trust in pixel-perfect physical sensors (like Noise and Color) and increases its reliance on AI and geometric landmarks!
              </p>
            </div>
          </div>
          <div className="analysis-grid" style={{ marginBottom: 0 }}>
            <div>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Detector Scores
              </h4>
              {[
                { label: 'EfficientNet-B4', score: result.nn_score, weight: result.weights?.nn_score },
                { label: 'Frequency Analysis', score: result.spectral_anomaly_score, weight: result.weights?.spectral_score },
                { label: 'Error Level Analysis', score: result.ela_score, weight: result.weights?.ela_score },
                { label: 'Face Geometry', score: result.geometry_anomaly_score, weight: result.weights?.geometry_anomaly },
                { label: 'Sensor Noise', score: result.noise_score, weight: result.weights?.noise_score },
                { label: 'Chrominance', score: result.color_score, weight: result.weights?.color_score },
                { label: 'Lighting', score: result.lighting_score, weight: result.weights?.lighting_score },
                ...(!isVideo ? [{ label: 'CFA Pattern', score: result.cfa_score || 0, weight: result.weights?.cfa_score }] : []),
                ...(!isVideo ? [{ label: 'Corneal Reflection', score: result.corneal_score || 0, weight: result.weights?.corneal_score }] : []),
                ...(isVideo ? [{ label: 'Eye Tracking', score: result.eye_score || 0, weight: result.weights?.eye_score }] : []),
                ...(isVideo ? [{ label: 'Optical Flow', score: result.flow_score || 0, weight: result.weights?.flow_score }] : []),
                ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Audio Sync', score: 1 - result.sync_score, weight: result.weights?.sync_score }] : []),
                ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Voice Spoofing', score: result.voice_score || 0, weight: result.weights?.voice_score }] : []),
                ...(isVideo ? [{ label: 'Pulse (rPPG)', score: result.rppg_score, weight: result.weights?.rppg_score }] : [])
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                  <div style={{ width: '45px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    {item.weight !== undefined ? `${(item.weight * 100).toFixed(1)}%` : ''}
                  </div>
                  <div style={{ width: '120px' }}>
                    <div className="progress-bar-bg" style={{ height: '4px', margin: 0 }}>
                      <div className="progress-bar-fill" style={{ width: `${item.score * 100}%`, background: getScoreColor(item.score), animation: 'none' }}></div>
                    </div>
                  </div>
                  <div style={{ width: '50px', textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: getScoreColor(item.score) }}>
                    {(item.score * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 0', marginTop: '0.5rem', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                <div style={{ flex: 1, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Ensemble Score</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getScoreColor(result.overall_score) }}>
                  {(result.overall_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', alignSelf: 'flex-start' }}>
                Deepfake Fingerprint Radar
              </h4>
              <div style={{ position: 'relative', width: 280, height: 280 }}>
                <svg width="280" height="280">
                  {/* Generate Radar dynamically */}
                  {(() => {
                    const data = [
                      { label: 'NN', score: result.nn_score },
                      { label: 'Freq', score: result.spectral_anomaly_score },
                      { label: 'ELA', score: result.ela_score },
                      { label: 'Geo', score: result.geometry_anomaly_score },
                      { label: 'Noise', score: result.noise_score },
                      { label: 'Color', score: result.color_score },
                      { label: 'Light', score: result.lighting_score },
                      ...(!isVideo ? [{ label: 'CFA', score: result.cfa_score || 0 }] : []),
                      ...(!isVideo ? [{ label: 'Corneal', score: result.corneal_score || 0 }] : []),
                      ...(isVideo ? [{ label: 'Eye', score: result.eye_score || 0 }] : []),
                      ...(isVideo ? [{ label: 'Flow', score: result.flow_score || 0 }] : []),
                      ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Sync', score: 1 - result.sync_score }] : []),
                      ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Voice', score: result.voice_score || 0 }] : []),
                      ...(isVideo ? [{ label: 'rPPG', score: result.rppg_score }] : [])
                    ];
                    const center = 140;
                    const radius = 100;
                    const sides = data.length;
                    const angleStep = (Math.PI * 2) / sides;
                    
                    const points = data.map((d, i) => {
                      const angle = i * angleStep - Math.PI / 2;
                      return `${center + Math.cos(angle) * radius * d.score},${center + Math.sin(angle) * radius * d.score}`;
                    }).join(' ');

                    const bgPoints = Array.from({ length: 5 }).map((_, level) => {
                      const r = radius * ((level + 1) / 5);
                      return data.map((_, i) => {
                        const angle = i * angleStep - Math.PI / 2;
                        return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
                      }).join(' ');
                    });

                    return (
                      <>
                        {bgPoints.map((pts, i) => (
                          <polygon key={`bg-${i}`} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        ))}
                        {data.map((_, i) => {
                          const angle = i * angleStep - Math.PI / 2;
                          return <line key={`ax-${i}`} x1={center} y1={center} x2={center + Math.cos(angle) * radius} y2={center + Math.sin(angle) * radius} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />;
                        })}
                        <polygon points={points} fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth="2" />
                        {data.map((d, i) => {
                          const angle = i * angleStep - Math.PI / 2;
                          return <circle key={`pt-${i}`} cx={center + Math.cos(angle) * radius * d.score} cy={center + Math.sin(angle) * radius * d.score} r="4" fill={getScoreColor(d.score)} />;
                        })}
                        {data.map((d, i) => {
                          const angle = i * angleStep - Math.PI / 2;
                          const x = center + Math.cos(angle) * (radius + 24);
                          const y = center + Math.sin(angle) * (radius + 24);
                          return (
                            <text key={`lbl-${i}`} x={x} y={y} fill="var(--text-muted)" fontSize="11" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
                              {d.label}
                            </text>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                A larger footprint strongly indicates AI generation.
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ========== METADATA TAB ========== */}
      {activeTab === 'meta' && (
        <div className="glass-panel analysis-panel" style={{ maxWidth: '700px', margin: '0 auto 2rem' }}>
          <div className="panel-header">
            <div className="panel-icon meta"><FileText size={20} color="var(--primary)" /></div>
            <div>
              <div className="panel-title">EXIF & File Metadata Analysis</div>
              <div className="panel-subtitle">Technical specifications and digital footprint</div>
            </div>
          </div>
          
          <div className="info-callout" style={{ marginBottom: '1.5rem' }}>
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--primary)" /></div>
            <div className="info-callout-content">
              <h4>How Metadata Analysis Works</h4>
              <p>
                Every digital file contains hidden "metadata" — data about the data. When an image is captured by a real physical camera (like an iPhone or DSLR), the camera embeds rich EXIF tags detailing the lens model, focal length, GPS location, and exposure settings.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                When images are generated by AI (Midjourney, DALL-E) or heavily edited (Photoshop), they either strip this physical metadata entirely, or leave behind specific software signatures in the file headers. This tab exposes that hidden digital footprint.
              </p>
            </div>
          </div>
          
          {result.metadata_analysis && result.metadata_analysis.warnings.length > 0 && (
            <div style={{ margin: '1rem 0 2rem 0', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: '4px' }}>
              <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ShieldAlert size={16} /> Forensic Warnings</h4>
              {result.metadata_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>• {w}</div>)}
            </div>
          )}

          <table className="meta-table">
            <tbody>
              <tr><td colSpan="2" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Basic File Properties</td></tr>
              <tr><td>File Name</td><td>{fileName || 'N/A'}</td></tr>
              <tr><td>Job ID</td><td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{jobId}</td></tr>
              <tr><td>Analysis Date</td><td>{new Date().toLocaleString()}</td></tr>
              
              {result.file_metadata && (
                <>
                  <tr><td>File Size</td><td>{(result.file_metadata.file_size_bytes / (1024*1024)).toFixed(2)} MB</td></tr>
                  <tr><td>Original Resolution</td><td>{result.file_metadata.original_resolution}</td></tr>
                  <tr><td>Audio Track</td><td>{result.file_metadata.has_audio ? 'Detected' : 'None'}</td></tr>
                </>
              )}

              {result.metadata_analysis && Object.keys(result.metadata_analysis.extracted_tags).length > 0 && (
                <>
                  <tr><td colSpan="2" style={{ paddingTop: '1.5rem', color: 'var(--secondary)', fontWeight: 'bold' }}>Extracted EXIF Tags</td></tr>
                  {Object.entries(result.metadata_analysis.extracted_tags).map(([key, val]) => (
                    <tr key={key}>
                      <td style={{ color: 'var(--text-muted)' }}>{key}</td>
                      <td style={{ color: val.toLowerCase().includes('midjourney') || val.toLowerCase().includes('photoshop') ? 'var(--danger)' : 'var(--text-primary)' }}>{val}</td>
                    </tr>
                  ))}
                </>
              )}

              <tr><td colSpan="2" style={{ paddingTop: '1.5rem', color: 'var(--primary)', fontWeight: 'bold' }}>Model Configuration</td></tr>
              <tr><td>Model Engine</td><td>EfficientNet-B4 (Contrastive SBI)</td></tr>
              <tr><td>Feature Dimension</td><td>1792-d Vector Space</td></tr>
              <tr><td>Input Resolution</td><td>380 × 380 (Cropped Face)</td></tr>
              <tr><td>XAI Interventions</td><td>GradCAM (Spatial), SHAP (Feature)</td></tr>
              <tr><td>Frames Analyzed</td><td>{result.frames_analyzed}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ========== EYE GAZE & BLINK TAB ========== */}
      {activeTab === 'eye' && result.eye_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="info-callout">
            <strong>Biological Metric: Eye & Gaze Dynamics</strong>
            Deepfakes often struggle with natural blink frequency and gaze consistency (convergence). This test analyzes the Eye Aspect Ratio (EAR) over time to flag unnatural 'lazy eye' artifacts or blinking anomalies.
          </div>
          
          <div className="analysis-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(59, 130, 246, 0.12)' }}>👁️</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Blink & Gaze Tracker</div>
                    <div className="panel-subtitle">Blink Rate: {result.eye_analysis.blink_rate_per_min} bpm | Gaze Asymmetry: {result.eye_analysis.gaze_asymmetry.toFixed(3)}</div>
                  </div>
                  <VerdictBadge verdict={result.eye_analysis.eye_anomaly_score > 0.6 ? 'Fail' : 'Pass'} />
                </div>
              </div>

              {result.eye_analysis.warnings && result.eye_analysis.warnings.length > 0 && (
                <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: '4px' }}>
                  <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Detection Warnings</h4>
                  {result.eye_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>• {w}</div>)}
                </div>
              )}

              <div className="heatmap-container" style={{ marginTop: '1rem' }}>
                <div className="zoomable-image-container" onClick={() => {
                  if (result.eye_analysis.eye_plot_path) {
                    setZoomedImage(`${API_BASE}/${result.eye_analysis.eye_plot_path}`);
                  }
                }}>
                  {result.eye_analysis.eye_plot_path ? (
                    <img
                      src={`${API_BASE}/${result.eye_analysis.eye_plot_path}`}
                      alt="Eye Tracking Plot"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                      <p>Plot unavailable</p>
                    </div>
                  )}
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== VOICE SPOOFING TAB ========== */}
      {activeTab === 'voice' && result.voice_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="info-callout">
            <strong>Audio Forensics: Voice Anti-Spoofing</strong>
            AI voice clones (vocoders) often leave high-frequency synthetic artifacts and unnatural spectral roll-offs. This test analyzes the audio frequency spectrum to detect these synthetic traces.
          </div>
          
          <div className="analysis-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(168, 85, 247, 0.12)' }}>🎙️</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Mel-Frequency Analysis</div>
                    <div className="panel-subtitle">ZCR Variance: {result.voice_analysis.zcr_variance.toFixed(5)} | HF Ratio: {result.voice_analysis.high_freq_ratio.toFixed(4)}</div>
                  </div>
                  <VerdictBadge verdict={result.voice_analysis.voice_anomaly_score > 0.6 ? 'Fail' : 'Pass'} />
                </div>
              </div>

              {result.voice_analysis.warnings && result.voice_analysis.warnings.length > 0 && (
                <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: '4px' }}>
                  <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Spoofing Warnings</h4>
                  {result.voice_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>• {w}</div>)}
                </div>
              )}

              <div className="heatmap-container" style={{ marginTop: '1rem' }}>
                <div className="zoomable-image-container" onClick={() => {
                  if (result.voice_analysis.voice_plot_path) {
                    setZoomedImage(`${API_BASE}/${result.voice_analysis.voice_plot_path}`);
                  }
                }}>
                  {result.voice_analysis.voice_plot_path ? (
                    <img
                      src={`${API_BASE}/${result.voice_analysis.voice_plot_path}`}
                      alt="Voice Spoofing Plot"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                      <p>Spectrogram unavailable</p>
                    </div>
                  )}
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== OPTICAL FLOW TAB ========== */}
      {activeTab === 'flow' && result.flow_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="info-callout">
            <strong>Temporal Consistency: Optical Flow</strong>
            When a fake face mask is pasted onto a video, its boundaries often "jitter" or flicker frame-to-frame. Dense Optical Flow tracks motion vectors to flag this blocky, unnatural movement.
          </div>
          
          <div className="analysis-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>🎞️</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Temporal Jitter Tracker</div>
                    <div className="panel-subtitle">Mean Motion Variance: {result.flow_analysis.mean_motion_variance}</div>
                  </div>
                  <VerdictBadge verdict={result.flow_analysis.flow_anomaly_score > 0.6 ? 'Fail' : 'Pass'} />
                </div>
              </div>

              {result.flow_analysis.warnings && result.flow_analysis.warnings.length > 0 && (
                <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: '4px' }}>
                  <h4 style={{ color: 'var(--danger)', marginTop: 0, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Jitter Warnings</h4>
                  {result.flow_analysis.warnings.map((w, i) => <div key={i} style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>• {w}</div>)}
                </div>
              )}

              <div className="heatmap-container" style={{ marginTop: '1rem' }}>
                <div className="zoomable-image-container" onClick={() => {
                  if (result.flow_analysis.flow_plot_path) {
                    setZoomedImage(`${API_BASE}/${result.flow_analysis.flow_plot_path}`);
                  }
                }}>
                  {result.flow_analysis.flow_plot_path ? (
                    <img
                      src={`${API_BASE}/${result.flow_analysis.flow_plot_path}`}
                      alt="Optical Flow Plot"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                      <p>Flow Plot unavailable</p>
                    </div>
                  )}
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              
              {result.flow_analysis.flow_field_path && (
                <div className="heatmap-container" style={{ marginTop: '1rem' }}>
                  <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>HSV Motion Vector Visualization</h4>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.flow_analysis.flow_field_path}`)}>
                    <img
                      src={`${API_BASE}/${result.flow_analysis.flow_field_path}`}
                      alt="Optical Flow Field"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div> {/* End Main Content */}

      {/* Fullscreen Image Modal using React Portal to escape CSS transforms */}
      {zoomedImage && createPortal(
        <div className="image-modal-overlay" onClick={(e) => {
          if (e.target.classList.contains('image-modal-overlay')) setZoomedImage(null);
        }}>
          <button className="close-modal-btn" onClick={() => setZoomedImage(null)}>
            <X size={24} />
          </button>
          <img src={zoomedImage} alt="Fullscreen View" className="image-modal-content" />
        </div>,
        document.body
      )}
    </div>
  );
};

export default ReportDashboard;
