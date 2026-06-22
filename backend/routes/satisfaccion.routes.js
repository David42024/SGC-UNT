const router = require('express').Router();
const ctrl = require('../controllers/satisfaccion.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');

// Rutas públicas para encuestas (sin autenticación) - deben ir antes del middleware
router.get('/publicas/list', ctrl.listarPublicas);
router.get('/publica/:uuid', ctrl.obtenerPublicaPorUuid);
router.post('/publica/:uuid/responder', ctrl.responderPublica);

// Aplicar middleware de autenticación para las rutas siguientes
router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/',                              ctrl.listar);
router.get('/estadisticas',                  ctrl.estadisticas);
router.get('/:id',                           ctrl.obtener);
router.get('/:id/preguntas',                 ctrl.listarPreguntas);
router.get('/:id/respuestas',                ctrl.listarRespuestas);
router.get('/:id/resultados',                ctrl.resultados);
router.get('/:id/pdf',                       ctrl.generarPDF);

router.post('/',                             tienePermiso('satisfaccion.crear'), ctrl.crear);
router.put('/:id',                           tienePermiso('satisfaccion.editar'), ctrl.actualizar);
router.patch('/:id/estado',                  tienePermiso('satisfaccion.publicar'), ctrl.cambiarEstado);
router.delete('/:id',                        tienePermiso('satisfaccion.eliminar'), ctrl.eliminar);

router.post('/:id/fechas',                   tienePermiso('satisfaccion.editar'), ctrl.cambiarFechas);

router.post('/:id/preguntas',                tienePermiso('satisfaccion.editar'), ctrl.crearPregunta);
router.put('/preguntas/:pregId',             tienePermiso('satisfaccion.editar'), ctrl.actualizarPregunta);
router.delete('/preguntas/:pregId',          tienePermiso('satisfaccion.editar'), ctrl.eliminarPregunta);

router.post('/:id/responder',                ctrl.responder);

module.exports = router;
