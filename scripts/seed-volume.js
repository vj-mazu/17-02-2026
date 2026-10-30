/**
 * Seeds volume data into the verification DB for latency testing.
 * Usage: node server/scripts/seed-volume.js [rows]
 */
const { Client } = require('pg');

const ROWS = Number(process.argv[2] || 200000);

const client = new Client({
  user: 'postgres',
  password: '12345',
  host: '127.0.0.1',
  port: 5432,
  database: 'mi_verify'
});

const varieties = ['SUM25 RNR', 'DEC25 KNM', 'BASMATI', 'BPT 5204', 'MTU 1010', 'JSR', 'IR64', 'DEC25 JSR'];
const packagingSizes = [26, 30, 50];

(async () => {
  await client.connect();
  console.log('Seeding', ROWS, 'arrivals...');

  // Base locations / varieties
  await client.query(`INSERT INTO warehouses (name, code, location, capacity, "isActive", "createdAt", "updatedAt")
    VALUES ('Main Godown','W1','Yard',1000000,true,now(),now()),('North Godown','W2','North',800000,true,now(),now()),('South Godown','W3','South',600000,true,now(),now())
    ON CONFLICT DO NOTHING`);

  for (let i = 0; i < varieties.length; i++) {
    await client.query(
      `INSERT INTO varieties (name, code, "isActive", "createdAt", "updatedAt") VALUES ($1,$2,true,now(),now()) ON CONFLICT DO NOTHING`,
      [varieties[i], 'V' + (i + 1)]
    );
  }
  const wh = await client.query('SELECT id, code FROM warehouses ORDER BY id');
  for (let i = 0; i < 40; i++) {
    await client.query(
      `INSERT INTO kunchinittus (name, code, "warehouseId", capacity, "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,100000,true,now(),now()) ON CONFLICT DO NOTHING`,
      [`K${i + 1}`, `K${i + 1}`, wh.rows[i % wh.rows.length].id]
    );
  }

  const CHUNK = 1000;
  let inserted = 0;
  const t0 = Date.now();
  for (let start = 0; start < ROWS; start += CHUNK) {
    const values = [];
    const params = [];
    for (let i = 0; i < CHUNK && start + i < ROWS; i++) {
      const n = start + i;
      const day = new Date(Date.UTC(2023, 0, 1) + (n % 1000) * 86400000);
      const w = wh.rows[n % wh.rows.length];
      const v = varieties[n % varieties.length];
      const bags = 50 + (n % 400);
      const gross = bags * 60;
      const tare = 2000;
      const k = params.length;
      params.push(
        'A' + n,
        day.toISOString().slice(0, 10),
        'purchase',
        'Farmer ' + (n % 500),
        'Broker ' + (n % 20),
        v,
        bags,
        'W' + w.code,
        'WB' + n,
        gross,
        tare,
        gross - tare,
        'KA' + (n % 9000),
        'approved'
      );
      values.push(`($${k + 1},$${k + 2}::date,$${k + 3},$${k + 4},$${k + 5},$${k + 6},$${k + 7}::int,$${k + 8},$${k + 9},$${k + 10}::numeric,$${k + 11}::numeric,$${k + 12}::numeric,$${k + 13},$${k + 14}::enum_arrivals_status,1,now(),now())`);
    }
    await client.query(
      `INSERT INTO arrivals ("slNo", date, "movementType", "farmerName", broker, variety, bags, "fromLocation", "wbNo", "grossWeight", "tareWeight", "netWeight", "lorryNumber", status, "createdBy", "createdAt", "updatedAt") VALUES ${values.join(',')}`,
      params
    );
    inserted += values.length;
    if (start % 20000 === 0) console.log('  arrivals', inserted);
  }
  console.log('arrivals done in', ((Date.now() - t0) / 1000).toFixed(1) + 's');

  console.log('Seeding rice_stock_movements...');
  const locations = ['W1', 'W2', 'W3', 'DIRECT_LOAD'];
  const t1 = Date.now();
  let mInserted = 0;
  for (let start = 0; start < ROWS; start += CHUNK) {
    const values = [];
    const params = [];
    for (let i = 0; i < CHUNK && start + i < ROWS; i++) {
      const n = start + i;
      const day = new Date(Date.UTC(2023, 0, 1) + (n % 1000) * 86400000);
      const bags = 10 + (n % 200);
      const bagSize = packagingSizes[n % packagingSizes.length];
      const k = params.length;
      params.push(
        day.toISOString().slice(0, 10),
        'inward',
        'rice',
        varieties[n % varieties.length],
        bags,
        bagSize,
        (bags * bagSize) / 100,
        locations[n % locations.length],
        'created_by',
        1,
        'approved'
      );
      values.push(`($${k + 1}::date,$${k + 2},$${k + 3},$${k + 4},$${k + 5}::int,$${k + 6}::numeric,$${k + 7}::numeric,$${k + 8},'mill',$${k + 9}::int,$${k + 10},now(),now())`);
    }
    await client.query(
      `INSERT INTO rice_stock_movements (date, movement_type, product_type, variety, bags, bag_size_kg, quantity_quintals, location_code, to_location, created_by, status, created_at, updated_at) VALUES ${values.join(',')}`,
      params
    );
    mInserted += values.length;
  }
  console.log('rice_stock_movements done in', ((Date.now() - t1) / 1000).toFixed(1) + 's');

  const counts = await client.query(
    `SELECT (SELECT count(*) FROM arrivals) a, (SELECT count(*) FROM rice_stock_movements) m`
  );
  console.log('counts', counts.rows[0]);
  await client.end();
})().catch(async e => {
  console.error('SEED ERROR', e.message);
  try {
    await client.end();
  } catch {}
  process.exit(1);
});
