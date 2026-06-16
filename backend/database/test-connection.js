require('dotenv').config();
const { Pool } = require('pg');

async function testAll() {
  console.log('🧪 Probando conexiones...\n');

  // Test 1: Superuser
  console.log('1️⃣ Probando conexión con superusuario...');
  try {
    const poolSuper = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'postgres',
      user: process.env.DB_SUPERUSER || 'postgres',
      password: process.env.DB_SUPERPASSWORD || 'postgres'
    });
    const client = await poolSuper.connect();
    console.log('✅ SUPERUSER: Conexión exitosa!');
    await client.release();
    await poolSuper.end();
  } catch (e) {
    console.error('❌ SUPERUSER: Error:', e.message);
    console.log('💡 Asegúrate de que DB_SUPERUSER y DB_SUPERPASSWORD en .env sean correctos!');
    process.exit(1);
  }

  console.log();

  // Test 2: App user
  console.log('2️⃣ Probando conexión con usuario de la app...');
  try {
    const poolApp = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'sgc_unt',
      user: process.env.DB_USER || 'sgc_user',
      password: process.env.DB_PASSWORD || 'sgc_pass_2024'
    });
    const client = await poolApp.connect();
    console.log('✅ APP USER: Conexión exitosa!');
    await client.release();
    await poolApp.end();
  } catch (e) {
    console.error('❌ APP USER: Error:', e.message);
    console.log('💡 Ejecuta primero "npm run db:setup" para crear el usuario y la base de datos!');
    process.exit(1);
  }

  console.log('\n🎉 ¡Todas las conexiones están bien!');
  console.log('Ahora puedes ejecutar "npm run db:migrate" con seguridad.');
}

testAll();
