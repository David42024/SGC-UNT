require('dotenv').config();
const { pool } = require('./config/db');

const sql = `
INSERT INTO usuarios (nombres, apellidos, correo, contrasena_hash, rol_id, area, cargo)
VALUES 
  ('Juan Carlos', 'García López', 'jgarcia@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 2, 'Oficina de Calidad', 'Auditor Líder'),
  ('María Fernanda', 'Rodríguez Pérez', 'mrodriguez@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 2, 'Oficina de Calidad', 'Auditor'),
  ('Pedro Alonso', 'Quispe Huamán', 'pquispe@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 3, 'Facultad de Ingeniería', 'Observador'),
  ('Ana Lucía', 'Vega Castro', 'avega@unt.edu.pe', crypt('Admin1234!', gen_salt('bf')), 3, 'Facultad de Ciencias', 'Auditor')
ON CONFLICT (correo) DO NOTHING
RETURNING id, nombres, apellidos, correo;
`;

async function main() {
  try {
    const result = await pool.query(sql);
    if (result.rows.length > 0) {
      console.log('✅ Usuarios de prueba insertados correctamente:');
      result.rows.forEach(user => {
        console.log(`  - ${user.nombres} ${user.apellidos} (${user.correo})`);
      });
    } else {
      console.log('ℹ️ Los usuarios ya existen en la base de datos.');
    }
  } catch (err) {
    console.error('❌ Error al insertar usuarios:', err);
  } finally {
    pool.end();
  }
}

main();
