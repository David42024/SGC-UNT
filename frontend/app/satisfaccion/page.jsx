'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Star, Plus, Search, Download, Edit, Trash2, RefreshCw, BarChart, Send, Eye } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import clsx from 'clsx';

const TIPOS_PUBLICO = ['estudiante','docente','egresado','administrativo','todos'];
const TIPOS_PREG   = ['likert','opcion_multiple','texto_abierto','nps','si_no'];
const FORM_VACIO   = { titulo:'', descripcion:'', tipo_publico:'estudiante', fecha_inicio:'', fecha_cierre:'', anonima:true, responsable_id:'' };
const PREG_VACIO   = { orden:1, texto:'', tipo_pregunta:'likert', obligatoria:true, opciones:[], escala_min:1, escala_max:5 };

export default function SatisfaccionPage() {
  const [encuestas, setEncuestas]   = useState([]);
  const [usuarios, setUsuarios]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [buscar, setBuscar]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [preguntas, setPreguntas]   = useState([]);
  const [resultados, setResultados] = useState([]);
  const [modalForm, setModalForm]   = useState(false);
  const [modalPregs, setModalPregs] = useState(false);
  const [modalResultados, setModalResultados] = useState(false);
  const [modalEliminar, setModalEliminar]     = useState(false);
  const [form, setForm]             = useState(FORM_VACIO);
  const [formPreg, setFormPreg]     = useState(PREG_VACIO);
  const [opcionInput, setOpcionInput] = useState('');
  const [guardando, setGuardando]   = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      const [encRes, usrRes, statsRes] = await Promise.all([
        api.get('/satisfaccion', { params }),
        api.get('/usuarios'),
        api.get('/satisfaccion/estadisticas'),
      ]);
      setEncuestas(encRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
      setStats(statsRes.data.datos);
    } catch { toast.error('Error al cargar encuestas'); }
    finally  { setCargando(false); }
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = encuestas.filter(e =>
    !buscar || e.titulo?.toLowerCase().includes(buscar.toLowerCase())
  );

  const abrirNuevo  = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const abrirEditar = (enc) => {
    setSeleccionado(enc);
    setForm({ titulo: enc.titulo, descripcion: enc.descripcion || '', tipo_publico: enc.tipo_publico, fecha_inicio: enc.fecha_inicio?.slice(0,10) || '', fecha_cierre: enc.fecha_cierre?.slice(0,10) || '', anonima: enc.anonima, responsable_id: enc.responsable_id });
    setModalForm(true);
  };

  const abrirPreguntas = async (enc) => {
    setSeleccionado(enc);
    try {
      const res = await api.get(`/satisfaccion/${enc.id}/preguntas`);
      setPreguntas(res.data.datos || []);
    } catch { toast.error('Error al cargar preguntas'); }
    setFormPreg({ ...PREG_VACIO, orden: (preguntas.length || 0) + 1 });
    setModalPregs(true);
  };

  const abrirResultados = async (enc) => {
    setSeleccionado(enc);
    try {
      const res = await api.get(`/satisfaccion/${enc.id}/resultados`);
      setResultados(res.data.datos || []);
    } catch { toast.error('Error al cargar resultados'); }
    setModalResultados(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.responsable_id) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    try {
      if (seleccionado) { await api.put(`/satisfaccion/${seleccionado.id}`, form); toast.success('Encuesta actualizada'); }
      else              { await api.post('/satisfaccion', form); toast.success('Encuesta creada'); }
      setModalForm(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const cambiarEstado = async (enc, estado) => {
    try {
      await api.patch(`/satisfaccion/${enc.id}/estado`, { estado });
      toast.success(`Encuesta ${estado}`);
      cargar();
    } catch { toast.error('Error al cambiar estado'); }
  };

  const guardarPregunta = async (e) => {
    e.preventDefault();
    if (!formPreg.texto) { toast.error('Ingrese el texto de la pregunta'); return; }
    setGuardando(true);
    try {
      const payload = { ...formPreg, opciones: formPreg.opciones.length ? formPreg.opciones : undefined };
      await api.post(`/satisfaccion/${seleccionado.id}/preguntas`, payload);
      toast.success('Pregunta agregada');
      const res = await api.get(`/satisfaccion/${seleccionado.id}/preguntas`);
      setPreguntas(res.data.datos || []);
      setFormPreg({ ...PREG_VACIO, orden: (res.data.datos?.length || 0) + 1 });
      setOpcionInput('');
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally       { setGuardando(false); }
  };

  const eliminarPregunta = async (pregId) => {
    try {
      await api.delete(`/satisfaccion/preguntas/${pregId}`);
      const res = await api.get(`/satisfaccion/${seleccionado.id}/preguntas`);
      setPreguntas(res.data.datos || []);
      toast.success('Pregunta eliminada');
    } catch { toast.error('Error al eliminar pregunta'); }
  };

  const agregarOpcion = () => {
    if (!opcionInput.trim()) return;
    setFormPreg(p => ({ ...p, opciones: [...p.opciones, opcionInput.trim()] }));
    setOpcionInput('');
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/satisfaccion/${seleccionado.id}`); toast.success('Encuesta eliminada'); setModalEliminar(false); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/satisfaccion/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `encuesta-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  const colorPublico = { estudiante:'bg-blue-100 text-blue-700', docente:'bg-green-100 text-green-700', egresado:'bg-purple-100 text-purple-700', administrativo:'bg-orange-100 text-orange-700', todos:'bg-gray-100 text-gray-700' };

  return (
    <div>
      <PageHeader
        titulo="Gestión de la Satisfacción"
        descripcion="Encuestas para estudiantes, docentes y egresados con análisis estadístico en tiempo real"
        icono={Star}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nueva encuesta</button>}
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard label="Total encuestas" valor={stats.total} icono={Star} color="blue" />
          <StatCard label="Total respuestas" valor={stats.total_respuestas} icono={BarChart} color="green" tendencia="Acumuladas" />
          {stats.por_estado?.slice(0,2).map(s => (
            <StatCard key={s.estado} label={s.estado} valor={s.cantidad} icono={Star} color={s.estado === 'publicada' ? 'green' : 'yellow'} />
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar encuestas..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="campo w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {['borrador','publicada','cerrada'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Tabla */}
      <div className="tarjeta p-0 overflow-hidden">
        {cargando ? <CargandoPagina /> : filtrados.length === 0 ? (
          <EstadoVacio icono={Star} titulo="No hay encuestas" descripcion="Cree su primera encuesta de satisfacción"
            accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nueva encuesta</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="tabla-encabezado">Título</th>
                  <th className="tabla-encabezado">Público</th>
                  <th className="tabla-encabezado text-center">Preguntas</th>
                  <th className="tabla-encabezado text-center">Respuestas</th>
                  <th className="tabla-encabezado">Cierre</th>
                  <th className="tabla-encabezado">Estado</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(enc => (
                  <tr key={enc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="tabla-celda">
                      <p className="font-medium text-gray-800 max-w-[220px] truncate">{enc.titulo}</p>
                      <p className="text-xs text-gray-400">{enc.responsable_nombre}</p>
                    </td>
                    <td className="tabla-celda">
                      <span className={clsx('badge-estado capitalize', colorPublico[enc.tipo_publico])}>{enc.tipo_publico}</span>
                    </td>
                    <td className="tabla-celda text-center text-sm font-medium text-gray-700">{enc.total_preguntas || 0}</td>
                    <td className="tabla-celda text-center">
                      <span className="font-bold text-unt-azul">{enc.total_respuestas || 0}</span>
                    </td>
                    <td className="tabla-celda text-xs text-gray-500">
                      {enc.fecha_cierre ? new Date(enc.fecha_cierre).toLocaleDateString('es-PE') : '—'}
                    </td>
                    <td className="tabla-celda"><Badge estado={enc.estado} /></td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        {enc.estado === 'borrador' && (
                          <button onClick={() => cambiarEstado(enc, 'publicada')} title="Publicar" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Send size={15} /></button>
                        )}
                        {enc.estado === 'publicada' && (
                          <button onClick={() => cambiarEstado(enc, 'cerrada')} title="Cerrar" className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg text-xs font-medium px-2">Cerrar</button>
                        )}
                        <button onClick={() => abrirPreguntas(enc)} title="Preguntas" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Plus size={15} /></button>
                        <button onClick={() => abrirResultados(enc)} title="Resultados" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"><Eye size={15} /></button>
                        <button onClick={() => descargarPDF(enc.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                        <button onClick={() => abrirEditar(enc)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                        <button onClick={() => { setSeleccionado(enc); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal formulario ── */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar encuesta' : 'Nueva encuesta'} size="lg">
        <form onSubmit={guardar} className="space-y-4">
          <Campo label="Título" required>
            <input className="campo" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Encuesta de satisfacción estudiantil 2024" />
          </Campo>
          <Campo label="Descripción">
            <textarea className="campo" rows={2} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} />
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Público objetivo" required>
              <select className="campo" value={form.tipo_publico} onChange={e => setForm({...form, tipo_publico: e.target.value})}>
                {TIPOS_PUBLICO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label="Responsable" required>
              <select className="campo" value={form.responsable_id} onChange={e => setForm({...form, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Fecha de inicio">
              <input type="date" className="campo" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} />
            </Campo>
            <Campo label="Fecha de cierre">
              <input type="date" className="campo" value={form.fecha_cierre} onChange={e => setForm({...form, fecha_cierre: e.target.value})} />
            </Campo>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input type="checkbox" id="anonima" checked={form.anonima} onChange={e => setForm({...form, anonima: e.target.checked})} className="accent-unt-azul w-4 h-4" />
            <label htmlFor="anonima" className="text-sm text-gray-700 cursor-pointer">Encuesta anónima (no registrar identidad del respondente)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear encuesta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal preguntas ── */}
      <Modal abierto={modalPregs} onCerrar={() => setModalPregs(false)} titulo={`Preguntas — ${seleccionado?.titulo}`} size="xl">
        <div className="space-y-5">
          {/* Formulario nueva pregunta */}
          <form onSubmit={guardarPregunta} className="bg-gray-50 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-gray-700 text-sm">Agregar pregunta</h3>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Tipo de pregunta">
                <select className="campo" value={formPreg.tipo_pregunta} onChange={e => setFormPreg({...formPreg, tipo_pregunta: e.target.value, opciones: []})}>
                  {TIPOS_PREG.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </Campo>
              <Campo label={`Orden: ${formPreg.orden}`}>
                <input type="number" className="campo" value={formPreg.orden} onChange={e => setFormPreg({...formPreg, orden: parseInt(e.target.value)})} min={1} />
              </Campo>
            </div>
            <Campo label="Texto de la pregunta" required>
              <input className="campo" value={formPreg.texto} onChange={e => setFormPreg({...formPreg, texto: e.target.value})} placeholder="¿Cómo calificaría la calidad de la enseñanza?" />
            </Campo>
            {formPreg.tipo_pregunta === 'opcion_multiple' && (
              <div>
                <label className="etiqueta">Opciones de respuesta</label>
                <div className="flex gap-2 mb-2">
                  <input className="campo flex-1" value={opcionInput} onChange={e => setOpcionInput(e.target.value)} placeholder="Ingrese una opción..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarOpcion())} />
                  <button type="button" onClick={agregarOpcion} className="btn-secundario flex-shrink-0"><Plus size={15} /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formPreg.opciones.map((op, i) => (
                    <span key={i} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                      {op}
                      <button type="button" onClick={() => setFormPreg(p => ({ ...p, opciones: p.opciones.filter((_,j) => j !== i) }))} className="hover:text-red-500 ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {['likert','nps'].includes(formPreg.tipo_pregunta) && (
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Escala mínima"><input type="number" className="campo" value={formPreg.escala_min} onChange={e => setFormPreg({...formPreg, escala_min: parseInt(e.target.value)})} /></Campo>
                <Campo label="Escala máxima"><input type="number" className="campo" value={formPreg.escala_max} onChange={e => setFormPreg({...formPreg, escala_max: parseInt(e.target.value)})} /></Campo>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={formPreg.obligatoria} onChange={e => setFormPreg({...formPreg, obligatoria: e.target.checked})} className="accent-unt-azul w-4 h-4" />
                Pregunta obligatoria
              </label>
              <button type="submit" disabled={guardando} className="btn-primario"><Plus size={15} />Agregar pregunta</button>
            </div>
          </form>

          {/* Lista preguntas */}
          <div className="space-y-2">
            {preguntas.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No hay preguntas. Agregue la primera pregunta arriba.</p>
            ) : preguntas.map((p, i) => (
              <div key={p.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                <div className="w-7 h-7 bg-unt-azul/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-unt-azul text-xs font-bold">{p.orden}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.texto}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge estado={p.tipo_pregunta} />
                    {p.obligatoria && <span className="text-xs text-red-500">Obligatoria</span>}
                    {p.tipo_pregunta === 'likert' && <span className="text-xs text-gray-400">Escala {p.escala_min}–{p.escala_max}</span>}
                    {p.opciones && <span className="text-xs text-gray-400">{JSON.parse(p.opciones || '[]').length} opciones</span>}
                  </div>
                </div>
                <button onClick={() => eliminarPregunta(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Modal resultados ── */}
      <Modal abierto={modalResultados} onCerrar={() => setModalResultados(false)} titulo={`Resultados — ${seleccionado?.titulo}`} size="xl">
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex items-center justify-between border border-blue-100">
            <div>
              <p className="text-sm text-gray-600">Total de respuestas recibidas</p>
              <p className="text-3xl font-bold text-unt-azul">{seleccionado?.total_respuestas || 0}</p>
            </div>
            <Star size={40} className="text-blue-200" />
          </div>

          {resultados.length === 0 ? (
            <div className="text-center py-10">
              <BarChart size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-gray-400 text-sm">No hay resultados disponibles para esta encuesta.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {resultados.map((res, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="w-6 h-6 bg-unt-azul/10 rounded-full flex items-center justify-center text-unt-azul text-xs font-bold flex-shrink-0 mt-0.5">{res.pregunta?.orden}</span>
                    <p className="font-medium text-gray-800 flex-1">{res.pregunta?.texto}</p>
                    <Badge estado={res.pregunta?.tipo_pregunta} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Respuestas</p><p className="font-bold text-gray-800">{res.total_respuestas}</p></div>
                    {res.media && <div className="bg-blue-50 rounded-lg p-2"><p className="text-xs text-gray-500">Promedio</p><p className="font-bold text-unt-azul">{res.media}</p></div>}
                    {res.moda != null && <div className="bg-green-50 rounded-lg p-2"><p className="text-xs text-gray-500">Moda</p><p className="font-bold text-green-700">{res.moda}</p></div>}
                    {res.nps != null && <div className="bg-purple-50 rounded-lg p-2"><p className="text-xs text-gray-500">NPS</p><p className="font-bold text-purple-700">{res.nps}</p></div>}
                  </div>

                  {/* Gráfico para opción múltiple */}
                  {Object.keys(res.conteo_opciones || {}).length > 0 && (
                    <ResponsiveContainer width="100%" height={160}>
                      <RBarChart data={Object.entries(res.conteo_opciones).map(([k, v]) => ({ opcion: k, cantidad: v }))} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="opcion" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="cantidad" fill="#063B96" radius={[4,4,0,0]} />
                      </RBarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Barra Likert */}
                  {res.pregunta?.tipo_pregunta === 'likert' && res.media && (
                    <div className="mt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-4">1</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div className="h-full bg-unt-azul rounded-full transition-all" style={{ width: `${((parseFloat(res.media) - 1) / (res.pregunta.escala_max - 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-4">{res.pregunta.escala_max}</span>
                        <span className="font-bold text-unt-azul w-8">{res.media}</span>
                      </div>
                    </div>
                  )}

                  {/* Texto abierto */}
                  {res.respuestas_texto?.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                      {res.respuestas_texto.slice(0, 5).map((txt, j) => (
                        <p key={j} className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg italic">"{txt}"</p>
                      ))}
                      {res.respuestas_texto.length > 5 && (
                        <p className="text-xs text-gray-400 text-center">+{res.respuestas_texto.length - 5} respuestas más...</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar encuesta?" mensaje={`Se eliminará permanentemente "${seleccionado?.titulo}" y todas sus respuestas.`} />
    </div>
  );
}
