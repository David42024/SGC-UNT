'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import {
  FileText, GitBranch, Award, ClipboardCheck,
  AlertTriangle, Shield, BarChart2, Star,
  TrendingUp, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { StatCard, CargandoPagina, Badge } from '../../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import Link from 'next/link';

const COLORES_PIE = ['#063B96', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const [docs, proc, audits, acciones, riesgos, indicadores, encuestas] = await Promise.allSettled([
        api.get('/documentos/estadisticas'),
        api.get('/procesos/estadisticas'),
        api.get('/auditorias/estadisticas'),
        api.get('/acciones/estadisticas'),
        api.get('/riesgos/estadisticas'),
        api.get('/indicadores/dashboard'),
        api.get('/satisfaccion/estadisticas'),
      ]);
      setStats({
        docs:        docs.value?.data?.datos,
        proc:        proc.value?.data?.datos,
        audits:      audits.value?.data?.datos,
        acciones:    acciones.value?.data?.datos,
        riesgos:     riesgos.value?.data?.datos,
        indicadores: indicadores.value?.data?.datos,
        encuestas:   encuestas.value?.data?.datos,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) return <CargandoPagina />;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  const docsEstado = stats?.docs?.por_estado || [];
  const riesgosNivel = stats?.riesgos?.por_nivel || [];

  return (
    <div className="space-y-6">
      {/* Bienvenida */}
      <div className="bg-gradient-to-r from-unt-azul to-blue-700 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm mb-1">{saludo},</p>
        <h1 className="text-2xl font-bold">{usuario?.nombres} {usuario?.apellidos}</h1>
        <p className="text-blue-200 text-sm mt-1">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Documentos" valor={stats?.docs?.total ?? '—'} icono={FileText} color="blue" tendencia="Total registrados" />
        <StatCard label="Procesos activos" valor={stats?.proc?.total ?? '—'} icono={GitBranch} color="green" tendencia="En el mapa de procesos" />
        <StatCard label="Auditorías" valor={stats?.audits?.total ?? '—'} icono={ClipboardCheck} color="purple" tendencia="Total en el sistema" />
        <StatCard label="No conformidades" valor={stats?.acciones?.total ?? '—'} icono={AlertTriangle} color="yellow" tendencia="Registradas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documentos por estado */}
        <div className="tarjeta">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={18} className="text-unt-azul" /> Documentos por estado
          </h2>
          {docsEstado.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={docsEstado} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#063B96" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">Sin datos</p>}
        </div>

        {/* Riesgos por nivel */}
        <div className="tarjeta">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-unt-azul" /> Riesgos por nivel
          </h2>
          {riesgosNivel.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={riesgosNivel} dataKey="cantidad" nameKey="clasificacion_nivel"
                  cx="50%" cy="50%" outerRadius={80} label={({ clasificacion_nivel, cantidad }) => `${clasificacion_nivel}: ${cantidad}`}>
                  {riesgosNivel.map((_, i) => (
                    <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">Sin datos</p>}
        </div>
      </div>

      {/* Alertas de indicadores */}
      {stats?.indicadores?.alertas_pendientes?.length > 0 && (
        <div className="tarjeta border-l-4 border-l-red-500">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-red-500" /> Alertas de indicadores pendientes
          </h2>
          <div className="space-y-2">
            {stats.indicadores.alertas_pendientes.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-gray-700">{a.mensaje}</p>
                <Badge estado={a.tipo_alerta} className="ml-auto flex-shrink-0" />
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
