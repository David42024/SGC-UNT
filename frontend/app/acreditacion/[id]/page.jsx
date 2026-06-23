'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Eye, Edit } from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';

export default function AutoevaluacionDetalle() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const [autoevaluacion, setAutoevaluacion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [factorSeleccionado, setFactorSeleccionado] = useState(null);
  const [evaluacion, setEvaluacion] = useState({
    cumplimiento: 'cumple',
    puntaje: 0,
    observaciones: '',
    evidencias: []
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      console.log('🔍 Cargando detalle de autoevaluación con ID:', id);
      const res = await api.get(`/test/acreditacion/autoevaluaciones/${id}`);
      console.log('✅ Respuesta del servidor:', res.data);
      setAutoevaluacion(res.data.datos);
    } catch (err) {
      console.error('❌ Error cargando autoevaluación:', err);
      console.error('Respuesta del servidor:', err.response?.data);
      toast.error(err.response?.data?.mensaje || 'Error al cargar la autoevaluación');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) cargar();
  }, [id, cargar]);

  const abrirEvaluacion = async (factor) => {
    setFactorSeleccionado(factor);
    setMostrarModal(true);
    try {
      const res = await api.get(`/test/acreditacion/autoevaluaciones/${id}/factores/${factor.id}/evaluacion`);
      const data = res.data.datos;
      if (data) {
        const cumple = {
          'cumplido': 'cumple',
          'en_proceso': 'cumple_parcialmente',
          'no_cumplido': 'no_cumple',
          'no_iniciado': 'no_aplica'
        }[data.estado_cumplimiento] || 'cumple';
        setEvaluacion({
          cumplimiento: cumple,
          puntaje: data.porcentaje_cumplimiento || 0,
          observaciones: data.observaciones || '',
          evidencias: []
        });
      }
    } catch {
      setEvaluacion({
        cumplimiento: 'cumple',
        puntaje: 0,
        observaciones: '',
        evidencias: []
      });
    }
  };

  const guardarEvaluacion = async () => {
    try {
      setCargando(true);
      await api.post(`/test/acreditacion/autoevaluaciones/${id}/factores/${factorSeleccionado.id}/evaluacion`, evaluacion);
      toast.success('Evaluación guardada correctamente');
      setMostrarModal(false);
      cargar();
    } catch (err) {
      console.error('Error guardando evaluación:', err);
      toast.error(err.response?.data?.mensaje || 'Error al guardar la evaluación');
    } finally {
      setCargando(false);
    }
  };

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'completado':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'en_proceso':
        return 'border-blue-500 bg-blue-50 text-blue-800';
      case 'pendiente':
        return 'border-gray-500 bg-gray-50 text-gray-800';
      default:
        return 'border-gray-300';
    }
  };

  if (cargando) {
    return <div className="max-w-6xl mx-auto px-4 py-8">Cargando...</div>;
  }

  if (!autoevaluacion) {
    return <div className="max-w-6xl mx-auto px-4 py-8">Autoevaluación no encontrada</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button onClick={() => router.push('/acreditacion')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
        <ArrowLeft size={20} />
        Volver a la lista
      </button>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{autoevaluacion.nombre}</h1>
        <div className="flex flex-wrap gap-4 text-gray-600 mb-6">
          <span><strong>Modelo:</strong> {autoevaluacion.modelo_nombre} {autoevaluacion.modelo_version ? `(${autoevaluacion.modelo_version})` : ''}</span>
          <span><strong>Periodo:</strong> {autoevaluacion.periodo}</span>
          <span><strong>Responsable:</strong> {autoevaluacion.responsable_nombre}</span>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {autoevaluacion.estado === 'en_proceso' ? 'En proceso' : autoevaluacion.estado}
          </span>
        </div>
        {autoevaluacion.descripcion && <p className="text-gray-600 mb-6">{autoevaluacion.descripcion}</p>}
        
        {/* Summary Report */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="text-2xl font-bold text-blue-800">
              {autoevaluacion.factores?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Factores totales</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-800">
              {(autoevaluacion.factores || []).filter(f => f.estado === 'completado').length}
            </div>
            <div className="text-sm text-gray-600">Completados</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="text-2xl font-bold text-yellow-800">
              {(autoevaluacion.factores || []).filter(f => f.estado === 'en_proceso').length}
            </div>
            <div className="text-sm text-gray-600">En proceso</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-800">
              {Math.round(
                (autoevaluacion.factores || []).reduce((acc, f) => acc + (f.porcentaje_promedio || 0), 0) / 
                ((autoevaluacion.factores || []).length || 1)
              )}%
            </div>
            <div className="text-sm text-gray-600">Promedio general</div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Factores de evaluación</h2>
      <div className="grid gap-4">
        {(autoevaluacion.factores || []).map((factor) => (
          <div 
            key={factor.id} 
            className={`border rounded-xl p-4 flex items-center justify-between ${getColorEstado(factor.estado)}`}
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-gray-500">{factor.codigo}</span>
                  <h3 className="font-semibold text-lg">{factor.nombre}</h3>
                </div>
                {factor.descripcion && <p className="text-sm text-gray-600">{factor.descripcion}</p>}
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-medium">
                    Estado: {factor.estado === 'completado' ? 'Completado' : factor.estado === 'en_proceso' ? 'En proceso' : 'Pendiente'}
                  </span>
                  <div className="flex-1 max-w-xs">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${factor.porcentaje_promedio}%`,
                          backgroundColor: factor.porcentaje_promedio >= 75 ? '#10b981' : factor.porcentaje_promedio >= 50 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 mt-1 block">{Math.round(factor.porcentaje_promedio)}% completado</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => abrirEvaluacion(factor)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {factor.estado === 'completado' ? <Eye size={16} /> : <Edit size={16} />}
              {factor.estado === 'completado' ? 'Ver' : 'Evaluar'}
            </button>
          </div>
        ))}
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div 
            className="absolute inset-0" 
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking outside
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold">{factorSeleccionado?.codigo} — {factorSeleccionado?.nombre}</h3>
              {factorSeleccionado?.descripcion && <p className="text-gray-600 mt-2">{factorSeleccionado?.descripcion}</p>}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cumplimiento</label>
                <div className="flex gap-4">
                  {['cumple', 'cumple_parcialmente', 'no_cumple', 'no_aplica'].map((opcion) => (
                    <label key={opcion} className="flex items-center gap-2">
                      <input 
                        type="radio" 
                        name="cumplimiento" 
                        value={opcion}
                        checked={evaluacion.cumplimiento === opcion}
                        onChange={(e) => setEvaluacion({ ...evaluacion, cumplimiento: e.target.value })}
                      />
                      {opcion.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Puntaje: {evaluacion.puntaje}</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={evaluacion.puntaje}
                  onChange={(e) => setEvaluacion({ ...evaluacion, puntaje: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Observaciones</label>
                <textarea 
                  className="w-full border rounded-lg p-3"
                  rows={3}
                  value={evaluacion.observaciones}
                  onChange={(e) => setEvaluacion({ ...evaluacion, observaciones: e.target.value })}
                  placeholder="Escribe tus observaciones..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Evidencias</label>
                <input type="file" multiple className="w-full" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarEvaluacion}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
