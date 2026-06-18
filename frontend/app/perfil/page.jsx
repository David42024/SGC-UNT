'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { User, Mail, Building2, Briefcase, Shield, Lock, Save, Camera } from 'lucide-react';
import { Badge, CargandoPagina, Modal, Campo, PageHeader } from '../../components/ui';

const FORM_VACIO = { nombres: '', apellidos: '', correo: '', area: '', cargo: '' };
const PASS_VACIO = { contrasena_actual: '', contrasena_nueva: '', confirmar_contrasena: '' };

export default function PerfilPage() {
  const { usuario, logout } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(FORM_VACIO);
  const [formPass, setFormPass] = useState(PASS_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [guardandoPass, setGuardandoPass] = useState(false);
  const [modalPass, setModalPass] = useState(false);

  useEffect(() => {
    if (usuario) {
      setForm({
        nombres: usuario.nombres || '',
        apellidos: usuario.apellidos || '',
        correo: usuario.correo || '',
        area: usuario.area || '',
        cargo: usuario.cargo || '',
      });
      setCargando(false);
    }
  }, [usuario]);

  const guardarPerfil = async (e) => {
    e.preventDefault();
    if (!form.nombres || !form.apellidos || !form.correo) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    setGuardando(true);
    try {
      await api.put('/usuarios/perfil', form);
      toast.success('Perfil actualizado');
      // Update local storage
      const updatedUser = { ...usuario, ...form };
      localStorage.setItem('sgc_usuario', JSON.stringify(updatedUser));
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al actualizar perfil');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarContrasena = async (e) => {
    e.preventDefault();
    if (!formPass.contrasena_actual || !formPass.contrasena_nueva || !formPass.confirmar_contrasena) {
      toast.error('Complete todos los campos');
      return;
    }
    if (formPass.contrasena_nueva !== formPass.confirmar_contrasena) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    if (formPass.contrasena_nueva.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setGuardandoPass(true);
    try {
      await api.put('/usuarios/cambiar-contrasena', {
        contrasena_actual: formPass.contrasena_actual,
        contrasena_nueva: formPass.contrasena_nueva,
      });
      toast.success('Contraseña cambiada exitosamente');
      setModalPass(false);
      setFormPass(PASS_VACIO);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cambiar contraseña');
    } finally {
      setGuardandoPass(false);
    }
  };

  if (cargando) return <CargandoPagina />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        titulo="Mi Perfil"
        descripcion="Gestiona tu información personal y seguridad"
        icono={User}
      />

      {/* Información del usuario */}
      <div className="tarjeta">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-unt-azul rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-3xl font-bold">
              {usuario?.nombres?.[0]}{usuario?.apellidos?.[0]}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              {usuario?.nombres} {usuario?.apellidos}
            </h2>
            <p className="text-gray-500 mt-1">{usuario?.correo}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge estado={usuario?.rol} />
              <span className="text-sm text-gray-400">
                Último acceso: {usuario?.ultimo_acceso ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-PE') : 'Nunca'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de perfil */}
      <div className="tarjeta">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={18} className="text-unt-azul" /> Información Personal
        </h3>
        <form onSubmit={guardarPerfil} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Nombres" required>
            <input
              type="text"
              className="campo"
              value={form.nombres}
              onChange={e => setForm({ ...form, nombres: e.target.value })}
            />
          </Campo>
          <Campo label="Apellidos" required>
            <input
              type="text"
              className="campo"
              value={form.apellidos}
              onChange={e => setForm({ ...form, apellidos: e.target.value })}
            />
          </Campo>
          <Campo label="Correo institucional" required>
            <input
              type="email"
              className="campo"
              value={form.correo}
              onChange={e => setForm({ ...form, correo: e.target.value })}
              disabled
            />
          </Campo>
          <Campo label="Área">
            <input
              type="text"
              className="campo"
              value={form.area}
              onChange={e => setForm({ ...form, area: e.target.value })}
              placeholder="Ej: Oficina de Calidad"
            />
          </Campo>
          <Campo label="Cargo">
            <input
              type="text"
              className="campo"
              value={form.cargo}
              onChange={e => setForm({ ...form, cargo: e.target.value })}
              placeholder="Ej: Jefe de Unidad"
            />
          </Campo>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : <span className="flex items-center gap-2"><Save size={16} /> Guardar cambios</span>}
            </button>
          </div>
        </form>
      </div>

      {/* Seguridad */}
      <div className="tarjeta">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={18} className="text-unt-azul" /> Seguridad
        </h3>
        <button
          onClick={() => setModalPass(true)}
          className="btn-secundario w-full md:w-auto"
        >
          Cambiar contraseña
        </button>
      </div>

      {/* Modal cambiar contraseña */}
      <Modal
        abierto={modalPass}
        onCerrar={() => { setModalPass(false); setFormPass(PASS_VACIO); }}
        titulo="Cambiar contraseña"
        size="sm"
      >
        <form onSubmit={cambiarContrasena} className="space-y-4">
          <Campo label="Contraseña actual" required>
            <input
              type="password"
              className="campo"
              value={formPass.contrasena_actual}
              onChange={e => setFormPass({ ...formPass, contrasena_actual: e.target.value })}
            />
          </Campo>
          <Campo label="Nueva contraseña" required>
            <input
              type="password"
              className="campo"
              value={formPass.contrasena_nueva}
              onChange={e => setFormPass({ ...formPass, contrasena_nueva: e.target.value })}
              placeholder="Mínimo 8 caracteres"
            />
          </Campo>
          <Campo label="Confirmar nueva contraseña" required>
            <input
              type="password"
              className="campo"
              value={formPass.confirmar_contrasena}
              onChange={e => setFormPass({ ...formPass, confirmar_contrasena: e.target.value })}
            />
          </Campo>
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setModalPass(false); setFormPass(PASS_VACIO); }}
              className="btn-secundario"
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardandoPass} className="btn-primario">
              {guardandoPass ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
