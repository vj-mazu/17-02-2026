let apiUrl = process.env.REACT_APP_API_URL || '';

if (!apiUrl) {
  apiUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : '/api';
}

// Self-healing URL normalization:
if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
  // Strip trailing slashes
  apiUrl = apiUrl.replace(/\/+$/, '');
  
  // Append '/api' if not present in the URL path, as backend APIs are mounted under /api
  if (!apiUrl.endsWith('/api') && !apiUrl.includes('/api/')) {
    apiUrl = `${apiUrl}/api`;
  }
} else {
  // Relative URL (e.g. '/api' or 'api')
  if (!apiUrl.startsWith('/')) {
    apiUrl = `/${apiUrl}`;
  }
  apiUrl = apiUrl.replace(/\/+$/, '');
  if (apiUrl === '' || apiUrl === '/') {
    apiUrl = '/api';
  }
}

console.log('[API Configuration] Centralized API URL:', apiUrl);

export const API_URL = apiUrl;
export default API_URL;
