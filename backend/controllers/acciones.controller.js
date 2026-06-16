const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const listar = async (req, res) => {
  try {
    const { tipo, estado, impacto, origen } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (tipo)    { params.push(tipo);    where += ` AND nc.tipo=$${params.length}`; }
    if (estado)  { params.push(estado);  where += ` AND nc.estado=$${params.length}`; }
    if (impacto) { params.push(impacto); where += ` AND nc.impacto=$${params.length}`; }
    if (origen)  { params.push(origen);  where += ` AND nc.origen=$${params.length}`; }

    const resultado = await consulta(
      `SELECT nc.*, u.nombres||' '||u.apellidos AS responsable_nombre,
              p.nombre AS proceso_nombre,
              COUNT(pa.id) AS total_actividades,
              COUNT(pa.id) FILTER (WHERE pa.estado='completado') AS actividades_completadas
       FROM no_conformidades nc
       LEFT JOIN usuarios u ON u.id=nc.responsable_id
       LEFT JOIN procesos p ON p.id=nc.proceso_id
       LEFT JOIN planes_accion_capa pa ON pa.no_conformidad_id=nc.id
       ${where} GROUP BY nc.id, u.nombres, u.apellidos, p.nombre
       ORDER BY nc.creado_en DESC`, params
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT nc.*, u.nombres||' '||u.apellidos AS responsable_nombre,
              p.nombre AS proceso_nombre
       FROM no_conformidades nc
       LEFT JOIN usuarios u ON u.id=nc.responsable_id
       LEFT JOIN procesos p ON p.id=nc.proceso_id
       WHERE nc.id=$1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'No conformidad no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crear = async (req, res) => {
  try {
    const { codigo, titulo, descripcion, tipo, origen, proceso_id, hallazgo_id,
            responsable_id, fecha_limite, impacto } = req.body;
    const resultado = await consulta(
      `INSERT INTO no_conformidades (codigo, titulo, descripcion, tipo, origen, proceso_id,
       hallazgo_id, responsable_id, fecha_limite, impacto, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [codigo, titulo, descripcion, tipo, origen, proceso_id || null,
       hallazgo_id || null, responsable_id, fecha_limite, impacto || 'medio', req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'No conformidad registrada' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El código ya existe' });
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { titulo, descripcion, tipo, origen, proceso_id, responsable_id, fecha_limite, impacto } = req.body;
    const resultado = await consulta(
      `UPDATE no_conformidades SET titulo=$1, descripcion=$2, tipo=$3, origen=$4,
       proceso_id=$5, responsable_id=$6, fecha_limite=$7, impacto=$8, actualizado_por=$9
       WHERE id=$10 RETURNING *`,
      [titulo, descripcion, tipo, origen, proceso_id || null, responsable_id, fecha_limite, impacto, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'No conformidad no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { estado, fecha_cierre } = req.body;
    const resultado = await consulta(
      `UPDATE no_conformidades SET estado=$1, fecha_cierre=$2, actualizado_por=$3 WHERE id=$4 RETURNING *`,
      [estado, fecha_cierre || null, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'No conformidad no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    await consulta('DELETE FROM no_conformidades WHERE id=$1', [req.params.id]);
    res.json({ exito: true, mensaje: 'No conformidad eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtenerAnalisis = async (req, res) => {
  try {
    const resultado = await consulta(
      'SELECT * FROM analisis_causa_raiz WHERE no_conformidad_id=$1', [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows[0] || null });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const registrarAnalisis = async (req, res) => {
  try {
    const { metodo, descripcion_problema, causa_raiz, factores_causales, porques } = req.body;
    const existe = await consulta('SELECT id FROM analisis_causa_raiz WHERE no_conformidad_id=$1', [req.params.id]);
    let resultado;
    if (existe.rows.length) {
      resultado = await consulta(
        `UPDATE analisis_causa_raiz SET metodo=$1, descripcion_problema=$2, causa_raiz=$3,
         factores_causales=$4, porques=$5, actualizado_por=$6 WHERE no_conformidad_id=$7 RETURNING *`,
        [metodo, descripcion_problema, causa_raiz, JSON.stringify(factores_causales || {}),
         JSON.stringify(porques || []), req.usuario.id, req.params.id]
      );
    } else {
      resultado = await consulta(
        `INSERT INTO analisis_causa_raiz (no_conformidad_id, metodo, descripcion_problema, causa_raiz,
         factores_causales, porques, creado_por, actualizado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [req.params.id, metodo, descripcion_problema, causa_raiz,
         JSON.stringify(factores_causales || {}), JSON.stringify(porques || []), req.usuario.id]
      );
    }
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarAnalisis = async (req, res) => {
  try {
    const { metodo, descripcion_problema, causa_raiz, factores_causales, porques } = req.body;
    const resultado = await consulta(
      `UPDATE analisis_causa_raiz SET metodo=$1, descripcion_problema=$2, causa_raiz=$3,
       factores_causales=$4, porques=$5, actualizado_por=$6 WHERE id=$7 RETURNING *`,
      [metodo, descripcion_problema, causa_raiz, JSON.stringify(factores_causales || {}),
       JSON.stringify(porques || []), req.usuario.id, req.params.analisisId]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Análisis no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarPlanes = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT pa.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM planes_accion_capa pa LEFT JOIN usuarios u ON u.id=pa.responsable_id
       WHERE pa.no_conformidad_id=$1 ORDER BY pa.orden`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crearPlan = async (req, res) => {
  try {
    const { actividad, responsable_id, fecha_inicio, fecha_limite, orden } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;
    const resultado = await consulta(
      `INSERT INTO planes_accion_capa (no_conformidad_id, actividad, responsable_id, fecha_inicio,
       fecha_limite, archivo_ruta, orden, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [req.params.id, actividad, responsable_id, fecha_inicio || null, fecha_limite, archivo_ruta, orden || 1, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarPlan = async (req, res) => {
  try {
    const { actividad, responsable_id, fecha_inicio, fecha_limite, evidencia_cierre, orden } = req.body;
    const archivo_ruta = req.file ? req.file.path : undefined;
    const params = [actividad, responsable_id, fecha_inicio || null, fecha_limite, evidencia_cierre, orden, req.usuario.id];
    let sql = `UPDATE planes_accion_capa SET actividad=$1, responsable_id=$2, fecha_inicio=$3,
               fecha_limite=$4, evidencia_cierre=$5, orden=$6, actualizado_por=$7`;
    if (archivo_ruta) { params.push(archivo_ruta); sql += `, archivo_ruta=$${params.length}`; }
    params.push(req.params.planId);
    sql += ` WHERE id=$${params.length} RETURNING *`;
    const resultado = await consulta(sql, params);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Plan no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarEstadoPlan = async (req, res) => {
  try {
    const { estado, fecha_cierre, evidencia_cierre } = req.body;
    const resultado = await consulta(
      `UPDATE planes_accion_capa SET estado=$1, fecha_cierre=$2, evidencia_cierre=$3, actualizado_por=$4
       WHERE id=$5 RETURNING *`,
      [estado, fecha_cierre || null, evidencia_cierre, req.usuario.id, req.params.planId]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Plan no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const estadisticas = async (req, res) => {
  try {
    const [total, porTipo, porEstado, porImpacto] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM no_conformidades'),
      consulta('SELECT tipo, COUNT(*) AS cantidad FROM no_conformidades GROUP BY tipo'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM no_conformidades GROUP BY estado'),
      consulta('SELECT impacto, COUNT(*) AS cantidad FROM no_conformidades GROUP BY impacto')
    ]);
    res.json({ exito: true, datos: { total: parseInt(total.rows[0].total), por_tipo: porTipo.rows, por_estado: porEstado.rows, por_impacto: porImpacto.rows } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const [nc, planes, analisis] = await Promise.all([
      consulta(`SELECT nc.*, u.nombres||' '||u.apellidos AS responsable_nombre
                FROM no_conformidades nc LEFT JOIN usuarios u ON u.id=nc.responsable_id WHERE nc.id=$1`, [req.params.id]),
      consulta(`SELECT pa.*, u.nombres||' '||u.apellidos AS responsable_nombre
                FROM planes_accion_capa pa LEFT JOIN usuarios u ON u.id=pa.responsable_id
                WHERE pa.no_conformidad_id=$1 ORDER BY pa.orden`, [req.params.id]),
      consulta('SELECT * FROM analisis_causa_raiz WHERE no_conformidad_id=$1', [req.params.id])
    ]);
    if (!nc.rows.length) return res.status(404).json({ exito: false, mensaje: 'No conformidad no encontrada' });
    const n = nc.rows[0];

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — FICHA DE ACCIÓN CORRECTIVA/PREVENTIVA (CAPA)', { x: 20, y: height - 55, size: 9, font: fN, color: rgb(0.8, 0.9, 1) });

    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et + ':', { x: 20, y, size: 9, font: fB, color: AZUL });
      pagina.drawText(String(val || '—'), { x: 160, y, size: 9, font: fN, color: rgb(0, 0, 0) });
      y -= 18;
    };
    fila('CÓDIGO', n.codigo); fila('TÍTULO', n.titulo);
    fila('TIPO', n.tipo?.toUpperCase()); fila('ESTADO', n.estado?.toUpperCase());
    fila('IMPACTO', n.impacto?.toUpperCase()); fila('ORIGEN', n.origen);
    fila('RESPONSABLE', n.responsable_nombre);
    fila('FECHA LÍMITE', n.fecha_limite ? new Date(n.fecha_limite).toLocaleDateString('es-PE') : '—');

    if (analisis.rows.length) {
      y -= 10;
      pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
      pagina.drawText('ANÁLISIS DE CAUSA RAÍZ', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
      y -= 25;
      const an = analisis.rows[0];
      pagina.drawText(`Método: ${an.metodo} | Causa raíz: ${an.causa_raiz?.substring(0, 80) || '—'}`, { x: 28, y, size: 8, font: fN, color: rgb(0, 0, 0) });
      y -= 20;
    }

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('PLAN DE ACCIÓN', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;
    for (const plan of planes.rows) {
      pagina.drawText(`${plan.orden}. ${plan.actividad?.substring(0, 70)} — ${plan.estado}`, { x: 28, y, size: 8, font: fN, color: rgb(0, 0, 0) });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="capa-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar,
                   obtenerAnalisis, registrarAnalisis, actualizarAnalisis,
                   listarPlanes, crearPlan, actualizarPlan, cambiarEstadoPlan,
                   estadisticas, generarPDF };
