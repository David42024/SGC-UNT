'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Plus, Search, Download, Edit, Trash2, RefreshCw, ListChecks } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';

const TIPOS    = ['correctiva','preventiva','mejora'];
const ORIGENES = ['auditoria','queja','revision','autoevaluacion','otro'];
const IMPACTOS = ['bajo','medio','alto','critico'];
const ESTADOS  = ['abierto','en_proceso','verificado','cerrado'];
const METODOS  = ['5_porques','ishikawa','otro'];
const FORM_VACIO = { codigo:'', titulo:'', descripcion:'', tipo:'correctiva', origen:'auditoria', proceso_id:'', responsable_id:'', fecha_limite:'', impacto:'medio' };

export default function AccionesPage() {
  const [items, setItems]       = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [stats, setStats]       = useState(null);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar]     = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalForm, setModalForm]   = useState(false);
  const [modalPlanes, setModalPlanes] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [form, setForm]         = useState(FORM_VACIO);
  const [planes, setPlanes]     = useState([]);
  const [formPlan, setFormPlan] = useState({ actividad:'', responsable_id:'', fecha_inicio:'', fecha_limite:'' });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroTipo)   params.tipo   = filtroTipo;
      if (filtroEstado) params.estado = filtroEstado;
      const [res, procRes, usrRes, statsRes] = await Promise.all([
        api.get('/acciones', { params }),
        api.get('/procesos'),
        api.get('/usuarios'),
        api.get('/acciones/estadisticas'),
      ]);
      setItems(res.data.datos || []);
      setProcesos(procRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
      setStats(statsRes.data.datos);
    } catch { toast.error('Error al cargar acciones'); }
    finally  { setCargando(false); }
  }, [filtroTipo, filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = items.filter(i => !buscar || i.titulo?.toLowerCase().includes(buscar.toLowerCase()) || i.codigo?.toLowerCase().includes(buscar.toLowerCase()));

  const abrirNuevo = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const abrirEditar = (item) => { setSeleccionado(item); setForm({ codigo: item.codigo, titulo: item.titulo, descripcion: item.descripcion || '', tipo: item.tipo, origen: item.origen, proceso_id: item.proceso_id || '', responsable_id: item.responsable_id, fecha_limite: item.fecha_limite?.slice(0,10) || '', impacto: item.impacto }); setModalForm(true); };

  const abrirPlanes = async (item) => {
    setSeleccionado(item);
    try { const res = await api.get(`/acciones/${item.id}/planes`); setPlanes(res.data.datos || []); }
    catch { toast.error('Error al cargar planes'); }
    setModalPlanes(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.titulo || !form.responsable_id) { toast.error('Complete campos obligatorios'); return; }
    setGuardando(true);
    try {
      if (seleccionado) { await api.put(`/acciones/${seleccionado.id}`, form); toast.success('Acción actualizada'); }
      else              { await api.post('/acciones', form); toast.success('No conformidad registrada'); }
      setModalForm(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const guardarPlan = async (e) => {
    e.preventDefault();
    if (!formPlan.actividad || !formPlan.responsable_id || !formPlan.fecha_limite) { toast.error('Complete campos obligatorios'); return; }
    setGuardando(true);
    try {
      await api.post(`/acciones/${seleccionado.id}/planes`, { ...formPlan, orden: planes.length + 1 });
      toast.success('Actividad agregada');
      const res = await api.get(`/acciones/${seleccionado.id}/planes`);
      setPlanes(res.data.datos || []);
      setFormPlan({ actividad:'', responsable_id:'', fecha_inicio:'', fecha_limite:'' });
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const cambiarEstadoPlan = async (planId, estado) => {
    try {
      await api.patch(`/acciones/planes/${planId}/estado`, { estado });
      const res = await api.get(`/acciones/${seleccionado.id}/planes`);
      setPlanes(res.data.datos || []);
      toast.success('Estado actualizado');
    } catch { toast.error('Error al actualizar estado'); }
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/acciones/${seleccionado.id}`); toast.success('Eliminado'); setModalEliminar(false); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/acciones/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `capa-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  const colorImpacto = { bajo:'text-green-600', medio:'text-yellow-600', alto:'text-orange-600', critico:'text-red-600' };

  return (
    <div>
      <PageHeader titulo="Acciones Correctivas y Preventivas" descripcion="Gestión del ciclo CAPA — análisis de causa raíz y planes de acción" icono={AlertTriangle}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nueva acción</button>} />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard label="Total CAPA" valor={stats.total} icono={AlertTriangle} color="yellow" />
          {stats.por_tipo?.map(t => <StatCard key={t.tipo} label={t.tipo} valor={t.cantidad} icono={AlertTriangle} color={t.tipo === 'correctiva' ? 'red' : t.tipo === 'preventiva' ? 'blue' : 'green'} />)}
        </div>
      )}

      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar por código o título..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="campo w-auto" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="campo w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      <div className="tarjeta p-0 overflow-hidden">
        {cargando ? <CargandoPagina /> : filtrados.length === 0 ? (
          <EstadoVacio icono={AlertTriangle} titulo="No hay acciones registradas" descripcion="Registre no conformidades y acciones correctivas"
            accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nueva acción</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="tabla-encabezado">Código</th>
                  <th className="tabla-encabezado">Título</th>
                  <th className="tabla-encabezado">Tipo</th>
                  <th className="tabla-encabezado">Impacto</th>
                  <th className="tabla-encabezado">Responsable</th>
                  <th className="tabla-encabezado">F. Límite</th>
                  <th className="tabla-encabezado">Actividades</th>
                  <th className="tabla-encabezado">Estado</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="tabla-celda font-mono text-xs text-unt-azul font-semibold">{item.codigo}</td>
                    <td className="tabla-celda"><p className="font-medium text-gray-800 max-w-[200px] truncate">{item.titulo}</p></td>
                    <td className="tabla-celda"><Badge estado={item.tipo} /></td>
                    <td className="tabla-celda"><span className={`text-xs font-semibold ${colorImpacto[item.impacto]}`}>{item.impacto?.toUpperCase()}</span></td>
                    <td className="tabla-celda text-xs text-gray-500">{item.responsable_nombre}</td>
                    <td className="tabla-celda text-xs text-gray-500">{item.fecha_limite ? new Date(item.fecha_limite).toLocaleDateString('es-PE') : '—'}</td>
                    <td className="tabla-celda text-center">
                      <button onClick={() => abrirPlanes(item)} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100">
                        <ListChecks size={12} />{item.actividades_completadas || 0}/{item.total_actividades || 0}
                      </button>
                    </td>
                    <td className="tabla-celda"><Badge estado={item.estado} /></td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => descargarPDF(item.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                        <button onClick={() => abrirEditar(item)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                        <button onClick={() => { setSeleccionado(item); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal CAPA */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar acción' : 'Nueva no conformidad / acción'} size="lg">
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" required><input className="campo" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} placeholder="NC-2024-001" disabled={!!seleccionado} /></Campo>
            <Campo label="Tipo" required>
              <select className="campo" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Título" required><input className="campo" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} /></Campo>
          <Campo label="Descripción" required><textarea className="campo" rows={3} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></Campo>
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Origen">
              <select className="campo" value={form.origen} onChange={e => setForm({...form, origen: e.target.value})}>
                {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Campo>
            <Campo label="Impacto">
              <select className="campo" value={form.impacto} onChange={e => setForm({...form, impacto: e.target.value})}>
                {IMPACTOS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Campo>
            <Campo label="Fecha límite"><input type="date" className="campo" value={form.fecha_limite} onChange={e => setForm({...form, fecha_limite: e.target.value})} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Responsable" required>
              <select className="campo" value={form.responsable_id} onChange={e => setForm({...form, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
            <Campo label="Proceso relacionado">
              <select className="campo" value={form.proceso_id} onChange={e => setForm({...form, proceso_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal plan de acción */}
      <Modal abierto={modalPlanes} onCerrar={() => setModalPlanes(false)} titulo={`Plan de acción — ${seleccionado?.titulo}`} size="xl">
        <div className="space-y-5">
          <form onSubmit={guardarPlan} className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">Agregar actividad</h3>
            <Campo label="Actividad" required><input className="campo" value={formPlan.actividad} onChange={e => setFormPlan({...formPlan, actividad: e.target.value})} placeholder="Descripción de la actividad..." /></Campo>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="Responsable" required>
                <select className="campo" value={formPlan.responsable_id} onChange={e => setFormPlan({...formPlan, responsable_id: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
                </select>
              </Campo>
              <Campo label="Inicio"><input type="date" className="campo" value={formPlan.fecha_inicio} onChange={e => setFormPlan({...formPlan, fecha_inicio: e.target.value})} /></Campo>
              <Campo label="Límite" required><input type="date" className="campo" value={formPlan.fecha_limite} onChange={e => setFormPlan({...formPlan, fecha_limite: e.target.value})} /></Campo>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={guardando} className="btn-primario"><Plus size={15} />Agregar actividad</button>
            </div>
          </form>

          <div className="space-y-2">
            {planes.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No hay actividades en el plan</p> :
              planes.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                  <div className="w-7 h-7 bg-unt-azul/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-unt-azul text-xs font-bold">{i+1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.actividad}</p>
                    <p className="text-xs text-gray-500">{p.responsable_nombre} · Límite: {p.fecha_limite ? new Date(p.fecha_limite).toLocaleDateString('es-PE') : '—'}</p>
                  </div>
                  <select value={p.estado} onChange={e => cambiarEstadoPlan(p.id, e.target.value)} className="campo w-auto text-xs py-1">
                    {['pendiente','en_proceso','completado','cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))
            }
          </div>
        </div>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar acción?" mensaje={`Se eliminará "${seleccionado?.titulo}" permanentemente.`} />
    </div>
  );
}
