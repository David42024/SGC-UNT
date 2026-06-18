/**
 * Script de Sincronización de Permisos - SGC-UNT
 * 
 * Este script carga los roles y permisos definidos en config/roles-permisos.js
 * hacia la base de datos. Se puede ejecutar con: npm run sync:permisos
 * 
 * Uso:
 *   node database/sync-permisos.js
 */

require('dotenv').config();
const { consulta } = require('../config/db');
const rolesPermisosConfig = require('../config/roles-permisos');

async function syncPermisos() {
  console.log('🔗 Conectando a PostgreSQL...');
  
  try {
    // Paso 1: Sincronizar roles
    console.log('\n📋 Sincronizando roles...');
    for (const rol of rolesPermisosConfig.roles) {
      const resultado = await consulta(
        `INSERT INTO roles (nombre, descripcion) 
         VALUES ($1, $2) 
         ON CONFLICT (nombre) 
         DO UPDATE SET descripcion = $2, actualizado_en = NOW()
         RETURNING id`,
        [rol.nombre, rol.descripcion]
      );
      console.log(`  ✅ Rol "${rol.nombre}" sincronizado (ID: ${resultado.rows[0].id})`);
    }

    // Paso 2: Sincronizar permisos
    console.log('\n🔐 Sincronizando permisos...');
    const permisosPorModulo = rolesPermisosConfig.permisos;
    const permisosMap = new Map(); // Para mapear código -> ID
    
    for (const [modulo, permisos] of Object.entries(permisosPorModulo)) {
      for (const permiso of permisos) {
        const resultado = await consulta(
          `INSERT INTO permisos (codigo, descripcion, modulo) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (codigo) 
           DO UPDATE SET descripcion = $2, modulo = $3, actualizado_en = NOW()
           RETURNING id`,
          [permiso.codigo, permiso.descripcion, modulo]
        );
        permisosMap.set(permiso.codigo, resultado.rows[0].id);
        console.log(`  ✅ Permiso "${permiso.codigo}" sincronizado (ID: ${resultado.rows[0].id})`);
      }
    }

    // Paso 3: Sincronizar asignaciones de permisos a roles
    console.log('\n🔗 Sincronizando asignaciones rol-permiso...');
    for (const rol of rolesPermisosConfig.roles) {
      // Obtener ID del rol
      const rolResultado = await consulta('SELECT id FROM roles WHERE nombre = $1', [rol.nombre]);
      if (!rolResultado.rows.length) {
        console.log(`  ❌ Error: Rol "${rol.nombre}" no encontrado`);
        continue;
      }
      const rolId = rolResultado.rows[0].id;

      // Si el rol tiene permiso '*', asignar todos los permisos
      if (rol.permisos === '*') {
        console.log(`  📌 Rol "${rol.nombre}" tiene acceso total (*)`);
        // Eliminar asignaciones anteriores
        await consulta('DELETE FROM roles_permisos WHERE rol_id = $1', [rolId]);
        
        // Asignar todos los permisos
        for (const [permisoCodigo, permisoId] of permisosMap) {
          await consulta(
            `INSERT INTO roles_permisos (rol_id, permiso_id) 
             VALUES ($1, $2) 
             ON CONFLICT (rol_id, permiso_id) DO NOTHING`,
            [rolId, permisoId]
          );
        }
        console.log(`  ✅ Asignados ${permisosMap.size} permisos a "${rol.nombre}"`);
      } else {
        // Asignar permisos específicos
        await consulta('DELETE FROM roles_permisos WHERE rol_id = $1', [rolId]);
        
        for (const permisoCodigo of rol.permisos) {
          const permisoId = permisosMap.get(permisoCodigo);
          if (permisoId) {
            await consulta(
              `INSERT INTO roles_permisos (rol_id, permiso_id) 
               VALUES ($1, $2) 
               ON CONFLICT (rol_id, permiso_id) DO NOTHING`,
              [rolId, permisoId]
            );
          } else {
            console.log(`  ⚠️  Permiso "${permisoCodigo}" no encontrado en configuración`);
          }
        }
        console.log(`  ✅ Asignados ${rol.permisos.length} permisos a "${rol.nombre}"`);
      }
    }

    console.log('\n✅ Sincronización completada exitosamente');
    console.log('\n📊 Resumen:');
    const stats = await consulta(`
      SELECT 
        (SELECT COUNT(*) FROM roles) as total_roles,
        (SELECT COUNT(*) FROM permisos) as total_permisos,
        (SELECT COUNT(*) FROM roles_permisos) as total_asignaciones
    `);
    console.log(`  - Roles: ${stats.rows[0].total_roles}`);
    console.log(`  - Permisos: ${stats.rows[0].total_permisos}`);
    console.log(`  - Asignaciones: ${stats.rows[0].total_asignaciones}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en sincronización:', error.message);
    console.error(error);
    process.exit(1);
  }
}

syncPermisos();
