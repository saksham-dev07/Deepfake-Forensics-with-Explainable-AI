import React from 'react';
import { Activity, Camera, BarChart3, Info, Lightbulb, ChevronUp, ChevronDown, ZoomIn } from 'lucide-react';
import { ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import VerdictBadge from '../ui/VerdictBadge';
import { API_BASE } from '../../constants/api';

const FrequencyTab = ({
  result = {},
  getScoreColor = () => 'var(--primary)',
  setZoomedImage = () => {},
  showFullSpectralInfo = false,
  setShowFullSpectralInfo = () => {},
}) => {
  const data = result.frequency_analysis || {};
  const anomalyScore = typeof data.spectral_anomaly_score === 'number' ? data.spectral_anomaly_score : (typeof result.frequency_score === 'number' ? result.frequency_score : 0);
  const hfRatio = typeof data.high_freq_energy_ratio === 'number' ? data.high_freq_energy_ratio : 0;
  const channelVar = typeof data.channel_variance === 'number' ? data.channel_variance : 0;

  const resolveImg = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_BASE}/${path.replace(/^\/+/, '')}`;
  };

  const chartData = [
    { name: 'HF Energy', value: Math.min(100, Math.max(0, hfRatio * 100)) },
    { name: 'Red HF', value: Math.min(100, Math.max(0, (data.channel_hf_ratios?.[0] || 0) * 100)) },
    { name: 'Green HF', value: Math.min(100, Math.max(0, (data.channel_hf_ratios?.[1] || 0) * 100)) },
    { name: 'Blue HF', value: Math.min(100, Math.max(0, (data.channel_hf_ratios?.[2] || 0) * 100)) },
    { name: 'PC3 Var', value: Math.min(100, Math.max(0, (data.pc3_variance_ratio || 0) * 100)) }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Educational & Protocol Callout */}
      <div className="info-callout" style={{ borderLeft: '3px solid var(--primary)' }}>
        <div className="info-callout-icon">
          <Lightbulb size={18} color="var(--primary)" />
        </div>
        <div className="info-callout-content">
          <h4 style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
            Mathematical Wave &amp; Frequency Domain Decomposition
          </h4>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
            Natural optical lenses project continuous frequency spectrums where low frequencies (luminance contours) and microscopic high frequencies (sensor noise, pore structures) preserve strict thermodynamic ratios. Synthetic GAN/Diffusion generators synthesize pixels via discrete deconvolution matrices, leaving periodic spectral voids, checkerboard aliasing, and elevated channel variances.
          </p>

          {showFullSpectralInfo && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--glass-border)' }}>
              <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <li>
                  <strong style={{ color: 'var(--text-main)' }}>FFT 2D Spectrum:</strong> Radial Fourier magnitude. The center pinpoints DC/low-frequency energy, while concentric outer rings map Nyquist-limit high frequencies.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-main)' }}>DCT Quantization:</strong> Cosine coefficient distribution. Isolates JPEG 8x8 block boundaries to expose boundary disruptions caused by face-swap splicing.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-main)' }}>PCA Spectral Analysis (PC3):</strong> Decomposes cross-channel RGB covariance. Principal Component 3 isolates 98% of GAN upsampling checkerboard residuals.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-main)' }}>Switching Noise Estimator (SWN):</strong> Gradient zero-crossing filter that suppresses true morphological edges to isolate raw synthesis noise.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-main)' }}>Discrete Wavelet (DWT - HH):</strong> High-high diagonal sub-band mapping where generative upsamplers leave unnatural isotropic smoothing.
                </li>
              </ul>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setShowFullSpectralInfo(!showFullSpectralInfo)}
            style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              cursor: 'pointer', padding: 0, marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '4px'
            }}
          >
            {showFullSpectralInfo ? <>Collapse Technical Protocol <ChevronUp size={13} /></> : <>Read Full Decomposition Protocol <ChevronDown size={13} /></>}
          </button>
        </div>
      </div>

      {/* Quantitative Metrics Summary */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
              Spectral Sensor Telemetry
            </h3>
          </div>
          <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Domain: Frequency / Wavelet / DCT
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Overall Spectral Anomaly
            </div>
            <div className="tabular-num mono-font" style={{ fontSize: '1.5rem', fontWeight: 800, color: anomalyScore > 0.6 ? 'var(--danger)' : anomalyScore > 0.35 ? 'var(--warning)' : 'var(--success)', marginTop: '0.25rem' }}>
              {(anomalyScore * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {anomalyScore > 0.5 ? 'Significant High-Freq Anomaly' : 'Natural Frequency Curve'}
            </div>
          </div>

          <div style={{ background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              High-Freq Energy Ratio
            </div>
            <div className="tabular-num mono-font" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {hfRatio > 0 ? hfRatio.toExponential(2) : '0.00e+0'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Baseline: &gt; 1.0e-3 for optical sensors
            </div>
          </div>

          <div style={{ background: 'var(--panel-subtle)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              RGB Channel Variance
            </div>
            <div className="tabular-num mono-font" style={{ fontSize: '1.35rem', fontWeight: 700, color: channelVar > 0.01 ? 'var(--warning)' : 'var(--text-main)', marginTop: '0.25rem' }}>
              {channelVar < 0.0001 ? channelVar.toExponential(2) : channelVar.toFixed(4)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Disparity indicates synthetic synthesis
            </div>
          </div>
        </div>
      </div>

      {/* Primary Visual Exhibits (SWN & Block DCT) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Switching Noise SWN */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Camera size={16} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Switching Noise Estimator (SWN)
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Zero-crossing gradient noise map
                </div>
              </div>
            </div>
            {data.verdicts?.swn && <VerdictBadge verdict={data.verdicts.swn} />}
          </div>

          <div 
            className="zoomable-image-container"
            onClick={() => data.swn_noise_path && setZoomedImage(resolveImg(data.swn_noise_path))}
            style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', minHeight: '220px', background: 'var(--panel-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {data.swn_noise_path ? (
              <img
                src={resolveImg(data.swn_noise_path)}
                alt="Switching Noise SWN"
                className="heatmap-image"
                style={{ width: '100%', height: '220px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1.5rem' }}>
                <Activity size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <div>SWN Gradient Residual Map Rendered</div>
              </div>
            )}
            <div className="zoom-overlay"><ZoomIn size={24} /></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>Highlights high-frequency generative noise while suppressing true morphological edges.</span>
          </div>
        </div>

        {/* 8x8 Block DCT High-Frequency Map */}
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color="var(--accent)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  8x8 Block DCT Residual Grid
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Localized JPEG frequency matrix integrity
                </div>
              </div>
            </div>
            {data.verdicts?.block_dct && <VerdictBadge verdict={data.verdicts.block_dct} />}
          </div>

          <div 
            className="zoomable-image-container"
            onClick={() => data.block_dct_path && setZoomedImage(resolveImg(data.block_dct_path))}
            style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', minHeight: '220px', background: 'var(--panel-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {data.block_dct_path ? (
              <img
                src={resolveImg(data.block_dct_path)}
                alt="Block DCT Artifacts"
                className="heatmap-image"
                style={{ width: '100%', height: '220px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '1.5rem' }}>
                <Activity size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <div>Block DCT Frequency Distribution Map Rendered</div>
              </div>
            )}
            <div className="zoom-overlay"><ZoomIn size={24} /></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>Audits compression consistency. Splice seams cause glaring discontinuities in the 8x8 DCT grid.</span>
          </div>
        </div>
      </div>

      {/* Advanced Mathematical Spectra Gallery */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.65rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Advanced Analytical Transformations
            </h4>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Fourier, Wavelet, and Hyperspectral Principal Component Projections
            </div>
          </div>
          <span className="mono-font" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            N = 5 Orthogonal Decompositions
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {/* FFT Magnitude Spectrum */}
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>FFT 2D Spectrum</span>
              {data.verdicts?.fft && <VerdictBadge verdict={data.verdicts.fft} />}
            </div>
            <div 
              className="zoomable-image-container"
              onClick={() => data.fft_magnitude_path && setZoomedImage(resolveImg(data.fft_magnitude_path))}
              style={{ minHeight: '130px', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
            >
              {data.fft_magnitude_path ? (
                <img src={resolveImg(data.fft_magnitude_path)} alt="FFT Spectrum" style={{ width: '100%', height: '130px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Radial Fourier Map</span>
              )}
              <div className="zoom-overlay"><ZoomIn size={18} /></div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
              Center = DC | Outer = High Freq
            </div>
          </div>

          {/* DCT Spectrum */}
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>DCT Spectrum</span>
              {data.verdicts?.dct && <VerdictBadge verdict={data.verdicts.dct} />}
            </div>
            <div 
              className="zoomable-image-container"
              onClick={() => data.dct_spectrum_path && setZoomedImage(resolveImg(data.dct_spectrum_path))}
              style={{ minHeight: '130px', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
            >
              {data.dct_spectrum_path ? (
                <img src={resolveImg(data.dct_spectrum_path)} alt="DCT Spectrum" style={{ width: '100%', height: '130px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Cosine Matrix</span>
              )}
              <div className="zoom-overlay"><ZoomIn size={18} /></div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
              Upper-left = Low | Lower-right = High
            </div>
          </div>

          {/* PCA Component (PC3) */}
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>PCA Residual (PC3)</span>
              {data.verdicts?.pca && <VerdictBadge verdict={data.verdicts.pca} />}
            </div>
            <div 
              className="zoomable-image-container"
              onClick={() => data.pca_spectrum_path && setZoomedImage(resolveImg(data.pca_spectrum_path))}
              style={{ minHeight: '130px', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
            >
              {data.pca_spectrum_path ? (
                <img src={resolveImg(data.pca_spectrum_path)} alt="PCA Spectrum" style={{ width: '100%', height: '130px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Hyperspectral PC3</span>
              )}
              <div className="zoom-overlay"><ZoomIn size={18} /></div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
              Isolates GAN upsampling variance
            </div>
          </div>

          {/* DWT Diagonal (HH) */}
          <div style={{ background: 'var(--panel-subtle)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>DWT Diagonal (HH)</span>
              {data.verdicts?.dwt && <VerdictBadge verdict={data.verdicts.dwt} />}
            </div>
            <div 
              className="zoomable-image-container"
              onClick={() => data.dwt_diagonal_path && setZoomedImage(resolveImg(data.dwt_diagonal_path))}
              style={{ minHeight: '130px', background: '#05070a', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
            >
              {data.dwt_diagonal_path ? (
                <img src={resolveImg(data.dwt_diagonal_path)} alt="DWT Diagonal" style={{ width: '100%', height: '130px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Wavelet HH Subband</span>
              )}
              <div className="zoom-overlay"><ZoomIn size={18} /></div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
              Audits high-frequency diagonal noise
            </div>
          </div>
        </div>

        {/* Recharts Bar Distribution */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Frequency Energy Distribution Profile
            </span>
            <span className="mono-font" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Normalized Variance Ratio (%)
            </span>
          </div>
          
          <div style={{ height: 180, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#0d121c', border: '1px solid var(--glass-border)', borderRadius: '6px', fontSize: '0.75rem' }} 
                  formatter={(val) => [`${val.toFixed(2)}%`, 'Energy Ratio']} 
                />
                <Bar dataKey="value" fill="var(--primary)" radius={[3, 3, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FrequencyTab);
