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
      `SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.activo, r.nombre AS rol, r.id AS rol_id
       FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = $1`,
      [decodificado.id]
    );

    if (!resultado.rows.length || !resultado.rows[0].activo) {
      return res.status(401).json({ exito: false, mensaje: 'Usuario no válido o inactivo' });
    }

    req.usuario = resultado.rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ exito: false, mensaje: 'Token inválido o expirado' });
  }
};

// Cargar permisos del usuario
const cargarPermisosUsuario = async (req, res, next) => {
  if (!req.usuario) return next();
  
  try {
    // Si es admin, tiene todos los permisos
    if (req.usuario.rol === 'admin') {
      req.usuario.permisos = ['*'];
      return next();
    }
    
    // Cargar permisos desde la base de datos
    const resultado = await consulta(
      `SELECT p.codigo FROM permisos p
       JOIN roles_permisos rp ON p.id = rp.permiso_id
       WHERE rp.rol_id = $1 AND p.activo = true`,
      [req.usuario.rol_id]
    );
    
    req.usuario.permisos = resultado.rows.map(r => r.codigo);
    next();
  } catch (error) {
    console.error('Error cargando permisos:', error);
    req.usuario.permisos = [];
    next();
  }
};

// Verificar si el usuario tiene un permiso específico
const tienePermiso = (permiso) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ exito: false, mensaje: 'No autenticado' });
  }
  
  // Admin tiene todos los permisos
  if (req.usuario.permisos && req.usuario.permisos.includes('*')) {
    return next();
  }
  
  // Verificar permiso específico
  if (!req.usuario.permisos || !req.usuario.permisos.includes(permiso)) {
    return res.status(403).json({ exito: false, mensaje: 'Acceso denegado: permiso insuficiente' });
  }
  
  next();
};

// Verificar si el usuario tiene alguno de los permisos especificados
const tieneAlgunPermiso = (...permisos) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ exito: false, mensaje: 'No autenticado' });
  }
  
  // Admin tiene todos los permisos
  if (req.usuario.permisos && req.usuario.permisos.includes('*')) {
    return next();
  }
  
  // Verificar si tiene alguno de los permisos
  const tieneAlguno = permisos.some(p => req.usuario.permisos && req.usuario.permisos.includes(p));
  
  if (!tieneAlguno) {
    return res.status(403).json({ exito: false, mensaje: 'Acceso denegado: permiso insuficiente' });
  }
  
  next();
};

// Helpers de compatibilidad con el sistema antiguo (basado en roles)
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

module.exports = { 
  verificarToken, 
  cargarPermisosUsuario,
  tienePermiso,
  tieneAlgunPermiso,
  requiereRol, 
  soloAdmin, 
  adminOAuditor, 
  noSoloLectura 
};
