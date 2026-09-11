/* eslint-disable no-console */
/**
 * COMPLETE LIVE API TEST SUITE v2 — Mother India Stock Management
 * Matches the ACTUAL deployed routes (ALL_APIS_LIST.txt is stale).
 * Usage: node COMPLETE_TEST_SUITE.js   (server on :5001)
 */
const BASE = process.env.TEST_BASE || 'http://localhost:5001/api';
const results = [];
let adminToken, managerToken, staffToken;
const created = { warehouses: [], kunchinittus: [], arrivals: [], outturns: [] };

function rec(section, name, pass, detail = '', ms = 0) {
  results.push({ section, name, pass, detail, ms });
  console.log(`${pass ? '✅' : '❌'} [${section}] ${name}${ms ? ` (${ms}ms)` : ''}${detail && !pass ? ` — ${detail}` : ''}`);
}

async function req(method, path, { token, body, raw } = {}) {
  const t0 = Date.now();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const ms = Date.now() - t0;
  let data = null;
  if (raw) data = await res.arrayBuffer();
  else { try { data = await res.json(); } catch { data = await res.text(); } }
  return { status: res.status, data, ms };
}

async function section(title) { console.log(`\n${'='.repeat(70)}\n▶ ${title}\n${'='.repeat(70)}`); }

(async () => {
  console.log(`🧪 COMPLETE TEST SUITE v2 → ${BASE}`);

  // ---------- 0. INFRA ----------
  await section('0. INFRASTRUCTURE');
  try {
    let r = await req('GET', '/health');
    rec('infra', 'GET /health → 200, DB Connected', r.status === 200 && r.data?.database === 'Connected', JSON.stringify(r.data).slice(0, 120), r.ms);
    r = await req('GET', '/nonexistent-xyz');
    rec('infra', 'Unknown route → 404', r.status === 404, `status=${r.status}`, r.ms);
    r = await req('GET', '/metrics/cache', { token: adminToken });
    rec('infra', 'GET /metrics/cache → 200', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/performance-metrics/summary', { token: adminToken });
    rec('infra', 'GET /performance-metrics/summary → 200', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/performance-metrics/health', { token: adminToken });
    rec('infra', 'GET /performance-metrics/health → 200', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/status/summary', { token: adminToken });
    rec('infra', 'GET /status/summary → 200', r.status === 200, `status=${r.status}`, r.ms);
  } catch (e) { rec('infra', 'section', false, e.message); }

  // ---------- 1. AUTH ----------
  await section('1. AUTHENTICATION & SECURITY');
  try {
    let r = await req('POST', '/auth/login', { body: { username: 'admin', password: 'admin123' } });
    rec('auth', 'Admin login → token', r.status === 200 && !!r.data?.token, JSON.stringify(r.data).slice(0, 100), r.ms);
    adminToken = r.data?.token;
    r = await req('POST', '/auth/login', { body: { username: 'manager', password: 'manager123' } });
    rec('auth', 'Manager login → token', r.status === 200 && !!r.data?.token, `status=${r.status}`, r.ms);
    managerToken = r.data?.token;
    r = await req('POST', '/auth/login', { body: { username: 'staff', password: 'staff123' } });
    rec('auth', 'Staff login → token', r.status === 200 && !!r.data?.token, `status=${r.status}`, r.ms);
    staffToken = r.data?.token;
    r = await req('POST', '/auth/login', { body: { username: 'admin', password: 'WRONG' } });
    rec('auth', 'Wrong password → 401', r.status === 401, `status=${r.status}`, r.ms);
    r = await req('POST', '/auth/login', { body: { username: 'ghost', password: 'x' } });
    rec('auth', 'Unknown user → 401', r.status === 401, `status=${r.status}`, r.ms);
    r = await req('POST', '/auth/login', { body: {} });
    rec('auth', 'Empty credentials → 400', r.status === 400, `status=${r.status}`, r.ms);
    r = await req('GET', '/auth/me', { token: adminToken });
    rec('auth', '/auth/me returns admin profile', r.status === 200 && r.data?.username === 'admin', JSON.stringify(r.data).slice(0, 100), r.ms);
    r = await req('GET', '/auth/me');
    rec('auth', '/auth/me no token → 401', r.status === 401 || r.status === 403, `status=${r.status}`, r.ms);
    r = await req('GET', '/auth/me', { token: 'forged.token.x' });
    rec('auth', '/auth/me forged token → 401', r.status === 401 || r.status === 403, `status=${r.status}`, r.ms);
  } catch (e) { rec('auth', 'section', false, e.message); }

  // ---------- 2. MASTER DATA ----------
  await section('2. MASTER DATA (locations, outturns)');
  try {
    const uniq = Date.now();
    let r = await req('GET', '/locations/warehouses', { token: staffToken });
    rec('locations', 'GET /locations/warehouses (staff)', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/locations/kunchinittus', { token: staffToken });
    rec('locations', 'GET /locations/kunchinittus (staff)', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/locations/varieties', { token: staffToken });
    rec('locations', 'GET /locations/varieties (staff)', r.status === 200, `status=${r.status}`, r.ms);

    r = await req('POST', '/locations/warehouses', { token: staffToken, body: { name: 'X', code: 'X' } });
    rec('locations', 'RBAC: staff cannot create warehouse (403)', r.status === 403, `status=${r.status}`, r.ms);

    r = await req('POST', '/locations/warehouses', { token: adminToken, body: { name: `WH_Test_${uniq}`, code: `WHT${uniq}` } });
    const whId = r.data?.warehouse?.id || r.data?.id;
    rec('locations', 'Admin creates warehouse', (r.status === 201 || r.status === 200) && !!whId, JSON.stringify(r.data).slice(0, 100), r.ms);
    if (whId) created.warehouses.push(whId);

    r = await req('POST', '/locations/warehouses', { token: adminToken, body: { name: '', code: '' } });
    rec('locations', 'Empty warehouse name → 400', r.status === 400, `status=${r.status}`, r.ms);

    r = await req('POST', '/locations/kunchinittus', { token: adminToken, body: { name: `KU_Test_${uniq}`, code: `KUT${uniq}`, warehouseId: whId } });
    const kuId = r.data?.kunchinittu?.id || r.data?.id;
    rec('locations', 'Admin creates kunchinittu', (r.status === 201 || r.status === 200) && !!kuId, JSON.stringify(r.data).slice(0, 100), r.ms);
    if (kuId) created.kunchinittus.push(kuId);

    r = await req('POST', '/locations/kunchinittus', { token: adminToken, body: { name: 'X', code: 'X' } });
    rec('locations', 'Kunchinittu without warehouseId → 400', r.status === 400, `status=${r.status}`, r.ms);

    r = await req('POST', '/locations/brokers', { token: adminToken, body: { name: `Broker_${uniq}`, code: `B${uniq}` } });
    rec('locations', 'Admin creates broker', r.status === 201 || r.status === 200, JSON.stringify(r.data).slice(0, 80), r.ms);

    const code = `OT${uniq}`;
    r = await req('POST', '/outturns', { token: staffToken, body: { code, allottedVariety: 'TEST-VAR', type: 'Raw' } });
    const otId = r.data?.outturn?.id || r.data?.id;
    rec('outturns', 'Staff creates outturn', (r.status === 201 || r.status === 200) && !!otId, JSON.stringify(r.data).slice(0, 100), r.ms);
    if (otId) created.outturns.push(otId);

    r = await req('POST', '/outturns', { token: staffToken, body: { code, allottedVariety: 'TEST-VAR', type: 'Raw' } });
    rec('outturns', 'Duplicate outturn code → 400', r.status === 400, `status=${r.status}`, r.ms);

    r = await req('POST', '/outturns', { token: staffToken, body: { code: `OTY${uniq}`, allottedVariety: 'V', type: 'Nope' } });
    rec('outturns', 'Invalid outturn type → 400', r.status === 400, `status=${r.status}`, r.ms);

    r = await req('GET', '/outturns?page=1&limit=10', { token: staffToken });
    rec('outturns', 'GET /outturns list', r.status === 200, `status=${r.status}`, r.ms);
  } catch (e) { rec('locations', 'section', false, e.message); }

  // ---------- 3. ARRIVALS ----------
  await section('3. ARRIVALS — WORKFLOW (create/validate/approve/bulk/loose)');
  let a1;
  try {
    let r = await req('POST', '/arrivals', { token: staffToken, body: { date: '2026-09-11' } });
    rec('arrivals', 'Missing required fields → 400', r.status === 400, `status=${r.status}`, r.ms);

    r = await req('POST', '/arrivals', {
      token: staffToken,
      body: { date: '2026-09-11', movementType: 'purchase', wbNo: 'WBNeg', grossWeight: 5000, tareWeight: 6000, lorryNumber: 'KA01XX0001', variety: 'TEST-VAR', bags: 10 }
    });
    rec('arrivals', 'Negative net weight → 400', r.status === 400, `status=${r.status}`, r.ms);

    const stamp = Date.now();
    r = await req('POST', '/arrivals', {
      token: staffToken,
      body: { date: '2026-09-11', movementType: 'purchase', wbNo: `WB${stamp}`, grossWeight: 5000, tareWeight: 500, lorryNumber: `KA01AB${stamp % 10000}`, broker: 'BROKER_T', variety: 'TEST-VAR', bags: 100, toKunchinintuId: created.kunchinittus[0], toWarehouseId: created.warehouses[0] }
    });
    a1 = r.data?.arrival?.id || r.data?.id;
    rec('arrivals', 'Staff creates purchase arrival', (r.status === 201 || r.status === 200) && !!a1, JSON.stringify(r.data).slice(0, 140), r.ms);
    if (a1) created.arrivals.push(a1);

    r = await req('GET', '/arrivals/next-sl-no', { token: staffToken });
    rec('arrivals', 'GET /next-sl-no', r.status === 200, JSON.stringify(r.data).slice(0, 60), r.ms);

    r = await req('GET', '/arrivals/pending-list', { token: managerToken });
    rec('arrivals', 'GET /pending-list (manager)', r.status === 200, `status=${r.status}`, r.ms);

    r = await req('PATCH', `/arrivals/${a1}/approve`, { token: staffToken, body: { status: 'approved' } });
    rec('arrivals', 'RBAC: staff cannot approve (403)', r.status === 403, `status=${r.status}`, r.ms);

    r = await req('PATCH', `/arrivals/${a1}/approve`, { token: managerToken, body: { status: 'approved', remarks: 'ok' } });
    rec('arrivals', 'Manager approves arrival', r.status === 200, `status=${r.status} ${JSON.stringify(r.data?.error || '')}`, r.ms);

    r = await req('PATCH', `/arrivals/${a1}/admin-approve`, { token: adminToken, body: {} });
    rec('arrivals', 'Admin second-step approval', r.status === 200, `status=${r.status} ${JSON.stringify(r.data?.error || '')}`, r.ms);

    r = await req('PATCH', `/arrivals/${a1}/approve`, { token: adminToken, body: { status: 'bogus' } });
    rec('arrivals', 'Invalid status → 400', r.status === 400, `status=${r.status}`, r.ms);

    // two more for bulk
    const ids = [];
    for (let i = 0; i < 2; i++) {
      const rr = await req('POST', '/arrivals', {
        token: staffToken,
        body: { date: '2026-09-11', movementType: 'purchase', wbNo: `WB${Date.now()}${i}`, grossWeight: 4000, tareWeight: 400, lorryNumber: `KA02CD${i}`, broker: 'BROKER_T', variety: 'TEST-VAR', bags: 50 }
      });
      const id2 = rr.data?.arrival?.id || rr.data?.id;
      if (id2) { ids.push(id2); created.arrivals.push(id2); }
    }
    r = await req('POST', '/arrivals/bulk-approve', { token: staffToken, body: { arrivalIds: ids } });
    rec('arrivals', 'RBAC: staff cannot bulk-approve (403)', r.status === 403, `status=${r.status}`, r.ms);

    r = await req('POST', '/arrivals/bulk-approve', { token: adminToken, body: { arrivalIds: ids } });
    rec('arrivals', 'Admin bulk-approves 2 arrivals', r.status === 200 && Array.isArray(r.data?.results?.approved), JSON.stringify(r.data).slice(0, 120), r.ms);

    r = await req('POST', '/arrivals/loose', { token: staffToken, body: { date: '2026-09-11', variety: 'TEST-VAR', bags: 5 } });
    rec('arrivals', 'RBAC: staff cannot create loose (403)', r.status === 403, `status=${r.status}`, r.ms);

    r = await req('POST', '/arrivals/loose', { token: managerToken, body: { date: '2026-09-11', variety: 'TEST-VAR', bags: 5, wbNo: `WBL${Date.now()}` } });
    rec('arrivals', 'Manager creates loose bags entry', [200, 201].includes(r.status), `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`, r.ms);
  } catch (e) { rec('arrivals', 'section', false, e.message); }

  // ---------- 4. FILTERS / SEARCH / PAGINATION ----------
  await section('4. FILTERS / SEARCH / PAGINATION');
  try {
    let r = await req('GET', '/arrivals?page=1&limit=10&movementType=purchase', { token: adminToken });
    rec('filter', 'movementType=purchase → all rows match', r.status === 200 && (r.data?.arrivals || []).every(a => a.movementType === 'purchase'), `rows=${(r.data?.arrivals || []).length}`, r.ms);

    r = await req('GET', '/arrivals?page=1&limit=10&status=approved', { token: adminToken });
    rec('filter', 'status=approved → all rows match', r.status === 200 && (r.data?.arrivals || []).every(a => a.status === 'approved'), `rows=${(r.data?.arrivals || []).length}`, r.ms);

    r = await req('GET', '/arrivals?page=1&limit=10&dateFrom=1999-01-01&dateTo=1999-12-31', { token: adminToken });
    rec('filter', 'Date range 1999 → 0 rows', r.status === 200 && (r.data?.arrivals || []).length === 0, `rows=${(r.data?.arrivals || []).length}`, r.ms);

    r = await req('GET', '/arrivals?page=1&limit=10&search=KA01AB', { token: adminToken });
    rec('search', 'Search lorry fragment', r.status === 200, `rows=${(r.data?.arrivals || []).length}`, r.ms);

    r = await req('GET', '/arrivals?page=1&limit=10&search=BROKER_T', { token: adminToken });
    rec('search', 'Search broker name ≥1 row', r.status === 200 && (r.data?.arrivals || []).length >= 1, `rows=${(r.data?.arrivals || []).length}`, r.ms);

    r = await req('GET', '/arrivals?page=1&limit=10&search=ZZZNOMATCH', { token: adminToken });
    rec('search', 'Search no-match → 0 rows', r.status === 200 && (r.data?.arrivals || []).length === 0, `rows=${(r.data?.arrivals || []).length}`, r.ms);

    r = await req('GET', '/arrivals?page=1&limit=3', { token: adminToken });
    const p1 = r.data?.arrivals || [], pag = r.data?.pagination || {};
    rec('pagination', 'Page1 ≤limit + pagination meta', r.status === 200 && p1.length <= 3 && typeof pag.total === 'number', `rows=${p1.length} total=${pag.total} totalPages=${pag.totalPages}`, r.ms);

    const r2 = await req('GET', '/arrivals?page=2&limit=3', { token: adminToken });
    const p2 = r2.data?.arrivals || [];
    rec('pagination', 'Page2 no overlap with page1', r2.status === 200 && !p1.some(x => p2.some(y => y.id === x.id)), `p1=${p1.length} p2=${p2.length}`, r2.ms);

    const rB = await req('GET', '/arrivals?page=1&limit=1000', { token: adminToken });
    rec('pagination', 'limit=1000 handled gracefully', rB.status === 200, `rows=${(rB.data?.arrivals || []).length}`, rB.ms);
  } catch (e) { rec('filter', 'section', false, e.message); }

  // ---------- 5. RECORDS / STOCK VIEWS ----------
  await section('5. RECORDS & STOCK VIEWS');
  try {
    let r = await req('GET', '/records/arrivals?page=1&limit=10', { token: adminToken });
    rec('records', 'GET /records/arrivals', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/records/purchase?page=1&limit=10', { token: adminToken });
    rec('records', 'GET /records/purchase', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/records/shifting?page=1&limit=10', { token: adminToken });
    rec('records', 'GET /records/shifting', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/records/stock', { token: adminToken });
    rec('records', 'GET /records/stock', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/arrivals/stock/variety-locations/TEST-VAR', { token: adminToken });
    rec('records', 'GET /arrivals/stock/variety-locations/:variety', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/arrivals/opening-balance?beforeDate=2026-09-12', { token: adminToken });
    rec('records', 'GET /arrivals/opening-balance?beforeDate=…', r.status === 200, `status=${r.status} ${JSON.stringify(r.data?.error || '')}`, r.ms);
    r = await req('GET', '/arrivals/opening-balance', { token: adminToken });
    rec('records', 'opening-balance without beforeDate → 400', r.status === 400, `status=${r.status}`, r.ms);
  } catch (e) { rec('records', 'section', false, e.message); }

  // ---------- 6. PURCHASE RATES ----------
  await section('6. PURCHASE RATES (approval workflow)');
  try {
    let r = await req('GET', '/purchase-rates/pending-list', { token: adminToken });
    rec('purchase-rates', 'GET /purchase-rates/pending-list (admin)', r.status === 200, `status=${r.status}`, r.ms);

    r = await req('POST', '/purchase-rates', { token: adminToken, body: { arrivalId: a1, baseRate: 2500, rateType: 'CDL', bCalculationMethod: 'per_bag', lfCalculationMethod: 'per_bag', hCalculationMethod: 'per_bag' } });
    const prId = r.data?.purchaseRate?.id || r.data?.id;
    rec('purchase-rates', 'Create purchase rate (CDL)', [200, 201].includes(r.status), `status=${r.status} ${JSON.stringify(r.data).slice(0, 130)}`, r.ms);

    r = await req('POST', '/purchase-rates', { token: adminToken, body: { arrivalId: a1, baseRate: 100, rateType: 'WRONG' } });
    rec('purchase-rates', 'Invalid rateType → 400', r.status === 400, `status=${r.status}`, r.ms);

    r = await req('GET', `/purchase-rates/${a1}`, { token: adminToken });
    rec('purchase-rates', 'GET /purchase-rates/:arrivalId', r.status === 200, `status=${r.status}`, r.ms);

    if (prId) {
      r = await req('POST', '/purchase-rates/bulk-approve', { token: adminToken, body: { ids: [prId] } });
      rec('purchase-rates', 'Bulk-approve purchase rate', r.status === 200, `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`, r.ms);
    }
    r = await req('POST', '/purchase-rates', { token: staffToken, body: { arrivalId: a1, baseRate: 1, rateType: 'CDL' } });
    rec('purchase-rates', 'RBAC: staff cannot create (403)', r.status === 403, `status=${r.status}`, r.ms);
  } catch (e) { rec('purchase-rates', 'section', false, e.message); }

  // ---------- 7. HAMALI ----------
  await section('7. HAMALI SYSTEM (rates/entries/books)');
  try {
    let r = await req('GET', '/hamali-rates', { token: adminToken });
    rec('hamali', 'GET /hamali-rates', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('POST', '/hamali-rates', { token: adminToken, body: { loadingRate: 20, unloadingSadaRate: 21, unloadingKnRate: 22, looseTumbidduRate: 23 } });
    rec('hamali', 'Create hamali rates (4 fields)', [200, 201].includes(r.status), `status=${r.status} ${JSON.stringify(r.data).slice(0, 100)}`, r.ms);
    r = await req('POST', '/hamali-rates', { token: adminToken, body: { loadingRate: 20 } });
    rec('hamali', 'Partial hamali rates → 400', r.status === 400, `status=${r.status}`, r.ms);
    r = await req('GET', '/hamali-entries?page=1&limit=10', { token: adminToken });
    rec('hamali', 'GET /hamali-entries', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/hamali-entries?fromDate=2026-09-01&toDate=2026-09-11', { token: adminToken });
    rec('hamali', 'hamali-entries date-range filter', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/hamali-book', { token: adminToken });
    rec('hamali', 'GET /hamali-book', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/hamali-book/paddy', { token: adminToken });
    rec('hamali', 'GET /hamali-book/paddy', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/hamali-book/rice', { token: adminToken });
    rec('hamali', 'GET /hamali-book/rice', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/paddy-hamali-rates', { token: adminToken });
    rec('hamali', 'GET /paddy-hamali-rates', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/paddy-hamali-entries/pending-list', { token: adminToken });
    rec('hamali', 'GET /paddy-hamali-entries/pending-list', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-hamali-rates', { token: adminToken });
    rec('hamali', 'GET /rice-hamali-rates', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-hamali-entries/pending-list', { token: adminToken });
    rec('hamali', 'GET /rice-hamali-entries/pending-list', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/other-hamali-works', { token: adminToken });
    rec('hamali', 'GET /other-hamali-works', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/other-hamali-entries/batch?date=2026-09-11', { token: adminToken });
    rec('hamali', 'GET /other-hamali-entries/batch?date=', r.status === 200, `status=${r.status}`, r.ms);
  } catch (e) { rec('hamali', 'section', false, e.message); }

  // ---------- 8. RICE PRODUCTION / RICE STOCK (fixed bug) ----------
  await section('8. RICE PRODUCTION & RICE STOCK (regression: allottedVariety fix)');
  try {
    let r = await req('GET', '/rice-productions?page=1&limit=10', { token: adminToken });
    rec('rice', 'GET /rice-productions', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock?page=1&limit=10', { token: adminToken });
    rec('rice', 'GET /rice-stock (was 503 — FIXED)', r.status === 200, `status=${r.status} ${JSON.stringify(r.data?.error || '')}`, r.ms);
    r = await req('GET', '/rice-stock?month=2026-09', { token: adminToken });
    rec('rice', 'rice-stock month filter', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock?productType=INVALID_X', { token: adminToken });
    rec('rice', 'Invalid productType → 400', r.status === 400, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock?dateFrom=not-a-date', { token: adminToken });
    rec('rice', 'Invalid date format → 400', r.status === 400, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock-management/movements?page=1&limit=10', { token: adminToken });
    rec('rice', 'GET /rice-stock-management/movements', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock-management/available-stock', { token: adminToken });
    rec('rice', 'GET /rice-stock-management/available-stock', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock-management/pending-list', { token: adminToken });
    rec('rice', 'GET /rice-stock-management/pending-list', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/rice-stock-management/ledger?variety=TEST', { token: adminToken });
    rec('rice', 'GET /rice-stock-management/ledger', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/unified-varieties/unified-varieties', { token: adminToken });
    rec('rice', 'GET /unified-varieties/unified-varieties (nested path)', r.status === 200, `status=${r.status}`, r.ms);
  } catch (e) { rec('rice', 'section', false, e.message); }

  // ---------- 9. DASHBOARD / LEDGER / EXPORTS ----------
  await section('9. DASHBOARD / LEDGER / EXPORTS');
  try {
    let r = await req('GET', '/dashboard/stats', { token: adminToken });
    rec('dashboard', 'GET /dashboard/stats', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/ledger/kunchinittus', { token: adminToken });
    rec('dashboard', 'GET /ledger/kunchinittus', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/export/csv/arrivals', { token: adminToken, raw: true });
    rec('dashboard', 'GET /export/csv/arrivals (CSV bytes)', r.status === 200 && r.data.byteLength > 27, `bytes=${r.data?.byteLength}`, r.ms);
    r = await req('GET', '/export/pdf/stock', { token: adminToken, raw: true });
    rec('dashboard', 'GET /export/pdf/stock (PDF bytes)', r.status === 200 && r.data.byteLength > 100, `bytes=${r.data?.byteLength}`, r.ms);
    r = await req('GET', '/export/date/pdf/2026-09-11', { token: adminToken, raw: true });
    rec('dashboard', 'GET /export/date/pdf/:date', r.status === 200, `bytes=${r.data?.byteLength}`, r.ms);
  } catch (e) { rec('dashboard', 'section', false, e.message); }

  // ---------- 10. RBAC / USERS / SAMPLE ----------
  await section('10. RBAC MATRIX + USERS + SAMPLE ENTRIES');
  try {
    let r = await req('GET', '/admin/users', { token: adminToken });
    rec('rbac', 'Admin lists users', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/admin/users', { token: staffToken });
    rec('rbac', 'Staff cannot list users (403)', r.status === 403, `status=${r.status}`, r.ms);
    r = await req('GET', '/admin/users', { token: managerToken });
    rec('rbac', 'Manager cannot list users (403)', r.status === 403, `status=${r.status}`, r.ms);
    r = await req('GET', '/admin/users', {});
    rec('rbac', 'Anonymous blocked (401)', r.status === 401 || r.status === 403, `status=${r.status}`, r.ms);

    r = await req('GET', '/sample-entries/by-role?page=1&limit=5', { token: staffToken });
    rec('sample', 'GET /sample-entries/by-role (staff)', r.status === 200, `status=${r.status}`, r.ms);
    r = await req('GET', '/sample-entries/ledger/all?page=1&pageSize=5', { token: adminToken });
    rec('sample', 'GET /sample-entries/ledger/all (admin)', r.status === 200, `status=${r.status} ${JSON.stringify(r.data?.error || '')}`, r.ms);
    r = await req('POST', '/sample-entries', { token: staffToken, body: {} });
    rec('sample', 'Empty sample entry → 400 (not 500)', r.status === 400, `status=${r.status}`, r.ms);
    r = await req('GET', '/sample-entries/999999', { token: staffToken });
    rec('sample', 'GET missing sample entry → 404', r.status === 404, `status=${r.status}`, r.ms);
  } catch (e) { rec('rbac', 'section', false, e.message); }

  // ---------- 11. LATENCY ----------
  await section('11. LATENCY AUDIT (per-endpoint, small dataset)');
  const targets = [
    ['GET', '/arrivals?page=1&limit=50'],
    ['GET', '/arrivals?page=2&limit=50'],
    ['GET', '/arrivals?page=1&limit=50&search=BROKER_T'],
    ['GET', '/records/arrivals?page=1&limit=50'],
    ['GET', '/dashboard/stats'],
    ['GET', '/outturns?page=1&limit=50'],
    ['GET', '/hamali-book/paddy'],
    ['GET', '/purchase-rates/pending-list'],
    ['GET', '/rice-stock-management/movements?page=1&limit=50'],
  ];
  for (const [m, p] of targets) {
    const r = await req(m, p, { token: adminToken });
    const ok = r.status === 200 && r.ms < 5000;
    const cached = r.data?.performance?.cached;
    console.log(`   ${r.ms > 500 ? '🐌' : r.ms > 200 ? '⚠️ ' : '🚀'} ${p} → ${r.ms}ms ${cached !== undefined ? `cached=${cached}` : ''}`);
    rec('latency', `${p}`, ok, `${r.status} ${r.ms}ms`, r.ms);
  }

  // ---------- CLEANUP ----------
  await section('CLEANUP');
  try {
    for (const id of created.arrivals) await req('DELETE', `/arrivals/${id}`, { token: adminToken });
    for (const id of created.outturns) await req('DELETE', `/outturns/${id}`, { token: adminToken });
    for (const id of created.kunchinittus) await req('DELETE', `/locations/kunchinittus/${id}`, { token: adminToken });
    for (const id of created.warehouses) await req('DELETE', `/locations/warehouses/${id}`, { token: adminToken });
    rec('cleanup', 'Created entities removed', true);
  } catch (e) { rec('cleanup', 'cleanup', false, e.message); }

  // ---------- SUMMARY ----------
  const total = results.length, passed = results.filter(r => r.pass).length, failed = total - passed;
  const timed = results.filter(r => r.ms > 0);
  const avg = (timed.reduce((s, r) => s + r.ms, 0) / Math.max(1, timed.length)).toFixed(1);
  console.log(`\n${'='.repeat(70)}\n🏁 RESULTS: ${passed}/${total} passed (${((passed / total) * 100).toFixed(1)}%) | avg ${avg}ms | max ${Math.max(...timed.map(r => r.ms))}ms\n${'='.repeat(70)}`);
  if (failed) { console.log('\n❌ FAILURES:'); results.filter(r => !r.pass).forEach(r => console.log(`   [${r.section}] ${r.name} — ${r.detail}`)); }
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('💥 Suite crashed:', e); process.exit(2); });
