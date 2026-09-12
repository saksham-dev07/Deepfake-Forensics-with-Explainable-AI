// High-fidelity forensic sample reports for instant demonstration and testing

// Procedural SVG data-URIs for realistic forensic heatmaps
const makeFaceSvg = (type) => {
  if (type === 'gradcam_hot') {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
        <defs>
          <radialGradient id="heat" cx="50%" cy="45%" r="40%">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.9" />
            <stop offset="40%" stop-color="#f59e0b" stop-opacity="0.7" />
            <stop offset="70%" stop-color="#3b82f6" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0.1" />
          </radialGradient>
        </defs>
        <rect width="380" height="380" fill="#0b0f19" />
        <ellipse cx="190" cy="190" rx="110" ry="145" fill="#1e293b" stroke="#334155" stroke-width="2" />
        <ellipse cx="150" cy="165" rx="18" ry="12" fill="#38bdf8" opacity="0.8" />
        <ellipse cx="230" cy="165" rx="18" ry="12" fill="#38bdf8" opacity="0.8" />
        <path d="M 190 175 L 182 215 L 198 215 Z" fill="#475569" />
        <path d="M 160 250 Q 190 270 220 250" stroke="#f43f5e" stroke-width="4" fill="none" />
        <circle cx="190" cy="235" r="75" fill="url(#heat)" />
      </svg>
    `);
  }
  if (type === 'ela_artifact') {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
        <rect width="380" height="380" fill="#05070d" />
        <path d="M 130 140 Q 190 110 250 140 Q 280 230 250 290 Q 190 320 130 290 Z" fill="none" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,3" opacity="0.4" />
        <circle cx="190" cy="245" r="45" fill="#ef4444" opacity="0.65" />
        <circle cx="155" cy="170" r="25" fill="#e11d48" opacity="0.5" />
        <circle cx="225" cy="170" r="25" fill="#e11d48" opacity="0.5" />
      </svg>
    `);
  }
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
      <rect width="380" height="380" fill="#090d16" />
      <ellipse cx="190" cy="190" rx="105" ry="140" fill="#151d2e" stroke="#253248" stroke-width="1.5" />
      <circle cx="150" cy="165" r="10" fill="#10b981" opacity="0.9" />
      <circle cx="230" cy="165" r="10" fill="#10b981" opacity="0.9" />
      <path d="M 190 175 L 185 210 L 195 210 Z" fill="#334155" />
      <path d="M 165 250 Q 190 265 215 250" stroke="#10b981" stroke-width="2" fill="none" />
    </svg>
  `);
};

export const SAMPLE_REPORTS = {
  deepfake_face: {
    meta: {
      id: 'DF-8921-SYNTH',
      title: 'Synthesized Face Swap (Video)',
      fileName: 'target_interview_deepfake_v2.mp4',
      type: 'video',
      badge: 'Synthetic Deepfake',
      riskColor: 'danger',
    },
    result: {
      overall_score: 0.884,
      verdict: 'Deepfake Detected (High Confidence)',
      is_ai_altered: false,
      alteration_type: 'Full Face Swap Synthesis',
      alteration_details: 'Discontinuities detected across boundary blending seam, Bayer CFA grid, and rPPG blood flow.',
      frames_analyzed: 48,
      nn_score: 0.923,
      spectral_anomaly_score: 0.841,
      ela_score: 0.792,
      geometry_anomaly_score: 0.765,
      noise_score: 0.812,
      color_score: 0.694,
      sync_score: 0.835,
      metadata_score: 0.450,
      rppg_score: 0.875,
      lighting_score: 0.720,
      eye_score: 0.810,
      voice_score: 0.860,
      flow_score: 0.745,
      cfa_score: 0.830,
      corneal_score: 0.790,
      frame_scores: [0.82, 0.85, 0.89, 0.91, 0.88, 0.87, 0.92, 0.88, 0.86, 0.90],
      frame_scores_std: 0.031,
      temporal_consistency: 'Consistent',
      shap_top_features: [
        { feature: 'Backbone EfficientNet-B4', importance: 0.28, direction: 'FAKE' },
        { feature: 'Corneal Specular NCC', importance: 0.18, direction: 'FAKE' },
        { feature: 'Bayer CFA Grid Residual', importance: 0.16, direction: 'FAKE' },
        { feature: '2D FFT Azimuthal Decay', importance: 0.14, direction: 'FAKE' },
        { feature: 'Subcutaneous rPPG Pulse', importance: 0.12, direction: 'FAKE' },
      ],
      heatmaps: {
        gradcam_overlay: makeFaceSvg('gradcam_hot'),
        guided_gradcam: makeFaceSvg('gradcam_hot'),
        ela_overlay: makeFaceSvg('ela_artifact'),
        original_face: makeFaceSvg('nominal')
      },
      file_metadata: {
        file_size_bytes: 4210400,
        original_resolution: '1920 × 1080',
        has_audio: true,
        image_quality: 'Sharp / High Definition',
        laplacian_variance: 512.4
      }
    }
  },

  pristine_capture: {
    meta: {
      id: 'AUTH-1044-RAW',
      title: 'Pristine Camera Capture (Authentic DSLR)',
      fileName: 'camera_direct_interview_raw.mp4',
      type: 'video',
      badge: 'Verified Authentic',
      riskColor: 'success',
    },
    result: {
      overall_score: 0.048,
      verdict: 'Authentic Media (Genuine Capture)',
      is_ai_altered: false,
      alteration_type: 'None',
      alteration_details: 'Sensor PRNU noise pattern, corneal optics, and cardiovascular pulse are fully consistent with authentic optical capture.',
      frames_analyzed: 64,
      nn_score: 0.035,
      spectral_anomaly_score: 0.062,
      ela_score: 0.051,
      geometry_anomaly_score: 0.040,
      noise_score: 0.072,
      color_score: 0.045,
      sync_score: 0.088,
      metadata_score: 0.020,
      rppg_score: 0.038,
      lighting_score: 0.065,
      eye_score: 0.050,
      voice_score: 0.042,
      flow_score: 0.055,
      cfa_score: 0.040,
      corneal_score: 0.035,
      frame_scores: [0.04, 0.05, 0.04, 0.06, 0.04, 0.05, 0.04, 0.05, 0.04, 0.05],
      frame_scores_std: 0.006,
      temporal_consistency: 'Consistent',
      shap_top_features: [
        { feature: 'Natural PRNU Sensor Noise', importance: 0.26, direction: 'AUTHENTIC' },
        { feature: 'Intact Bayer CFA Pattern', importance: 0.22, direction: 'AUTHENTIC' },
        { feature: 'Corneal Highlight NCC Match', importance: 0.20, direction: 'AUTHENTIC' },
        { feature: 'Subcutaneous rPPG Pulse', importance: 0.18, direction: 'AUTHENTIC' },
        { feature: 'Audio-Visual SyncNet Alignment', importance: 0.14, direction: 'AUTHENTIC' },
      ],
      heatmaps: {
        gradcam_overlay: makeFaceSvg('nominal'),
        guided_gradcam: makeFaceSvg('nominal'),
        ela_overlay: makeFaceSvg('nominal'),
        original_face: makeFaceSvg('nominal')
      },
      file_metadata: {
        file_size_bytes: 8740200,
        original_resolution: '3840 × 2160',
        has_audio: true,
        image_quality: 'Pristine 4K UHD Master',
        laplacian_variance: 842.1
      }
    }
  },

  ai_altered: {
    meta: {
      id: 'ALT-4519-ENH',
      title: 'Authentic Human • AI Retouching / Inpainting',
      fileName: 'executive_portrait_retouched.jpg',
      type: 'image',
      badge: 'AI Altered',
      riskColor: 'warning',
    },
    result: {
      overall_score: 0.582,
      verdict: 'Authentic with Generative Alterations',
      is_ai_altered: true,
      alteration_type: 'Localized Generative Inpainting / Skin Retouching',
      alteration_details: 'Core facial biometrics match authentic human, but localized synthetic smoothing is present in the lower cheek and hairline.',
      frames_analyzed: 1,
      nn_score: 0.420,
      spectral_anomaly_score: 0.610,
      ela_score: 0.685,
      geometry_anomaly_score: 0.310,
      noise_score: 0.620,
      color_score: 0.490,
      sync_score: 0.0,
      metadata_score: 0.210,
      rppg_score: 0.0,
      lighting_score: 0.410,
      eye_score: 0.250,
      voice_score: 0.0,
      flow_score: 0.0,
      cfa_score: 0.640,
      corneal_score: 0.380,
      frame_scores: [0.582],
      frame_scores_std: 0.0,
      temporal_consistency: 'Consistent',
      shap_top_features: [
        { feature: 'Localized ELA High Residual', importance: 0.32, direction: 'FAKE' },
        { feature: 'Bayer Demosaic Disruption', importance: 0.24, direction: 'FAKE' },
        { feature: 'Preserved 3D Face Geometry', importance: 0.22, direction: 'AUTHENTIC' },
        { feature: 'Authentic Corneal Reflection', importance: 0.12, direction: 'AUTHENTIC' },
      ],
      heatmaps: {
        gradcam_overlay: makeFaceSvg('ela_artifact'),
        guided_gradcam: makeFaceSvg('ela_artifact'),
        ela_overlay: makeFaceSvg('ela_artifact'),
        original_face: makeFaceSvg('nominal')
      },
      file_metadata: {
        file_size_bytes: 654200,
        original_resolution: '2048 × 2048',
        has_audio: false,
        image_quality: 'High Resolution Still',
        laplacian_variance: 490.5
      }
    }
  }
};
