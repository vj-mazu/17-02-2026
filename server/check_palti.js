const { Sequelize } = require('sequelize');

const dbUrl = 'postgresql://postgres.knbgzutzgygdchrpgees:12345@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres';
const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function check() {
  try {
    const results = await sequelize.query(`
      SELECT id, date, "movement_type", "product_type", quantity_quintals, bags, variety, "from_location", "to_location", "conversion_shortage_kg", "parent_id"
      FROM public.rice_stock_movements
      WHERE date = '2026-06-09'
    `);
    console.log(JSON.stringify(results[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

check();
