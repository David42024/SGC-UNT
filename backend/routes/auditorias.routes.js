const router = require('express').Router();
const ctrl = require('../controllers/auditorias.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/auditorias/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/programas',               ctrl.listarProgramas);
router.get('/programas/:id',           ctrl.obtenerPrograma);
router.get('/',                        ctrl.listar);
router.get('/estadisticas',            ctrl.estadisticas);
router.get('/:id',                     ctrl.obtener);
router.get('/:id/hallazgos',           ctrl.listarHallazgos);
router.get('/:id/auditores',           ctrl.listarAuditores);
router.get('/:id/pdf',                 ctrl.generarPDF);

router.post('/programas',              tienePermiso('auditorias.crear'), ctrl.crearPrograma);
router.put('/programas/:id',           tienePermiso('auditorias.editar'), ctrl.actualizarPrograma);
router.post('/',                       tienePermiso('auditorias.crear'), ctrl.crear);
router.put('/:id',                     tienePermiso('auditorias.editar'), ctrl.actualizar);
router.delete('/:id',                  tienePermiso('auditorias.eliminar'), ctrl.eliminar);
router.patch('/:id/estado',            tienePermiso('auditorias.editar'), ctrl.cambiarEstadoAuditoria);

router.post('/:id/auditores',          tienePermiso('auditorias.ejecutar'), ctrl.agregarAuditor);
router.delete('/:id/auditores/:uid',   tienePermiso('auditorias.ejecutar'), ctrl.eliminarAuditor);

router.post('/:id/hallazgos',          tienePermiso('auditorias.hallazgos'), upload.single('archivo'), ctrl.registrarHallazgo);
router.put('/hallazgos/:hId',          tienePermiso('auditorias.hallazgos'), upload.single('archivo'), ctrl.actualizarHallazgo);
router.patch('/hallazgos/:hId/estado', tienePermiso('auditorias.hallazgos'), ctrl.cambiarEstadoHallazgo);

module.exports = router;
