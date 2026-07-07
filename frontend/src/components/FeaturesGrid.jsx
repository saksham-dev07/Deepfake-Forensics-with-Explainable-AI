import React from 'react';
import { 
  BrainCircuit, ScanSearch, Activity, Camera, Focus, Volume2, 
  Lightbulb, FileText 
} from 'lucide-react';

const FeaturesGrid = () => {
  return (
    <>

      <section className="how-it-works">
        <div className="section-title outfit-font" style={{ fontWeight: 800 }}>How It Works</div>
        <div className="steps-grid">
          <div className="glass-panel step-card step-1">
            <div className="step-number mono-font">01</div>
            <div className="step-title outfit-font">Upload Media</div>
            <div className="step-desc">Upload any video or image file for analysis. Supports all major media formats.</div>
          </div>
          <div className="glass-panel step-card step-2">
            <div className="step-number mono-font">02</div>
            <div className="step-title outfit-font">Multi-Modal AI Engine</div>
            <div className="step-desc">15 distinct AI sensors extract visual, temporal, and biological anomalies. The PyTorch Meta-Classifier computes the final verdict.</div>
          </div>
          <div className="glass-panel step-card step-3">
            <div className="step-number mono-font">03</div>
            <div className="step-title outfit-font">XAI Explanations</div>
            <div className="step-desc">GradCAM heatmaps and SHAP features explain exactly why the AI flagged manipulation.</div>
          </div>
          <div className="glass-panel step-card step-4">
            <div className="step-number mono-font">04</div>
            <div className="step-title outfit-font">Forensic Report</div>
            <div className="step-desc">Download a comprehensive PDF report with visual evidence suitable for court proceedings.</div>
          </div>
        </div>
      </section>

      <section className="detailed-features" style={{ marginTop: '5rem', marginBottom: '4rem' }}>
        <div className="section-title outfit-font" style={{ marginBottom: '3rem', textAlign: 'center', fontWeight: 800 }}>How We Detect Deepfakes</div>
        
        <div className="features-grid">
          {/* Feature 1 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <Activity size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Spectral & Frequency Analysis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Real cameras capture high frequencies naturally. AI generators produce mathematically "smooth" pixels. We use <strong>FFT</strong> and <strong>DCT</strong> to detect this unnatural lack of high-frequency energy.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.2rem', paddingTop: '1.5rem' }}>
              <li>Switching Noise (SWN) Filters</li>
              <li>8x8 Block DCT Disruption</li>
              <li>Phase Spectrum Anomalies</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(192, 132, 252, 0.1)', color: 'var(--accent)', border: '1px solid rgba(192, 132, 252, 0.2)' }}>
              <ScanSearch size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--accent)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Hardware Noise & ELA</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Images have a baked-in Bayer filter pattern (CFA) and uniform JPEG compression. We analyze <strong>Error Level Analysis (ELA)</strong> and missing <strong>CFA Artifacts</strong> to expose splicing.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.2rem', paddingTop: '1.5rem' }}>
              <li>Error Level Analysis (ELA)</li>
              <li>Color Filter Array (CFA) Democaising</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <Focus size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--warning)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Face Geometry & Temporal Jitter</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              We track 468 facial landmarks across every frame to measure micro-jitters, unnatural head pose variations, and blinking anomalies that human eyes cannot detect.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.2rem', paddingTop: '1.5rem' }}>
              <li>Landmark Jitter Detection</li>
              <li>Farneback Dense Optical Flow</li>
              <li>Eye Aspect Ratio (EAR) Blink Tracking</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(129, 140, 248, 0.1)', color: 'var(--secondary)', border: '1px solid rgba(129, 140, 248, 0.2)' }}>
              <Volume2 size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--secondary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Audio CNN & SyncNet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              We process audio through a lightweight <strong>PyTorch 2D-CNN</strong> to calculate voice spoofing probability, while measuring lip-sync desynchronization using a dual-stream <strong>SyncNet</strong>.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <BrainCircuit size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Biological Signals (rPPG)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Real humans have a micro-pulse that changes facial skin tone slightly with every heartbeat. AI struggles to synthesize this coherent <strong>remote Photoplethysmography (rPPG)</strong> signal.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
              <Lightbulb size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: '#ec4899', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Corneal Specular Reflection</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              The lighting environments reflected in the left and right corneas must match perfectly. We analyze these 2D specular reflections to identify inconsistencies generated by GANs/Diffusion models.
            </p>
          </div>

          {/* Feature 7 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <FileText size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>EXIF & Metadata Forensics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              We automatically extract and analyze the EXIF payload, detecting manipulation software signatures (Photoshop, Stable Diffusion), stripped metadata, and suspicious timestamps.
            </p>
          </div>

          {/* Feature 8 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <BrainCircuit size={24} />
            </div>
            <h3 className="outfit-font" style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>PyTorch AI Meta-Classifier</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Instead of rigid thresholds, a fully trained Multi-Layer Perceptron (MLP) evaluates all 15 visual, biological, and acoustic sensors to determine an ironclad, explainable final verdict.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default FeaturesGrid;
