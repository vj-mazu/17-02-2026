require('dotenv').config({ path: './server/.env' });
const { sequelize } = require('./server/config/database');
const RiceStockLocation = require('./server/models/RiceStockLocation');

async function test() {
  try {
    console.log('Testing connection...');
    await sequelize.authenticate();
    console.log('Connected.');
    
    console.log('Querying with findAll...');
    const locations = await RiceStockLocation.findAll({
      attributes: ['id', 'code', 'name', 'isActive', 'isDirectLoad', 'createdAt', 'createdBy'],
      order: [['code', 'ASC']],
      raw: true
    });
    console.log('Success! Count:', locations.length);
  } catch (error) {
    console.error('Error occurred:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

test();
