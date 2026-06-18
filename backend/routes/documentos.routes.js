const router = require('express').Router();
const ctrl = require('../controllers/documentos.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/documentos/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/',                    ctrl.listar);
router.get('/estadisticas',        ctrl.estadisticas);
router.get('/categorias',          ctrl.listarCategorias);
router.get('/:id',                 ctrl.obtener);
router.get('/:id/versiones',       ctrl.obtenerVersiones);
router.get('/:id/historial',       ctrl.historialFlujo);
router.get('/:id/pdf',             ctrl.generarPDF);

router.post('/',                   tienePermiso('documentos.crear'), upload.single('archivo'), ctrl.crear);
router.put('/:id',                 tienePermiso('documentos.editar'), upload.single('archivo'), ctrl.actualizar);
router.post('/:id/flujo',          tienePermiso('documentos.aprobar'), ctrl.cambiarEstado);
router.post('/:id/nueva-version',  tienePermiso('documentos.versionar'), upload.single('archivo'), ctrl.nuevaVersion);
router.delete('/:id',              tienePermiso('documentos.eliminar'), ctrl.eliminar);

module.exports = router;
