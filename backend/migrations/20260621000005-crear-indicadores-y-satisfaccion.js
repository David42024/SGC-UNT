'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tabla indicadores
    await queryInterface.createTable('indicadores', {
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
      modulo: {
        type: Sequelize.STRING(30),
        allowNull: false,
        validate: {
          isIn: [['documentos', 'procesos', 'acreditacion', 'auditorias', 'acciones', 'riesgos', 'indicadores', 'satisfaccion', 'general']]
        }
      },
      tipo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'porcentaje',
        validate: {
          isIn: [['porcentaje', 'numero', 'ratio', 'tiempo', 'costo']]
        }
      },
      formula: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      unidad_medida: {
        type: Sequelize.STRING(30),
        allowNull: true
      },
      meta: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true
      },
      umbral_alerta: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true
      },
      umbral_critico: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true
      },
      frecuencia_medicion: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'mensual',
        validate: {
          isIn: [['diaria', 'semanal', 'mensual', 'trimestral', 'anual']]
        }
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
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

    // 2. Tabla mediciones_indicador
    await queryInterface.createTable('mediciones_indicador', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      indicador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'indicadores', key: 'id' },
        onDelete: 'CASCADE'
      },
      periodo: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      valor: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: false
      },
      meta_periodo: {
        type: Sequelize.DECIMAL(12, 4),
        allowNull: true
      },
      estado_semaforo: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'verde',
        validate: {
          isIn: [['verde', 'amarillo', 'rojo']]
        }
      },
      fuente_datos: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fecha_medicion: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE')
      },
      aprobado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      parametros: {
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

    // 3. Tabla parametros_indicador
    await queryInterface.createTable('parametros_indicador', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      indicador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'indicadores', key: 'id' },
        onDelete: 'CASCADE'
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      etiqueta: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      tipo: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'numero',
        validate: {
          isIn: [['numero', 'texto', 'fecha']]
        }
      },
      obligatorio: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // 4. Tabla alertas_indicador
    await queryInterface.createTable('alertas_indicador', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      indicador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'indicadores', key: 'id' },
        onDelete: 'CASCADE'
      },
      medicion_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'mediciones_indicador', key: 'id' },
        onDelete: 'SET NULL'
      },
      tipo_alerta: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'bajo_umbral',
        validate: {
          isIn: [['bajo_umbral', 'critico', 'meta_alcanzada']]
        }
      },
      mensaje: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      enviada: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      fecha_alerta: {
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

    // 5. Tabla encuestas
    await queryInterface.createTable('encuestas', {
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
      titulo: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tipo_publico: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'estudiante',
        validate: {
          isIn: [['estudiante', 'docente', 'egresado', 'administrativo', 'todos']]
        }
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'borrador',
        validate: {
          isIn: [['borrador', 'publicada', 'cerrada']]
        }
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_cierre: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      anonima: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      responsable_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      total_respuestas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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

    // 6. Tabla preguntas_encuesta
    await queryInterface.createTable('preguntas_encuesta', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      encuesta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'encuestas', key: 'id' },
        onDelete: 'CASCADE'
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      texto: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tipo_pregunta: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'likert',
        validate: {
          isIn: [['likert', 'opcion_multiple', 'texto_abierto', 'nps', 'si_no']]
        }
      },
      obligatoria: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      opciones: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      escala_min: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1
      },
      escala_max: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 5
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

    // 7. Tabla respuestas_encuesta
    await queryInterface.createTable('respuestas_encuesta', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      encuesta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'encuestas', key: 'id' },
        onDelete: 'CASCADE'
      },
      token_respuesta: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        unique: true
      },
      respondente_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL'
      },
      tipo_respondente: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'estudiante'
      },
      ip_origen: {
        type: 'INET',
        allowNull: true
      },
      fecha_respuesta: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      completada: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    // 8. Tabla detalle_respuestas
    await queryInterface.createTable('detalle_respuestas', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      respuesta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'respuestas_encuesta', key: 'id' },
        onDelete: 'CASCADE'
      },
      pregunta_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'preguntas_encuesta', key: 'id' },
        onDelete: 'CASCADE'
      },
      valor_numerico: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      valor_texto: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      valor_opcion: {
        type: Sequelize.STRING(200),
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
      'indicadores', 'mediciones_indicador', 'alertas_indicador', 
      'encuestas', 'preguntas_encuesta', 'respuestas_encuesta', 'detalle_respuestas'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`
        CREATE TRIGGER trg_actualizar_${table}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();
      `);
    }

    // Crear índices
    await queryInterface.addIndex('indicadores', ['modulo'], { name: 'idx_indicadores_modulo' });
    await queryInterface.addIndex('indicadores', ['activo'], { name: 'idx_indicadores_activo' });
    await queryInterface.addIndex('mediciones_indicador', ['indicador_id'], { name: 'idx_mediciones_indicador_id' });
    await queryInterface.addIndex('mediciones_indicador', ['periodo'], { name: 'idx_mediciones_periodo' });
    await queryInterface.addIndex('parametros_indicador', ['indicador_id'], { name: 'idx_parametros_indicador_id' });
    await queryInterface.addIndex('encuestas', ['estado'], { name: 'idx_encuestas_estado' });
    await queryInterface.addIndex('encuestas', ['tipo_publico'], { name: 'idx_encuestas_tipo_publico' });
    await queryInterface.addIndex('preguntas_encuesta', ['encuesta_id'], { name: 'idx_preguntas_encuesta_id' });
    await queryInterface.addIndex('respuestas_encuesta', ['encuesta_id'], { name: 'idx_respuestas_encuesta_id' });
    await queryInterface.addIndex('detalle_respuestas', ['respuesta_id'], { name: 'idx_detalle_respuesta_id' });
    await queryInterface.addIndex('detalle_respuestas', ['pregunta_id'], { name: 'idx_detalle_pregunta_id' });

    // Restricciones únicas
    await queryInterface.addConstraint('parametros_indicador', {
      fields: ['indicador_id', 'nombre'],
      type: 'unique',
      name: 'unique_indicador_parametro_nombre'
    });
  },

  async down(queryInterface, Sequelize) {
    const tablasConTriggers = [
      'indicadores', 'mediciones_indicador', 'alertas_indicador', 
      'encuestas', 'preguntas_encuesta', 'respuestas_encuesta', 'detalle_respuestas'
    ];
    for (const table of tablasConTriggers) {
      await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trg_actualizar_${table} ON ${table}`);
    }

    await queryInterface.dropTable('detalle_respuestas');
    await queryInterface.dropTable('respuestas_encuesta');
    await queryInterface.dropTable('preguntas_encuesta');
    await queryInterface.dropTable('encuestas');
    await queryInterface.dropTable('alertas_indicador');
    await queryInterface.dropTable('parametros_indicador');
    await queryInterface.dropTable('mediciones_indicador');
    await queryInterface.dropTable('indicadores');
  }
};
