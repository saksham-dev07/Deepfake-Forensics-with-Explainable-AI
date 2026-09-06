import React from 'react';
import { 
  BrainCircuit, ScanSearch, Activity, Camera, Focus, Volume2, 
  Lightbulb, FileText, HeartPulse, Eye
} from 'lucide-react';

const FeaturesGrid = () => {
  return (
    <>
      <section className="how-it-works" style={{ marginTop: '2rem' }}>
        <div className="section-title" style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
          Forensic Verification Workflow
        </div>
        <div className="steps-grid">
          <div className="glass-panel step-card step-1">
            <div className="step-number mono-font">01</div>
            <div className="step-title" style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.5rem' }}>Stream Ingestion &amp; IQA</div>
            <div className="step-desc">Extract raw video keyframes via PySceneDetect, uncompressed 16 kHz PCM audio, and crop faces using MediaPipe 3D Mesh with KCF tracking.</div>
          </div>
          <div className="glass-panel step-card step-2">
            <div className="step-number mono-font">02</div>
            <div className="step-title" style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.5rem' }}>15-Sensor Parallel Audit</div>
            <div className="step-desc">A 4-worker concurrent pool evaluates 2D FFT/DCT spectra, PRNU sensor noise, CFA demosaicing, corneal highlights, and rPPG blood flow.</div>
          </div>
          <div className="glass-panel step-card step-3">
            <div className="step-number mono-font">03</div>
            <div className="step-title" style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.5rem' }}>Dual-Layer XAI Grounding</div>
            <div className="step-desc">Coarse Grad-CAM overlays and HDR-stretched Guided Grad-CAM expose microscopic warping seams and blending boundaries.</div>
          </div>
          <div className="glass-panel step-card step-4">
            <div className="step-number mono-font">04</div>
            <div className="step-title" style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.5rem' }}>Tabular ResNet Verdict</div>
            <div className="step-desc">A self-attention Meta-Classifier with rule-based biological overrides fuses all dimensions into a certified, court-ready PDF dossier.</div>
          </div>
        </div>
      </section>

      <section className="detailed-features" style={{ marginTop: '4rem', marginBottom: '3rem' }}>
        <div className="section-title" style={{ marginBottom: '2rem', textAlign: 'center', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-main)' }}>
          Forensic Detection Modules (15 Sensory Dimensions)
        </div>
        
        <div className="features-grid">
          {/* Feature 1 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Activity size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Spectral &amp; Frequency Analysis</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Real camera sensors capture high-frequency energy naturally. Evaluates <strong>2D FFT &amp; 2D Block DCT</strong> ($8\times 8$) with Hou &amp; Zhang spectral residual saliency and steep arctan switching noise filters ($h_x$) to detect high-frequency GAN spectral voids.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>Hou &amp; Zhang Spectral Residuals</li>
              <li>Vectorized 8x8 Block DCT Masks</li>
              <li>Radial Frequency Rolloff Metric</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Camera size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Sensor Noise (PRNU) &amp; ELA</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Physical CMOS sensors leave Photo-Response Non-Uniformity (PRNU). Extracts sensor noise via <strong>Non-Local Means (NLM)</strong> patch denoising and 2nd-order <strong>Spatial Rich Models (SRM)</strong>, alongside <strong>Error Level Analysis (ELA)</strong> at Q=95.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>Lukas PRNU Noise Formulation</li>
              <li>Non-Local Means Denoising Residuals</li>
              <li>JPEG Q=95 Error Level Analysis</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <ScanSearch size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>CFA Demosaicing &amp; Corneal Optics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Real digital images display a physical Bayer color filter array (CFA) grid. Applies a $3\times 3$ high-pass residual filter to isolate demosaicing grids, while evaluating corneal specular reflections in LAB color space via Normalized Cross-Correlation (NCC).
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>3x3 Bayer Residual Filter Matrix</li>
              <li>Ocular Highlight Convex Hull Containment</li>
              <li>Bilateral Corneal Reflection NCC</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Focus size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Face Geometry &amp; Optical Flow</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Extracts 468 3D facial landmarks with MediaPipe, solving for 3D head pose Euler angles via PnP, while measuring boundary gradient Sobel energy mismatch and temporal jitter via <strong>DIS Optical Flow</strong> (Variance of Variances Var(&sigma;<sub>t</sub><sup>2</sup>)).
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>PnP Head Pose Estimation (Yaw/Pitch/Roll)</li>
              <li>Dense Inverse Search (DIS) Optical Flow</li>
              <li>Boundary Gradient Sobel Mismatch</li>
            </ul>
          </div>

          {/* Feature 5 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <HeartPulse size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Cardiovascular rPPG Hemodynamics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Measures subcutaneous arterial blood volume pulse (BVP) micro-blushes in facial capillary beds. Uses 3-polygon anatomical masking (cheeks &amp; forehead), a 3rd-order zero-phase Butterworth filter (0.7-2.5 Hz), and CHROM orthogonal projection to compute spectral SNR.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>De Haan &amp; Jeanne (2013) CHROM Projection</li>
              <li>Zero-Phase Butterworth Passband (42-150 BPM)</li>
              <li>Fast Fourier Peak-to-Noise Ratio (SNR)</li>
            </ul>
          </div>

          {/* Feature 6 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Eye size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Eye Gaze &amp; 3D Lighting Physics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Monitors biological blink kinematics using <strong>Eye Aspect Ratio (EAR)</strong> temporal state machines (100-400 ms duration). Reconstructs 3D facial lighting via 9-coefficient real <strong>Spherical Harmonics (l &le; 2)</strong> and compares against background circular statistics.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>EAR Finite State Machine Blink Timing</li>
              <li>9-Coefficient Real Spherical Harmonics</li>
              <li>Sobel Background Circular Variance (1 - R)</li>
            </ul>
          </div>

          {/* Feature 7 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Volume2 size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Audio-Visual SyncNet &amp; Voice CNN</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              Evaluates lip-sync phoneme-viseme alignment in a 1024-D metric space via a dual-stream 3D-CNN (<strong>SyncNet</strong>). In parallel, an acoustic 2D-CNN with <strong>Depthwise Separable Convolutions</strong> inspects 128-mel spectrograms with a mobile microphone veto.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>Dual-Stream 1024-D Metric Space SyncNet</li>
              <li>Cubic Spline Audio De-Clipping Filter</li>
              <li>Mobile Domain-Shift Heuristic Safeguard</li>
            </ul>
          </div>

          {/* Feature 8 */}
          <div className="glass-panel feature-card-modern" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
            <div className="feature-card-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <BrainCircuit size={22} />
            </div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Tabular ResNet &amp; SHAP Explanations</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
              An 8-layer <strong>Tabular ResNet with 4-head Multi-Head Self-Attention</strong> trained on Class-Balanced Weighted Focal Loss fuses all 15 dimensional anomaly inputs into an empirical verdict, with rule-based XAI overrides for critical biological failures and SHAP explanations.
            </p>
            <ul style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '1.1rem', paddingTop: '1.25rem' }}>
              <li>Multi-Head Self-Attention Gating (4 Heads)</li>
              <li>Class-Balanced Weighted Focal Loss ($\gamma=2, \alpha=0.65$)</li>
              <li>KernelExplainer SHAP Directional Attribution</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
};

export default FeaturesGrid;
