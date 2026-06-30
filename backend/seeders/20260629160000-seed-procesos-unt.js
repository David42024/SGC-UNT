'use strict';

// Seeder: Mapa de Procesos institucional real de la UNT
// Fuente oficial: https://calidad.unitru.edu.pe/galeria/
// PDF oficial: https://calidad.unitru.edu.pe/wp-content/uploads/2025/08/MAPA-DE-PROCESOS-DEL-SISTEMA-DE-GESTION-DE-CALIDAD.pdf
//
// Carga los 18 macroprocesos institucionales (Estratégicos, Misionales,
// de Apoyo) definidos en el Sistema Integrado de Gestión de la Calidad
// Universitaria (SIGCUNT) de la Universidad Nacional de Trujillo.
//
// tipo_id: 1 = Estratégico | 2 = Misional | 3 = Soporte (tabla tipos_proceso)
// responsable_id: 1 = Administrador SGC (dato de prueba, según indicación del docente)

module.exports = {
  async up(queryInterface, Sequelize) {
    const ahora = new Date();

    const procesos = [
      // ── Procesos Estratégicos (tipo_id = 1) ──────────────────
      ['E01', 'Gobierno de la Universidad', 'Macroproceso estratégico de gobierno institucional', 1, 'Dirigir y gobernar la institución conforme a su misión y visión'],
      ['E02', 'Gestión de la Mejora Continua', 'Macroproceso estratégico de mejora continua del SGC', 1, 'Asegurar la mejora continua de los procesos institucionales'],
      ['E03', 'Supervisión y Control', 'Macroproceso estratégico de supervisión y control institucional', 1, 'Supervisar y controlar el cumplimiento de los objetivos institucionales'],
      ['E04', 'Gestión de la Información y Comunicación', 'Macroproceso estratégico de información y comunicación institucional', 1, 'Gestionar la información y comunicación interna y externa'],
      ['E05', 'Gestión de las Relaciones Inter-Institucionales', 'Macroproceso estratégico de relaciones inter-institucionales', 1, 'Gestionar alianzas y relaciones con otras instituciones'],
      ['E06', 'Dirección Estratégica', 'Macroproceso estratégico de planeamiento institucional', 1, 'Definir y ejecutar el direccionamiento estratégico institucional'],

      // ── Procesos Misionales (tipo_id = 2) ────────────────────
      ['M01', 'Formación Integral', 'Macroproceso misional de enseñanza-aprendizaje', 2, 'Formar profesionales íntegros y competentes'],
      ['M02', 'Investigación, Innovación y Desarrollo', 'Macroproceso misional de investigación e innovación', 2, 'Generar conocimiento científico e innovación tecnológica'],
      ['M03', 'Responsabilidad Social Universitaria', 'Macroproceso misional de responsabilidad social', 2, 'Contribuir al desarrollo sostenible de la sociedad'],

      // ── Procesos de Apoyo / Soporte (tipo_id = 3) ────────────
      ['A01', 'Gestión de Infraestructura', 'Macroproceso de apoyo en infraestructura institucional', 3, 'Gestionar la infraestructura física institucional'],
      ['A02', 'Gestión de Talento Humano', 'Macroproceso de apoyo en gestión del talento humano', 3, 'Gestionar el desarrollo del talento humano institucional'],
      ['A03', 'Gestión de Bienestar Universitario', 'Macroproceso de apoyo en bienestar universitario', 3, 'Promover el bienestar de la comunidad universitaria'],
      ['A04', 'Gestión de Logística y Control Patrimonial', 'Macroproceso de apoyo en logística y control patrimonial', 3, 'Gestionar los recursos logísticos y patrimoniales'],
      ['A05', 'Gestión de Mantenimiento y Transporte', 'Macroproceso de apoyo en mantenimiento y transporte', 3, 'Gestionar el mantenimiento de bienes y el transporte institucional'],
      ['A06', 'Gestión de Tecnologías de la Información', 'Macroproceso de apoyo en tecnologías de la información', 3, 'Gestionar los sistemas y tecnologías de información institucional'],
      ['A07', 'Asuntos Jurídicos y Legales', 'Macroproceso de apoyo en asuntos jurídicos y legales', 3, 'Brindar asesoría y defensa jurídica institucional'],
      ['A08', 'Gestión de Centros de Información', 'Macroproceso de apoyo en gestión de centros de información (bibliotecas)', 3, 'Gestionar los servicios de información y bibliotecas'],
      ['A09', 'Gestión Financiera', 'Macroproceso de apoyo en gestión financiera institucional', 3, 'Gestionar los recursos financieros institucionales'],
    ];

    const filas = procesos.map(([codigo, nombre, descripcion, tipo_id, objetivo]) => ({
      uuid: Sequelize.literal('uuid_generate_v4()'),
      codigo,
      nombre,
      descripcion,
      tipo_id,
      proceso_padre_id: null,
      nivel: 'macroproceso',
      responsable_id: 1,
      objetivo,
      alcance: null,
      entradas: null,
      salidas: null,
      recursos: null,
      indicadores_clave: null,
      activo: true,
      creado_en: ahora,
      actualizado_en: ahora,
      creado_por: 1,
      actualizado_por: 1,
    }));

    await queryInterface.bulkInsert('procesos', filas, {
      ignoreDuplicates: true, // evita error si el código ya existe (UNIQUE en codigo)
    });
  },

  async down(queryInterface, Sequelize) {
    const codigos = [
      'E01', 'E02', 'E03', 'E04', 'E05', 'E06',
      'M01', 'M02', 'M03',
      'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09',
    ];
    await queryInterface.bulkDelete('procesos', { codigo: codigos });
  },
};
