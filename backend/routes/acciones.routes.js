const router = require('express').Router();
const ctrl = require('../controllers/acciones.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/acciones/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

router.use(verificarToken);

router.get('/',                          ctrl.listar);
router.get('/estadisticas',              ctrl.estadisticas);
router.get('/:id',                       ctrl.obtener);
router.get('/:id/planes',                ctrl.listarPlanes);
router.get('/:id/analisis',              ctrl.obtenerAnalisis);
router.get('/:id/pdf',                   ctrl.generarPDF);

router.post('/',                         noSoloLectura, ctrl.crear);
router.put('/:id',                       noSoloLectura, ctrl.actualizar);
router.patch('/:id/estado',              noSoloLectura, ctrl.cambiarEstado);
router.delete('/:id',                    soloAdmin, ctrl.eliminar);

router.post('/:id/analisis',             noSoloLectura, ctrl.registrarAnalisis);
router.put('/analisis/:analisisId',      noSoloLectura, ctrl.actualizarAnalisis);

router.post('/:id/planes',               noSoloLectura, upload.single('archivo'), ctrl.crearPlan);
router.put('/planes/:planId',            noSoloLectura, upload.single('archivo'), ctrl.actualizarPlan);
router.patch('/planes/:planId/estado',   noSoloLectura, ctrl.cambiarEstadoPlan);

module.exports = router;
