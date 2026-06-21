require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'sgc_user',
    password: process.env.DB_PASSWORD || 'sgc_pass',
    database: process.env.DB_NAME || 'sgc_unt',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
    logging: false,
    define: {
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
      underscored: true
    }
  },
  test: {
    username: process.env.DB_USER || 'sgc_user',
    password: process.env.DB_PASSWORD || 'sgc_pass',
    database: process.env.DB_NAME || 'sgc_unt_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
    logging: false,
    define: {
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
      underscored: true
    }
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
    logging: false,
    define: {
      timestamps: true,
      createdAt: 'creado_en',
      updatedAt: 'actualizado_en',
      underscored: true
    }
  }
};
