'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Users, Plus, Search, Edit, Trash2, RefreshCw, ShieldCheck, UserCheck, UserX, Download } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import { useAuth } from '../../lib/auth';

const FORM_VACIO = { nombres: '', apellidos: '', correo: '', contrasena: '', rol_id: '', area: '', cargo: '' };

export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar]     = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalForm, setModalForm]       = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [form, setForm]     = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [pagina, setPagina]           = useState(1);
  const [limite, setLimite]           = useState(10);
  const [paginacion, setPaginacion]   = useState(null);

  if (usuarioActual?.rol !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ShieldCheck size={48} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-600">Acceso restringido</h2>
          <p className="text-gray-400 text-sm mt-1">Solo los administradores pueden gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  const cargar = async () => {
    setCargando(true);
    try {
      const params = { page: pagina, limit: limite };
      if (filtroActivo !== '') params.activo = filtroActivo;
      if (filtroRol) params.rol = filtroRol;
      const [usrRes, rolRes] = await Promise.all([
        api.get('/usuarios', { params }),
        api.get('/usuarios/roles'),
      ]);
      setUsuarios(usrRes.data.datos || []);
      setPaginacion(usrRes.data.paginacion || null);
      setRoles(rolRes.data.datos || []);
    } catch { toast.error('Error al cargar usuarios'); }
    finally  { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [pagina, limite, filtroActivo, filtroRol]);

  const filtrados = usuarios.filter(u =>
    !buscar ||
    `${u.nombres} ${u.apellidos}`.toLowerCase().includes(buscar.toLowerCase()) ||
    u.correo?.toLowerCase().includes(buscar.toLowerCase())
  );

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
  };

  const abrirNuevo  = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const cambiarPagina = (nuevaPagina) => { setPagina(nuevaPagina); };
  const cambiarLimite = (nuevoLimite) => { setLimite(nuevoLimite); setPagina(1); };
  const abrirEditar = (u) => {
    setSeleccionado(u);
    const rolId = roles.find(r => r.nombre === u.rol)?.id || '';
    setForm({ nombres: u.nombres, apellidos: u.apellidos, correo: u.correo, contrasena: '', rol_id: rolId, area: u.area || '', cargo: u.cargo || '' });
    setModalForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombres || !form.apellidos || !form.correo || !form.rol_id) { toast.error('Complete los campos obligatorios'); return; }
    if (!seleccionado && !form.contrasena) { toast.error('La contraseña es obligatoria para nuevos usuarios'); return; }
    setGuardando(true);
    try {
      if (seleccionado) {
        const payload = { nombres: form.nombres, apellidos: form.apellidos, rol_id: form.rol_id, area: form.area, cargo: form.cargo, activo: true };
        await api.put(`/usuarios/${seleccionado.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        await api.post('/usuarios', form);
        toast.success('Usuario creado exitosamente');
      }
      setModalForm(false); setPagina(1); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const desactivar = async () => {
    setGuardando(true);
    try {
      await api.delete(`/usuarios/${seleccionado.id}`);
      toast.success('Usuario desactivado');
      setModalEliminar(false); setPagina(1); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const descargarReporte = async () => {
    try {
      const params = {};
      if (filtroActivo !== '') params.activo = filtroActivo;
      if (filtroRol) params.rol = filtroRol;
      const res = await api.get('/usuarios/reporte', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = 'reporte-usuarios.pdf'; a.click();
    } catch { toast.error('Error al generar reporte'); }
  };

  const colorRol = (rol) => ({
    admin: 'bg-red-100 text-red-700',
    auditor: 'bg-purple-100 text-purple-700',
    usuario: 'bg-blue-100 text-blue-700',
    solo_lectura: 'bg-gray-100 text-gray-600',
  }[rol] || 'bg-gray-100 text-gray-600');

  return (
    <div>
      <PageHeader
        titulo="Gestión de Usuarios"
        descripcion="Administración de usuarios, roles y permisos del sistema"
        icono={Users}
        acciones={
          <div className="flex items-center gap-2">
            <button onClick={descargarReporte} className="btn-secundario"><Download size={16} />Generar reporte</button>
            <button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nuevo usuario</button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatCard label="Total usuarios" valor={stats.total} icono={Users} color="blue" />
        <StatCard label="Usuarios activos" valor={stats.activos} icono={UserCheck} color="green" />
        <StatCard label="Inactivos" valor={stats.inactivos} icono={UserX} color="red" />
      </div>

      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar por nombre o correo..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="campo w-auto" value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          <select className="campo w-auto" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
            <option value="">Todos los roles</option>
            {roles.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
          </select>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="tarjeta p-0 overflow-hidden">
        {cargando ? <CargandoPagina /> : filtrados.length === 0 ? (
          <EstadoVacio icono={Users} titulo="No hay usuarios" descripcion="Cree el primer usuario del sistema"
            accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nuevo usuario</button>} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="tabla-encabezado">Usuario</th>
                  <th className="tabla-encabezado">Correo</th>
                  <th className="tabla-encabezado">Rol</th>
                  <th className="tabla-encabezado">Área / Cargo</th>
                  <th className="tabla-encabezado">Último acceso</th>
                  <th className="tabla-encabezado text-center">Estado</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="tabla-celda">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-unt-azul/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-unt-azul text-sm font-semibold">{u.nombres?.[0]}{u.apellidos?.[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{u.nombres} {u.apellidos}</p>
                          <p className="text-xs text-gray-400">ID: {u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tabla-celda text-gray-500 text-xs">{u.correo}</td>
                    <td className="tabla-celda">
                      <span className={`badge-estado ${colorRol(u.rol)}`}>{u.rol}</span>
                    </td>
                    <td className="tabla-celda">
                      <p className="text-xs text-gray-700">{u.area || '—'}</p>
                      <p className="text-xs text-gray-400">{u.cargo || ''}</p>
                    </td>
                    <td className="tabla-celda text-xs text-gray-400">
                      {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca'}
                    </td>
                    <td className="tabla-celda text-center">
                      <Badge estado={u.activo ? 'activo' : 'inactivo'} />
                    </td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => abrirEditar(u)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Editar"><Edit size={15} /></button>
                        {u.id !== usuarioActual?.id && (
                          <button onClick={() => { setSeleccionado(u); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Desactivar"><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {paginacion && paginacion.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Mostrar</span>
                <select className="campo w-auto py-1 text-sm" value={limite} onChange={e => cambiarLimite(parseInt(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">por página</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => cambiarPagina(pagina - 1)} disabled={!paginacion.hasPrev} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                <span className="text-sm text-gray-600">Página {paginacion.page} de {paginacion.totalPages} ({paginacion.total} total)</span>
                <button onClick={() => cambiarPagina(pagina + 1)} disabled={!paginacion.hasNext} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Modal formulario */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar usuario' : 'Nuevo usuario'} size="md">
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nombres" required><input className="campo" value={form.nombres} onChange={e => setForm({...form, nombres: e.target.value})} /></Campo>
            <Campo label="Apellidos" required><input className="campo" value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} /></Campo>
          </div>
          <Campo label="Correo electrónico" required>
            <input type="email" className="campo" value={form.correo} onChange={e => setForm({...form, correo: e.target.value})} disabled={!!seleccionado} placeholder="usuario@unt.edu.pe" />
          </Campo>
          {!seleccionado && (
            <Campo label="Contraseña inicial" required>
              <input type="password" className="campo" value={form.contrasena} onChange={e => setForm({...form, contrasena: e.target.value})} placeholder="Mínimo 8 caracteres" />
            </Campo>
          )}
          <Campo label="Rol del sistema" required>
            <select className="campo" value={form.rol_id} onChange={e => setForm({...form, rol_id: e.target.value})}>
              <option value="">Seleccione...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.nombre} — {r.descripcion}</option>)}
            </select>
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Área / Unidad"><input className="campo" value={form.area} onChange={e => setForm({...form, area: e.target.value})} placeholder="Dpto. de Calidad" /></Campo>
            <Campo label="Cargo"><input className="campo" value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} placeholder="Coordinador" /></Campo>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : seleccionado ? 'Actualizar usuario' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={desactivar} cargando={guardando}
        titulo="¿Desactivar usuario?" mensaje={`El usuario "${seleccionado?.nombres} ${seleccionado?.apellidos}" perderá el acceso al sistema.`} />
    </div>
  );
}
