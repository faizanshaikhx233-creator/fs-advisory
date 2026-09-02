// Generates client/src/lib/seed.json from the local ledger (server/data/*.json)
// so the GitHub Pages build ships with all current data embedded.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'server', 'data');
const OUT = path.join(__dirname, '..', 'client', 'src', 'lib', 'seed.json');
const TABLES = [
  'chart_of_accounts', 'journal_entries', 'journal_lines', 'people',
  'deals', 'deal_assignments', 'bank_imports', 'bank_transactions', 'settings'
];

const seed = {};
for (const t of TABLES) {
  const file = path.join(DATA_DIR, `${t}.json`);
  if (fs.existsSync(file)) {
    seed[t] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    seed[t] = [];
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(seed));
console.log('seed.json written with', Object.entries(seed).map(([k, v]) => `${k}:${v.length}`).join(', '));