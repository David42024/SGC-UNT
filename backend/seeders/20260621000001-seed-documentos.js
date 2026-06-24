'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Seed documentos
    await queryInterface.bulkInsert('documentos', [
      {
        id: 1,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'DOC-001',
        titulo: 'Política de Calidad',
        descripcion: 'Política institucional de calidad',
        categoria_id: 1, // Política
        version_actual: '1.0',
        estado: 'borrador',
        responsable_id: 1,
        revisor_id: null,
        aprobador_id: null,
        fecha_emision: null,
        fecha_vigencia: null,
        fecha_vencimiento: null,
        archivo_ruta: null,
        proceso_id: null,
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      },
      {
        id: 2,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'DOC-002',
        titulo: 'Manual de Procedimientos',
        descripcion: 'Manual que describe procesos clave',
        categoria_id: 2, // Manual
        version_actual: '1.0',
        estado: 'borrador',
        responsable_id: 1,
        revisor_id: null,
        aprobador_id: null,
        fecha_emision: null,
        fecha_vigencia: null,
        fecha_vencimiento: null,
        archivo_ruta: null,
        proceso_id: null,
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      }
    ], {});

    // Reset sequence for documentos
    await queryInterface.sequelize.query("SELECT setval('documentos_id_seq', 2)");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('documentos', null, {});
  }
};
