const router = require('express').Router();
const ctrl = require('../controllers/riesgos.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');

router.use(verificarToken);

router.get('/categorias',           ctrl.listarCategorias);
router.get('/',                     ctrl.listar);
router.get('/estadisticas',         ctrl.estadisticas);
router.get('/matriz',               ctrl.matriz);
router.get('/:id',                  ctrl.obtener);
router.get('/:id/planes',           ctrl.listarPlanes);
router.get('/:id/monitoreo',        ctrl.listarMonitoreo);
router.get('/:id/pdf',              ctrl.generarPDF);

router.post('/',                    noSoloLectura, ctrl.crear);
router.put('/:id',                  noSoloLectura, ctrl.actualizar);
router.patch('/:id/estado',         noSoloLectura, ctrl.cambiarEstado);
router.delete('/:id',               soloAdmin, ctrl.eliminar);

router.post('/:id/planes',          noSoloLectura, ctrl.crearPlan);
router.put('/planes/:planId',       noSoloLectura, ctrl.actualizarPlan);

router.post('/:id/monitoreo',       noSoloLectura, ctrl.registrarMonitoreo);

module.exports = router;
