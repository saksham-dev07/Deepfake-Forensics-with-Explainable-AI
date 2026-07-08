import React from 'react';
import { Lock } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="hero hero-desktop-align" style={{ position: 'relative', textAlign: 'center', padding: '5rem 1rem 3rem 1rem' }}>
      {/* Ambient Deep Space Glow - Replaced with dynamic floating orbs */}
      <div className="floating-orb orb-primary"></div>
      <div className="floating-orb orb-accent"></div>
      
      {/* Live Status Badge */}
      <div className="hero-badge fade-in-stagger" style={{ animationDelay: '0.1s', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', backdropFilter: 'blur(10px)', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
          <div style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse-glow 2s infinite' }}></div>
        </div>
        Court-Grade Forensic Analysis
      </div>

      {/* Massive Gradient Title (Animation removed to prevent Chromium WebkitBackgroundClip rendering bug) */}
      <h1 className="outfit-font" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
        Deepfake Detection<br />
        <span className="text-gradient">with Explainable AI</span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle fade-in-stagger" style={{ animationDelay: '0.3s', fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
        An enterprise-grade, multi-modal pipeline for synthetic media detection. 
        Upload any video or image to generate comprehensive visual evidence and a court-ready PDF report.
      </p>
    </section>
  );
};

export default HeroSection;
