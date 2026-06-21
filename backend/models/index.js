const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const config = require('../config/database.js')[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {};

// ============================================================
// DEFINICIÓN DE MODELOS
// ============================================================

// 1. Rol
db.Rol = sequelize.define('Rol', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'roles' });

// 2. Permiso
db.Permiso = sequelize.define('Permiso', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  codigo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  modulo: { type: DataTypes.STRING(30), allowNull: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'permisos' });

// 3. RolPermiso (Junction Table)
db.RolPermiso = sequelize.define('RolPermiso', {
  rol_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'roles', key: 'id' }
  },
  permiso_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'permisos', key: 'id' }
  }
}, { tableName: 'roles_permisos', timestamps: false });

// Helper para campos comunes de auditoría de creación/actualización de registros
const auditFields = {
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' }
  },
  actualizado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'usuarios', key: 'id' }
  }
};

// 4. Usuario
db.Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  nombres: { type: DataTypes.STRING(100), allowNull: false },
  apellidos: { type: DataTypes.STRING(100), allowNull: false },
  correo: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  contrasena_hash: { type: DataTypes.TEXT, allowNull: false },
  rol_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'roles', key: 'id' } },
  area: { type: DataTypes.STRING(100) },
  cargo: { type: DataTypes.STRING(100) },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ultimo_acceso: { type: DataTypes.DATE },
  ...auditFields
}, { tableName: 'usuarios' });

// 5. CategoriaDocumento
db.CategoriaDocumento = sequelize.define('CategoriaDocumento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ...auditFields
}, { tableName: 'categorias_documento' });

// 6. TipoProceso
db.TipoProceso = sequelize.define('TipoProceso', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  ...auditFields
}, { tableName: 'tipos_proceso' });

// 7. Proceso
db.Proceso = sequelize.define('Proceso', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  tipo_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tipos_proceso', key: 'id' } },
  proceso_padre_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'procesos', key: 'id' } },
  nivel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'proceso' },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  objetivo: { type: DataTypes.TEXT },
  alcance: { type: DataTypes.TEXT },
  entradas: { type: DataTypes.TEXT },
  salidas: { type: DataTypes.TEXT },
  recursos: { type: DataTypes.TEXT },
  indicadores_clave: { type: DataTypes.TEXT },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ...auditFields
}, { tableName: 'procesos' });

// 8. Documento
db.Documento = sequelize.define('Documento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  codigo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categorias_documento', key: 'id' } },
  version_actual: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '1.0' },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'borrador' },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  revisor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
  aprobador_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
  fecha_emision: { type: DataTypes.DATEONLY },
  fecha_vigencia: { type: DataTypes.DATEONLY },
  fecha_vencimiento: { type: DataTypes.DATEONLY },
  archivo_ruta: { type: DataTypes.TEXT },
  proceso_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'procesos', key: 'id' } },
  ...auditFields
}, { tableName: 'documentos' });

// 9. VersionDocumento
db.VersionDocumento = sequelize.define('VersionDocumento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  documento_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'documentos', key: 'id' } },
  version: { type: DataTypes.STRING(10), allowNull: false },
  descripcion_cambio: { type: DataTypes.TEXT, allowNull: false },
  archivo_ruta: { type: DataTypes.TEXT },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'borrador' },
  fecha_version: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
  ...auditFields
}, { tableName: 'versiones_documento' });

// 10. FlujoAprobacionDocumento
db.FlujoAprobacionDocumento = sequelize.define('FlujoAprobacionDocumento', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  documento_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'documentos', key: 'id' } },
  version_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'versiones_documento', key: 'id' } },
  accion: { type: DataTypes.STRING(20), allowNull: false },
  estado_anterior: { type: DataTypes.STRING(20) },
  estado_nuevo: { type: DataTypes.STRING(20) },
  comentario: { type: DataTypes.TEXT },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  fecha_accion: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  ...auditFields
}, { tableName: 'flujo_aprobacion_documento' });

// 11. ActividadProceso
db.ActividadProceso = sequelize.define('ActividadProceso', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  proceso_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'procesos', key: 'id' } },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  responsable_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' } },
  tipo_actividad: { type: DataTypes.STRING(30), defaultValue: 'tarea' },
  duracion_estimada_dias: { type: DataTypes.INTEGER },
  ...auditFields
}, { tableName: 'actividades_proceso' });

// 12. ModeloAcreditacion
db.ModeloAcreditacion = sequelize.define('ModeloAcreditacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  entidad: { type: DataTypes.STRING(100) },
  version: { type: DataTypes.STRING(20) },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ...auditFields
}, { tableName: 'modelos_acreditacion' });

// 13. EstandarAcreditacion
db.EstandarAcreditacion = sequelize.define('EstandarAcreditacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  modelo_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'modelos_acreditacion', key: 'id' } },
  padre_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'estandares_acreditacion', key: 'id' } },
  codigo: { type: DataTypes.STRING(20), allowNull: false },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  nivel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'criterio' },
  peso_ponderacion: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1.00 },
  ...auditFields
}, { tableName: 'estandares_acreditacion' });

// 14. Autoevaluacion
db.Autoevaluacion = sequelize.define('Autoevaluacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  modelo_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'modelos_acreditacion', key: 'id' } },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  periodo: { type: DataTypes.STRING(20) },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'en_proceso' },
  fecha_inicio: { type: DataTypes.DATEONLY },
  fecha_fin: { type: DataTypes.DATEONLY },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  ...auditFields
}, { tableName: 'autoevaluaciones' });

// 15. EvidenciaAcreditacion
db.EvidenciaAcreditacion = sequelize.define('EvidenciaAcreditacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  autoevaluacion_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'autoevaluaciones', key: 'id' } },
  estandar_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'estandares_acreditacion', key: 'id' } },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  tipo_evidencia: { type: DataTypes.STRING(50), defaultValue: 'documento' },
  archivo_ruta: { type: DataTypes.TEXT },
  url_referencia: { type: DataTypes.TEXT },
  estado_cumplimiento: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'no_iniciado' },
  porcentaje_cumplimiento: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.00 },
  observaciones: { type: DataTypes.TEXT },
  responsable_id: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
  ...auditFields
}, { tableName: 'evidencias_acreditacion' });

// 16. ProgramaAuditoria
db.ProgramaAuditoria = sequelize.define('ProgramaAuditoria', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(200), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  año: { type: DataTypes.INTEGER, allowNull: false },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'planificado' },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  ...auditFields
}, { tableName: 'programas_auditoria' });

// 17. Auditoria
db.Auditoria = sequelize.define('Auditoria', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  programa_id: { type: DataTypes.INTEGER, references: { model: 'programas_auditoria', key: 'id' } },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  tipo_auditoria: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'interna' },
  alcance: { type: DataTypes.TEXT },
  objetivo: { type: DataTypes.TEXT },
  proceso_id: { type: DataTypes.INTEGER, references: { model: 'procesos', key: 'id' } },
  auditor_lider_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  fecha_planificada: { type: DataTypes.DATEONLY },
  fecha_inicio: { type: DataTypes.DATEONLY },
  fecha_fin: { type: DataTypes.DATEONLY },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'planificado' },
  conclusion_general: { type: DataTypes.TEXT },
  ...auditFields
}, { tableName: 'auditorias' });

// 18. AuditorAuditoria
db.AuditorAuditoria = sequelize.define('AuditorAuditoria', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  auditoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'auditorias', key: 'id' } },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  rol_auditoria: { type: DataTypes.STRING(30), defaultValue: 'auditor' },
  ...auditFields
}, { tableName: 'auditores_auditoria' });

// 19. HallazgoAuditoria
db.HallazgoAuditoria = sequelize.define('HallazgoAuditoria', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  auditoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'auditorias', key: 'id' } },
  codigo: { type: DataTypes.STRING(30), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  clasificacion: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'observacion' },
  proceso_id: { type: DataTypes.INTEGER, references: { model: 'procesos', key: 'id' } },
  estandar_ref: { type: DataTypes.STRING(100) },
  evidencia_objetiva: { type: DataTypes.TEXT },
  archivo_ruta: { type: DataTypes.TEXT },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'abierto' },
  responsable_id: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
  fecha_limite: { type: DataTypes.DATEONLY },
  ...auditFields
}, { tableName: 'hallazgos_auditoria' });

// 20. NoConformidad
db.NoConformidad = sequelize.define('NoConformidad', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'correctiva' },
  origen: { type: DataTypes.STRING(50), defaultValue: 'auditoria' },
  proceso_id: { type: DataTypes.INTEGER, references: { model: 'procesos', key: 'id' } },
  hallazgo_id: { type: DataTypes.INTEGER, references: { model: 'hallazgos_auditoria', key: 'id' } },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'abierto' },
  fecha_deteccion: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
  fecha_limite: { type: DataTypes.DATEONLY },
  fecha_cierre: { type: DataTypes.DATEONLY },
  impacto: { type: DataTypes.STRING(10), defaultValue: 'medio' },
  ...auditFields
}, { tableName: 'no_conformidades' });

// 21. AnalisisCausaRaiz
db.AnalisisCausaRaiz = sequelize.define('AnalisisCausaRaiz', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  no_conformidad_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'no_conformidades', key: 'id' } },
  metodo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '5_porques' },
  descripcion_problema: { type: DataTypes.TEXT, allowNull: false },
  causa_raiz: { type: DataTypes.TEXT },
  factores_causales: { type: DataTypes.JSONB },
  porques: { type: DataTypes.JSONB },
  ...auditFields
}, { tableName: 'analisis_causa_raiz' });

// 22. PlanAccionCapa
db.PlanAccionCapa = sequelize.define('PlanAccionCapa', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  no_conformidad_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'no_conformidades', key: 'id' } },
  actividad: { type: DataTypes.TEXT, allowNull: false },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  fecha_inicio: { type: DataTypes.DATEONLY },
  fecha_limite: { type: DataTypes.DATEONLY, allowNull: false },
  fecha_cierre: { type: DataTypes.DATEONLY },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
  evidencia_cierre: { type: DataTypes.TEXT },
  archivo_ruta: { type: DataTypes.TEXT },
  orden: { type: DataTypes.INTEGER, defaultValue: 1 },
  ...auditFields
}, { tableName: 'planes_accion_capa' });

// 23. CategoriaRiesgo
db.CategoriaRiesgo = sequelize.define('CategoriaRiesgo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  descripcion: { type: DataTypes.TEXT },
  ...auditFields
}, { tableName: 'categorias_riesgo' });

// 24. Riesgo
db.Riesgo = sequelize.define('Riesgo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  categoria_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'categorias_riesgo', key: 'id' } },
  proceso_id: { type: DataTypes.INTEGER, references: { model: 'procesos', key: 'id' } },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  tipo_riesgo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'negativo' },
  probabilidad: { type: DataTypes.INTEGER, allowNull: false },
  impacto: { type: DataTypes.INTEGER, allowNull: false },
  nivel_riesgo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // Read-only since it is a PostgreSQL generated column
    set() {
      throw new Error('nivel_riesgo es un campo generado y no se puede modificar directamente.');
    }
  },
  clasificacion_nivel: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'moderado' },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'identificado' },
  fecha_identificacion: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
  descripcion_control_actual: { type: DataTypes.TEXT },
  ...auditFields
}, { tableName: 'riesgos' });

// 25. PlanMitigacionRiesgo
db.PlanMitigacionRiesgo = sequelize.define('PlanMitigacionRiesgo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  riesgo_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'riesgos', key: 'id' } },
  estrategia: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'mitigar' },
  accion: { type: DataTypes.TEXT, allowNull: false },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  fecha_inicio: { type: DataTypes.DATEONLY },
  fecha_limite: { type: DataTypes.DATEONLY },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pendiente' },
  probabilidad_residual: { type: DataTypes.INTEGER },
  impacto_residual: { type: DataTypes.INTEGER },
  ...auditFields
}, { tableName: 'planes_mitigacion_riesgo' });

// 26. MonitoreoRiesgo
db.MonitoreoRiesgo = sequelize.define('MonitoreoRiesgo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  riesgo_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'riesgos', key: 'id' } },
  fecha_monitoreo: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
  probabilidad: { type: DataTypes.INTEGER, allowNull: false },
  impacto: { type: DataTypes.INTEGER, allowNull: false },
  observaciones: { type: DataTypes.TEXT },
  revisor_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  ...auditFields
}, { tableName: 'monitoreo_riesgos' });

// 27. Indicador
db.Indicador = sequelize.define('Indicador', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  modulo: { type: DataTypes.STRING(30), allowNull: false },
  tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'porcentaje' },
  formula: { type: DataTypes.TEXT },
  unidad_medida: { type: DataTypes.STRING(30) },
  meta: { type: DataTypes.DECIMAL(12, 4) },
  umbral_alerta: { type: DataTypes.DECIMAL(12, 4) },
  umbral_critico: { type: DataTypes.DECIMAL(12, 4) },
  frecuencia_medicion: { type: DataTypes.STRING(20), defaultValue: 'mensual' },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ...auditFields
}, { tableName: 'indicadores' });

// 28. MedicionIndicador
db.MedicionIndicador = sequelize.define('MedicionIndicador', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  indicador_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'indicadores', key: 'id' } },
  periodo: { type: DataTypes.STRING(20), allowNull: false },
  valor: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  meta_periodo: { type: DataTypes.DECIMAL(12, 4) },
  estado_semaforo: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'verde' },
  fuente_datos: { type: DataTypes.TEXT },
  observaciones: { type: DataTypes.TEXT },
  fecha_medicion: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: Sequelize.NOW },
  aprobado_por: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
  parametros: { type: DataTypes.JSONB },
  ...auditFields
}, { tableName: 'mediciones_indicador' });

// 29. ParametroIndicador
db.ParametroIndicador = sequelize.define('ParametroIndicador', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  indicador_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'indicadores', key: 'id' } },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  etiqueta: { type: DataTypes.STRING(255), allowNull: false },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  tipo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'numero' },
  obligatorio: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'parametros_indicador' });

// 30. AlertaIndicador
db.AlertaIndicador = sequelize.define('AlertaIndicador', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  indicador_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'indicadores', key: 'id' } },
  medicion_id: { type: DataTypes.INTEGER, references: { model: 'mediciones_indicador', key: 'id' } },
  tipo_alerta: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'bajo_umbral' },
  mensaje: { type: DataTypes.TEXT, allowNull: false },
  enviada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  fecha_alerta: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  ...auditFields
}, { tableName: 'alertas_indicador' });

// 31. Encuesta
db.Encuesta = sequelize.define('Encuesta', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  uuid: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  titulo: { type: DataTypes.STRING(255), allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  tipo_publico: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'estudiante' },
  estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'borrador' },
  fecha_inicio: { type: DataTypes.DATEONLY },
  fecha_cierre: { type: DataTypes.DATEONLY },
  anonima: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  responsable_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' } },
  total_respuestas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  ...auditFields
}, { tableName: 'encuestas' });

// 32. PreguntaEncuesta
db.PreguntaEncuesta = sequelize.define('PreguntaEncuesta', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  encuesta_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'encuestas', key: 'id' } },
  orden: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  texto: { type: DataTypes.TEXT, allowNull: false },
  tipo_pregunta: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'likert' },
  obligatoria: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  opciones: { type: DataTypes.JSONB },
  escala_min: { type: DataTypes.INTEGER, defaultValue: 1 },
  escala_max: { type: DataTypes.INTEGER, defaultValue: 5 },
  ...auditFields
}, { tableName: 'preguntas_encuesta' });

// 33. RespuestaEncuesta
db.RespuestaEncuesta = sequelize.define('RespuestaEncuesta', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  encuesta_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'encuestas', key: 'id' } },
  token_respuesta: { type: DataTypes.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
  respondente_id: { type: DataTypes.INTEGER, references: { model: 'usuarios', key: 'id' } },
  tipo_respondente: { type: DataTypes.STRING(20), defaultValue: 'estudiante' },
  ip_origen: { type: DataTypes.STRING(45) }, // string representation of INET
  fecha_respuesta: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
  completada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ...auditFields
}, { tableName: 'respuestas_encuesta' });

// 34. DetalleRespuesta
db.DetalleRespuesta = sequelize.define('DetalleRespuesta', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  respuesta_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'respuestas_encuesta', key: 'id' } },
  pregunta_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'preguntas_encuesta', key: 'id' } },
  valor_numerico: { type: DataTypes.DECIMAL(5, 2) },
  valor_texto: { type: DataTypes.TEXT },
  valor_opcion: { type: DataTypes.STRING(200) },
  ...auditFields
}, { tableName: 'detalle_respuestas' });


// ============================================================
// ASOCIACIONES / RELACIONES
// ============================================================

// Roles & Permisos
db.Rol.belongsToMany(db.Permiso, { through: db.RolPermiso, foreignKey: 'rol_id', otherKey: 'permiso_id' });
db.Permiso.belongsToMany(db.Rol, { through: db.RolPermiso, foreignKey: 'permiso_id', otherKey: 'rol_id' });

// Usuarios
db.Usuario.belongsTo(db.Rol, { foreignKey: 'rol_id', as: 'rol' });
db.Rol.hasMany(db.Usuario, { foreignKey: 'rol_id' });

// Documentos
db.Documento.belongsTo(db.CategoriaDocumento, { foreignKey: 'categoria_id', as: 'categoria' });
db.CategoriaDocumento.hasMany(db.Documento, { foreignKey: 'categoria_id' });

db.Documento.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });
db.Documento.belongsTo(db.Usuario, { foreignKey: 'revisor_id', as: 'revisor' });
db.Documento.belongsTo(db.Usuario, { foreignKey: 'aprobador_id', as: 'aprobador' });
db.Documento.belongsTo(db.Proceso, { foreignKey: 'proceso_id', as: 'proceso' });

db.VersionDocumento.belongsTo(db.Documento, { foreignKey: 'documento_id', as: 'documento' });
db.Documento.hasMany(db.VersionDocumento, { foreignKey: 'documento_id', as: 'versiones' });

db.FlujoAprobacionDocumento.belongsTo(db.Documento, { foreignKey: 'documento_id', as: 'documento' });
db.FlujoAprobacionDocumento.belongsTo(db.VersionDocumento, { foreignKey: 'version_id', as: 'version' });
db.FlujoAprobacionDocumento.belongsTo(db.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Procesos
db.Proceso.belongsTo(db.TipoProceso, { foreignKey: 'tipo_id', as: 'tipo' });
db.TipoProceso.hasMany(db.Proceso, { foreignKey: 'tipo_id' });

db.Proceso.belongsTo(db.Proceso, { foreignKey: 'proceso_padre_id', as: 'procesoPadre' });
db.Proceso.hasMany(db.Proceso, { foreignKey: 'proceso_padre_id', as: 'subprocesos' });

db.Proceso.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });
db.ActividadProceso.belongsTo(db.Proceso, { foreignKey: 'proceso_id', as: 'proceso' });
db.Proceso.hasMany(db.ActividadProceso, { foreignKey: 'proceso_id', as: 'actividades' });
db.ActividadProceso.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

// Acreditación
db.EstandarAcreditacion.belongsTo(db.ModeloAcreditacion, { foreignKey: 'modelo_id', as: 'modelo' });
db.ModeloAcreditacion.hasMany(db.EstandarAcreditacion, { foreignKey: 'modelo_id' });

db.EstandarAcreditacion.belongsTo(db.EstandarAcreditacion, { foreignKey: 'padre_id', as: 'padre' });
db.EstandarAcreditacion.hasMany(db.EstandarAcreditacion, { foreignKey: 'padre_id', as: 'hijos' });

db.Autoevaluacion.belongsTo(db.ModeloAcreditacion, { foreignKey: 'modelo_id', as: 'modelo' });
db.Autoevaluacion.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

db.EvidenciaAcreditacion.belongsTo(db.Autoevaluacion, { foreignKey: 'autoevaluacion_id', as: 'autoevaluacion' });
db.EvidenciaAcreditacion.belongsTo(db.EstandarAcreditacion, { foreignKey: 'estandar_id', as: 'estandar' });
db.EvidenciaAcreditacion.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

// Auditorías
db.ProgramaAuditoria.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

db.Auditoria.belongsTo(db.ProgramaAuditoria, { foreignKey: 'programa_id', as: 'programa' });
db.Auditoria.belongsTo(db.Proceso, { foreignKey: 'proceso_id', as: 'proceso' });
db.Auditoria.belongsTo(db.Usuario, { foreignKey: 'auditor_lider_id', as: 'auditorLider' });

db.AuditorAuditoria.belongsTo(db.Auditoria, { foreignKey: 'auditoria_id', as: 'auditoria' });
db.AuditorAuditoria.belongsTo(db.Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

db.HallazgoAuditoria.belongsTo(db.Auditoria, { foreignKey: 'auditoria_id', as: 'auditoria' });
db.HallazgoAuditoria.belongsTo(db.Proceso, { foreignKey: 'proceso_id', as: 'proceso' });
db.HallazgoAuditoria.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

// CAPA
db.NoConformidad.belongsTo(db.Proceso, { foreignKey: 'proceso_id', as: 'proceso' });
db.NoConformidad.belongsTo(db.HallazgoAuditoria, { foreignKey: 'hallazgo_id', as: 'hallazgo' });
db.NoConformidad.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

db.AnalisisCausaRaiz.belongsTo(db.NoConformidad, { foreignKey: 'no_conformidad_id', as: 'noConformidad' });
db.NoConformidad.hasOne(db.AnalisisCausaRaiz, { foreignKey: 'no_conformidad_id', as: 'analisisCausa' });

db.PlanAccionCapa.belongsTo(db.NoConformidad, { foreignKey: 'no_conformidad_id', as: 'noConformidad' });
db.NoConformidad.hasMany(db.PlanAccionCapa, { foreignKey: 'no_conformidad_id', as: 'planesAccion' });
db.PlanAccionCapa.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

// Riesgos
db.Riesgo.belongsTo(db.CategoriaRiesgo, { foreignKey: 'categoria_id', as: 'categoria' });
db.Riesgo.belongsTo(db.Proceso, { foreignKey: 'proceso_id', as: 'proceso' });
db.Riesgo.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

db.PlanMitigacionRiesgo.belongsTo(db.Riesgo, { foreignKey: 'riesgo_id', as: 'riesgo' });
db.Riesgo.hasMany(db.PlanMitigacionRiesgo, { foreignKey: 'riesgo_id', as: 'planesMitigacion' });
db.PlanMitigacionRiesgo.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });

db.MonitoreoRiesgo.belongsTo(db.Riesgo, { foreignKey: 'riesgo_id', as: 'riesgo' });
db.Riesgo.hasMany(db.MonitoreoRiesgo, { foreignKey: 'riesgo_id', as: 'monitoreos' });
db.MonitoreoRiesgo.belongsTo(db.Usuario, { foreignKey: 'revisor_id', as: 'revisor' });

// Indicadores
db.Indicador.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });
db.MedicionIndicador.belongsTo(db.Indicador, { foreignKey: 'indicador_id', as: 'indicador' });
db.Indicador.hasMany(db.MedicionIndicador, { foreignKey: 'indicador_id', as: 'mediciones' });
db.MedicionIndicador.belongsTo(db.Usuario, { foreignKey: 'aprobado_por', as: 'aprobador' });

db.ParametroIndicador.belongsTo(db.Indicador, { foreignKey: 'indicador_id', as: 'indicador' });
db.Indicador.hasMany(db.ParametroIndicador, { foreignKey: 'indicador_id', as: 'parametros' });

db.AlertaIndicador.belongsTo(db.Indicador, { foreignKey: 'indicador_id', as: 'indicador' });
db.AlertaIndicador.belongsTo(db.MedicionIndicador, { foreignKey: 'medicion_id', as: 'medicion' });

// Satisfacción
db.Encuesta.belongsTo(db.Usuario, { foreignKey: 'responsable_id', as: 'responsable' });
db.PreguntaEncuesta.belongsTo(db.Encuesta, { foreignKey: 'encuesta_id', as: 'encuesta' });
db.Encuesta.hasMany(db.PreguntaEncuesta, { foreignKey: 'encuesta_id', as: 'preguntas' });

db.RespuestaEncuesta.belongsTo(db.Encuesta, { foreignKey: 'encuesta_id', as: 'encuesta' });
db.RespuestaEncuesta.belongsTo(db.Usuario, { foreignKey: 'respondente_id', as: 'respondente' });
db.Encuesta.hasMany(db.RespuestaEncuesta, { foreignKey: 'encuesta_id', as: 'respuestas' });

db.DetalleRespuesta.belongsTo(db.RespuestaEncuesta, { foreignKey: 'respuesta_id', as: 'respuesta' });
db.RespuestaEncuesta.hasMany(db.DetalleRespuesta, { foreignKey: 'respuesta_id', as: 'detalles' });
db.DetalleRespuesta.belongsTo(db.PreguntaEncuesta, { foreignKey: 'pregunta_id', as: 'pregunta' });


db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
