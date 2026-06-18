const router = require('express').Router();
const ctrl = require('../controllers/acciones.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/acciones/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/',                          ctrl.listar);
router.get('/estadisticas',              ctrl.estadisticas);
router.get('/:id',                       ctrl.obtener);
router.get('/:id/planes',                ctrl.listarPlanes);
router.get('/:id/analisis',              ctrl.obtenerAnalisis);
router.get('/:id/pdf',                   ctrl.generarPDF);

router.post('/',                         tienePermiso('acciones.crear'), ctrl.crear);
router.put('/:id',                       tienePermiso('acciones.editar'), ctrl.actualizar);
router.patch('/:id/estado',              tienePermiso('acciones.cerrar'), ctrl.cambiarEstado);
router.delete('/:id',                    tienePermiso('acciones.eliminar'), ctrl.eliminar);

router.post('/:id/analisis',             tienePermiso('acciones.editar'), ctrl.registrarAnalisis);
router.put('/analisis/:analisisId',      tienePermiso('acciones.editar'), ctrl.actualizarAnalisis);

router.post('/:id/planes',               tienePermiso('acciones.editar'), upload.single('archivo'), ctrl.crearPlan);
router.put('/planes/:planId',            tienePermiso('acciones.editar'), upload.single('archivo'), ctrl.actualizarPlan);
router.patch('/planes/:planId/estado',   tienePermiso('acciones.editar'), ctrl.cambiarEstadoPlan);

module.exports = router;
