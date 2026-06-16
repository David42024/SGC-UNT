const router = require('express').Router();
const ctrl = require('../controllers/procesos.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');

router.use(verificarToken);

router.get('/',              ctrl.listar);
router.get('/tipos',         ctrl.listarTipos);
router.get('/mapa',          ctrl.mapa);
router.get('/estadisticas',  ctrl.estadisticas);
router.get('/:id',           ctrl.obtener);
router.get('/:id/pdf',       ctrl.generarPDF);
router.get('/:id/actividades', ctrl.listarActividades);

router.post('/',             noSoloLectura, ctrl.crear);
router.put('/:id',           noSoloLectura, ctrl.actualizar);
router.delete('/:id',        soloAdmin, ctrl.eliminar);

router.post('/:id/actividades',       noSoloLectura, ctrl.crearActividad);
router.put('/:id/actividades/:actId', noSoloLectura, ctrl.actualizarActividad);
router.delete('/:id/actividades/:actId', soloAdmin, ctrl.eliminarActividad);

module.exports = router;
