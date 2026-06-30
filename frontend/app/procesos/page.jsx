'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  GitBranch, Plus, Search, Download, Edit, Trash2, 
  ChevronRight, ChevronDown, RefreshCw,
  AlertCircle, Layers, Users, 
  FileText, Eye, Building2,
  Grid3x3, List, Printer,
  FolderTree
} from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import clsx from 'clsx';

const NIVELES = ['macroproceso', 'proceso', 'subproceso'];

const FORM_VACIO = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipo_id: '',
  proceso_padre_id: '',
  nivel: 'proceso',
  responsable_id: '',
  objetivo: '',
  alcance: '',
  entradas: '',
  salidas: '',
  recursos: '',
  indicadores_clave: ''
};

const CAMPOS_MAYUSCULA = [
  'codigo', 'nombre', 'descripcion', 'objetivo', 
  'alcance', 'entradas', 'salidas', 'recursos', 'indicadores_clave'
];

// Iconos por nivel
const ICONOS_NIVEL = {
  macroproceso: Building2,
  proceso: Layers,
  subproceso: FileText,
};

export default function ProcesosPage() {
  const [mapa, setMapa] = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState('tabla');
  const [buscar, setBuscar] = useState('');
  // FIX 1: 'todos' ahora es su propio valor (string vacío = sin filtrar por activo)
  const [filtroActivo, setFiltroActivo] = useState('');
  const [modalForm, setModalForm] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [expandidos, setExpandidos] = useState({});
  const [modalMapaVisual, setModalMapaVisual] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      // FIX 1: solo se manda el parámetro 'activo' si hay un filtro real (true/false)
      if (filtroActivo) params.activo = filtroActivo;

      const [procRes, tipoRes, usrRes, mapaRes, statsRes] = await Promise.all([
        api.get('/procesos', { params }),
        api.get('/procesos/tipos'),
        api.get('/usuarios'),
        api.get('/procesos/mapa'),
        api.get('/procesos/estadisticas'),
      ]);
      
      setProcesos(procRes.data.datos || []);
      setTipos(tipoRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
      setMapa(mapaRes.data.datos || []);
      setStats(statsRes.data.datos);
    } catch (error) {
      console.error('Error al cargar:', error);
      toast.error('Error al cargar procesos');
    } finally {
      setCargando(false);
    }
  }, [buscar, filtroActivo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

const arbolMemoizado = useMemo(() => {
    const construirArbol = (items, padreId = null) => {
      return items
        .filter(p => p.proceso_padre_id === padreId || (padreId === null && p.proceso_padre_id === null))
        .map(p => ({
          ...p,
          hijos: construirArbol(items, p.id),
        }));
    };
  const raices = construirArbol(mapa);
    // Orden institucional: Estratégico (tipo_id 1) arriba, luego Misional (2), luego Soporte (3)
    // Dentro de cada tipo, ordena por código (E01, E02, E03...)
    return [...raices].sort((a, b) => {
      const difTipo = (a.tipo_id ?? 99) - (b.tipo_id ?? 99);
      if (difTipo !== 0) return difTipo;
      return (a.codigo || '').localeCompare(b.codigo || '');
    });
  }, [mapa]);

  const actualizarCampo = (campo, valor) => {
    if (erroresValidacion[campo]) {
      setErroresValidacion(prev => ({ ...prev, [campo]: '' }));
    }
    const valorFinal = CAMPOS_MAYUSCULA.includes(campo) ? valor.toUpperCase() : valor;
    setForm(prev => ({ ...prev, [campo]: valorFinal }));
  };

  const abrirNuevo = () => {
    setSeleccionado(null);
    setForm(FORM_VACIO);
    setErroresValidacion({});
    setModalForm(true);
  };

  const abrirEditar = (p) => {
    setSeleccionado(p);
    setForm({
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      tipo_id: p.tipo_id,
      proceso_padre_id: p.proceso_padre_id || '',
      nivel: p.nivel,
      responsable_id: p.responsable_id,
      objetivo: p.objetivo || '',
      alcance: p.alcance || '',
      entradas: p.entradas || '',
      salidas: p.salidas || '',
      recursos: p.recursos || '',
      indicadores_clave: p.indicadores_clave || ''
    });
    setErroresValidacion({});
    setModalForm(true);
  };

  const verDetalle = (p) => {
    setSeleccionado(p);
    setModalDetalle(true);
  };

  const validarFormulario = () => {
    const errores = {};
    if (!form.codigo || !form.codigo.trim()) errores.codigo = 'El código es obligatorio';
    if (!form.nombre || !form.nombre.trim()) errores.nombre = 'El nombre es obligatorio';
    if (!form.tipo_id) errores.tipo_id = 'El tipo es obligatorio';
    if (!form.responsable_id) errores.responsable_id = 'El responsable es obligatorio';
    if (!form.nivel) errores.nivel = 'El nivel es obligatorio';
    
    setErroresValidacion(errores);
    return Object.keys(errores).length === 0;
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    
    setGuardando(true);
    try {
      if (seleccionado) {
        await api.put(`/procesos/${seleccionado.id}`, form);
        toast.success('Proceso actualizado correctamente');
      } else {
        await api.post('/procesos', form);
        toast.success('Proceso creado exitosamente');
      }
      setModalForm(false);
      cargar();
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'Error al guardar';
      toast.error(mensaje);
      if (err.response?.status === 409) {
        setErroresValidacion(prev => ({ ...prev, codigo: 'El código ya existe' }));
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    setGuardando(true);
    try {
      await api.delete(`/procesos/${seleccionado.id}`);
      toast.success('Proceso desactivado correctamente');
      setModalEliminar(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al desactivar');
    } finally {
      setGuardando(false);
    }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/procesos/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `proceso-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error PDF:', error);
      toast.error('Error al generar PDF');
    }
  };

  const toggleExpandir = (id) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // FIX 3: helper para formatear fechas de forma defensiva.
  // El árbol de /procesos/mapa puede traer nodos resumidos sin creado_en;
  // esto evita mostrar "Invalid Date" cuando el detalle se abre desde el mapa.
  const formatearFecha = (valor) => {
    if (!valor) return 'No disponible';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return 'No disponible';
    return fecha.toLocaleDateString('es-PE');
  };

  // Componente Nodo del Mapa
const NodoMapa = ({ nodo, nivel = 0 }) => {
    const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
    const expandido = expandidos[nodo.id] || false;
    const IconoNivel = ICONOS_NIVEL[nodo.nivel] || FileText;

    // Color por TIPO de proceso (Estratégico/Misional/Soporte), no por profundidad
    const coloresPorTipo = {
      1: 'border-l-unt-azul bg-gradient-to-r from-unt-azul/5 to-transparent',   // Estratégico
      2: 'border-l-green-500 bg-gradient-to-r from-green-50 to-transparent',    // Misional
      3: 'border-l-amber-500 bg-gradient-to-r from-amber-50 to-transparent',   // Soporte
    };
    const colorNodo = coloresPorTipo[nodo.tipo_id] || 'border-l-gray-400';

    return (
      <div className={clsx(
        'border-l-4 transition-all duration-200',
        colorNodo,
        nivel > 0 && 'ml-6'
      )}>
        <div 
          className={clsx(
'flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-200 cursor-pointer group',
            'hover:bg-gray-50'
          )}
          onClick={() => tieneHijos && toggleExpandir(nodo.id)}
        >
          {/* Indicador visual de TIPO de proceso */}
          <div className={clsx(
            'w-1.5 h-8 rounded-full flex-shrink-0',
            nodo.tipo_id === 1 ? 'bg-unt-azul' :
            nodo.tipo_id === 2 ? 'bg-green-500' :
            nodo.tipo_id === 3 ? 'bg-amber-500' :
            'bg-gray-400'
          )} />
          {/* Icono de TIPO de proceso */}
          <IconoNivel size={18} className={clsx(
            'flex-shrink-0',
            nodo.tipo_id === 1 ? 'text-unt-azul' :
            nodo.tipo_id === 2 ? 'text-green-600' :
            nodo.tipo_id === 3 ? 'text-amber-600' :
            'text-gray-500'
          )} />
          {/* Botón expandir/colapsar */}
          {tieneHijos && (
            <button className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors">
              {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          {/* Información del proceso */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx(
                'font-semibold text-sm',
                nodo.tipo_id === 1 ? 'text-unt-azul' :
                nodo.tipo_id === 2 ? 'text-green-700' :
                nodo.tipo_id === 3 ? 'text-amber-700' :
                'text-gray-800'
              )}>
                {nodo.codigo}
              </span>
              <span className="text-gray-600 text-sm">—</span>
              <span className="text-gray-800 text-sm font-medium truncate">
                {nodo.nombre}
              </span>
            </div>
            {nodo.descripcion && (
              <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">
                {nodo.descripcion}
              </p>
            )}
          </div>
          
          {/* Badges y acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* FIX 2: se quita className de Badge (no se confirmó soporte);
                se envuelve en un span para el tamaño en vez de pasarlo como prop */}
            <span className="text-xs">
              <Badge estado={nodo.nivel} />
            </span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {nodo.tipo_nombre}
            </span>
            {nodo.responsable_nombre && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Users size={12} />
                {nodo.responsable_nombre}
              </span>
            )}
            <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={(e) => { e.stopPropagation(); verDetalle(nodo); }}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Ver detalle"
              >
                <Eye size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); descargarPDF(nodo.id); }}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Descargar PDF"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Hijos */}
        {tieneHijos && expandido && (
          <div className="ml-2 space-y-1">
            {nodo.hijos.map(hijo => (
              <NodoMapa key={hijo.id} nodo={hijo} nivel={nivel + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // FIX 1: 'Todos' ahora manda '' (sin filtro), distinto de 'Activos' ('true')
  const filtrosRapidos = [
    { label: 'Todos', value: '' },
    { label: 'Activos', value: 'true' },
    { label: 'Inactivos', value: 'false' },
  ];

  // Componente de Tarjeta de Estadísticas
  const StatCardMejorado = ({ label, valor, icono: Icono, color, subtitulo }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{valor}</p>
          {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
        </div>
        <div className={clsx(
          'p-3 rounded-lg',
          color === 'blue' && 'bg-blue-50 text-unt-azul',
          color === 'green' && 'bg-green-50 text-green-600',
          color === 'gold' && 'bg-amber-50 text-amber-600',
          color === 'red' && 'bg-red-50 text-red-600'
        )}>
          <Icono size={20} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con gradiente */}
      <div className="relative overflow-hidden bg-gradient-to-r from-unt-azul via-unt-azul/90 to-unt-azul/80 rounded-2xl p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-20 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg">
                <GitBranch size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold">Mapa de Procesos</h1>
            </div>
            <p className="text-white/80 text-sm max-w-2xl">
              Gestión integral de macroprocesos, procesos y subprocesos institucionales 
              para la mejora continua de la calidad educativa
            </p>
          </div>
<div className="flex gap-3">
            <button
              onClick={() => setModalMapaVisual(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/20 text-white border border-white/30 rounded-xl font-medium hover:bg-white/30 transition-all"
            >
              <Grid3x3 size={18} />
              Ver mapa visual
            </button>
            <button
              onClick={abrirNuevo}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-unt-azul rounded-xl font-medium hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={18} />
              Nuevo proceso
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCardMejorado 
            label="Total Procesos" 
            valor={stats.total} 
            icono={GitBranch} 
            color="blue"
            subtitulo="Procesos institucionales"
          />
          {stats.por_tipo?.slice(0, 3).map(t => (
            <StatCardMejorado 
              key={t.tipo} 
              label={t.tipo} 
              valor={t.cantidad} 
              icono={Layers} 
              color="green"
              subtitulo={`${t.tipo} registrados`}
            />
          ))}
          <StatCardMejorado 
            label="Niveles" 
            valor="3" 
            icono={FolderTree} 
            color="gold"
            subtitulo="Macroproceso • Proceso • Subproceso"
          />
        </div>
      )}

      {/* Barra de herramientas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input 
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-unt-azul/20 focus:border-unt-azul transition-all bg-gray-50 hover:bg-white" 
              placeholder="Buscar por código, nombre o descripción..." 
              value={buscar} 
              onChange={e => setBuscar(e.target.value)} 
            />
          </div>
          
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            {filtrosRapidos.map(f => (
              <button
                key={f.label}
                onClick={() => setFiltroActivo(f.value)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  filtroActivo === f.value 
                    ? 'bg-white text-unt-azul shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
            <button 
              onClick={() => setVista('tabla')} 
              className={clsx(
                'p-2 rounded-md transition-all',
                vista === 'tabla' ? 'bg-white text-unt-azul shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
              title="Vista Tabla"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setVista('mapa')} 
              className={clsx(
                'p-2 rounded-md transition-all',
                vista === 'mapa' ? 'bg-white text-unt-azul shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
              title="Vista Mapa"
            >
              <Grid3x3 size={18} />
            </button>
          </div>
          
          <button 
            onClick={cargar} 
            className="p-2.5 text-gray-500 hover:text-unt-azul hover:bg-blue-50 rounded-lg transition-all"
            title="Recargar"
          >
            <RefreshCw size={18} className={clsx(cargando && 'animate-spin')} />
          </button>
          
          {/* FIX 4: botón Exportar sin handler -> se quita hasta tener funcionalidad real.
              Si quieres dejarlo visible pero deshabilitado, ver nota al final. */}
        </div>
      </div>

      {/* Contenido principal */}
      {cargando ? (
        <CargandoPagina />
      ) : vista === 'mapa' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FolderTree size={20} className="text-unt-azul" />
              <h2 className="font-semibold text-gray-800">Árbol de procesos institucionales</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {arbolMemoizado.length} raíces
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-unt-azul" />
                Macroproceso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Proceso
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Subproceso
              </span>
            </div>
          </div>
          
          {arbolMemoizado.length === 0 ? (
            <EstadoVacio 
              icono={GitBranch} 
              titulo="No hay procesos registrados" 
              descripcion="Comience registrando los procesos institucionales" 
              accion={
                <button onClick={abrirNuevo} className="btn-primario mx-auto">
                  <Plus size={16} />
                  Nuevo proceso
                </button>
              } 
            />
          ) : (
            <div className="space-y-1">
              {arbolMemoizado.map(nodo => (
                <NodoMapa key={nodo.id} nodo={nodo} nivel={0} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {procesos.length === 0 ? (
            <EstadoVacio 
              icono={GitBranch} 
              titulo="No hay procesos" 
              descripcion="Registre los procesos institucionales" 
              accion={
                <button onClick={abrirNuevo} className="btn-primario mx-auto">
                  <Plus size={16} />
                  Nuevo proceso
                </button>
              } 
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Proceso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nivel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Responsable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {procesos.map(p => {
                    const IconoNivel = ICONOS_NIVEL[p.nivel] || FileText;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold text-unt-azul bg-blue-50 px-2 py-1 rounded">
                            {p.codigo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <IconoNivel size={16} className={clsx(
                              p.nivel === 'macroproceso' ? 'text-unt-azul' :
                              p.nivel === 'proceso' ? 'text-blue-500' :
                              'text-gray-400'
                            )} />
                            <div>
                              <p className="font-medium text-gray-800">{p.nombre}</p>
                              {p.proceso_padre_nombre && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <ChevronRight size={10} />
                                  {p.proceso_padre_nombre}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full text-xs">
                            {p.tipo_nombre}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge estado={p.nivel} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <Users size={14} className="text-gray-400" />
                            {p.responsable_nombre || 'Sin asignar'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge estado={p.activo ? 'activo' : 'inactivo'} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              onClick={() => verDetalle(p)} 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye size={15} />
                            </button>
                            <button 
                              onClick={() => descargarPDF(p.id)} 
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Descargar PDF"
                            >
                              <Download size={15} />
                            </button>
                            <button 
                              onClick={() => abrirEditar(p)} 
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit size={15} />
                            </button>
                            <button 
                              onClick={() => { setSeleccionado(p); setModalEliminar(true); }} 
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Desactivar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalle del Proceso */}
      <Modal 
        abierto={modalDetalle} 
        onCerrar={() => setModalDetalle(false)} 
        titulo="Detalle del Proceso" 
        size="xl"
      >
        {seleccionado && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Código</p>
                <p className="font-mono text-unt-azul font-semibold mt-1">{seleccionado.codigo}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Nivel</p>
                <div className="mt-1">
                  <Badge estado={seleccionado.nivel} />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-medium">Nombre</p>
              <p className="font-semibold text-gray-800 mt-1">{seleccionado.nombre}</p>
            </div>
            
            {seleccionado.descripcion && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Descripción</p>
                <p className="text-gray-700 mt-1">{seleccionado.descripcion}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Tipo</p>
                <p className="text-gray-700 mt-1">{seleccionado.tipo_nombre || 'No disponible'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Responsable</p>
                <p className="text-gray-700 mt-1">{seleccionado.responsable_nombre || 'Sin asignar'}</p>
              </div>
            </div>
            
            {seleccionado.proceso_padre_nombre && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Proceso Padre</p>
                <p className="text-gray-700 mt-1">{seleccionado.proceso_padre_nombre}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Estado</p>
                <div className="mt-1">
                  <Badge estado={seleccionado.activo ? 'activo' : 'inactivo'} />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase font-medium">Fecha Creación</p>
                {/* FIX 3: formatearFecha evita "Invalid Date" si el nodo viene
                    del árbol resumido (/procesos/mapa) sin creado_en */}
                <p className="text-gray-700 mt-1">
                  {formatearFecha(seleccionado.creado_en)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Formulario */}
      <Modal 
        abierto={modalForm} 
        onCerrar={() => setModalForm(false)} 
        titulo={seleccionado ? 'Editar proceso' : 'Nuevo proceso'} 
        size="xl"
      >
        <form onSubmit={guardar} className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Código" required error={erroresValidacion.codigo}>
              <input 
                className="campo font-mono" 
                value={form.codigo} 
                onChange={e => actualizarCampo('codigo', e.target.value)} 
                placeholder="PROC-001" 
                disabled={!!seleccionado}
              />
            </Campo>
            <Campo label="Tipo" required error={erroresValidacion.tipo_id}>
              <select 
                className="campo" 
                value={form.tipo_id} 
                onChange={e => setForm({...form, tipo_id: e.target.value})}
              >
                <option value="">Seleccione...</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Nivel" required error={erroresValidacion.nivel}>
              <select 
                className="campo" 
                value={form.nivel} 
                onChange={e => setForm({...form, nivel: e.target.value})}
              >
                {NIVELES.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nombre" required error={erroresValidacion.nombre}>
              <input 
                className="campo" 
                value={form.nombre} 
                onChange={e => actualizarCampo('nombre', e.target.value)} 
                placeholder="Nombre del proceso" 
              />
            </Campo>
            <Campo label="Responsable" required error={erroresValidacion.responsable_id}>
              <select 
                className="campo" 
                value={form.responsable_id} 
                onChange={e => setForm({...form, responsable_id: e.target.value})}
              >
                <option value="">Seleccione...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombres} {u.apellidos}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Descripción">
            <textarea 
              className="campo" 
              rows={2} 
              value={form.descripcion} 
              onChange={e => actualizarCampo('descripcion', e.target.value)} 
              placeholder="Descripción detallada del proceso" 
            />
          </Campo>

          <Campo label="Proceso padre">
            <select 
              className="campo" 
              value={form.proceso_padre_id} 
              onChange={e => setForm({...form, proceso_padre_id: e.target.value})}
            >
              <option value="">Ninguno (proceso raíz)</option>
              {procesos
                .filter(p => p.id !== seleccionado?.id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.nombre}
                  </option>
                ))}
            </select>
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Objetivo">
              <textarea 
                className="campo" 
                rows={2} 
                value={form.objetivo} 
                onChange={e => actualizarCampo('objetivo', e.target.value)} 
                placeholder="Objetivo del proceso" 
              />
            </Campo>
            <Campo label="Alcance">
              <textarea 
                className="campo" 
                rows={2} 
                value={form.alcance} 
                onChange={e => actualizarCampo('alcance', e.target.value)} 
                placeholder="Alcance del proceso" 
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Entradas">
              <textarea 
                className="campo" 
                rows={2} 
                value={form.entradas} 
                onChange={e => actualizarCampo('entradas', e.target.value)} 
                placeholder="Entradas del proceso" 
              />
            </Campo>
            <Campo label="Salidas">
              <textarea 
                className="campo" 
                rows={2} 
                value={form.salidas} 
                onChange={e => actualizarCampo('salidas', e.target.value)} 
                placeholder="Salidas del proceso" 
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Recursos">
              <textarea 
                className="campo" 
                rows={2} 
                value={form.recursos} 
                onChange={e => actualizarCampo('recursos', e.target.value)} 
                placeholder="Recursos necesarios" 
              />
            </Campo>
            <Campo label="Indicadores Clave">
              <textarea 
                className="campo" 
                rows={2} 
                value={form.indicadores_clave} 
                onChange={e => actualizarCampo('indicadores_clave', e.target.value)} 
                placeholder="Indicadores clave del proceso" 
              />
            </Campo>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => setModalForm(false)} 
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={guardando} 
              className="px-6 py-2.5 bg-unt-azul text-white rounded-lg hover:bg-unt-azul/90 transition-colors font-medium disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear proceso'}
            </button>
          </div>
        </form>
      </Modal>

{/* Modal Mapa Visual institucional */}
      <Modal
        abierto={modalMapaVisual}
        onCerrar={() => setModalMapaVisual(false)}
        titulo="Mapa de Procesos del SGC — UNT (Nivel 0)"
        size="xl"
      >
        <div className="overflow-x-auto">
          <svg width="100%" viewBox="0 0 680 520" role="img">
            <title>Mapa de Procesos SGC-UNT</title>
            <defs>
              <marker id="arrowM" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M2 1L8 5L2 9" fill="none" stroke="#185FA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </marker>
            </defs>
            {/* Título */}
            <text x="340" y="18" textAnchor="middle" fontSize="11" fontWeight="500" fill="#374151">Mapa de procesos del SGC — Universidad Nacional de Trujillo (Nivel 0)</text>
            {/* ── BANDA ESTRATÉGICA ── */}
            <rect x="60" y="30" width="560" height="126" rx="10" fill="#E6F1FB" stroke="#185FA5" strokeWidth="0.5"/>
            <text x="340" y="48" textAnchor="middle" fontSize="12" fontWeight="500" fill="#0C447C">Procesos estratégicos</text>
            {[['E01','Gobierno','de la univ.',68],['E02','Gestión','mejora cont.',160],['E03','Supervisión','y control',252],['E04','Gestión info.','y comunic.',344],['E05','Relaciones','inter-inst.',436],['E06','Dirección','estratégica',528]].map(([cod,l1,l2,x])=>(
              <g key={cod}>
                <rect x={x} y="56" width="84" height="90" rx="6" fill="#B5D4F4" stroke="#185FA5" strokeWidth="0.5"/>
                <text x={x+42} y="92" textAnchor="middle" fontSize="11" fontWeight="500" fill="#0C447C">{cod}</text>
                <text x={x+42} y="108" textAnchor="middle" fontSize="10" fill="#185FA5">{l1}</text>
                <text x={x+42} y="122" textAnchor="middle" fontSize="10" fill="#185FA5">{l2}</text>
              </g>
            ))}
            {/* Flecha E→M */}
            <line x1="340" y1="156" x2="340" y2="182" stroke="#6B7280" strokeWidth="1.5" markerEnd="url(#arrowM)"/>
            {/* ── BANDA MISIONAL ── */}
            <rect x="100" y="184" width="480" height="120" rx="10" fill="#EAF3DE" stroke="#3B6D11" strokeWidth="0.5"/>
            <text x="340" y="202" textAnchor="middle" fontSize="12" fontWeight="500" fill="#27500A">Procesos misionales</text>
            {[['M01','Formación integral',112,150],['M02','Investigación, innov.','y desarrollo',270,140],['M03','Responsabilidad','social univ.',428,140]].map(([cod,l1,l2,x,w])=>(
              <g key={cod}>
                <rect x={x} y="210" width={w||150} height="84" rx="6" fill="#C0DD97" stroke="#3B6D11" strokeWidth="0.5"/>
                <text x={x+(w||150)/2} y="246" textAnchor="middle" fontSize="11" fontWeight="500" fill="#27500A">{cod}</text>
                <text x={x+(w||150)/2} y="262" textAnchor="middle" fontSize="10" fill="#3B6D11">{l1}</text>
                {l2 && <text x={x+(w||150)/2} y="276" textAnchor="middle" fontSize="10" fill="#3B6D11">{l2}</text>}
              </g>
            ))}
            {/* Flecha M→A */}
            <line x1="340" y1="304" x2="340" y2="330" stroke="#6B7280" strokeWidth="1.5" markerEnd="url(#arrowM)"/>
            {/* ── BANDA APOYO ── */}
            <rect x="60" y="332" width="560" height="160" rx="10" fill="#FAEEDA" stroke="#854F0B" strokeWidth="0.5"/>
            <text x="340" y="350" textAnchor="middle" fontSize="12" fontWeight="500" fill="#633806">Procesos de apoyo</text>
            {[['A01','Infraestructura',68],['A02','Talento humano',174],['A03','Bienestar univ.',280],['A04','Logística',386],['A05','Mantenimiento',492]].map(([cod,lbl,x])=>(
              <g key={cod}>
                <rect x={x} y="358" width="98" height="54" rx="5" fill="#FAC775" stroke="#854F0B" strokeWidth="0.5"/>
                <text x={x+49} y="381" textAnchor="middle" fontSize="11" fontWeight="500" fill="#633806">{cod}</text>
                <text x={x+49} y="396" textAnchor="middle" fontSize="10" fill="#854F0B">{lbl}</text>
              </g>
            ))}
            {[['A06','Tecnol. de info.',68,118],['A07','Asuntos jurídicos',196,118],['A08','Centros de info.',324,118],['A09','Gestión financiera',452,138]].map(([cod,lbl,x,w])=>(
              <g key={cod}>
                <rect x={x} y="420" width={w} height="54" rx="5" fill="#FAC775" stroke="#854F0B" strokeWidth="0.5"/>
                <text x={x+w/2} y="443" textAnchor="middle" fontSize="11" fontWeight="500" fill="#633806">{cod}</text>
                <text x={x+w/2} y="458" textAnchor="middle" fontSize="10" fill="#854F0B">{lbl}</text>
              </g>
            ))}
            {/* Flechas laterales */}
            <line x1="14" y1="244" x2="58" y2="244" stroke="#185FA5" strokeWidth="2" markerEnd="url(#arrowM)"/>
            <line x1="58" y1="254" x2="14" y2="254" stroke="#185FA5" strokeWidth="2" markerEnd="url(#arrowM)"/>
            <line x1="622" y1="244" x2="666" y2="244" stroke="#185FA5" strokeWidth="2" markerEnd="url(#arrowM)"/>
            <line x1="666" y1="254" x2="622" y2="254" stroke="#185FA5" strokeWidth="2" markerEnd="url(#arrowM)"/>
            {'Necesidades'.split('').map((c,i)=>(
              <text key={i} x="7" y={170+i*14} textAnchor="middle" fontSize="9" fill="#374151">{c}</text>
            ))}
            {'Satisfacción'.split('').map((c,i)=>(
              <text key={i} x="673" y={170+i*14} textAnchor="middle" fontSize="9" fill="#374151">{c}</text>
            ))}
          </svg>
        </div>
      </Modal>
      
      <ModalConfirmar 
        abierto={modalEliminar} 
        onCerrar={() => setModalEliminar(false)} 
        onConfirmar={eliminar} 
        cargando={guardando}
        titulo="¿Desactivar proceso?" 
        mensaje={
          <>
            El proceso <strong>"{seleccionado?.nombre}"</strong> ({seleccionado?.codigo}) quedará inactivo.
            {' '}Los subprocesos asociados seguirán visibles en el sistema.
          </>
        }
      />
    </div>
  );
}