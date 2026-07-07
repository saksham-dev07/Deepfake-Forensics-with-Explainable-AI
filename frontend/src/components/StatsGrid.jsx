import React from 'react';
import { 
  BrainCircuit, ScanSearch, Activity, Camera, Focus, Volume2
} from 'lucide-react';

const StatsGrid = () => {
  return (
    <div className="stats-grid">
      <div className="stat-card glass-panel fade-in-stagger" style={{ animationDelay: '0.4s' }}>
        <div className="stat-card-header">
          <BrainCircuit size={16} className="stat-card-icon" /> Core Engine
        </div>
        <div className="stat-card-value mono-font">PyTorch Meta-Classifier</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>15-Feature ML Ensemble</div>
      </div>
      <div className="stat-card glass-panel fade-in-stagger" style={{ animationDelay: '0.5s' }}>
        <div className="stat-card-header">
          <ScanSearch size={16} className="stat-card-icon" style={{ color: 'var(--primary)' }} /> Explainability
        </div>
        <div className="stat-card-value mono-font">GradCAM & SHAP</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Visual Evidence Heatmaps</div>
      </div>
      <div className="stat-card glass-panel fade-in-stagger" style={{ animationDelay: '0.6s' }}>
        <div className="stat-card-header">
          <Activity size={16} className="stat-card-icon" style={{ color: 'var(--danger)' }} /> Signal Analysis
        </div>
        <div className="stat-card-value mono-font">Frequency & ELA</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>DCT & Compression Analysis</div>
      </div>
      <div className="stat-card glass-panel fade-in-stagger" style={{ animationDelay: '0.7s' }}>
        <div className="stat-card-header">
          <Camera size={16} className="stat-card-icon" style={{ color: '#a855f7' }} /> Sensor Forensics
        </div>
        <div className="stat-card-value mono-font">PRNU Extraction</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Camera Noise Fingerprinting</div>
      </div>
      <div className="stat-card glass-panel fade-in-stagger" style={{ animationDelay: '0.8s' }}>
        <div className="stat-card-header">
          <Focus size={16} className="stat-card-icon" style={{ color: 'var(--warning)' }} /> Temporal
        </div>
        <div className="stat-card-value mono-font">Face Geometry</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frame-by-frame Jitter Tracking</div>
      </div>
      <div className="stat-card glass-panel fade-in-stagger" style={{ animationDelay: '0.9s' }}>
        <div className="stat-card-header">
          <Volume2 size={16} className="stat-card-icon" style={{ color: 'var(--secondary)' }} /> Audio-Visual
        </div>
        <div className="stat-card-value mono-font">PyTorch 2D-CNN</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Anti-Spoofing & SyncNet</div>
      </div>
    </div>
  );
};

export default StatsGrid;
