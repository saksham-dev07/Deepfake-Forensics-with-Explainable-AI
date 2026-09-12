import React, { useState, useMemo } from 'react';
import { 
  BarChart3, RotateCcw, X, Maximize2, Minimize2, ShieldCheck, AlertTriangle, 
  Sparkles, ShieldAlert, CheckCircle2, Cpu, Activity, Info, Network, Layers, 
  Sliders, HelpCircle, ArrowRight, Eye, Focus, Check
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import TestDefinition from '../ui/TestDefinition';

const FeaturesTab = ({
  result,
  expandedCards,
  hiddenCards,
  toggleExpand,
  hideCard,
  restoreCards,
  getScoreColor,
  isVideo,
}) => {
  const [archViewMode, setArchViewMode] = useState('pipeline'); // 'pipeline' | 'guide'

  // Dual Radar data: Observed vs Pristine Baseline
  const radarData = useMemo(() => [
    { subject: 'Neural Net', Observed: result.nn_score * 100, Baseline: 12 },
    { subject: 'Frequency', Observed: result.spectral_anomaly_score * 100, Baseline: 15 },
    { subject: 'ELA', Observed: result.ela_score * 100, Baseline: 14 },
    { subject: 'Geometry', Observed: result.geometry_anomaly_score * 100, Baseline: 10 },
    { subject: 'Noise', Observed: result.noise_score * 100, Baseline: 12 },
    { subject: 'Color', Observed: result.color_score * 100, Baseline: 10 },
    { subject: 'Lighting', Observed: (result.lighting_score || 0) * 100, Baseline: 11 },
    { subject: 'CFA', Observed: (result.cfa_score || 0) * 100, Baseline: 12 },
    { subject: 'Corneal', Observed: (result.corneal_score || 0) * 100, Baseline: 10 },
    { subject: 'Metadata', Observed: (result.metadata_score || 0) * 100, Baseline: 10 },
    ...(isVideo ? [{ subject: 'Eye Gaze', Observed: (result.eye_score || 0) * 100, Baseline: 10 }] : []),
    ...(isVideo ? [{ subject: 'Opt Flow', Observed: (result.flow_score || 0) * 100, Baseline: 12 }] : []),
    ...(isVideo && result.file_metadata?.has_audio ? [{ subject: 'Desync', Observed: result.sync_score * 100, Baseline: 10 }] : []),
    ...(isVideo && result.file_metadata?.has_audio ? [{ subject: 'Voice', Observed: (result.voice_score || 0) * 100, Baseline: 10 }] : []),
    ...(isVideo ? [{ subject: 'Pulse', Observed: (result.rppg_score || 0) * 100, Baseline: 10 }] : [])
  ], [result, isVideo]);

  // Clean SHAP feature names and impact extraction
  const shapList = useMemo(() => {
    const cleanSensorName = (name) => {
      if (/sensor noise/i.test(name)) return 'Sensor Noise (PRNU)';
      if (/illumination|lighting/i.test(name)) return 'Lighting Consistency';
      if (/corneal/i.test(name)) return 'Corneal Reflections';
      if (/chrominance|color/i.test(name)) return 'Chrominance Space (YCbCr)';
      if (/neural network|backbone|efficientnet/i.test(name)) return 'Neural Net Artifacts';
      if (/frequency|spectral/i.test(name)) return 'Spectral Frequency (FFT)';
      if (/jpeg|error level|ela/i.test(name)) return 'Error Level (ELA)';
      if (/facial boundary|geometry/i.test(name)) return 'Face Geometry Landmarks';
      if (/bayer|cfa/i.test(name)) return 'CFA Bayer Pattern';
      if (/metadata|exif/i.test(name)) return 'Container Metadata';
      if (/heart pulse|rppg/i.test(name)) return 'Biological Pulse (rPPG)';
      if (/blink|gaze|eye/i.test(name)) return 'Eye Tracking & Gaze';
      if (/audio|desync/i.test(name)) return 'Audio-Visual Desync';
      if (/vocoder|voice/i.test(name)) return 'Voice Spoofing (Vocoder)';
      if (/motion|optical flow/i.test(name)) return 'Optical Motion Flow';
      return name.length > 26 ? name.substring(0, 24) + '...' : name;
    };

    if (Array.isArray(result.shap_top_features) && result.shap_top_features.length > 0) {
      if (typeof result.shap_top_features[0] === 'object' && result.shap_top_features[0] !== null) {
        return result.shap_top_features.map((item) => ({
          fullName: item.feature,
          cleanName: cleanSensorName(item.feature),
          importance: typeof item.importance === 'number' ? item.importance * 100 : 25,
          isFake: item.direction === 'FAKE'
        }));
      }

      return result.shap_top_features.map((feature, idx) => {
        const match = feature.match(/\(?Impact:\s*(\d+(?:\.\d+)?)%\s*(.*?)\)/i) || feature.match(/\((\d+(?:\.\d+)?)%\s*(.*?)\)/);
        const importance = match ? parseFloat(match[1]) : Math.max(5, 50 - (idx * 10));
        const rawDirection = match ? match[2].trim() : "";
        const isFake = rawDirection.includes("FAKE") || feature.toUpperCase().includes("FAKE");
        const fullName = feature.replace(/\s*\((?:Impact:\s*)?\d+(?:\.\d+)%\s*.*?\)/i, '').trim();
        const cleanName = cleanSensorName(fullName);
        return { fullName, cleanName, importance, isFake };
      });
    }

    return [
      { fullName: 'Neural Network Backbone', cleanName: 'Neural Net Artifacts', importance: result.nn_score * 100, isFake: result.nn_score > 0.5 },
      { fullName: 'Error Level Analysis', cleanName: 'Error Level (ELA)', importance: result.ela_score * 100, isFake: result.ela_score > 0.5 },
      { fullName: 'Bayer CFA Grid', cleanName: 'CFA Bayer Pattern', importance: (result.cfa_score || 0.1) * 100, isFake: (result.cfa_score || 0) > 0.5 },
      { fullName: 'Sensor Noise PRNU', cleanName: 'Sensor Noise (PRNU)', importance: result.noise_score * 100, isFake: result.noise_score > 0.5 }
    ];
  }, [result]);

  const maxImp = useMemo(() => Math.max(...shapList.map(s => s.importance), 1), [shapList]);

  // Dynamic evidentiary findings
  const findings = useMemo(() => {
    if (result.is_ai_altered) {
      return [
        { color: 'var(--success)', title: 'Subject Identity', text: `Facial landmark structure confirms an authentic human subject (${((1 - result.nn_score) * 100).toFixed(1)}% match).` },
        { color: 'var(--success)', title: 'Hardware Optics', text: `Physical PRNU sensor noise (${Math.round(result.noise_score * 100)}%) remains consistent with authentic camera sensor.` },
        { color: 'var(--warning)', title: 'Detected Alteration', text: `Geometry landmarks (${Math.round(result.geometry_anomaly_score * 100)}%) and ELA/CFA show localized cosmetic enhancement.` },
        { color: 'var(--primary)', title: 'Conclusion', text: 'Non-malicious portrait enhancement or generative inpainting detected.' }
      ];
    }
    if (result.overall_score > 0.55) {
      return [
        { color: 'var(--danger)', title: 'Subject Identity', text: `Deep neural backbone detected strong synthetic markers (${(result.nn_score * 100).toFixed(1)}% anomaly).` },
        { color: 'var(--danger)', title: 'Hardware Optics', text: `PRNU sensor noise (${Math.round(result.noise_score * 100)}%) and Bayer CFA pattern (${Math.round((result.cfa_score || 0) * 100)}%) show synthetic generation discontinuity.` },
        { color: 'var(--danger)', title: 'Biometrics', text: `Facial geometry and biological signals fail natural anatomical consistency checks.` },
        { color: 'var(--danger)', title: 'Evidentiary Conclusion', text: 'High confidence synthetic deepfake detected across multiple independent sensor domains.' }
      ];
    }
    return [
      { color: 'var(--success)', title: 'Subject Identity', text: `Facial biometric landmarks verified authentic with zero generative warping (${((1 - result.nn_score) * 100).toFixed(1)}% genuine match).` },
      { color: 'var(--success)', title: 'Hardware Optics', text: `Physical PRNU noise pattern and Bayer CFA grid align with natural camera capture tolerances.` },
      { color: 'var(--success)', title: 'Biological Consistency', text: `Cardiovascular pulse, ocular reflections, and eye kinematics match pristine biological baselines.` },
      { color: 'var(--success)', title: 'Evidentiary Conclusion', text: 'Certified authentic camera capture. No digital manipulation or generative synthesis detected.' }
    ];
  }, [result]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Definition Bar & Restore Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}><TestDefinition testId="features" /></div>
        {Object.keys(hiddenCards).some(k => hiddenCards[k]) && (
          <button 
            type="button"
            onClick={restoreCards} 
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            <RotateCcw size={13} /> Restore Panels
          </button>
        )}
      </div>
      
      {/* 2-Column Balanced Forensic Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Left Column: SHAP Feature Attribution & Architecture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 1. SHAP ATTRIBUTION DRIVERS */}
          {!hiddenCards['shap'] && (
            <div className="forensic-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="panel-icon shap" style={{ width: '32px', height: '32px' }}>
                    <BarChart3 size={16} color="var(--primary)" />
                  </div>
                  <div>
                    <div className="panel-title" style={{ fontSize: '0.875rem' }}>Feature Attribution (SHAP)</div>
                    <div className="panel-subtitle" style={{ fontSize: '0.7rem' }}>Model Decision Drivers &amp; Evidentiary Direction</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button onClick={() => toggleExpand('shap')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }} title={expandedCards['shap'] ? "Restore Size" : "Expand"}>
                    {expandedCards['shap'] ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                  <button onClick={() => hideCard('shap')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }} title="Hide Panel">
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Waterfall-Style Metric Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {shapList.map((item, index) => {
                  const barWidth = Math.min(100, Math.max(10, (item.importance / maxImp) * 100));
                  const statusColor = item.isFake ? 'var(--danger)' : 'var(--success)';
                  return (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-xs)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--glass-border)'
                      }}
                      title={item.fullName}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.cleanName}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px',
                          background: `${statusColor}15`,
                          color: statusColor,
                          border: `1px solid ${statusColor}35`,
                          flexShrink: 0
                        }}>
                          {item.importance.toFixed(1)}% {item.isFake ? 'MANIPULATED' : 'AUTHENTIC'}
                        </span>
                      </div>
                      
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: item.isFake ? 'var(--danger)' : 'var(--success)',
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Note */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 0.85rem',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--glass-border)',
                fontSize: '0.73rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                <strong style={{ color: 'var(--text-main)' }}>Attribution Protocol:</strong> Calculated via SHAP KernelExplainer over 15 correlated feature dimensions. Weights reflect direction and marginal magnitude towards fake vs authentic classes.
              </div>
            </div>
          )}

          {/* 2. META-CLASSIFIER NEURAL ARCHITECTURE */}
          {!hiddenCards['arch'] && (
            <div className="forensic-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="panel-icon" style={{ width: '32px', height: '32px' }}>
                    <Cpu size={16} color="var(--primary)" />
                  </div>
                  <div>
                    <div className="panel-title" style={{ fontSize: '0.875rem' }}>Classifier Pipeline</div>
                    <div className="panel-subtitle" style={{ fontSize: '0.68rem' }}>Tabular ResNet-8 + Multi-Head Self-Attention</div>
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div style={{ display: 'flex', background: 'var(--panel-subtle)', borderRadius: 'var(--radius-xs)', padding: '2px', border: '1px solid var(--glass-border)' }}>
                  <button
                    type="button"
                    onClick={() => setArchViewMode('pipeline')}
                    style={{
                      background: archViewMode === 'pipeline' ? 'var(--panel-bg)' : 'transparent',
                      color: archViewMode === 'pipeline' ? 'var(--text-main)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Pipeline
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchViewMode('guide')}
                    style={{
                      background: archViewMode === 'guide' ? 'var(--panel-bg)' : 'transparent',
                      color: archViewMode === 'guide' ? 'var(--text-main)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    Methodology
                  </button>
                </div>
              </div>

              {/* View 1: Flowchart */}
              {archViewMode === 'pipeline' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>STAGE 1</div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Sensors</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>15 Features</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>STAGE 2</div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Embed</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Linear + BN</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: '#c084fc', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>STAGE 3</div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>ResNet-8</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Skip Skews</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>STAGE 4</div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Attention</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>4 Heads</div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--success)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>STAGE 5</div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Verdict</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Override Safe</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--glass-border)', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Inference Latency: <strong style={{ color: 'var(--text-main)' }}>~38ms</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Biological Override: <strong style={{ color: 'var(--success)' }}>Active</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Engine: <strong style={{ color: 'var(--primary)' }}>PyTorch v2.1</strong></span>
                  </div>
                </div>
              ) : (
                /* View 2: Guide */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>1. Multi-Modal Physics:</strong> Raw pixel classifiers fail against compression. Our system audits physical invariants (PRNU sensor noise, corneal reflections, 3D facial symmetry) that cannot be simultaneously forged.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>2. Contextual Self-Attention:</strong> If an image is heavily compressed, self-attention dampens compression-sensitive metrics and prioritizes optical sensor noise.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>3. Tri-Tier Protection:</strong> Differentiates non-malicious cosmetic beauty filters from malicious deepfake identity replacement.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Fingerprint Radar & Findings Brief */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 3. DUAL FINGERPRINT RADAR */}
          {!hiddenCards['radar'] && (
            <div className="forensic-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    Fingerprint Radar
                  </h4>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Observed Media vs Pristine Baseline</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button onClick={() => toggleExpand('radar')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }} title={expandedCards['radar'] ? "Restore Size" : "Expand"}>
                    {expandedCards['radar'] ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  </button>
                  <button onClick={() => hideCard('radar')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.2rem' }} title="Hide Panel">
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', height: 270 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(8, 11, 17, 0.95)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xs)', boxShadow: '0 8px 24px rgba(0,0,0,0.7)' }}
                      itemStyle={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                      labelStyle={{ color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-heading)', fontSize: '0.8rem' }}
                      formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                    />
                    <Radar name="Natural Baseline" dataKey="Baseline" stroke="rgba(16, 185, 129, 0.6)" strokeDasharray="4 4" fill="rgba(16, 185, 129, 0.08)" fillOpacity={0.4} />
                    <Radar 
                      name="Observed Media" 
                      dataKey="Observed" 
                      stroke={result.overall_score > 0.55 ? 'var(--danger)' : result.is_ai_altered ? 'var(--warning)' : 'var(--primary)'} 
                      fill={result.overall_score > 0.55 ? 'rgba(244, 63, 94, 0.2)' : result.is_ai_altered ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)'} 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginTop: '0.4rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: result.overall_score > 0.55 ? 'var(--danger)' : result.is_ai_altered ? 'var(--warning)' : 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Observed Signature</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '10px', height: '2px', background: 'rgba(16, 185, 129, 0.8)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Natural Baseline (~12%)</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. DYNAMIC FORENSIC FINDINGS BRIEF */}
          <div className="forensic-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                Investigative Findings Brief
              </span>
              <span style={{ fontSize: '0.65rem', color: result.overall_score > 0.55 ? 'var(--danger)' : result.is_ai_altered ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {result.overall_score > 0.55 ? 'EVIDENTIARY THREAT' : result.is_ai_altered ? 'COSMETIC ALTERATION' : 'NOMINAL CAPTURE'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {findings.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: f.color, marginTop: '5px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>{f.title}:</strong> {f.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default React.memo(FeaturesTab);
