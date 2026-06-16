const jwt = require('jsonwebtoken');
const { consulta } = require('../config/db');

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ exito: false, mensaje: 'Token de acceso requerido' });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET || 'sgc_unt_secret_2024');
    const resultado = await consulta(
      'SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.activo, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = $1',
      [decodificado.id]
    );

    if (!resultado.rows.length || !resultado.rows[0].activo) {
      return res.status(401).json({ exito: false, mensaje: 'Usuario no válido o inactivo' });
    }

    req.usuario = resultado.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ exito: false, mensaje: 'Token inválido o expirado' });
  }
};

const requiereRol = (...roles) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ exito: false, mensaje: 'No autenticado' });
  }
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({ exito: false, mensaje: 'Acceso denegado: rol insuficiente' });
  }
  next();
};

const soloAdmin = requiereRol('admin');
const adminOAuditor = requiereRol('admin', 'auditor');
const noSoloLectura = requiereRol('admin', 'auditor', 'usuario');

module.exports = { verificarToken, requiereRol, soloAdmin, adminOAuditor, noSoloLectura };
