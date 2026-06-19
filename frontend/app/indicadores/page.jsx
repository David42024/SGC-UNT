'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { BarChart2, Plus, Search, Download, Edit, Trash2, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard, Semaforo } from '../../components/ui';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import clsx from 'clsx';

const MODULOS = ['documentos','procesos','acreditacion','auditorias','acciones','riesgos','indicadores','satisfaccion','general'];
const TIPOS   = ['porcentaje','numero','ratio','tiempo','costo'];
const FREQS   = ['diaria','semanal','mensual','trimestral','anual'];

const UNIDADES_POR_TIPO = {
  porcentaje: ['%', 'porcentaje'],
  numero: ['unidades', 'cantidad', 'número', 'items', 'registros'],
  ratio: ['ratio', 'proporción', 'índice'],
  tiempo: ['días', 'horas', 'meses', 'años', 'minutos'],
  costo: ['soles', 'dólares', 'euros', 'USD', 'PEN']
};

const FORM_VACIO = { codigo:'', nombre:'', descripcion:'', modulo:'general', tipo:'porcentaje', formula:'', unidad_medida:'', meta:'', umbral_alerta:'', umbral_critico:'', frecuencia_medicion:'mensual', responsable_id:'' };
const MED_VACIO  = { periodo:'', valor:'', meta_periodo:'', fuente_datos:'', observaciones:'' };

export default function IndicadoresPage() {
  const [indicadores, setIndicadores] = useState([]);
  const [usuarios, setUsuarios]       = useState([]);
  const [dashboard, setDashboard]     = useState(null);
  const [alertas, setAlertas]         = useState([]);
  const [mediciones, setMediciones]   = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [buscar, setBuscar]           = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [vistaActiva, setVistaActiva] = useState('lista');
  const [seleccionado, setSeleccionado] = useState(null);
  const [modalForm, setModalForm]     = useState(false);
  const [modalMedicion, setModalMedicion] = useState(false);
  const [modalGrafico, setModalGrafico]   = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalEliminarMedicion, setModalEliminarMedicion] = useState(false);
  const [form, setForm]               = useState(FORM_VACIO);
  const [formMed, setFormMed]         = useState(MED_VACIO);
  const [medicionSeleccionada, setMedicionSeleccionada] = useState(null);
  const [guardando, setGuardando]     = useState(false);
  const [pagina, setPagina]           = useState(1);
  const [limite, setLimite]           = useState(10);
  const [paginacion, setPaginacion]   = useState(null);
  const [parametrosIndicador, setParametrosIndicador] = useState([]);
  const [valoresParametros, setValoresParametros] = useState({});
  const [parametrosForm, setParametrosForm] = useState([]);
  const [nuevoParametro, setNuevoParametro] = useState({ nombre: '', etiqueta: '', tipo: 'numero', orden: 1, obligatorio: true });
  const [valorCalculado, setValorCalculado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = { activo: true, page: pagina, limit: limite };
      if (filtroModulo) params.modulo = filtroModulo;
      const [indRes, usrRes, dashRes, alertRes] = await Promise.all([
        api.get('/indicadores', { params }),
        api.get('/usuarios'),
        api.get('/indicadores/dashboard'),
        api.get('/indicadores/alertas'),
      ]);
      setIndicadores(indRes.data.datos || []);
      setPaginacion(indRes.data.paginacion || null);
      setUsuarios(usrRes.data.datos || []);
      setDashboard(dashRes.data.datos);
      setAlertas(alertRes.data.datos || []);
    } catch { toast.error('Error al cargar indicadores'); }
    finally  { setCargando(false); }
  }, [filtroModulo, pagina, limite]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = indicadores.filter(i =>
    !buscar || i.nombre?.toLowerCase().includes(buscar.toLowerCase()) || i.codigo?.toLowerCase().includes(buscar.toLowerCase())
  );

  const abrirNuevo  = () => { setSeleccionado(null); setForm(FORM_VACIO); setParametrosForm([]); setNuevoParametro({ nombre: '', etiqueta: '', tipo: 'numero', orden: 1, obligatorio: true }); setModalForm(true); };
  const cambiarPagina = (nuevaPagina) => { setPagina(nuevaPagina); };
  const cambiarLimite = (nuevoLimite) => { setLimite(nuevoLimite); setPagina(1); };
  const abrirEditar = async (ind) => {
    setSeleccionado(ind);
    setForm({ codigo: ind.codigo, nombre: ind.nombre, descripcion: ind.descripcion || '', modulo: ind.modulo, tipo: ind.tipo, formula: ind.formula || '', unidad_medida: ind.unidad_medida || '', meta: ind.meta || '', umbral_alerta: ind.umbral_alerta || '', umbral_critico: ind.umbral_critico || '', frecuencia_medicion: ind.frecuencia_medicion, responsable_id: ind.responsable_id });
    try {
      const res = await api.get(`/indicadores/${ind.id}/parametros`);
      setParametrosForm(res.data.datos || []);
    } catch { setParametrosForm([]); }
    setModalForm(true);
  };

  const abrirMedicion = async (ind) => {
    setSeleccionado(ind);
    setFormMed(MED_VACIO);
    setMedicionSeleccionada(null);
    setValoresParametros({});
    setValorCalculado(null);
    try {
      const res = await api.get(`/indicadores/${ind.id}/parametros`);
      setParametrosIndicador(res.data.datos || []);
    } catch { toast.error('Error al cargar parámetros'); }
    setModalMedicion(true);
  };
  const abrirEditarMedicion = async (m) => {
    setFormMed({ periodo: m.periodo, valor: m.valor, meta_periodo: m.meta_periodo, fuente_datos: m.fuente_datos, observaciones: m.observaciones });
    setMedicionSeleccionada(m);
    setValoresParametros(m.parametros || {});
    setModalGrafico(false);
    try {
      const res = await api.get(`/indicadores/${seleccionado.id}/parametros`);
      setParametrosIndicador(res.data.datos || []);
    } catch { toast.error('Error al cargar parámetros'); }
    setModalMedicion(true);
  };
  const abrirEliminarMedicion = (m) => { setMedicionSeleccionada(m); setModalEliminarMedicion(true); };

  const abrirGrafico = async (ind) => {
    setSeleccionado(ind);
    try {
      const res = await api.get(`/indicadores/${ind.id}/mediciones`);
      setMediciones((res.data.datos || []).slice(0, 12).reverse());
    } catch { toast.error('Error al cargar mediciones'); }
    setModalGrafico(true);
  };

  const calcularValorEnTiempoReal = (formula, valores, parametrosIndicador) => {
    if (!formula || !valores || !parametrosIndicador) return null;
    
    try {
      // Primero, reemplazar el texto español por los nombres de parámetros
      let formulaConNombres = formula;
      parametrosIndicador.forEach(p => {
        if (p.etiqueta) {
          // Reemplazar la etiqueta (texto español) por el nombre del parámetro
          const regex = new RegExp(p.etiqueta.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
          formulaConNombres = formulaConNombres.replace(regex, p.nombre);
        }
      });
      
      // Luego, reemplazar nombres de parámetros por sus valores
      let formulaEval = formulaConNombres;
      Object.keys(valores).forEach(key => {
        const valor = valores[key];
        if (valor !== undefined && valor !== null && valor !== '' && !isNaN(valor)) {
          // Reemplazar el nombre del parámetro por su valor
          const regex = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
          formulaEval = formulaEval.replace(regex, valor);
        }
      });
      
      // Reemplazar símbolos matemáticos por operadores JavaScript
      formulaEval = formulaEval.replace(/×/g, '*');
      
      // Evaluar la expresión matemática de forma segura
      // Solo permitimos números y operadores matemáticos básicos
      if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(formulaEval)) {
        // eslint-disable-next-line no-new-func
        const resultado = new Function('return ' + formulaEval)();
        return isNaN(resultado) ? null : resultado;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleParametroChange = (nombre, valor) => {
    const nuevosValores = { ...valoresParametros, [nombre]: parseFloat(valor) };
    setValoresParametros(nuevosValores);
    
    // Calcular valor en tiempo real
    if (seleccionado?.formula) {
      const calculado = calcularValorEnTiempoReal(seleccionado.formula, nuevosValores, parametrosIndicador);
      setValorCalculado(calculado);
    }
  };

  const agregarParametro = () => {
    if (!nuevoParametro.nombre || !nuevoParametro.etiqueta) { toast.error('Complete el nombre y etiqueta del parámetro'); return; }
    setParametrosForm([...parametrosForm, { ...nuevoParametro, orden: parametrosForm.length + 1 }]);
    setNuevoParametro({ nombre: '', etiqueta: '', tipo: 'numero', orden: parametrosForm.length + 2, obligatorio: true });
  };

  const eliminarParametro = (index) => {
    setParametrosForm(parametrosForm.filter((_, i) => i !== index));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.nombre || !form.responsable_id) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    try {
      const payload = { ...form, parametros: parametrosForm };
      if (seleccionado) { await api.put(`/indicadores/${seleccionado.id}`, payload); toast.success('Indicador actualizado'); }
      else              { await api.post('/indicadores', payload); toast.success('Indicador creado'); }
      setModalForm(false); setPagina(1); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const guardarMedicion = async (e) => {
    e.preventDefault();
    if (!formMed.periodo) { toast.error('Ingrese el período'); return; }
    
    // Validar que todos los parámetros obligatorios tengan valor
    const parametrosFaltantes = parametrosIndicador.filter(p => p.obligatorio && (!valoresParametros[p.nombre] || valoresParametros[p.nombre] === ''));
    if (parametrosFaltantes.length > 0) {
      toast.error(`Complete todos los parámetros obligatorios: ${parametrosFaltantes.map(p => p.etiqueta).join(', ')}`);
      return;
    }
    
    setGuardando(true);
    try {
      const payload = {
        ...formMed,
        valor: valorCalculado !== null ? valorCalculado : formMed.valor,
        parametros: valoresParametros
      };
      let res;
      if (medicionSeleccionada) {
        res = await api.put(`/indicadores/mediciones/${medicionSeleccionada.id}`, payload);
        toast.success('Medición actualizada');
      } else {
        res = await api.post(`/indicadores/${seleccionado.id}/mediciones`, payload);
        toast.success(`Medición registrada — Semáforo: ${res.data.semaforo?.toUpperCase()}`);
      }
      setModalMedicion(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al registrar'); }
    finally       { setGuardando(false); }
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/indicadores/${seleccionado.id}`); toast.success('Indicador eliminado'); setModalEliminar(false); setPagina(1); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const eliminarMedicion = async () => {
    setGuardando(true);
    try { await api.delete(`/indicadores/mediciones/${medicionSeleccionada.id}`); toast.success('Medición eliminada'); setModalEliminarMedicion(false); cargar(); abrirGrafico(seleccionado); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/indicadores/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `indicador-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  const descargarReporte = async () => {
    try {
      const params = {};
      if (filtroModulo) params.modulo = filtroModulo;
      const res = await api.get('/indicadores/reporte', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = 'reporte-indicadores.pdf'; a.click();
    } catch { toast.error('Error al generar reporte'); }
  };

  const colorSemaforo = (s) => ({ verde: 'text-green-600 bg-green-50', amarillo: 'text-yellow-600 bg-yellow-50', rojo: 'text-red-600 bg-red-50' }[s] || '');

  return (
    <div>
      <PageHeader
        titulo="Indicadores de Gestión"
        descripcion="Dashboards y KPIs en tiempo real con alertas automáticas por módulo"
        icono={BarChart2}
        acciones={
          <div className="flex items-center gap-2">
            <button onClick={descargarReporte} className="btn-secundario"><Download size={16} />Generar reporte</button>
            <button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nuevo indicador</button>
          </div>
        }
      />

      {/* Alertas pendientes */}
      {alertas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="font-semibold text-red-700 text-sm">{alertas.length} alerta(s) pendiente(s)</span>
          </div>
          <div className="space-y-1">
            {alertas.slice(0, 3).map((a, i) => (
              <div key={i} className="text-xs text-red-600 flex items-center gap-2">
                <span className={clsx('px-1.5 py-0.5 rounded text-white text-[10px] font-bold', a.tipo_alerta === 'critico' ? 'bg-red-500' : 'bg-yellow-500')}>{a.tipo_alerta}</span>
                <span>{a.mensaje}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard resumen */}
      {dashboard?.ultimas_mediciones?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {dashboard.ultimas_mediciones.slice(0, 6).map((m, i) => (
            <div key={i} className="tarjeta p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{m.nombre}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{m.valor}<span className="text-sm font-normal text-gray-400 ml-1">{m.unidad_medida}</span></p>
                <p className="text-xs text-gray-400">Meta: {m.meta} · {m.periodo}</p>
              </div>
              <Semaforo estado={m.estado_semaforo} showLabel={false} />
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar indicadores..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <select className="campo w-auto" value={filtroModulo} onChange={e => { setFiltroModulo(e.target.value); setPagina(1); }}>
            <option value="">Todos los módulos</option>
            {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Lista */}
      <div className="tarjeta p-0 overflow-hidden">
        {cargando ? <CargandoPagina /> : filtrados.length === 0 ? (
          <EstadoVacio icono={BarChart2} titulo="No hay indicadores" descripcion="Configure los KPIs para monitorear el desempeño"
            accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nuevo indicador</button>} />
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="tabla-encabezado">Código</th>
                  <th className="tabla-encabezado">Nombre</th>
                  <th className="tabla-encabezado">Módulo</th>
                  <th className="tabla-encabezado">Meta</th>
                  <th className="tabla-encabezado text-center">Último valor</th>
                  <th className="tabla-encabezado text-center">Semáforo</th>
                  <th className="tabla-encabezado">Frecuencia</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtrados.map(ind => (
                  <tr key={ind.id} className="hover:bg-gray-50 transition-colors">
                    <td className="tabla-celda font-mono text-xs text-unt-azul font-semibold">{ind.codigo}</td>
                    <td className="tabla-celda max-w-[500px]">
                      <p className="font-medium text-gray-800 max-w-[400px] truncate">
                        {ind.nombre}
                      </p>

                      <p className="text-xs text-gray-400 max-w-[600px] overflow-hidden whitespace-nowrap text-ellipsis">
                        {ind.formula ? `Fórmula: ${ind.formula}` : ''}
                      </p>
                    </td>
                    <td className="tabla-celda"><Badge estado={ind.modulo} /></td>
                    <td className="tabla-celda text-sm font-semibold text-gray-700">
                      {ind.meta ? `${ind.meta} ${ind.unidad_medida || ''}` : '—'}
                    </td>
                    <td className="tabla-celda text-center">
                      {ind.ultimo_valor != null
                        ? <span className={clsx('px-2 py-1 rounded-lg text-sm font-bold', colorSemaforo(ind.semaforo_actual))}>{ind.ultimo_valor}</span>
                        : <span className="text-gray-300 text-xs">Sin mediciones</span>
                      }
                    </td>
                    <td className="tabla-celda text-center">
                      <Semaforo estado={ind.semaforo_actual || 'verde'} />
                    </td>
                    <td className="tabla-celda text-xs text-gray-500 capitalize">{ind.frecuencia_medicion}</td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => abrirGrafico(ind)} title="Ver gráfico" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg"><TrendingUp size={15} /></button>
                        <button onClick={() => abrirMedicion(ind)} title="Registrar medición" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Plus size={15} /></button>
                        <button onClick={() => descargarPDF(ind.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                        <button onClick={() => abrirEditar(ind)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                        <button onClick={() => { setSeleccionado(ind); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
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
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar indicador' : 'Nuevo indicador'} size="lg">
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" required><input className="campo" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} placeholder="IND-001" disabled={!!seleccionado} /></Campo>
            <Campo label="Tipo" required>
              <select className="campo" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Nombre" required><input className="campo" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Módulo">
              <select className="campo" value={form.modulo} onChange={e => setForm({...form, modulo: e.target.value})}>
                {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Campo>
            <Campo label="Responsable" required>
              <select className="campo" value={form.responsable_id} onChange={e => setForm({...form, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Campo label={`Meta (${form.unidad_medida || 'unidad'})`}><input type="number" className="campo" value={form.meta} onChange={e => setForm({...form, meta: e.target.value})} /></Campo>
            <Campo label="Umbral alerta"><input type="number" className="campo" value={form.umbral_alerta} onChange={e => setForm({...form, umbral_alerta: e.target.value})} /></Campo>
            <Campo label="Umbral crítico"><input type="number" className="campo" value={form.umbral_critico} onChange={e => setForm({...form, umbral_critico: e.target.value})} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Unidad de medida">
              <select 
                className="campo" 
                value={form.unidad_medida} 
                onChange={e => setForm({...form, unidad_medida: e.target.value})}
              >
                <option value="">Seleccione...</option>
                {(UNIDADES_POR_TIPO[form.tipo] || []).map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value="otra">Otra (especificar abajo)</option>
              </select>
            </Campo>
            <Campo label="Frecuencia">
              <select className="campo" value={form.frecuencia_medicion} onChange={e => setForm({...form, frecuencia_medicion: e.target.value})}>
                {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Campo>
          </div>
          {form.unidad_medida === 'otra' && (
            <Campo label="Especifique la unidad de medida">
              <input 
                className="campo" 
                value={form.unidad_medida_custom || ''} 
                onChange={e => setForm({...form, unidad_medida_custom: e.target.value})} 
                placeholder="Ingrese la unidad personalizada"
              />
            </Campo>
          )}
          <Campo label="Fórmula de cálculo"><input className="campo" value={form.formula} onChange={e => setForm({...form, formula: e.target.value})} placeholder="(logros / total) × 100" /></Campo>
          <Campo label="Descripción"><textarea className="campo" rows={2} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} /></Campo>
          
          {/* Sección de parámetros de la fórmula */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Parámetros de la fórmula</p>
              <p className="text-xs text-gray-500">Defina los campos que aparecerán al registrar mediciones</p>
            </div>
            
            {parametrosForm.length > 0 && (
              <div className="space-y-2 mb-3">
                {parametrosForm.map((p, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <span className="text-xs font-medium text-gray-600 w-8">{p.orden}.</span>
                    <span className="text-sm text-gray-800 flex-1">{p.etiqueta}</span>
                    <span className="text-xs text-gray-500">{p.nombre}</span>
                    <button type="button" onClick={() => eliminarParametro(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-4 gap-2 mb-2">
              <input
                className="campo text-sm"
                placeholder="Nombre (ej: objetivos_logrados)"
                value={nuevoParametro.nombre}
                onChange={e => setNuevoParametro({...nuevoParametro, nombre: e.target.value})}
              />
              <input
                className="campo text-sm"
                placeholder="Etiqueta (ej: N° de objetivos logrados)"
                value={nuevoParametro.etiqueta}
                onChange={e => setNuevoParametro({...nuevoParametro, etiqueta: e.target.value})}
              />
              <select
                className="campo text-sm"
                value={nuevoParametro.tipo}
                onChange={e => setNuevoParametro({...nuevoParametro, tipo: e.target.value})}
              >
                <option value="numero">Número</option>
                <option value="texto">Texto</option>
                <option value="fecha">Fecha</option>
              </select>
              <button
                type="button"
                onClick={agregarParametro}
                className="btn-secundario text-sm"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={nuevoParametro.obligatorio}
                onChange={e => setNuevoParametro({...nuevoParametro, obligatorio: e.target.checked})}
              />
              Obligatorio
            </label>
          </div>
          
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear indicador'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal medición */}
      <Modal abierto={modalMedicion} onCerrar={() => setModalMedicion(false)} titulo={medicionSeleccionada ? `Editar medición — ${seleccionado?.nombre}` : `Registrar medición — ${seleccionado?.nombre}`} size="md" zIndex="z-[60]">
        <form onSubmit={guardarMedicion} className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-gray-500">Meta</p><p className="font-bold text-unt-azul">{seleccionado?.meta || '—'} {seleccionado?.unidad_medida}</p></div>
            <div><p className="text-xs text-gray-500">Umbral alerta</p><p className="font-bold text-yellow-600">{seleccionado?.umbral_alerta || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Umbral crítico</p><p className="font-bold text-red-600">{seleccionado?.umbral_critico || '—'}</p></div>
          </div>
          
          {/* Mostrar fórmula si existe */}
          {seleccionado?.formula && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Fórmula de cálculo:</p>
              <p className="text-sm font-mono text-gray-800">{seleccionado.formula}</p>
            </div>
          )}
          
          <Campo label="Período" required><input className="campo" value={formMed.periodo} onChange={e => setFormMed({...formMed, periodo: e.target.value})} placeholder="2024-01, Ene-2024..." /></Campo>
          
          {/* Campos dinámicos de parámetros */}
          {parametrosIndicador.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Parámetros de la fórmula:</p>
              {parametrosIndicador.map(p => (
                <Campo key={p.nombre} label={p.etiqueta} required={p.obligatorio}>
                  <input 
                    type="number" 
                    step="any" 
                    className="campo" 
                    value={valoresParametros[p.nombre] || ''} 
                    onChange={e => handleParametroChange(p.nombre, e.target.value)}
                    placeholder={`Ingrese ${p.etiqueta.toLowerCase()}`}
                  />
                </Campo>
              ))}
              
              {/* Mostrar valor calculado en tiempo real */}
              {valorCalculado !== null && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Valor calculado en tiempo real:</p>
                  <p className="text-2xl font-bold text-green-700">{valorCalculado.toFixed(2)} {seleccionado?.unidad_medida}</p>
                </div>
              )}
            </div>
          ) : (
            <Campo label="Valor medido" required>
              <input type="number" step="any" className="campo" value={formMed.valor} onChange={e => setFormMed({...formMed, valor: e.target.value})} />
            </Campo>
          )}
          
          <Campo label="Meta del período"><input type="number" step="any" className="campo" value={formMed.meta_periodo} onChange={e => setFormMed({...formMed, meta_periodo: e.target.value})} /></Campo>
          <Campo label="Fuente de datos"><input className="campo" value={formMed.fuente_datos} onChange={e => setFormMed({...formMed, fuente_datos: e.target.value})} /></Campo>
          <Campo label="Observaciones"><textarea className="campo" rows={2} value={formMed.observaciones} onChange={e => setFormMed({...formMed, observaciones: e.target.value})} /></Campo>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalMedicion(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : medicionSeleccionada ? 'Actualizar medición' : 'Registrar medición'}</button>
          </div>
        </form>
      </Modal>

      {/* Modal gráfico */}
      <Modal abierto={modalGrafico} onCerrar={() => setModalGrafico(false)} titulo={`Tendencia — ${seleccionado?.nombre}`} size="xl">
        <div className="space-y-4">
          {mediciones.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay mediciones registradas</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Último valor', val: `${mediciones[mediciones.length-1]?.valor} ${seleccionado?.unidad_medida || ''}` },
                  { label: 'Meta', val: `${seleccionado?.meta || '—'} ${seleccionado?.unidad_medida || ''}` },
                  { label: 'Semáforo', val: mediciones[mediciones.length-1]?.estado_semaforo?.toUpperCase() || '—' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className="font-bold text-gray-800">{s.val}</p>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mediciones} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  {seleccionado?.meta && <ReferenceLine y={seleccionado.meta} stroke="#10b981" strokeDasharray="6 3" label={{ value: 'Meta', fontSize: 11, fill: '#10b981' }} />}
                  {seleccionado?.umbral_alerta && <ReferenceLine y={seleccionado.umbral_alerta} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Alerta', fontSize: 10, fill: '#f59e0b' }} />}
                  {seleccionado?.umbral_critico && <ReferenceLine y={seleccionado.umbral_critico} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Crítico', fontSize: 10, fill: '#ef4444' }} />}
                  <Line type="monotone" dataKey="valor" stroke="#063B96" strokeWidth={2.5} dot={{ r: 4, fill: '#063B96' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="tabla-encabezado">Período</th>
                      <th className="tabla-encabezado text-right">Valor</th>
                      <th className="tabla-encabezado text-right">Meta</th>
                      <th className="tabla-encabezado text-center">Semáforo</th>
                      <th className="tabla-encabezado text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...mediciones].reverse().map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="tabla-celda">{m.periodo}</td>
                        <td className="tabla-celda text-right font-semibold">{m.valor}</td>
                        <td className="tabla-celda text-right text-gray-500">{m.meta_periodo || seleccionado?.meta || '—'}</td>
                        <td className="tabla-celda text-center"><Semaforo estado={m.estado_semaforo} /></td>
                        <td className="tabla-celda text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => abrirEditarMedicion(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={14} /></button>
                            <button onClick={() => abrirEliminarMedicion(m)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Eliminar indicador?" mensaje={`Se eliminará "${seleccionado?.nombre}" y todas sus mediciones.`} />
      <ModalConfirmar abierto={modalEliminarMedicion} onCerrar={() => setModalEliminarMedicion(false)} onConfirmar={eliminarMedicion} cargando={guardando}
        titulo="¿Eliminar medición?" mensaje={`Se eliminará la medición del período "${medicionSeleccionada?.periodo}" con valor ${medicionSeleccionada?.valor}.`} />
    </div>
  );
}
