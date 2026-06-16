'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Award, Plus, Search, Download, Edit, Trash2, RefreshCw, ChevronRight, ChevronDown, FileCheck, AlertCircle } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import clsx from 'clsx';

const ESTADOS_EVID = ['no_iniciado','en_proceso','cumplido','no_cumplido'];
const FORM_VACIO   = { modelo_id:'', nombre:'', descripcion:'', periodo:'', fecha_inicio:'', fecha_fin:'', responsable_id:'' };
const EVID_VACIO   = { estandar_id:'', descripcion:'', tipo_evidencia:'documento', url_referencia:'', estado_cumplimiento:'no_iniciado', porcentaje_cumplimiento:0, observaciones:'', responsable_id:'' };

const colorEstado = (e) => ({
  cumplido:    'text-green-600 bg-green-50 border-green-200',
  en_proceso:  'text-blue-600 bg-blue-50 border-blue-200',
  no_cumplido: 'text-red-600 bg-red-50 border-red-200',
  no_iniciado: 'text-gray-500 bg-gray-50 border-gray-200',
}[e] || 'text-gray-500 bg-gray-50 border-gray-200');

const colorSemaforo = (pct) => pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-500';

export default function AcreditacionPage() {
  const [autoevals, setAutoevals]   = useState([]);
  const [modelos, setModelos]       = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [estandares, setEstandares] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [avance, setAvance]         = useState(null);
  const [expandidos, setExpandidos] = useState({});
  const [modalForm, setModalForm]   = useState(false);
  const [modalEvidencias, setModalEvidencias] = useState(false);
  const [modalNuevaEvid, setModalNuevaEvid]   = useState(false);
  const [modalEliminar, setModalEliminar]     = useState(false);
  const [form, setForm]             = useState(FORM_VACIO);
  const [formEvid, setFormEvid]     = useState(EVID_VACIO);
  const [guardando, setGuardando]   = useState(false);
  const [buscar, setBuscar]         = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [aeRes, modRes, usrRes] = await Promise.all([
        api.get('/acreditacion/autoevaluaciones'),
        api.get('/acreditacion/modelos'),
        api.get('/usuarios'),
      ]);
      setAutoevals(aeRes.data.datos || []);
      setModelos(modRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
    } catch { toast.error('Error al cargar autoevaluaciones'); }
    finally  { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = autoevals.filter(a =>
    !buscar || a.nombre?.toLowerCase().includes(buscar.toLowerCase()) || a.modelo_nombre?.toLowerCase().includes(buscar.toLowerCase())
  );

  const abrirNuevo  = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const abrirEditar = (ae) => {
    setSeleccionado(ae);
    setForm({ modelo_id: ae.modelo_id, nombre: ae.nombre, descripcion: ae.descripcion || '', periodo: ae.periodo || '', fecha_inicio: ae.fecha_inicio?.slice(0,10) || '', fecha_fin: ae.fecha_fin?.slice(0,10) || '', responsable_id: ae.responsable_id });
    setModalForm(true);
  };

  const abrirEvidencias = async (ae) => {
    setSeleccionado(ae);
    try {
      const [evidRes, avanceRes, estRes] = await Promise.all([
        api.get(`/acreditacion/autoevaluaciones/${ae.id}/evidencias`),
        api.get(`/acreditacion/autoevaluaciones/${ae.id}/avance`),
        ae.modelo_id ? api.get(`/acreditacion/modelos/${ae.modelo_id}/estandares`) : Promise.resolve({ data: { datos: [] } }),
      ]);
      setEvidencias(evidRes.data.datos || []);
      setAvance(avanceRes.data.datos);
      setEstandares(estRes.data.datos || []);
    } catch { toast.error('Error al cargar evidencias'); }
    setModalEvidencias(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.modelo_id || !form.nombre || !form.responsable_id) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    try {
      if (seleccionado) { await api.put(`/acreditacion/autoevaluaciones/${seleccionado.id}`, form); toast.success('Autoevaluación actualizada'); }
      else              { await api.post('/acreditacion/autoevaluaciones', form); toast.success('Autoevaluación creada'); }
      setModalForm(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const guardarEvidencia = async (e) => {
    e.preventDefault();
    if (!formEvid.estandar_id || !formEvid.descripcion) { toast.error('Seleccione estándar y añada descripción'); return; }
    setGuardando(true);
    try {
      await api.post(`/acreditacion/autoevaluaciones/${seleccionado.id}/evidencias`, formEvid);
      toast.success('Evidencia registrada');
      const [evidRes, avanceRes] = await Promise.all([
        api.get(`/acreditacion/autoevaluaciones/${seleccionado.id}/evidencias`),
        api.get(`/acreditacion/autoevaluaciones/${seleccionado.id}/avance`),
      ]);
      setEvidencias(evidRes.data.datos || []);
      setAvance(avanceRes.data.datos);
      setModalNuevaEvid(false);
      setFormEvid(EVID_VACIO);
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/acreditacion/autoevaluaciones/${seleccionado.id}`); toast.success('Autoevaluación eliminada'); setModalEliminar(false); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/acreditacion/autoevaluaciones/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `autoevaluacion-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  const toggleExpandir = (id) => setExpandidos(p => ({ ...p, [id]: !p[id] }));

  // Aplanar árbol de estándares para el select
  const aplanarEstandares = (nodos, nivel = 0) => {
    const lista = [];
    for (const n of nodos) {
      lista.push({ ...n, nivel });
      if (n.hijos?.length) lista.push(...aplanarEstandares(n.hijos, nivel + 1));
    }
    return lista;
  };
  const estandaresPlanos = aplanarEstandares(estandares);

  return (
    <div>
      <PageHeader
        titulo="Acreditación y Autoevaluación"
        descripcion="Gestión de estándares SINEACE, ISO 21001 y seguimiento de evidencias por criterio"
        icono={Award}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nueva autoevaluación</button>}
      />

      {/* Filtro */}
      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar autoevaluaciones..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Grid de autoevaluaciones */}
      {cargando ? <CargandoPagina /> : filtrados.length === 0 ? (
        <EstadoVacio icono={Award} titulo="No hay autoevaluaciones" descripcion="Inicie el proceso de acreditación creando una autoevaluación"
          accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nueva autoevaluación</button>} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(ae => (
            <div key={ae.id} className="tarjeta hover:shadow-md transition-shadow flex flex-col gap-4">
              {/* Cabecera */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{ae.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ae.modelo_nombre} · {ae.periodo || 'Sin período'}</p>
                </div>
                <Badge estado={ae.estado} />
              </div>

              {/* Responsable */}
              <div className="text-xs text-gray-500">
                <span className="font-medium">Responsable:</span> {ae.responsable_nombre}
              </div>

              {/* Fechas */}
              {(ae.fecha_inicio || ae.fecha_fin) && (
                <div className="flex gap-4 text-xs text-gray-500">
                  {ae.fecha_inicio && <span><span className="font-medium">Inicio:</span> {new Date(ae.fecha_inicio).toLocaleDateString('es-PE')}</span>}
                  {ae.fecha_fin && <span><span className="font-medium">Fin:</span> {new Date(ae.fecha_fin).toLocaleDateString('es-PE')}</span>}
                </div>
              )}

              {/* Acciones */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => abrirEvidencias(ae)} className="btn-primario flex-1 justify-center py-1.5">
                  <FileCheck size={14} />Evidencias
                </button>
                <button onClick={() => descargarPDF(ae.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Descargar PDF">
                  <Download size={16} />
                </button>
                <button onClick={() => abrirEditar(ae)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                  <Edit size={16} />
                </button>
                <button onClick={() => { setSeleccionado(ae); setModalEliminar(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal formulario ── */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar autoevaluación' : 'Nueva autoevaluación'} size="lg">
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Modelo de acreditación" required>
              <select className="campo" value={form.modelo_id} onChange={e => setForm({...form, modelo_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {modelos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Período" required>
              <input className="campo" value={form.periodo} onChange={e => setForm({...form, periodo: e.target.value})} placeholder="2024-I, 2024..." />
            </Campo>
          </div>
          <Campo label="Nombre" required>
            <input className="campo" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Autoevaluación institucional 2024" />
          </Campo>
          <Campo label="Descripción">
            <textarea className="campo" rows={2} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
          </Campo>
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Responsable" required>
              <select className="campo" value={form.responsable_id} onChange={e => setForm({...form, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
            <Campo label="Fecha inicio">
              <input type="date" className="campo" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} />
            </Campo>
            <Campo label="Fecha fin">
              <input type="date" className="campo" value={form.fecha_fin} onChange={e => setForm({...form, fecha_fin: e.target.value})} />
            </Campo>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear autoevaluación'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal evidencias ── */}
      <Modal abierto={modalEvidencias} onCerrar={() => setModalEvidencias(false)} titulo={`Evidencias — ${seleccionado?.nombre}`} size="xl">
        <div className="space-y-5">
          {/* Avance */}
          {avance && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Avance general</h3>
                <div className="flex items-center gap-2">
                  <div className={clsx('w-3 h-3 rounded-full', colorSemaforo(parseFloat(avance.promedio_cumplimiento) || 0))} />
                  <span className="font-bold text-lg text-gray-800">{avance.promedio_cumplimiento || 0}%</span>
                </div>
              </div>
              <div className="w-full bg-white rounded-full h-3 mb-3 overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all duration-500', colorSemaforo(parseFloat(avance.promedio_cumplimiento) || 0))}
                  style={{ width: `${avance.promedio_cumplimiento || 0}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: 'Cumplidos', val: avance.cumplidos, color: 'text-green-600' },
                  { label: 'En proceso', val: avance.en_proceso, color: 'text-blue-600' },
                  { label: 'No cumplidos', val: avance.no_cumplidos, color: 'text-red-600' },
                  { label: 'Sin iniciar', val: avance.no_iniciados, color: 'text-gray-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg p-2">
                    <p className={clsx('text-xl font-bold', s.color)}>{s.val || 0}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={() => { setFormEvid(EVID_VACIO); setModalNuevaEvid(true); }} className="btn-primario">
              <Plus size={15} />Registrar evidencia
            </button>
          </div>

          {/* Lista de evidencias agrupadas */}
          {evidencias.length === 0 ? (
            <div className="text-center py-10">
              <Award size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 text-sm">No hay evidencias registradas. Comience agregando la primera.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {evidencias.map(ev => (
                <div key={ev.id} className={clsx('border rounded-xl p-4 transition-all', colorEstado(ev.estado_cumplimiento))}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-unt-azul">{ev.estandar_codigo}</span>
                      <span className="ml-2 text-sm font-medium text-gray-800">{ev.estandar_nombre}</span>
                    </div>
                    <Badge estado={ev.estado_cumplimiento} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{ev.descripcion}</p>
                  {/* Barra de progreso */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/60 rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-current rounded-full transition-all" style={{ width: `${ev.porcentaje_cumplimiento}%` }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right">{ev.porcentaje_cumplimiento}%</span>
                  </div>
                  {ev.observaciones && <p className="text-xs text-gray-500 mt-2 italic">{ev.observaciones}</p>}
                  {ev.responsable_nombre && <p className="text-xs text-gray-400 mt-1">Responsable: {ev.responsable_nombre}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal nueva evidencia ── */}
      <Modal abierto={modalNuevaEvid} onCerrar={() => setModalNuevaEvid(false)} titulo="Registrar evidencia" size="md">
        <form onSubmit={guardarEvidencia} className="space-y-4">
          <Campo label="Estándar / Criterio" required>
            <select className="campo" value={formEvid.estandar_id} onChange={e => setFormEvid({...formEvid, estandar_id: e.target.value})}>
              <option value="">Seleccione un estándar...</option>
              {estandaresPlanos.map(est => (
                <option key={est.id} value={est.id}>
                  {'  '.repeat(est.nivel)}{est.codigo} — {est.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Descripción de la evidencia" required>
            <textarea className="campo" rows={3} value={formEvid.descripcion} onChange={e => setFormEvid({...formEvid, descripcion: e.target.value})} placeholder="Describa la evidencia que respalda el cumplimiento..." />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Estado de cumplimiento">
              <select className="campo" value={formEvid.estado_cumplimiento} onChange={e => setFormEvid({...formEvid, estado_cumplimiento: e.target.value})}>
                {ESTADOS_EVID.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
              </select>
            </Campo>
            <Campo label={`Porcentaje: ${formEvid.porcentaje_cumplimiento}%`}>
              <input type="range" min={0} max={100} value={formEvid.porcentaje_cumplimiento}
                onChange={e => setFormEvid({...formEvid, porcentaje_cumplimiento: parseInt(e.target.value)})}
                className="w-full mt-2 accent-unt-azul" />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Tipo de evidencia">
              <select className="campo" value={formEvid.tipo_evidencia} onChange={e => setFormEvid({...formEvid, tipo_evidencia: e.target.value})}>
                {['documento','registro','acta','informe','certificado','otro'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label="Responsable">
              <select className="campo" value={formEvid.responsable_id} onChange={e => setFormEvid({...formEvid, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="URL de referencia">
            <input className="campo" value={formEvid.url_referencia} onChange={e => setFormEvid({...formEvid, url_referencia: e.target.value})} placeholder="https://..." />
          </Campo>
          <Campo label="Observaciones">
            <textarea className="campo" rows={2} value={formEvid.observaciones} onChange={e => setFormEvid({...formEvid, observaciones: e.target.value})} />
          </Campo>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalNuevaEvid(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : 'Registrar evidencia'}
            </button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar autoevaluación?" mensaje={`Se eliminará permanentemente "${seleccionado?.nombre}" y todas sus evidencias.`} />
    </div>
  );
}
