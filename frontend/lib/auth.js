'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sgc_token');
    const user  = localStorage.getItem('sgc_usuario');
    if (token && user) {
      try { setUsuario(JSON.parse(user)); } catch {}
    }
    setCargando(false);
  }, []);

  const login = async (correo, contrasena) => {
    const { data } = await api.post('/auth/login', { correo, contrasena });
    localStorage.setItem('sgc_token', data.token);
    localStorage.setItem('sgc_usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('sgc_token');
    localStorage.removeItem('sgc_usuario');
    setUsuario(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
