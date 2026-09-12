import React from 'react';
import { Palette, Info, ZoomIn } from 'lucide-react';
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import TestExplanation from '../ui/TestExplanation';
import { API_BASE } from '../../constants/api';

const ColorTab = ({
  result = {},
  getScoreColor = () => 'var(--primary)',
  setZoomedImage = () => {},
}) => {
  const data = result.color_analysis || {};
  const score = typeof result.color_score === 'number' 
    ? result.color_score 
    : (typeof data.color_score === 'number' 
        ? data.color_score 
        : (typeof data.anomaly_score === 'number' ? data.anomaly_score : 0));

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const chartData = [
    { name: 'Cb (Blue-Diff)', variance: data.cb_variance ?? 0 },
    { name: 'Cr (Red-Diff)', variance: data.cr_variance ?? 0 },
    { name: 'Saturation', variance: data.s_variance ?? 0 },
    { name: 'LAB (a* Channel)', variance: data.a_variance ?? 0 }
  ];

  const channels = [
    { key: 'cb_map_path', name: 'YCbCr: Cb (Blue Chrominance)', path: data.cb_map_path, desc: 'Isolates blue-difference variance across facial boundary' },
    { key: 'cr_map_path', name: 'YCbCr: Cr (Red Chrominance)', path: data.cr_map_path, desc: 'Isolates red-difference flush and capillary distribution' },
    { key: 's_map_path', name: 'HSV: Saturation Variance', path: data.s_map_path, desc: 'Reveals unnatural saturation discontinuities in skin' },
    { key: 'a_map_path', name: 'LAB: a* Channel (Blood Perfusion)', path: data.a_map_path, desc: 'Perceptual green-red opponent channel for vital flow' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={18} color="var(--info)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                Chrominance &amp; Multi-Colorspace Analysis
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Detection of GAN color bleeding, synthetic skin tone banding, and sub-surface scattering failure
              </div>
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Sensor: YCbCr / HSV / CIE-LAB
          </span>
        </div>

        {data.explanation && <TestExplanation testId="color" explanation={data.explanation} />}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          {/* Chrominance Map Channels */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Decomposed Chrominance Projections
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {channels.map((ch) => {
                const imgUrl = resolveImg(ch.path);
                return (
                  <div key={ch.key} style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ch.name}
                    </div>
                    <div 
                      className="zoomable-image-container"
                      onClick={() => imgUrl && setZoomedImage(imgUrl)}
                      style={{ height: '140px', background: '#05070a', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {imgUrl ? (
                        <img src={imgUrl} alt={ch.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', padding: '0.5rem' }}>
                          Channel Map Rendered
                        </div>
                      )}
                      <div className="zoom-overlay"><ZoomIn size={18} /></div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.3 }}>
                      {ch.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variance Metrics and Bar Chart */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Channel Variance Distribution
            </div>

            <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 180, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 15, left: 25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} width={80} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#0d121c', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '0.75rem' }} 
                      formatter={(val) => [typeof val === 'number' ? val.toFixed(4) : val, 'Variance']} 
                    />
                    <Bar dataKey="variance" fill="var(--info)" radius={[0, 3, 3, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Color Anomaly Index
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Spectral gamut mismatch rating
                  </div>
                </div>
                <div className="tabular-num mono-font" style={{ fontSize: '1.4rem', fontWeight: 800, color: getScoreColor(score) }}>
                  {(score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Info size={13} style={{ flexShrink: 0 }} />
              <span>Real skin tones reflect consistent melanin absorption across RGB and CIE-LAB axes. Synthetic faces exhibit chromatic shifts at boundary seams.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ColorTab);
