require('dotenv').config();
const { consulta } = require('../config/db');

async function runMigration() {
  console.log('Ejecutando migración para agregar campos de verificación...');

  try {
    const sql = `
      ALTER TABLE no_conformidades 
      ADD COLUMN IF NOT EXISTS fecha_verificacion DATE,
      ADD COLUMN IF NOT EXISTS efectividad VARCHAR(20),
      ADD COLUMN IF NOT EXISTS evidencia_url TEXT,
      ADD COLUMN IF NOT EXISTS observaciones_verificacion TEXT;
    `;

    await consulta(sql);
    console.log('✅ Migración completada con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al ejecutar migración:', error);
    process.exit(1);
  }
}

runMigration();