import React from 'react';
import { Shield, CheckCircle2, Cpu, FileCheck } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="workbench-header">
      <div className="workbench-badge">
        <Shield size={13} />
        <span>Forensic Verification Engine • v2.4</span>
      </div>

      <h1 className="workbench-title">
        Media Authenticity &amp; Explainable Forensics
      </h1>

      <p className="workbench-description">
        Enterprise multi-sensory forensic pipeline for digital media verification. Deconstructs uploaded video and imagery across 15 physical, biological, spectral, and neural dimensions to produce court-admissible evidence.
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        marginTop: '1.25rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={14} color="var(--success)" />
          <span>Daubert Admissibility Ready</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
          <Cpu size={14} color="var(--primary)" />
          <span>15 Parallel Forensic Sensors</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
          <FileCheck size={14} color="var(--accent)" />
          <span>Dual Grad-CAM &amp; SHAP Grounding</span>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
