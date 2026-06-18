"""
Frequency Domain & Spectral Analysis for Deepfake Detection.

Deepfakes often leave artifacts in the frequency domain that are invisible
in the spatial domain. This module implements:
1. DCT (Discrete Cosine Transform) spectral analysis
2. FFT (Fast Fourier Transform) magnitude spectrum
3. Azimuthal averaging for frequency band energy comparison
4. Per-channel (R,G,B) spectral consistency analysis
5. PCA spectral decomposition for hidden artifact detection

These techniques exploit the fact that GAN-generated images often have
suppressed high-frequency components, periodic artifacts in the spectrum,
and channel-specific inconsistencies invisible to the human eye.
"""

import numpy as np
import cv2
import os
import pywt

def compute_swn_noise_map(image_rgb, save_path=None):
    """
    Implements the Switching Noise Estimator (SWN) from Ranjbaran et al. (2015).
    Detects high-frequency zero-crossings (pure noise) while using Gaussian weighting 
    to suppress actual physical edges. Highlights deepfake splicing and generation artifacts.
    Enhanced with anomaly contours, original image overlay, and colorbar legend.

    Returns:
        final: Colorized visualization image with overlays.
        anomaly_ratio: Ratio of significant anomaly areas to total image area.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    
    # We must operate in float32 for continuous math
    u = gray.astype(np.float32) / 255.0
    
    # Horizontal gradients
    gx = np.zeros_like(u)
    gx[:, :-1] = u[:, 1:] - u[:, :-1]
    gx_dx = np.zeros_like(u)
    gx_dx[:, :-2] = u[:, 2:] - u[:, 1:-1]
    
    # Vertical gradients
    gy = np.zeros_like(u)
    gy[:-1, :] = u[1:, :] - u[:-1, :]
    gy_dy = np.zeros_like(u)
    gy_dy[:-2, :] = u[2:, :] - u[1:-1, :]
    
    # Heaviside zero-crossing detection
    hx = (np.pi / 2.0 + np.arctan(-300.0 * gx * gx_dx)) / np.pi
    hy = (np.pi / 2.0 + np.arctan(-300.0 * gy * gy_dy)) / np.pi
    
    # Gaussian edge suppression
    wx = np.exp(-((gx + gx_dx)**2) * 50.0)
    wy = np.exp(-((gy + gy_dy)**2) * 50.0)
    
    # Final SWN map
    swn = hx * hy * wx * wy
    
    # ── Percentile contrast stretching ──
    p_low, p_high = np.percentile(swn, [1, 99])
    if p_high - p_low > 1e-8:
        swn_stretched = np.clip((swn - p_low) / (p_high - p_low), 0, 1)
    else:
        swn_stretched = cv2.normalize(swn, None, 0, 1, cv2.NORM_MINMAX)
    
    swn_uint8 = np.uint8(255 * swn_stretched)
    swn_colored = cv2.applyColorMap(swn_uint8, cv2.COLORMAP_INFERNO)
    
    # ── Blend with original grayscale for spatial context ──
    gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    blended = cv2.addWeighted(swn_colored, 0.7, gray_3ch, 0.3, 0)
    
    # ── Anomaly contour detection (high-noise regions) ──
    mean_s = np.mean(swn_stretched)
    std_s = np.std(swn_stretched) + 1e-8
    anomaly_mask = ((swn_stretched - mean_s) / std_s > 2.0).astype(np.uint8)
    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    anomaly_mask = cv2.morphologyEx(anomaly_mask, cv2.MORPH_CLOSE, kernel)
    anomaly_mask = cv2.morphologyEx(anomaly_mask, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(anomaly_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    # Filter tiny contours
    significant = [c for c in contours if cv2.contourArea(c) > 50]
    cv2.drawContours(blended, significant, -1, (0, 255, 255), 2, cv2.LINE_AA)
    
    # ── Colorbar legend strip ──
    bar_w = max(16, w // 40)
    colorbar = np.linspace(255, 0, h).astype(np.uint8).reshape(-1, 1)
    colorbar = np.repeat(colorbar, bar_w, axis=1)
    colorbar_colored = cv2.applyColorMap(colorbar, cv2.COLORMAP_INFERNO)
    cv2.putText(colorbar_colored, "High", (2, 16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(colorbar_colored, "Low", (2, h - 6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1, cv2.LINE_AA)
    
    final = np.hstack([blended, colorbar_colored])
    
    if save_path:
        cv2.imwrite(save_path, final)
        
    total_anomaly_area = sum(cv2.contourArea(c) for c in significant)
    anomaly_ratio = float(total_anomaly_area / (h * w))
        
    return final, anomaly_ratio

def compute_cepstrum(image_rgb, save_path=None):
    """
    Computes the 2D Cepstrum (spectrum of a spectrum) to detect resampling and rotation echoes.
    Applies a 2D Hanning window to prevent edge discontinuities (standard signal processing practice).
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Apply 2D Hanning window
    h, w = gray.shape
    window_2d = np.outer(np.hanning(h), np.hanning(w))
    gray_windowed = gray * window_2d
    
    # Forward 2D FFT
    f_transform = np.fft.fft2(gray_windowed)
    f_shift = np.fft.fftshift(f_transform)
    
    # Log magnitude spectrum
    log_mag = np.log(np.abs(f_shift) + 1.0)
    
    # Inverse FFT of the log magnitude -> Cepstrum
    cepstrum = np.abs(np.fft.ifft2(log_mag))
    cepstrum_shift = np.fft.fftshift(cepstrum)
    
    # To enhance visualization, apply log scaling to cepstrum and normalize
    # We zero out the massive DC component in the exact center
    cy, cx = cepstrum_shift.shape[0]//2, cepstrum_shift.shape[1]//2
    cepstrum_shift[cy-3:cy+4, cx-3:cx+4] = 0
    
    cepstrum_log = np.log(cepstrum_shift + 1.0)
    cepstrum_normalized = cv2.normalize(cepstrum_log, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    cepstrum_colored = cv2.applyColorMap(cepstrum_normalized, cv2.COLORMAP_JET)
    
    if save_path:
        cv2.imwrite(save_path, cepstrum_colored)
        
    return cepstrum_colored, cepstrum_shift

def compute_dwt_diagonal(image_rgb, save_path=None):
    """
    Computes 2D Discrete Wavelet Transform and extracts the 4-band coefficients (LL, LH, HL, HH)
    stitched into a 2x2 visualization grid, mathematically equivalent to MATLAB's dwt2 display.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Compute 2D DWT using Haar wavelet
    coeffs2 = pywt.dwt2(gray, 'haar')
    LL, (LH, HL, HH) = coeffs2
    
    # Normalize each band
    ll_norm = cv2.normalize(LL, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    lh_norm = cv2.normalize(np.abs(LH), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    hl_norm = cv2.normalize(np.abs(HL), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    hh_norm = cv2.normalize(np.abs(HH), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    
    # Combine into 2x2 grid
    top_row = np.hstack((ll_norm, lh_norm))
    bottom_row = np.hstack((hl_norm, hh_norm))
    grid = np.vstack((top_row, bottom_row))
    
    grid_colored = cv2.applyColorMap(grid, cv2.COLORMAP_MAGMA)
    
    # Add crosshair separators for clarity
    h, w = grid_colored.shape[:2]
    cv2.line(grid_colored, (w//2, 0), (w//2, h), (255, 255, 255), 1)
    cv2.line(grid_colored, (0, h//2), (w, h//2), (255, 255, 255), 1)
    
    if save_path:
        cv2.imwrite(save_path, grid_colored)
        
    return grid_colored, np.abs(HH)



def compute_dct_spectrum(image_rgb, save_path=None):
    """
    Compute an enhanced 2D DCT spectrum visualization.
    DCT places DC at top-left (0,0), with frequency increasing toward bottom-right.
    Uses percentile contrast stretching, frequency band arcs from origin,
    and a perceptually uniform colormap for forensic analysis.

    Returns:
        dct_log: Log-scaled DCT coefficient matrix.
        dct_colored: Colorized visualization image.
        dct_hf_ratio: Ratio of high-frequency DCT energy to total DCT energy
                      (independent of FFT; based on diagonal distance from DC).
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    gray_float = np.float32(gray) / 255.0

    # Apply 2D DCT
    dct_result = cv2.dct(gray_float)

    # ── DCT-specific high-frequency energy ratio ──
    # In a 2D DCT, DC is at (0,0) and frequency increases toward bottom-right.
    # We measure the energy ratio of coefficients beyond 70% of the max diagonal.
    h, w = dct_result.shape
    Y_idx, X_idx = np.ogrid[:h, :w]
    max_diag = np.sqrt(float(h**2 + w**2))
    diag_dist = np.sqrt(X_idx.astype(np.float64)**2 + Y_idx.astype(np.float64)**2)
    dct_power = dct_result.astype(np.float64) ** 2
    total_energy = np.sum(dct_power)
    hf_mask = diag_dist > (max_diag * 0.70)
    hf_energy = np.sum(dct_power[hf_mask])
    dct_hf_ratio = float(hf_energy / total_energy) if total_energy > 0 else 0.0

    # Log scale for visualization
    dct_log = np.log(np.abs(dct_result) + 1e-10)

    # ── Percentile contrast stretching ──
    p_low, p_high = np.percentile(dct_log, [2, 98])
    if p_high - p_low > 1e-8:
        dct_stretched = np.clip((dct_log - p_low) / (p_high - p_low), 0, 1)
    else:
        dct_stretched = cv2.normalize(dct_log, None, 0, 1, cv2.NORM_MINMAX)

    dct_uint8 = np.uint8(255 * dct_stretched)

    # ── Perceptually uniform colormap ──
    dct_colored = cv2.applyColorMap(dct_uint8, cv2.COLORMAP_INFERNO)

    # ── Frequency band arcs from origin (0,0) ──
    origin = (0, 0)
    max_radius = int(max_diag)

    band_fractions = [0.05, 0.15, 0.35, 0.65]
    band_labels = ["DC", "Low-Freq", "Mid-Freq", "High-Freq"]
    for frac, label in zip(band_fractions, band_labels):
        r = int(max_radius * frac)
        # Draw quarter-circle arc from origin
        cv2.ellipse(dct_colored, origin, (r, r), 0, 0, 90, (255, 255, 255), 1, cv2.LINE_AA)
        # Place label along the diagonal
        diag_x = int(r * 0.707)  # cos(45°)
        diag_y = int(r * 0.707)  # sin(45°)
        if diag_x < w - 60 and diag_y < h - 12:
            cv2.putText(dct_colored, label, (diag_x + 4, diag_y - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)

    # Diagonal guide line (DC → HF direction)
    cv2.line(dct_colored, (0, 0), (w - 1, h - 1), (255, 255, 255, 80), 1, cv2.LINE_AA)

    # Corner annotations
    cv2.putText(dct_colored, "DC", (6, 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 100), 1, cv2.LINE_AA)
    cv2.putText(dct_colored, "HF", (w - 30, h - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 200, 255), 1, cv2.LINE_AA)

    if save_path:
        cv2.imwrite(save_path, dct_colored)

    return dct_log, dct_colored, dct_hf_ratio

def compute_block_dct_artifacts(image_rgb, save_path=None):
    """
    Computes 8x8 block-wise DCT to detect local frequency anomalies.
    Spliced deepfakes often disrupt the 8x8 JPEG grid, causing localized
    mismatches in block-wise high-frequency energy.
    
    This function uses highly-parallelized vectorized tensor multiplication (A @ X @ A^T)
    to compute the 2D DCT for all 8x8 blocks simultaneously.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    
    # Pad to multiple of 8
    pad_h = (8 - h % 8) % 8
    pad_w = (8 - w % 8) % 8
    gray_padded = np.pad(gray, ((0, pad_h), (0, pad_w)), mode='reflect')
    ph, pw = gray_padded.shape
    
    gray_float = np.float32(gray_padded) - 128.0 # center around 0
    
    # Construct 8x8 DCT-II Transform Matrix A
    N = 8
    A = np.zeros((N, N), dtype=np.float32)
    for k in range(N):
        for n in range(N):
            alpha = np.sqrt(1.0 / N) if k == 0 else np.sqrt(2.0 / N)
            A[k, n] = alpha * np.cos(np.pi * (2*n + 1) * k / (2*N))
            
    # Reshape image into tensor of shape (num_blocks_h, num_blocks_w, 8, 8)
    num_blocks_h, num_blocks_w = ph // 8, pw // 8
    X_blocks = gray_float.reshape(num_blocks_h, 8, num_blocks_w, 8).transpose(0, 2, 1, 3)
    
    # Vectorized 2D DCT: Y = A @ X @ A^T across the entire image grid simultaneously
    Y_blocks = A @ X_blocks @ A.T
    
    # Create mask for high-frequency coefficients (bottom right triangle)
    mask = np.tri(8, 8, -3, dtype=bool).T
    
    # Sum the absolute values of HF coefficients
    block_hf_energy = np.sum(np.abs(Y_blocks) * mask, axis=(2, 3))
    
    # ── Log-compress dynamic range to reveal subtle block variations ──
    block_log = np.log1p(block_hf_energy)
    
    # ── Detect anomalous blocks (z-score > 2.0) ──
    mean_e = np.mean(block_log)
    std_e = np.std(block_log) + 1e-8
    z_scores = (block_log - mean_e) / std_e
    anomaly_mask_blocks = (np.abs(z_scores) > 2.0).astype(np.uint8)
    
    # ── Bilinear upscale for smooth heatmap ──
    heatmap_smooth = cv2.resize(block_log, (w, h), interpolation=cv2.INTER_LINEAR)
    
    # Percentile contrast stretching
    p_low, p_high = np.percentile(heatmap_smooth, [1, 99])
    if p_high - p_low > 1e-8:
        heatmap_norm = np.clip((heatmap_smooth - p_low) / (p_high - p_low), 0, 1)
    else:
        heatmap_norm = cv2.normalize(heatmap_smooth, None, 0, 1, cv2.NORM_MINMAX)
    
    heatmap_uint8 = np.uint8(255 * heatmap_norm)
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_INFERNO)
    
    # ── Blend heatmap with original grayscale for spatial context ──
    gray_3ch = cv2.cvtColor(gray[:h, :w], cv2.COLOR_GRAY2BGR)
    blended = cv2.addWeighted(heatmap_colored, 0.7, gray_3ch, 0.3, 0)
    
    # ── Draw anomaly contours ──
    anomaly_upscaled = cv2.resize(anomaly_mask_blocks, (w, h), interpolation=cv2.INTER_NEAREST)
    contours, _ = cv2.findContours(anomaly_upscaled, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(blended, contours, -1, (0, 255, 255), 2, cv2.LINE_AA)  # cyan outlines
    
    # ── Colorbar legend strip on right edge ──
    bar_w = max(16, w // 40)
    colorbar = np.linspace(255, 0, h).astype(np.uint8).reshape(-1, 1)
    colorbar = np.repeat(colorbar, bar_w, axis=1)
    colorbar_colored = cv2.applyColorMap(colorbar, cv2.COLORMAP_INFERNO)
    # Labels
    cv2.putText(colorbar_colored, "High", (2, 16),
                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.putText(colorbar_colored, "Low", (2, h - 6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1, cv2.LINE_AA)
    
    # Attach colorbar to the right side
    final = np.hstack([blended, colorbar_colored])
    
    if save_path:
        cv2.imwrite(save_path, final)
        
    # Calculate variance
    block_variance = float(np.var(block_hf_energy))
    
    return block_hf_energy, final, block_variance


def get_2d_hanning_window(shape):
    """
    Creates a 2D Hanning window to prevent spectral leakage.
    Images have non-periodic boundaries, causing artificial vertical/horizontal
    energy in the FFT (the bright cross artifact). Windowing fades the edges to zero.
    """
    h, w = shape
    win_h = np.hanning(h)
    win_w = np.hanning(w)
    return np.outer(win_h, win_w)


def compute_fft_magnitude(image_rgb, save_path=None):
    """
    Compute an enhanced 2D FFT magnitude spectrum with the DC component centered.
    Applies a 2D Hanning window to eliminate spectral leakage.
    Includes frequency band rings, percentile contrast, and an embedded
    radial profile mini-chart for forensic analysis.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape
    
    # Apply Hanning window
    window = get_2d_hanning_window(gray.shape)
    gray_windowed = gray * window

    # 2D FFT
    f_transform = np.fft.fft2(gray_windowed)
    f_shift = np.fft.fftshift(f_transform)

    # Magnitude spectrum (log scale)
    magnitude = 20 * np.log(np.abs(f_shift) + 1e-10)

    # ── Percentile contrast stretching ──
    p_low, p_high = np.percentile(magnitude, [2, 99])
    if p_high - p_low > 1e-8:
        mag_stretched = np.clip((magnitude - p_low) / (p_high - p_low), 0, 1)
    else:
        mag_stretched = cv2.normalize(magnitude, None, 0, 1, cv2.NORM_MINMAX)

    mag_uint8 = np.uint8(255 * mag_stretched)
    mag_colored = cv2.applyColorMap(mag_uint8, cv2.COLORMAP_INFERNO)

    # ── Frequency band rings from center ──
    center = (w // 2, h // 2)
    max_radius = min(h // 2, w // 2)

    band_fractions = [0.05, 0.15, 0.35, 0.65]
    band_labels = ["DC", "Low", "Mid", "High"]
    for frac, label in zip(band_fractions, band_labels):
        r = int(max_radius * frac)
        cv2.circle(mag_colored, center, r, (255, 255, 255), 1, cv2.LINE_AA)
        label_x = center[0] + r + 4
        label_y = center[1] - 4
        if label_x + 40 < w:
            cv2.putText(mag_colored, label, (label_x, label_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (255, 255, 255), 1, cv2.LINE_AA)

    # Axis crosshair (subtle)
    cv2.line(mag_colored, (w // 2, 0), (w // 2, h), (255, 255, 255), 1, cv2.LINE_AA)
    cv2.line(mag_colored, (0, h // 2), (w, h // 2), (255, 255, 255), 1, cv2.LINE_AA)

    # ── Embedded radial profile mini-chart (bottom-right corner) ──
    # Compute azimuthal average
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((X - w // 2) ** 2 + (Y - h // 2) ** 2).astype(int)
    max_r = min(h // 2, w // 2)
    radial = np.zeros(max_r)
    for r_val in range(max_r):
        ring = magnitude[dist == r_val]
        if len(ring) > 0:
            radial[r_val] = np.mean(ring)

    # Draw mini chart
    chart_w, chart_h = min(160, w // 4), min(80, h // 5)
    chart_x, chart_y = w - chart_w - 10, h - chart_h - 10

    # Semi-transparent background
    overlay = mag_colored.copy()
    cv2.rectangle(overlay, (chart_x - 4, chart_y - 14), (chart_x + chart_w + 4, chart_y + chart_h + 4), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, mag_colored, 0.4, 0, mag_colored)

    # Normalize radial profile to chart height
    r_min, r_max = np.min(radial), np.max(radial)
    if r_max - r_min > 1e-8:
        r_norm = (radial - r_min) / (r_max - r_min)
    else:
        r_norm = np.zeros_like(radial)

    # Draw the profile line
    step = max(1, len(r_norm) // chart_w)
    r_sampled = r_norm[::step][:chart_w]
    pts = []
    for i, val in enumerate(r_sampled):
        px = chart_x + i
        py = chart_y + chart_h - int(val * chart_h)
        pts.append((px, py))
    if len(pts) > 1:
        for k in range(len(pts) - 1):
            cv2.line(mag_colored, pts[k], pts[k + 1], (0, 255, 200), 1, cv2.LINE_AA)

    # Chart label
    cv2.putText(mag_colored, "Radial Profile", (chart_x, chart_y - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (200, 200, 200), 1, cv2.LINE_AA)

    if save_path:
        cv2.imwrite(save_path, mag_colored)

    return magnitude, mag_colored


def azimuthal_average(image_rgb):
    """
    Compute the azimuthal (radial) average of the FFT power spectrum.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Apply Hanning window
    window = get_2d_hanning_window(gray.shape)
    gray_windowed = gray * window

    f_transform = np.fft.fft2(gray_windowed)
    f_shift = np.fft.fftshift(f_transform)
    power_spectrum = np.abs(f_shift) ** 2

    h, w = power_spectrum.shape
    cy, cx = h // 2, w // 2

    # Create radius map
    Y, X = np.ogrid[:h, :w]
    r = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2).astype(int)
    max_r = min(cy, cx)

    # Compute radial average
    radial_profile = np.zeros(max_r)
    for i in range(max_r):
        mask = r == i
        if np.any(mask):
            radial_profile[i] = np.mean(power_spectrum[mask])

    return radial_profile


def compute_high_freq_energy_ratio(image_rgb):
    """
    Compute the ratio of high-frequency energy to total energy.
    Deepfakes often have lower high-frequency energy because
    neural networks struggle to reproduce fine texture details.

    Returns a value between 0 and 1.
    Lower values suggest potential manipulation.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    
    # Apply Hanning window
    window = get_2d_hanning_window(gray.shape)
    gray_windowed = gray * window

    f_transform = np.fft.fft2(gray_windowed)
    f_shift = np.fft.fftshift(f_transform)
    power = np.abs(f_shift) ** 2

    h, w = power.shape
    cy, cx = h // 2, w // 2

    # Define high-frequency region (outer 30% of spectrum)
    Y, X = np.ogrid[:h, :w]
    r = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
    max_r = min(cy, cx)

    high_freq_mask = r > (max_r * 0.7)

    total_energy = np.sum(power)
    high_freq_energy = np.sum(power[high_freq_mask])

    if total_energy == 0:
        return 0.5

    ratio = high_freq_energy / total_energy
    return float(ratio)

def compute_per_channel_hf_ratio(image_rgb):
    """
    Compute the high-frequency energy ratio for each R, G, B channel independently.
    GANs often introduce channel-specific artifacts — e.g., the Blue channel
    may have drastically different high-freq energy than Red or Green.
    High cross-channel variance is a strong deepfake signal.
    """
    ratios = []
    h_img, w_img = image_rgb.shape[:2]
    window = get_2d_hanning_window((h_img, w_img))
    
    for ch in range(3):
        channel = image_rgb[:, :, ch]
        channel_windowed = channel * window
        
        f_transform = np.fft.fft2(channel_windowed)
        f_shift = np.fft.fftshift(f_transform)
        power = np.abs(f_shift) ** 2

        h, w = power.shape
        cy, cx = h // 2, w // 2
        Y, X = np.ogrid[:h, :w]
        r = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        max_r = min(cy, cx)
        high_freq_mask = r > (max_r * 0.7)

        total = np.sum(power)
        high = np.sum(power[high_freq_mask])
        ratios.append(high / total if total > 0 else 0.5)

    # Cross-channel variance: high variance = suspicious
    channel_variance = float(np.std(ratios))
    return ratios, channel_variance


def pca_spectral_decomposition(image_rgb, output_dir, prefix="freq"):
    """
    Perform PCA on the flattened RGB pixel matrix to extract principal components.
    The 3rd principal component (PC3) often reveals hidden GAN artifacts
    that are invisible in normal RGB space — similar to how hyperspectral
    imaging reveals materials invisible to the naked eye.
    """
    h, w, c = image_rgb.shape
    pixels = image_rgb.reshape(-1, c).astype(np.float64)

    # Center the data
    mean = np.mean(pixels, axis=0)
    centered = pixels - mean

    # Covariance and eigen decomposition
    cov = np.cov(centered.T)
    eigenvalues, eigenvectors = np.linalg.eigh(cov)

    # Sort by largest eigenvalue
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx]
    eigenvectors = eigenvectors[:, idx]

    # Project onto principal components
    projected = centered @ eigenvectors

    # PC3 (the least variance component) often contains GAN residuals
    pc3 = projected[:, 2].reshape(h, w)
    pc3_norm = cv2.normalize(pc3, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    pc3_colored = cv2.applyColorMap(pc3_norm, cv2.COLORMAP_TWILIGHT)

    pca_path = os.path.join(output_dir, f"{prefix}_pca_pc3.jpg")
    cv2.imwrite(pca_path, pc3_colored)

    # Variance ratio: how much info is in PC3 relative to total
    total_var = np.sum(eigenvalues)
    pc3_var_ratio = eigenvalues[2] / total_var if total_var > 0 else 0

    return pca_path.replace("\\", "/"), float(pc3_var_ratio)

def compute_high_pass_filter(image_rgb, save_path=None):
    """
    Extracts the high-frequency spatial components of the image using an FFT High-Pass Filter.
    This reveals hidden splicing boundaries and texture inconsistencies that are
    smoothed over in the low frequencies.

    Returns:
        img_colored: Visualization of the high-pass filtered image.
        hpf_variance: Variance of the high-pass filtered output, measuring HF energy.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    f_transform = np.fft.fft2(gray)
    f_shift = np.fft.fftshift(f_transform)
    h, w = gray.shape
    cy, cx = h // 2, w // 2
    
    # Create high-pass mask (block low frequencies around DC component)
    mask = np.ones((h, w), np.uint8)
    r = int(min(h, w) * 0.05) # block the inner 5% low frequencies
    y, x = np.ogrid[:h, :w]
    mask_area = (x - cx)**2 + (y - cy)**2 <= r**2
    mask[mask_area] = 0
    
    # Apply mask and inverse FFT
    f_shift_filtered = f_shift * mask
    f_ishift = np.fft.ifftshift(f_shift_filtered)
    img_back = np.abs(np.fft.ifft2(f_ishift))
    
    # Normalize for visualization (amplify weak edges)
    img_back_norm = cv2.normalize(img_back, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    img_colored = cv2.applyColorMap(img_back_norm, cv2.COLORMAP_BONE)
    
    if save_path:
        cv2.imwrite(save_path, img_colored)
        
    hpf_variance = float(np.var(img_back))
        
    return img_colored, hpf_variance

def compute_phase_spectrum(image_rgb, save_path=None):
    """
    Compute the Phase Spectrum of the image.
    The phase contains the structural information of the image. Splicing or face swapping
    often disrupts the continuous phase coherence, which can appear as anomalies in this view.
    """
    gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
    f_transform = np.fft.fft2(gray)
    f_shift = np.fft.fftshift(f_transform)
    phase = np.angle(f_shift)
    
    # Normalize phase from [-pi, pi] to [0, 255]
    phase_normalized = cv2.normalize(phase, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    phase_colored = cv2.applyColorMap(phase_normalized, cv2.COLORMAP_OCEAN)
    
    if save_path:
        cv2.imwrite(save_path, phase_colored)
        
    phase_variance = float(np.var(phase))
        
    return phase_colored, phase_variance



def analyze_frequency_domain(image_rgb, output_dir, prefix="freq", quality_multiplier=1.0):
    """
    Run full frequency domain analysis on an image.
    Returns a dict with all computed metrics and paths to saved visualizations.
    """
    os.makedirs(output_dir, exist_ok=True)

    # DCT spectrum
    dct_path = os.path.join(output_dir, f"{prefix}_dct_spectrum.jpg")
    dct_log, _, dct_hf_ratio = compute_dct_spectrum(image_rgb, save_path=dct_path)

    # FFT magnitude
    fft_path = os.path.join(output_dir, f"{prefix}_fft_magnitude.jpg")
    fft_mag, _ = compute_fft_magnitude(image_rgb, save_path=fft_path)

    # High-frequency energy ratio
    hf_ratio = compute_high_freq_energy_ratio(image_rgb)

    # Azimuthal average
    radial_profile = azimuthal_average(image_rgb)

    # =========================================
    # IMPROVED: Continuous spectral anomaly scoring (Calibrated via IQA)
    # =========================================
    t1 = 0.001 * quality_multiplier
    t2 = 0.0002 * quality_multiplier
    t3 = 0.00005 * quality_multiplier
    
    if hf_ratio >= t1:
        spectral_anomaly = 0.10
    elif hf_ratio >= t2:
        # Linear interpolation
        t = (t1 - hf_ratio) / (t1 - t2)
        spectral_anomaly = 0.10 + t * 0.15
    elif hf_ratio >= t3:
        # Linear interpolation
        t = (t2 - hf_ratio) / (t2 - t3)
        spectral_anomaly = 0.25 + t * 0.30
    else:
        # Extremely low
        spectral_anomaly = 0.75

    # Additional signal: azimuthal 1/f deviation
    deviation = 0.0
    if len(radial_profile) > 10:
        log_profile = np.log(radial_profile[1:] + 1e-10)
        x = np.arange(len(log_profile))
        coeffs = np.polyfit(x, log_profile, 1)
        fitted = np.polyval(coeffs, x)
        deviation = np.std(log_profile - fitted)
        if deviation > 2.0:
            spectral_anomaly = min(spectral_anomaly + 0.15, 0.95)
        elif deviation > 1.0:
            spectral_anomaly = min(spectral_anomaly + 0.05, 0.90)

    # =========================================
    # NEW: Per-channel spectral consistency
    # =========================================
    channel_ratios, channel_variance = compute_per_channel_hf_ratio(image_rgb)
    # High cross-channel variance is a strong GAN fingerprint. Calibrated via IQA.
    t_cv1 = 0.02 * (1.0 / quality_multiplier)
    t_cv2 = 0.01 * (1.0 / quality_multiplier)
    if channel_variance > t_cv1:
        spectral_anomaly = min(spectral_anomaly + 0.20, 0.95)
    elif channel_variance > t_cv2:
        spectral_anomaly = min(spectral_anomaly + 0.10, 0.90)

    # =========================================
    # PCA spectral decomposition
    pca_path, pc3_var_ratio = pca_spectral_decomposition(image_rgb, output_dir, prefix)
    # If PC3 carries unusually high variance, hidden artifacts exist
    t_pc3 = 0.05 * (1.0 / quality_multiplier)
    if pc3_var_ratio > t_pc3:
        spectral_anomaly = min(spectral_anomaly + 0.10, 0.95)

    # =========================================
    # NEW: High-Pass Spatial Filter & Phase Spectrum & Block DCT
    # =========================================
    hpf_path = os.path.join(output_dir, f"{prefix}_high_pass.jpg")
    _, hpf_variance = compute_high_pass_filter(image_rgb, save_path=hpf_path)
    # Phase spectrum
    phase_path = os.path.join(output_dir, f"{prefix}_phase_spectrum.jpg")
    _, phase_variance = compute_phase_spectrum(image_rgb, save_path=phase_path)
    
    block_dct_path = os.path.join(output_dir, f"{prefix}_block_dct.jpg")
    _, _, block_variance = compute_block_dct_artifacts(image_rgb, save_path=block_dct_path)
    
    swn_path = os.path.join(output_dir, f"{prefix}_swn_noise.jpg")
    _, swn_anomaly_ratio = compute_swn_noise_map(image_rgb, save_path=swn_path)

    # =========================================
    # NEW: Cepstrum and DWT
    # =========================================
    cepstrum_path = os.path.join(output_dir, f"{prefix}_cepstrum.jpg")
    _, cepstrum_data = compute_cepstrum(image_rgb, save_path=cepstrum_path)
    
    dwt_path = os.path.join(output_dir, f"{prefix}_dwt_diagonal.jpg")
    _, hh_data = compute_dwt_diagonal(image_rgb, save_path=dwt_path)

    cepstrum_var = float(np.var(cepstrum_data))
    dwt_var = float(np.var(hh_data))

    if dwt_var < 0.5:
        spectral_anomaly = min(spectral_anomaly + 0.15, 0.95)
    
    if cepstrum_var > 0.05:
        spectral_anomaly = min(spectral_anomaly + 0.15, 0.95)

    spectral_anomaly = float(np.clip(spectral_anomaly, 0, 1))

    # Calculate explicit individual verdicts and reasons for the UI
    verdicts = {
        "fft": {
            "status": "Pass" if hf_ratio > 0.0001 else "Fail",
            "reason": f"High-Freq ratio {hf_ratio:.5f} > 0.0001" if hf_ratio > 0.0001 else f"Synthetic lack of high-frequencies ({hf_ratio:.5f})"
        },
        "dct": {
            "status": "Pass" if dct_hf_ratio > 0.00001 else "Fail",
            "reason": f"DCT HF energy ratio {dct_hf_ratio:.6f} > 0.00001" if dct_hf_ratio > 0.00001 else f"Smoothed DCT spectrum ({dct_hf_ratio:.6f})"
        },
        "block_dct": {
            "status": "Pass" if block_variance < 1000.0 else "Fail" if block_variance > 5000.0 else "Warning",
            "reason": f"Normal block variance ({block_variance:.1f})" if block_variance < 1000.0 else f"Disrupted JPEG grid ({block_variance:.1f})"
        },
        "high_pass": {
            "status": "Pass" if hpf_variance > 100.0 else "Fail",
            "reason": f"Normal HF edge energy ({hpf_variance:.1f})" if hpf_variance > 100.0 else f"Smoothed HF edges ({hpf_variance:.1f})"
        },
        "phase": {
            "status": "Pass" if phase_variance > 1.5 else "Fail" if phase_variance < 0.5 else "Warning",
            "reason": f"Phase coherent ({phase_variance:.2f})" if phase_variance > 1.5 else f"Phase disruption detected ({phase_variance:.2f})"
        },
        "swn": {
            "status": "Pass" if swn_anomaly_ratio < 0.01 else "Fail" if swn_anomaly_ratio > 0.05 else "Warning",
            "reason": f"No spliced edges" if swn_anomaly_ratio < 0.01 else f"Detected zero-crossing anomalies ({swn_anomaly_ratio:.3f})"
        },
        "pca": {
            "status": "Pass" if pc3_var_ratio < 0.05 else "Fail",
            "reason": f"Normal PCA residuals ({pc3_var_ratio:.3f})" if pc3_var_ratio < 0.05 else f"Hidden periodic artifacts ({pc3_var_ratio:.3f})"
        },
        "cepstrum": {
            "status": "Pass" if cepstrum_var < 0.03 else "Fail" if cepstrum_var > 0.05 else "Warning",
            "reason": f"No structural echoes ({cepstrum_var:.4f})" if cepstrum_var < 0.03 else f"Resampling echoes detected ({cepstrum_var:.4f})"
        },
        "dwt": {
            "status": "Pass" if dwt_var > 1.0 else "Fail" if dwt_var < 0.5 else "Warning",
            "reason": f"Natural diagonal noise ({dwt_var:.2f})" if dwt_var > 1.0 else f"Synthetic lack of diagonal detail ({dwt_var:.2f})"
        }
    }

    return {
        "dct_spectrum_path": dct_path.replace("\\", "/"),
        "block_dct_path": block_dct_path.replace("\\", "/"),
        "fft_magnitude_path": fft_path.replace("\\", "/"),
        "pca_spectrum_path": pca_path,
        "high_pass_path": hpf_path.replace("\\", "/"),
        "phase_spectrum_path": phase_path.replace("\\", "/"),
        "swn_noise_path": swn_path.replace("\\", "/"),
        "cepstrum_path": cepstrum_path.replace("\\", "/"),
        "dwt_diagonal_path": dwt_path.replace("\\", "/"),
        "high_freq_energy_ratio": round(hf_ratio, 6),
        "dct_hf_ratio": round(dct_hf_ratio, 6),
        "channel_hf_ratios": [round(r, 6) for r in channel_ratios],
        "channel_variance": round(channel_variance, 6),
        "pc3_variance_ratio": round(pc3_var_ratio, 6),
        "block_variance": round(block_variance, 6),
        "phase_variance": round(phase_variance, 6),
        "swn_anomaly_ratio": round(swn_anomaly_ratio, 6),
        "hpf_variance": round(hpf_variance, 6),
        "cepstrum_var": round(cepstrum_var, 6),
        "dwt_var": round(dwt_var, 6),
        "spectral_anomaly_score": round(spectral_anomaly, 4),
        "radial_profile_length": len(radial_profile),
        "radial_profile": [round(float(x), 4) for x in radial_profile] if len(radial_profile) > 0 else [],
        "verdicts": verdicts
    }
