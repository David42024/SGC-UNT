'use client';
import { X, AlertTriangle, Info, Plus, FileText, Shield, BarChart2, ClipboardCheck, AlertCircle, ArrowRight, Calendar, Filter, Download, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';

// ── Badge de estado ────────────────────────────────────────────
const COLORES_ESTADO = {
  borrador: 'bg-gray-100 text-gray-600',
  revision: 'bg-yellow-100 text-yellow-700',
  aprobado: 'bg-blue-100 text-blue-700',
  vigente:  'bg-green-100 text-green-700',
  obsoleto: 'bg-red-100 text-red-600',
  planificado: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-yellow-100 text-yellow-700',
  finalizado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
  abierto:   'bg-orange-100 text-orange-700',
  en_proceso:'bg-blue-100 text-blue-700',
  verificado:'bg-purple-100 text-purple-700',
  cerrado:   'bg-gray-100 text-gray-600',
  publicada: 'bg-green-100 text-green-700',
  bajo: 'bg-green-100 text-green-700',
  moderado: 'bg-yellow-100 text-yellow-700',
  alto: 'bg-orange-100 text-orange-700',
  critico: 'bg-red-100 text-red-700',
  verde: 'bg-green-100 text-green-700',
  amarillo: 'bg-yellow-100 text-yellow-700',
  rojo: 'bg-red-100 text-red-700',
  activo: 'bg-green-100 text-green-700',
  inactivo: 'bg-gray-100 text-gray-600',
  pendiente: 'bg-yellow-100 text-yellow-700',
  suspendido: 'bg-red-100 text-red-700',
  en_progreso: 'bg-blue-100 text-blue-700',
};

export function Badge({ estado, className }) {
  const label = String(estado || '').replace(/_/g, ' ');
  const color = COLORES_ESTADO[estado] || 'bg-gray-100 text-gray-600';
  return (
    <span className={clsx('badge-estado capitalize', color, className)}>{label}</span>
  );
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-3', lg: 'w-12 h-12 border-4' };
  return <div className={clsx(sizes[size], 'border-unt-azul border-t-transparent rounded-full animate-spin')} />;
}

export function CargandoPagina() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="text-gray-500 text-sm mt-3">Cargando...</p>
      </div>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────
export function Modal({ abierto, onCerrar, titulo, children, size = 'md', zIndex = 'z-50', cerrarAlClickFuera = true }) {
  if (!abierto) return null;
  const sizes = {
    sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl'
  };
  return (
    <div className={clsx('fixed inset-0 flex items-center justify-center p-4', zIndex)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrarAlClickFuera ? onCerrar : undefined} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full', sizes[size], 'max-h-[90vh] flex flex-col')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">{titulo}</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Confirmar eliminación ──────────────────────────────────────
export function ModalConfirmar({ abierto, onCerrar, onConfirmar, titulo, mensaje, cargando }) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Confirmar acción" size="sm">
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="font-semibold text-gray-800 mb-2">{titulo}</h3>
        <p className="text-gray-500 text-sm mb-6">{mensaje}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCerrar} className="btn-secundario">Cancelar</button>
          <button onClick={onConfirmar} disabled={cargando} className="btn-peligro">
            {cargando ? <Spinner size="sm" /> : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Tabla vacía ────────────────────────────────────────────────
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion }) {
  return (
    <div className="text-center py-16">
      {Icono && (
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icono className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-gray-600 font-medium mb-1">{titulo}</h3>
      <p className="text-gray-400 text-sm mb-4">{descripcion}</p>
      {accion}
    </div>
  );
}

// ── Empty State mejorado con CTA ─────────────────────────────
export function EmptyState({ 
  tipo = 'general', 
  valor = 0,
  modulo = '',
  onCrear,
  linkCrear 
}) {
  const configuraciones = {
    documentos: {
      icono: FileText,
      titulo: `Aún no tienes ${modulo} registrados`,
      descripcion: 'Los documentos son la base de tu sistema de gestión de calidad. Comienza creando tu primer documento.',
      ctaTexto: 'Crear primer documento',
      ayuda: 'Más información sobre documentos'
    },
    procesos: {
      icono: BarChart2,
      titulo: `Aún no tienes ${modulo} activos`,
      descripcion: 'Los procesos definen cómo se ejecutan las actividades en tu institución. Mapea tu primer proceso.',
      ctaTexto: 'Crear primer proceso',
      ayuda: 'Más información sobre procesos'
    },
    riesgos: {
      icono: Shield,
      titulo: `Aún no tienes ${modulo} registrados`,
      descripcion: 'La gestión de riesgos es fundamental para la continuidad operativa. Identifica tu primer riesgo.',
      ctaTexto: 'Registrar primer riesgo',
      ayuda: 'Más información sobre riesgos'
    },
    auditorias: {
      icono: ClipboardCheck,
      titulo: `Aún no tienes ${modulo} programadas`,
      descripcion: 'Las auditorías aseguran el cumplimiento de los estándares de calidad. Programa tu primera auditoría.',
      ctaTexto: 'Programar primera auditoría',
      ayuda: 'Más información sobre auditorías'
    },
    acciones: {
      icono: AlertCircle,
      titulo: `Aún no tienes ${modulo} registradas`,
      descripcion: 'Las acciones correctivas y preventivas mejoran continuamente el sistema. Registra tu primera acción.',
      ctaTexto: 'Registrar primera acción',
      ayuda: 'Más información sobre CAPA'
    },
    indicadores: {
      icono: BarChart2,
      titulo: `Aún no tienes ${modulo} configurados`,
      descripcion: 'Los indicadores miden el desempeño de los procesos. Configura tu primer indicador.',
      ctaTexto: 'Configurar primer indicador',
      ayuda: 'Más información sobre indicadores'
    },
    general: {
      icono: FileText,
      titulo: `Aún no tienes ${modulo} registrados`,
      descripcion: 'Comienza registrando tu primer elemento para empezar a construir tu sistema de gestión.',
      ctaTexto: 'Crear primer registro',
      ayuda: 'Más información'
    }
  };

  const config = configuraciones[tipo] || configuraciones.general;
  const Icono = config.icono;

  if (valor > 0) return null;

  return (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
        <Icono className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{config.titulo}</h3>
      <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">{config.descripcion}</p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onCrear && (
          <button 
            onClick={onCrear}
            className="btn-primario"
          >
            <Plus size={16} />
            {config.ctaTexto}
          </button>
        )}
        {linkCrear && (
          <Link 
            href={linkCrear}
            className="btn-primario"
          >
            <Plus size={16} />
            {config.ctaTexto}
          </Link>
        )}
        <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          {config.ayuda}
          <ArrowRight size={14} className="inline ml-1" />
        </button>
      </div>
    </div>
  );
}

// ── Alertas Críticas ───────────────────────────────────────────
export function AlertasCriticas({ alertas }) {
  if (!alertas || alertas.length === 0) return null;

  const configuraciones = {
    capa_vencida: {
      icono: AlertCircle,
      color: 'border-l-red-500 bg-red-50',
      iconoColor: 'text-red-500',
      prioridad: 'alta'
    },
    riesgo_alto: {
      icono: Shield,
      color: 'border-l-orange-500 bg-orange-50',
      iconoColor: 'text-orange-500',
      prioridad: 'alta'
    },
    auditoria_pendiente: {
      icono: ClipboardCheck,
      color: 'border-l-yellow-500 bg-yellow-50',
      iconoColor: 'text-yellow-600',
      prioridad: 'media'
    },
    indicador_critico: {
      icono: BarChart2,
      color: 'border-l-red-500 bg-red-50',
      iconoColor: 'text-red-500',
      prioridad: 'alta'
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <AlertCircle size={16} className="text-red-500" />
        Alertas Críticas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alertas.map((alerta, index) => {
          const config = configuraciones[alerta.tipo] || configuraciones.capa_vencida;
          const Icono = config.icono;
          
          return (
            <Link 
              key={index}
              href={alerta.accion}
              className={`border-l-4 rounded-lg p-4 hover:shadow-md transition-all duration-200 ${config.color}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.iconoColor} bg-white`}>
                  <Icono size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 mb-1">{alerta.cantidad}</p>
                  <p className="text-xs text-gray-600 line-clamp-2">{alerta.mensaje}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Campo de formulario ────────────────────────────────────────
export function Campo({ label, error, required, children, className }) {
  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <label className="etiqueta">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-red-500 text-xs flex items-center gap-1"><Info size={12} />{error}</p>}
    </div>
  );
}

// ── Header de página ───────────────────────────────────────────
export function PageHeader({ titulo, descripcion, icono: Icono, acciones }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-4">
        {Icono && (
          <div className="w-11 h-11 bg-unt-azul/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Icono className="w-6 h-6 text-unt-azul" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
          {descripcion && <p className="text-gray-500 text-sm mt-0.5">{descripcion}</p>}
        </div>
      </div>
      {acciones && <div className="flex items-center gap-2 flex-shrink-0">{acciones}</div>}
    </div>
  );
}

// ── Tarjeta de estadística mejorada ───────────────────────────
export function StatCard({ label, valor, icono: Icono, color = 'blue', tendencia, semaforo, tooltip }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-unt-azul',  val: 'text-unt-azul' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-700', val: 'text-green-700' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-700', val: 'text-yellow-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-700',     val: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700', val: 'text-purple-700' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-700', val: 'text-indigo-700' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-700', val: 'text-orange-700' },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-700',   val: 'text-teal-700' },
    pink:   { bg: 'bg-pink-50',   icon: 'bg-pink-100 text-pink-700',   val: 'text-pink-700' },
  };
  const c = colors[color] || colors.blue;
  
  const semaforoConfig = {
    verde:    { color: 'bg-green-500',  label: 'En meta' },
    amarillo: { color: 'bg-yellow-400', label: 'En alerta' },
    rojo:     { color: 'bg-red-500',    label: 'Crítico' },
  };
  const s = semaforoConfig[semaforo];

  return (
    <div className={clsx('rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200', c.bg)} title={tooltip}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-600 text-sm font-medium">{label}</p>
        <div className="flex items-center gap-2">
          {semaforo && s && (
            <div className={clsx('w-2.5 h-2.5 rounded-full', s.color)} title={s.label} />
          )}
          {Icono && (
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', c.icon)}>
              <Icono size={18} />
            </div>
          )}
        </div>
      </div>
      <p className={clsx('text-3xl font-bold', c.val)}>{valor}</p>
      {tendencia && (
        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
          {tendencia.includes('+') && <span className="text-green-600">↑</span>}
          {tendencia.includes('-') && <span className="text-red-600">↓</span>}
          {tendencia}
        </p>
      )}
    </div>
  );
}

// ── Semáforo ───────────────────────────────────────────────────
export function Semaforo({ estado, showLabel = true }) {
  const config = {
    verde:    { color: 'bg-green-500',  label: 'En meta' },
    amarillo: { color: 'bg-yellow-400', label: 'En alerta' },
    rojo:     { color: 'bg-red-500',    label: 'Crítico' },
  };
  const c = config[estado] || config.verde;
  return (
    <div className="flex items-center gap-2">
      <div className={clsx('w-3 h-3 rounded-full', c.color)} />
      {showLabel && <span className="text-xs text-gray-600">{c.label}</span>}
    </div>
  );
}

// ── Widget de Acreditación ─────────────────────────────────────
export function WidgetAcreditacion({ progreso, estandares_cumplidos, estandares_totales, proxima_evaluacion, alerta }) {
  const porcentaje = estandares_totales > 0 ? Math.round((estandares_cumplidos / estandares_totales) * 100) : (progreso || 0);
  const colorProgreso = porcentaje >= 80 ? 'bg-green-500' : porcentaje >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="tarjeta">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Cumplimiento SINEACE</h3>
        <Badge estado={porcentaje >= 80 ? 'verde' : porcentaje >= 60 ? 'amarillo' : 'rojo'} />
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progreso general</span>
          <span className="text-sm font-semibold text-gray-800">{porcentaje}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`${colorProgreso} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{estandares_cumplidos}</p>
          <p className="text-xs text-gray-500">Cumplidos</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{estandares_totales - estandares_cumplidos}</p>
          <p className="text-xs text-gray-500">Pendientes</p>
        </div>
      </div>
      
      {alerta && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r-lg mb-3">
          <p className="text-xs text-yellow-800">{alerta}</p>
        </div>
      )}
      
      {proxima_evaluacion && (
        <div className="text-xs text-gray-500">
          Próxima evaluación: <span className="font-medium text-gray-700">{proxima_evaluacion}</span>
        </div>
      )}
    </div>
  );
}

// ── Widget de Próximas Auditorías ───────────────────────────────
export function WidgetAuditorias({ auditorias }) {
  if (!auditorias || auditorias.length === 0) return null;
  
  return (
    <div className="tarjeta">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Próximas Auditorías</h3>
        <Link href="/auditorias" className="text-xs text-blue-600 hover:text-blue-700">Ver todas →</Link>
      </div>
      
      <div className="space-y-3">
        {auditorias.slice(0, 3).map((auditoria, index) => {
          const diasRestantes = Math.ceil((new Date(auditoria.fecha) - new Date()) / (1000 * 60 * 60 * 24));
          const urgenciaColor = diasRestantes <= 7 ? 'text-red-600' : diasRestantes <= 30 ? 'text-yellow-600' : 'text-green-600';
          
          return (
            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClipboardCheck size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{auditoria.nombre}</p>
                <p className="text-xs text-gray-500">{auditoria.responsable}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${urgenciaColor}`}>{diasRestantes}d</p>
                <p className="text-xs text-gray-400">{auditoria.fecha}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Widget de CAPAs ────────────────────────────────────────────
export function WidgetCAPAs({ capas }) {
  if (!capas) return null;
  
  const { total, vencidas, en_plazo, proximas_vencer, tasa_cumplimiento } = capas;
  const porcentaje = Math.round(tasa_cumplimiento);
  
  return (
    <div className="tarjeta">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Acciones CAPA</h3>
        <Link href="/acciones" className="text-xs text-blue-600 hover:text-blue-700">Ver todas →</Link>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{en_plazo}</p>
          <p className="text-xs text-green-600">En plazo</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{vencidas}</p>
          <p className="text-xs text-red-600">Vencidas</p>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Tasa de cumplimiento</span>
          <span className="text-sm font-semibold text-gray-800">{porcentaje}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${porcentaje >= 80 ? 'bg-green-500' : porcentaje >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>
      
      {proximas_vencer > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded-r-lg">
          <p className="text-xs text-yellow-800">
            <span className="font-semibold">{proximas_vencer}</span> CAPAs vencerán en los próximos 7 días
          </p>
        </div>
      )}
    </div>
  );
}

// ── Filtros para Reporte General ───────────────────────────────
export function FiltrosReporteGeneral({ onGenerar, cargando }) {
  const [abierto, setAbierto] = useState(false);
  const [filtros, setFiltros] = useState({
    periodo: 'este_mes',
    desde: '',
    hasta: '',
    ambito: 'toda_universidad',
    modulo: 'todos',
    formato: 'pdf'
  });

  const handleGenerar = () => {
    onGenerar(filtros);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setAbierto(!abierto)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter size={16} />
        Filtros
      </button>
      
      {abierto && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-5 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Filtros del Reporte</h3>
            <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Periodo */}
            <div>
              <label className="etiqueta">Periodo</label>
              <select 
                className="campo"
                value={filtros.periodo}
                onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
              >
                <option value="este_mes">Este mes</option>
                <option value="este_trimestre">Este trimestre</option>
                <option value="este_semestre">Este semestre</option>
                <option value="este_ano">Este año</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            
            {filtros.periodo === 'personalizado' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="etiqueta">Desde</label>
                  <input 
                    type="date" 
                    className="campo"
                    value={filtros.desde}
                    onChange={(e) => setFiltros({...filtros, desde: e.target.value})}
                  />
                </div>
                <div>
                  <label className="etiqueta">Hasta</label>
                  <input 
                    type="date" 
                    className="campo"
                    value={filtros.hasta}
                    onChange={(e) => setFiltros({...filtros, hasta: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            {/* Ámbito */}
            <div>
              <label className="etiqueta">Ámbito</label>
              <select 
                className="campo"
                value={filtros.ambito}
                onChange={(e) => setFiltros({...filtros, ambito: e.target.value})}
              >
                <option value="toda_universidad">Toda la universidad</option>
                <option value="por_facultad">Por facultad</option>
                <option value="por_escuela">Por escuela</option>
              </select>
            </div>
            
            {/* Módulo */}
            <div>
              <label className="etiqueta">Módulos</label>
              <select 
                className="campo"
                value={filtros.modulo}
                onChange={(e) => setFiltros({...filtros, modulo: e.target.value})}
              >
                <option value="todos">Todos los módulos</option>
                <option value="documentos">Documentos</option>
                <option value="procesos">Procesos</option>
                <option value="riesgos">Riesgos</option>
                <option value="acciones">CAPA</option>
                <option value="auditorias">Auditorías</option>
                <option value="indicadores">Indicadores</option>
              </select>
            </div>
            
            {/* Formato */}
            <div>
              <label className="etiqueta">Formato</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="formato" 
                    value="pdf"
                    checked={filtros.formato === 'pdf'}
                    onChange={(e) => setFiltros({...filtros, formato: e.target.value})}
                  />
                  <span className="text-sm">PDF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="formato" 
                    value="excel"
                    checked={filtros.formato === 'excel'}
                    onChange={(e) => setFiltros({...filtros, formato: e.target.value})}
                  />
                  <span className="text-sm">Excel</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
            <button 
              onClick={() => setAbierto(false)}
              className="btn-secundario flex-1"
            >
              Cancelar
            </button>
            <button 
              onClick={handleGenerar}
              disabled={cargando}
              className="btn-primario flex-1"
            >
              {cargando ? <Spinner size="sm" /> : <Download size={16} />}
              Generar Reporte
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tooltip Explicativo ───────────────────────────────────────
export function Tooltip({ children, contenido, posicion = 'top' }) {
  const [visible, setVisible] = useState(false);

  const posicionClases = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={clsx(
          'absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg',
          posicionClases[posicion]
        )}>
          <div className="relative">
            {contenido}
            {posicion === 'top' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            )}
            {posicion === 'bottom' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icono de Ayuda con Tooltip ─────────────────────────────────
export function AyudaTooltip({ contenido }) {
  return (
    <Tooltip contenido={contenido}>
      <button className="text-gray-400 hover:text-gray-600 transition-colors">
        <HelpCircle size={16} />
      </button>
    </Tooltip>
  );
}

// ── Skeleton Loaders ───────────────────────────────────────────
export function SkeletonCard({ height = '100px' }) {
  return (
    <div className="bg-gray-100 rounded-xl animate-pulse" style={{ height }} />
  );
}

export function SkeletonChart({ height = '220px' }) {
  return (
    <div className="bg-gray-100 rounded-xl animate-pulse" style={{ height }} />
  );
}

export function SkeletonTable({ rows = 5, columns = 6 }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded flex-1 animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-12 bg-gray-100 rounded flex-1 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
  );
}
