let internalBaseUrl: string | null = null;
let internalAuthBaseUrl: string | null = null;
let internalTurnstileSiteKey: string | null = null;

export const configure = (config: { baseURL?: string; authBaseURL?: string; turnstileSiteKey?: string }) => {
  if (config.baseURL) {
    internalBaseUrl = config.baseURL;
    API_CONFIG.baseURL = getApiBaseUrl();
  }
  if (config.authBaseURL) {
    internalAuthBaseUrl = config.authBaseURL;
    AUTH_CONFIG.baseURL = getAuthBaseUrl();
  }
  if (config.turnstileSiteKey) internalTurnstileSiteKey = config.turnstileSiteKey;
};

// Get API base URL - works in both Node.js and browser environments
const getApiBaseUrl = (): string => {
  let url = internalBaseUrl || 'http://localhost:3000';

  if (typeof process !== 'undefined' && (process as any).env) {
    const env = (process as any).env;
    const vUrl = env['VITE_API_URL'];
    const aUrl = env['API_BASE_URL'];
    const eUrl = env['EXPO_PUBLIC_API_URL'];

    if (vUrl && vUrl.trim().length > 0) url = vUrl;
    else if (aUrl && aUrl.trim().length > 0) url = aUrl;
    else if (eUrl && eUrl.trim().length > 0) url = eUrl;
  }

  // Final Safety Check for Production Domains
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isProdDomain = hostname.includes('ofeklabs.dev') || hostname.includes('onrender.com');

    if (isProdDomain && url.includes('localhost')) {
      url = 'https://api.horizon-flux.ofeklabs.dev';
    }
  }

  // Cleanup: Remove trailing slash
  url = url.replace(/\/$/, '');

  // CRITICAL: Ensure /api/v1 prefix is present for ALL environments.
  const hasPrefix = url.toLowerCase().includes('/api/v1');

  if (!hasPrefix) {
    return `${url}/api/v1`;
  }

  return url;
};

export const getTurnstileSiteKey = (): string | null => {
  if (internalTurnstileSiteKey) return internalTurnstileSiteKey;
  if (typeof window !== 'undefined') {
    return (window as any).__VITE_TURNSTILE_SITE_KEY__ || null;
  }
  return null;
};

// Get Auth base URL (Identity Service)
const getAuthBaseUrl = (): string => {
  let url = internalAuthBaseUrl || '';

  if (!url && typeof process !== 'undefined' && (process as any).env) {
    const env = (process as any).env;
    url = env['VITE_AUTH_API_URL'] || env['AUTH_API_URL'] || '';
  }

  // If no specific auth URL, fall back to the main API root (legacy support)
  if (!url || url.trim().length === 0) {
    return getApiBaseUrl().split('/api/v1')[0];
  }

  return url.replace(/\/$/, '');
};

export const API_CONFIG = {
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
};

export const AUTH_CONFIG = {
  baseURL: getAuthBaseUrl(),
  timeout: 30000,
};

export const getApiUrl = (path: string): string => {
  const base = API_CONFIG.baseURL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${cleanPath}`;
};

export const getAuthUrl = (path: string): string => {
  const base = AUTH_CONFIG.baseURL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${cleanPath}`;
};

/**
 * Helper to get the root URL (without /api/v1) for static assets like uploads
 */
export const getAssetUrl = (path: string, includeCacheBuster = true): string => {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const root = API_CONFIG.baseURL.split('/api/v1')[0].replace(/\/$/, '');
  let cleanPath = path.replace(/\\/g, '/');
  cleanPath = cleanPath.replace(/^(\/)?uploads\//, '');
  cleanPath = cleanPath.replace(/^\//, '');

  const url = `${root}/uploads/${cleanPath}`;

  if (includeCacheBuster) {
    const buster = Date.now();
    return `${url}?t=${buster}`;
  }

  return url;
};
