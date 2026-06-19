'use client';
import { X, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

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
export function Modal({ abierto, onCerrar, titulo, children, size = 'md', zIndex = 'z-50' }) {
  if (!abierto) return null;
  const sizes = {
    sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl'
  };
  return (
    <div className={clsx('fixed inset-0 flex items-center justify-center p-4', zIndex)}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCerrar} />
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

// ── Tarjeta de estadística ─────────────────────────────────────
export function StatCard({ label, valor, icono: Icono, color = 'blue', tendencia }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-unt-azul',  val: 'text-unt-azul' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-700', val: 'text-green-700' },
    yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-700', val: 'text-yellow-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-700',     val: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700', val: 'text-purple-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={clsx('rounded-xl p-5 border border-gray-100 shadow-sm', c.bg)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-gray-600 text-sm font-medium">{label}</p>
        {Icono && (
          <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', c.icon)}>
            <Icono size={18} />
          </div>
        )}
      </div>
      <p className={clsx('text-3xl font-bold', c.val)}>{valor}</p>
      {tendencia && <p className="text-gray-500 text-xs mt-1">{tendencia}</p>}
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
