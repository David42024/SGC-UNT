'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Agregar fecha_verificacion
    await queryInterface.addColumn('no_conformidades', 'fecha_verificacion', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });

    // Agregar efectividad
    await queryInterface.addColumn('no_conformidades', 'efectividad', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    // Agregar constraint CHECK para efectividad
    await queryInterface.addConstraint('no_conformidades', {
      fields: ['efectividad'],
      type: 'check',
      where: {
        efectividad: ['si', 'parcial', 'no']
      },
      name: 'check_no_conformidades_efectividad'
    });

    // Agregar evidencia_url
    await queryInterface.addColumn('no_conformidades', 'evidencia_url', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Agregar observaciones_verificacion
    await queryInterface.addColumn('no_conformidades', 'observaciones_verificacion', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Remover constraint CHECK
    await queryInterface.removeConstraint('no_conformidades', 'check_no_conformidades_efectividad');

    // Remover columnas
    await queryInterface.removeColumn('no_conformidades', 'fecha_verificacion');
    await queryInterface.removeColumn('no_conformidades', 'efectividad');
    await queryInterface.removeColumn('no_conformidades', 'evidencia_url');
    await queryInterface.removeColumn('no_conformidades', 'observaciones_verificacion');
  }
};
