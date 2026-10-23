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
        Inspect images and videos for signs of manipulation. Compare forensic signals, explore visual explanations, and export a report for further review.
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
          <span>Reviewable findings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
          <Cpu size={14} color="var(--primary)" />
          <span>15 forensic signals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
          <FileCheck size={14} color="var(--accent)" />
          <span>Visual explanations</span>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
