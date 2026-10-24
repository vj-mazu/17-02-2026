const { sequelize } = require('../config/database');

async function up() {
  console.log('🔄 Migration 85: Adding remix movement type to rice_stock_movements...');
  try {
    // 1. Update movement_type check constraint to include 'remix'
    await sequelize.query(`
      ALTER TABLE rice_stock_movements 
      DROP CONSTRAINT IF EXISTS rice_stock_movements_movement_type_check;
      
      ALTER TABLE rice_stock_movements 
      ADD CONSTRAINT rice_stock_movements_movement_type_check 
      CHECK (movement_type IN ('purchase', 'sale', 'palti', 'remix'));
    `);
    console.log('✅ Migration 85: rice_stock_movements_movement_type_check updated with remix');

    // 2. Ensure outturn_id column exists
    const [cols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'rice_stock_movements' AND column_name = 'outturn_id'
    `);
    if (cols.length === 0) {
      await sequelize.query(`
        ALTER TABLE rice_stock_movements ADD COLUMN outturn_id INTEGER REFERENCES outturns(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_outturn_id ON rice_stock_movements(outturn_id);
      `);
      console.log('✅ Migration 85: outturn_id column added to rice_stock_movements');
    }
  } catch (error) {
    console.error('❌ Migration 85 error:', error);
    throw error;
  }
}

module.exports = { up };
