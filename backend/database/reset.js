require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function resetDB() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  const dbName = process.env.DB_NAME || 'sgc_unt';
  const dbUser = process.env.DB_USER || 'sgc_user';
  const dbPassword = process.env.DB_PASSWORD || 'sgc_pass_2024';
  const dbSuperuser = process.env.DB_SUPERUSER || 'postgres';
  const dbSuperpassword = process.env.DB_SUPERPASSWORD || 'postgres';

  const poolAdmin = new Pool({
    host: dbHost,
    port: dbPort,
    database: 'postgres',
    user: dbSuperuser,
    password: dbSuperpassword,
  });

  let client;
  try {
    client = await poolAdmin.connect();
    console.log('🔗 Conectando a PostgreSQL (postgres db)...');
    
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`🗑️ Base de datos "${dbName}" eliminada`);
    
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`📦 Base de datos "${dbName}" creada`);
    await client.release();
    
    // Conectarse a la base de datos recién creada con superusuario para crear extensiones
    const poolSuper = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbSuperuser,
      password: dbSuperpassword,
    });
    const clientSuper = await poolSuper.connect();
    console.log('🔗 Conectando a la nueva base de datos con superusuario...');
    
    await clientSuper.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await clientSuper.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log('📦 Extensiones creadas con superusuario');
    
    // Otorgar permisos al usuario de la aplicación en el esquema public
    await clientSuper.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${dbUser}`);
    await clientSuper.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}`);
    await clientSuper.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}`);
    await clientSuper.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`);
    await clientSuper.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`);
    console.log('📦 Permisos otorgados al usuario de la aplicación');
    
    await clientSuper.release();
    await poolSuper.end();
    
    console.log('📄 Ejecutando migraciones de Sequelize...');
    const { execSync } = require('child_process');
    execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });

    console.log('🌱 Ejecutando seeders de Sequelize...');
    execSync('npx sequelize-cli db:seed:all', { stdio: 'inherit' });

    console.log('🔐 Sincronizando permisos desde configuración...');
    execSync('node database/sync-permisos.js', { stdio: 'inherit' });
    
    console.log('✅ Reseteo completo!');
    console.log('👤 Usuario admin: admin@unt.edu.pe / Admin1234!');
    
  } catch (error) {
    console.error('❌ Error en reset:', error.message);
    process.exit(1);
  } finally {
    await poolAdmin.end();
  }
}

resetDB();
