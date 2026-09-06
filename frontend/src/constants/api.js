/**
 * Unified API Configuration
 * Supports Localhost Development, Vercel Edge, and Hugging Face Spaces Containerization
 */

const rawApiUrl = import.meta.env.VITE_API_URL;

// Normalize API base: strip trailing slash to prevent double-slash proxy issues
export const API_BASE = (rawApiUrl !== undefined && rawApiUrl !== '')
  ? rawApiUrl.replace(/\/+$/, '')
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? ''
      : 'http://127.0.0.1:8000');

export const API_KEY = import.meta.env.VITE_API_KEY || 'deepforensics-dev-key';
