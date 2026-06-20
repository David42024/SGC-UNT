'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { FileText, Plus, Search, Download, Edit, Trash2, GitCommit, RefreshCw } from 'lucide-react';
import { Badge, Modal, ModalConfirmar, EstadoVacio, PageHeader, Campo } from '../../components/ui';

// ==========================================
// ESTADOS CORRECTOS (coinciden con BD)
// ==========================================
const ESTADOS = ['borrador', 'revision', 'aprobado', 'vigente', 'obsoleto'];

// ==========================================
// ACCIONES POR ESTADO
// ==========================================
const ACCIONES_FLUJO = {
  borrador: {
    accion: 'enviar_revision',
    label: 'Enviar a Revisión',
    color: 'btn-primario'
  },
  revision: {
    accion: 'aprobar',
    label: 'Aprobar',
    color: 'btn-primario'
  },
  aprobado: {
    accion: 'publicar',
    label: 'Publicar (Vigente)',
    color: 'btn-primario'
  },
  vigente: {
    accion: 'obsoleter',
    label: 'Marcar Obsoleto',
    color: 'btn-peligro'
  }
};

// ==========================================
// FORMULARIO VACÍO CON PROCESO
// ==========================================
const FORM_VACIO = {
  codigo: '',
  titulo: '',
  descripcion: '',
  categoria_id: '',
  responsable_id: '',
  revisor_id: '',
  aprobador_id: '',
  fecha_emision: '',
  fecha_vencimiento: '',
  proceso_id: ''
};

export default function DocumentosPage() {
  const [docs, setDocs] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [procesos, setProcesos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  // FIX (feature #1): nuevo estado para el filtro por proceso, mismo patrón que filtroEstado/filtroCategoria
  const [filtroProceso, setFiltroProceso] = useState('');
  const [modalForm, setModalForm] = useState(false);
  const [modalFlujo, setModalFlujo] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [comentarioFlujo, setComentarioFlujo] = useState('');

  // ==========================================
  // CARGAR DATOS (incluye procesos)
  // ==========================================
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (buscar) params.buscar = buscar;
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroCategoria) params.categoria_id = filtroCategoria;
      // FIX (feature #1): se manda proceso_id igual que los demás filtros.
      // Confirmado que el backend ya lo soporta en documentos.controller.js (listar)
      if (filtroProceso) params.proceso_id = filtroProceso;

      const [docsRes, catRes, usrRes, procRes] = await Promise.all([
        api.get('/documentos', { params }),
        api.get('/documentos/categorias'),
        api.get('/usuarios'),
        api.get('/procesos')
      ]);

      setDocs(docsRes.data.datos || []);
      setCategorias(catRes.data.datos || []);
      setUsuarios(usrRes.data.datos || []);
      setProcesos(procRes.data.datos || []);
    } catch (err) {
      toast.error('Error al cargar documentos');
      setDocs([]);
    } finally {
      setCargando(false);
    }
  }, [buscar, filtroEstado, filtroCategoria, filtroProceso]);

  useEffect(() => { cargar(); }, [cargar]);

  // ==========================================
  // ABRIR NUEVO / EDITAR
  // ==========================================
  const abrirNuevo = () => {
    setSeleccionado(null);
    setForm(FORM_VACIO);
    setModalForm(true);
  };

  const abrirEditar = (doc) => {
    setSeleccionado(doc);
    setForm({
      codigo: doc.codigo,
      titulo: doc.titulo,
      descripcion: doc.descripcion || '',
      categoria_id: doc.categoria_id,
      responsable_id: doc.responsable_id,
      revisor_id: doc.revisor_id || '',
      aprobador_id: doc.aprobador_id || '',
      fecha_emision: doc.fecha_emision?.slice(0, 10) || '',
      fecha_vencimiento: doc.fecha_vencimiento?.slice(0, 10) || '',
      proceso_id: doc.proceso_id || ''
    });
    setModalForm(true);
  };

  // ==========================================
  // GUARDAR DOCUMENTO
  // ==========================================
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.codigo || !form.titulo || !form.categoria_id || !form.responsable_id) {
      toast.error('Complete los campos obligatorios');
      return;
    }
    setGuardando(true);
    try {
      if (seleccionado) {
        await api.put(`/documentos/${seleccionado.id}`, form);
        toast.success('Documento actualizado');
      } else {
        await api.post('/documentos', form);
        toast.success('Documento creado');
      }
      setModalForm(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // CAMBIAR ESTADO
  // ==========================================
  const cambiarEstado = async () => {
    if (!seleccionado) return;
    const flujo = ACCIONES_FLUJO[seleccionado.estado];
    if (!flujo) return;
    setGuardando(true);
    try {
      await api.post(`/documentos/${seleccionado.id}/flujo`, {
        accion: flujo.accion,
        comentario: comentarioFlujo
      });
      toast.success(`Estado cambiado: ${flujo.label}`);
      setModalFlujo(false);
      setComentarioFlujo('');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al cambiar estado');
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // ELIMINAR DOCUMENTO
  // ==========================================
  const eliminar = async () => {
    setGuardando(true);
    try {
      await api.delete(`/documentos/${seleccionado.id}`);
      toast.success('Documento eliminado');
      setModalEliminar(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // DESCARGAR PDF
  // ==========================================
  const descargarPDF = async (id) => {
    try {
      const res = await api.get(`/documentos/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `documento-${id}.pdf`;
      a.click();
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div>
      <PageHeader
        titulo="Gestión Documental"
        descripcion="Administre los documentos del sistema de calidad"
        icono={FileText}
        acciones={<button onClick={abrirNuevo} className="btn-primario"><Plus size={16} />Nuevo documento</button>}
      />

      {/* Filtros */}
      <div className="tarjeta mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              className="campo pl-9"
              placeholder="Buscar por código o título..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
            />
          </div>
          <select
            className="campo w-auto"
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select
            className="campo w-auto"
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {/* FIX (feature #1): filtro por proceso, mismo patrón visual que Estado/Categoría */}
          <select
            className="campo w-auto"
            value={filtroProceso}
            onChange={e => setFiltroProceso(e.target.value)}
          >
            <option value="">Todos los procesos</option>
            {procesos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
          </select>
          <button onClick={cargar} className="btn-secundario"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Tabla */}
      <div className="tarjeta p-0 overflow-hidden">
        {cargando ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-3 border-unt-azul border-t-transparent rounded-full animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <EstadoVacio
            icono={FileText}
            titulo="No hay documentos"
            descripcion="Cree su primer documento para comenzar"
            accion={<button onClick={abrirNuevo} className="btn-primario mx-auto"><Plus size={16} />Nuevo documento</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="tabla-encabezado">Código</th>
                  <th className="tabla-encabezado">Título</th>
                  <th className="tabla-encabezado">Categoría</th>
                  <th className="tabla-encabezado">Proceso</th>
                  <th className="tabla-encabezado">Versión</th>
                  <th className="tabla-encabezado">Estado</th>
                  <th className="tabla-encabezado">Responsable</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="tabla-celda font-mono text-xs text-unt-azul font-semibold">{doc.codigo}</td>
                      <td className="tabla-celda max-w-[220px]">
                        <p className="font-medium text-gray-800 truncate" title={doc.titulo}>{doc.titulo}</p>
                      </td>
                    <td className="tabla-celda text-gray-500">{doc.categoria_nombre}</td>
                    <td className="tabla-celda text-gray-500">
                      {doc.proceso_nombre || '-'}
                    </td>
                    <td className="tabla-celda text-center">{doc.version_actual}</td>
                    <td className="tabla-celda"><Badge estado={doc.estado} /></td>
                    <td className="tabla-celda text-gray-500 text-xs">{doc.responsable_nombre}</td>
                    <td className="tabla-celda">
                      <div className="flex items-center gap-1 justify-end">
                        {ACCIONES_FLUJO[doc.estado] && (
                          <button
                            onClick={() => { setSeleccionado(doc); setModalFlujo(true); }}
                            title="Cambiar estado"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <GitCommit size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => descargarPDF(doc.id)}
                          title="Descargar PDF"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => abrirEditar(doc)}
                          title="Editar"
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => { setSeleccionado(doc); setModalEliminar(true); }}
                          title="Eliminar"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
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

      {/* Modal formulario */}
      <Modal
        abierto={modalForm}
        onCerrar={() => setModalForm(false)}
        titulo={seleccionado ? 'Editar documento' : 'Nuevo documento'}
        size="lg"
      >
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Código" required>
              <input
                className="campo"
                value={form.codigo}
                onChange={e => setForm({ ...form, codigo: e.target.value })}
                placeholder="POL-001"
                disabled={!!seleccionado}
              />
            </Campo>
            <Campo label="Versión">
              <input className="campo bg-gray-50" value="1.0" disabled />
            </Campo>
          </div>

          <Campo label="Título" required>
            <input
              className="campo"
              value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value.toUpperCase() })}
              placeholder="Nombre del documento"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Categoría" required>
              <select
                className="campo"
                value={form.categoria_id}
                onChange={e => setForm({ ...form, categoria_id: e.target.value })}
              >
                <option value="">Seleccione...</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Responsable" required>
              <select
                className="campo"
                value={form.responsable_id}
                onChange={e => setForm({ ...form, responsable_id: e.target.value })}
              >
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
          </div>

          <Campo label="Proceso asociado">
            <select
              className="campo"
              value={form.proceso_id}
              onChange={e => setForm({ ...form, proceso_id: e.target.value })}
            >
              <option value="">Seleccione un proceso...</option>
              {procesos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
            </select>
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Revisor">
              <select
                className="campo"
                value={form.revisor_id}
                onChange={e => setForm({ ...form, revisor_id: e.target.value })}
              >
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
            <Campo label="Aprobador">
              <select
                className="campo"
                value={form.aprobador_id}
                onChange={e => setForm({ ...form, aprobador_id: e.target.value })}
              >
                <option value="">Seleccione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>)}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Fecha de emisión">
              <input
                type="date"
                className="campo"
                value={form.fecha_emision}
                onChange={e => setForm({ ...form, fecha_emision: e.target.value })}
              />
            </Campo>
            <Campo label="Fecha de vencimiento">
              <input
                type="date"
                className="campo"
                value={form.fecha_vencimiento}
                onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
              />
            </Campo>
          </div>

          <Campo label="Descripción">
            <textarea
              className="campo"
              rows={3}
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Descripción del documento..."
            />
          </Campo>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => setModalForm(false)} className="btn-secundario">
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className="btn-primario">
              {guardando ? 'Guardando...' : seleccionado ? 'Actualizar' : 'Crear documento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal flujo de aprobación */}
      <Modal
        abierto={modalFlujo}
        onCerrar={() => setModalFlujo(false)}
        titulo="Cambiar estado del documento"
        size="sm"
      >
        {seleccionado && ACCIONES_FLUJO[seleccionado.estado] && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">{seleccionado.titulo}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Badge estado={seleccionado.estado} />
                <span>→</span>
                <Badge estado={
                  ACCIONES_FLUJO[seleccionado.estado].accion === 'enviar_revision' ? 'revision' :
                    ACCIONES_FLUJO[seleccionado.estado].accion === 'aprobar' ? 'aprobado' :
                      ACCIONES_FLUJO[seleccionado.estado].accion === 'publicar' ? 'vigente' : 'obsoleto'
                } />
              </div>
            </div>
            <Campo label="Comentario (opcional)">
              <textarea
                className="campo"
                rows={3}
                value={comentarioFlujo}
                onChange={e => setComentarioFlujo(e.target.value)}
                placeholder="Añada un comentario..."
              />
            </Campo>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModalFlujo(false)} className="btn-secundario">
                Cancelar
              </button>
              <button
                onClick={cambiarEstado}
                disabled={guardando}
                className={ACCIONES_FLUJO[seleccionado.estado]?.color || 'btn-primario'}
              >
                {guardando ? 'Procesando...' : ACCIONES_FLUJO[seleccionado.estado]?.label}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ModalConfirmar
        abierto={modalEliminar}
        onCerrar={() => setModalEliminar(false)}
        onConfirmar={eliminar}
        cargando={guardando}
        titulo="¿Eliminar documento?"
        mensaje={`Se eliminará permanentemente "${seleccionado?.titulo}". Esta acción no se puede deshacer.`}
      />
    </div>
  );
}