// Loads ALL local ledger data (server/data/*.json) into MongoDB.
// Usage:  node load-to-mongo.js "mongodb+srv://user:pass@cluster/..."
// It replaces each collection so the cloud DB exactly matches the local books.
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'fs_advisory';
const DATA_DIR = path.join(__dirname, 'server', 'data');
const TABLES = [
  'chart_of_accounts', 'journal_entries', 'journal_lines', 'people',
  'deals', 'deal_assignments', 'bank_imports', 'bank_transactions', 'settings'
];

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Usage: node load-to-mongo.js "mongodb+srv://user:pass@cluster.../"');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db(MONGO_DB_NAME);
  console.log('Connected to', MONGO_DB_NAME);

  for (const t of TABLES) {
    const file = path.join(DATA_DIR, `${t}.json`);
    let rows = [];
    if (fs.existsSync(file)) rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    await db.collection(t).deleteMany({});
    if (rows.length) await db.collection(t).insertMany(rows, { ordered: true });
    console.log(`  ${t}: ${rows.length} rows loaded`);
  }

  await client.close();
  console.log('Done - cloud database now matches your local books.');
}

main().catch(err => { console.error('FAILED:', err.message); process.exit(1); });