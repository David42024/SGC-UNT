const { Pool } = require('pg');
const { logger } = require('./logger');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'sgc_unt',
  user:     process.env.DB_USER     || 'sgc_user',
  password: process.env.DB_PASSWORD || 'sgc_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('connect', () => logger.info('Nueva conexión a PostgreSQL establecida'));
pool.on('error', (err) => logger.error('Error en pool PostgreSQL:', err));

const consulta = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const resultado = await client.query(sql, params);
    return resultado;
  } finally {
    client.release();
  }
};

module.exports = { pool, consulta };
