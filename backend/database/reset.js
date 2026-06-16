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
    
    const poolApp = new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: dbName,
      user:     process.env.DB_USER     || 'sgc_user',
      password: process.env.DB_PASSWORD || 'sgc_pass',
    });
    const clienteApp = await poolApp.connect();
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Ejecutando schema.sql...');
    await clienteApp.query(sql);
    await clienteApp.release();
    await poolApp.end();
    
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
