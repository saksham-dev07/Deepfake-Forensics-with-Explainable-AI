import { API_BASE } from '../constants/api';

/**
 * Procedural fallback SVG generator when no media assets are available
 */
export const makeProceduralFaceSvg = (type = 'nominal') => {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="380" height="380" viewBox="0 0 380 380">
      <defs>
        <radialGradient id="mesh" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25" />
          <stop offset="70%" stop-color="#0284c7" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#030712" stop-opacity="0.8" />
        </radialGradient>
      </defs>
      <rect width="380" height="380" fill="#070a13" />
      <circle cx="190" cy="190" r="140" fill="url(#mesh)" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4,4" />
      <ellipse cx="190" cy="180" rx="90" ry="120" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity="0.6" />
      <circle cx="155" cy="160" r="12" fill="#38bdf8" opacity="0.85" />
      <circle cx="225" cy="160" r="12" fill="#38bdf8" opacity="0.85" />
      <path d="M 190 170 L 184 205 L 196 205 Z" fill="#38bdf8" opacity="0.7" />
      <path d="M 160 235 Q 190 255 220 235" stroke="#38bdf8" stroke-width="2.5" fill="none" opacity="0.8" />
      <text x="190" y="340" fill="#64748b" font-size="11" font-family="monospace" text-anchor="middle" letter-spacing="1">REFERENCE FACE FRAME</text>
    </svg>
  `);
};

/**
 * Unified resolver for the genuine original cropped face or frame
 * Checks explicit backend fields, sample reports, and derives paths from heatmaps
 */
export const resolveOriginalFaceUrl = (result) => {
  if (!result) return makeProceduralFaceSvg('nominal');

  // 1. Explicit face_crop_path from backend
  if (result.face_crop_path && typeof result.face_crop_path === 'string') {
    const clean = result.face_crop_path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (clean.startsWith('http') || clean.startsWith('data:')) return clean;
    return `${API_BASE}/${clean}`;
  }

  // 2. Object-style heatmaps with original_face / face_crop (e.g. sample presets)
  if (result.heatmaps && typeof result.heatmaps === 'object' && !Array.isArray(result.heatmaps)) {
    if (result.heatmaps.original_face) return result.heatmaps.original_face;
    if (result.heatmaps.face_crop) return result.heatmaps.face_crop;
  }

  // 3. Derived from heatmaps array (uploads/<job_id>_frames/heatmap_0.jpg -> uploads/<job_id>_frames/face_crop.jpg)
  if (Array.isArray(result.heatmaps) && result.heatmaps[0] && typeof result.heatmaps[0] === 'string') {
    const cleanHm = result.heatmaps[0].replace(/\\/g, '/').replace(/^\/+/, '');
    const lastSlash = cleanHm.lastIndexOf('/');
    if (lastSlash !== -1) {
      const folder = cleanHm.substring(0, lastSlash);
      return `${API_BASE}/${folder}/face_crop.jpg`;
    }
  }

  // 4. Explicit first_frame_path
  if (result.first_frame_path && typeof result.first_frame_path === 'string') {
    const clean = result.first_frame_path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (clean.startsWith('http') || clean.startsWith('data:')) return clean;
    return `${API_BASE}/${clean}`;
  }

  // 5. Check sub-modules that might retain the face crop path
  if (result.face_geometry?.face_crop_path) {
    const clean = result.face_geometry.face_crop_path.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${API_BASE}/${clean}`;
  }

  return makeProceduralFaceSvg('nominal');
};

/**
 * Bulletproof error recovery for face images:
 * - Tier 1: If face_crop.jpg fails (e.g. legacy job), try frame_0000.jpg from same frames folder
 * - Tier 2: If frame_0000.jpg fails or already attempted, revert to clean procedural SVG
 */
export const handleFaceImgError = (e, fallbackSvg = null) => {
  const target = e.currentTarget;
  const currentSrc = target.src || '';

  if (!target.dataset.fallbackLevel) {
    target.dataset.fallbackLevel = '1';
    if (currentSrc.includes('face_crop.jpg')) {
      target.src = currentSrc.replace('face_crop.jpg', 'frame_0000.jpg');
      return;
    }
  }

  target.onerror = null;
  target.src = fallbackSvg || makeProceduralFaceSvg('nominal');
};
