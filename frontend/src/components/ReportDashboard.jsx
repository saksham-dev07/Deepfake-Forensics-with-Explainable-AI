import React, { useState } from 'react';
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

const ScoreRing = ({ score, label, invert = false, size = 120 }) => {
  const s = invert ? 1 - score : score;
  const color = s > 0.6 ? 'var(--danger)' : s > 0.35 ? 'var(--warning)' : 'var(--success)';
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-ring-svg">
        <circle className="score-ring-bg" cx={size/2} cy={size/2} r={radius} strokeWidth={size*0.08} />
        <circle 
          className="score-ring-progress" 
          cx={size/2} cy={size/2} r={radius} 
          strokeWidth={size*0.08} stroke={color}
          strokeDasharray={circumference} strokeDashoffset={offset} 
        />
        <text 
          x={size/2} y={size/2} 
          className="score-ring-text" 
          fontSize={size*0.22} 
          transform={`rotate(90 ${size/2} ${size/2})`}
        >
          {Math.round(score * 100)}%
        </text>
      </svg>
      {label && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>}
    </div>
  );
};

const MetricCard = ({ label, value, subValue, type = 'neutral' }) => {
  return (
    <div className={`metric-card ${type}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={value}>{value}</div>
      {subValue && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={subValue}>{subValue}</div>}
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

const TEST_DEFINITIONS = {
  features: {
    title: "Multi-Modal Ensemble",
    what_is_it: "A weighted combination of all detection techniques across multiple domains.",
    what_it_does: "Aggregates the physical, mathematical, and AI-based anomaly scores to calculate a final confidence metric.",
    how_good_is_it: "Extremely reliable because it doesn't rely on a single point of failure.",
    how_to_bypass: "Nearly impossible to bypass completely; requires defeating spatial, temporal, frequency, and biological detectors simultaneously."
  },
  visual: {
    title: "GradCAM (Gradient-weighted Class Activation Mapping)",
    what_is_it: "A visual explanation for the primary Neural Network's decision.",
    what_it_does: "Highlights the specific pixels and regions that caused the AI to classify the face as fake or real.",
    how_good_is_it: "Great for interpretability, showing exactly where blending boundaries or warping occurred.",
    how_to_bypass: "It is an interpretation tool, not a detector itself. Bypassing the underlying CNN will result in a blank or incorrect GradCAM map."
  },
  ela: {
    title: "Error Level Analysis (ELA)",
    what_is_it: "A forensic technique that identifies areas within an image that are at different compression levels.",
    what_it_does: "Resaves the image at a known error rate (e.g., 95% JPEG quality) and computes the difference. Spliced regions will stand out as they compress differently.",
    how_good_is_it: "Excellent for detecting cheap Photoshop jobs and basic splices on high-quality images.",
    how_to_bypass: "Saving the final forged image multiple times at very low quality, or applying uniform noise across the entire image, destroys ELA trails."
  },
  geometry: {
    title: "Facial Geometry Analysis",
    what_is_it: "A biometric test mapping 3D facial landmarks to check biological proportions.",
    what_it_does: "Calculates the distance between microscopic facial features and checks for unnatural mathematical asymmetries or violations of the golden ratio.",
    how_good_is_it: "Very strong against standard GAN-based Deepfakes which often struggle with geometric perspective and pupil alignment.",
    how_to_bypass: "Using high-end 3D rendering (CGI) or advanced diffusion models with strong structural priors can occasionally bypass this."
  },
  corneal: {
    title: "Corneal Optics Reflection",
    what_is_it: "An analysis of the specular highlights (reflections) on the eyes.",
    what_it_does: "Extracts the lighting environment reflected in the left and right eyes and checks for geometric and illumination consistency.",
    how_good_is_it: "Highly accurate for close-up portraits. Deepfakes almost always render mismatched reflections in the eyes.",
    how_to_bypass: "Requires generating physically accurate 3D scene lighting or manually editing the reflections in post-production."
  },
  cfa: {
    title: "Color Filter Array (CFA) Forensics",
    what_is_it: "Detection of hardware-level camera signatures.",
    what_it_does: "Extracts the microscopic Bayer filter grid left by real digital cameras. AI-generated images lack this grid entirely.",
    how_good_is_it: "Extremely robust for identifying fully AI-generated images (like Midjourney).",
    how_to_bypass: "Adding synthetic CFA noise patterns to the generated image, though very difficult to align perfectly with spliced backgrounds."
  },
  noise: {
    title: "Sensor Noise (PRNU)",
    what_is_it: "Analysis of the invisible 'noise print' unique to physical camera sensors.",
    what_it_does: "Uses Non-Local Means and high-pass filters to isolate camera noise. Deepfakes appear unnaturally smooth or have mismatched noise variance.",
    how_good_is_it: "One of the strongest forensic techniques against generative AI, which intrinsically lacks physical camera noise.",
    how_to_bypass: "Extracting the PRNU from the real background and artificially injecting it over the synthetic face."
  },
  color: {
    title: "Chrominance (Color Space)",
    what_is_it: "Analysis of non-visible color channels (YCbCr, LAB).",
    what_it_does: "Isolates color variance. Human skin has complex subsurface scattering; AI skin often appears mathematically flat or 'bleeds' color across edges.",
    how_good_is_it: "Very effective against early Deepfakes and FaceSwaps that only optimize for structural RGB similarity.",
    how_to_bypass: "Advanced color-transfer algorithms and multi-band blending can synthesize realistic chrominance."
  },
  lighting: {
    title: "2D Illumination Estimation",
    what_is_it: "Calculation of the dominant light source direction.",
    what_it_does: "Extracts surface normals to estimate the light direction of the face vs the background. High divergence indicates a spliced image.",
    how_good_is_it: "Strong against naive face swaps placed into differently lit environments.",
    how_to_bypass: "Ensuring the source face and target body were filmed under identical lighting conditions."
  },
  frequency: {
    title: "Frequency Domain Analysis",
    what_is_it: "Mathematical transformation of the image into wave frequencies (FFT/DCT).",
    what_it_does: "Reveals hidden periodic artifacts, high-frequency blurring, and GAN 'checkerboard' patterns that are invisible in the spatial domain.",
    how_good_is_it: "The gold standard for detecting CNN/GAN generated content.",
    how_to_bypass: "Applying specialized frequency-domain adversarial noise or heavy downsampling."
  },
  audio: {
    title: "Audio-Visual Synchronization",
    what_is_it: "Lip-sync error detection using 3D-CNNs.",
    what_it_does: "Measures the sub-millisecond distance between the audio phonemes and the visual mouth movements.",
    how_good_is_it: "Highly effective against Wav2Lip and audio-driven deepfakes.",
    how_to_bypass: "Using highly advanced, computation-heavy renderers that perfectly match muscle articulation to audio."
  },
  voice: {
    title: "Voice Anti-Spoofing",
    what_is_it: "Spectral analysis of the audio track.",
    what_it_does: "Analyzes Mel-Frequency spectrograms for high-frequency synthetic artifacts and unnatural spectral roll-offs common in AI voice clones.",
    how_good_is_it: "Excellent at catching commercial voice clones like ElevenLabs.",
    how_to_bypass: "Re-recording the AI voice through an analog microphone in a physical room to add natural acoustic impedance."
  },
  eye: {
    title: "Eye & Gaze Dynamics",
    what_is_it: "Temporal tracking of blink rates and eye convergence.",
    what_it_does: "Calculates the Eye Aspect Ratio (EAR) over time to flag unnatural 'lazy eye', asynchronous blinking, or abnormal blink frequencies.",
    how_good_is_it: "Very strong for video. Deepfakes often forget to blink or render eyes moving independently.",
    how_to_bypass: "Manually keyframing blinks or using temporal-aware generation models."
  },
  rppg: {
    title: "Biological Signal (rPPG)",
    what_is_it: "Remote Photoplethysmography (Heartbeat detection).",
    what_it_does: "Measures the microscopic color shifts in the skin caused by blood flow to detect a human pulse.",
    how_good_is_it: "The ultimate 'liveness' test. Generative AI fundamentally does not simulate a cardiovascular system.",
    how_to_bypass: "Artificially modulating the RGB values of the synthetic face at a frequency of 1-2 Hz to fake a heartbeat."
  },
  flow: {
    title: "Dense Optical Flow",
    what_is_it: "Motion vector tracking across frames.",
    what_it_does: "Calculates the variance of pixel movement over time to detect unnatural jittering, flickering, or sliding facial masks.",
    how_good_is_it: "Excellent for catching temporal instability in poorly rendered deepfake videos.",
    how_to_bypass: "Using expensive temporal smoothing networks or rendering at extremely high frame rates."
  },
  meta: {
    title: "Metadata & File Analysis",
    what_is_it: "Analysis of the hidden data embedded inside the file structure.",
    what_it_does: "Examines EXIF tags, creation dates, software signatures, and file streams to find traces of editing software (e.g., Photoshop, FFmpeg).",
    how_good_is_it: "Useful for catching lazy deepfakers who don't scrub their metadata before uploading.",
    how_to_bypass: "Running the file through social media platforms (which strip metadata) or manually deleting the EXIF data."
  }
};

const TestDefinition = ({ testId }) => {
  if (!testId || !TEST_DEFINITIONS[testId]) return null;
  const def = TEST_DEFINITIONS[testId];
  return (
    <details className="glass-panel" style={{ borderLeft: '4px solid var(--primary)', padding: '0', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.5rem' }}>
      <summary style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', listStyle: 'none', userSelect: 'none' }}>
        <BookOpen size={18} color="var(--primary)" />
        Theory & Definition: {def.title}
      </summary>
      <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <div><strong style={{ color: 'var(--text-primary)' }}>What is it:</strong> {def.what_is_it}</div>
        <div><strong style={{ color: 'var(--text-primary)' }}>What it does:</strong> {def.what_it_does}</div>
        <div><strong style={{ color: 'var(--text-primary)' }}>How good is it:</strong> {def.how_good_is_it}</div>
        <div><strong style={{ color: 'var(--text-primary)' }}>How to bypass it:</strong> {def.how_to_bypass}</div>
      </div>
    </details>
  );
};

const TestExplanation = ({ explanation, testId }) => {
  if (!explanation) return null;
  const isDanger = explanation.result.toLowerCase().includes('deepfake') || explanation.result.toLowerCase().includes('detected') || explanation.result.toLowerCase().includes('mismatch') || explanation.result.toLowerCase().includes('disrupted');
  const isWarning = explanation.result.toLowerCase().includes('suppressed') || explanation.result.toLowerCase().includes('inconclusive');
  const iconColor = isDanger ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--success)';
  const bgColor = isDanger ? 'rgba(239, 68, 68, 0.05)' : isWarning ? 'rgba(245, 158, 11, 0.05)' : 'rgba(16, 185, 129, 0.05)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      
      <TestDefinition testId={testId} />

      <div className="info-callout" style={{ marginBottom: 0, backgroundColor: bgColor, borderLeftColor: iconColor, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div className="info-callout-icon" style={{ marginTop: '2px' }}><Lightbulb size={20} color={iconColor} /></div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>{explanation.result}</h4>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--text-primary)' }}>What Happened:</strong> {explanation.what_happened}
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why:</strong> {explanation.why_it_happened}
            </p>
          </div>
        </div>
      
      {explanation.variables && Object.keys(explanation.variables).length > 0 && (
        <div style={{ marginLeft: '2.5rem', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.5px' }}>Calculated Variables</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {Object.entries(explanation.variables).map(([key, val]) => (
              <div key={key}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
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
  const [hiddenCards, setHiddenCards] = useState({});
  const [expandedCards, setExpandedCards] = useState({});

  const toggleExpand = (id) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  const hideCard = (id) => setHiddenCards(prev => ({ ...prev, [id]: true }));
  const restoreCards = () => { setHiddenCards({}); setExpandedCards({}); };

  const downloadReport = () => {
    // Navigate directly to the download endpoint. 
    // This allows IDM or the browser to natively handle the file download without throwing JavaScript fetch errors.
    window.location.href = `${API_BASE}/api/reports/${jobId}/pdf`;
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
    { id: 'visual', icon: <Flame size={16} />, label: 'Neural Net' },
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'audio', icon: <Volume2 size={16} />, label: 'Audio Sync' }] : []),
    ...(isVideo && result.file_metadata?.has_audio ? [{ id: 'voice', icon: <Volume2 size={16} />, label: 'Voice Spoofing' }] : []),
    { id: 'meta', icon: <FileText size={16} />, label: 'Metadata' },
  ];

  const advancedTabs = [
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

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1rem' }}>Forensic Metadata</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileVideo size={14} color="var(--primary)" /></div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Analyzed Media'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film size={14} color="var(--accent)" /></div>
                <span>{result.frames_analyzed} structural frames</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Cpu size={14} color="var(--success)" /></div>
                <span>Meta-Classifier (MLP)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={14} color="var(--warning)" /></div>
                <span>{isVideo ? (result.file_metadata?.has_audio ? 14 : 12) : 10} sensory inputs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Score Grid */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.25rem' }}>Sub-Model Signals</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
              <div key={item.key} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: getScoreColor(item.score) }}>{(item.score * 100).toFixed(0)}%</span>
                </div>
                <div className="progress-bar-bg" style={{ height: '3px', margin: 0, background: 'rgba(255,255,255,0.05)' }}>
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

      {/* ========== ENSEMBLE TAB ========== */}
      {activeTab === 'features' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ flex: 1 }}><TestDefinition testId="features" /></div>
            {Object.keys(hiddenCards).some(k => hiddenCards[k]) && (
              <button onClick={restoreCards} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 211, 238, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <RotateCcw size={14} /> Restore Panels
              </button>
            )}
          </div>
          
          <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', alignItems: 'start' }}>
            
            {/* 1. DETECTOR SCORES (Col 1, spans 2 rows) */}
            {!hiddenCards['detector'] && (<div className="glass-panel analysis-panel" style={{ gridRow: expandedCards['detector'] ? 'auto' : 'span 2', gridColumn: expandedCards['detector'] ? '1 / -1' : 'auto', height: '100%', display: 'flex', flexDirection: 'column', resize: 'both', overflow: 'hidden' }}>
              <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="panel-icon shap"><BarChart3 size={20} color="var(--primary)" /></div>
                  <div>
                    <div className="panel-title">Detector Scores</div>
                    <div className="panel-subtitle">Ensemble Inputs</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleExpand('detector')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} title={expandedCards['detector'] ? "Restore Size" : "Expand Full Width"}>
                    {expandedCards['detector'] ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button onClick={() => hideCard('detector')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Hide Panel"><X size={14} /></button>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {[
                  { label: 'EfficientNet-B4', score: result.nn_score, weight: result.weights?.nn_score },
                  { label: 'Frequency Analysis', score: result.spectral_anomaly_score, weight: result.weights?.spectral_score },
                  { label: 'Error Level Analysis', score: result.ela_score, weight: result.weights?.ela_score },
                  { label: 'Face Geometry', score: result.geometry_anomaly_score, weight: result.weights?.geometry_anomaly },
                  { label: 'Sensor Noise', score: result.noise_score, weight: result.weights?.noise_score },
                  { label: 'Chrominance', score: result.color_score, weight: result.weights?.color_score },
                  { label: 'Lighting', score: result.lighting_score, weight: result.weights?.lighting_score },
                  { label: 'CFA Pattern', score: result.cfa_score || 0, weight: result.weights?.cfa_score },
                  { label: 'Corneal Reflection', score: result.corneal_score || 0, weight: result.weights?.corneal_score },
                  ...(isVideo ? [{ label: 'Eye Tracking', score: result.eye_score || 0, weight: result.weights?.eye_score }] : []),
                  ...(isVideo ? [{ label: 'Optical Flow', score: result.flow_score || 0, weight: result.weights?.flow_score }] : []),
                  ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Audio Desync', score: result.sync_score, weight: result.weights?.sync_score }] : []),
                  ...(isVideo && result.file_metadata?.has_audio ? [{ label: 'Voice Spoofing', score: result.voice_score || 0, weight: result.weights?.voice_score }] : []),
                  ...(isVideo ? [{ label: 'Pulse (rPPG)', score: result.rppg_score, weight: result.weights?.rppg_score }] : [])
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                    <div style={{ width: '40px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      {item.weight !== undefined ? `${(item.weight * 100).toFixed(1)}%` : ''}
                    </div>
                    <div style={{ width: '100px' }}>
                      <div className="progress-bar-bg" style={{ height: '4px', margin: 0 }}>
                        <div className="progress-bar-fill" style={{ width: `${item.score * 100}%`, background: getScoreColor(item.score), animation: 'none' }}></div>
                      </div>
                    </div>
                    <div style={{ width: '45px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: getScoreColor(item.score) }}>
                      {(item.score * 100).toFixed(0)}%
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', marginTop: 'auto', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Ensemble Score</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getScoreColor(result.overall_score) }}>
                    {(result.overall_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>)}

            {/* 2. RADAR CHART (Col 2, Row 1) */}
            {!hiddenCards['radar'] && (<div className="glass-panel analysis-panel" style={{ gridColumn: expandedCards['radar'] ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', resize: 'both', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', right: '1rem', top: '1rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
                <button onClick={() => toggleExpand('radar')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} title={expandedCards['radar'] ? "Restore Size" : "Expand Full Width"}>
                  {expandedCards['radar'] ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
                <button onClick={() => hideCard('radar')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Hide Panel"><X size={14} /></button>
              </div>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', alignSelf: 'flex-start', fontWeight: 600 }}>
                Fingerprint Radar
              </h4>
              <div style={{ position: 'relative', width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                    { subject: 'Neural Net', A: result.nn_score * 100 },
                    { subject: 'Frequency', A: result.spectral_anomaly_score * 100 },
                    { subject: 'ELA', A: result.ela_score * 100 },
                    { subject: 'Geometry', A: result.geometry_anomaly_score * 100 },
                    { subject: 'Noise', A: result.noise_score * 100 },
                    { subject: 'Color', A: result.color_score * 100 },
                    { subject: 'Lighting', A: result.lighting_score * 100 },
                    { subject: 'CFA', A: (result.cfa_score || 0) * 100 },
                    { subject: 'Corneal', A: (result.corneal_score || 0) * 100 },
                    ...(isVideo ? [{ subject: 'Eye Gaze', A: (result.eye_score || 0) * 100 }] : []),
                    ...(isVideo ? [{ subject: 'Opt Flow', A: (result.flow_score || 0) * 100 }] : []),
                    ...(isVideo && result.file_metadata?.has_audio ? [{ subject: 'Desync', A: result.sync_score * 100 }] : []),
                    ...(isVideo && result.file_metadata?.has_audio ? [{ subject: 'Voice', A: (result.voice_score || 0) * 100 }] : []),
                    ...(isVideo ? [{ subject: 'Pulse', A: result.rppg_score * 100 }] : [])
                  ]}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--danger)' }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Anomaly Score']}
                    />
                    <Radar name="Anomaly" dataKey="A" stroke="#ef4444" fill="rgba(239, 68, 68, 0.4)" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                A larger footprint strongly indicates AI generation.
              </div>
            </div>)}

            {/* 3. SHAP (Col 3, Row 1) */}
            {!hiddenCards['shap'] && (<div className="glass-panel analysis-panel" style={{ gridColumn: expandedCards['shap'] ? '1 / -1' : 'auto', height: '100%', display: 'flex', flexDirection: 'column', resize: 'both', overflow: 'hidden' }}>
              <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="panel-icon shap"><BarChart3 size={20} color="var(--success)" /></div>
                  <div>
                    <div className="panel-title">SHAP Importance</div>
                    <div className="panel-subtitle">Top drivers</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleExpand('shap')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} title={expandedCards['shap'] ? "Restore Size" : "Expand Full Width"}>
                    {expandedCards['shap'] ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button onClick={() => hideCard('shap')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Hide Panel"><X size={14} /></button>
                </div>
              </div>
              <div style={{ position: 'relative', width: '100%', height: 200, marginTop: '1rem', flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={result.shap_top_features.map((feature, idx) => ({ 
                    name: feature.length > 20 ? feature.substring(0, 18) + '...' : feature, 
                    fullName: feature,
                    importance: Math.max(10, 100 - (idx * 20)) 
                  }))} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, 160]} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={120} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 1000 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ backgroundColor: 'rgba(10,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px', maxWidth: '200px', whiteSpace: 'normal', wordWrap: 'break-word', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                              <p style={{ color: 'var(--text-main)', margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, lineHeight: '1.4' }}>{payload[0].payload.fullName}</p>
                              <p style={{ color: 'var(--success)', margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>Importance: {payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="importance" fill="var(--success)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>)}

            {/* 4. ARCHITECTURE (Col 2 & 3, Row 2) */}
            {!hiddenCards['arch'] && (<div className="glass-panel analysis-panel" style={{ gridColumn: expandedCards['arch'] ? '1 / -1' : 'span 2', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', resize: 'both', overflow: 'hidden' }}>
              <div className="panel-header" style={{ marginBottom: 0, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="panel-icon" style={{ background: 'rgba(59,130,246,0.12)' }}><BarChart3 size={20} color="var(--primary)" /></div>
                  <div>
                    <div className="panel-title">Meta-Classifier Architecture</div>
                    <div className="panel-subtitle">PyTorch Tabular ResNet + Self-Attention</div>
                  </div>
                </div>
                <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleExpand('arch')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} title={expandedCards['arch'] ? "Restore Size" : "Expand Full Width"}>
                    {expandedCards['arch'] ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button onClick={() => hideCard('arch')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Hide Panel"><X size={14} /></button>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', flex: 1, minWidth: 0, wordWrap: 'break-word', whiteSpace: 'normal' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}>The Meta-Classifier acts as the final "Judge". It does not look at the video pixels; instead, it analyzes the <strong>numerical scores</strong> generated by all the independent physical and biological sensors.</p>
                <ul style={{ margin: '0', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li><strong>Inputs:</strong> 12-14 distinct anomaly scores (0.0 to 1.0).</li>
                  <li><strong>Self-Attention:</strong> Learns which sensors to trust based on the context (e.g. ignoring color anomalies if the video is black and white).</li>
                  <li><strong>XAI Override:</strong> Hard-coded to automatically override the neural network and flag the video as a Deepfake if any critical biological sensor (like Geometry) exceeds 70% anomaly.</li>
                </ul>
              </div>
            </div>)}

          </div>
        </div>
      )}
      {/* ========== NEURAL NET TAB ========== */}
      {activeTab === 'visual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TestDefinition testId="visual" />

          <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'stretch' }}>
            
            {/* Neural Net Result Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="panel-header" style={{ marginBottom: 0 }}>
                <div className="panel-icon gradcam"><Flame size={20} color="var(--danger)" /></div>
                <div>
                  <div className="panel-title">Neural Network Analysis</div>
                  <div className="panel-subtitle">EfficientNet-B4 Spatial Processing</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>EfficientNet-B4 Anomaly</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: getScoreColor(result.nn_score) }}>
                    {(result.nn_score * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ width: '80px', height: '80px', position: 'relative' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={getScoreColor(result.nn_score)}
                      strokeWidth="3.5"
                      strokeDasharray={`${result.nn_score * 100}, 100`}
                      style={{ transition: 'stroke-dasharray 1.5s ease-out' }}
                    />
                  </svg>
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <p>The core neural network scans the raw pixels of the image looking for deepfake artifacts like blending errors, unnatural textures, and warping.</p>
                <p style={{ marginTop: '0.5rem' }}><strong>What this score means:</strong> A score of {(result.nn_score * 100).toFixed(1)}% indicates the base neural network's raw assessment of synthetic manipulation, before any other physical or biological forensic sensors are consulted.</p>
              </div>
            </div>

            {/* GradCAM Visualization Panel */}
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.12)' }}><Search size={20} color="var(--accent)" /></div>
                <div>
                  <div className="panel-title">GradCAM Localization</div>
                  <div className="panel-subtitle">Where the neural network is looking</div>
                </div>
              </div>
              <div className="heatmap-container" style={{ position: 'relative', display: 'flex', gap: '1rem', overflowX: 'auto', background: 'transparent', padding: '0.5rem 0', flex: 1 }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Coarse Localization</h4>
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
                      <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        <p>Heatmap unavailable</p>
                      </div>
                    )}
                    <div className="zoom-overlay">
                      <ZoomIn size={32} />
                    </div>
                  </div>
                </div>
                {result.heatmaps && result.heatmaps.length > 1 && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h4 style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 600 }}>Pixel Gradients</h4>
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
              <div className="heatmap-legend" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>Red/warm areas = high neural network attention.</span>
              </div>
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
          


          <div className="analysis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(1, 1fr)' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(255,255,255,0.12)' }}>🕸️</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Spectral Residual Saliency (GAN Checkerboard)</div>
                    <div className="panel-subtitle">Inverse FFT of frequency residuals to expose Transpose Convolution grids</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.saliency} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.saliency_map_path}`)}
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.saliency_map_path}`}
                    alt="Spectral Residual Saliency Map"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div className="heatmap-legend" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>Real photos show smooth natural edges. Deepfakes generated by GANs/Diffusion models often exhibit a distinct, microscopic checkerboard grid across the entire face.</span>
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
              
              {/* Advanced Metrics Table replaced with Recharts */}
              <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="panel-header" style={{ marginBottom: 0 }}>
                  <div className="panel-icon"><Activity size={20} color="var(--primary)" /></div>
                  <div className="panel-title">Advanced Frequency Distribution</div>
                </div>
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={[
                      { name: 'HF Energy', value: result.frequency_analysis.high_freq_energy_ratio * 100 },
                      { name: 'Red HF', value: (result.frequency_analysis.channel_hf_ratios?.[0] || 0) * 100 },
                      { name: 'Green HF', value: (result.frequency_analysis.channel_hf_ratios?.[1] || 0) * 100 },
                      { name: 'Blue HF', value: (result.frequency_analysis.channel_hf_ratios?.[2] || 0) * 100 },
                      { name: 'PC3 Var', value: (result.frequency_analysis.pc3_variance_ratio || 0) * 100 }
                    ]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)'}} />
                      <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(val) => [`${val.toFixed(2)}%`, 'Variance Ratio']} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>Overall Spectral Anomaly Score:</span>
                   <span style={{ fontWeight: 700, fontSize: '1.2rem', color: getScoreColor(result.frequency_analysis.spectral_anomaly_score) }}>
                     {(result.frequency_analysis.spectral_anomaly_score * 100).toFixed(1)}%
                   </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== CFA TAB ========== */}
      {activeTab === 'cfa' && result.cfa_analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TestExplanation testId={activeTab} explanation={result.cfa_analysis.explanation} />

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
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Focus size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Corneal Optics & Reflection</div>
              <div className="panel-subtitle">Comparing left vs right eye lighting consistency</div>
            </div>
          </div>

          <TestExplanation testId={activeTab} explanation={result.corneal_analysis.explanation} />
          
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid var(--danger)', borderRadius: '4px', marginBottom: '1.5rem' }}>
            <strong style={{ color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={14} /> WARNING: Inaccuracy on Blurry/Far Images
            </strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              This metric requires extremely high-resolution, clear, and well-lit closeups of the eyes to function correctly. If the person is far away, the image is blurry, or lighting is extremely dim, the anomaly score may be inaccurate or highly elevated. Its weight in the final ensemble calculation is heavily reduced to prevent false positives.
            </p>
          </div>

          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <div 
                className="zoomable-image-container"
                onClick={() => setZoomedImage(`${API_BASE}/${result.corneal_analysis.corneal_map_path}`)}
                style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <img
                  src={`${API_BASE}/${result.corneal_analysis.corneal_map_path}`}
                  alt="Corneal Highlights"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="zoom-overlay"><ZoomIn size={32} /></div>
              </div>
              <div className="image-caption" style={{ marginTop: '0.5rem' }}>Isolated Specular Highlights (Left vs Right Eye)</div>
            </div>

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.corneal_analysis.corneal_score} 
                  label="Corneal Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              {result.corneal_analysis.iou !== undefined && (
                <div style={{ flex: '1 1 300px' }}>
                  <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    Highlight Consistency Metrics
                  </h4>
                  <div className="metric-grid">
                    <MetricCard 
                      label="Highlight IoU" 
                      value={`${(result.corneal_analysis.iou * 100).toFixed(1)}%`} 
                      subValue="Intersection over Union" 
                      type={getSyncColor(1 - result.corneal_analysis.iou)} 
                    />
                    <MetricCard 
                      label="Structural Similarity" 
                      value={`${(result.corneal_analysis.ssim * 100).toFixed(1)}%`} 
                      subValue="SSIM between left and right mask" 
                      type={getSyncColor(1 - result.corneal_analysis.ssim)} 
                    />
                    {result.corneal_analysis.suppressed && (
                      <div style={{ gridColumn: '1 / -1', marginTop: '1rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', borderLeft: '3px solid var(--warning)', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          <AlertTriangle size={16} /> False Positive Suppressed
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {result.corneal_analysis.suppression_reason} The mathematical anomaly score was aggressively reduced to prevent a false positive.
                        </p>
                        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                          <div><strong style={{ color: 'var(--text-muted)' }}>Total Glare Area:</strong> {result.corneal_analysis.total_glare_area?.toFixed(1)} px</div>
                          <div><strong style={{ color: 'var(--text-muted)' }}>Asymmetry Ratio:</strong> {(result.corneal_analysis.area_diff_ratio * 100)?.toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== ELA TAB ========== */}
      {activeTab === 'ela' && result.ela_analysis && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Search size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Error Level Analysis (ELA)</div>
              <div className="panel-subtitle">JPEG Compression History & Chrominance Anomalies</div>
            </div>
          </div>

          <TestExplanation testId={activeTab} explanation={result.ela_analysis.explanation} />

          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {result.ela_analysis.ela_image_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.ela_image_path}`)}>
                  <img src={`${API_BASE}/${result.ela_analysis.ela_image_path}`} alt="Standard ELA" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>Standard ELA Variance</div>
                </div>
              )}
              {result.ela_analysis.ghosting_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.ghosting_path}`)}>
                  <img src={`${API_BASE}/${result.ela_analysis.ghosting_path}`} alt="JPEG Ghosting" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>JPEG Ghosting Map</div>
                </div>
              )}
              {result.ela_analysis.hsv_ela_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.ela_analysis.hsv_ela_path}`)}>
                  <img src={`${API_BASE}/${result.ela_analysis.hsv_ela_path}`} alt="HSV ELA" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>HSV Saturation ELA</div>
                </div>
              )}
            </div>

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.ela_score} 
                  label="Compression Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Compression Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="Smooth Region Anomaly" 
                    value={result.ela_analysis.ela_smooth_anomaly !== undefined ? `${(result.ela_analysis.ela_smooth_anomaly * 100).toFixed(2)}%` : 'N/A'} 
                    type={result.ela_analysis.ela_smooth_anomaly > 0.4 ? 'danger' : 'neutral'} 
                  />
                  <MetricCard 
                    label="JPEG Ghosting Variance" 
                    value={result.ela_analysis.ghost_variance !== undefined ? result.ela_analysis.ghost_variance.toFixed(2) : 'N/A'} 
                    type={result.ela_analysis.ghost_variance > 10.0 ? 'warning' : 'neutral'} 
                  />
                  <MetricCard 
                    label="Base ELA Variance" 
                    value={result.ela_analysis.ela_base_variance !== undefined ? `${(result.ela_analysis.ela_base_variance * 100).toFixed(2)}%` : 'N/A'} 
                  />
                  <MetricCard 
                    label="HSV Saturation Variance" 
                    value={result.ela_analysis.hsv_variance !== undefined ? result.ela_analysis.hsv_variance.toFixed(2) : 'N/A'} 
                  />
                </div>
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
          
          <TestExplanation testId={activeTab} explanation={result.face_geometry.explanation} />

          <div className="tab-content-wrapper">
            {result.face_geometry.face_detected ? (
              <>
                <div style={{ padding: '1rem', background: 'rgba(52,211,153,0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(52,211,153,0.1)', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {result.face_geometry.face_geometry_interpretation}
                  </p>
                </div>

                {/* HERO VISUALS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {result.face_geometry.radar_chart_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.radar_chart_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.radar_chart_path}`} alt="Radar Chart" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>Biological Proportions Radar Map</div>
                    </div>
                  )}
                  {result.face_geometry.landmark_visualization_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.landmark_visualization_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.landmark_visualization_path}`} alt="Landmarks" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>3D Constellation Wireframe</div>
                    </div>
                  )}
                  {result.face_geometry.head_pose_visualization_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.head_pose_visualization_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.head_pose_visualization_path}`} alt="3D Head Pose" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>3D Head Pose Compass (Pitch/Yaw/Roll)</div>
                    </div>
                  )}
                  {result.face_geometry.symmetry_map_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.symmetry_map_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.symmetry_map_path}`} alt="Symmetry Map" style={{ width: '100%', height: '220px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>Symmetry Anomaly Heatmap</div>
                    </div>
                  )}
                  {result.face_geometry.temporal_jitter_plot_path && (
                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gridColumn: '1 / -1' }}>
                      <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.face_geometry.temporal_jitter_plot_path}`)}>
                      <img src={`${API_BASE}/${result.face_geometry.temporal_jitter_plot_path}`} alt="Temporal Jitter" style={{ width: '100%', maxHeight: '350px', objectFit: 'contain' }} />
                      <div className="zoom-overlay"><ZoomIn size={32} /></div>
                    </div>
                      <div className="image-caption" style={{ marginTop: '0.5rem' }}>Temporal Jitter Tracker (All Proportions)</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                  {/* MAIN SCORE RING */}
                  <div style={{ flex: '0 0 auto' }}>
                    <ScoreRing 
                      score={result.geometry_anomaly_score} 
                      label="Geometry Anomaly" 
                      invert={false} 
                      size={140} 
                    />
                  </div>
                  
                  {/* METRICS GRID */}
                  <div style={{ flex: '1 1 300px' }}>
                    <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                      Core Biological Metrics
                    </h4>
                    <div className="metric-grid">
                      {result.face_geometry.temporal_jitter_score != null && (
                        <MetricCard 
                          label="Temporal Jitter" 
                          value={`${(result.face_geometry.temporal_jitter_score * 100).toFixed(1)}%`} 
                          type={getSyncColor(result.face_geometry.temporal_jitter_score)} 
                        />
                      )}
                      <MetricCard 
                        label="Facial Symmetry" 
                        value={`${(result.face_geometry.symmetry_score * 100).toFixed(1)}%`} 
                        type={getSyncColor(1 - result.face_geometry.symmetry_score)} 
                      />
                      <MetricCard 
                        label="Texture Consistency" 
                        value={`${(result.face_geometry.texture_consistency * 100).toFixed(1)}%`} 
                        type={getSyncColor(1 - result.face_geometry.texture_consistency)} 
                      />
                      <MetricCard 
                        label="Noise Consistency" 
                        value={`${(result.face_geometry.noise_consistency * 100).toFixed(1)}%`} 
                        type={getSyncColor(1 - result.face_geometry.noise_consistency)} 
                      />
                      {result.face_geometry.golden_ratio != null && (
                        <MetricCard 
                          label="Vertical Proportion" 
                          value={result.face_geometry.golden_ratio.toFixed(3)} 
                          subValue="Ideal ~1.000" 
                          type={Math.abs(result.face_geometry.golden_ratio - 1.0) > 0.35 ? 'danger' : 'neutral'} 
                        />
                      )}
                      {result.face_geometry.interocular_ratio != null && (
                        <MetricCard 
                          label="Interocular Ratio" 
                          value={result.face_geometry.interocular_ratio.toFixed(3)} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertTriangle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>No face detected in the analyzed frame.</p>
              </div>
            )}
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
          
          <TestExplanation testId={activeTab} explanation={result.noise_analysis.explanation} />

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
          
          <TestExplanation testId={activeTab} explanation={result.color_analysis.explanation} />

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
            
            <div className="metrics-container" style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Color Space Variances
              </h4>
              <div style={{ flex: 1, minHeight: '250px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={[
                    { name: 'Cb (Blue-Diff)', variance: result.color_analysis?.cb_variance || 0 },
                    { name: 'Cr (Red-Diff)', variance: result.color_analysis?.cr_variance || 0 },
                    { name: 'Saturation', variance: result.color_analysis?.s_variance || 0 },
                    { name: 'LAB (a*)', variance: result.color_analysis?.a_variance || 0 }
                  ]} layout="vertical" margin={{ top: 0, right: 20, left: 50, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(val) => [val.toFixed(2), 'Variance']} />
                    <Bar dataKey="variance" fill="var(--info)" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Color Anomaly Score</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: getScoreColor(result.color_score) }}>
                    {(result.color_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
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
              <div className="panel-title">Audio-Visual Synchronization (Native 3D-CNN SyncNet)</div>
              <div className="panel-subtitle">Measuring sub-millisecond lip-sync distance (LSE-D)</div>
            </div>
          </div>
          
          <TestExplanation testId={activeTab} explanation={result.sync_analysis.explanation} />

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
          
          <TestExplanation testId={activeTab} explanation={result.rppg_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            {result.rppg_analysis.signal_plot_path && (
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.rppg_analysis.signal_plot_path}`)}>
<img 
                  src={`${API_BASE}/${result.rppg_analysis.signal_plot_path}`} 
                  alt="rPPG Signal Spectrum" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem' }}>Dual-Panel PPG Waveform & Power Spectrum (FFT)</div>
              </div>
            )}

            {/* METRICS GRID */}
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <MetricCard 
                label="Detected Heart Rate" 
                value={result.rppg_analysis.has_pulse ? `${result.rppg_analysis.heart_rate} BPM` : 'None'} 
                subValue={result.rppg_analysis.has_pulse ? 'Human Pulse Detected' : 'Static/Synthetic Face'} 
                type={result.rppg_analysis.has_pulse ? 'success' : 'danger'} 
              />
              <MetricCard 
                label="Signal-to-Noise Ratio (SNR)" 
                value={result.rppg_analysis.snr} 
                subValue="Peak Prominence" 
                type={result.rppg_analysis.snr > 1.5 ? 'success' : 'warning'} 
              />
            </div>

            {result.rppg_analysis.warnings && result.rppg_analysis.warnings.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Analysis Warnings
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                  {result.rppg_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </div>
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
          
          <TestExplanation testId={activeTab} explanation={result.lighting_analysis.explanation} />
          
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



      {/* ========== METADATA TAB ========== */}
      {activeTab === 'meta' && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon meta"><FileText size={20} color="var(--primary)" /></div>
            <div>
              <div className="panel-title">EXIF & File Metadata Analysis</div>
              <div className="panel-subtitle">Technical specifications and digital footprint</div>
            </div>
          </div>
          
          <TestDefinition testId="meta" />
          
          <div className="tab-content-wrapper">
            {result.metadata_analysis && result.metadata_analysis.warnings && result.metadata_analysis.warnings.length > 0 && (
              <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '2rem' }}>
                <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={18} /> Forensic Warnings
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                  {result.metadata_analysis.warnings.map((w, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{w}</li>)}
                </ul>
              </div>
            )}

            <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Basic File Properties
            </h4>
            <div className="metric-grid" style={{ marginBottom: '2rem' }}>
              <MetricCard label="File Name" value={fileName || 'N/A'} type="primary" />
              <MetricCard label="Job ID" value={jobId} subValue="Unique Analysis ID" />
              <MetricCard label="Analysis Date" value={new Date().toLocaleString()} />
              {result.file_metadata && (
                <>
                  <MetricCard label="File Size" value={`${(result.file_metadata.file_size_bytes / (1024*1024)).toFixed(2)} MB`} />
                  <MetricCard label="Original Resolution" value={result.file_metadata.original_resolution} />
                  <MetricCard label="Audio Track" value={result.file_metadata.has_audio ? 'Detected' : 'None'} type={result.file_metadata.has_audio ? 'success' : 'neutral'} />
                </>
              )}
            </div>

            {result.metadata_analysis && result.metadata_analysis.extracted_tags && Object.keys(result.metadata_analysis.extracted_tags).length > 0 && (
              <>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Extracted EXIF Tags
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.5rem', marginBottom: '2rem' }}>
                  {Object.entries(result.metadata_analysis.extracted_tags).map(([key, val]) => {
                    const isSuspicious = val.toLowerCase().includes('midjourney') || val.toLowerCase().includes('photoshop');
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: isSuspicious ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: isSuspicious ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{key}</span>
                        <span style={{ color: isSuspicious ? 'var(--danger)' : 'var(--text-primary)', fontWeight: isSuspicious ? 600 : 400, fontSize: '0.85rem', wordBreak: 'break-all' }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
              Model Configuration
            </h4>
            <div className="metric-grid">
              <MetricCard label="Model Engine" value="EfficientNet-B4" subValue="Contrastive SBI" />
              <MetricCard label="Feature Dimension" value="1792-d" subValue="Vector Space" />
              <MetricCard label="Input Resolution" value="380 × 380" subValue="Cropped Face" />
              <MetricCard label="XAI Interventions" value="GradCAM, SHAP" />
              <MetricCard label="Frames Analyzed" value={result.frames_analyzed || 'N/A'} />
            </div>
          </div>
        </div>
      )}

      {/* ========== EYE GAZE & BLINK TAB ========== */}
      {activeTab === 'eye' && result.eye_analysis && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Focus size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Biological Metric: Eye & Gaze Dynamics</div>
              <div className="panel-subtitle">Blink rate and gaze convergence consistency</div>
            </div>
          </div>

          <TestExplanation testId={activeTab} explanation={result.eye_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            {result.eye_analysis.eye_plot_path && (
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.eye_analysis.eye_plot_path}`)}>
<img 
                  src={`${API_BASE}/${result.eye_analysis.eye_plot_path}`} 
                  alt="Eye Tracking Plot" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem' }}>Eye Aspect Ratio (EAR) Tracker</div>
              </div>
            )}

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.eye_analysis.eye_anomaly_score} 
                  label="Eye Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Eye tracking Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="Blink Rate" 
                    value={`${result.eye_analysis.blink_rate_per_min} BPM`} 
                    subValue="Blinks per minute" 
                    type={result.eye_analysis.blink_rate_per_min < 5 || result.eye_analysis.blink_rate_per_min > 50 ? 'warning' : 'neutral'} 
                  />
                  <MetricCard 
                    label="Gaze Asymmetry" 
                    value={result.eye_analysis.gaze_asymmetry.toFixed(3)} 
                    subValue="Left vs Right Eye Gaze" 
                    type={getSyncColor(result.eye_analysis.eye_anomaly_score)} 
                  />
                  {result.eye_analysis.warnings && result.eye_analysis.warnings.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Detection Warnings
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                        {result.eye_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== VOICE SPOOFING TAB ========== */}
      {activeTab === 'voice' && result.voice_analysis && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Volume2 size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Audio Forensics: Voice Anti-Spoofing</div>
              <div className="panel-subtitle">Detecting synthetic voice clones and vocoder artifacts</div>
            </div>
          </div>

          <TestExplanation testId={activeTab} explanation={result.voice_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            {result.voice_analysis.voice_plot_path && (
              <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.voice_analysis.voice_plot_path}`)}>
<img 
                  src={`${API_BASE}/${result.voice_analysis.voice_plot_path}`} 
                  alt="Voice Spoofing Plot" 
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'contain' }} 
                />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                <div className="image-caption" style={{ marginTop: '0.5rem' }}>Dual-Panel Audio Waveform & Spectral Power Density</div>
              </div>
            )}

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.voice_analysis.voice_anomaly_score} 
                  label="Audio Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Mel-Frequency Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="ZCR Variance" 
                    value={result.voice_analysis.zcr_variance.toFixed(5)} 
                    subValue="Zero-Crossing Rate" 
                    type={getSyncColor(result.voice_analysis.voice_anomaly_score)} 
                  />
                  <MetricCard 
                    label="High-Freq Ratio" 
                    value={result.voice_analysis.high_freq_ratio.toFixed(4)} 
                    subValue="Synthesized Pitch Shift" 
                    type={getSyncColor(result.voice_analysis.voice_anomaly_score)} 
                  />
                  {result.voice_analysis.warnings && result.voice_analysis.warnings.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Spoofing Warnings
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                        {result.voice_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== OPTICAL FLOW TAB ========== */}
      {activeTab === 'flow' && result.flow_analysis && (
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon shap"><Activity size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Dense Optical Flow Analysis</div>
              <div className="panel-subtitle">Temporal consistency and motion vector tracking</div>
            </div>
          </div>

          <TestExplanation testId={activeTab} explanation={result.flow_analysis.explanation} />
          
          <div className="tab-content-wrapper">
            {/* HERO VISUALS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {result.flow_analysis.flow_plot_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.flow_analysis.flow_plot_path}`)}>
                  <img src={`${API_BASE}/${result.flow_analysis.flow_plot_path}`} alt="Optical Flow Plot" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>Motion Variance Tracker</div>
                </div>
              )}
              {result.flow_analysis.flow_field_path && (
                <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="zoomable-image-container" onClick={() => setZoomedImage(`${API_BASE}/${result.flow_analysis.flow_field_path}`)}>
                  <img src={`${API_BASE}/${result.flow_analysis.flow_field_path}`} alt="Flow Field HSV" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem' }}>HSV Motion Vector Field (Pixel Flow)</div>
                </div>
              )}
            </div>

            {/* METRICS & SCORE */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ flex: '0 0 auto' }}>
                <ScoreRing 
                  score={result.flow_analysis.flow_anomaly_score} 
                  label="Motion Anomaly" 
                  invert={false} 
                  size={140} 
                />
              </div>
              
              <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  Motion Tracking Metrics
                </h4>
                <div className="metric-grid">
                  <MetricCard 
                    label="Mean Motion Variance" 
                    value={result.flow_analysis.mean_motion_variance.toFixed(4)} 
                    type={getSyncColor(result.flow_analysis.flow_anomaly_score)} 
                  />
                  {result.flow_analysis.warnings && result.flow_analysis.warnings.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <h4 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> Jitter Warnings
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-primary)' }}>
                        {result.flow_analysis.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default ReportDashboard;
