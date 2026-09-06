import React from 'react';
import { Shield } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="hero-section-clean" style={{ textAlign: 'left', padding: '1rem 0 0 0' }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        padding: '0.3rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--primary)',
        marginBottom: '1.25rem'
      }}>
        <Shield size={14} />
        Forensic Media Inspection Suite • v2.4
      </div>

      <h1 style={{
        fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
        fontWeight: 700,
        lineHeight: 1.15,
        letterSpacing: '-0.03em',
        marginBottom: '1rem',
        color: 'var(--text-main)'
      }}>
        Deepfake Detection &amp; Explainable AI
      </h1>

      <p style={{
        fontSize: '0.975rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        marginBottom: '0.5rem'
      }}>
        An enterprise-grade forensic engine for verifying image and video authenticity. 
        Combines 15 specialized spatial, frequency, hardware, and biological sensors with dual-layer Grad-CAM and SHAP visual evidence heatmaps.
      </p>
    </section>
  );
};

export default HeroSection;
