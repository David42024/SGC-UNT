'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { ClipboardCheck, Plus, Search, Download, Edit, Trash2, AlertCircle, RefreshCw, FileWarning } from 'lucide-react';
import { Badge, CargandoPagina, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo, StatCard } from '../../components/ui';

const ESTADOS   = ['planificado','en_curso','finalizado','cancelado'];
const TIPOS     = ['interna','externa','seguimiento'];
const CLASIFS   = ['conforme','no_conformidad_menor','no_conformidad_mayor','observacion','oportunidad_mejora'];
const FORM_VACIO = { programa_id:'', codigo:'', titulo:'', tipo_auditoria:'interna', alcance:'', objetivo:'', proceso_id:'', auditor_lider_id:'', fecha_planificada:'' };
const HALL_VACIO = { codigo:'', descripcion:'', clasificacion:'observacion', estandar_ref:'', evidencia_objetiva:'', responsable_id:'', fecha_limite:'' };

export default function AuditoriasPage() {
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
  const [guardando, setGuardando]   = useState(false);

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

  const filtrados = auditorias.filter(a => !buscar || a.titulo?.toLowerCase().includes(buscar.toLowerCase()) || a.codigo?.toLowerCase().includes(buscar.toLowerCase()));

  const abrirNuevo = () => { setSeleccionado(null); setForm(FORM_VACIO); setModalForm(true); };
  const abrirEditar = (a) => { setSeleccionado(a); setForm({ programa_id: a.programa_id || '', codigo: a.codigo, titulo: a.titulo, tipo_auditoria: a.tipo_auditoria, alcance: a.alcance || '', objetivo: a.objetivo || '', proceso_id: a.proceso_id || '', auditor_lider_id: a.auditor_lider_id, fecha_planificada: a.fecha_planificada?.slice(0,10) || '' }); setModalForm(true); };

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

  const colorClasif = (c) => ({ conforme:'text-green-600', no_conformidad_menor:'text-yellow-600', no_conformidad_mayor:'text-red-600', observacion:'text-blue-600', oportunidad_mejora:'text-purple-600' }[c] || 'text-gray-600');

  return (
    <div>
      <PageHeader titulo="Auditorías e Inspecciones" descripcion="Planificación, ejecución y seguimiento de auditorías internas y externas" icono={ClipboardCheck}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nueva auditoría</button>} />

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
          <EstadoVacio icono={ClipboardCheck} titulo="No hay auditorías" descripcion="Planifique su primera auditoría"
            accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nueva auditoría</button>} />
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
                      <button onClick={() => abrirHallazgos(a)} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-full text-xs hover:bg-orange-100 transition-colors">
                        <FileWarning size={12} />{a.total_hallazgos || 0}
                      </button>
                    </td>
                    <td className="tabla-celda"><Badge estado={a.estado} /></td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => descargarPDF(a.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Download size={15} /></button>
                        <button onClick={() => abrirEditar(a)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                        <button onClick={() => { setSeleccionado(a); setModalEliminar(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
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
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)} titulo={seleccionado ? 'Editar auditoría' : 'Nueva auditoría'} size="lg">
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
      <Modal abierto={modalHallazgos} onCerrar={() => setModalHallazgos(false)} titulo={`Hallazgos — ${seleccionado?.titulo}`} size="xl">
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setFormHall(HALL_VACIO); setModalHallazgo(true); }} className="btn-primario"><Plus size={16} />Registrar hallazgo</button>
          </div>
          {hallazgos.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">No hay hallazgos registrados</p> : (
            <div className="space-y-3">
              {hallazgos.map(h => (
                <div key={h.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-mono text-xs text-unt-azul font-semibold">{h.codigo}</span>
                      <span className={`ml-2 text-xs font-medium ${colorClasif(h.clasificacion)}`}>[{h.clasificacion?.replace(/_/g,' ')}]</span>
                    </div>
                    <Badge estado={h.estado} />
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
      <Modal abierto={modalHallazgo} onCerrar={() => setModalHallazgo(false)} titulo="Registrar hallazgo" size="md">
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
    </div>
  );
}
