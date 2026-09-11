const { sequelize } = require('../config/database');

async function addSaleMovementType() {
  try {
    console.log('🔄 Adding "sale" to arrivals movementType enum...');

    // Convert ENUM to VARCHAR temporarily
    await sequelize.query(`
      ALTER TABLE arrivals 
      ALTER COLUMN "movementType" TYPE VARCHAR(50);
    `);

    console.log('✅ Converted movementType to VARCHAR');

    // Drop old constraint if exists
    await sequelize.query(`
      ALTER TABLE arrivals 
      DROP CONSTRAINT IF EXISTS arrivals_movementType_check;
    `);

    // Add new constraint with 'sale' included
    await sequelize.query(`
      ALTER TABLE arrivals 
      ADD CONSTRAINT arrivals_movementType_check 
      CHECK ("movementType" IN ('purchase', 'shifting', 'production-shifting', 'for-production', 'loose', 'sale'));
    `);

    console.log('✅ Added "sale" to movementType enum successfully');
  } catch (error) {
    console.error('❌ Error adding sale movement type:', error);
    throw error;
  }
}

module.exports = addSaleMovementType;
module.exports.up = async (queryInterface, Sequelize) => {
  return addSaleMovementType();
};

if (require.main === module) {
  addSaleMovementType()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
