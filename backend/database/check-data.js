
require('dotenv').config();
const { pool } = require('../config/db');

async function checkData() {
  console.log('Checking data...');
  const client = await pool.connect();
  try {
    console.log('1. Autoevaluaciones:');
    const autoeval = await client.query('SELECT * FROM autoevaluaciones LIMIT 5');
    console.log(autoeval.rows);

    console.log('\n2. Modelos:');
    const modelos = await client.query('SELECT * FROM modelos_acreditacion');
    console.log(modelos.rows);

    console.log('\n3. Estandares (factores):');
    const factores = await client.query("SELECT * FROM estandares_acreditacion WHERE nivel = 'factor'");
    console.log(factores.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkData();
