import React from 'react';
import { Palette } from 'lucide-react';
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const ColorTab = ({
  result,
  getScoreColor,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon ela"><Palette size={20} color="var(--info)" /></div>
            <div>
              <div className="panel-title">Chrominance (Color Space) Analysis</div>
              <div className="panel-subtitle">Detection of GAN color bleeding and synthetic skin tones</div>
            </div>
          </div>
          
          <TestExplanation testId="color" explanation={result.color_analysis.explanation} />

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
    </>
  );
};

export default React.memo(ColorTab);
