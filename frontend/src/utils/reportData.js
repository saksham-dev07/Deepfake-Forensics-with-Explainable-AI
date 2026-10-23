import { DIAGNOSTICS } from '../constants/diagnostics';

export const finiteNumber = value => typeof value === 'number' && Number.isFinite(value);
export const formatPercent = (value, digits = 1) => {
  if (!finiteNumber(value) || value < 0 || value > 1) return 'N/A';
  const rounded = (value * 100).toFixed(digits);
  if (value > 0 && Number(rounded) === 0) return `<${(10 ** -digits).toFixed(digits)}%`;
  if (value < 1 && Number(rounded) === 100) return `>${(100 - 10 ** -digits).toFixed(digits)}%`;
  return `${rounded}%`;
};

export const formatValue = (value, format = 'number', unit = '') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (format === 'boolean') return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 'N/A';
  if (format === 'percent') return formatPercent(value);
  if (!finiteNumber(value)) return 'N/A';
  const number = Math.abs(value) > 0 && Math.abs(value) < 0.001 ? value.toExponential(2)
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: format === 'integer' ? 0 : 3 }).format(value);
  return `${number}${unit ? ` ${unit}` : ''}`;
};

export const readPath = (object, path) => path?.split('.').reduce((value, key) => value?.[key], object);

export const diagnosticData = (result = {}, id) => {
  const config = DIAGNOSTICS[id];
  const data = config.module ? result[config.module] || {} : result;
  const raw = data[config.score] ?? result[config.topScore];
  const warnings = [...(Array.isArray(data.warnings) ? data.warnings : []), data.warning, data.error].filter(value => typeof value === 'string' && value);
  const unavailable = data.available === false || Boolean(data.error) || data.face_detected === false || (raw === 0.5 && warnings.length > 0);
  const score = !unavailable && finiteNumber(raw) && raw >= 0 && raw <= 1 ? raw : null;
  return { config, data, score, warnings };
};

export const scoreStatus = score => !finiteNumber(score) ? 'Unavailable'
  : score === 0.5 ? 'Inconclusive' : score > 0.6 ? 'Elevated' : score > 0.35 ? 'Review' : 'Lower anomaly';

export const scoreColor = score => !finiteNumber(score) ? 'var(--text-muted)'
  : score > 0.6 ? 'var(--danger)' : score > 0.35 ? 'var(--warning)' : 'var(--success)';

export const availableTests = (result = {}, fileName = '') => {
  const video = /\.(mp4|avi|mov|mkv|webm)$/i.test(fileName);
  return Object.entries(DIAGNOSTICS).filter(([, config]) => (!config.video || video) && (!config.audio || result.file_metadata?.has_audio === true)).map(([id]) => id);
};
