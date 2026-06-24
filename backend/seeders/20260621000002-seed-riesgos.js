'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('riesgos', [
      {
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'RIE-001',
        nombre: 'Riesgo Estratégico de Financiamiento',
        descripcion: 'Posible falta de financiamiento para proyectos críticos.',
        categoria_id: 1, // Estratégico
        proceso_id: null,
        responsable_id: 1,
        tipo_riesgo: 'negativo',
        probabilidad: 4,
        impacto: 5,
        // nivel_riesgo será generado por la base de datos
        clasificacion_nivel: 'alto',
        estado: 'identificado',
        fecha_identificacion: new Date(),
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      },
      {
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'RIE-002',
        nombre: 'Riesgo Operacional de Sistema',
        descripcion: 'Falla del sistema de gestión de documentos.',
        categoria_id: 2, // Operacional
        proceso_id: null,
        responsable_id: 1,
        tipo_riesgo: 'negativo',
        probabilidad: 2,
        impacto: 3,
        clasificacion_nivel: 'moderado',
        estado: 'identificado',
        fecha_identificacion: new Date(),
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      },
      {
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'RIE-003',
        nombre: 'Riesgo Tecnológico de Seguridad',
        descripcion: 'Vulnerabilidad en la infraestructura de TI.',
        categoria_id: 3, // Tecnológico
        proceso_id: null,
        responsable_id: 1,
        tipo_riesgo: 'negativo',
        probabilidad: 3,
        impacto: 4,
        clasificacion_nivel: 'alto',
        estado: 'identificado',
        fecha_identificacion: new Date(),
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      }
    ], {});
    // Ajustar el contador de la secuencia
    await queryInterface.sequelize.query("SELECT setval('riesgos_id_seq', 3);");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('riesgos', null, {});
  }
};
