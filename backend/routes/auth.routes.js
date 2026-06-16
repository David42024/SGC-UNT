const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth.middleware');

router.post('/login',  ctrl.login);
router.post('/logout', verificarToken, ctrl.logout);
router.get('/perfil',  verificarToken, ctrl.perfil);
router.put('/perfil',  verificarToken, ctrl.actualizarPerfil);
router.post('/cambiar-contrasena', verificarToken, ctrl.cambiarContrasena);

module.exports = router;
