const router = require('express').Router();
const ctrl = require('../controllers/riesgos.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/categorias',           ctrl.listarCategorias);
router.get('/',                     ctrl.listar);
router.get('/estadisticas',         ctrl.estadisticas);
router.get('/matriz',               ctrl.matriz);
router.get('/:id',                  ctrl.obtener);
router.get('/:id/planes',           ctrl.listarPlanes);
router.get('/:id/monitoreo',        ctrl.listarMonitoreo);
router.get('/:id/pdf',              ctrl.generarPDF);

router.post('/',                    tienePermiso('riesgos.crear'), ctrl.crear);
router.put('/:id',                  tienePermiso('riesgos.editar'), ctrl.actualizar);
router.patch('/:id/estado',         tienePermiso('riesgos.editar'), ctrl.cambiarEstado);
router.delete('/:id',               tienePermiso('riesgos.eliminar'), ctrl.eliminar);

router.post('/:id/planes',          tienePermiso('riesgos.editar'), ctrl.crearPlan);
router.put('/planes/:planId',       tienePermiso('riesgos.editar'), ctrl.actualizarPlan);

router.post('/:id/monitoreo',       tienePermiso('riesgos.monitorear'), ctrl.registrarMonitoreo);

module.exports = router;
