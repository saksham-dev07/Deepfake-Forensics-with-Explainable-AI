import React, { useState } from 'react';
import { 
  Activity, Camera, ScanSearch, Focus, Volume2, 
  BrainCircuit, ChevronRight, Eye, ShieldCheck, HeartPulse
} from 'lucide-react';

const DOMAINS = [
  {
    id: 'neural',
    label: 'Deep Neural & XAI',
    icon: BrainCircuit,
    color: 'var(--primary)',
    summary: 'Feature attribution and spatial attention head isolating GAN warping seams.',
    specs: [
      { name: 'Visual Backbone', detail: 'EfficientNet-B4 compound scaled (380×380 px) with CBAM attention.' },
      { name: 'Dual-Layer Grad-CAM', detail: 'Macroscopic activation map hooked to 1792-channel conv_head.' },
      { name: 'Guided Inferno HDR', detail: 'Pixel-level backpropagation with 1st–99th percentile contrast expansion.' },
      { name: 'SHAP Value Attribution', detail: 'Game-theoretic marginal contribution scoring across all 15 dimensions.' }
    ]
  },
  {
    id: 'optics',
    label: 'Physical Optics & Noise',
    icon: Camera,
    color: '#38bdf8',
    summary: 'Sensor silicon non-uniformities and optical compression artifacts.',
    specs: [
      { name: 'Lukas PRNU Noise', detail: 'Photo-Response Non-Uniformity extracted via Non-Local Means patch filtering.' },
      { name: 'Error Level Analysis (ELA)', detail: 'JPEG Q=95 recompression matrix measuring localized compression delta.' },
      { name: 'Bayer CFA Demosaicing', detail: '3×3 high-pass demosaicing grid residuals isolating synthetic re-sampling.' },
      { name: 'Corneal Highlights NCC', detail: 'Normalized Cross-Correlation of ocular reflections under 3D lighting.' }
    ]
  },
  {
    id: 'biometrics',
    label: 'Biological & Kinematics',
    icon: HeartPulse,
    color: 'var(--success)',
    summary: 'Involuntary autonomic signals and biometric motion physics.',
    specs: [
      { name: 'Subcutaneous rPPG', detail: 'Remote photoplethysmography extracting blood volume pulse via CHROM projection.' },
      { name: '468 3D Mesh Tracking', detail: 'MediaPipe facial landmarks with PnP-solved 3D head pose Euler angles.' },
      { name: 'Eye Aspect Ratio (EAR)', detail: 'Blink duration and frequency dynamics identifying synthetic gaze stillness.' },
      { name: 'DIS Optical Flow', detail: 'Dense temporal vector field measuring spatial boundary jitter variance.' }
    ]
  },
  {
    id: 'spectral',
    label: 'Spectral & Acoustic',
    icon: Volume2,
    color: '#c084fc',
    summary: 'Frequency domain voids and multi-modal audio-visual synchronization.',
    specs: [
      { name: '2D FFT & 8×8 DCT', detail: 'Azimuthal radial integration detecting high-frequency GAN spectral voids.' },
      { name: 'SyncNet 1024-D Metric', detail: 'Audio-visual temporal offset distance between phonemes and mouth kinematics.' },
      { name: 'Voice Anti-Spoofing CNN', detail: 'Mel-frequency spectrogram depthwise CNN detecting vocoder phase artifacts.' },
      { name: 'Container Metadata Audit', detail: 'EXIF structure, codec profiles, and quantization tables validation.' }
    ]
  }
];

const FeaturesGrid = () => {
  const [activeDomain, setActiveDomain] = useState('neural');
  const current = DOMAINS.find(d => d.id === activeDomain) || DOMAINS[0];
  const CurrentIcon = current.icon;

  return (
    <div style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Sensory Architecture Specification
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginTop: '0.2rem' }}>
            15-Dimensional Forensic Inspection Framework
          </h2>
        </div>

        {/* Domain Switcher Pills */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          background: 'var(--panel-subtle)',
          padding: '0.3rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--glass-border)'
        }}>
          {DOMAINS.map(d => {
            const Icon = d.icon;
            const isActive = d.id === activeDomain;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDomain(d.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  background: isActive ? 'var(--panel-bg)' : 'transparent',
                  border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  fontFamily: 'inherit'
                }}
              >
                <Icon size={14} color={isActive ? d.color : 'var(--text-muted)'} />
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Domain Spec Card */}
      <div className="forensic-panel" style={{ padding: '1.75rem', background: 'var(--panel-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '8px',
            background: `${current.color}15`, border: `1px solid ${current.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: current.color
          }}>
            <CurrentIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {current.label} Specifications
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {current.summary}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem'
        }}>
          {current.specs.map((item, idx) => (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.85rem' }}>
                <ChevronRight size={13} color={current.color} />
                <span>{item.name}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '1.1rem' }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesGrid;
