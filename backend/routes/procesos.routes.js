const router = require('express').Router();
const ctrl = require('../controllers/procesos.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/',              ctrl.listar);
router.get('/tipos',         ctrl.listarTipos);
router.get('/mapa',          ctrl.mapa);
router.get('/estadisticas',  ctrl.estadisticas);
router.get('/:id',           ctrl.obtener);
router.get('/:id/pdf',       ctrl.generarPDF);
router.get('/:id/actividades', ctrl.listarActividades);

router.post('/',             tienePermiso('procesos.crear'), ctrl.crear);
router.put('/:id',           tienePermiso('procesos.editar'), ctrl.actualizar);
router.delete('/:id',        tienePermiso('procesos.eliminar'), ctrl.eliminar);

router.post('/:id/actividades',       tienePermiso('procesos.crear'), ctrl.crearActividad);
router.put('/:id/actividades/:actId', tienePermiso('procesos.editar'), ctrl.actualizarActividad);
router.delete('/:id/actividades/:actId', tienePermiso('procesos.eliminar'), ctrl.eliminarActividad);

module.exports = router;
