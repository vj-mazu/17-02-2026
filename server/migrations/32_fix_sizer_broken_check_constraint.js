module.exports = {
    up: async (queryInterface, Sequelize) => {
        try {
            console.log('🔄 Fixing rice_productions CHECK constraint to include Sizer Broken...');

            // Drop the old CHECK constraint
            await queryInterface.sequelize.query(`
        ALTER TABLE rice_productions
        DROP CONSTRAINT IF EXISTS rice_productions_productType_check;
      `);
            console.log('✅ Dropped old CHECK constraint');

            // Add new CHECK constraint with Sizer Broken and RJ Broken included
            await queryInterface.sequelize.query(`
        ALTER TABLE rice_productions
        ADD CONSTRAINT rice_productions_productType_check
        CHECK ("productType" IN (
          'Rice', 
          'Bran', 
          'Farm Bran', 
          'Rejection Rice', 
          'Sizer Broken', 
          'Rejection Broken', 
          'RJ Broken',
          'Broken', 
          'Zero Broken', 
          'Faram', 
          'Unpolished', 
          'RJ Rice 1', 
          'RJ Rice 2'
        ));
      `);
            console.log('✅ Added new CHECK constraint with Sizer Broken and RJ Broken');

            console.log('✅ Migration completed successfully');
        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            // Don't throw - allow server to continue
            console.log('⚠️ Continuing despite error...');
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Rollback: Remove Sizer Broken from CHECK constraint
        try {
            await queryInterface.sequelize.query(`
        ALTER TABLE rice_productions
        DROP CONSTRAINT IF EXISTS rice_productions_productType_check;
      `);

            await queryInterface.sequelize.query(`
        ALTER TABLE rice_productions
        ADD CONSTRAINT rice_productions_productType_check
        CHECK ("productType" IN (
          'Rice', 
          'Bran', 
          'Farm Bran', 
          'Rejection Rice', 
          'Rejection Broken', 
          'Broken', 
          'Zero Broken', 
          'Faram', 
          'Unpolished', 
          'RJ Rice 1', 
          'RJ Rice 2'
        ));
      `);
        } catch (error) {
            console.error('Rollback failed:', error.message);
        }
    }
};
