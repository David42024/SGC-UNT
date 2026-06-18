const router = require('express').Router();
const { verificarToken, tienePermiso, cargarPermisosUsuario, requiereRol } = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');
const { consulta } = require('../config/db');

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/', async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.area, u.cargo,
              u.activo, u.ultimo_acceso, u.creado_en, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id=u.rol_id ORDER BY u.nombres`
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.get('/roles', tienePermiso('usuarios.roles'), async (req, res) => {
  try {
    const resultado = await consulta('SELECT * FROM roles WHERE activo=true ORDER BY nombre');
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.area, u.cargo, u.activo, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id=u.rol_id WHERE u.id=$1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.post('/', tienePermiso('usuarios.crear'), async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, rol_id, area, cargo } = req.body;
    const hash = await bcrypt.hash(contrasena, 12);
    const resultado = await consulta(
      `INSERT INTO usuarios (nombres, apellidos, correo, contrasena_hash, rol_id, area, cargo, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id, uuid, nombres, apellidos, correo, area, cargo`,
      [nombres, apellidos, correo.toLowerCase(), hash, rol_id, area, cargo, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Usuario creado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El correo ya está registrado' });
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.put('/:id', tienePermiso('usuarios.editar'), async (req, res) => {
  try {
    const { nombres, apellidos, rol_id, area, cargo, activo } = req.body;
    const resultado = await consulta(
      `UPDATE usuarios SET nombres=$1, apellidos=$2, rol_id=$3, area=$4, cargo=$5, activo=$6, actualizado_por=$7
       WHERE id=$8 RETURNING id, uuid, nombres, apellidos, correo, area, cargo, activo`,
      [nombres, apellidos, rol_id, area, cargo, activo !== false, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.delete('/:id', tienePermiso('usuarios.eliminar'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.usuario.id)
      return res.status(400).json({ exito: false, mensaje: 'No puede eliminar su propio usuario' });
    await consulta('UPDATE usuarios SET activo=false, actualizado_por=$1 WHERE id=$2', [req.usuario.id, req.params.id]);
    res.json({ exito: true, mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// Perfil del usuario actual
router.put('/perfil', async (req, res) => {
  try {
    const { nombres, apellidos, area, cargo } = req.body;
    const resultado = await consulta(
      `UPDATE usuarios SET nombres=$1, apellidos=$2, area=$3, cargo=$4, actualizado_por=$5
       WHERE id=$6 RETURNING id, uuid, nombres, apellidos, correo, area, cargo`,
      [nombres, apellidos, area, cargo, req.usuario.id, req.usuario.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// Cambiar contraseña del usuario actual
router.put('/cambiar-contrasena', async (req, res) => {
  try {
    const { contrasena_actual, contrasena_nueva } = req.body;
    const resultado = await consulta('SELECT contrasena_hash FROM usuarios WHERE id=$1', [req.usuario.id]);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    
    const validPassword = await bcrypt.compare(contrasena_actual, resultado.rows[0].contrasena_hash);
    if (!validPassword) return res.status(400).json({ exito: false, mensaje: 'Contraseña actual incorrecta' });
    
    const hash = await bcrypt.hash(contrasena_nueva, 12);
    await consulta('UPDATE usuarios SET contrasena_hash=$1, actualizado_por=$2 WHERE id=$3', [hash, req.usuario.id, req.usuario.id]);
    res.json({ exito: true, mensaje: 'Contraseña cambiada exitosamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

module.exports = router;
