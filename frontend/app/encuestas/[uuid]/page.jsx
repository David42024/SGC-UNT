'use client';
import { useState, useEffect, use } from 'react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { ClipboardList, Star, ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { CargandoPagina } from '../../../components/ui';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/survey-core.min.css';

export default function ResponderEncuestaPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const uuid = params.uuid;

  const [encuesta, setEncuesta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Student code validation
  const [codigoEstudiante, setCodigoEstudiante] = useState('');
  const [codigoIngresado, setCodigoIngresado] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState('');

  // Success state
  const [completada, setCompletada] = useState(false);

  useEffect(() => {
    async function cargarEncuesta() {
      try {
        const res = await api.get(`/satisfaccion/publica/${uuid}`);
        setEncuesta(res.data.datos);
      } catch (error) {
        setErrorMsg(error.response?.data?.mensaje || 'La encuesta no está disponible.');
      } finally {
        setCargando(false);
      }
    }
    cargarEncuesta();
  }, [uuid]);

  const validarCodigo = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(codigoEstudiante)) {
      setErrorCodigo('El código de estudiante debe ser un número de exactamente 10 dígitos.');
      return;
    }
    setErrorCodigo('');
    setCodigoIngresado(true);
  };

  if (cargando) {
    return <CargandoPagina />;
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Encuesta No Disponible</h3>
          <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
          <a href="/encuestas" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[#063B96] hover:underline">
            <ArrowLeft size={16} />
            Volver a las encuestas
          </a>
        </div>
      </div>
    );
  }

  // Si requiere código de estudiante y aún no se ingresa
  if (encuesta.visibilidad === 'estudiante' && !codigoIngresado) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="bg-[#063B96] text-white py-6 shadow-md border-b border-blue-900">
          <div className="max-w-3xl mx-auto px-4 flex items-center gap-3">
            <a href="/encuestas" className="text-blue-200 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-lg font-bold">UNIVERSIDAD NACIONAL DE TRUJILLO</h1>
              <p className="text-xs text-blue-200">{encuesta.titulo}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso a Estudiantes</h2>
            <p className="text-sm text-gray-500 mb-6">
              Para responder a esta encuesta de satisfacción, por favor introduce tu código de estudiante de 10 dígitos.
            </p>

            <form onSubmit={validarCodigo} className="space-y-4">
              <div>
                <label htmlFor="codigo" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Código de Estudiante
                </label>
                <input
                  type="text"
                  id="codigo"
                  placeholder="Ej. 1040500124"
                  maxLength={10}
                  className="campo w-full tracking-widest text-center text-lg font-bold py-2.5 focus:border-[#063B96]"
                  value={codigoEstudiante}
                  onChange={(e) => setCodigoEstudiante(e.target.value.replace(/\D/g, ''))}
                  required
                />
                {errorCodigo && (
                  <p className="text-xs text-red-500 mt-2 font-medium">{errorCodigo}</p>
                )}
              </div>

              <button type="submit" className="btn-primario w-full py-2.5 font-bold">
                Ingresar a la Encuesta
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Si ya se completó el envío exitosamente
  if (completada) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">¡Muchas Gracias!</h3>
          <p className="text-sm text-gray-500 mt-2">
            Tus respuestas han sido registradas exitosamente en el Sistema de Gestión de la Calidad.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Tu contribución nos ayuda a seguir mejorando nuestros estándares educativos.
          </p>
          <a href="/encuestas" className="mt-8 inline-flex items-center gap-1.5 btn-primario font-bold px-6 py-2 mx-auto">
            Volver a la lista
          </a>
        </div>
      </div>
    );
  }

  // Estructura JSON de la encuesta
  let surveyJson = {};
  if (encuesta.estructura_json) {
    try {
      surveyJson = typeof encuesta.estructura_json === 'string' 
        ? JSON.parse(encuesta.estructura_json) 
        : encuesta.estructura_json;
    } catch (e) {
      console.error('Error parsing survey structure:', e);
      surveyJson = { title: encuesta.titulo, pages: [] };
    }
  } else {
    surveyJson = { title: encuesta.titulo, pages: [] };
  }

  // Inicializar SurveyJS
  const survey = new Model(surveyJson);
  
  // Aplicar tema moderno
  survey.applyTheme({
    cssVariables: {
      "--sjs-general-backcolor": "#ffffff",
      "--sjs-primary-backcolor": "#063B96",
      "--sjs-primary-backcolor-hover": "#05307a",
      "--sjs-primary-backcolor-light": "rgba(6, 59, 150, 0.1)",
      "--sjs-primary-forecolor": "#ffffff",
      "--sjs-primary-forecolor-light": "#063B96",
      "--sjs-border-default": "rgba(0, 0, 0, 0.16)",
      "--sjs-border-inside": "rgba(0, 0, 0, 0.16)"
    }
  });

  // Evento al completar la encuesta
  survey.onComplete.add(async (sender) => {
    try {
      const payload = {
        codigo_estudiante: codigoEstudiante || null,
        respuestas: sender.data // SurveyJS responses JSON (respects case-sensitivity)
      };

      await api.post(`/satisfaccion/publica/${uuid}/responder`, payload);
      setCompletada(true);
    } catch (error) {
      console.error('Error al enviar respuestas:', error);
      toast.error(error.response?.data?.mensaje || 'Error al guardar tus respuestas.');
      // Permitir que el usuario vuelva a intentar completar
      sender.isCompletedBeforePageComplete = false;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-[#063B96] text-white py-6 shadow-md border-b border-blue-900 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <a href="/encuestas" className="text-blue-200 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </a>
            <div>
              <h1 className="text-lg font-bold">UNIVERSIDAD NACIONAL DE TRUJILLO</h1>
              <p className="text-xs text-blue-200">SGC-UNT — Encuesta de Satisfacción</p>
            </div>
          </div>
          <div className="text-right text-xs text-blue-200 hidden sm:block">
            {encuesta.visibilidad === 'estudiante' ? 'Acceso: Estudiante' : 'Acceso: Público'}
            {encuesta.privacidad === 'no_anonima' && ' (Nominal)'}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{encuesta.titulo}</h2>
          {encuesta.descripcion && (
            <p className="text-sm text-gray-600">{encuesta.descripcion}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 md:p-6 overflow-hidden">
          <Survey model={survey} />
        </div>
      </main>

      <footer className="bg-gray-100 border-t border-gray-200 py-6 text-center text-xs text-gray-500 flex-shrink-0">
        <p>© {new Date().getFullYear()} Universidad Nacional de Trujillo. Oficina de Gestión de la Calidad (OGC).</p>
      </footer>
    </div>
  );
}
