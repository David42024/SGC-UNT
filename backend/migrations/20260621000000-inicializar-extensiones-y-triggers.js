'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION actualizar_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.actualizado_en = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS actualizar_timestamp() CASCADE');
    // We typically do not drop extensions on rollback because they may be used elsewhere, 
    // but we can if we want to be clean. Leaving extensions is safer.
  }
};
