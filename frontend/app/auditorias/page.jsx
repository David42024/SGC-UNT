'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ClipboardCheck, Plus, Search, Download, Edit, Trash2, AlertCircle, RefreshCw, FileWarning, Users } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import { useAuth } from '../../lib/auth';

const ESTADOS   = ['planificado','en_curso','finalizado','cancelado'];
const TIPOS     = ['interna','externa','seguimiento'];
const CLASIFS   = ['conforme','no_conformidad_menor','no_conformidad_mayor','observacion','oportunidad_mejora'];
const ESTADOS_HALLAZGO = ['abierto','en_proceso','cerrado','verificado'];
const FORM_VACIO = { programa_id:'', codigo:'', titulo:'', tipo_auditoria:'interna', alcance:'', objetivo:'', proceso_id:'', auditor_lider_id:'', fecha_planificada:'', fecha_inicio:'', fecha_fin:'', estado:'planificado' };
const HALL_VACIO = { codigo:'', descripcion:'', clasificacion:'observacion', estandar_ref:'', evidencia_objetiva:'', responsable_id:'', fecha_limite:'' };

export default function AuditoriasPage() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol?.toLowerCase() === 'admin';
  const [auditorias, setAuditorias] = useState([]);
  const [programas, setProgramas]   = useState([]);
  const [procesos, setProcesos]     = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [buscar, setBuscar]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalForm, setModalForm]   = useState(false);
  const [modalHallazgo, setModalHallazgo] = useState(false);
  const [modalHallazgos, setModalHallazgos] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [form, setForm]             = useState(FORM_VACIO);
  const [formHall, setFormHall]     = useState(HALL_VACIO);
  const [hallazgos, setHallazgos]   = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [modalEquipo, setModalEquipo] = useState(false);
  const [equipoAuditoria, setEquipoAuditoria] = useState([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      const [audRes, progRes, procRes, usrRes, statsRes] = await Promise.all([
        api.get('/auditorias', { params }),
        api.get('/auditorias/programas'),
        api.get('/procesos'),
        api.get('/usuarios'),
        api.get('/auditorias/estadisticas'),
      ]);
      setAuditorias(audRes.data.datos || []);
      setProgramas(progRes.data.datos || []);
      setProcesos(procRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
      setStats(statsRes.data.datos);
    } catch { toast.error('Error al cargar auditorías'); }
    finally  { setCargando(false); }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  // Auto change estado to "en_curso" when fecha_inicio is today!
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    auditorias.forEach(async (a) => {
      if (a.estado === 'planificado' && a.fecha_inicio === today) {
        try {
          await cambiarEstadoAuditoria(a.id, 'en_curso');
        } catch (e) {
          console.error('Error auto-updating estado', e);
        }
      }
    });
  }, [auditorias]);

  const filtrados = auditorias.filter(a => !buscar || a.titulo?.toLowerCase().includes(buscar.toLowerCase()) || a.codigo?.toLowerCase().includes(buscar.toLowerCase()));

  const abrirNuevo = () => {
    const today = new Date().toISOString().split('T')[0];
    const año = new Date().getFullYear();
    const auditoriasDelAño = auditorias.filter(a => a.codigo?.startsWith(`AUD-${año}`));
    const siguienteNumero = auditoriasDelAño.length + 1;
    const codigo = `AUD-${año}-${String(siguienteNumero).padStart(3, '0')}`;
    setSeleccionado(null);
    setForm({ ...FORM_VACIO, codigo, fecha_planificada: today });
    setModalForm(true);
  };
  const abrirEditar = (a) => { setSeleccionado(a); setForm({ 
    programa_id: a.programa_id || '', 
    codigo: a.codigo, 
    titulo: a.titulo, 
    tipo_auditoria: a.tipo_auditoria, 
    alcance: a.alcance || '', 
    objetivo: a.objetivo || '', 
    proceso_id: a.proceso_id || '', 
    auditor_lider_id: a.auditor_lider_id, 
    fecha_planificada: a.fecha_planificada?.slice(0,10) || '',
    fecha_inicio: a.fecha_inicio?.slice(0,10) || '',
    fecha_fin: a.fecha_fin?.slice(0,10) || '',
    estado: a.estado || 'planificado'
  }); setModalForm(true); };

  const abrirHallazgos = async (a) => {
    setSeleccionado(a);
    try { const res = await api.get(`/auditorias/${a.id}/hallazgos`); setHallazgos(res.data.datos || []); }
    catch { toast.error('Error al cargar hallazgos'); }
    setModalHallazgos(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.titulo || !form.auditor_lider_id) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    try {
      if (seleccionado && !modalHallazgos) { await api.put(`/auditorias/${seleccionado.id}`, form); toast.success('Auditoría actualizada'); }
      else { await api.post('/auditorias', form); toast.success('Auditoría creada'); }
      setModalForm(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const guardarHallazgo = async (e) => {
    e.preventDefault();
    if (!formHall.codigo || !formHall.descripcion) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    try {
      await api.post(`/auditorias/${seleccionado.id}/hallazgos`, formHall);
      toast.success('Hallazgo registrado');
      setModalHallazgo(false);
      const res = await api.get(`/auditorias/${seleccionado.id}/hallazgos`);
      setHallazgos(res.data.datos || []);
      setFormHall(HALL_VACIO);
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/auditorias/${seleccionado.id}`); toast.success('Auditoría eliminada'); setModalEliminar(false); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/auditorias/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `auditoria-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  const abrirEquipo = async (a) => {
    setSeleccionado(a);
    try {
      const res = await api.get(`/auditorias/${a.id}/auditores`);
      setEquipoAuditoria(res.data.datos || []);
    } catch {
      toast.error('Error al cargar el equipo auditor');
    }
    setModalEquipo(true);
  };

  const agregarMiembroEquipo = async (usuarioId, rol) => {
    try {
      await api.post(`/auditorias/${seleccionado.id}/auditores`, { usuario_id: usuarioId, rol_auditoria: rol });
      const res = await api.get(`/auditorias/${seleccionado.id}/auditores`);
      setEquipoAuditoria(res.data.datos || []);
      toast.success('Miembro agregado al equipo');
    } catch {
      toast.error('Error al agregar miembro');
    }
  };

  const eliminarMiembroEquipo = async (usuarioId) => {
    try {
      await api.delete(`/auditorias/${seleccionado.id}/auditores/${usuarioId}`);
      const res = await api.get(`/auditorias/${seleccionado.id}/auditores`);
      setEquipoAuditoria(res.data.datos || []);
      toast.success('Miembro eliminado del equipo');
    } catch {
      toast.error('Error al eliminar miembro');
    }
  };

  const cambiarEstadoHallazgo = async (hallazgoId, nuevoEstado) => {
    try {
      await api.patch(`/auditorias/hallazgos/${hallazgoId}/estado`, { estado: nuevoEstado });
      toast.success('Estado del hallazgo actualizado');
      const res = await api.get(`/auditorias/${seleccionado.id}/hallazgos`);
      setHallazgos(res.data.datos || []);
    } catch {
      toast.error('Error al actualizar el estado del hallazgo');
    }
  };

  const cambiarEstadoAuditoria = async (auditoriaId, nuevoEstado) => {
    try {
      await api.patch(`/auditorias/${auditoriaId}/estado`, { estado: nuevoEstado });
      toast.success('Estado de la auditoría actualizado');
      cargar(); // Refresh the table
    } catch {
      toast.error('Error al actualizar el estado de la auditoría');
    }
  };

  const colorClasif = (c) => ({ conforme:'text-green-600', no_conformidad_menor:'text-yellow-600', no_conformidad_mayor:'text-red-600', observacion:'text-blue-600', oportunidad_mejora:'text-purple-600' }[c] || 'text-gray-600');
  
  const getEstadoHallazgoStyle = (estado) => {
    switch(estado) {
      case 'abierto':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'en_proceso':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'cerrado':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'verificado':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getEstadoHallazgoLabel = (estado) => {
    switch(estado) {
      case 'abierto': return 'Abierto';
      case 'en_proceso': return 'En tratamiento';
      case 'cerrado': return 'Cerrado';
      case 'verificado': return 'Verificado';
      default: return estado;
    }
  };

  return (
    <div>
      <PageHeader titulo="Auditorías e Inspecciones" descripcion="Planificación, ejecución y seguimiento de auditorías internas y externas" icono={ClipboardCheck}
        acciones={esAdmin && <button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nueva auditoría</button>} />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard label="Total auditorías" valor={stats.total} icono={ClipboardCheck} color="blue" />
          {stats.por_estado?.slice(0,3).map(s => <StatCard key={s.estado} label={s.estado} valor={s.cantidad} icono={ClipboardCheck} color={s.estado === 'finalizado' ? 'green' : s.estado === 'en_curso' ? 'yellow' : 'blue'} />)}
        </div>
      )}

      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar por código o título..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="campo w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="tarjeta p-0 overflow-hidden">
        {cargando ? <CargandoPagina /> : filtrados.length === 0 ? (
          <EstadoVacio icono={ClipboardCheck} titulo="No hay auditorías" descripcion="No tienes auditorías asignadas"
            accion={esAdmin ? <button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nueva auditoría</button> : null} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="tabla-encabezado">Código</th>
                  <th className="tabla-encabezado">Título</th>
                  <th className="tabla-encabezado">Tipo</th>
                  <th className="tabla-encabezado">Auditor Líder</th>
                  <th className="tabla-encabezado">F. Planificada</th>
                  <th className="tabla-encabezado">Hallazgos</th>
                  <th className="tabla-encabezado">Estado</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="tabla-celda font-mono text-xs text-unt-azul font-semibold">{a.codigo}</td>
                    <td className="tabla-celda"><p className="font-medium text-gray-800 max-w-[200px] truncate">{a.titulo}</p></td>
                    <td className="tabla-celda"><Badge estado={a.tipo_auditoria} /></td>
                    <td className="tabla-celda text-xs text-gray-500">{a.auditor_lider_nombre}</td>
                    <td className="tabla-celda text-xs text-gray-500">{a.fecha_planificada ? new Date(a.fecha_planificada).toLocaleDateString('es-PE') : '—'}</td>
                    <td className="tabla-celda text-center">
                      <button onClick={() => abrirHallazgos(a)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-gray-50 transition-colors">
                        <FileWarning size={12} />
                        <div className="flex items-center gap-1">
                          {a.hallazgos_por_estado && Object.entries(a.hallazgos_por_estado).map(([estado, count]) => (
                            count > 0 && (
                              <span 
                                key={estado} 
                                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${getEstadoHallazgoStyle(estado)}`}
                              >
                                {count}
                              </span>
                            )
                          ))}
                          {(!a.hallazgos_por_estado || Object.keys(a.hallazgos_por_estado).length === 0 || a.total_hallazgos === 0) && (
                            <span className="text-gray-500">0</span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="tabla-celda">
                      <select 
                        className="campo text-xs"
                        value={a.estado}
                        onChange={e => cambiarEstadoAuditoria(a.id, e.target.value)}
                        disabled={!esAdmin}
                      >
                        <option value="planificado">Planificado</option>
                        <option value="en_curso">En ejecución</option>
                        <option value="finalizado">Ejecutada</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                    <td className="tabla-celda">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => descargarPDF(a.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                      <button onClick={() => abrirEquipo(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Users size={15} /></button>
                      {esAdmin && <button onClick={() => abrirEditar(a)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>}
                      {esAdmin && <button onClick={() => { setSeleccionado(a); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal auditoría */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar auditoría' : 'Nueva auditoría'} size="lg" cerrarAlClickFuera={false}>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" required><input className="campo" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} placeholder="AUD-2024-001" disabled={!!seleccionado} /></Campo>
            <Campo label="Tipo" required>
              <select className="campo" value={form.tipo_auditoria} onChange={e => setForm({...form, tipo_auditoria: e.target.value})}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Título" required><input className="campo" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Nombre de la auditoría" /></Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Auditor líder" required>
              <select className="campo" value={form.auditor_lider_id} onChange={e => setForm({...form, auditor_lider_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
            <Campo label="Proceso auditado">
              <select className="campo" value={form.proceso_id} onChange={e => setForm({...form, proceso_id: e.target.value})}>
                <option value="">Todos los procesos</option>
                {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Fecha planificada"><input type="date" className="campo" value={form.fecha_planificada} onChange={e => setForm({...form, fecha_planificada: e.target.value})} /></Campo>
            <Campo label="Fecha de inicio"><input type="date" className="campo" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} /></Campo>
            <Campo label="Fecha de fin"><input type="date" className="campo" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} /></Campo>
            <Campo label="Estado" required>
              <select className="campo" value={form.estado} onChange={e => setForm({...form, estado: e.target.value})}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
              </select>
            </Campo>
            <Campo label="Programa">
              <select className="campo" value={form.programa_id} onChange={e => setForm({...form, programa_id: e.target.value})}>
                <option value="">Sin programa</option>
                {programas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Objetivo"><textarea className="campo" rows={2} value={form.objetivo} onChange={e => setForm({...form, objetivo: e.target.value})} /></Campo>
          <Campo label="Alcance"><textarea className="campo" rows={2} value={form.alcance} onChange={e => setForm({...form, alcance: e.target.value})} /></Campo>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear auditoría'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal hallazgos */}
      <Modal abierto={modalHallazgos} onCerrar={() => setModalHallazgos(false)} titulo={`Hallazgos — ${seleccionado?.titulo}`} size="xl" cerrarAlClickFuera={false}>
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { 
              // Auto-generate hallazgo code
              const siguienteNumero = hallazgos.length + 1;
              const codigo = `H-${String(siguienteNumero).padStart(3, '0')}`;
              setFormHall({ ...HALL_VACIO, codigo }); 
              setModalHallazgo(true); 
            }} className="btn-primario"><Plus size={16} />Registrar hallazgo</button>
          </div>
          {hallazgos.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No hay hallazgos registrados</p> : (
            <div className="space-y-3">
              {hallazgos.map(h => (
                <div key={h.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-unt-azul font-semibold">{h.codigo}</span>
                      <span className={`ml-2 text-xs font-medium ${colorClasif(h.clasificacion)}`}>[{h.clasificacion?.replace(/_/g,' ')}]</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getEstadoHallazgoStyle(h.estado)}`}>
                        {getEstadoHallazgoLabel(h.estado)}
                      </span>
                    </div>
                    <select 
                      className="campo w-auto text-xs"
                      value={h.estado}
                      onChange={e => cambiarEstadoHallazgo(h.id, e.target.value)}
                    >
                      <option value="abierto">Abierto</option>
                      <option value="en_proceso">En tratamiento</option>
                      <option value="cerrado">Cerrado</option>
                      <option value="verificado">Verificado</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-700">{h.descripcion}</p>
                  {h.evidencia_objetiva && <p className="text-xs text-gray-500 mt-1">Evidencia: {h.evidencia_objetiva}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal nuevo hallazgo */}
      <Modal abierto={modalHallazgo} onCerrar={() => setModalHallazgo(false)} titulo="Registrar hallazgo" size="md" cerrarAlClickFuera={false}>
        <form onSubmit={guardarHallazgo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" required><input className="campo" value={formHall.codigo} onChange={e => setFormHall({...formHall, codigo: e.target.value})} placeholder="H-001" /></Campo>
            <Campo label="Clasificación" required>
              <select className="campo" value={formHall.clasificacion} onChange={e => setFormHall({...formHall, clasificacion: e.target.value})}>
                {CLASIFS.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Descripción del hallazgo" required>
            <textarea className="campo" rows={3} value={formHall.descripcion} onChange={e => setFormHall({...formHall, descripcion: e.target.value})} />
          </Campo>
          <Campo label="Evidencia objetiva">
            <textarea className="campo" rows={2} value={formHall.evidencia_objetiva} onChange={e => setFormHall({...formHall, evidencia_objetiva: e.target.value})} />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Responsable de cierre">
              <select className="campo" value={formHall.responsable_id} onChange={e => setFormHall({...formHall, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
            <Campo label="Fecha límite"><input type="date" className="campo" value={formHall.fecha_limite} onChange={e => setFormHall({...formHall, fecha_limite: e.target.value})} /></Campo>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalHallazgo(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : 'Registrar hallazgo'}</button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar auditoría?" mensaje={`Se eliminará permanentemente "${seleccionado?.titulo}".`} />

      {/* Modal Equipo Auditoría */}
      <Modal abierto={modalEquipo} onCerrar={() => setModalEquipo(false)} titulo={`Equipo Auditoría — ${seleccionado?.codigo}`} size="lg" cerrarAlClickFuera={false}>
        <div className="space-y-4">
          {/* Formulario para agregar nuevo miembro */}
          <div className="grid grid-cols-2 gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50">
            <Campo label="Usuario">
              <select 
                id="nuevoUsuario" 
                className="campo"
                defaultValue=""
              >
                <option value="">Seleccionar usuario...</option>
                {usuarios.filter(u => !equipoAuditoria.some(ea => ea.usuario_id === u.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Rol">
              <select 
                id="nuevoRol" 
                className="campo"
                defaultValue="auditor"
              >
                <option value="auditor_lider">Auditor Líder</option>
                <option value="auditor">Auditor</option>
                <option value="observador">Observador</option>
              </select>
            </Campo>
            <div className="col-span-2 flex justify-end">
              <button 
                type="button" 
                className="btn-primario"
                onClick={() => {
                  const usuarioId = document.getElementById('nuevoUsuario').value;
                  const rol = document.getElementById('nuevoRol').value;
                  if (!usuarioId) {
                    toast.error('Seleccione un usuario');
                    return;
                  }
                  agregarMiembroEquipo(usuarioId, rol);
                  document.getElementById('nuevoUsuario').value = '';
                }}
              >
                <Plus size={16} /> Agregar Miembro
              </button>
            </div>
          </div>

          {/* Lista de miembros del equipo */}
          {equipoAuditoria.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay miembros en el equipo auditor
            </div>
          ) : (
            <div className="space-y-2">
              {equipoAuditoria.map((miembro) => (
                <div 
                  key={miembro.usuario_id} 
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-800">{miembro.nombre}</div>
                    <div className="text-xs text-gray-500">{miembro.correo}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge estado={miembro.rol_auditoria} />
                    {miembro.rol_auditoria !== 'auditor_lider' && (
                      <button 
                        onClick={() => eliminarMiembroEquipo(miembro.usuario_id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
