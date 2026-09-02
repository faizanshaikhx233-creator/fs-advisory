import seed from './seed.json' with { type: 'json' };

const KEY = 'fs-advisory-data-v1';

function loadTables() {
  const base = JSON.parse(JSON.stringify(seed));
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const p = JSON.parse(saved);
        for (const t of Object.keys(seed)) {
          if (Array.isArray(p[t])) base[t] = p[t];
        }
      }
    } catch (e) { console.warn('Could not load saved data', e); }
  }
  return base;
}

const tables = loadTables();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(tables)); } catch (e) { console.warn('Could not save data', e); }
}

function nextId(name) {
  const rows = tables[name] || [];
  if (rows.length === 0) return 1;
  return Math.max(...rows.map(r => r.id)) + 1;
}

export function table(name) {
  return {
    all() { return tables[name] || []; },
    get(id) { return (tables[name] || []).find(r => r.id == id); },
    where(fn) { return (tables[name] || []).filter(fn); },
    replaceAll(rows) { tables[name] = rows; persist(); return tables[name]; },
    insert(row) {
      const r = { id: nextId(name), ...row };
      (tables[name] || (tables[name] = [])).push(r);
      persist();
      return r;
    },
    update(id, patch) {
      const t = tables[name];
      if (!t) return null;
      const idx = t.findIndex(r => r.id == id);
      if (idx === -1) return null;
      t[idx] = { ...t[idx], ...patch, id: Number(id) };
      persist();
      return t[idx];
    },
    remove(id) {
      const t = tables[name];
      if (!t) return false;
      const idx = t.findIndex(r => r.id == id);
      if (idx === -1) return false;
      t.splice(idx, 1);
      persist();
      return true;
    },
  };
}

export function accountByCode(code) {
  return table('chart_of_accounts').where(a => a.code === code)[0];
}

export function exportData() {
  return tables;
}

export function importData(json) {
  const p = JSON.parse(json);
  for (const t of Object.keys(tables)) {
    if (Array.isArray(p[t])) tables[t] = p[t];
  }
  persist();
}