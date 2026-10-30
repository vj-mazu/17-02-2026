/**
 * API smoke + latency probe (read-only).
 * Usage: node scripts/smoke-latency.js [baseUrl] [iterations]
 */
const BASE = process.argv[2] || 'http://127.0.0.1:5055';
const ITER = Number(process.argv[3] || 15);

const endpoints = [
  '/api/health',
  '/api/auth/me',
  '/api/dashboard/stats',
  '/api/arrivals',
  '/api/arrivals/opening-balance',
  '/api/arrivals/next-sl-no',
  '/api/outturns',
  '/api/locations/warehouses',
  '/api/locations/kunchinittus',
  '/api/locations/varieties',
  '/api/locations/rice-stock-locations',
  '/api/locations/rice-varieties',
  '/api/locations/brokers',
  '/api/packagings',
  '/api/purchase-rates',
  '/api/hamali-rates',
  '/api/hamali-book',
  '/api/paddy-hamali-rates',
  '/api/rice-hamali-rates',
  '/api/rice-stock/summary',
  '/api/rice-stock/balances',
  '/api/unified-varieties',
  '/api/admin/users',
  '/api/metrics/performance'
];

const authFailures = [];
let token = null;

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

async function timed(url, opts) {
  const t0 = performance.now();
  let res, body;
  try {
    res = await fetch(url, opts);
    const text = await res.text();
    body = text;
  } catch (e) {
    return { ms: performance.now() - t0, status: 0, err: e.message, size: 0 };
  }
  return { ms: performance.now() - t0, status: res.status, size: body.length, body };
}

(async () => {
  console.log(`Base: ${BASE}  iterations: ${ITER}\n`);

  // --- Auth negatives ---
  let r = await timed(`${BASE}/api/arrivals`);
  console.log(`No-token GET /api/arrivals -> ${r.status} (expect 401)`);

  r = await timed(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrong-password' })
  });
  console.log(`Wrong password login -> ${r.status} (expect 401)`);

  // --- Login ---
  r = await timed(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  console.log(`Login admin -> ${r.status} in ${r.ms.toFixed(0)}ms`);
  try {
    token = JSON.parse(r.body).token;
  } catch {
    console.log('Could not parse login response:', String(r.body).slice(0, 300));
    process.exit(1);
  }
  if (!token) {
    console.log('No token returned; aborting.');
    process.exit(1);
  }

  // --- Staff role enforcement ---
  let staff;
  r = await timed(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'staff', password: 'staff123' })
  });
  if (r.status === 200) {
    staff = JSON.parse(r.body).token;
    const sr = await timed(`${BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${staff}` } });
    console.log(`Staff GET /api/admin/users -> ${sr.status} (expect 403)`);
  }

  console.log('\nEndpoint'.padEnd(42), 'status', 'p50'.padStart(8), 'p95'.padStart(8), 'max'.padStart(8), 'bytes'.padStart(9));
  const results = [];
  for (const ep of endpoints) {
    const times = [];
    let status = 0;
    let size = 0;
    let sample = '';
    for (let i = 0; i < ITER; i++) {
      const res = await timed(`${BASE}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
      times.push(res.ms);
      status = res.status;
      size = res.size || size;
      sample = res.body || '';
    }
    const p50 = pct(times, 50);
    const p95 = pct(times, 95);
    const max = Math.max(...times);
    results.push({ ep, status, p50, p95, max, size });
    console.log(
      ep.padEnd(42),
      String(status).padStart(6),
      p50.toFixed(0).padStart(8),
      p95.toFixed(0).padStart(8),
      max.toFixed(0).padStart(8),
      String(size).padStart(9)
    );
    if (status >= 500) {
      authFailures.push(`${ep} -> ${status}: ${sample.slice(0, 200)}`);
    }
  }

  if (authFailures.length) {
    console.log('\n5xx responses:');
    authFailures.forEach(f => console.log(' ', f));
  }

  const all = results.flatMap(x => [x.p50]);
  console.log(`\nMedian of endpoint medians: ${pct(all, 50).toFixed(0)}ms; worst p95: ${Math.max(...results.map(x => x.p95)).toFixed(0)}ms`);
})();
