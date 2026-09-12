import React from 'react';
import { 
  BrainCircuit, ScanSearch, Activity, Camera, Focus, Volume2
} from 'lucide-react';

const SENSORS = [
  { icon: BrainCircuit, title: 'Core Ensemble', value: '15-Sensor Meta', sub: 'Tabular ResNet + Attention' },
  { icon: ScanSearch, title: 'Attribution XAI', value: 'Grad-CAM & SHAP', sub: 'Coarse & Guided Inferno HDR' },
  { icon: Activity, title: 'Spectral Decomp', value: '2D FFT & 8x8 DCT', sub: 'Azimuthal Residual Saliency' },
  { icon: Camera, title: 'Physical Optics', value: 'PRNU Noise & ELA', sub: 'NLM Denoising & Q=95 Matrix' },
  { icon: Focus, title: 'Biometrics', value: '468 Landmarks', sub: 'MediaPipe & DIS Optical Flow' },
  { icon: Volume2, title: 'Audio-Visual', value: 'SyncNet 1024-D', sub: 'Lip Dynamics & Vocoder CNN' },
];

const StatsGrid = () => {
  return (
    <div className="stats-grid">
      {SENSORS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div key={idx} className="stat-card">
            <div className="stat-card-header">
              <Icon size={13} color="var(--primary)" />
              <span>{s.title}</span>
            </div>
            <div className="stat-card-value mono-font">
              {s.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {s.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
