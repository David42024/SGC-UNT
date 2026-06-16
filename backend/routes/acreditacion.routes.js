const router = require('express').Router();
const ctrl = require('../controllers/acreditacion.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/evidencias/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verificarToken);

router.get('/modelos',                          ctrl.listarModelos);
router.get('/modelos/:modeloId/estandares',     ctrl.listarEstandares);
router.get('/autoevaluaciones',                 ctrl.listarAutoevaluaciones);
router.get('/autoevaluaciones/:id',             ctrl.obtenerAutoevaluacion);
router.get('/autoevaluaciones/:id/evidencias',  ctrl.listarEvidencias);
router.get('/autoevaluaciones/:id/avance',      ctrl.avanceAutoevaluacion);
router.get('/autoevaluaciones/:id/pdf',         ctrl.generarPDF);

router.post('/autoevaluaciones',                noSoloLectura, ctrl.crearAutoevaluacion);
router.put('/autoevaluaciones/:id',             noSoloLectura, ctrl.actualizarAutoevaluacion);
router.delete('/autoevaluaciones/:id',          soloAdmin, ctrl.eliminarAutoevaluacion);

router.post('/autoevaluaciones/:id/evidencias', noSoloLectura, upload.single('archivo'), ctrl.registrarEvidencia);
router.put('/evidencias/:evidId',               noSoloLectura, upload.single('archivo'), ctrl.actualizarEvidencia);
router.delete('/evidencias/:evidId',            soloAdmin, ctrl.eliminarEvidencia);

module.exports = router;
