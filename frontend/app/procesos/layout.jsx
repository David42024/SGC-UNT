'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard, FileText, GitBranch, Award, ClipboardCheck,
  AlertTriangle, Shield, BarChart2, Star, Users, LogOut,
  Menu, X, ChevronRight, Bell, GraduationCap, Home,
  Settings, HelpCircle, User
} from 'lucide-react';
import clsx from 'clsx';

// Módulos del SGC
const MODULOS = [
  { 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    description: 'Panel de control'
  },
  { 
    href: '/documentos', 
    icon: FileText, 
    label: 'Documentos',
    description: 'Gestión documental'
  },
  { 
    href: '/procesos', 
    icon: GitBranch, 
    label: 'Procesos',
    description: 'Mapa de procesos'
  },
  { 
    href: '/acreditacion', 
    icon: Award, 
    label: 'Acreditación',
    description: 'Autoevaluación y acreditación'
  },
  { 
    href: '/auditorias', 
    icon: ClipboardCheck, 
    label: 'Auditorías',
    description: 'Auditorías e inspecciones'
  },
  { 
    href: '/acciones', 
    icon: AlertTriangle, 
    label: 'CAPA',
    description: 'Acciones correctivas y preventivas'
  },
  { 
    href: '/riesgos', 
    icon: Shield, 
    label: 'Riesgos',
    description: 'Gestión de riesgos'
  },
  { 
    href: '/indicadores', 
    icon: BarChart2, 
    label: 'Indicadores',
    description: 'Indicadores de gestión'
  },
  { 
    href: '/satisfaccion', 
    icon: Star, 
    label: 'Satisfacción',
    description: 'Encuestas de satisfacción'
  },
  { 
    href: '/usuarios', 
    icon: Users, 
    label: 'Usuarios',
    description: 'Gestión de usuarios',
    soloAdmin: true 
  },
];

// Helper para formatear iniciales del usuario, con fallback seguro
const obtenerIniciales = (nombres, apellidos) => {
  if (!nombres && !apellidos) return 'U';
  const iniciales = (nombres || '').charAt(0) + (apellidos || '').charAt(0);
  return iniciales.toUpperCase() || 'U';
};

// FIX: helper para resolver el label real del módulo activo,
// en vez de mostrar el slug crudo de la URL en el breadcrumb.
const obtenerLabelActivo = (pathname, modulos) => {
  if (!pathname) return 'Dashboard';
  const modulo = modulos.find(
    m => pathname === m.href || pathname.startsWith(m.href + '/')
  );
  return modulo ? modulo.label : 'Dashboard';
};

export default function DashboardLayout({ children }) {
  const { usuario, logout, cargando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Redirección si no hay usuario.
  // Este es el ÚNICO lugar que redirige a /login tras un logout:
  // reacciona al cambio de `usuario` a null, así que handleLogout
  // no necesita (ni debe) hacer su propio router.push.
  useEffect(() => {
    if (!cargando && !usuario) {
      router.push('/login');
    }
  }, [usuario, cargando, router]);

  // Cerrar sidebar al cambiar de ruta (mobile)
  useEffect(() => {
    setSidebarAbierto(false);
  }, [pathname]);

  // FIX: se quita el setNotificaciones(3) simulado.
  // Mostrar un número inventado en producción es engañoso,
  // especialmente en un sistema institucional de gestión de calidad.
  // Cuando exista el endpoint real, reemplazar este estado por la
  // llamada a la API correspondiente (ej. api.get('/notificaciones/conteo')).
  const [notificaciones] = useState(0);

  // FIX: ya no llama a router.push aquí; el useEffect de arriba
  // se encarga de la redirección cuando `usuario` pasa a null.
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }, [logout]);

  // Pantalla de carga
  if (cargando || !usuario) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-unt-azul to-unt-azul/90">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center animate-pulse">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white/80 text-sm font-medium animate-pulse">
            Cargando sistema...
          </p>
        </div>
      </div>
    );
  }

  const modulosFiltrados = MODULOS.filter(m => !m.soloAdmin || usuario.rol === 'admin');
  const nombreCompleto = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim() || 'Usuario';
  const iniciales = obtenerIniciales(usuario.nombres, usuario.apellidos);
  const labelActivo = obtenerLabelActivo(pathname, MODULOS);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Overlay móvil */}
      {sidebarAbierto && (
        <div 
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarAbierto(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-72 bg-unt-azul flex flex-col transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 shadow-2xl',
          sidebarAbierto ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight">SGC-UNT</p>
              <p className="text-blue-200 text-xs truncate">Sistema de Gestión de Calidad</p>
            </div>
          </Link>
          <button 
            onClick={() => setSidebarAbierto(false)} 
            className="ml-auto lg:hidden text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {modulosFiltrados.map((m) => {
            const activo = pathname === m.href || pathname?.startsWith(m.href + '/');
            
            return (
              <Link 
                key={m.href} 
                href={m.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 group relative',
                  activo 
                    ? 'bg-white/15 text-white shadow-lg shadow-black/5' 
                    : 'text-blue-100 hover:bg-white/8 hover:text-white'
                )}
                title={m.description}
              >
                <m.icon size={18} className="flex-shrink-0" />
                <span className="flex-1">{m.label}</span>
                {activo && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                )}
                {m.soloAdmin && (
                  <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del sidebar con información del usuario */}
        <div className="border-t border-white/10 p-4 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white/10">
              <span className="text-white font-semibold text-sm">
                {iniciales}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{nombreCompleto}</p>
              <span className="text-blue-200 text-xs capitalize">{usuario.rol}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            <button 
              onClick={() => router.push('/perfil')}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg text-xs transition-colors"
            >
              <User size={14} />
              Perfil
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg text-xs transition-colors"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 shadow-sm">
          <button 
            onClick={() => setSidebarAbierto(true)} 
            className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          
          {/* Breadcrumb usando el label real del módulo activo */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 text-sm text-gray-400 truncate">
              <Home size={14} className="text-gray-400" />
              <span className="hidden sm:inline">/</span>
              <span className="truncate font-medium text-gray-700">
                {labelActivo}
              </span>
            </div>
          </div>

          {/* Acciones del topbar */}
          <div className="flex items-center gap-1">
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
              aria-label="Ayuda"
              title="Ayuda"
            >
              <HelpCircle size={20} />
            </button>

            <button 
              className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Notificaciones"
              title="Notificaciones"
            >
              <Bell size={20} />
              {notificaciones > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificaciones > 9 ? '9+' : notificaciones}
                </span>
              )}
            </button>

            <button 
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
              aria-label="Configuración"
              title="Configuración"
            >
              <Settings size={20} />
            </button>

            <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2 text-sm ml-1">
              <div className="w-9 h-9 bg-gradient-to-br from-unt-azul to-unt-azul/80 rounded-full flex items-center justify-center ring-2 ring-unt-azul/10">
                <span className="text-white text-xs font-semibold">
                  {iniciales}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-gray-700 font-medium text-sm leading-tight">{nombreCompleto}</p>
                <p className="text-gray-400 text-xs capitalize">{usuario.rol}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}