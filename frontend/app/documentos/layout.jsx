'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard, FileText, GitBranch, Award, ClipboardCheck,
  AlertTriangle, Shield, BarChart2, Star, Users, LogOut,
  Menu, X, ChevronRight, Bell
} from 'lucide-react';
import clsx from 'clsx';

const MODULOS = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/documentos',    icon: FileText,          label: 'Documentos' },
  { href: '/procesos',      icon: GitBranch,         label: 'Procesos' },
  { href: '/acreditacion',  icon: Award,             label: 'Acreditación' },
  { href: '/auditorias',    icon: ClipboardCheck,    label: 'Auditorías' },
  { href: '/acciones',      icon: AlertTriangle,     label: 'CAPA' },
  { href: '/riesgos',       icon: Shield,            label: 'Riesgos' },
  { href: '/indicadores',   icon: BarChart2,         label: 'Indicadores' },
  { href: '/satisfaccion',  icon: Star,              label: 'Satisfacción' },
  { href: '/usuarios',      icon: Users,             label: 'Usuarios', soloAdmin: true },
];

export default function DashboardLayout({ children }) {
  const { usuario, logout, cargando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [usuario, cargando, router]);

  if (cargando || !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-unt-azul">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const modulosFiltrados = MODULOS.filter(m => !m.soloAdmin || usuario.rol === 'admin');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay móvil */}
      {sidebarAbierto && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarAbierto(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-unt-azul flex flex-col transition-transform duration-300 ease-in-out',
        'lg:relative lg:translate-x-0',
        sidebarAbierto ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">SGC-UNT</p>
            <p className="text-blue-200 text-xs truncate">Gestión de Calidad</p>
          </div>
          <button onClick={() => setSidebarAbierto(false)} className="ml-auto lg:hidden text-white/70 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {modulosFiltrados.map((m) => {
            const activo = pathname.startsWith(m.href) && (m.href !== '/dashboard' || pathname === '/dashboard');
            return (
              <Link key={m.href} href={m.href} onClick={() => setSidebarAbierto(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150',
                  activo ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/8 hover:text-white'
                )}>
                <m.icon size={18} className="flex-shrink-0" />
                <span className="flex-1">{m.label}</span>
                {activo && <ChevronRight size={14} className="opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-sm">
                {usuario.nombres?.[0]}{usuario.apellidos?.[0]}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{usuario.nombres} {usuario.apellidos}</p>
              <p className="text-blue-200 text-xs capitalize">{usuario.rol}</p>
            </div>
          </div>
          <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar con notificaciones mejoradas */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4 flex-shrink-0">
          <button onClick={() => setSidebarAbierto(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <Menu size={22} />
          </button>
          <div className="flex-1" />

          {/* 👇 BOTÓN DE NOTIFICACIONES MEJORADO */}
          <button className="relative text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 bg-unt-azul rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {usuario.nombres?.[0]}{usuario.apellidos?.[0]}
              </span>
            </div>
            <span className="hidden sm:block text-gray-700 font-medium">
              {usuario.nombres}
            </span>
          </div>
        </header>

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}