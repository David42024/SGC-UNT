'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabla categorias_documento
    await queryInterface.createTable('categorias_documento', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(100),
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
      },
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // 2. Tabla tipos_proceso
    await queryInterface.createTable('tipos_proceso', {
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
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // 3. Tabla procesos
    await queryInterface.createTable('procesos', {
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
      codigo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      nombre: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'tipos_proceso', key: 'id' },
        onDelete: 'RESTRICT'
      },
      proceso_padre_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'procesos', key: 'id' },
        onDelete: 'SET NULL'
      },
      nivel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'proceso',
        validate: {
          isIn: [['macroproceso', 'proceso', 'subproceso']]
        }
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      objetivo: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      alcance: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      entradas: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      salidas: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      recursos: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      indicadores_clave: {
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
      },
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // 4. Tabla documentos (sin FK a procesos aún para evitar dependencias circulares complejas al inicio)
    await queryInterface.createTable('documentos', {
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
      codigo: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      categoria_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'categorias_documento', key: 'id' },
        onDelete: 'RESTRICT'
      },
      version_actual: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: '1.0'
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'borrador',
        validate: {
          isIn: [['borrador', 'revision', 'aprobado', 'vigente', 'obsoleto']]
        }
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      revisor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      aprobador_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      fecha_emision: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_vigencia: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_vencimiento: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      archivo_ruta: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      proceso_id: {
        type: Sequelize.INTEGER,
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
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // 5. Tabla versiones_documento
    await queryInterface.createTable('versiones_documento', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      documento_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'documentos', key: 'id' },
        onDelete: 'CASCADE'
      },
      version: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      descripcion_cambio: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      archivo_ruta: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'borrador',
        validate: {
          isIn: [['borrador', 'revision', 'aprobado', 'vigente', 'obsoleto']]
        }
      },
      fecha_version: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
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
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // 6. Tabla flujo_aprobacion_documento
    await queryInterface.createTable('flujo_aprobacion_documento', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      documento_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'documentos', key: 'id' },
        onDelete: 'CASCADE'
      },
      version_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'versiones_documento', key: 'id' },
        onDelete: 'SET NULL'
      },
      accion: {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['enviar_revision', 'aprobar', 'rechazar', 'publicar', 'obsoleter']]
        }
      },
      estado_anterior: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      estado_nuevo: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      comentario: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      fecha_accion: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
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
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // 7. Tabla actividades_proceso
    await queryInterface.createTable('actividades_proceso', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      proceso_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'procesos', key: 'id' },
        onDelete: 'CASCADE'
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      nombre: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      tipo_actividad: {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: 'tarea',
        validate: {
          isIn: [['inicio', 'tarea', 'decision', 'fin']]
        }
      },
      duracion_estimada_dias: {
        type: Sequelize.INTEGER,
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
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      actualizado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      }
    });

    // Agregar la FK diferida de documentos a procesos
    await queryInterface.sequelize.query(`
      ALTER TABLE documentos ADD CONSTRAINT fk_documentos_proceso
      FOREIGN KEY (proceso_id) REFERENCES procesos(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
    `);

    // Crear triggers
    const tablasConTriggers = [
      'categorias_documento', 'tipos_proceso', 'procesos', 
      'documentos', 'versiones_documento', 'flujo_aprobacion_documento', 
      'actividades_proceso'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_actualizar_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      `);
    }

    // Crear índices
    await queryInterface.addIndex('procesos', ['proceso_padre_id'], { name: 'idx_procesos_padre_id' });
    await queryInterface.addIndex('procesos', ['tipo_id'], { name: 'idx_procesos_tipo_id' });
    await queryInterface.addIndex('procesos', ['nivel'], { name: 'idx_procesos_nivel' });
    await queryInterface.addIndex('documentos', ['estado'], { name: 'idx_documentos_estado' });
    await queryInterface.addIndex('documentos', ['categoria_id'], { name: 'idx_documentos_categoria_id' });
    await queryInterface.addIndex('documentos', ['responsable_id'], { name: 'idx_documentos_responsable' });
    await queryInterface.addIndex('documentos', ['codigo'], { name: 'idx_documentos_codigo' });
    await queryInterface.addIndex('versiones_documento', ['documento_id'], { name: 'idx_versiones_documento_id' });
    await queryInterface.addIndex('flujo_aprobacion_documento', ['documento_id'], { name: 'idx_flujo_doc_id' });
    await queryInterface.addIndex('actividades_proceso', ['proceso_id'], { name: 'idx_actividades_proceso_id' });

    // Restricción única compuesta
    await queryInterface.addConstraint('versiones_documento', {
      fields: ['documento_id', 'version'],
      type: 'unique',
      name: 'unique_documento_version'
    });
  },

  async down(queryInterface, Sequelize) {
    const tablasConTriggers = [
      'categorias_documento', 'tipos_proceso', 'procesos', 
      'documentos', 'versiones_documento', 'flujo_aprobacion_documento', 
      'actividades_proceso'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trg_actualizar_${table} ON ${table}`);
    }

    await queryInterface.sequelize.query('ALTER TABLE documentos DROP CONSTRAINT IF EXISTS fk_documentos_proceso');

    await queryInterface.dropTable('actividades_proceso');
    await queryInterface.dropTable('flujo_aprobacion_documento');
    await queryInterface.dropTable('versiones_documento');
    await queryInterface.dropTable('documentos');
    await queryInterface.dropTable('procesos');
    await queryInterface.dropTable('tipos_proceso');
    await queryInterface.dropTable('categorias_documento');
  }
};
