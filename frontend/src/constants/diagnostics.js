// Backend field names and presentation metadata. Values always come from the report.
const exhibit = (id, label, path, spatial = false, note = '') => ({ id, label, path, spatial, note });
const metric = (key, label, format = 'number', unit = '') => ({ key, label, format, unit });

export const DIAGNOSTICS = {
  visual: {
    title: 'Neural attention', description: 'Where the visual model focused while evaluating the face crop.',
    topScore: 'nn_score', module: null, input: 'face',
    exhibits: [exhibit('coarse', 'Grad-CAM', 'heatmaps.0', true), exhibit('guided', 'Guided Grad-CAM', 'heatmaps.1', true)],
    metrics: [metric('frames_analyzed', 'Sampled frames', 'integer'), metric('frame_scores_std', 'Frame score deviation')],
    note: 'Attention shows regions influencing the model. A highlighted region is not proof of manipulation.',
  },
  ela: {
    title: 'Error level analysis', description: 'JPEG recompression differences and localized compression variation.',
    module: 'ela_analysis', score: 'ela_score', topScore: 'ela_score',
    exhibits: [exhibit('heatmap', 'ELA overlay', 'ela_heatmap_path', true), exhibit('base', 'Residual', 'ela_image_path', true), exhibit('ghosting', 'JPEG ghosting', 'ghosting_path', true), exhibit('hsv', 'Saturation residual', 'hsv_ela_path', true)],
    metrics: [metric('ela_base_variance', 'Block inconsistency', 'percent'), metric('ela_smooth_anomaly', 'Smooth-region anomaly', 'percent'), metric('ghost_variance', 'Ghost variance'), metric('hsv_variance', 'Saturation variance')],
    note: 'Compression, repeated saves, and edges can produce residuals without synthesis.',
  },
  noise: {
    title: 'Noise residuals', description: 'Signed denoising residuals and spatial high-pass structure.',
    module: 'noise_analysis', score: 'noise_score', topScore: 'noise_score',
    exhibits: [exhibit('residual', 'Noise residual', 'noise_map_path', true), exhibit('denoised', 'Denoised frame', 'denoised_map_path', true), exhibit('srm', 'SRM high-pass', 'srm_map_path', true)],
    metrics: [metric('noise_variance', 'Signed residual variance')],
    note: 'This residual is a noise proxy. It does not identify a camera or verify a device fingerprint.',
  },
  cfa: {
    title: 'CFA residual analysis', description: 'Local residual variation associated with demosaicing and image processing.',
    module: 'cfa_analysis', score: 'cfa_score', topScore: 'cfa_score',
    exhibits: [exhibit('cfa', 'Residual map', 'cfa_map_path', true), exhibit('fourier', 'Residual spectrum', 'cfa_fourier_path'), exhibit('bayer', 'Bayer residual overlay', 'bayer_grid_path', true)],
    metrics: [metric('face_variance', 'Face-region variance'), metric('bg_variance', 'Background variance')],
    note: 'Resizing and compression can weaken demosaicing traces. This heuristic alone cannot establish camera origin.',
  },
  corneal: {
    title: 'Corneal highlights', description: 'Similarity between measured highlight masks in the two eyes.',
    module: 'corneal_analysis', score: 'corneal_score', topScore: 'corneal_score',
    exhibits: [exhibit('comparison', 'Eye highlight comparison', 'corneal_map_path'), exhibit('loupe', 'Ocular detail', 'ocular_loupe_path'), exhibit('diagram', 'Illustrative reflection diagram', 'specular_vector_path', false, 'Schematic illustration; not a reconstructed optical measurement.')],
    metrics: [metric('iou', 'Highlight overlap', 'percent'), metric('ssim', 'Mask similarity'), metric('total_glare_area', 'Glare area', 'number', 'px'), metric('area_diff_ratio', 'Area asymmetry', 'percent')],
    note: 'Lighting, gaze, glasses, and occlusion can change highlight shape. Missing highlights are unavailable evidence.',
  },
  geometry: {
    title: 'Face geometry', description: 'Landmark overlays, measured facial ratios, and pose consistency.',
    module: 'face_geometry', score: 'geometry_anomaly_score', topScore: 'geometry_anomaly_score',
    exhibits: [exhibit('mesh', 'Landmark mesh', 'landmark_visualization_path', true), exhibit('pose', 'Head pose', 'head_pose_visualization_path', true), exhibit('symmetry', 'Cropped symmetry residual', 'symmetry_map_path'), exhibit('texture', 'Cropped texture residual', 'texture_map_path'), exhibit('radar', 'Proportion chart', 'radar_chart_path'), exhibit('temporal', 'Temporal variation', 'temporal_jitter_plot_path')],
    metrics: [metric('detection_confidence', 'Face detection confidence', 'percent'), metric('symmetry_score', 'Symmetry consistency'), metric('golden_ratio', 'Facial ratio'), metric('interocular_ratio', 'Interocular ratio'), metric('texture_consistency', 'Texture consistency'), metric('head_pose_jitter_score', 'Pose jitter', 'percent')],
    note: 'Facial proportions vary naturally. These measurements do not establish identity or prove synthetic origin.',
  },
  frequency: {
    title: 'Frequency analysis', description: 'Spatial residuals and frequency-domain representations of the frame.',
    module: 'frequency_analysis', score: 'spectral_anomaly_score', topScore: 'spectral_anomaly_score',
    exhibits: [exhibit('swn', 'Switching noise', 'swn_noise_path', true), exhibit('saliency', 'Spectral saliency', 'saliency_map_path', true), exhibit('block', 'Block DCT grid', 'block_dct_path'), exhibit('fft', 'FFT spectrum', 'fft_magnitude_path'), exhibit('dct', 'DCT spectrum', 'dct_spectrum_path'), exhibit('pca', 'PCA component', 'pca_spectrum_path', true), exhibit('wavelet', 'Wavelet detail', 'dwt_diagonal_path'), exhibit('phase', 'Phase spectrum', 'phase_spectrum_path'), exhibit('cepstrum', 'Cepstrum', 'cepstrum_path'), exhibit('highpass', 'High-pass residual', 'high_pass_path', true)],
    metrics: [metric('high_freq_energy_ratio', 'High-frequency energy', 'percent'), metric('dct_hf_ratio', 'DCT high-frequency energy', 'percent'), metric('channel_variance', 'Channel disparity'), metric('pc3_variance_ratio', 'PC3 variance ratio', 'percent'), metric('hpf_variance', 'High-pass variance'), metric('dwt_var', 'Wavelet detail variance')],
    note: 'Spectra and charts use their own axes and are shown directly. Only spatial maps can be wiped against the source frame.',
  },
  lighting: {
    title: 'Lighting consistency', description: 'Estimated face shading and background illumination direction.',
    module: 'lighting_analysis', score: 'lighting_anomaly_score', topScore: 'lighting_score',
    exhibits: [exhibit('lighting', 'Lighting overlay', 'lighting_map_path', true), exhibit('probe', 'Estimated light probe', 'chrome_probe_path', false, 'Rendered from estimated coefficients; not a photographed object.'), exhibit('residual', 'Shading residual', 'shading_residual_path')],
    metrics: [metric('face_light_angle', 'Face direction', 'number', '°'), metric('bg_light_angle', 'Background direction', 'number', '°'), metric('angle_difference', 'Angular difference', 'number', '°')],
    note: 'Texture and complex illumination can make these estimates uncertain. Review detector warnings.',
  },
  color: {
    title: 'Chrominance analysis', description: 'Whole-frame color variation across YCbCr, HSV, and LAB channels.',
    module: 'color_analysis', score: 'color_anomaly_score', topScore: 'color_score',
    exhibits: [exhibit('cb', 'Cb channel', 'cb_map_path', true), exhibit('cr', 'Cr channel', 'cr_map_path', true), exhibit('saturation', 'Saturation', 's_map_path', true), exhibit('lab', 'LAB a*', 'a_map_path', true)],
    metrics: [metric('cb_variance', 'Cb variance'), metric('cr_variance', 'Cr variance'), metric('s_variance', 'Saturation variance'), metric('a_variance', 'LAB a* variance')],
    note: 'Color grading and image content affect these values. LAB color variation alone does not measure blood flow.',
  },
  eye: {
    title: 'Eye movement', description: 'Observed eye aspect ratios and blinking over the sampled interval.',
    module: 'eye_analysis', score: 'eye_anomaly_score', topScore: 'eye_score', video: true,
    exhibits: [exhibit('ear', 'Eye aspect ratio trace', 'eye_plot_path')],
    metrics: [metric('valid_frame_count', 'Valid observations', 'integer'), metric('blink_count', 'Detected blinks', 'integer'), metric('blink_rate_per_min', 'Blink rate', 'number', '/min'), metric('gaze_asymmetry', 'Eye asymmetry')],
    note: 'A short observation or missing face tracking cannot establish an abnormal blink pattern.',
  },
  rppg: {
    title: 'Pulse-like variation', description: 'Color variation in tracked facial regions and its pulse-band spectrum.',
    module: 'rppg_analysis', score: 'rppg_anomaly_score', topScore: 'rppg_score', video: true,
    exhibits: [exhibit('pulse', 'Waveform and spectrum', 'signal_plot_path'), exhibit('roi', 'Tracked facial regions', 'rppg_map_path')],
    metrics: [metric('heart_rate', 'Estimated peak rate', 'number', 'BPM'), metric('snr', 'Peak / mean power', 'number', 'ratio'), metric('valid_frame_count', 'Valid observations', 'integer'), metric('has_pulse', 'Pulse-like peak', 'boolean')],
    note: 'Motion, compression, and lighting affect this signal. A spectral peak does not prove biological authenticity.',
  },
  flow: {
    title: 'Motion consistency', description: 'DIS optical flow and changes in measured motion variance.',
    module: 'flow_analysis', score: 'flow_anomaly_score', topScore: 'flow_score', video: true,
    exhibits: [exhibit('trace', 'Motion variance trace', 'flow_plot_path'), exhibit('field', 'Flow direction field', 'flow_field_path')],
    metrics: [metric('mean_motion_variance', 'Mean motion variance')],
    note: 'Camera movement and scene changes can produce variation. A center-region fallback is identified in the warnings.',
  },
  audio: {
    title: 'Audio–visual distance', description: 'Aligned audio/video embedding distances from SyncNet.',
    module: 'sync_analysis', score: 'sync_score', topScore: 'sync_score', video: true, audio: true,
    exhibits: [exhibit('sync', 'Aligned distance trace', 'sync_plot_path')],
    metrics: [metric('lse_d', 'Mean aligned distance'), metric('lse_c', 'Offset confidence'), metric('correlation', 'Measured correlation')],
    note: 'Temporal-offset confidence is unavailable when no offset search was performed. Distance thresholds require validation.',
  },
  voice: {
    title: 'Voice anti-spoofing', description: 'Audio model output and measured spectral statistics.',
    module: 'voice_analysis', score: 'voice_anomaly_score', topScore: 'voice_score', video: true, audio: true,
    exhibits: [exhibit('voice', 'Waveform and mel spectrogram', 'voice_plot_path')],
    metrics: [metric('high_freq_ratio', '6.4–8 kHz magnitude ratio'), metric('zcr_variance', 'Zero-crossing variance'), metric('spectral_rolloff_mean', '85% spectral rolloff', 'number', 'Hz')],
    note: 'A lower spoofing score does not verify speaker identity. Silence or missing model output is unavailable evidence.',
  },
  meta: { title: 'Container metadata', description: 'Metadata extracted from the uploaded file.', module: 'metadata_analysis', score: 'metadata_anomaly_score', topScore: 'metadata_score', exhibits: [], metrics: [] },
};

export const DOMAIN_GROUPS = [
  { id: 'dossier', label: 'Overview', tests: [] },
  { id: 'visual', label: 'Neural XAI', tests: ['visual'] },
  { id: 'optics', label: 'Image evidence', tests: ['ela', 'noise', 'cfa', 'corneal', 'lighting'] },
  { id: 'biometrics', label: 'Face & motion', tests: ['geometry', 'eye', 'rppg', 'flow'] },
  { id: 'spectral_audio', label: 'Spectrum & audio', tests: ['frequency', 'color', 'meta', 'audio', 'voice'] },
];
