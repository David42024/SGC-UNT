const router = require('express').Router();
const ctrl = require('../controllers/auditorias.controller');
const { verificarToken, noSoloLectura, adminOAuditor, soloAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/auditorias/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verificarToken);

router.get('/programas',               ctrl.listarProgramas);
router.get('/programas/:id',           ctrl.obtenerPrograma);
router.get('/',                        ctrl.listar);
router.get('/estadisticas',            ctrl.estadisticas);
router.get('/:id',                     ctrl.obtener);
router.get('/:id/hallazgos',           ctrl.listarHallazgos);
router.get('/:id/auditores',           ctrl.listarAuditores);
router.get('/:id/pdf',                 ctrl.generarPDF);

router.post('/programas',              adminOAuditor, ctrl.crearPrograma);
router.put('/programas/:id',           adminOAuditor, ctrl.actualizarPrograma);
router.post('/',                       adminOAuditor, ctrl.crear);
router.put('/:id',                     adminOAuditor, ctrl.actualizar);
router.delete('/:id',                  soloAdmin, ctrl.eliminar);

router.post('/:id/auditores',          adminOAuditor, ctrl.agregarAuditor);
router.delete('/:id/auditores/:uid',   adminOAuditor, ctrl.eliminarAuditor);

router.post('/:id/hallazgos',          adminOAuditor, upload.single('archivo'), ctrl.registrarHallazgo);
router.put('/hallazgos/:hId',          adminOAuditor, upload.single('archivo'), ctrl.actualizarHallazgo);
router.patch('/hallazgos/:hId/estado', adminOAuditor, ctrl.cambiarEstadoHallazgo);

module.exports = router;
