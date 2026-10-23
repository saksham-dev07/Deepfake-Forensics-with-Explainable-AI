import { API_BASE } from '../constants/api';

export const resolveMediaUrl = path => {
  if (typeof path !== 'string' || !path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_BASE}/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

/** Build-time public assets are served by the frontend, not the API origin. */
export const resolvePublicAssetUrl = path => `${import.meta.env.BASE_URL || '/'}${path.replace(/^\/+/, '')}`;

/** Only explicit face crops can be compared with neural face attention maps. */
export const resolveOriginalFaceUrl = result => {
  const path = result?.face_crop_path || result?.heatmaps?.original_face || result?.heatmaps?.face_crop;
  return typeof path === 'string' && path ? resolveMediaUrl(path) : null;
};

/** Full-frame diagnostics must not be paired with the neural detector's face crop. */
export const resolveOriginalFrameUrl = result => {
  const path = result?.first_frame_path || result?.heatmaps?.original_frame;
  return typeof path === 'string' && path ? resolveMediaUrl(path) : null;
};