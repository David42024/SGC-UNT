'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Seed no_conformidades (CAPA records)
    await queryInterface.bulkInsert('no_conformidades', [
      {
        id: 1,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'CAPA-001',
        titulo: 'Mejora del proceso de auditoría',
        descripcion: 'Se detectó la necesidad de actualizar el procedimiento de auditoría interna.',
        tipo: 'correctiva',
        origen: 'auditoria',
        proceso_id: null,
        hallazgo_id: null,
        responsable_id: 1,
        estado: 'abierto',
        fecha_deteccion: Sequelize.literal('CURRENT_DATE'),
        fecha_limite: Sequelize.literal('CURRENT_DATE + INTERVAL \'30 days\''),
        fecha_cierre: null,
        impacto: 'medio',
        creado_en: Sequelize.literal('NOW()'),
        actualizado_en: Sequelize.literal('NOW()'),
        creado_por: 1,
        actualizado_por: 1,
      },
      {
        id: 2,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'CAPA-002',
        titulo: 'Prevención de errores en captura de datos',
        descripcion: 'Implementar validaciones adicionales en el formulario de carga de indicadores.',
        tipo: 'preventiva',
        origen: 'revision',
        proceso_id: null,
        hallazgo_id: null,
        responsable_id: 1,
        estado: 'abierto',
        fecha_deteccion: Sequelize.literal('CURRENT_DATE'),
        fecha_limite: null,
        fecha_cierre: null,
        impacto: 'alto',
        creado_en: Sequelize.literal('NOW()'),
        actualizado_en: Sequelize.literal('NOW()'),
        creado_por: 1,
        actualizado_por: 1,
      }
    ], {});

    // 2. Seed analisis_causa_raiz linked to the CAPA records
    await queryInterface.bulkInsert('analisis_causa_raiz', [
      {
        id: 1,
        no_conformidad_id: 1,
        metodo: '5_porques',
        descripcion_problema: 'El procedimiento actual no contempla revisiones trimestrales.',
        causa_raiz: 'Falta de frecuencia establecida en la normativa interna.',
        factores_causales: null,
        porques: null,
        creado_en: Sequelize.literal('NOW()'),
        actualizado_en: Sequelize.literal('NOW()'),
        creado_por: 1,
        actualizado_por: 1,
      },
      {
        id: 2,
        no_conformidad_id: 2,
        metodo: 'ishikawa',
        descripcion_problema: 'Errores frecuentes al guardar indicadores por falta de validación.',
        causa_raiz: 'Validaciones débiles en la capa frontend.',
        factores_causales: null,
        porques: null,
        creado_en: Sequelize.literal('NOW()'),
        actualizado_en: Sequelize.literal('NOW()'),
        creado_por: 1,
        actualizado_por: 1,
      }
    ], {});

    // 3. Seed planes_accion_capa linked to the CAPA records
    await queryInterface.bulkInsert('planes_accion_capa', [
      {
        id: 1,
        no_conformidad_id: 1,
        actividad: 'Actualizar el procedimiento de auditoría con revisiones trimestrales.',
        responsable_id: 1,
        fecha_inicio: null,
        fecha_limite: Sequelize.literal('CURRENT_DATE'),
        fecha_cierre: null,
        estado: 'pendiente',
        evidencia_cierre: null,
        archivo_ruta: null,
        orden: 1,
        creado_en: Sequelize.literal('NOW()'),
        actualizado_en: Sequelize.literal('NOW()'),
        creado_por: 1,
        actualizado_por: 1,
      },
      {
        id: 2,
        no_conformidad_id: 2,
        actividad: 'Implementar validaciones de datos en el formulario de indicadores.',
        responsable_id: 1,
        fecha_inicio: null,
        fecha_limite: Sequelize.literal('CURRENT_DATE + INTERVAL \'30 days\'') ,
        fecha_cierre: null,
        estado: 'pendiente',
        evidencia_cierre: null,
        archivo_ruta: null,
        orden: 1,
        creado_en: Sequelize.literal('NOW()'),
        actualizado_en: Sequelize.literal('NOW()'),
        creado_por: 1,
        actualizado_por: 1,
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('planes_accion_capa', null, {});
    await queryInterface.bulkDelete('analisis_causa_raiz', null, {});
    await queryInterface.bulkDelete('no_conformidades', null, {});
  }
};
