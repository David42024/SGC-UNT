const router = require('express').Router();
const ctrl = require('../controllers/indicadores.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');

router.use(verificarToken);

router.get('/',                           ctrl.listar);
router.get('/dashboard',                  ctrl.dashboard);
router.get('/alertas',                    ctrl.listarAlertas);
router.get('/:id',                        ctrl.obtener);
router.get('/:id/mediciones',             ctrl.listarMediciones);
router.get('/:id/pdf',                    ctrl.generarPDF);

router.post('/',                          noSoloLectura, ctrl.crear);
router.put('/:id',                        noSoloLectura, ctrl.actualizar);
router.patch('/:id/activo',               noSoloLectura, ctrl.toggleActivo);
router.delete('/:id',                     soloAdmin, ctrl.eliminar);

router.post('/:id/mediciones',            noSoloLectura, ctrl.registrarMedicion);
router.put('/mediciones/:medId',          noSoloLectura, ctrl.actualizarMedicion);

module.exports = router;
