const router = require('express').Router();
const ctrl = require('../controllers/documentos.controller');
const { verificarToken, noSoloLectura, soloAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/documentos/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verificarToken);

router.get('/',                    ctrl.listar);
router.get('/estadisticas',        ctrl.estadisticas);
router.get('/categorias',          ctrl.listarCategorias);
router.get('/:id',                 ctrl.obtener);
router.get('/:id/versiones',       ctrl.obtenerVersiones);
router.get('/:id/historial',       ctrl.historialFlujo);
router.get('/:id/pdf',             ctrl.generarPDF);

router.post('/',                   noSoloLectura, upload.single('archivo'), ctrl.crear);
router.put('/:id',                 noSoloLectura, upload.single('archivo'), ctrl.actualizar);
router.post('/:id/flujo',          noSoloLectura, ctrl.cambiarEstado);
router.post('/:id/nueva-version',  noSoloLectura, upload.single('archivo'), ctrl.nuevaVersion);
router.delete('/:id',              soloAdmin, ctrl.eliminar);

module.exports = router;
