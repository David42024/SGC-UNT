'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabla modelos_acreditacion
    await queryInterface.createTable('modelos_acreditacion', {
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
      entidad: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      version: {
        type: Sequelize.STRING(20),
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

    // 2. Tabla estandares_acreditacion
    await queryInterface.createTable('estandares_acreditacion', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      modelo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'modelos_acreditacion', key: 'id' },
        onDelete: 'CASCADE'
      },
      padre_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'estandares_acreditacion', key: 'id' },
        onDelete: 'SET NULL'
      },
      codigo: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      nombre: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      nivel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'criterio',
        validate: {
          isIn: [['dimension', 'factor', 'estandar', 'criterio']]
        }
      },
      peso_ponderacion: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 1.00
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

    // 3. Tabla autoevaluaciones
    await queryInterface.createTable('autoevaluaciones', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      modelo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'modelos_acreditacion', key: 'id' },
        onDelete: 'RESTRICT'
      },
      nombre: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      periodo: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'en_proceso',
        validate: {
          isIn: [['en_proceso', 'finalizado', 'enviado']]
        }
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
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

    // 4. Tabla evidencias_acreditacion
    await queryInterface.createTable('evidencias_acreditacion', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      autoevaluacion_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'autoevaluaciones', key: 'id' },
        onDelete: 'CASCADE'
      },
      estandar_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'estandares_acreditacion', key: 'id' },
        onDelete: 'CASCADE'
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tipo_evidencia: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'documento'
      },
      archivo_ruta: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      url_referencia: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      estado_cumplimiento: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'no_iniciado',
        validate: {
          isIn: [['no_iniciado', 'en_proceso', 'cumplido', 'no_cumplido']]
        }
      },
      porcentaje_cumplimiento: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 100
        }
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
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

    // 5. Tabla programas_auditoria
    await queryInterface.createTable('programas_auditoria', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      año: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'planificado',
        validate: {
          isIn: [['planificado', 'en_curso', 'finalizado', 'cancelado']]
        }
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
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

    // 6. Tabla auditorias
    await queryInterface.createTable('auditorias', {
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
      programa_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'programas_auditoria', key: 'id' },
        onDelete: 'SET NULL'
      },
      codigo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      titulo: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      tipo_auditoria: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'interna',
        validate: {
          isIn: [['interna', 'externa', 'seguimiento']]
        }
      },
      alcance: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      objetivo: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      proceso_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'procesos', key: 'id' },
        onDelete: 'SET NULL'
      },
      auditor_lider_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      fecha_planificada: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_fin: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'planificado',
        validate: {
          isIn: [['planificado', 'en_curso', 'finalizado', 'cancelado']]
        }
      },
      conclusion_general: {
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

    // 7. Tabla auditores_auditoria
    await queryInterface.createTable('auditores_auditoria', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      auditoria_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'auditorias', key: 'id' },
        onDelete: 'CASCADE'
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'CASCADE'
      },
      rol_auditoria: {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: 'auditor'
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

    // 8. Tabla hallazgos_auditoria
    await queryInterface.createTable('hallazgos_auditoria', {
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
      auditoria_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'auditorias', key: 'id' },
        onDelete: 'CASCADE'
      },
      codigo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      clasificacion: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'observacion',
        validate: {
          isIn: [['conforme', 'no_conformidad_menor', 'no_conformidad_mayor', 'observacion', 'oportunidad_mejora']]
        }
      },
      proceso_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'procesos', key: 'id' },
        onDelete: 'SET NULL'
      },
      estandar_ref: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      evidencia_objetiva: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      archivo_ruta: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'abierto',
        validate: {
          isIn: [['abierto', 'en_proceso', 'cerrado', 'verificado']]
        }
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      fecha_limite: {
        type: Sequelize.DATEONLY,
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

    // Crear triggers
    const tablasConTriggers = [
      'modelos_acreditacion', 'estandares_acreditacion', 'autoevaluaciones', 
      'evidencias_acreditacion', 'programas_auditoria', 'auditorias', 
      'auditores_auditoria', 'hallazgos_auditoria'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_actualizar_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      `);
    }

    // Crear índices
    await queryInterface.addIndex('estandares_acreditacion', ['modelo_id'], { name: 'idx_estandares_modelo_id' });
    await queryInterface.addIndex('estandares_acreditacion', ['padre_id'], { name: 'idx_estandares_padre_id' });
    await queryInterface.addIndex('autoevaluaciones', ['modelo_id'], { name: 'idx_autoevaluaciones_modelo_id' });
    await queryInterface.addIndex('evidencias_acreditacion', ['autoevaluacion_id'], { name: 'idx_evidencias_autoevaluacion' });
    await queryInterface.addIndex('evidencias_acreditacion', ['estandar_id'], { name: 'idx_evidencias_estandar' });
    await queryInterface.addIndex('auditorias', ['estado'], { name: 'idx_auditorias_estado' });
    await queryInterface.addIndex('auditorias', ['programa_id'], { name: 'idx_auditorias_programa_id' });
    await queryInterface.addIndex('hallazgos_auditoria', ['auditoria_id'], { name: 'idx_hallazgos_auditoria_id' });
    await queryInterface.addIndex('hallazgos_auditoria', ['clasificacion'], { name: 'idx_hallazgos_clasificacion' });
    await queryInterface.addIndex('hallazgos_auditoria', ['estado'], { name: 'idx_hallazgos_estado' });

    // Restricciones únicas
    await queryInterface.addConstraint('estandares_acreditacion', {
      fields: ['modelo_id', 'codigo'],
      type: 'unique',
      name: 'unique_modelo_estandar_codigo'
    });
    await queryInterface.addConstraint('auditores_auditoria', {
      fields: ['auditoria_id', 'usuario_id'],
      type: 'unique',
      name: 'unique_auditoria_usuario'
    });
  },

  async down(queryInterface, Sequelize) {
    const tablasConTriggers = [
      'modelos_acreditacion', 'estandares_acreditacion', 'autoevaluaciones', 
      'evidencias_acreditacion', 'programas_auditoria', 'auditorias', 
      'auditores_auditoria', 'hallazgos_auditoria'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trg_actualizar_${table} ON ${table}`);
    }

    await queryInterface.dropTable('hallazgos_auditoria');
    await queryInterface.dropTable('auditores_auditoria');
    await queryInterface.dropTable('auditorias');
    await queryInterface.dropTable('programas_auditoria');
    await queryInterface.dropTable('evidencias_acreditacion');
    await queryInterface.dropTable('autoevaluaciones');
    await queryInterface.dropTable('estandares_acreditacion');
    await queryInterface.dropTable('modelos_acreditacion');
  }
};
