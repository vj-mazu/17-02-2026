/**
 * Migration 54: Seed DIRECT_LOAD Rice Stock Location
 * 
 * This creates a special location called "DIRECT_LOAD" which is used for
 * loading rice directly from production. Stock in this location should NOT
 * carry forward to the next day (resets to 0 daily).
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log('📦 Migration 54: Seeding DIRECT_LOAD location...');

            // Check if DIRECT_LOAD already exists
            const [existing] = await queryInterface.sequelize.query(
                `SELECT id FROM rice_stock_locations WHERE code = 'DIRECT_LOAD'`
            );

            if (existing.length === 0) {
                // Get the first admin user for createdBy
                const [users] = await queryInterface.sequelize.query(
                    `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
                );
                const createdBy = users.length > 0 ? users[0].id : 1;

                // Insert DIRECT_LOAD location (using correct column names)
                await queryInterface.sequelize.query(`
                  INSERT INTO rice_stock_locations (code, name, is_active, is_direct_load, created_by, created_at, updated_at)
                  VALUES ('DIRECT_LOAD', 'Direct Load', true, true, ${createdBy}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `);
                console.log('✅ DIRECT_LOAD location created successfully');
            } else {
                // Update existing to ensure isDirectLoad is true
                await queryInterface.sequelize.query(
                    `UPDATE rice_stock_locations SET is_direct_load = true WHERE code = 'DIRECT_LOAD'`
                );
                console.log('ℹ️ DIRECT_LOAD location already exists, updated isDirectLoad flag');
            }

        } catch (error) {
            console.error('❌ Error in migration 54:', error.message);
            // Non-fatal - location might already exist
        }
    },

    down: async (queryInterface, Sequelize) => {
        try {
            await queryInterface.bulkDelete('rice_stock_locations', {
                code: 'DIRECT_LOAD'
            });
            console.log('✅ DIRECT_LOAD location removed');
        } catch (error) {
            console.error('Error removing DIRECT_LOAD:', error.message);
        }
    }
};
