'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Star, Send, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function EncuestaPublicaPage() {
  const params = useParams();
  const uuid = params.uuid;
  const [encuesta, setEncuesta] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarEncuesta();
  }, [uuid]);

  const cargarEncuesta = async () => {
    try {
      const [encRes, pregRes] = await Promise.all([
        axios.get(`${API_URL}/satisfaccion/publica/${uuid}`),
        axios.get(`${API_URL}/satisfaccion/publica/${uuid}/preguntas`),
      ]);
      
      if (encRes.data.datos.estado !== 'publicada') {
        setError('Esta encuesta no está disponible en este momento');
        return;
      }
      
      setEncuesta(encRes.data.datos);
      setPreguntas(pregRes.data.datos || []);
      setCargando(false);
    } catch (err) {
      setError('Encuesta no encontrada o no disponible');
      setCargando(false);
    }
  };

  const handleRespuesta = (preguntaId, valor) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }));
  };

  const handleOpcionMultiple = (preguntaId, opcion) => {
    setRespuestas(prev => {
      const actuales = prev[preguntaId] || [];
      if (actuales.includes(opcion)) {
        return { ...prev, [preguntaId]: actuales.filter(o => o !== opcion) };
      } else {
        return { ...prev, [preguntaId]: [...actuales, opcion] };
      }
    });
  };

  const validarRespuestas = () => {
    const obligatorias = preguntas.filter(p => p.obligatoria);
    for (const p of obligatorias) {
      if (!respuestas[p.id] || (Array.isArray(respuestas[p.id]) && respuestas[p.id].length === 0)) {
        toast.error('Por favor responda todas las preguntas obligatorias');
        return false;
      }
    }
    return true;
  };

  const enviarRespuestas = async () => {
    if (!validarRespuestas()) return;
    
    setEnviando(true);
    try {
      const detalles = preguntas.map(p => ({
        pregunta_id: p.id,
        valor_numerico: typeof respuestas[p.id] === 'number' ? respuestas[p.id] : null,
        valor_texto: typeof respuestas[p.id] === 'string' ? respuestas[p.id] : null,
        valor_opcion: Array.isArray(respuestas[p.id]) ? respuestas[p.id].join(',') : null,
      }));

      await axios.post(`${API_URL}/satisfaccion/publica/${uuid}/responder`, {
        tipo_respondente: 'estudiante',
        detalles,
      });

      setEnviado(true);
      toast.success('¡Gracias por participar en la encuesta!');
    } catch (err) {
      toast.error('Error al enviar respuestas. Por favor intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-unt-azul border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Encuesta no disponible</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Gracias por participar!</h2>
          <p className="text-gray-500 mb-6">Sus respuestas han sido registradas exitosamente.</p>
          <p className="text-sm text-gray-400">Universidad Nacional de Trujillo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-unt-azul/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-unt-azul" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Universidad Nacional de Trujillo</p>
              <p className="text-xs text-gray-400">Sistema de Gestión de la Calidad</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{encuesta.titulo}</h1>
          {encuesta.descripcion && (
            <p className="text-gray-600">{encuesta.descripcion}</p>
          )}
          {encuesta.anonima && (
            <p className="text-sm text-gray-400 mt-3">
              Esta encuesta es anónima. Sus respuestas serán confidenciales.
            </p>
          )}
        </div>

        {/* Preguntas */}
        <div className="space-y-4">
          {preguntas.map((pregunta, idx) => (
            <div key={pregunta.id} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-7 h-7 bg-unt-azul text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {pregunta.texto}
                    {pregunta.obligatoria && <span className="text-red-500 ml-1">*</span>}
                  </p>
                </div>
              </div>

              {/* Likert Scale */}
              {pregunta.tipo_pregunta === 'likert' && (
                <div className="grid grid-cols-5 gap-2 ml-10">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      onClick={() => handleRespuesta(pregunta.id, val)}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${
                        respuestas[pregunta.id] === val
                          ? 'border-unt-azul bg-unt-azul text-white'
                          : 'border-gray-200 hover:border-unt-azul/50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {/* Opción Múltiple */}
              {pregunta.tipo_pregunta === 'opcion_multiple' && pregunta.opciones && (
                <div className="space-y-2 ml-10">
                  {pregunta.opciones.map((opcion, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-unt-azul/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={(respuestas[pregunta.id] || []).includes(opcion)}
                        onChange={() => handleOpcionMultiple(pregunta.id, opcion)}
                        className="w-5 h-5 text-unt-azul rounded"
                      />
                      <span className="text-gray-700">{opcion}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Texto Abierto */}
              {pregunta.tipo_pregunta === 'texto_abierto' && (
                <textarea
                  value={respuestas[pregunta.id] || ''}
                  onChange={e => handleRespuesta(pregunta.id, e.target.value)}
                  placeholder="Escriba su respuesta aquí..."
                  className="campo ml-10 w-full"
                  rows={4}
                />
              )}

              {/* NPS */}
              {pregunta.tipo_pregunta === 'nps' && (
                <div className="grid grid-cols-11 gap-1 ml-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <button
                      key={val}
                      onClick={() => handleRespuesta(pregunta.id, val)}
                      className={`py-2 px-1 rounded-lg border-2 transition-all text-sm ${
                        respuestas[pregunta.id] === val
                          ? 'border-unt-azul bg-unt-azul text-white'
                          : 'border-gray-200 hover:border-unt-azul/50'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {/* Sí/No */}
              {pregunta.tipo_pregunta === 'si_no' && (
                <div className="flex gap-4 ml-10">
                  <button
                    onClick={() => handleRespuesta(pregunta.id, 'si')}
                    className={`flex-1 py-3 px-6 rounded-lg border-2 transition-all ${
                      respuestas[pregunta.id] === 'si'
                        ? 'border-unt-azul bg-unt-azul text-white'
                        : 'border-gray-200 hover:border-unt-azul/50'
                    }`}
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => handleRespuesta(pregunta.id, 'no')}
                    className={`flex-1 py-3 px-6 rounded-lg border-2 transition-all ${
                      respuestas[pregunta.id] === 'no'
                        ? 'border-unt-azul bg-unt-azul text-white'
                        : 'border-gray-200 hover:border-unt-azul/50'
                    }`}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botón enviar */}
        <div className="mt-6">
          <button
            onClick={enviarRespuestas}
            disabled={enviando}
            className="w-full btn-primario py-4 text-lg justify-center"
          >
            {enviando ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send size={20} /> Enviar respuestas
              </span>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Universidad Nacional de Trujillo</p>
          <p className="mt-1">Sistema de Gestión de la Calidad</p>
        </div>
      </div>
    </div>
  );
}
