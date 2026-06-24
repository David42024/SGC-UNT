'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Shield, Plus, Search, Download, Edit, Trash2, RefreshCw, Grid3X3 } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import clsx from 'clsx';

const NIVELES    = ['bajo','moderado','alto','critico'];
const ESTRATEGAS = ['mitigar','aceptar','transferir','evitar','explotar'];
const FORM_VACIO = { codigo:'', nombre:'', descripcion:'', categoria_id:'', proceso_id:'', responsable_id:'', tipo_riesgo:'negativo', probabilidad:3, impacto:3, clasificacion_nivel:'moderado', descripcion_control_actual:'' };

const colorNivel = (n) => ({ bajo:'bg-green-100 text-green-700', moderado:'bg-yellow-100 text-yellow-700', alto:'bg-orange-100 text-orange-700', critico:'bg-red-100 text-red-700' }[n] || 'bg-gray-100 text-gray-600');
const bgCelda = (val) => val >= 20 ? 'bg-red-500' : val >= 12 ? 'bg-orange-400' : val >= 6 ? 'bg-yellow-300' : 'bg-green-300';

export default function RiesgosPage() {
  const [riesgos, setRiesgos]       = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [procesos, setProcesos]     = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [matriz, setMatriz]         = useState([]);
  const [stats, setStats]           = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [buscar, setBuscar]         = useState('');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [vista, setVista]           = useState('tabla');
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalForm, setModalForm]   = useState(false);
  const [modalMitig, setModalMitig] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [form, setForm]             = useState(FORM_VACIO);
  const [planes, setPlanes]         = useState([]);
  const [formPlan, setFormPlan]     = useState({ estrategia:'mitigar', accion:'', responsable_id:'', fecha_limite:'' });
  const [guardando, setGuardando]   = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroNivel) params.clasificacion_nivel = filtroNivel;
      const [rRes, catRes, procRes, usrRes, statsRes, matrizRes] = await Promise.all([
        api.get('/riesgos', { params }),
        api.get('/riesgos/categorias'),
        api.get('/procesos'),
        api.get('/usuarios'),
        api.get('/riesgos/estadisticas'),
        api.get('/riesgos/matriz'),
      ]);
      setRiesgos(rRes.data.datos || []);
      setCategorias(catRes.data.datos || []);
      setProcesos(procRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
      setStats(statsRes.data.datos);
      setMatriz(matrizRes.data.datos || []);
    } catch { toast.error('Error al cargar riesgos'); }
    finally  { setCargando(false); }
  }, [filtroNivel]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = riesgos.filter(r => !buscar || r.nombre?.toLowerCase().includes(buscar.toLowerCase()) || r.codigo?.toLowerCase().includes(buscar.toLowerCase()));

  const abrirNuevo = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const abrirEditar = (r) => { setSeleccionado(r); setForm({ codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion || '', categoria_id: r.categoria_id, proceso_id: r.proceso_id || '', responsable_id: r.responsable_id, tipo_riesgo: r.tipo_riesgo, probabilidad: r.probabilidad, impacto: r.impacto, clasificacion_nivel: r.clasificacion_nivel, descripcion_control_actual: r.descripcion_control_actual || '' }); setModalForm(true); };

  const abrirMitigacion = async (r) => {
    setSeleccionado(r);
    try { const res = await api.get(`/riesgos/${r.id}/planes`); setPlanes(res.data.datos || []); }
    catch { toast.error('Error al cargar planes'); }
    setModalMitig(true);
  };

  const calcNivel = (p, i) => { const v = p * i; return v >= 20 ? 'critico' : v >= 12 ? 'alto' : v >= 6 ? 'moderado' : 'bajo'; };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.nombre || !form.categoria_id || !form.responsable_id) { toast.error('Complete campos obligatorios'); return; }
    const payload = { ...form, clasificacion_nivel: calcNivel(form.probabilidad, form.impacto) };
    setGuardando(true);
    try {
      if (seleccionado) { await api.put(`/riesgos/${seleccionado.id}`, payload); toast.success('Riesgo actualizado'); }
      else              { await api.post('/riesgos', payload); toast.success('Riesgo registrado'); }
      setModalForm(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const guardarPlan = async (e) => {
    e.preventDefault();
    if (!formPlan.accion || !formPlan.responsable_id) { toast.error('Complete campos obligatorios'); return; }
    setGuardando(true);
    try {
      await api.post(`/riesgos/${seleccionado.id}/planes`, formPlan);
      toast.success('Plan de mitigación agregado');
      const res = await api.get(`/riesgos/${seleccionado.id}/planes`);
      setPlanes(res.data.datos || []);
      setFormPlan({ estrategia:'mitigar', accion:'', responsable_id:'', fecha_limite:'' });
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/riesgos/${seleccionado.id}`); toast.success('Riesgo eliminado'); setModalEliminar(false); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/riesgos/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `riesgo-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  // Construir matriz 5x5
  const getConteo = (p, i) => {
    const fila = matriz.find(m => parseInt(m.probabilidad) === p && parseInt(m.impacto) === i);
    return fila ? parseInt(fila.cantidad) : 0;
  };

  return (
    <div>
      <PageHeader titulo="Gestión de Riesgos" descripcion="Identificación, evaluación y control de riesgos institucionales — Matriz 5×5" icono={Shield}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nuevo riesgo</button>} />

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard label="Total riesgos" valor={stats.total} icono={Shield} color="blue" />
          {stats.por_nivel?.map(n => <StatCard key={n.clasificacion_nivel} label={n.clasificacion_nivel} valor={n.cantidad} icono={Shield} color={n.clasificacion_nivel === 'critico' ? 'red' : n.clasificacion_nivel === 'alto' ? 'yellow' : 'green'} />)}
        </div>
      )}

      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar riesgos..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="campo w-auto" value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}>
            <option value="">Todos los niveles</option>
            {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('tabla')} className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', vista === 'tabla' ? 'bg-white text-unt-azul shadow-sm' : 'text-gray-500')}>Tabla</button>
            <button onClick={() => setVista('matriz')} className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1', vista === 'matriz' ? 'bg-white text-unt-azul shadow-sm' : 'text-gray-500')}>
              <Grid3X3 size={13} />Matriz
            </button>
          </div>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      {cargando ? <CargandoPagina /> : vista === 'matriz' ? (
        <div className="tarjeta">
          <h2 className="font-semibold text-gray-800 mb-4">Matriz de riesgos 5×5 (Probabilidad × Impacto)</h2>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <div className="flex items-end gap-1 mb-1">
                <div className="w-24 text-xs text-gray-500 text-right pr-2">Probabilidad ↑</div>
                {[1,2,3,4,5].map(i => <div key={i} className="w-16 text-center text-xs font-medium text-gray-600">{i}</div>)}
              </div>
              {[5,4,3,2,1].map(p => (
                <div key={p} className="flex items-center gap-1 mb-1">
                  <div className="w-24 text-xs text-gray-500 text-right pr-2 font-medium">{p}</div>
                  {[1,2,3,4,5].map(i => {
                    const val = p * i;
                    const cnt = getConteo(p, i);
                    return (
                      <div key={i} className={clsx('w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white transition-all cursor-default', bgCelda(val))}>
                        <span className="text-sm font-bold">{val}</span>
                        {cnt > 0 && <span className="text-xs bg-white/30 rounded-full px-1.5">{cnt}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="flex items-start gap-1 mt-1">
                <div className="w-24" />
                {[1,2,3,4,5].map(i => <div key={i} className="w-16 text-center text-xs text-gray-500">Impacto {i}</div>)}
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            {[{label:'Bajo (1-5)', color:'bg-green-300'},{label:'Moderado (6-11)', color:'bg-yellow-300'},{label:'Alto (12-19)', color:'bg-orange-400'},{label:'Crítico (20-25)', color:'bg-red-500'}].map(l => (
              <div key={l.label} className="flex items-center gap-2 text-xs text-gray-600"><div className={`w-3 h-3 rounded ${l.color}`} />{l.label}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="tarjeta p-0 overflow-hidden">
          {filtrados.length === 0 ? (
            <EstadoVacio icono={Shield} titulo="No hay riesgos registrados" descripcion="Comience identificando los riesgos institucionales"
              accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nuevo riesgo</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="tabla-encabezado">Código</th>
                    <th className="tabla-encabezado">Nombre</th>
                    <th className="tabla-encabezado">Categoría</th>
                    <th className="tabla-encabezado text-center">P</th>
                    <th className="tabla-encabezado text-center">I</th>
                    <th className="tabla-encabezado text-center">Nivel</th>
                    <th className="tabla-encabezado">Responsable</th>
                    <th className="tabla-encabezado">Estado</th>
                    <th className="tabla-encabezado text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtrados.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="tabla-celda font-mono text-xs text-unt-azul font-semibold">{r.codigo}</td>
                      <td className="tabla-celda"><p className="font-medium text-gray-800 max-w-[200px] truncate">{r.nombre}</p></td>
                      <td className="tabla-celda text-xs text-gray-500">{r.categoria_nombre}</td>
                      <td className="tabla-celda text-center font-bold text-gray-700">{r.probabilidad}</td>
                      <td className="tabla-celda text-center font-bold text-gray-700">{r.impacto}</td>
                      <td className="tabla-celda text-center">
                        <span className={clsx('badge-estado', colorNivel(r.clasificacion_nivel))}>{r.probabilidad * r.impacto} — {r.clasificacion_nivel}</span>
                      </td>
                      <td className="tabla-celda text-xs text-gray-500">{r.responsable_nombre}</td>
                      <td className="tabla-celda"><Badge estado={r.estado} /></td>
                      <td className="tabla-celda">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => abrirMitigacion(r)} title="Plan de mitigación" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"><Shield size={15} /></button>
                          <button onClick={() => descargarPDF(r.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                          <button onClick={() => abrirEditar(r)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                          <button onClick={() => { setSeleccionado(r); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal riesgo */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar riesgo' : 'Nuevo riesgo'} size="lg">
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" required><input className="campo" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} placeholder="RIE-001" disabled={!!seleccionado} /></Campo>
            <Campo label="Categoría" required>
              <select className="campo" value={form.categoria_id} onChange={e => setForm({...form, categoria_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Nombre del riesgo" required><input className="campo" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></Campo>
          <Campo label="Descripción"><textarea className="campo" rows={2} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></Campo>
          <div className="grid grid-cols-3 gap-4">
            <Campo label={`Probabilidad: ${form.probabilidad}`} required>
              <input type="range" min={1} max={5} value={form.probabilidad} onChange={e => setForm({...form, probabilidad: parseInt(e.target.value)})} className="w-full accent-unt-azul" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>5</span></div>
            </Campo>
            <Campo label={`Impacto: ${form.impacto}`} required>
              <input type="range" min={1} max={5} value={form.impacto} onChange={e => setForm({...form, impacto: parseInt(e.target.value)})} className="w-full accent-unt-azul" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1</span><span>5</span></div>
            </Campo>
            <div>
              <label className="etiqueta">Nivel calculado</label>
              <div className={clsx('mt-1 px-3 py-2 rounded-lg text-sm font-bold text-center', colorNivel(calcNivel(form.probabilidad, form.impacto)))}>
                {form.probabilidad * form.impacto} — {calcNivel(form.probabilidad, form.impacto).toUpperCase()}
              </div>
            </div>
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
          <Campo label="Controles actuales"><textarea className="campo" rows={2} value={form.descripcion_control_actual} onChange={e => setForm({...form, descripcion_control_actual: e.target.value})} /></Campo>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Registrar riesgo'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal mitigación */}
      <Modal abierto={modalMitig} onCerrar={() => setModalMitig(false)} titulo={`Plan de mitigación — ${seleccionado?.nombre}`} size="xl">
        <div className="space-y-5">
          <form onSubmit={guardarPlan} className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">Agregar plan de tratamiento</h3>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Estrategia">
                <select className="campo" value={formPlan.estrategia} onChange={e => setFormPlan({...formPlan, estrategia: e.target.value})}>
                  {ESTRATEGAS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Campo>
              <Campo label="Responsable" required>
                <select className="campo" value={formPlan.responsable_id} onChange={e => setFormPlan({...formPlan, responsable_id: e.target.value})}>
                  <option value="">Seleccione...</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
                </select>
              </Campo>
            </div>
            <Campo label="Acción de tratamiento" required><textarea className="campo" rows={2} value={formPlan.accion} onChange={e => setFormPlan({...formPlan, accion: e.target.value})} /></Campo>
            <div className="flex justify-end"><button type="submit" disabled={guardando} className="btn-primario"><Plus size={15} />Agregar</button></div>
          </form>
          <div className="space-y-2">
            {planes.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">No hay planes de mitigación</p> :
              planes.map(p => (
                <div key={p.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge estado={p.estrategia} />
                    <Badge estado={p.estado} />
                  </div>
                  <p className="text-sm text-gray-700">{p.accion}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.responsable_nombre}</p>
                </div>
              ))
            }
          </div>
        </div>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar riesgo?" mensaje={`Se eliminará permanentemente "${seleccionado?.nombre}".`} />
    </div>
  );
}
