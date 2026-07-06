import React from 'react';
import { Activity, Camera, BarChart3, Info, Lightbulb, ChevronUp, ChevronDown, ZoomIn } from 'lucide-react';
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import VerdictBadge from '../ui/VerdictBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FrequencyTab = ({
  result,
  getScoreColor,
  setZoomedImage,
  showFullSpectralInfo,
  setShowFullSpectralInfo,
}) => {
  return (
    <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Info Callout */}
          <div className="info-callout">
            <div className="info-callout-icon"><Lightbulb size={20} color="var(--warning)" /></div>
            <div className="info-callout-content">
              <h4>How Spectral & Frequency Analysis Works</h4>
              <p style={{ marginBottom: showFullSpectralInfo ? '1rem' : '0' }}>
                Frequency analysis mathematically decomposes an image into its constituent wave frequencies. Real cameras capture a natural balance of <strong>low frequencies</strong> (smooth gradients like skin) and <strong>high frequencies</strong> (sharp edges, pores, and natural sensor noise). AI-generated deepfakes often struggle to reproduce this microscopic high-frequency detail, resulting in an image that is mathematically "too smooth" at the pixel level.
              </p>
              
              {showFullSpectralInfo && (
                <>
                  <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '0 0 1rem 0' }}>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>FFT (Fast Fourier Transform):</strong> Converts the image into a 2D spectrum map. The bright center represents low-frequency energy (smooth areas), while the outer rings represent high-frequency detail (sharp edges). A deepfake often lacks energy in the outer rings.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>DCT (Discrete Cosine Transform):</strong> Similar to FFT, but used heavily in JPEG compression. We analyze the grid of DCT coefficients (top-left is low frequency, bottom-right is high frequency) to look for unnatural quantization or missing high-frequency coefficients typical of GAN generation.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>High-Freq Energy Ratio:</strong> A direct mathematical measurement of how much energy exists in the high frequencies compared to the total image energy. Very low numbers (like 0.001%) usually mean the image is extremely compressed or synthetically smoothed by AI.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>PCA (Principal Component Analysis):</strong> Inspired by satellite hyperspectral imaging, we mathematically separate the image's Red, Green, and Blue color channels into their "Principal Components." The 3rd component (PC3) holds the least natural image variance, meaning it is where <strong>hidden GAN artifacts and artificial generation residuals</strong> are trapped. PC3 acts as a forensic microscope!
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>High-Pass Spatial Filter:</strong> Mathematically deletes the low frequencies (smooth skin tones, lighting) via Inverse FFT, completely isolating high-frequency edges and noise. Deepfake blending borders light up brilliantly here.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Phase Spectrum:</strong> Visualizes the structural phase angle of the FFT. Spliced face-swaps break the continuous phase coherence of the original photograph, causing visible structural anomalies.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>8x8 Block DCT High-Frequency Map:</strong> Computes the DCT on every 8x8 pixel block independently. Deepfake generation and splicing disrupt the natural JPEG 8x8 grid, causing a glowing mismatch in localized frequency energy.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Switching Noise Estimator (SWN):</strong> Based on the Ranjbaran et al. filtering algorithm, this technique specifically isolates high-frequency noise by finding zero-crossings in the mathematical gradient of the image. By mathematically suppressing physical edges (like jawlines or glasses), the SWN isolates pure generation noise, lighting up deepfake splicing seams like a neon sign.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Cepstrum Echo Analysis:</strong> The "spectrum of a spectrum." Resizing or rotating a pasted fake face leaves microscopic periodic interpolation echoes in the image, which show up as bright stars in the Cepstrum domain.
                    </li>
                    <li>
                      <strong style={{ color: 'var(--text-primary)' }}>Discrete Wavelet Transform (DWT):</strong> Decomposes the image into high-frequency local details. We isolate the "Diagonal Details" (HH) channel because AI generators notoriously fail to synthesize consistent diagonal noise compared to real cameras.
                    </li>
                  </ul>
                  
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <em>Note: Blurry or low-quality laptop webcam photos will naturally have low high-frequency energy due to built-in camera denoising, which is why our XAI engine cross-references multiple sensors!</em>
                  </p>
                </>
              )}
              
              <button 
                onClick={() => setShowFullSpectralInfo(!showFullSpectralInfo)}
                style={{
                  background: 'none', border: 'none', color: 'var(--primary-color)',
                  cursor: 'pointer', padding: 0, marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}
              >
                {showFullSpectralInfo ? <>Show Less <ChevronUp size={14} /></> : <>Read More Detailed Breakdown <ChevronDown size={14} /></>}
              </button>
            </div>
          </div>

          {/* Quantitative Metrics Summary */}
          <div className="glass-panel analysis-panel" style={{ padding: '1.5rem', borderLeft: '4px solid ' + (result.frequency_analysis.spectral_anomaly_score > 0.6 ? 'var(--danger)' : result.frequency_analysis.spectral_anomaly_score > 0.4 ? 'var(--warning)' : 'var(--success)') }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={20} color="var(--primary)" /> Spectral & Frequency Metrics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Spectral Anomaly</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: result.frequency_analysis.spectral_anomaly_score > 0.6 ? 'var(--danger)' : 'var(--success)' }}>
                  {(result.frequency_analysis.spectral_anomaly_score * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Higher = Likely Synthetic</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>High-Freq Energy Ratio</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {result.frequency_analysis.high_freq_energy_ratio.toExponential(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Expected: {'>'} 1e-3 for real photos</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RGB Cross-Channel Variance</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: result.frequency_analysis.channel_variance > 0.01 ? 'var(--warning)' : 'var(--text-primary)' }}>
                  {result.frequency_analysis.channel_variance < 0.0001 ? result.frequency_analysis.channel_variance.toExponential(2) : result.frequency_analysis.channel_variance.toFixed(4)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>High variance = GAN artifact</div>
              </div>
            </div>
          </div>

          {/* Beginner-Friendly Visualizations Grid */}
          <div className="analysis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(234,88,12,0.12)' }}><Camera size={20} color="#ea580c" /></div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Switching Noise (SWN) <span style={{fontSize: '0.7rem', background: 'var(--success)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: '#000'}}>Beginner Friendly</span></div>
                    <div className="panel-subtitle">Zero-crossing artifact detector mapped onto original image</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.swn} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.swn_noise_path}`)}
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                >
                  <img
                    src={result.frequency_analysis.swn_noise_path ? `${API_BASE}/${result.frequency_analysis.swn_noise_path}` : '/gradcam-mockup.png'}
                    alt="Switching Noise SWN"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div className="heatmap-legend" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>The easiest way to spot fakes: pure AI generation noise and deepfake splicing seams light up brightly here, directly superimposed on the original video frame.</span>
              </div>
            </div>
            
            <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>🧱</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">8x8 Block DCT High-Frequency Map <span style={{fontSize: '0.7rem', background: 'var(--success)', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: '#000'}}>Beginner Friendly</span></div>
                    <div className="panel-subtitle">Localized JPEG grid anomaly detection mapped onto original image</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.block_dct} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.block_dct_path}`)}
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.block_dct_path}`}
                    alt="Block DCT Artifacts"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div className="heatmap-legend" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>Visualizes the high-frequency energy of every 8x8 block. Artificial face splicing often disrupts the natural grid, creating a glowing mismatch against the background.</span>
              </div>
            </div>
          </div>

          <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
            Advanced Mathematical Spectra
          </h4>

          {/* Visualizations Grid */}
          <div className="analysis-grid">
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(34,211,238,0.12)' }}><Activity size={20} color="var(--primary)" /></div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">FFT Magnitude Spectrum</div>
                    <div className="panel-subtitle">Frequency domain representation</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.fft} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.fft_magnitude_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.fft_magnitude_path}`}
                    alt="FFT Magnitude Spectrum"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Bright center = low-freq energy. Outer ring = high-freq detail.
              </div>
            </div>

            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(129,140,248,0.12)' }}>🌊</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">DCT Spectrum</div>
                    <div className="panel-subtitle">Discrete Cosine Transform coefficients</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.dct} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.dct_spectrum_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.dct_spectrum_path}`}
                    alt="DCT Spectrum"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Top-left = lowest freq. Bottom-right = highest freq.
              </div>
            </div>
          </div>
          


          <div className="analysis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(1, 1fr)' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(255,255,255,0.12)' }}>🕸️</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Spectral Residual Saliency (GAN Checkerboard)</div>
                    <div className="panel-subtitle">Inverse FFT of frequency residuals to expose Transpose Convolution grids</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.saliency} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.saliency_map_path}`)}
                  style={{ maxWidth: '600px', margin: '0 auto' }}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.saliency_map_path}`}
                    alt="Spectral Residual Saliency Map"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
              <div className="heatmap-legend" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                <span className="heatmap-legend-icon"><Info size={16} color="var(--text-secondary)" /></span>
                <span>Real photos show smooth natural edges. Deepfakes generated by GANs/Diffusion models often exhibit a distinct, microscopic checkerboard grid across the entire face.</span>
              </div>
            </div>
          </div>

          <div className="analysis-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(236,72,153,0.12)' }}>⚡</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">High-Pass Filter</div>
                    <div className="panel-subtitle">Blending artifacts</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.high_pass} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.high_pass_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.high_pass_path}`}
                    alt="High Pass Filter"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
            </div>

            <div className="glass-panel analysis-panel">
              <div className="panel-header">
                <div className="panel-icon" style={{ background: 'rgba(52,211,153,0.12)' }}>🌀</div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="panel-title">Phase Spectrum</div>
                    <div className="panel-subtitle">Structural phase discontinuities</div>
                  </div>
                  {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.phase} />}
                </div>
              </div>
              <div className="heatmap-container">
                <div 
                  className="zoomable-image-container"
                  onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.phase_spectrum_path}`)}
                >
                  <img
                    src={`${API_BASE}/${result.frequency_analysis.phase_spectrum_path}`}
                    alt="Phase Spectrum"
                    className="heatmap-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="zoom-overlay"><ZoomIn size={32} /></div>
                </div>
              </div>
            </div>


          </div>

          {/* PCA & Advanced Visualizations */}
          {result.frequency_analysis.pca_spectrum_path && (
            <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {/* PCA Panel */}
              <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(167,139,250,0.12)' }}>🔬</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="panel-title">PCA Spectral Component</div>
                      <div className="panel-subtitle">Hidden periodic artifacts (PC3)</div>
                    </div>
                    {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.pca} />}
                  </div>
                </div>
                <div className="heatmap-container" style={{ flex: 1 }}>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.pca_spectrum_path}`)}
                  >
                    <img
                      src={`${API_BASE}/${result.frequency_analysis.pca_spectrum_path}`}
                      alt="PCA Spectrum"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>3rd Principal Component — reveals GAN residuals</div>
                </div>
              </div>

              {/* Cepstrum Panel */}
              <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>📡</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="panel-title">Cepstrum Echoes</div>
                      <div className="panel-subtitle">Detects resizing and rotation</div>
                    </div>
                    {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.cepstrum} />}
                  </div>
                </div>
                <div className="heatmap-container" style={{ flex: 1 }}>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => {
                      if (result.frequency_analysis.cepstrum_path) {
                        setZoomedImage(`${API_BASE}/${result.frequency_analysis.cepstrum_path}`);
                      }
                    }}
                  >
                    {result.frequency_analysis.cepstrum_path ? (
                      <img
                        src={`${API_BASE}/${result.frequency_analysis.cepstrum_path}`}
                        alt="Cepstrum Analysis"
                        className="heatmap-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--text-muted)' }}>
                        <p>Visualization unavailable</p>
                      </div>
                    )}
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bright spikes indicate synthetic resampling</div>
                </div>
              </div>

              {/* DWT Panel */}
              <div className="glass-panel analysis-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-header">
                  <div className="panel-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>🌊</div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="panel-title">DWT 4-Band Decomposition</div>
                      <div className="panel-subtitle">Wavelet (LL, LH, HL, HH) extraction</div>
                    </div>
                    {result.frequency_analysis?.verdicts && <VerdictBadge verdict={result.frequency_analysis.verdicts.dwt} />}
                  </div>
                </div>
                <div className="heatmap-container" style={{ flex: 1 }}>
                  <div 
                    className="zoomable-image-container"
                    onClick={() => setZoomedImage(`${API_BASE}/${result.frequency_analysis.dwt_diagonal_path}`)}
                  >
                    <img
                      src={result.frequency_analysis.dwt_diagonal_path ? `${API_BASE}/${result.frequency_analysis.dwt_diagonal_path}` : '/gradcam-mockup.png'}
                      alt="DWT Analysis"
                      className="heatmap-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="zoom-overlay"><ZoomIn size={32} /></div>
                  </div>
                  <div className="image-caption" style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analyzes localized HH diagonal high-frequencies</div>
                </div>
              </div>
              
              {/* Advanced Metrics Table replaced with Recharts */}
              <div className="glass-panel analysis-panel" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="panel-header" style={{ marginBottom: 0 }}>
                  <div className="panel-icon"><Activity size={20} color="var(--primary)" /></div>
                  <div className="panel-title">Advanced Frequency Distribution</div>
                </div>
                <div style={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={[
                      { name: 'HF Energy', value: result.frequency_analysis.high_freq_energy_ratio * 100 },
                      { name: 'Red HF', value: (result.frequency_analysis.channel_hf_ratios?.[0] || 0) * 100 },
                      { name: 'Green HF', value: (result.frequency_analysis.channel_hf_ratios?.[1] || 0) * 100 },
                      { name: 'Blue HF', value: (result.frequency_analysis.channel_hf_ratios?.[2] || 0) * 100 },
                      { name: 'PC3 Var', value: (result.frequency_analysis.pc3_variance_ratio || 0) * 100 }
                    ]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)'}} />
                      <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(val) => [`${val.toFixed(2)}%`, 'Variance Ratio']} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                   <span style={{ color: 'var(--text-secondary)' }}>Overall Spectral Anomaly Score:</span>
                   <span style={{ fontWeight: 700, fontSize: '1.2rem', color: getScoreColor(result.frequency_analysis.spectral_anomaly_score) }}>
                     {(result.frequency_analysis.spectral_anomaly_score * 100).toFixed(1)}%
                   </span>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  );
};

export default React.memo(FrequencyTab);
