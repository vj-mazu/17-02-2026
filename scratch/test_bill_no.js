const { sequelize } = require('../server/config/database');
const Arrival = require('../server/models/Arrival');

async function test() {
  try {
    const arrivals = await Arrival.findAll({
      where: { movementType: 'sale' },
      attributes: ['id', 'wbNo', 'billNo']
    });
    console.log('Sales found:', JSON.stringify(arrivals, null, 2));

    const [rawResults] = await sequelize.query('SELECT id, "wbNo", bill_no FROM arrivals WHERE "movementType" = \'sale\'');
    console.log('Raw Sales found:', JSON.stringify(rawResults, null, 2));
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    process.exit(0);
  }
}

test();
