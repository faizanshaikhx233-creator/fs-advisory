// Posts all bank transactions + trade license as balanced journal entries.
// Classification rules:
//  - Money received FROM Faraz Shafi  -> Owner's Capital (3000)
//  - Money paid TO Faraz Shafi        -> Owner's Drawings (3100)
//  - Recognized subscriptions/platforms -> categorized
//  - Unknown transactions              -> Suspense (8000) [user will reclassify]

const API = 'http://localhost:3001/api';

async function call(method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url}: ${JSON.stringify(data)}`);
  return data;
}

const accountCache = {};
async function accountId(code) {
  if (accountCache[code]) return accountCache[code];
  const accounts = await call('GET', '/accounts');
  const acc = accounts.find(a => a.code === code);
  if (!acc) throw new Error(`Account not found: ${code}`);
  accountCache[code] = acc.id;
  return acc.id;
}

const existingDescs = new Set();
async function ensureAccounts() {
  const accounts = await call('GET', '/accounts');
  const codes = new Set(accounts.map(a => a.code));
  const toAdd = [
    ['1021', 'Bank - Mashreq (Operating)', 'Asset', 'Current'],
    ['1022', 'Bank - WIO', 'Asset', 'Current'],
    ['8000', 'Suspense (Unclassified)', 'Equity', 'Suspense'],
  ];
  for (const [code, name, type, sub] of toAdd) {
    if (!codes.has(code)) {
      await call('POST', '/accounts', { code, name, type, sub_type: sub });
      console.log(`Added account ${code} ${name}`);
    }
  }
}

async function postJE(date, description, drCode, drAmount, crCode, crAmount) {
  const ref = `TX-${date}-${Date.now()}-${Math.floor(Math.random()*99999)}`;
  try {
    await call('POST', '/journal-entries', {
      date,
      description,
      reference: ref,
      lines: [
        { account_id: await accountId(drCode), debit: drAmount, credit: 0, description: `${drCode}` },
        { account_id: await accountId(crCode), debit: 0, credit: crAmount, description: `${crCode}` },
      ],
    });
    console.log(`OK  ${date}  ${description}  [Dr ${drCode} ${drAmount} / Cr ${crCode} ${crAmount}]`);
  } catch (e) {
    console.log(`FAIL ${description}: ${e.message}`);
  }
}

// ---------- TRADE LICENSE ----------
async function postTradeLicense() {
  await postJE('2026-02-12', 'Trade License (capital contribution)', '6500', 11720, '3000', 11720);
}

// ---------- MASHTREQ (bank 1021) ----------
// [date, description, amount, credit?true/debit?false, accountCode]
// credit=true means money IN (Dr bank), debit=true means money OUT (Cr bank)
const mashreq = [
  ['2026-04-09', 'Faraz Shafi - personal investment (share capital)', 25000.00, 'C', '3000'],
  ['2026-05-01', 'VAT Output paid - Mashreq', 10.00, 'D', '2100'],
  ['2026-05-01', 'Monthly maintenance fee - Mashreq', 200.00, 'D', '6800'],
  ['2026-05-07', 'ATM cash withdrawal - Petty Cash', 10000.00, 'D', '1010'],
  ['2026-05-07', 'Faraz Shafi - share capital', 40000.00, 'C', '3000'],
  ['2026-05-22', 'Faraz Shafi - share capital', 4000.00, 'C', '3000'],
  ['2026-05-22', 'Urooj Khan IT Solution - computer services', 2145.00, 'D', '8000'],
  ['2026-05-30', 'VAT Output paid - Mashreq', 10.00, 'D', '2100'],
  ['2026-05-30', 'Monthly maintenance fee - Mashreq', 200.00, 'D', '6800'],
  ['2026-06-10', 'DU Quick Pay (telecom)', 250.00, 'D', '6120'],
  ['2026-06-16', 'PropertyFinder.com listing', 1218.00, 'D', '6300'],
  ['2026-06-18', 'Digital Dubai - Dubaipoli (subscription)', 220.00, 'D', '8000'],
  ['2026-06-20', 'Trakheesi (DLD platform subscription)', 520.00, 'D', '7600'],
  ['2026-06-20', 'ERES training', 784.67, 'D', '7700'],
  ['2026-06-22', 'NeverBounce (email validation SaaS)', 376.22, 'D', '7600'],
  ['2026-06-25', 'Trakheesi (DLD platform subscription)', 398.00, 'D', '7600'],
  ['2026-06-27', 'Rommelyn Gupo Capinig - security deposit', 3000.00, 'C', '2400'],
  ['2026-06-29', 'Rommelyn Gupo Capinig - agency fee', 3150.00, 'C', '4000'],
  ['2026-06-30', 'Abdullah Al Mulla - auditing/consultancy', 1050.00, 'D', '6720'],
  ['2026-07-02', 'Sendinblue (email marketing SaaS)', 300.24, 'D', '6300'],
  ['2026-07-03', 'Makomborero allowance', 500.00, 'D', '8000'],
  ['2026-07-06', 'GoDaddy (domain)', 107.86, 'D', '7600'],
  ['2026-07-06', 'ATM cash withdrawal - Petty Cash', 5000.00, 'D', '1010'],
  ['2026-07-06', 'ATM cash withdrawal - Petty Cash', 5000.00, 'D', '1010'],
  ['2026-07-07', 'ATM usage fee', 2.00, 'D', '6800'],
  ['2026-07-07', 'VAT Output paid - ATM', 0.10, 'D', '2100'],
  ['2026-07-07', 'ATM usage fee', 2.00, 'D', '6800'],
  ['2026-07-07', 'VAT Output paid - ATM', 0.10, 'D', '2100'],
  ['2026-07-08', 'Alif accounting & tax - admin/general', 1575.00, 'D', '6720'],
  ['2026-07-10', 'DU Quick Pay (telecom)', 254.00, 'D', '6120'],
  ['2026-07-10', 'E& ETC B2B (telecom)', 319.92, 'D', '6120'],
  ['2026-07-10', 'E& Telecom Corp', 525.95, 'D', '6120'],
  ['2026-07-11', 'Akhtar Farooq - construction services', 1045.00, 'D', '8000'],
  ['2026-07-11', 'Nazeef - rent payment deposit (Lawnz)', 1794.00, 'D', '6000'],
  ['2026-07-11', 'Faraz Shafi - allowance', 161.00, 'D', '3100'],
  ['2026-07-14', 'Alaa Rustum - commission for rent', 5250.00, 'C', '4300'],
  ['2026-07-14', 'Bethan Liane Boddy - brokerage fee', 27300.00, 'C', '4000'],
  ['2026-07-16', 'PropertyFinder.com listing', 1218.00, 'D', '6300'],
  ['2026-07-17', 'E& Digital App (telecom)', 1366.25, 'D', '6120'],
  ['2026-07-21', 'NeverBounce (email validation SaaS)', 376.26, 'D', '7600'],
  ['2026-07-22', 'Anthropic Claude subscription', 79.81, 'D', '7600'],
  ['2026-07-24', 'TechnePlus MEA (transfer)', 1000.00, 'C', '8000'],
  ['2026-07-24', 'GoDaddy (domain)', 50.25, 'D', '7600'],
  ['2026-07-27', 'GoDaddy (domain)', 302.62, 'D', '7600'],
  ['2026-07-30', 'Faraz Shafi - commission payment', 17000.00, 'D', '3100'],
  ['2026-08-01', 'Faraz Shafi - allowance', 10000.00, 'D', '3100'],
  ['2026-08-01', 'Sendinblue (email marketing SaaS)', 300.24, 'D', '6300'],
  ['2026-08-03', 'Makomborero allowance', 500.00, 'D', '8000'],
  ['2026-08-03', 'Makomborero allowance (reversal)', 500.00, 'C', '8000'],
  ['2026-08-04', 'Makomborero allowance', 500.00, 'D', '8000'],
  ['2026-08-13', 'E& Telecom Corp', 528.47, 'D', '6120'],
  ['2026-08-14', 'E& ETC B2B (telecom)', 432.66, 'D', '6120'],
  ['2026-08-14', 'DU Quick Pay (telecom)', 252.00, 'D', '6120'],
  ['2026-08-17', 'PropertyFinder.com listing', 1218.00, 'D', '6300'],
  ['2026-08-17', 'Eunice Sharon allowance', 1500.00, 'D', '8000'],
  ['2026-08-17', 'Faraz Shafi - consultancy fee', 150.00, 'D', '3100'],
  ['2026-08-17', 'Management consultancy services', 15000.00, 'D', '8000'],
  ['2026-08-17', 'Faraz Shafi - loan (personal investment)', 10000.00, 'C', '3000'],
  ['2026-08-17', 'Samana Intl Real Estate - commission (SFCOM)', 76930.00, 'C', '4000'],
  ['2026-08-21', 'TechnePlus MEA - professional services', 500.00, 'C', '8000'],
  ['2026-08-22', 'Fiverr (freelance services)', 33.37, 'D', '6700'],
  ['2026-08-22', 'Google Workspace_fsadviso', 205.72, 'D', '7600'],
  ['2026-08-24', 'Riad Zaki - repair & maintenance services', 1380.75, 'C', '4100'],
  ['2026-08-31', 'Rishi Nagrath - Ubora brokerage', 5000.00, 'C', '4000'],
  ['2026-08-31', 'Rishi Nagrath - Ubora brokerage', 250.00, 'C', '4000'],
];

// ---------- WIO (bank 1022) ----------
const wio = [
  ['2026-02-12', 'Faraz Shafi - capital', 5000.00, 'C', '3000'],
  ['2026-02-26', 'To Siddiq', 1100.00, 'D', '8000'],
  ['2026-03-05', 'Digital Dubai - Dubaipoli (subscription)', 220.00, 'D', '8000'],
  ['2026-03-05', 'ERES training', 784.67, 'D', '7700'],
  ['2026-03-11', 'Subscription fee - WIO', 99.00, 'D', '7600'],
  ['2026-03-12', 'To Faraz Shafi', 797.00, 'D', '3100'],
  ['2026-03-12', 'To Faraz Shafi', 192.00, 'D', '3100'],
  ['2026-03-12', 'To Faraz Shafi', 137.00, 'D', '3100'],
  ['2026-04-02', 'To Siddiq', 700.00, 'D', '8000'],
  ['2026-04-02', 'Google Workspace_fsprop', 0.92, 'D', '7600'],
  ['2026-04-02', 'Foreign exchange transaction fee', 0.01, 'D', '6800'],
  ['2026-04-02', 'Google Workspace_fsadvi', 0.92, 'D', '7600'],
  ['2026-04-02', 'Foreign exchange transaction fee', 0.01, 'D', '6800'],
  ['2026-04-11', 'Subscription fee - WIO', 99.00, 'D', '7600'],
  ['2026-04-20', 'Tilda (website builder)', 185.00, 'D', '7600'],
  ['2026-05-02', 'Google Workspace_fsadvi', 27.97, 'D', '7600'],
  ['2026-05-02', 'Foreign exchange transaction fee', 0.55, 'D', '6800'],
  ['2026-05-11', 'Subscription fee - WIO', 99.00, 'D', '7600'],
  ['2026-05-20', 'Tilda (website builder)', 185.00, 'D', '7600'],
  ['2026-06-02', 'Google Workspace_fsadvi', 27.97, 'D', '7600'],
  ['2026-06-02', 'Foreign exchange transaction fee', 0.55, 'D', '6800'],
  ['2026-06-11', 'Subscription fee - WIO', 99.00, 'D', '7600'],
  ['2026-06-18', 'Namecheap (domain)', 69.12, 'D', '7600'],
  ['2026-06-18', 'Foreign exchange transaction fee', 1.38, 'D', '6800'],
  ['2026-06-19', 'GoDaddy (domain)', 70.14, 'D', '7600'],
  ['2026-06-19', 'Foreign exchange transaction fee', 1.40, 'D', '6800'],
  ['2026-07-03', 'Google Workspace_fsadvi', 60.68, 'D', '7600'],
  ['2026-07-03', 'Foreign exchange transaction fee', 1.21, 'D', '6800'],
];

async function postBank(bankCode, bankCodeLabel, rows) {
  for (const [date, desc, amount, dir, account] of rows) {
    const bankAccount = bankCode;
    if (dir === 'C') {
      // money in: Dr bank / Cr account
      await postJE(date, `${bankCodeLabel} - ${desc}`, bankAccount, amount, account, amount);
    } else {
      // money out: Cr bank / Dr account
      await postJE(date, `${bankCodeLabel} - ${desc}`, account, amount, bankAccount, amount);
    }
  }
}

(async () => {
  await ensureAccounts();
  console.log('\n--- Trade License ---');
  await postTradeLicense();
  console.log('\n--- Mashreq ---');
  await postBank('1021', 'MASHREQ', mashreq);
  console.log('\n--- WIO ---');
  await postBank('1022', 'WIO', wio);
  console.log('\nDONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
