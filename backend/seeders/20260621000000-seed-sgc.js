'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Roles
    await queryInterface.bulkInsert('roles', [
      { id: 1, nombre: 'admin', descripcion: 'Administrador con acceso total al sistema', activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { id: 2, nombre: 'auditor', descripcion: 'Auditor interno con acceso a módulos de auditoría', activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { id: 3, nombre: 'usuario', descripcion: 'Usuario estándar con acceso a módulos asignados', activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { id: 4, nombre: 'solo_lectura', descripcion: 'Acceso de solo lectura a reportes y dashboards', activo: true, creado_en: new Date(), actualizado_en: new Date() }
    ], {});

    // Reset sequence for roles
    await queryInterface.sequelize.query("SELECT setval('roles_id_seq', 4)");

    // 2. Usuarios
    // Para la contraseña admin (Admin1234!) usamos crypt('Admin1234!', gen_salt('bf'))
    await queryInterface.bulkInsert('usuarios', [
      {
        id: 1,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        nombres: 'Administrador',
        apellidos: 'SGC',
        correo: 'admin@unt.edu.pe',
        contrasena_hash: Sequelize.literal("crypt('Admin1234!', gen_salt('bf'))"),
        rol_id: 1,
        area: 'Oficina de Calidad',
        cargo: 'Administrador del Sistema',
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      }
    ], {});

    // Reset sequence for usuarios
    await queryInterface.sequelize.query("SELECT setval('usuarios_id_seq', 1)");

    // 3. Categorias de documentos
    await queryInterface.bulkInsert('categorias_documento', [
      { id: 1, nombre: 'Política', descripcion: 'Documentos de política institucional', activo: true, creado_en: new Date(), actualizado_en: new Date(), creado_por: 1, actualizado_por: 1 },
      { id: 2, nombre: 'Manual', descripcion: 'Manuales del sistema de gestión', activo: true, creado_en: new Date(), actualizado_en: new Date(), creado_por: 1, actualizado_por: 1 },
      { id: 3, nombre: 'Procedimiento', descripcion: 'Procedimientos operativos', activo: true, creado_en: new Date(), actualizado_en: new Date(), creado_por: 1, actualizado_por: 1 },
      { id: 4, nombre: 'Instructivo', descripcion: 'Instructivos de trabajo', activo: true, creado_en: new Date(), actualizado_en: new Date(), creado_por: 1, actualizado_por: 1 },
      { id: 5, nombre: 'Formato', descripcion: 'Formatos y plantillas', activo: true, creado_en: new Date(), actualizado_en: new Date(), creado_por: 1, actualizado_por: 1 }
    ], {});

    await queryInterface.sequelize.query("SELECT setval('categorias_documento_id_seq', 5)");

    // 4. Tipos de proceso
    await queryInterface.bulkInsert('tipos_proceso', [
      { id: 1, nombre: 'Estratégico', descripcion: 'Procesos de dirección y planificación', creado_en: new Date(), actualizado_en: new Date() },
      { id: 2, nombre: 'Misional', descripcion: 'Procesos académicos y de investigación', creado_en: new Date(), actualizado_en: new Date() },
      { id: 3, nombre: 'Soporte', descripcion: 'Procesos administrativos y de apoyo', creado_en: new Date(), actualizado_en: new Date() }
    ], {});

    await queryInterface.sequelize.query("SELECT setval('tipos_proceso_id_seq', 3)");

    // 5. Procesos de muestra
    await queryInterface.bulkInsert('procesos', [
      {
        id: 1,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'MAC-001',
        nombre: 'Gestión Estratégica',
        descripcion: 'Macroproceso de dirección institucional',
        tipo_id: 1,
        nivel: 'macroproceso',
        responsable_id: 1,
        objetivo: 'Definir y ejecutar el plan estratégico',
        entradas: 'Plan estratégico anterior',
        salidas: 'Plan estratégico aprobado',
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      },
      {
        id: 2,
        uuid: Sequelize.literal('uuid_generate_v4()'),
        codigo: 'MAC-002',
        nombre: 'Formación Académica',
        descripcion: 'Macroproceso de enseñanza-aprendizaje',
        tipo_id: 2,
        nivel: 'macroproceso',
        responsable_id: 1,
        objetivo: 'Formar profesionales de calidad',
        entradas: 'Estudiantes admitidos',
        salidas: 'Profesionales egresados',
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date(),
        creado_por: 1,
        actualizado_por: 1
      }
    ], {});

    await queryInterface.sequelize.query("SELECT setval('procesos_id_seq', 2)");

    // 6. Modelos de acreditacion
    await queryInterface.bulkInsert('modelos_acreditacion', [
      { id: 1, nombre: 'SINEACE 2023', entidad: 'SINEACE', version: '2023', activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { id: 2, nombre: 'ISO 21001:2018', entidad: 'ISO', version: '2018', activo: true, creado_en: new Date(), actualizado_en: new Date() }
    ], {});

    await queryInterface.sequelize.query("SELECT setval('modelos_acreditacion_id_seq', 2)");

    // 7. Categorias de riesgo
    await queryInterface.bulkInsert('categorias_riesgo', [
      { id: 1, nombre: 'Estratégico', descripcion: 'Riesgos que afectan los objetivos institucionales', creado_en: new Date(), actualizado_en: new Date() },
      { id: 2, nombre: 'Operacional', descripcion: 'Riesgos en la ejecución de procesos', creado_en: new Date(), actualizado_en: new Date() },
      { id: 3, nombre: 'Tecnológico', descripcion: 'Riesgos asociados a sistemas e infraestructura TI', creado_en: new Date(), actualizado_en: new Date() },
      { id: 4, nombre: 'Reputacional', descripcion: 'Riesgos que afectan la imagen institucional', creado_en: new Date(), actualizado_en: new Date() },
      { id: 5, nombre: 'Financiero', descripcion: 'Riesgos económicos y presupuestales', creado_en: new Date(), actualizado_en: new Date() },
      { id: 6, nombre: 'Legal', descripcion: 'Riesgos normativos y de cumplimiento', creado_en: new Date(), actualizado_en: new Date() }
    ], {});

    await queryInterface.sequelize.query("SELECT setval('categorias_riesgo_id_seq', 6)");

    // 8. Indicadores
    const indicatorsData = [
      {
        id: 1,
        codigo: 'IND-OEI01-01',
        nombre: 'Objetivo Educacional Óptimo',
        descripcion: 'Porcentaje de egresados que obtienen un nivel óptimo de logro de los objetivos educacionales',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° de egresados que cumplen con el Nivel Óptimo de los Objetivos Educacionales / N° Total de Estudiantes Egresados) × 100',
        unidad_medida: '%',
        meta: 85.00,
        umbral_alerta: 70.00,
        umbral_critico: 50.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 2,
        codigo: 'IND-OEI01-02',
        nombre: 'Inserción Laboral General',
        descripcion: 'Porcentaje de egresados que se encuentran laborando actualmente según carrera profesional',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° de Egresados que se encuentran laborando actualmente según su Carrera Profesional / N° Total de Egresados) × 100',
        unidad_medida: '%',
        meta: 80.00,
        umbral_alerta: 60.00,
        umbral_critico: 40.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 3,
        codigo: 'IND-OEI01-03',
        nombre: 'Inserción Laboral Acorde al Perfil',
        descripcion: 'Porcentaje de egresados que se encuentran laborando de acuerdo a su formación profesional, su perfil, cargo que ocupa, remunerado acorde al mercado nacional',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° de Egresados que se encuentran laborando de acuerdo a su formación profesional, su perfil, cargo que ocupa, y remunerado de acuerdo al mercado nacional / N° Total de Egresados por promoción) × 100',
        unidad_medida: '%',
        meta: 75.00,
        umbral_alerta: 55.00,
        umbral_critico: 35.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 4,
        codigo: 'IND-OEI02-01',
        nombre: 'Publicaciones de Alto Impacto',
        descripcion: 'Porcentaje de publicaciones académicas en revistas de alto impacto',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° Total de publicaciones académicas en revistas de alto impacto / N° Total de Publicaciones académicas desarrolladas) × 100',
        unidad_medida: '%',
        meta: 30.00,
        umbral_alerta: 20.00,
        umbral_critico: 10.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 5,
        codigo: 'IND-OEI02-02',
        nombre: 'Patentes Registradas',
        descripcion: 'Porcentaje de patentes registradas',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° Total de patentes registradas / N° Total de Patentes propuestas) × 100',
        unidad_medida: '%',
        meta: 60.00,
        umbral_alerta: 40.00,
        umbral_critico: 20.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 6,
        codigo: 'IND-OEI02-03',
        nombre: 'Nuevos Emprendimientos',
        descripcion: 'Porcentaje de nuevos emprendimientos registrados',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° Total de Emprendimientos nuevos Registrados / N° Total de Emprendimientos nuevos planteados) × 100',
        unidad_medida: '%',
        meta: 70.00,
        umbral_alerta: 50.00,
        umbral_critico: 30.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 7,
        codigo: 'IND-OEI03-01',
        nombre: 'Proyectos Implementados',
        descripcion: 'Porcentaje de proyectos de extensión cultural, proyección y responsabilidad social y ambiental en la comunidad universitaria y sociedad implementados',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental implementados / N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental programados) × 100',
        unidad_medida: '%',
        meta: 90.00,
        umbral_alerta: 75.00,
        umbral_critico: 50.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 8,
        codigo: 'IND-OEI03-02',
        nombre: 'Proyectos Evaluados',
        descripcion: 'Porcentaje de proyectos de extensión cultural, proyección y responsabilidad social y ambiental en la comunidad universitaria y sociedad evaluados',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental evaluados / N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental programados) × 100',
        unidad_medida: '%',
        meta: 95.00,
        umbral_alerta: 80.00,
        umbral_critico: 60.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 9,
        codigo: 'IND-OEI04-01',
        nombre: 'Eficacia del PEI',
        descripcion: 'Eficacia del PEI en relación al cumplimiento de los objetivos estratégicos institucionales',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° total de objetivos estratégicos institucionales logrados / N° Total de objetivos estratégicos institucionales planteados) × 100',
        unidad_medida: '%',
        meta: 90.00,
        umbral_alerta: 75.00,
        umbral_critico: 50.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 10,
        codigo: 'IND-OEI04-02',
        nombre: 'Ejecución del Presupuesto',
        descripcion: 'Porcentaje de ejecución del presupuesto Institucional',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(Monto Total del Girado del presupuesto institucional / Monto Total del PIM) × 100',
        unidad_medida: '%',
        meta: 95.00,
        umbral_alerta: 85.00,
        umbral_critico: 70.00,
        frecuencia_medicion: 'anual',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 11,
        codigo: 'IND-OEI05-01',
        nombre: 'Gestión de Riesgos y Continuidad',
        descripcion: 'Porcentaje de avance en la implementación del Sistema de Gestión de riesgos y continuidad operativa institucional',
        modulo: 'general',
        tipo: 'porcentaje',
        formula: '(N° Total de Acciones Ejecutadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa / N° Total de Acciones Programadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa) × 100',
        unidad_medida: '%',
        meta: 100.00,
        umbral_alerta: 80.00,
        umbral_critico: 60.00,
        frecuencia_medicion: 'trimestral',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      },
      {
        id: 12,
        codigo: 'IND-OC01-01',
        nombre: 'Satisfacción Estudiantil',
        descripcion: 'Porcentaje de estudiantes satisfechos con los servicios brindados por la UNT',
        modulo: 'satisfaccion',
        tipo: 'porcentaje',
        formula: '(Número de estudiantes satisfechos y muy satisfechos con los servicios brindados por la Universidad Nacional de Trujillo / Número total de estudiantes encuestados) × 100',
        unidad_medida: '%',
        meta: 85.00,
        umbral_alerta: 70.00,
        umbral_critico: 50.00,
        frecuencia_medicion: 'trimestral',
        responsable_id: 1,
        activo: true,
        creado_en: new Date(),
        actualizado_en: new Date()
      }
    ];

    for (const ind of indicatorsData) {
      ind.uuid = Sequelize.literal('uuid_generate_v4()');
    }

    await queryInterface.bulkInsert('indicadores', indicatorsData, {});
    await queryInterface.sequelize.query("SELECT setval('indicadores_id_seq', 12)");

    // 9. Parámetros de indicadores
    await queryInterface.bulkInsert('parametros_indicador', [
      // IND-OEI04-01: Eficacia del PEI
      { indicador_id: 9, nombre: 'objetivos_logrados', etiqueta: 'N° total de objetivos estratégicos institucionales logrados', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 9, nombre: 'objetivos_planteados', etiqueta: 'N° Total de objetivos estratégicos institucionales planteados', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI04-02: Ejecución del Presupuesto
      { indicador_id: 10, nombre: 'monto_girado', etiqueta: 'Monto Total del Girado del presupuesto institucional', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 10, nombre: 'monto_pim', etiqueta: 'Monto Total del PIM', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI01-01: Objetivo Educacional Óptimo
      { indicador_id: 1, nombre: 'egresados_cumplen', etiqueta: 'N° de egresados que cumplen con el Nivel Óptimo de los Objetivos Educacionales', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 1, nombre: 'total_egresados', etiqueta: 'N° Total de Estudiantes Egresados', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI01-02: Inserción Laboral General
      { indicador_id: 2, nombre: 'egresados_laborando', etiqueta: 'N° de Egresados que se encuentran laborando actualmente según su Carrera Profesional', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 2, nombre: 'total_egresados', etiqueta: 'N° Total de Egresados', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI01-03: Inserción Laboral Acorde al Perfil
      { indicador_id: 3, nombre: 'egresados_acorde', etiqueta: 'N° de Egresados que se encuentran laborando de acuerdo a su formación profesional, su perfil, cargo que ocupa, y remunerado de acuerdo al mercado nacional', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 3, nombre: 'total_egresados_promocion', etiqueta: 'N° Total de Egresados por promoción', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI02-01: Publicaciones de Alto Impacto
      { indicador_id: 4, nombre: 'publicaciones_alto_impacto', etiqueta: 'N° Total de publicaciones académicas en revistas de alto impacto', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 4, nombre: 'total_publicaciones', etiqueta: 'N° Total de Publicaciones académicas desarrolladas', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI02-02: Patentes Registradas
      { indicador_id: 5, nombre: 'patentes_registradas', etiqueta: 'N° Total de patentes registradas', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 5, nombre: 'patentes_propuestas', etiqueta: 'N° Total de Patentes propuestas', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI02-03: Nuevos Emprendimientos
      { indicador_id: 6, nombre: 'emprendimientos_registrados', etiqueta: 'N° Total de Emprendimientos nuevos Registrados', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 6, nombre: 'emprendimientos_planteados', etiqueta: 'N° Total de Emprendimientos nuevos planteados', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI03-02: Proyectos Evaluados
      { indicador_id: 8, nombre: 'proyectos_evaluados', etiqueta: 'N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental evaluados', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 8, nombre: 'proyectos_programados', etiqueta: 'N° Total de Proyectos de Extensión Cultural, proyección y Responsabilidad Social y ambiental programados', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OEI05-01: Gestión de Riesgos y Continuidad
      { indicador_id: 11, nombre: 'acciones_ejecutadas', etiqueta: 'N° Total de Acciones Ejecutadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 11, nombre: 'acciones_programadas', etiqueta: 'N° Total de Acciones Programadas para la Implementación del Sistema de Gestión de Riesgos y Continuidad Operativa', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      
      // IND-OC01-01: Satisfacción Estudiantil
      { indicador_id: 12, nombre: 'estudiantes_satisfechos', etiqueta: 'Número de estudiantes satisfechos y muy satisfechos con los servicios brindados por la Universidad Nacional de Trujillo', orden: 1, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() },
      { indicador_id: 12, nombre: 'total_encuestados', etiqueta: 'Número total de estudiantes encuestados', orden: 2, tipo: 'numero', obligatorio: true, activo: true, creado_en: new Date(), actualizado_en: new Date() }
    ], {});

    await queryInterface.sequelize.query("SELECT setval('parametros_indicador_id_seq', 22)");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('parametros_indicador', null, {});
    await queryInterface.bulkDelete('indicadores', null, {});
    await queryInterface.bulkDelete('categorias_riesgo', null, {});
    await queryInterface.bulkDelete('modelos_acreditacion', null, {});
    await queryInterface.bulkDelete('procesos', null, {});
    await queryInterface.bulkDelete('tipos_proceso', null, {});
    await queryInterface.bulkDelete('categorias_documento', null, {});
    await queryInterface.bulkDelete('usuarios', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  }
};
