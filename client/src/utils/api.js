import { virtualRequest } from '../lib/virtual-backend';

const API_BASE = '/api';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname || '';
  return h.endsWith('github.io') || window.location.protocol === 'file:';
}

function parseParams(url) {
  const q = url.includes('?') ? url.split('?')[1] : '';
  return Object.fromEntries(new URLSearchParams(q));
}

async function request(url, options = {}) {
  if (isStandalone()) {
    const [path] = url.split('?');
    const method = (options.method || 'GET').toLowerCase();
    const body = options.body ? JSON.parse(options.body) : undefined;
    return virtualRequest(method, path, body, parseParams(url));
  }

  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  get: (url, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(url + qs);
  },
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => {
    if (isStandalone()) return virtualRequest('post', url, formData, {});
    return fetch(`${API_BASE}${url}`, { method: 'POST', body: formData }).then(r => r.json());
  },
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 }).format(amount || 0);
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}