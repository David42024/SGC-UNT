'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Modificar tabla encuestas
    await queryInterface.addColumn('encuestas', 'visibilidad', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'publica'
    });

    await queryInterface.addColumn('encuestas', 'privacidad', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'anonima'
    });

    await queryInterface.addColumn('encuestas', 'estructura_json', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    // Cambiar el valor por defecto de 'estado' a 'activo'
    await queryInterface.changeColumn('encuestas', 'estado', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'activo'
    });

    // Actualizar estados existentes a 'activo' para no violar la nueva restricción
    await queryInterface.sequelize.query(
      `UPDATE encuestas SET estado = 'activo' WHERE estado NOT IN ('activo', 'suspendido')`
    );

    // Agregar check constraints
    await queryInterface.addConstraint('encuestas', {
      fields: ['visibilidad'],
      type: 'check',
      where: {
        visibilidad: ['privada', 'estudiante', 'publica']
      },
      name: 'check_encuestas_visibilidad'
    });

    await queryInterface.addConstraint('encuestas', {
      fields: ['privacidad'],
      type: 'check',
      where: {
        privacidad: ['anonima', 'no_anonima']
      },
      name: 'check_encuestas_privacidad'
    });

    await queryInterface.addConstraint('encuestas', {
      fields: ['estado'],
      type: 'check',
      where: {
        estado: ['activo', 'suspendido']
      },
      name: 'check_encuestas_estado_nuevo'
    });

    // 2. Modificar tabla respuestas_encuesta
    await queryInterface.addColumn('respuestas_encuesta', 'respuestas_json', {
      type: Sequelize.JSONB,
      allowNull: true
    });

    await queryInterface.addColumn('respuestas_encuesta', 'codigo_estudiante', {
      type: Sequelize.STRING(10),
      allowNull: true
    });

    // 3. Crear tabla historial_fechas_encuesta
    await queryInterface.createTable('historial_fechas_encuesta', {
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
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'RESTRICT'
      },
      fecha_inicio_anterior: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_cierre_anterior: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_inicio_nueva: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      fecha_cierre_nueva: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      tipo_ajuste: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      creado_en: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Trigger de auditoría para actualizar_timestamp si se necesita (aunque historial no se edita, sólo se crea)
  },

  async down(queryInterface, Sequelize) {
    // 1. Eliminar tabla historial_fechas_encuesta
    await queryInterface.dropTable('historial_fechas_encuesta');

    // 2. Modificar tabla respuestas_encuesta
    await queryInterface.removeColumn('respuestas_encuesta', 'respuestas_json');
    await queryInterface.removeColumn('respuestas_encuesta', 'codigo_estudiante');

    // 3. Modificar tabla encuestas
    await queryInterface.removeConstraint('encuestas', 'check_encuestas_visibilidad');
    await queryInterface.removeConstraint('encuestas', 'check_encuestas_privacidad');
    await queryInterface.removeConstraint('encuestas', 'check_encuestas_estado_nuevo');

    await queryInterface.removeColumn('encuestas', 'visibilidad');
    await queryInterface.removeColumn('encuestas', 'privacidad');
    await queryInterface.removeColumn('encuestas', 'estructura_json');

    // Restaurar el valor por defecto de 'estado' a 'borrador'
    await queryInterface.changeColumn('encuestas', 'estado', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'borrador'
    });
  }
};
