/**
 * Configuración de Roles y Permisos - SGC-UNT
 * 
 * Este archivo define centralmente todos los roles y sus permisos.
 * Para agregar un nuevo rol o modificar permisos, solo edita este archivo
 * y ejecuta el script de sincronización: npm run sync:permisos
 */

module.exports = {
  // Definición de roles
  roles: [
    {
      nombre: 'admin',
      descripcion: 'Administrador con acceso total al sistema',
      permisos: '*' // Todos los permisos
    },
    {
      nombre: 'auditor',
      descripcion: 'Auditor interno con acceso a módulos de auditoría',
      permisos: [
        // Documentos - lectura y escritura
        'documentos.ver',
        'documentos.crear',
        'documentos.editar',
        'documentos.eliminar',
        'documentos.aprobar',
        // Procesos - lectura y escritura
        'procesos.ver',
        'procesos.crear',
        'procesos.editar',
        'procesos.eliminar',
        // Auditorías - acceso completo
        'auditorias.ver',
        'auditorias.crear',
        'auditorias.editar',
        'auditorias.eliminar',
        'auditorias.ejecutar',
        'auditorias.hallazgos',
        // CAPA - lectura y escritura
        'acciones.ver',
        'acciones.crear',
        'acciones.editar',
        'acciones.eliminar',
        // Riesgos - lectura y escritura
        'riesgos.ver',
        'riesgos.crear',
        'riesgos.editar',
        'riesgos.eliminar',
        // Indicadores - lectura y escritura
        'indicadores.ver',
        'indicadores.crear',
        'indicadores.editar',
        'indicadores.eliminar',
        'indicadores.mediciones',
        // Acreditación - lectura y escritura
        'acreditacion.ver',
        'acreditacion.crear',
        'acreditacion.editar',
        'acreditacion.eliminar',
        // Satisfacción - lectura y escritura
        'satisfaccion.ver',
        'satisfaccion.crear',
        'satisfaccion.editar',
        'satisfaccion.eliminar',
        'satisfaccion.publicar',
      ]
    },
    {
      nombre: 'usuario',
      descripcion: 'Usuario estándar con acceso a módulos asignados',
      permisos: [
        // Documentos - lectura y escritura limitada
        'documentos.ver',
        'documentos.crear',
        'documentos.editar',
        // Procesos - lectura y escritura limitada
        'procesos.ver',
        'procesos.crear',
        'procesos.editar',
        // Auditorías - solo lectura
        'auditorias.ver',
        // CAPA - lectura y escritura
        'acciones.ver',
        'acciones.crear',
        'acciones.editar',
        // Riesgos - lectura y escritura
        'riesgos.ver',
        'riesgos.crear',
        'riesgos.editar',
        // Indicadores - lectura y escritura
        'indicadores.ver',
        'indicadores.crear',
        'indicadores.editar',
        'indicadores.mediciones',
        // Acreditación - lectura y escritura
        'acreditacion.ver',
        'acreditacion.crear',
        'acreditacion.editar',
        // Satisfacción - lectura y escritura
        'satisfaccion.ver',
        'satisfaccion.crear',
        'satisfaccion.editar',
      ]
    },
    {
      nombre: 'solo_lectura',
      descripcion: 'Acceso de solo lectura a reportes y dashboards',
      permisos: [
        // Solo lectura de todos los módulos
        'documentos.ver',
        'procesos.ver',
        'auditorias.ver',
        'acciones.ver',
        'riesgos.ver',
        'indicadores.ver',
        'acreditacion.ver',
        'satisfaccion.ver',
        'dashboard.ver',
      ]
    }
  ],

  // Definición de permisos por módulo
  permisos: {
    documentos: [
      { codigo: 'documentos.ver', descripcion: 'Ver documentos' },
      { codigo: 'documentos.crear', descripcion: 'Crear documentos' },
      { codigo: 'documentos.editar', descripcion: 'Editar documentos' },
      { codigo: 'documentos.eliminar', descripcion: 'Eliminar documentos' },
      { codigo: 'documentos.aprobar', descripcion: 'Aprobar documentos' },
      { codigo: 'documentos.versionar', descripcion: 'Gestionar versiones' },
    ],
    procesos: [
      { codigo: 'procesos.ver', descripcion: 'Ver procesos' },
      { codigo: 'procesos.crear', descripcion: 'Crear procesos' },
      { codigo: 'procesos.editar', descripcion: 'Editar procesos' },
      { codigo: 'procesos.eliminar', descripcion: 'Eliminar procesos' },
      { codigo: 'procesos.mapa', descripcion: 'Ver mapa de procesos' },
    ],
    auditorias: [
      { codigo: 'auditorias.ver', descripcion: 'Ver auditorías' },
      { codigo: 'auditorias.crear', descripcion: 'Crear auditorías' },
      { codigo: 'auditorias.editar', descripcion: 'Editar auditorías' },
      { codigo: 'auditorias.eliminar', descripcion: 'Eliminar auditorías' },
      { codigo: 'auditorias.ejecutar', descripcion: 'Ejecutar auditorías' },
      { codigo: 'auditorias.hallazgos', descripcion: 'Gestionar hallazgos' },
    ],
    acciones: [
      { codigo: 'acciones.ver', descripcion: 'Ver acciones CAPA' },
      { codigo: 'acciones.crear', descripcion: 'Crear acciones CAPA' },
      { codigo: 'acciones.editar', descripcion: 'Editar acciones CAPA' },
      { codigo: 'acciones.eliminar', descripcion: 'Eliminar acciones CAPA' },
      { codigo: 'acciones.cerrar', descripcion: 'Cerrar acciones CAPA' },
    ],
    riesgos: [
      { codigo: 'riesgos.ver', descripcion: 'Ver riesgos' },
      { codigo: 'riesgos.crear', descripcion: 'Crear riesgos' },
      { codigo: 'riesgos.editar', descripcion: 'Editar riesgos' },
      { codigo: 'riesgos.eliminar', descripcion: 'Eliminar riesgos' },
      { codigo: 'riesgos.matriz', descripcion: 'Ver matriz de riesgos' },
      { codigo: 'riesgos.monitorear', descripcion: 'Monitorear riesgos' },
    ],
    indicadores: [
      { codigo: 'indicadores.ver', descripcion: 'Ver indicadores' },
      { codigo: 'indicadores.crear', descripcion: 'Crear indicadores' },
      { codigo: 'indicadores.editar', descripcion: 'Editar indicadores' },
      { codigo: 'indicadores.eliminar', descripcion: 'Eliminar indicadores' },
      { codigo: 'indicadores.mediciones', descripcion: 'Registrar mediciones' },
      { codigo: 'indicadores.alertas', descripcion: 'Ver alertas de indicadores' },
    ],
    acreditacion: [
      { codigo: 'acreditacion.ver', descripcion: 'Ver autoevaluaciones' },
      { codigo: 'acreditacion.crear', descripcion: 'Crear autoevaluaciones' },
      { codigo: 'acreditacion.editar', descripcion: 'Editar autoevaluaciones' },
      { codigo: 'acreditacion.eliminar', descripcion: 'Eliminar autoevaluaciones' },
      { codigo: 'acreditacion.evidencias', descripcion: 'Gestionar evidencias' },
    ],
    satisfaccion: [
      { codigo: 'satisfaccion.ver', descripcion: 'Ver encuestas' },
      { codigo: 'satisfaccion.crear', descripcion: 'Crear encuestas' },
      { codigo: 'satisfaccion.editar', descripcion: 'Editar encuestas' },
      { codigo: 'satisfaccion.eliminar', descripcion: 'Eliminar encuestas' },
      { codigo: 'satisfaccion.publicar', descripcion: 'Publicar encuestas' },
      { codigo: 'satisfaccion.resultados', descripcion: 'Ver resultados de encuestas' },
    ],
    usuarios: [
      { codigo: 'usuarios.ver', descripcion: 'Ver usuarios' },
      { codigo: 'usuarios.crear', descripcion: 'Crear usuarios' },
      { codigo: 'usuarios.editar', descripcion: 'Editar usuarios' },
      { codigo: 'usuarios.eliminar', descripcion: 'Eliminar usuarios' },
      { codigo: 'usuarios.roles', descripcion: 'Gestionar roles' },
    ],
    dashboard: [
      { codigo: 'dashboard.ver', descripcion: 'Ver dashboard' },
      { codigo: 'dashboard.estadisticas', descripcion: 'Ver estadísticas' },
    ]
  }
};
