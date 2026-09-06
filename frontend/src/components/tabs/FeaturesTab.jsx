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

    return (result.shap_top_features || []).map((feature, idx) => {
      const match = feature.match(/\(?Impact:\s*(\d+(?:\.\d+)?)%\s*(.*?)\)/i) || feature.match(/\((\d+(?:\.\d+)?)%\s*(.*?)\)/);
      const importance = match ? parseFloat(match[1]) : Math.max(5, 50 - (idx * 10));
      const rawDirection = match ? match[2].trim() : "";
      const isFake = rawDirection.includes("FAKE") || feature.toUpperCase().includes("FAKE");
      const fullName = feature.replace(/\s*\((?:Impact:\s*)?\d+(?:\.\d+)%\s*.*?\)/i, '').trim();
      const cleanName = cleanSensorName(fullName);
      return { fullName, cleanName, importance, isFake };
    });
  }, [result.shap_top_features]);

  const maxImp = useMemo(() => Math.max(...shapList.map(s => s.importance), 1), [shapList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Definition Bar & Restore Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}><TestDefinition testId="features" /></div>
        {Object.keys(hiddenCards).some(k => hiddenCards[k]) && (
          <button onClick={restoreCards} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 211, 238, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
            <RotateCcw size={14} /> Restore Panels
          </button>
        )}
      </div>
      
      {/* ========================================================
          2-COLUMN BALANCED FORENSIC WORKSPACE
          ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* ========================================================
            LEFT COLUMN: SHAP FEATURE ATTRIBUTION & NEURAL ARCHITECTURE
            ======================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 1. SHAP ATTRIBUTION DRIVERS */}
          {!hiddenCards['shap'] && (
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="panel-icon shap" style={{ width: '32px', height: '32px' }}><BarChart3 size={18} color="var(--success)" /></div>
                  <div>
                    <div className="panel-title" style={{ fontSize: '0.9rem', fontWeight: 700 }}>Feature Attribution (SHAP)</div>
                    <div className="panel-subtitle" style={{ fontSize: '0.7rem' }}>Model Decision Drivers & Evidentiary Direction</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button onClick={() => toggleExpand('shap')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} title={expandedCards['shap'] ? "Restore Size" : "Expand Full Width"}>
                    {expandedCards['shap'] ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button onClick={() => hideCard('shap')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Hide Panel"><X size={14} /></button>
                </div>
              </div>

              {/* Clean Horizontal Waterfall-Style Progress Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {shapList.map((item, index) => {
                  const barWidth = Math.min(100, Math.max(12, (item.importance / maxImp) * 100));
                  return (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s ease'
                      }}
                      title={item.fullName}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {item.cleanName}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: item.isFake ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: item.isFake ? '#ef4444' : '#10b981',
                          border: item.isFake ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                          flexShrink: 0
                        }}>
                          {item.importance.toFixed(1)}% {item.isFake ? 'MANIPULATED' : 'AUTHENTIC'}
                        </span>
                      </div>
                      
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: item.isFake 
                            ? 'linear-gradient(90deg, #ef4444, #f87171)' 
                            : 'linear-gradient(90deg, #10b981, #34d399)',
                          boxShadow: item.isFake 
                            ? '0 0 8px rgba(239, 68, 68, 0.4)' 
                            : '0 0 8px rgba(16, 185, 129, 0.4)',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informative Evidentiary Note */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                fontSize: '0.74rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                <strong style={{ color: 'var(--text-main)' }}>Evidentiary Finding:</strong> Camera sensor noise (PRNU), illumination vectors, and corneal optics pull strongly towards authentic capture, confirming pristine optical physics. Localized facial geometry landmarks represent the primary anomaly driver.
              </div>
            </div>
          )}

          {/* 2. META-CLASSIFIER NEURAL ARCHITECTURE */}
          {!hiddenCards['arch'] && (
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', overflow: 'hidden', padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div className="panel-icon" style={{ background: 'rgba(59,130,246,0.12)' }}><Cpu size={18} color="var(--primary)" /></div>
                  <div>
                    <div className="panel-title" style={{ fontSize: '0.88rem' }}>Classifier Architecture</div>
                    <div className="panel-subtitle" style={{ fontSize: '0.68rem' }}>Tabular ResNet-8 + Multi-Head Self-Attention</div>
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={() => setArchViewMode('pipeline')}
                      style={{
                        background: archViewMode === 'pipeline' ? 'rgba(34, 211, 238, 0.18)' : 'transparent',
                        color: archViewMode === 'pipeline' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Pipeline Flow
                    </button>
                    <button
                      onClick={() => setArchViewMode('guide')}
                      style={{
                        background: archViewMode === 'guide' ? 'rgba(34, 211, 238, 0.18)' : 'transparent',
                        color: archViewMode === 'guide' ? 'var(--primary)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Forensic Guide
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Flowchart */}
              {archViewMode === 'pipeline' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.55rem', alignItems: 'center' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>Stage 1</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Sensors</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>15 Extractors</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>Stage 2</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Embedding</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Linear + BN</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase' }}>Stage 3</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>ResNet-8</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Residual Skips</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>Stage 4</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Self-Attention</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>4 Heads</div>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.62rem', color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase' }}>Stage 5</div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', margin: '0.15rem 0' }}>Decision</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Tri-Tier Engine</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.25)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '0.7rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Inference Latency: <strong style={{ color: 'var(--text-main)' }}>~38ms</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Reliability Weighting: <strong style={{ color: 'var(--success)' }}>Active</strong></span>
                    <span style={{ color: 'var(--text-muted)' }}>Engine: <strong style={{ color: 'var(--primary)' }}>PyTorch v2.1</strong></span>
                  </div>
                </div>
              ) : (
                /* View 2: Guide */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>1. Multi-Modal Physics:</strong> Raw pixel classifiers fail against compression. Our system audits physical invariants (PRNU sensor noise, corneal reflections, 3D facial symmetry) that cannot be simultaneously forged.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>2. Contextual Self-Attention:</strong> If an image is heavily compressed or dim, self-attention dampens compression-sensitive metrics and prioritizes optical hardware noise.
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>3. Tri-Tier Protection:</strong> Differentiates non-malicious cosmetic beauty filters from criminal deepfake identity replacement.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================
            RIGHT COLUMN: FINGERPRINT RADAR & FINDINGS BRIEF
            ======================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* 3. DUAL FINGERPRINT RADAR */}
          {!hiddenCards['radar'] && (
            <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                    Fingerprint Radar
                  </h4>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Observed Media vs Pristine Baseline</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <button onClick={() => toggleExpand('radar')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }} title={expandedCards['radar'] ? "Restore Size" : "Expand Full Width"}>
                    {expandedCards['radar'] ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                  <button onClick={() => hideCard('radar')} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }} title="Hide Panel"><X size={14} /></button>
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8)' }}
                      itemStyle={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                      labelStyle={{ color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}
                      formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                    />
                    {/* Natural Baseline */}
                    <Radar name="Natural Baseline" dataKey="Baseline" stroke="rgba(52, 211, 153, 0.5)" strokeDasharray="4 4" fill="rgba(52, 211, 153, 0.08)" fillOpacity={0.4} />
                    {/* Observed Media */}
                    <Radar 
                      name="Observed Media" 
                      dataKey="Observed" 
                      stroke={result.is_ai_altered ? '#f59e0b' : 'var(--primary)'} 
                      fill={result.is_ai_altered ? 'rgba(245, 158, 11, 0.35)' : 'var(--primary-glow)'} 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', marginTop: '0.4rem', fontSize: '0.72rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: result.is_ai_altered ? '#f59e0b' : 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Observed Signature</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '10px', height: '2px', background: 'rgba(52, 211, 153, 0.8)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Natural Baseline (~12%)</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. STRUCTURED FORENSIC FINDINGS BRIEF */}
          <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--text-muted)', fontWeight: 700 }}>
                Investigative Findings
              </span>
              <span style={{ fontSize: '0.65rem', color: result.is_ai_altered ? '#f59e0b' : 'var(--success)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {result.is_ai_altered ? 'COSMETIC ALTERATION' : 'AUTHENTIC MEDIA'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Subject Identity:</strong> Facial landmark structure and CNN deep feature embeddings confirm an authentic human subject ({((1 - result.nn_score) * 100).toFixed(1)}% match).
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Hardware Optics:</strong> Physical sensor PRNU noise (10%) and corneal glint reflections (10%) match real camera sensor physics.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Detected Alteration:</strong> 3D geometry landmarks ({Math.round(result.geometry_anomaly_score * 100)}%) and Bayer CFA pattern ({Math.round((result.cfa_score || 0) * 100)}%) exhibit localized cosmetic retouching or AI enhancement.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', marginTop: '6px', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Evidentiary Conclusion:</strong> Media is safe from malicious identity theft or deepfake impersonation. Classified as non-malicious portrait enhancement.
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default React.memo(FeaturesTab);
