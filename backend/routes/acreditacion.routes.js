const router = require('express').Router();
const ctrl = require('../controllers/acreditacion.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/evidencias/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/modelos',                          ctrl.listarModelos);
router.get('/modelos/:modeloId/estandares',     ctrl.listarEstandares);
router.get('/autoevaluaciones',                 ctrl.listarAutoevaluaciones);
router.get('/autoevaluaciones/:id',             ctrl.obtenerAutoevaluacion);
router.get('/autoevaluaciones/:id/evidencias',  ctrl.listarEvidencias);
router.get('/autoevaluaciones/:id/avance',      ctrl.avanceAutoevaluacion);
router.get('/autoevaluaciones/:id/pdf',         ctrl.generarPDF);

router.post('/autoevaluaciones',                tienePermiso('acreditacion.crear'), ctrl.crearAutoevaluacion);
router.put('/autoevaluaciones/:id',             tienePermiso('acreditacion.editar'), ctrl.actualizarAutoevaluacion);
router.delete('/autoevaluaciones/:id',          tienePermiso('acreditacion.eliminar'), ctrl.eliminarAutoevaluacion);

router.post('/autoevaluaciones/:id/evidencias', tienePermiso('acreditacion.evidencias'), upload.single('archivo'), ctrl.registrarEvidencia);
router.put('/evidencias/:evidId',               tienePermiso('acreditacion.evidencias'), upload.single('archivo'), ctrl.actualizarEvidencia);
router.delete('/evidencias/:evidId',            tienePermiso('acreditacion.evidencias'), ctrl.eliminarEvidencia);

module.exports = router;
