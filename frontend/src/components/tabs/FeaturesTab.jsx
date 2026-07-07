import React from 'react';
import { BarChart3, RotateCcw, X, Maximize2, Minimize2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import TestDefinition from '../ui/TestDefinition';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

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
  return (
    <>
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
                    <PolarGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8)' }}
                      itemStyle={{ color: 'var(--primary)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                      labelStyle={{ color: 'var(--text-main)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}
                      formatter={(value) => [`${value.toFixed(1)}%`, 'Anomaly Score']}
                    />
                    <Radar name="Anomaly" dataKey="A" stroke="var(--primary)" fill="var(--primary-glow)" fillOpacity={0.6} style={{ filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.5))' }} />
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
    </>
  );
};

export default React.memo(FeaturesTab);
