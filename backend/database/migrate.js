require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sgc_unt',
  user:     process.env.DB_USER     || 'sgc_user',
  password: process.env.DB_PASSWORD || 'sgc_pass',
});

async function migrar() {
  const cliente = await pool.connect();
  try {
    console.log('🔗 Conectando a PostgreSQL...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Ejecutando schema.sql...');
    await cliente.query(sql);
    console.log('✅ Migración completada exitosamente.');
    console.log('👤 Usuario admin: admin@unt.edu.pe / Admin1234!');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  } finally {
    cliente.release();
    await pool.end();
  }
}

migrar();
