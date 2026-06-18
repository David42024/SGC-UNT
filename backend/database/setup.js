require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

async function setupDB() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  const dbName = process.env.DB_NAME || 'sgc_unt';
  const dbUser = process.env.DB_USER || 'sgc_user';
  const dbPassword = process.env.DB_PASSWORD || 'sgc_pass_2024';
  const dbSuperuser = process.env.DB_SUPERUSER || 'postgres';
  const dbSuperpassword = process.env.DB_SUPERPASSWORD || 'postgres';

  console.log('🔗 Conectando a PostgreSQL con superusuario...');
  const poolAdmin = new Pool({
    host: dbHost,
    port: dbPort,
    database: 'postgres',
    user: dbSuperuser,
    password: dbSuperpassword
  });

  let client;
  try {
    client = await poolAdmin.connect();

    console.log('✅ Conectado!');

    console.log(`👤 Creando usuario "${dbUser}"...`);
try {
  const sanitizedUser = dbUser.replace(/[^a-zA-Z0-9_]/g, '');
  // Escapa la contraseña correctamente
  const escapedPassword = dbPassword.replace(/'/g, "''");
  await client.query(`CREATE USER "${sanitizedUser}" WITH PASSWORD '${escapedPassword}'`);
  console.log('✅ Usuario creado!');
} catch (e) {
  if (e.code === '42710') {
    console.log('ℹ️ Usuario ya existe, continuando...');
  } else {
    throw e;
  }
}

    console.log(`📦 Creando base de datos "${dbName}"...`);
    try {
      await client.query(`CREATE DATABASE ${dbName} OWNER ${dbUser}`);
      console.log('✅ Base de datos creada!');
    } catch (e) {
      if (e.code === '42P04') {
        console.log('ℹ️  Base de datos ya existe, continuando...');
      } else {
        throw e;
      }
    }

    await client.release();
    await poolAdmin.end();

    console.log('🔗 Conectando a la nueva base de datos...');
    const poolApp = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbSuperuser,
      password: dbSuperpassword
    });
    const clientApp = await poolApp.connect();

    console.log('🔐 Otorgando privilegios...');
    await clientApp.query(`GRANT ALL PRIVILEGES ON SCHEMA public TO ${dbUser}`);
    await clientApp.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}`);
    await clientApp.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}`);
    await clientApp.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`);
    await clientApp.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`);
    console.log('✅ Privilegios otorgados!');

    await clientApp.release();
    await poolApp.end();

    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('Ahora puedes ejecutar "npm run db:migrate" para crear las tablas.');
  } catch (error) {
    console.error('\n❌ Error en la configuración:', error.message);
    process.exit(1);
  }
}

async function runMigrateAndSync() {
  console.log('\n📄 Ejecutando migración de schema.sql...');
  try {
    execSync('node database/migrate.js', { stdio: 'inherit' });
    console.log('✅ Migración completada!');
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }

  console.log('\n🔐 Sincronizando permisos desde configuración...');
  try {
    execSync('node database/sync-permisos.js', { stdio: 'inherit' });
    console.log('✅ Permisos sincronizados!');
  } catch (error) {
    console.error('❌ Error en sincronización de permisos:', error.message);
    process.exit(1);
  }

  console.log('\n✨ ¡Base de datos completamente configurada!');
}

setupDB().then(() => {
  runMigrateAndSync();
});
