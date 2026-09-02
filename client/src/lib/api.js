import { virtualRequest } from '@/src/lib/virtual-backend';

function parseParams(url) {
  const q = url.includes('?') ? url.split('?')[1] : '';
  return Object.fromEntries(new URLSearchParams(q));
}

async function request(url, options = {}) {
  const [path] = url.split('?');
  const method = (options.method || 'GET').toLowerCase();
  const body = options.body ? JSON.parse(options.body) : undefined;
  return virtualRequest(method, path, body, parseParams(url));
}

export const api = {
  get: (url, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(url + qs);
  },
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) => virtualRequest('post', url, formData, {}),
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 2 }).format(amount || 0);
}

export function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}