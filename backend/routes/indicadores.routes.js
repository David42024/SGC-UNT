const router = require('express').Router();
const ctrl = require('../controllers/indicadores.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/',                           ctrl.listar);
router.get('/dashboard',                  ctrl.dashboard);
router.get('/alertas',                    ctrl.listarAlertas);
router.get('/:id',                        ctrl.obtener);
router.get('/:id/mediciones',             ctrl.listarMediciones);
router.get('/:id/pdf',                    ctrl.generarPDF);

router.post('/',                          tienePermiso('indicadores.crear'), ctrl.crear);
router.put('/:id',                        tienePermiso('indicadores.editar'), ctrl.actualizar);
router.patch('/:id/activo',               tienePermiso('indicadores.editar'), ctrl.toggleActivo);
router.delete('/:id',                     tienePermiso('indicadores.eliminar'), ctrl.eliminar);

router.post('/:id/mediciones',            tienePermiso('indicadores.mediciones'), ctrl.registrarMedicion);
router.put('/mediciones/:medId',          tienePermiso('indicadores.mediciones'), ctrl.actualizarMedicion);

module.exports = router;
