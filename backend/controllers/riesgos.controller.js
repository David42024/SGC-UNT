const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const listarCategorias = async (req, res) => {
  try {
    const resultado = await consulta('SELECT * FROM categorias_riesgo ORDER BY nombre');
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listar = async (req, res) => {
  try {
    const { estado, categoria_id, tipo_riesgo, clasificacion_nivel } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (estado)             { params.push(estado);             where += ` AND r.estado=$${params.length}`; }
    if (categoria_id)       { params.push(categoria_id);       where += ` AND r.categoria_id=$${params.length}`; }
    if (tipo_riesgo)        { params.push(tipo_riesgo);        where += ` AND r.tipo_riesgo=$${params.length}`; }
    if (clasificacion_nivel){ params.push(clasificacion_nivel);where += ` AND r.clasificacion_nivel=$${params.length}`; }

    const resultado = await consulta(
      `SELECT r.*, cr.nombre AS categoria_nombre,
              u.nombres||' '||u.apellidos AS responsable_nombre,
              p.nombre AS proceso_nombre
       FROM riesgos r
       JOIN categorias_riesgo cr ON cr.id=r.categoria_id
       LEFT JOIN usuarios u ON u.id=r.responsable_id
       LEFT JOIN procesos p ON p.id=r.proceso_id
       ${where} ORDER BY r.nivel_riesgo DESC`, params
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT r.*, cr.nombre AS categoria_nombre, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM riesgos r JOIN categorias_riesgo cr ON cr.id=r.categoria_id
       LEFT JOIN usuarios u ON u.id=r.responsable_id WHERE r.id=$1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Riesgo no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crear = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, categoria_id, proceso_id, responsable_id,
            tipo_riesgo, probabilidad, impacto, clasificacion_nivel, descripcion_control_actual } = req.body;
    const resultado = await consulta(
      `INSERT INTO riesgos (codigo, nombre, descripcion, categoria_id, proceso_id, responsable_id,
       tipo_riesgo, probabilidad, impacto, clasificacion_nivel, descripcion_control_actual,
       creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING *`,
      [codigo, nombre, descripcion, categoria_id, proceso_id || null, responsable_id,
       tipo_riesgo, probabilidad, impacto, clasificacion_nivel || calcularClasificacion(probabilidad, impacto),
       descripcion_control_actual, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Riesgo registrado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El código del riesgo ya existe' });
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const calcularClasificacion = (prob, imp) => {
  const nivel = prob * imp;
  if (nivel >= 20) return 'critico';
  if (nivel >= 12) return 'alto';
  if (nivel >= 6)  return 'moderado';
  return 'bajo';
};

const actualizar = async (req, res) => {
  try {
    const { nombre, descripcion, categoria_id, proceso_id, responsable_id, tipo_riesgo,
            probabilidad, impacto, clasificacion_nivel, descripcion_control_actual } = req.body;
    const resultado = await consulta(
      `UPDATE riesgos SET nombre=$1, descripcion=$2, categoria_id=$3, proceso_id=$4,
       responsable_id=$5, tipo_riesgo=$6, probabilidad=$7, impacto=$8, clasificacion_nivel=$9,
       descripcion_control_actual=$10, actualizado_por=$11 WHERE id=$12 RETURNING *`,
      [nombre, descripcion, categoria_id, proceso_id || null, responsable_id, tipo_riesgo,
       probabilidad, impacto, clasificacion_nivel || calcularClasificacion(probabilidad, impacto),
       descripcion_control_actual, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Riesgo no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const resultado = await consulta(
      'UPDATE riesgos SET estado=$1, actualizado_por=$2 WHERE id=$3 RETURNING *',
      [estado, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Riesgo no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    await consulta('DELETE FROM riesgos WHERE id=$1', [req.params.id]);
    res.json({ exito: true, mensaje: 'Riesgo eliminado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarPlanes = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT pm.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM planes_mitigacion_riesgo pm LEFT JOIN usuarios u ON u.id=pm.responsable_id
       WHERE pm.riesgo_id=$1 ORDER BY pm.creado_en`, [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crearPlan = async (req, res) => {
  try {
    const { estrategia, accion, responsable_id, fecha_inicio, fecha_limite,
            probabilidad_residual, impacto_residual } = req.body;
    const resultado = await consulta(
      `INSERT INTO planes_mitigacion_riesgo (riesgo_id, estrategia, accion, responsable_id,
       fecha_inicio, fecha_limite, probabilidad_residual, impacto_residual, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [req.params.id, estrategia, accion, responsable_id, fecha_inicio || null,
       fecha_limite || null, probabilidad_residual || null, impacto_residual || null, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarPlan = async (req, res) => {
  try {
    const { estrategia, accion, responsable_id, fecha_inicio, fecha_limite, estado,
            probabilidad_residual, impacto_residual } = req.body;
    const resultado = await consulta(
      `UPDATE planes_mitigacion_riesgo SET estrategia=$1, accion=$2, responsable_id=$3,
       fecha_inicio=$4, fecha_limite=$5, estado=$6, probabilidad_residual=$7, impacto_residual=$8,
       actualizado_por=$9 WHERE id=$10 RETURNING *`,
      [estrategia, accion, responsable_id, fecha_inicio || null, fecha_limite || null, estado,
       probabilidad_residual || null, impacto_residual || null, req.usuario.id, req.params.planId]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Plan no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarMonitoreo = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT mr.*, u.nombres||' '||u.apellidos AS revisor_nombre
       FROM monitoreo_riesgos mr LEFT JOIN usuarios u ON u.id=mr.revisor_id
       WHERE mr.riesgo_id=$1 ORDER BY mr.fecha_monitoreo DESC`, [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const registrarMonitoreo = async (req, res) => {
  try {
    const { fecha_monitoreo, probabilidad, impacto, observaciones, revisor_id } = req.body;
    const resultado = await consulta(
      `INSERT INTO monitoreo_riesgos (riesgo_id, fecha_monitoreo, probabilidad, impacto, observaciones, revisor_id, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [req.params.id, fecha_monitoreo || new Date(), probabilidad, impacto, observaciones, revisor_id || req.usuario.id, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const matriz = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT probabilidad, impacto, clasificacion_nivel, COUNT(*) AS cantidad
       FROM riesgos WHERE estado != 'cerrado'
       GROUP BY probabilidad, impacto, clasificacion_nivel ORDER BY probabilidad, impacto`
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const estadisticas = async (req, res) => {
  try {
    const [total, porNivel, porEstado, porCategoria] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM riesgos'),
      consulta('SELECT clasificacion_nivel, COUNT(*) AS cantidad FROM riesgos GROUP BY clasificacion_nivel'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM riesgos GROUP BY estado'),
      consulta(`SELECT cr.nombre AS categoria, COUNT(*) AS cantidad
                FROM riesgos r JOIN categorias_riesgo cr ON cr.id=r.categoria_id GROUP BY cr.nombre`)
    ]);
    res.json({ exito: true, datos: { total: parseInt(total.rows[0].total), por_nivel: porNivel.rows, por_estado: porEstado.rows, por_categoria: porCategoria.rows } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const [riesgo, planes] = await Promise.all([
      consulta(`SELECT r.*, cr.nombre AS categoria_nombre, u.nombres||' '||u.apellidos AS responsable_nombre
                FROM riesgos r JOIN categorias_riesgo cr ON cr.id=r.categoria_id
                LEFT JOIN usuarios u ON u.id=r.responsable_id WHERE r.id=$1`, [req.params.id]),
      consulta(`SELECT pm.*, u.nombres||' '||u.apellidos AS responsable_nombre
                FROM planes_mitigacion_riesgo pm LEFT JOIN usuarios u ON u.id=pm.responsable_id
                WHERE pm.riesgo_id=$1 ORDER BY pm.creado_en`, [req.params.id])
    ]);
    if (!riesgo.rows.length) return res.status(404).json({ exito: false, mensaje: 'Riesgo no encontrado' });
    const r = riesgo.rows[0];

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — FICHA DE RIESGO', { x: 20, y: height - 55, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    const colorNivel = r.clasificacion_nivel === 'critico' ? rgb(0.8, 0.1, 0.1) :
                       r.clasificacion_nivel === 'alto'    ? rgb(0.9, 0.4, 0) :
                       r.clasificacion_nivel === 'moderado'? rgb(0.8, 0.7, 0) : rgb(0.1, 0.6, 0.1);

    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et + ':', { x: 20, y, size: 9, font: fB, color: AZUL });
      pagina.drawText(String(val || '—'), { x: 150, y, size: 9, font: fN, color: rgb(0,0,0) });
      y -= 18;
    };
    fila('CÓDIGO', r.codigo); fila('NOMBRE', r.nombre);
    fila('CATEGORÍA', r.categoria_nombre); fila('TIPO', r.tipo_riesgo);
    fila('RESPONSABLE', r.responsable_nombre);
    pagina.drawText('NIVEL:', { x: 20, y, size: 9, font: fB, color: AZUL });
    pagina.drawText(`${r.clasificacion_nivel?.toUpperCase()} (P:${r.probabilidad} × I:${r.impacto} = ${r.nivel_riesgo})`, { x: 150, y, size: 9, font: fB, color: colorNivel });
    y -= 18;
    fila('ESTADO', r.estado); fila('CONTROL ACTUAL', r.descripcion_control_actual?.substring(0, 60));

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('PLANES DE MITIGACIÓN', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;
    for (const plan of planes.rows) {
      pagina.drawText(`[${plan.estrategia}] ${plan.accion?.substring(0, 70)} — ${plan.estado}`, { x: 28, y, size: 8, font: fN, color: rgb(0,0,0) });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5,0.5,0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="riesgo-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listarCategorias, listar, obtener, crear, actualizar, cambiarEstado, eliminar,
                   listarPlanes, crearPlan, actualizarPlan, listarMonitoreo, registrarMonitoreo,
                   matriz, estadisticas, generarPDF };
