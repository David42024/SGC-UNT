'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { GitBranch, Plus, Search, Download, Edit, Trash2, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';
import clsx from 'clsx';

const NIVELES = ['macroproceso','proceso','subproceso'];
const FORM_VACIO = { codigo:'', nombre:'', descripcion:'', tipo_id:'', proceso_padre_id:'', nivel:'proceso', responsable_id:'', objetivo:'', alcance:'', entradas:'', salidas:'', recursos:'', indicadores_clave:'' };

export default function ProcesosPage() {
  const [mapa, setMapa]         = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [tipos, setTipos]       = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [stats, setStats]       = useState(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista]       = useState('tabla');
  const [buscar, setBuscar]     = useState('');
  const [modalForm, setModalForm]     = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [seleccionado, setSeleccionado]   = useState(null);
  const [form, setForm]         = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [expandidos, setExpandidos] = useState({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = buscar ? { buscar } : {};
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
    } catch { toast.error('Error al cargar procesos'); }
    finally  { setCargando(false); }
  }, [buscar]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNuevo = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const abrirEditar = (p) => {
    setSeleccionado(p);
    setForm({ codigo: p.codigo, nombre: p.nombre, descripcion: p.descripcion || '', tipo_id: p.tipo_id, proceso_padre_id: p.proceso_padre_id || '', nivel: p.nivel, responsable_id: p.responsable_id, objetivo: p.objetivo || '', alcance: p.alcance || '', entradas: p.entradas || '', salidas: p.salidas || '', recursos: p.recursos || '', indicadores_clave: p.indicadores_clave || '' });
    setModalForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.nombre || !form.tipo_id || !form.responsable_id) { toast.error('Complete los campos obligatorios'); return; }
    setGuardando(true);
    try {
      if (seleccionado) { await api.put(`/procesos/${seleccionado.id}`, form); toast.success('Proceso actualizado'); }
      else              { await api.post('/procesos', form); toast.success('Proceso creado'); }
      setModalForm(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar'); }
    finally       { setGuardando(false); }
  };

  const eliminar = async () => {
    setGuardando(true);
    try { await api.delete(`/procesos/${seleccionado.id}`); toast.success('Proceso desactivado'); setModalEliminar(false); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error'); }
    finally     { setGuardando(false); }
  };

  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/procesos/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `proceso-${id}.pdf`; a.click();
    } catch { toast.error('Error al generar PDF'); }
  };

  const toggleExpandir = (id) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  const NodoMapa = ({ nodo, nivel = 0 }) => (
    <div className={clsx('border-l-2 border-gray-200 ml-4', nivel === 0 && 'border-unt-azul ml-0')}>
      <div className={clsx('flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer', nivel === 0 && 'bg-blue-50 mb-1')}
        onClick={() => nodo.hijos?.length && toggleExpandir(nodo.id)}>
        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', nivel === 0 ? 'bg-unt-azul' : nivel === 1 ? 'bg-blue-400' : 'bg-gray-400')} />
        {nodo.hijos?.length > 0 && (
          expandidos[nodo.id] ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />
        )}
        <span className={clsx('font-medium text-sm', nivel === 0 ? 'text-unt-azul' : 'text-gray-700')}>{nodo.codigo} — {nodo.nombre}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{nodo.nivel}</span>
        <span className="text-xs text-gray-400">{nodo.tipo_nombre}</span>
      </div>
      {nodo.hijos?.length > 0 && expandidos[nodo.id] && (
        <div className="ml-4">
          {nodo.hijos.map(hijo => <NodoMapa key={hijo.id} nodo={hijo} nivel={nivel + 1} />)}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader titulo="Mapa de Procesos" descripcion="Gestión de macroprocesos, procesos y subprocesos institucionales" icono={GitBranch}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nuevo proceso</button>} />

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <StatCard label="Total procesos" valor={stats.total} icono={GitBranch} color="blue" />
          {stats.por_tipo?.map(t => <StatCard key={t.tipo} label={t.tipo} valor={t.cantidad} icono={GitBranch} color="green" />)}
        </div>
      )}

      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input className="campo pl-9" placeholder="Buscar procesos..." value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('tabla')} className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', vista === 'tabla' ? 'bg-white text-unt-azul shadow-sm' : 'text-gray-500')}>Tabla</button>
            <button onClick={() => setVista('mapa')} className={clsx('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', vista === 'mapa' ? 'bg-white text-unt-azul shadow-sm' : 'text-gray-500')}>Mapa</button>
          </div>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      {cargando ? <CargandoPagina /> : vista === 'mapa' ? (
        <div className="tarjeta">
          <h2 className="font-semibold text-gray-800 mb-4">Árbol de procesos institucionales</h2>
          {mapa.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No hay procesos registrados</p> : (
            <div className="space-y-2">
              {mapa.map(nodo => <NodoMapa key={nodo.id} nodo={nodo} nivel={0} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="tarjeta p-0 overflow-hidden">
          {procesos.length === 0 ? (
            <EstadoVacio icono={GitBranch} titulo="No hay procesos" descripcion="Registre los procesos institucionales"
              accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nuevo proceso</button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="tabla-encabezado">Código</th>
                    <th className="tabla-encabezado">Nombre</th>
                    <th className="tabla-encabezado">Tipo</th>
                    <th className="tabla-encabezado">Nivel</th>
                    <th className="tabla-encabezado">Responsable</th>
                    <th className="tabla-encabezado">Estado</th>
                    <th className="tabla-encabezado text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {procesos.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="tabla-celda font-mono text-xs text-unt-azul font-semibold">{p.codigo}</td>
                      <td className="tabla-celda"><p className="font-medium text-gray-800">{p.nombre}</p><p className="text-xs text-gray-400">{p.proceso_padre_nombre}</p></td>
                      <td className="tabla-celda text-gray-500">{p.tipo_nombre}</td>
                      <td className="tabla-celda"><Badge estado={p.nivel} /></td>
                      <td className="tabla-celda text-gray-500 text-xs">{p.responsable_nombre}</td>
                      <td className="tabla-celda"><Badge estado={p.activo ? 'activo' : 'inactivo'} /></td>
                      <td className="tabla-celda">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => descargarPDF(p.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                          <button onClick={() => abrirEditar(p)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                          <button onClick={() => { setSeleccionado(p); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
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

      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar proceso' : 'Nuevo proceso'} size="xl">
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Campo label="Código" required><input className="campo" value={form.codigo} onChange={e => setForm({...form, codigo: e.target.value})} placeholder="MAC-001" disabled={!!seleccionado} /></Campo>
            <Campo label="Tipo" required>
              <select className="campo" value={form.tipo_id} onChange={e => setForm({...form, tipo_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Nivel" required>
              <select className="campo" value={form.nivel} onChange={e => setForm({...form, nivel: e.target.value})}>
                {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nombre" required><input className="campo" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Nombre del proceso" /></Campo>
            <Campo label="Responsable" required>
              <select className="campo" value={form.responsable_id} onChange={e => setForm({...form, responsable_id: e.target.value})}>
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Proceso padre">
            <select className="campo" value={form.proceso_padre_id} onChange={e => setForm({...form, proceso_padre_id: e.target.value})}>
              <option value="">Ninguno (proceso raíz)</option>
              {procesos.filter(p => p.id !== seleccionado?.id).map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
            </select>
          </Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Objetivo"><textarea className="campo" rows={2} value={form.objetivo} onChange={e => setForm({...form, objetivo: e.target.value})} /></Campo>
            <Campo label="Alcance"><textarea className="campo" rows={2} value={form.alcance} onChange={e => setForm({...form, alcance: e.target.value})} /></Campo>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Entradas"><textarea className="campo" rows={2} value={form.entradas} onChange={e => setForm({...form, entradas: e.target.value})} /></Campo>
            <Campo label="Salidas"><textarea className="campo" rows={2} value={form.salidas} onChange={e => setForm({...form, salidas: e.target.value})} /></Campo>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">Cancelar</button>
            <button type="submit" disabled={guardando} className="btn-primario">{guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear proceso'}</button>
          </div>
        </form>
      </Modal>

      <ModalConfirmar abierto={modalEliminar} onCerrar={() => setModalEliminar(false)} onConfirmar={eliminar} cargando={guardando}
        titulo="¿Desactivar proceso?" mensaje={`El proceso "${seleccionado?.nombre}" quedará inactivo.`} />
    </div>
  );
}
