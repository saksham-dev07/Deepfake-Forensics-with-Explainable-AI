import React from 'react';
import { 
  BrainCircuit, ScanSearch, Activity, Camera, Focus, Volume2
} from 'lucide-react';

const SENSORS = [
  { icon: BrainCircuit, title: 'Core Ensemble', value: '15-Feature ML', sub: '8-Layer Tabular ResNet' },
  { icon: ScanSearch, title: 'Explainability', value: 'GradCAM & SHAP', sub: 'Coarse & Guided Inferno HDR' },
  { icon: Activity, title: 'Spectral Analysis', value: 'FFT & DCT', sub: 'Hou & Zhang Saliency' },
  { icon: Camera, title: 'Sensor Noise', value: 'PRNU Extractor', sub: 'NLM Denoising & SRM' },
  { icon: Focus, title: 'Temporal Stability', value: 'Geometry Tracking', sub: 'MediaPipe & DIS Optical Flow' },
  { icon: Volume2, title: 'Audio-Visual', value: 'SyncNet & Voice CNN', sub: '1024-D Metric & Mel-Spec' },
];

const StatsGrid = () => {
  return (
    <div className="stats-grid">
      {SENSORS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div key={idx} className="stat-card">
            <div className="stat-card-header">
              <Icon size={14} color="var(--primary)" /> {s.title}
            </div>
            <div className="stat-card-value mono-font" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {s.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
