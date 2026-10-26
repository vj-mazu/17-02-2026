const { sequelize } = require('../config/database');

async function up() {
  console.log('🔄 Migration 96: Adding farmerName column to arrivals...');
  try {
    await sequelize.query(`
      ALTER TABLE arrivals ADD COLUMN IF NOT EXISTS "farmerName" VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_arrivals_farmer_name ON arrivals("farmerName");
    `);
    console.log('✅ Migration 96: farmerName added to arrivals successfully');
  } catch (error) {
    console.error('❌ Migration 96 error:', error);
    // Non-fatal if already exists or db dialect differences
  }
}

module.exports = { up };
