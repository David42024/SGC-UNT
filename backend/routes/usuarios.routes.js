const router = require('express').Router();
const { verificarToken, tienePermiso, cargarPermisosUsuario, requiereRol } = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');
const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/reporte', async (req, res) => {
  try {
    const { activo, rol } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (activo !== undefined) { params.push(activo === 'true'); where += ` AND u.activo=$${params.length}`; }
    if (rol) { params.push(rol); where += ` AND r.nombre=$${params.length}`; }

    const resultado = await consulta(
      `SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.area, u.cargo,
              u.activo, u.ultimo_acceso, u.creado_en, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id=u.rol_id
       ${where} ORDER BY u.nombres`, params
    );

    const pdfDoc = await PDFDocument.create();
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let pagina = pdfDoc.addPage([595, 842]);
    let y = 800;
    const width = 595;
    const height = 842;
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    // Encabezado
    pagina.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — REPORTE DE USUARIOS', { x: 20, y: height - 55, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    // Filtros aplicados
    y -= 50;
    pagina.drawText('Filtros aplicados:', { x: 20, y, size: 10, font: fB, color: AZUL });
    y -= 15;
    pagina.drawText(`Estado: ${activo !== undefined ? (activo === 'true' ? 'Activos' : 'Inactivos') : 'Todos'}`, { x: 20, y, size: 9, font: fN, color: rgb(0,0,0) });
    y -= 12;
    pagina.drawText(`Rol: ${rol || 'Todos'}`, { x: 20, y, size: 9, font: fN, color: rgb(0,0,0) });
    y -= 12;
    pagina.drawText(`Total de usuarios: ${resultado.rows.length}`, { x: 20, y, size: 9, font: fN, color: rgb(0,0,0) });

    y -= 20;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('LISTADO DE USUARIOS', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    // Encabezado tabla
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 16, color: rgb(0.9, 0.93, 0.98) });
    pagina.drawText('NOMBRE', { x: 25, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('CORREO', { x: 180, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('ROL', { x: 330, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('ÁREA', { x: 400, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('ESTADO', { x: 500, y, size: 8, font: fB, color: AZUL });
    y -= 12;

    // Filas
    for (const u of resultado.rows) {
      if (y < 50) {
        pagina = pdfDoc.addPage([595, 842]);
        y = 800;
        pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 16, color: rgb(0.9, 0.93, 0.98) });
        pagina.drawText('NOMBRE', { x: 25, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('CORREO', { x: 180, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('ROL', { x: 330, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('ÁREA', { x: 400, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('ESTADO', { x: 500, y, size: 8, font: fB, color: AZUL });
        y -= 12;
      }
      pagina.drawText(`${u.nombres} ${u.apellidos}`, { x: 25, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(u.correo || '—', { x: 180, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(u.rol || '—', { x: 330, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(u.area || '—', { x: 400, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(u.activo ? 'Activo' : 'Inactivo', { x: 500, y, size: 8, font: fN, color: rgb(0,0,0) });
      y -= 12;
    }

    // Pie de página
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Página ${i + 1} de ${totalPages}`, { x: width - 80, y: 20, size: 8, font: fN, color: rgb(0.5, 0.5, 0.5) });
      p.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 20, size: 8, font: fN, color: rgb(0.5, 0.5, 0.5) });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-usuarios.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, activo, rol } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (activo !== undefined) { params.push(activo === 'true'); where += ` AND u.activo=$${params.length}`; }
    if (rol) { params.push(rol); where += ` AND r.nombre=$${params.length}`; }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [resultado, totalResult] = await Promise.all([
      consulta(
        `SELECT u.id, u.uuid, u.nombres, u.apellidos, u.correo, u.area, u.cargo,
                u.activo, u.ultimo_acceso, u.creado_en, r.nombre AS rol
         FROM usuarios u JOIN roles r ON r.id=u.rol_id
         ${where} ORDER BY u.nombres LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      ),
      consulta(`SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id=u.rol_id ${where}`, params)
    ]);

    const total = parseInt(totalResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      exito: true,
      datos: resultado.rows,
      paginacion: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
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
