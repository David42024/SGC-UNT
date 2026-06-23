'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Star, Plus, Search, Download, Edit, Trash2, RefreshCw, BarChart, Send, Eye, Play, Pause, Calendar, List, Share2 } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import clsx from 'clsx';

const TIPOS_PUBLICO = ['estudiante','docente','egresado','administrativo','todos'];
const TIPOS_PREG   = ['likert','opcion_multiple','texto_abierto','nps','si_no'];
const FORM_VACIO   = { titulo:'', descripcion:'', tipo_publico:'estudiante', fecha_inicio:'', fecha_cierre:'', anonima:true, responsable_id:'', visibilidad:'publica', privacidad:'anonima', estructura_json:'' };
const PREG_VACIO   = { orden:1, texto:'', tipo_pregunta:'likert', obligatoria:true, opciones:[], escala_min:1, escala_max:5 };

const colorVisibilidad = { publica: 'bg-blue-100 text-blue-700', estudiante: 'bg-indigo-100 text-indigo-700', privada: 'bg-gray-100 text-gray-700' };
const colorPrivacidad = { anonima: 'bg-green-100 text-green-700', no_anonima: 'bg-orange-100 text-orange-700' };

const obtenerTextoLocalizado = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.es || val.default || Object.values(val)[0] || '';
  }
  return String(val);
};

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

  // Estados nuevos
  const [modalFechas, setModalFechas] = useState(false);
  const [formFechas, setFormFechas] = useState({ fecha_inicio: '', fecha_cierre: '', motivo: '' });
  const [modalRespuestas, setModalRespuestas] = useState(false);
  const [respuestasList, setRespuestasList] = useState([]);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState(null);
  const [paginaRespuestas, setPaginaRespuestas] = useState(1);
  const [verJsonCrudo, setVerJsonCrudo] = useState(false);

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
    setForm({
      titulo: enc.titulo,
      descripcion: enc.descripcion || '',
      tipo_publico: enc.tipo_publico,
      fecha_inicio: enc.fecha_inicio?.slice(0,10) || '',
      fecha_cierre: enc.fecha_cierre?.slice(0,10) || '',
      anonima: enc.anonima,
      responsable_id: enc.responsable_id,
      visibilidad: enc.visibilidad || 'publica',
      privacidad: enc.privacidad || 'anonima',
      estructura_json: enc.estructura_json ? (typeof enc.estructura_json === 'string' ? enc.estructura_json : JSON.stringify(enc.estructura_json, null, 2)) : ''
    });
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

  const abrirFechas = (enc) => {
    setSeleccionado(enc);
    setFormFechas({
      fecha_inicio: enc.fecha_inicio?.slice(0,10) || '',
      fecha_cierre: enc.fecha_cierre?.slice(0,10) || '',
      motivo: ''
    });
    setModalFechas(true);
  };

  const guardarFechas = async (e) => {
    e.preventDefault();
    if (!formFechas.motivo) { toast.error('Ingrese el motivo del cambio'); return; }
    setGuardando(true);
    try {
      await api.post(`/satisfaccion/${seleccionado.id}/fechas`, {
        fecha_inicio_nueva: formFechas.fecha_inicio,
        fecha_cierre_nueva: formFechas.fecha_cierre,
        motivo: formFechas.motivo
      });
      toast.success('Fechas actualizadas correctamente');
      setModalFechas(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar fechas');
    } finally {
      setGuardando(false);
    }
  };

  const obtenerArchivosDeRespuesta = (respuestasJson) => {
    if (!respuestasJson) return [];
    const archivos = [];
    Object.entries(respuestasJson).forEach(([key, val]) => {
      if (Array.isArray(val)) {
        val.forEach(item => {
          if (item && item.name && item.content && String(item.content).startsWith('data:')) {
            archivos.push(item);
          }
        });
      } else if (val && typeof val === 'object') {
        if (val.name && val.content && String(val.content).startsWith('data:')) {
          archivos.push(val);
        }
      }
    });
    return archivos;
  };

  const descargarArchivoBase64 = (file) => {
    try {
      const link = document.createElement('a');
      link.href = file.content;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Error al descargar el archivo');
    }
  };

  const renderizarRespuestasVisual = (respJson) => {
    if (!seleccionado) return null;

    if (!seleccionado.estructura_json) {
      if (preguntas.length === 0) {
        return <p className="text-gray-500 text-xs italic">La encuesta no contiene preguntas.</p>;
      }

      return (
        <div className="space-y-4">
          {preguntas.map((q, idx) => {
            const respuesta = respJson ? respJson[q.id] : undefined;
            const tieneRespuesta = respuesta !== undefined && respuesta !== null;

            return (
              <div key={q.id || idx} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:border-gray-200 transition-colors">
                <p className="text-xs font-semibold text-gray-400 mb-1">Pregunta {q.orden || (idx + 1)} — {q.tipo_pregunta.toUpperCase().replace(/_/g, ' ')}</p>
                <p className="font-medium text-gray-800 text-sm mb-3">{q.texto}</p>

                <div className="pl-3 border-l-2 border-unt-azul/30 py-0.5">
                  {!tieneRespuesta ? (
                    <span className="text-xs text-gray-400 italic">Sin respuesta</span>
                  ) : q.tipo_pregunta === 'si_no' ? (
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-semibold',
                      respuesta === 'SÍ' || respuesta === true || String(respuesta).toLowerCase() === 'si' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    )}>
                      {String(respuesta).toUpperCase()}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-700 font-medium bg-gray-50/50 p-2 rounded border border-gray-100/50 inline-block min-w-[120px] whitespace-pre-wrap">
                      {String(respuesta)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    let schema = {};
    try {
      schema = typeof seleccionado.estructura_json === 'string' 
        ? JSON.parse(seleccionado.estructura_json) 
        : seleccionado.estructura_json;
    } catch (err) {
      schema = {};
    }

    const questions = [];
    if (schema && Array.isArray(schema.pages)) {
      schema.pages.forEach(page => {
        if (Array.isArray(page.elements)) {
          page.elements.forEach(el => {
            questions.push(el);
          });
        }
      });
    }

    if (questions.length === 0) {
      return <p className="text-gray-500 text-xs italic">La estructura de la encuesta no contiene preguntas.</p>;
    }

    return (
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const respuesta = respJson ? respJson[q.name] : undefined;
          const tieneRespuesta = respuesta !== undefined && respuesta !== null;

          return (
            <div key={idx} className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:border-gray-200 transition-colors">
              <p className="text-xs font-semibold text-gray-400 mb-1">Pregunta {idx + 1} — {q.type.toUpperCase()}</p>
              <p className="font-medium text-gray-800 text-sm mb-3">{obtenerTextoLocalizado(q.title || q.name)}</p>

              <div className="pl-3 border-l-2 border-unt-azul/30 py-0.5">
                {!tieneRespuesta ? (
                  <span className="text-xs text-gray-400 italic">Sin respuesta</span>
                ) : q.type === 'file' ? (
                  <div className="space-y-2">
                    {Array.isArray(respuesta) ? (
                      respuesta.map((file, fIdx) => (
                        <div key={fIdx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5 max-w-md">
                          <span className="text-xs font-medium text-gray-700 truncate mr-2">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => descargarArchivoBase64(file)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-unt-azul hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors"
                          >
                            <Download size={12} />
                            Descargar
                          </button>
                        </div>
                      ))
                    ) : respuesta && typeof respuesta === 'object' ? (
                      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5 max-w-md">
                        <span className="text-xs font-medium text-gray-700 truncate mr-2">{respuesta.name}</span>
                        <button
                          type="button"
                          onClick={() => descargarArchivoBase64(respuesta)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-unt-azul hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors"
                        >
                          <Download size={12} />
                          Descargar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600">{String(respuesta)}</span>
                    )}
                  </div>
                ) : q.type === 'boolean' ? (
                  <span className={clsx(
                    'px-2 py-0.5 rounded text-xs font-semibold',
                    respuesta ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {respuesta ? 'SÍ' : 'NO'}
                  </span>
                ) : (
                  <p className="text-xs text-gray-700 font-medium bg-gray-50/50 p-2 rounded border border-gray-100/50 inline-block min-w-[120px] whitespace-pre-wrap">
                    {String(respuesta)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const abrirRespuestas = async (enc) => {
    setSeleccionado(enc);
    setRespuestaSeleccionada(null);
    setPaginaRespuestas(1);
    setVerJsonCrudo(false);
    try {
      const [resResp, resPreg] = await Promise.all([
        api.get(`/satisfaccion/${enc.id}/respuestas`),
        !enc.estructura_json ? api.get(`/satisfaccion/${enc.id}/preguntas`) : Promise.resolve({ data: { datos: [] } })
      ]);
      setRespuestasList(resResp.data.datos || []);
      setPreguntas(resPreg.data.datos || []);
    } catch { toast.error('Error al cargar respuestas'); }
    setModalRespuestas(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.titulo) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    
    // Validar y parsear estructura_json antes de enviar si está llena
    let parseadoJson = null;
    if (form.estructura_json && form.estructura_json.trim()) {
      try {
        parseadoJson = JSON.parse(form.estructura_json);
      } catch {
        toast.error('La estructura JSON de la encuesta es inválida.');
        setGuardando(false);
        return;
      }
    }

    const payload = {
      ...form,
      anonima: form.privacidad === 'anonima',
      estructura_json: parseadoJson
    };

    try {
      if (seleccionado) { await api.put(`/satisfaccion/${seleccionado.id}`, payload); toast.success('Encuesta actualizada'); }
      else              { await api.post('/satisfaccion', payload); toast.success('Encuesta creada'); }
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

  const copiarEnlace = (enc) => {
    const url = `${window.location.origin}/encuestas/${enc.uuid}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => toast.success('Enlace copiado correctamente'))
        .catch(() => toast.error('Error al copiar el enlace'));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'absolute';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Enlace copiado correctamente');
      } catch (err) {
        toast.error('Error al copiar el enlace');
      }
      document.body.removeChild(textArea);
    }
  };

  const colorPublico = { estudiante:'bg-blue-100 text-blue-700', docente:'bg-green-100 text-green-700', egresado:'bg-purple-100 text-purple-700', administrativo:'bg-orange-100 text-orange-700', todos:'bg-gray-100 text-gray-700' };

  const totalPaginas = Math.ceil(respuestasList.length / 10) || 1;
  const respuestasPaginadas = respuestasList.slice((paginaRespuestas - 1) * 10, paginaRespuestas * 10);

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
          <select className="campo w-auto font-medium" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En Progreso</option>
            <option value="finalizado">Finalizado</option>
            <option value="suspendido">Suspendido</option>
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
                  <th className="tabla-encabezado">Visibilidad</th>
                  <th className="tabla-encabezado">Privacidad</th>
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
                      <span className={clsx('badge-estado', colorVisibilidad[enc.visibilidad || 'publica'])}>
                        {enc.visibilidad === 'publica' ? 'Pública' : enc.visibilidad === 'estudiante' ? 'Estudiantes' : 'Privada'}
                      </span>
                    </td>
                    <td className="tabla-celda">
                      <span className={clsx('badge-estado', colorPrivacidad[enc.privacidad || 'anonima'])}>
                        {enc.privacidad === 'anonima' ? 'Anónima' : 'No Anónima'}
                      </span>
                    </td>
                    <td className="tabla-celda text-center">
                      <span className="font-bold text-unt-azul">{enc.total_respuestas || 0}</span>
                    </td>
                    <td className="tabla-celda text-xs text-gray-500">
                      {enc.fecha_cierre ? new Date(enc.fecha_cierre).toLocaleDateString('es-PE') : '—'}
                    </td>
                    <td className="tabla-celda"><Badge estado={enc.estado} /></td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Toggle de suspensión */}
                        {enc.estado !== 'suspendido' && enc.estado !== 'finalizado' && (
                          <button onClick={() => cambiarEstado(enc, 'suspendido')} title="Suspender Encuesta" className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg">
                            <Pause size={15} />
                          </button>
                        )}
                        {enc.estado === 'suspendido' && (
                          <button onClick={() => cambiarEstado(enc, 'activo')} title="Republicar Encuesta" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                            <Play size={15} />
                          </button>
                        )}

                        {/* Modificar fechas */}
                        <button onClick={() => abrirFechas(enc)} title="Modificar Fechas" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Calendar size={15} />
                        </button>

                        {/* Ver respuestas individuales */}
                        <button onClick={() => abrirRespuestas(enc)} title="Ver Respuestas" className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg">
                          <List size={15} />
                        </button>

                        {/* Preguntas Legacy (solo si no tiene estructura JSON de SurveyJS) */}
                        {!enc.estructura_json && (
                          <button onClick={() => abrirPreguntas(enc)} title="Preguntas Legacy" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Plus size={15} />
                          </button>
                        )}

                        {/* Ver estadísticas de resultados */}
                        <button onClick={() => abrirResultados(enc)} title="Ver Estadísticas" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg">
                          <Eye size={15} />
                        </button>

                        {/* Compartir enlace */}
                        <button onClick={() => copiarEnlace(enc)} title="Compartir Enlace" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Share2 size={15} />
                        </button>

                        {/* Descargar PDF */}
                        <button onClick={() => descargarPDF(enc.id)} title="Descargar PDF" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                          <Download size={15} />
                        </button>

                        {/* Editar */}
                        <button onClick={() => abrirEditar(enc)} title="Editar Encuesta" className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <Edit size={15} />
                        </button>

                        {/* Eliminar */}
                        <button onClick={() => { setSeleccionado(enc); setModalEliminar(true); }} title="Eliminar" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={15} />
                        </button>
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
            <Campo label="Visibilidad" required>
              <select className="campo" value={form.visibilidad} onChange={e => setForm({...form, visibilidad: e.target.value})}>
                <option value="publica">Pública (todos)</option>
                <option value="estudiante">De Estudiantes (código de 10 dígitos)</option>
                <option value="privada" disabled>Privada (requiere login) [Próximamente]</option>
              </select>
            </Campo>
            <Campo label="Privacidad" required>
              <select className="campo" value={form.privacidad} onChange={e => setForm({...form, privacidad: e.target.value})}>
                <option value="anonima">Anónima (no registrar identidad)</option>
                <option value="no_anonima">No Anónima (registrar código de estudiante)</option>
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Fecha de inicio">
              <input type="date" className="campo disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" value={form.fecha_inicio} onChange={e => setForm({...form, fecha_inicio: e.target.value})} disabled={!!seleccionado} />
            </Campo>
            <Campo label="Fecha de cierre">
              <input type="date" className="campo disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" value={form.fecha_cierre} onChange={e => setForm({...form, fecha_cierre: e.target.value})} disabled={!!seleccionado} />
            </Campo>
          </div>
          <Campo label="Estructura JSON (Esquema SurveyJS)">
            <div className="mb-1 text-xs text-gray-500">
              Diseñe su encuesta en el{' '}
              <a href="https://surveyjs.io/create-free-survey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                SurveyJS Creator Oficial (link externo)
              </a>{' '}
              y pegue el esquema JSON generado a continuación.
            </div>
            <textarea
              className="campo font-mono text-xs"
              rows={6}
              value={form.estructura_json}
              onChange={e => setForm({...form, estructura_json: e.target.value})}
              placeholder={`{\n  "title": "Encuesta de Satisfacción",\n  "pages": [\n    {\n      "name": "page1",\n      "elements": [\n        {\n          "type": "radiogroup",\n          "name": "pregunta1",\n          "title": "¿Cómo calificaría el servicio?",\n          "choices": [\n            "Excelente",\n            "Bueno",\n            "Regular",\n            "Malo"\n          ]\n        }\n      ]\n    }\n  ]\n}`}
            />
          </Campo>
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
                    <p className="font-medium text-gray-800 flex-1">{obtenerTextoLocalizado(res.pregunta?.texto)}</p>
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

      {/* ── Modal de modificar fechas ── */}
      <Modal abierto={modalFechas} onCerrar={() => setModalFechas(false)} titulo={`Modificar Fechas — ${seleccionado?.titulo}`} size="md">
        <form onSubmit={guardarFechas} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nueva fecha de inicio">
              <input type="date" className="campo" value={formFechas.fecha_inicio} onChange={e => setFormFechas({...formFechas, fecha_inicio: e.target.value})} />
            </Campo>
            <Campo label="Nueva fecha de cierre">
              <input type="date" className="campo" value={formFechas.fecha_cierre} onChange={e => setFormFechas({...formFechas, fecha_cierre: e.target.value})} />
            </Campo>
          </div>
          <Campo label="Motivo del cambio" required>
            <textarea className="campo" rows={3} value={formFechas.motivo} onChange={e => setFormFechas({...formFechas, motivo: e.target.value})} placeholder="Ej. Se amplía el plazo para permitir mayor participación de los estudiantes..." />
          </Campo>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalFechas(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : 'Actualizar fechas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal de ver respuestas en detalle (JSON y Visual) ── */}
      <Modal abierto={modalRespuestas} onCerrar={() => setModalRespuestas(false)} titulo={`Respuestas Recibidas — ${seleccionado?.titulo}`} size="xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-h-[400px] max-h-[600px]">
          {/* Panel Izquierdo: Lista de respuestas (Paginado) */}
          <div className="md:col-span-2 border-r border-gray-100 pr-4 overflow-y-auto flex flex-col justify-between max-h-[500px]">
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-gray-700 text-sm mb-2 font-medium">Respuestas ({respuestasList.length})</h3>
              {respuestasList.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-10">No hay respuestas individuales registradas.</p>
              ) : (
                respuestasPaginadas.map((resp, index) => {
                  const indiceAbsoluto = (paginaRespuestas - 1) * 10 + index;
                  const numeroRespuesta = respuestasList.length - indiceAbsoluto;
                  const esSeleccionado = respuestaSeleccionada?.id === resp.id;
                  return (
                    <button
                      key={resp.id}
                      type="button"
                      onClick={() => setRespuestaSeleccionada(resp)}
                      className={clsx(
                        'text-left p-3 rounded-xl border transition-all text-xs flex flex-col space-y-1 w-full',
                        esSeleccionado
                          ? 'border-unt-azul bg-blue-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-700">Respuesta #{numeroRespuesta}</span>
                        <span className="text-gray-400">
                          {resp.fecha_respuesta ? new Date(resp.fecha_respuesta).toLocaleDateString('es-PE') : ''}
                        </span>
                      </div>
                      <div className="text-gray-500 font-medium">
                        Código: {resp.codigo_estudiante || <span className="italic text-gray-400 font-normal">Anónimo</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Controles de Paginación */}
            {respuestasList.length > 10 && (
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={paginaRespuestas === 1}
                  onClick={() => setPaginaRespuestas(p => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>
                <span className="text-xs text-gray-500 font-medium">
                  {paginaRespuestas} de {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={paginaRespuestas === totalPaginas}
                  onClick={() => setPaginaRespuestas(p => Math.min(p + 1, totalPaginas))}
                  className="px-2.5 py-1 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          {/* Panel Derecho: Detalle de Respuesta */}
          <div className="md:col-span-3 pl-2 overflow-y-auto flex flex-col max-h-[500px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700 text-sm font-medium">Detalle de la Respuesta</h3>
              {respuestaSeleccionada && seleccionado?.estructura_json && (
                <button
                  type="button"
                  onClick={() => setVerJsonCrudo(!verJsonCrudo)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {verJsonCrudo ? 'Ver Formulario' : 'Ver JSON Crudo'}
                </button>
              )}
            </div>

            {respuestaSeleccionada ? (
              verJsonCrudo ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {obtenerArchivosDeRespuesta(respuestaSeleccionada.respuestas_json).length > 0 && (
                    <div className="mb-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                      <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                        <Download size={14} />
                        Archivos adjuntos para descargar:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {obtenerArchivosDeRespuesta(respuestaSeleccionada.respuestas_json).map((file, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => descargarArchivoBase64(file)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 font-medium rounded-lg text-xs transition-colors shadow-sm"
                          >
                            <Download size={12} />
                            {file.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-900 rounded-xl p-4 flex-1 font-mono text-xs text-green-400 overflow-auto selection:bg-gray-700">
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(respuestaSeleccionada.respuestas_json || {}, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {renderizarRespuestasVisual(respuestaSeleccionada.respuestas_json)}
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400">
                <Star size={32} className="mb-2 text-gray-300 animate-pulse" />
                <p className="text-sm">Seleccione una respuesta del listado de la izquierda para ver su contenido.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar encuesta?" mensaje={`Se eliminará permanentemente "${seleccionado?.titulo}" y todas sus respuestas.`} />
    </div>
  );
}
