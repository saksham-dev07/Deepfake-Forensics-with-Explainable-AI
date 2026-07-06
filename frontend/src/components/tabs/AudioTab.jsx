import React from 'react';
import { Volume2 } from 'lucide-react';

import TestExplanation from '../ui/TestExplanation';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const AudioTab = ({
  result,
}) => {
  return (
    <>
        <div className="glass-panel analysis-panel" style={{ marginBottom: '2rem' }}>
          <div className="panel-header">
            <div className="panel-icon" style={{ background: 'rgba(52,211,153,0.12)' }}><Volume2 size={20} color="var(--warning)" /></div>
            <div>
              <div className="panel-title">Audio-Visual Synchronization (Native 3D-CNN SyncNet)</div>
              <div className="panel-subtitle">Measuring sub-millisecond lip-sync distance (LSE-D)</div>
            </div>
          </div>
          
          <TestExplanation testId="audio" explanation={result.sync_analysis.explanation} />

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
    </>
  );
};

export default React.memo(AudioTab);
