const { sequelize } = require('../config/database');

async function up() {
  console.log('🔄 Migration 84: Standardizing rice_stock_locations columns...');
  try {
    // 1. Create table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_stock_locations (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        is_direct_load BOOLEAN DEFAULT false,
        created_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch all column names currently on rice_stock_locations
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rice_stock_locations'
    `);
    const colNames = cols.map(c => c.column_name);
    console.log('Current rice_stock_locations columns:', colNames);

    // If isActive exists but is_active does not, rename or sync
    if (colNames.includes('isActive') && !colNames.includes('is_active')) {
      await sequelize.query(`ALTER TABLE rice_stock_locations RENAME COLUMN "isActive" TO is_active`);
      console.log('Renamed "isActive" -> is_active');
    } else if (colNames.includes('isActive') && colNames.includes('is_active')) {
      await sequelize.query(`UPDATE rice_stock_locations SET is_active = COALESCE("isActive", true) WHERE is_active IS NULL`);
    }

    // If createdBy exists but created_by does not
    if (colNames.includes('createdBy') && !colNames.includes('created_by')) {
      await sequelize.query(`ALTER TABLE rice_stock_locations RENAME COLUMN "createdBy" TO created_by`);
      console.log('Renamed "createdBy" -> created_by');
    }

    // If createdAt exists but created_at does not
    if (colNames.includes('createdAt') && !colNames.includes('created_at')) {
      await sequelize.query(`ALTER TABLE rice_stock_locations RENAME COLUMN "createdAt" TO created_at`);
      console.log('Renamed "createdAt" -> created_at');
    }

    // If updatedAt exists but updated_at does not
    if (colNames.includes('updatedAt') && !colNames.includes('updated_at')) {
      await sequelize.query(`ALTER TABLE rice_stock_locations RENAME COLUMN "updatedAt" TO updated_at`);
      console.log('Renamed "updatedAt" -> updated_at');
    }

    // If isDirectLoad exists but is_direct_load does not
    if (colNames.includes('isDirectLoad') && !colNames.includes('is_direct_load')) {
      await sequelize.query(`ALTER TABLE rice_stock_locations RENAME COLUMN "isDirectLoad" TO is_direct_load`);
      console.log('Renamed "isDirectLoad" -> is_direct_load');
    }

    // Ensure all required columns definitely exist with defaults
    await sequelize.query(`ALTER TABLE rice_stock_locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
    await sequelize.query(`ALTER TABLE rice_stock_locations ADD COLUMN IF NOT EXISTS is_direct_load BOOLEAN DEFAULT false`);
    await sequelize.query(`ALTER TABLE rice_stock_locations ADD COLUMN IF NOT EXISTS created_by INTEGER`);
    await sequelize.query(`ALTER TABLE rice_stock_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
    await sequelize.query(`ALTER TABLE rice_stock_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);

    // Ensure created_by allows NULL (to prevent foreign key crash on manual seeds)
    try {
      await sequelize.query(`ALTER TABLE rice_stock_locations ALTER COLUMN created_by DROP NOT NULL`);
    } catch (e) { /* ignore */ }

    // Ensure DIRECT_LOAD special location exists
    const [dl] = await sequelize.query(`SELECT id FROM rice_stock_locations WHERE code = 'DIRECT_LOAD' LIMIT 1`);
    if (!dl || dl.length === 0) {
      await sequelize.query(`
        INSERT INTO rice_stock_locations (code, name, is_active, is_direct_load, created_at, updated_at)
        VALUES ('DIRECT_LOAD', 'Direct Load', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      console.log('✅ DIRECT_LOAD location verified and seeded');
    } else {
      await sequelize.query(`UPDATE rice_stock_locations SET is_direct_load = true WHERE code = 'DIRECT_LOAD'`);
    }

    console.log('✅ Migration 84 completed successfully!');
  } catch (err) {
    console.error('❌ Migration 84 error:', err.message);
    throw err;
  }
}

async function down() {
  // non-destructive
}

module.exports = { up, down };
