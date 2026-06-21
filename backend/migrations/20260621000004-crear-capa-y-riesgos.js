'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabla no_conformidades
    await queryInterface.createTable('no_conformidades', {
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
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tipo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'correctiva',
        validate: {
          isIn: [['correctiva', 'preventiva', 'mejora']]
        }
      },
      origen: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'auditoria',
        validate: {
          isIn: [['auditoria', 'queja', 'revision', 'autoevaluacion', 'otro']]
        }
      },
      proceso_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'procesos', key: 'id' },
        onDelete: 'SET NULL'
      },
      hallazgo_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'hallazgos_auditoria', key: 'id' },
        onDelete: 'SET NULL'
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'abierto',
        validate: {
          isIn: [['abierto', 'en_proceso', 'verificado', 'cerrado']]
        }
      },
      fecha_deteccion: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      fecha_limite: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_cierre: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      impacto: {
        type: Sequelize.STRING(10),
        allowNull: true,
        defaultValue: 'medio',
        validate: {
          isIn: [['bajo', 'medio', 'alto', 'critico']]
        }
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

    // 2. Tabla analisis_causa_raiz
    await queryInterface.createTable('analisis_causa_raiz', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      no_conformidad_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'no_conformidades', key: 'id' },
        onDelete: 'CASCADE'
      },
      metodo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '5_porques',
        validate: {
          isIn: [['5_porques', 'ishikawa', 'otro']]
        }
      },
      descripcion_problema: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      causa_raiz: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      factores_causales: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      porques: {
        type: Sequelize.JSONB,
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

    // 3. Tabla planes_accion_capa
    await queryInterface.createTable('planes_accion_capa', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      no_conformidad_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'no_conformidades', key: 'id' },
        onDelete: 'CASCADE'
      },
      actividad: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_limite: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_cierre: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
        validate: {
          isIn: [['pendiente', 'en_proceso', 'completado', 'cancelado']]
        }
      },
      evidencia_cierre: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      archivo_ruta: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
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

    // 4. Tabla categorias_riesgo
    await queryInterface.createTable('categorias_riesgo', {
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

    // 5. Tabla riesgos (con campo nivel_riesgo generado siempre almacenado)
    await queryInterface.createTable('riesgos', {
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
        references: { model: 'categorias_riesgo', key: 'id' },
        onDelete: 'RESTRICT'
      },
      proceso_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'procesos', key: 'id' },
        onDelete: 'SET NULL'
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      tipo_riesgo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'negativo',
        validate: {
          isIn: [['negativo', 'positivo']]
        }
      },
      probabilidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        }
      },
      impacto: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        }
      },
      nivel_riesgo: {
        type: 'INTEGER GENERATED ALWAYS AS (probabilidad * impacto) STORED',
        allowNull: false
      },
      clasificacion_nivel: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'moderado',
        validate: {
          isIn: [['bajo', 'moderado', 'alto', 'critico']]
        }
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'identificado',
        validate: {
          isIn: [['identificado', 'en_tratamiento', 'aceptado', 'cerrado']]
        }
      },
      fecha_identificacion: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      descripcion_control_actual: {
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

    // 6. Tabla planes_mitigacion_riesgo
    await queryInterface.createTable('planes_mitigacion_riesgo', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      riesgo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'riesgos', key: 'id' },
        onDelete: 'CASCADE'
      },
      estrategia: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'mitigar',
        validate: {
          isIn: [['mitigar', 'aceptar', 'transferir', 'evitar', 'explotar']]
        }
      },
      accion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_limite: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
        validate: {
          isIn: [['pendiente', 'en_proceso', 'completado', 'cancelado']]
        }
      },
      probabilidad_residual: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
      },
      impacto_residual: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5
        }
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

    // 7. Tabla monitoreo_riesgos
    await queryInterface.createTable('monitoreo_riesgos', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      riesgo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'riesgos', key: 'id' },
        onDelete: 'CASCADE'
      },
      fecha_monitoreo: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      probabilidad: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        }
      },
      impacto: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5
        }
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      revisor_id: {
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

    // Crear triggers
    const tablasConTriggers = [
      'no_conformidades', 'analisis_causa_raiz', 'planes_accion_capa', 
      'categorias_riesgo', 'riesgos', 'planes_mitigacion_riesgo', 'monitoreo_riesgos'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_actualizar_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      `);
    }

    // Crear índices
    await queryInterface.addIndex('no_conformidades', ['estado'], { name: 'idx_no_conformidades_estado' });
    await queryInterface.addIndex('no_conformidades', ['tipo'], { name: 'idx_no_conformidades_tipo' });
    await queryInterface.addIndex('planes_accion_capa', ['no_conformidad_id'], { name: 'idx_planes_no_conformidad_id' });
    await queryInterface.addIndex('riesgos', ['categoria_id'], { name: 'idx_riesgos_categoria_id' });
    await queryInterface.addIndex('riesgos', ['estado'], { name: 'idx_riesgos_estado' });
    await queryInterface.addIndex('riesgos', ['proceso_id'], { name: 'idx_riesgos_proceso_id' });
    await queryInterface.addIndex('planes_mitigacion_riesgo', ['riesgo_id'], { name: 'idx_planes_mitg_riesgo_id' });
  },

  async down(queryInterface, Sequelize) {
    const tablasConTriggers = [
      'no_conformidades', 'analisis_causa_raiz', 'planes_accion_capa', 
      'categorias_riesgo', 'riesgos', 'planes_mitigacion_riesgo', 'monitoreo_riesgos'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trg_actualizar_${table} ON ${table}`);
    }

    await queryInterface.dropTable('monitoreo_riesgos');
    await queryInterface.dropTable('planes_mitigacion_riesgo');
    await queryInterface.dropTable('riesgos');
    await queryInterface.dropTable('categorias_riesgo');
    await queryInterface.dropTable('planes_accion_capa');
    await queryInterface.dropTable('analisis_causa_raiz');
    await queryInterface.dropTable('no_conformidades');
  }
};
