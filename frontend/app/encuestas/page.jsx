'use client';
import { useState, useEffect } from 'react';
import { Star, ClipboardList, ArrowRight, BookOpen, User } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { CargandoPagina } from '../../components/ui';

export default function EncuestasPublicasPage() {
  const [encuestas, setEncuestas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarEncuestas() {
      try {
        const res = await api.get('/satisfaccion/publicas/list');
        setEncuestas(res.data.datos || []);
      } catch (error) {
        console.error('Error al cargar encuestas:', error);
        toast.error('No se pudieron cargar las encuestas activas.');
      } finally {
        setCargando(false);
      }
    }
    cargarEncuestas();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header Premium */}
      <header className="bg-[#063B96] text-white py-6 shadow-md border-b border-blue-900">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <ClipboardList size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">UNIVERSIDAD NACIONAL DE TRUJILLO</h1>
              <p className="text-xs text-blue-200">Sistema de Gestión de la Calidad (SGC-UNT)</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="bg-white/10 text-xs px-3 py-1.5 rounded-full font-medium border border-white/20">
              Satisfacción e Indicadores
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Encuestas de Satisfacción
          </h2>
          <p className="mt-3 text-lg text-gray-500">
            Tu opinión es fundamental para el proceso de autoevaluación y mejora continua de nuestra universidad.
          </p>
        </div>

        {cargando ? (
          <div className="py-20">
            <CargandoPagina />
          </div>
        ) : encuestas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-blue-50 text-[#063B96] rounded-full flex items-center justify-center mx-auto mb-4">
              <Star size={30} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">No hay encuestas abiertas</h3>
            <p className="text-sm text-gray-500 mt-2">
              En este momento no hay encuestas de satisfacción abiertas para respuestas. Vuelve más tarde.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {encuestas.map((enc) => (
              <div 
                key={enc.id} 
                className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                      enc.visibilidad === 'estudiante' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      {enc.visibilidad === 'estudiante' ? 'Estudiantes' : 'Público General'}
                    </span>
                    
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <BookOpen size={12} />
                      Cierra: {new Date(enc.fecha_cierre).toLocaleDateString('es-PE')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-[#063B96] transition-colors">
                    {enc.titulo}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-3 mb-6">
                    {enc.descripcion || 'Sin descripción proporcionada para esta encuesta de satisfacción.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={12} />
                    {enc.privacidad === 'anonima' ? 'Anónima' : 'No Anónima'}
                  </span>
                  <a 
                    href={`/encuestas/${enc.uuid}`} 
                    className="inline-flex items-center gap-1 text-sm font-bold text-[#063B96] hover:text-blue-800 transition-colors group"
                  >
                    Responder Encuesta
                    <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Universidad Nacional de Trujillo. Todos los derechos reservados.</p>
        <p className="mt-1">Oficina de Gestión de la Calidad (OGC)</p>
      </footer>
    </div>
  );
}
