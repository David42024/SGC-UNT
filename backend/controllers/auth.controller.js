const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { consulta } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sgc_unt_secret_2024';
const JWT_EXPIRA = process.env.JWT_EXPIRA || '8h';

const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      return res.status(400).json({ exito: false, mensaje: 'Correo y contraseña son requeridos' });
    }

    const resultado = await consulta(
      `SELECT u.*, r.nombre AS rol FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.correo = $1 AND u.activo = true`,
      [correo.toLowerCase()]
    );

    if (!resultado.rows.length) {
      return res.status(401).json({ exito: false, mensaje: 'Credenciales inválidas' });
    }

    const usuario = resultado.rows[0];
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      return res.status(401).json({ exito: false, mensaje: 'Credenciales inválidas' });
    }

    await consulta('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1', [usuario.id]);

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRA }
    );

    res.json({
      exito: true,
      token,
      usuario: {
        id: usuario.id,
        uuid: usuario.uuid,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
        area: usuario.area,
        cargo: usuario.cargo
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ exito: false, mensaje: 'Error en el servidor', error: error.message, stack: error.stack });
  }
};

const logout = async (req, res) => {
  res.json({ exito: true, mensaje: 'Sesión cerrada exitosamente' });
};

const perfil = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.area, u.cargo,
              u.ultimo_acceso, u.creado_en, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id = u.rol_id
       WHERE u.id = $1`,
      [req.usuario.id]
    );
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    const { nombres, apellidos, area, cargo } = req.body;
    await consulta(
      'UPDATE usuarios SET nombres=$1, apellidos=$2, area=$3, cargo=$4, actualizado_por=$5 WHERE id=$6',
      [nombres, apellidos, area, cargo, req.usuario.id, req.usuario.id]
    );
    res.json({ exito: true, mensaje: 'Perfil actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarContrasena = async (req, res) => {
  try {
    const { contrasena_actual, contrasena_nueva } = req.body;
    const resultado = await consulta('SELECT contrasena_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
    const valida = await bcrypt.compare(contrasena_actual, resultado.rows[0].contrasena_hash);
    if (!valida) return res.status(400).json({ exito: false, mensaje: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(contrasena_nueva, 12);
    await consulta('UPDATE usuarios SET contrasena_hash=$1 WHERE id=$2', [hash, req.usuario.id]);
    res.json({ exito: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { login, logout, perfil, actualizarPerfil, cambiarContrasena };
