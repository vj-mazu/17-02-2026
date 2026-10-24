const { sequelize } = require('../config/database');

async function up() {
  console.log('🔄 Migration 86: Adding remix tracking columns to rice_productions...');
  try {
    await sequelize.query(`
      ALTER TABLE rice_productions ADD COLUMN IF NOT EXISTS remix_bags INTEGER DEFAULT 0;
      ALTER TABLE rice_productions ADD COLUMN IF NOT EXISTS remix_quintals DECIMAL(10,2) DEFAULT 0;
    `);
    console.log('✅ Migration 86: remix_bags and remix_quintals added to rice_productions');
  } catch (error) {
    console.error('❌ Migration 86 error:', error);
    throw error;
  }
}

module.exports = { up };
