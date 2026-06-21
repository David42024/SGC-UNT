'use client';


import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import {
  FileText, GitBranch, Award, ClipboardCheck,
  AlertTriangle, Shield, BarChart2, Star,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Download, RefreshCw
} from 'lucide-react';
import { StatCard, CargandoPagina, Badge, Semaforo, EmptyState, AlertasCriticas, WidgetAcreditacion, WidgetAuditorias, WidgetCAPAs } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import Link from 'next/link';
import toast from 'react-hot-toast';

const COLORES_PIE = ['#063B96', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const COLORES_SEMAFORO = {
  verde: '#10b981',
  amarillo: '#f59e0b',
  rojo: '#ef4444'
};

export default function DashboardPage() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const [docs, proc, audits, acciones, riesgos, indicadores, encuestas, usuarios] = await Promise.allSettled([
        api.get('/documentos/estadisticas'),
        api.get('/procesos/estadisticas'),
        api.get('/auditorias/estadisticas'),
        api.get('/acciones/estadisticas'),
        api.get('/riesgos/estadisticas'),
        api.get('/indicadores/dashboard'),
        api.get('/satisfaccion/estadisticas'),
        api.get('/usuarios'),
      ]);
      setStats({
        docs:        docs.value?.data?.datos,
        proc:        proc.value?.data?.datos,
        audits:      audits.value?.data?.datos,
        acciones:    acciones.value?.data?.datos,
        riesgos:     riesgos.value?.data?.datos,
        indicadores: indicadores.value?.data?.datos,
        encuestas:   encuestas.value?.data?.datos,
        usuarios:    usuarios.value?.data?.datos,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  const descargarReporteGeneral = async () => {
    try {
      toast.loading('Generando reporte...', { id: 'reporte' });
      const res = await api.get('/indicadores/reporte-dashboard', { 
        responseType: 'blob',
        params: {
          modulo: 'todos',
          activo: 'true'
        }
      });
      
      if (!res.data) {
        throw new Error('No se recibieron datos del reporte');
      }
      
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-dashboard-general-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Reporte generado exitosamente', { id: 'reporte' });
    } catch (error) {
      console.error('Error al generar reporte:', error);
      toast.error('Error al generar reporte. Por favor, intente nuevamente.', { id: 'reporte' });
    }
  };

  if (cargando) return <CargandoPagina />;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  const docsEstado = stats?.docs?.por_estado || [];
  const riesgosNivel = stats?.riesgos?.por_nivel || [];

  // Alertas críticas simuladas (en producción vendrían del backend)
  const alertasCriticas = [
    ...(stats?.acciones?.total > 0 ? [{
      tipo: 'capa_vencida',
      cantidad: stats.acciones.total,
      mensaje: `${stats.acciones.total} CAPAs registradas requieren atención`,
      accion: '/acciones'
    }] : []),
    ...(stats?.riesgos?.total > 5 ? [{
      tipo: 'riesgo_alto',
      cantidad: stats.riesgos.total,
      mensaje: `${stats.riesgos.total} riesgos identificados en el sistema`,
      accion: '/riesgos'
    }] : []),
    ...(stats?.audits?.total > 0 ? [{
      tipo: 'auditoria_pendiente',
      cantidad: stats.audits.total,
      mensaje: `${stats.audits.total} auditorías en el sistema`,
      accion: '/auditorias'
    }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-unt-azul to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm mb-1">{saludo},</p>
            <h1 className="text-2xl font-bold">{usuario?.nombres} {usuario?.apellidos}</h1>
            <p className="text-blue-200 text-sm mt-1">
              {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={descargarReporteGeneral} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Download size={16} /> Reporte general
          </button>
        </div>
      </div>

      {/* Alertas Críticas */}
      <AlertasCriticas alertas={alertasCriticas} />

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Documentos" valor={stats?.docs?.total ?? '—'} icono={FileText} color="blue" tendencia="Total registrados" />
        <StatCard label="Procesos activos" valor={stats?.proc?.total ?? '—'} icono={GitBranch} color="green" tendencia="En el mapa de procesos" />
        <StatCard label="Auditorías" valor={stats?.audits?.total ?? '—'} icono={ClipboardCheck} color="purple" tendencia="Total en el sistema" />
        <StatCard label="No conformidades" valor={stats?.acciones?.total ?? '—'} icono={AlertTriangle} color="yellow" tendencia="Registradas" />
      </div>

      {/* KPIs secundarios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Riesgos" valor={stats?.riesgos?.total ?? '—'} icono={Shield} color="orange" tendencia="Registrados" />
        <StatCard label="Indicadores" valor={stats?.indicadores?.resumen?.total_activos ?? '—'} icono={BarChart2} color="indigo" tendencia="Activos" />
        <StatCard label="Encuestas" valor={stats?.encuestas?.total ?? '—'} icono={Star} color="pink" tendencia="Publicadas" />
        <StatCard label="Usuarios" valor={stats?.usuarios?.length ?? '—'} icono={CheckCircle2} color="teal" tendencia="Registrados" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por estado - Gráfico de dona con porcentajes */}
        <div className="tarjeta">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-unt-azul" /> Documentos por estado
            </h2>
            <Link href="/documentos" className="text-xs text-blue-600 hover:text-blue-700">Ver todos →</Link>
          </div>
          {docsEstado.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie 
                  data={docsEstado} 
                  dataKey="cantidad" 
                  nameKey="estado"
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  label={({ estado, cantidad, percent }) => `${estado}: ${cantidad} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  labelStyle={{ fontSize: 10 }}
                >
                  {docsEstado.map((entry, index) => {
                    // FIX: las claves ahora coinciden con los estados reales
                    // del flujo de documentos (borrador → revision → aprobado
                    // → vigente → obsoleto), definidos en documentos.controller.js.
                    // Antes decía "en_revision" y "vencido", que no existen en
                    // la BD, por lo que esos estados caían al color de fallback
                    // (azul) y daban la sensación de que "todo salía azul".
                    const colores = {
                      borrador: '#3b82f6',  // azul
                      revision: '#f59e0b',  // amarillo
                      aprobado: '#8b5cf6',  // morado
                      vigente: '#10b981',   // verde
                      obsoleto: '#6b7280'   // gris
                    };
                    return <Cell key={`cell-${index}`} fill={colores[entry.estado] || COLORES_PIE[index % COLORES_PIE.length]} />;
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} documentos`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState tipo="documentos" valor={stats?.docs?.total || 0} modulo="documentos" linkCrear="/documentos" />
          )}
        </div>

        {/* Riesgos por nivel - Matriz de calor */}
        <div className="tarjeta">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Shield size={18} className="text-unt-azul" /> Riesgos por nivel
            </h2>
            <Link href="/riesgos" className="text-xs text-blue-600 hover:text-blue-700">Ver todos →</Link>
          </div>
          {riesgosNivel.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie 
                  data={riesgosNivel} 
                  dataKey="cantidad" 
                  nameKey="clasificacion_nivel"
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  label={({ clasificacion_nivel, cantidad, percent }) => `${clasificacion_nivel}: ${cantidad} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  labelStyle={{ fontSize: 10 }}
                >
                  {riesgosNivel.map((entry, index) => {
                    const colores = {
                      muy_bajo: '#10b981',
                      bajo: '#34d399',
                      medio: '#f59e0b',
                      alto: '#f97316',
                      muy_alto: '#ef4444'
                    };
                    return <Cell key={`cell-${index}`} fill={colores[entry.clasificacion_nivel] || COLORES_PIE[index % COLORES_PIE.length]} />;
                  })}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} riesgos`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState tipo="riesgos" valor={stats?.riesgos?.total || 0} modulo="riesgos" linkCrear="/riesgos" />
          )}
        </div>
      </div>

      {/* Gráficos de indicadores */}
      {stats?.indicadores && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribución de indicadores por módulo */}
          {stats.indicadores.por_modulo?.length > 0 && (
            <div className="tarjeta">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart2 size={18} className="text-unt-azul" /> Indicadores por módulo
                </h2>
                <Link href="/indicadores" className="text-xs text-blue-600 hover:text-blue-700">Ver todos →</Link>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.indicadores.por_modulo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="modulo" tick={{fontSize: 11}} />
                  <YAxis tick={{fontSize: 11}} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Estado de indicadores por semáforo */}
          {stats.indicadores.por_semaforo?.length > 0 && (
            <div className="tarjeta">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-unt-azul" /> Estado de indicadores
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.indicadores.por_semaforo}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total"
                  >
                    {stats.indicadores.por_semaforo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES_SEMAFORO[entry.estado_semaforo] || COLORES_PIE[index % COLORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Widgets adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WidgetAcreditacion 
          progreso={78}
          estandares_cumplidos={45}
          estandares_totales={58}
          proxima_evaluacion="Diciembre 2024"
          alerta="3 estándares críticos pendientes"
        />
        <WidgetAuditorias 
          auditorias={[
            { nombre: 'Auditoría ISO 9001', responsable: 'Ing. Pérez', fecha: '2024-07-15' },
            { nombre: 'Auditoría SINEACE', responsable: 'Lic. García', fecha: '2024-08-20' }
          ]}
        />
        <WidgetCAPAs 
          capas={{
            total: 18,
            vencidas: 3,
            en_plazo: 12,
            proximas_vencer: 3,
            tasa_cumplimiento: 78
          }}
        />
      </div>

      {/* Listas de elementos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos documentos */}
        <div className="tarjeta">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText size={18} className="text-unt-azul" /> Últimos documentos
            </h2>
            <Link href="/documentos" className="text-xs text-blue-600 hover:text-blue-700">Ver todos →</Link>
          </div>
          <div className="space-y-3">
            {stats?.docs?.ultimos?.slice(0, 4).map((doc, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.nombre}</p>
                  <p className="text-xs text-gray-500">{doc.codigo}</p>
                </div>
                <Badge estado={doc.estado} />
              </div>
            )) || <p className="text-gray-400 text-sm text-center py-6">Sin documentos recientes</p>}
          </div>
        </div>

        {/* Últimas auditorías */}
        <div className="tarjeta">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-unt-azul" /> Últimas auditorías
            </h2>
            <Link href="/auditorias" className="text-xs text-blue-600 hover:text-blue-700">Ver todas →</Link>
          </div>
          <div className="space-y-3">
            {stats?.audits?.ultimas?.slice(0, 4).map((audit, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{audit.nombre}</p>
                  <p className="text-xs text-gray-500">{audit.responsable}</p>
                </div>
                <Badge estado={audit.estado} />
              </div>
            )) || <p className="text-gray-400 text-sm text-center py-6">Sin auditorías recientes</p>}
          </div>
        </div>
      </div>

      {/* Alertas de indicadores */}
      {stats?.indicadores?.alertas_pendientes?.length > 0 && (
        <div className="tarjeta border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" /> Alertas de indicadores pendientes
            </h2>
            <span className="text-xs text-red-600 font-semibold">{stats.indicadores.alertas_pendientes.length} alertas</span>
          </div>
          <div className="space-y-2">
            {stats.indicadores.alertas_pendientes.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-gray-700 flex-1">{a.mensaje}</p>
                <Badge estado={a.tipo_alerta} className="flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas mediciones de indicadores */}
      {stats?.indicadores?.ultimas_mediciones?.length > 0 && (
        <div className="tarjeta">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-unt-azul" /> Últimas mediciones
            </h2>
            <Link href="/indicadores" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Ver todos <BarChart2 size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.indicadores.ultimas_mediciones.slice(0, 6).map((m, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 truncate">{m.nombre}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{m.valor}<span className="text-sm font-normal text-gray-400 ml-1">{m.unidad_medida}</span></p>
                  <p className="text-xs text-gray-400">Meta: {m.meta} · {m.periodo}</p>
                </div>
                <Semaforo estado={m.estado_semaforo} showLabel={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/documentos', icon: FileText, label: 'Documentos', color: 'bg-blue-50 text-unt-azul hover:bg-blue-100' },
          { href: '/auditorias', icon: ClipboardCheck, label: 'Auditorías', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
          { href: '/riesgos',    icon: Shield, label: 'Riesgos', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
          { href: '/indicadores',icon: BarChart2, label: 'Indicadores', color: 'bg-green-50 text-green-700 hover:bg-green-100' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${item.color}`}>
            <item.icon size={24} />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}