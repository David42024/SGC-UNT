'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabla roles
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      creado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      actualizado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // 2. Tabla permisos
    await queryInterface.createTable('permisos', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      codigo: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      modulo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      creado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      actualizado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // 3. Tabla roles_permisos
    await queryInterface.createTable('roles_permisos', {
      rol_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onDelete: 'CASCADE',
        primaryKey: true
      },
      permiso_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'permisos',
          key: 'id'
        },
        onDelete: 'CASCADE',
        primaryKey: true
      },
      creado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // 4. Tabla usuarios
    await queryInterface.createTable('usuarios', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        unique: true
      },
      nombres: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      apellidos: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      correo: {
        type: Sequelize.STRING(150),
        allowNull: false,
        unique: true
      },
      contrasena_hash: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      rol_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'roles',
          key: 'id'
        },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      area: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      cargo: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      ultimo_acceso: {
        type: Sequelize.DATE,
        allowNull: true
      },
      creado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      actualizado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id'
        },
        onDelete: 'SET NULL'
      }
    });

    // Crear triggers
    for (const table of ['roles', 'permisos', 'usuarios']) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_actualizar_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      `);
    }

    // Crear índices para usuarios
    await queryInterface.addIndex('usuarios', ['correo'], { name: 'idx_usuarios_correo' });
    await queryInterface.addIndex('usuarios', ['rol_id'], { name: 'idx_usuarios_rol_id' });
    await queryInterface.addIndex('usuarios', ['activo'], { name: 'idx_usuarios_activo' });
  },

  async down(queryInterface, Sequelize) {
    // Eliminar triggers
    for (const table of ['roles', 'permisos', 'usuarios']) {
      await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trg_actualizar_${table} ON ${table}`);
    }
    
    // Eliminar tablas
    await queryInterface.dropTable('usuarios');
    await queryInterface.dropTable('roles_permisos');
    await queryInterface.dropTable('permisos');
    await queryInterface.dropTable('roles');
  }
};
