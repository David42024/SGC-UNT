'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ correo: '', contrasena: '' });
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.correo || !form.contrasena) { toast.error('Complete todos los campos'); return; }
    setCargando(true);
    try {
      await login(form.correo, form.contrasena);
      toast.success('Bienvenido al SGC-UNT');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Credenciales inválidas');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-unt-azul via-blue-800 to-unt-oscuro">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / encabezado */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SGC-UNT</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de Gestión de la Calidad</p>
          <p className="text-blue-300 text-xs mt-0.5">Universidad Nacional de Trujillo</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="etiqueta">Correo institucional</label>
              <input
                type="email"
                className="campo"
                placeholder="usuario@unt.edu.pe"
                value={form.correo}
                onChange={e => setForm({ ...form, correo: e.target.value })}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="etiqueta">Contraseña</label>
              <div className="relative">
                <input
                  type={mostrarPass ? 'text' : 'password'}
                  className="campo pr-10"
                  placeholder="••••••••"
                  value={form.contrasena}
                  onChange={e => setForm({ ...form, contrasena: e.target.value })}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setMostrarPass(!mostrarPass)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {mostrarPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={cargando}
              className="w-full btn-primario justify-center py-2.5 text-base">
              {cargando ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                <span className="flex items-center gap-2"><LogIn size={18} /> Ingresar</span>
              )}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-6">
            Usuario por defecto: <span className="font-mono">admin@unt.edu.pe</span> / <span className="font-mono">Admin1234!</span>
          </p>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} Universidad Nacional de Trujillo — SGC v1.0
        </p>
      </div>
    </div>
  );
}
