const router = require('express').Router();
const ctrl = require('../controllers/satisfaccion.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');

router.use(verificarToken);

router.get('/',                              ctrl.listar);
router.get('/estadisticas',                  ctrl.estadisticas);
router.get('/:id',                           ctrl.obtener);
router.get('/:id/preguntas',                 ctrl.listarPreguntas);
router.get('/:id/respuestas',                ctrl.listarRespuestas);
router.get('/:id/resultados',                ctrl.resultados);
router.get('/:id/pdf',                       ctrl.generarPDF);

router.post('/',                             noSoloLectura, ctrl.crear);
router.put('/:id',                           noSoloLectura, ctrl.actualizar);
router.patch('/:id/estado',                  noSoloLectura, ctrl.cambiarEstado);
router.delete('/:id',                        soloAdmin, ctrl.eliminar);

router.post('/:id/preguntas',                noSoloLectura, ctrl.crearPregunta);
router.put('/preguntas/:pregId',             noSoloLectura, ctrl.actualizarPregunta);
router.delete('/preguntas/:pregId',          noSoloLectura, ctrl.eliminarPregunta);

router.post('/:id/responder',                ctrl.responder);

module.exports = router;
