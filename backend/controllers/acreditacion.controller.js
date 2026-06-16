const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const listarModelos = async (req, res) => {
  try {
    const resultado = await consulta('SELECT * FROM modelos_acreditacion WHERE activo=true ORDER BY nombre');
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarEstandares = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT e.*, ep.nombre AS padre_nombre
       FROM estandares_acreditacion e
       LEFT JOIN estandares_acreditacion ep ON ep.id = e.padre_id
       WHERE e.modelo_id = $1 ORDER BY e.codigo`,
      [req.params.modeloId]
    );
    const construirArbol = (items, padreId = null) =>
      items.filter(i => i.padre_id == padreId).map(i => ({
        ...i, hijos: construirArbol(items, i.id)
      }));
    res.json({ exito: true, datos: construirArbol(resultado.rows) });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarAutoevaluaciones = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT a.*, m.nombre AS modelo_nombre, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM autoevaluaciones a
       JOIN modelos_acreditacion m ON m.id = a.modelo_id
       LEFT JOIN usuarios u ON u.id = a.responsable_id
       ORDER BY a.creado_en DESC`
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtenerAutoevaluacion = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT a.*, m.nombre AS modelo_nombre, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM autoevaluaciones a
       JOIN modelos_acreditacion m ON m.id = a.modelo_id
       LEFT JOIN usuarios u ON u.id = a.responsable_id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Autoevaluación no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crearAutoevaluacion = async (req, res) => {
  try {
    const { modelo_id, nombre, descripcion, periodo, fecha_inicio, fecha_fin, responsable_id } = req.body;
    const resultado = await consulta(
      `INSERT INTO autoevaluaciones (modelo_id, nombre, descripcion, periodo, fecha_inicio, fecha_fin, responsable_id, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [modelo_id, nombre, descripcion, periodo, fecha_inicio, fecha_fin, responsable_id, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Autoevaluación creada exitosamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarAutoevaluacion = async (req, res) => {
  try {
    const { nombre, descripcion, periodo, estado, fecha_inicio, fecha_fin, responsable_id } = req.body;
    const resultado = await consulta(
      `UPDATE autoevaluaciones SET nombre=$1, descripcion=$2, periodo=$3, estado=$4,
       fecha_inicio=$5, fecha_fin=$6, responsable_id=$7, actualizado_por=$8
       WHERE id=$9 RETURNING *`,
      [nombre, descripcion, periodo, estado, fecha_inicio, fecha_fin, responsable_id, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Autoevaluación no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0], mensaje: 'Autoevaluación actualizada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminarAutoevaluacion = async (req, res) => {
  try {
    await consulta('DELETE FROM autoevaluaciones WHERE id=$1', [req.params.id]);
    res.json({ exito: true, mensaje: 'Autoevaluación eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarEvidencias = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT ev.*, e.codigo AS estandar_codigo, e.nombre AS estandar_nombre,
              u.nombres||' '||u.apellidos AS responsable_nombre
       FROM evidencias_acreditacion ev
       JOIN estandares_acreditacion e ON e.id = ev.estandar_id
       LEFT JOIN usuarios u ON u.id = ev.responsable_id
       WHERE ev.autoevaluacion_id = $1 ORDER BY e.codigo`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const registrarEvidencia = async (req, res) => {
  try {
    const { estandar_id, descripcion, tipo_evidencia, url_referencia,
            estado_cumplimiento, porcentaje_cumplimiento, observaciones, responsable_id } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;
    const resultado = await consulta(
      `INSERT INTO evidencias_acreditacion (autoevaluacion_id, estandar_id, descripcion,
       tipo_evidencia, archivo_ruta, url_referencia, estado_cumplimiento,
       porcentaje_cumplimiento, observaciones, responsable_id, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [req.params.id, estandar_id, descripcion, tipo_evidencia, archivo_ruta,
       url_referencia, estado_cumplimiento, porcentaje_cumplimiento || 0, observaciones,
       responsable_id, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Evidencia registrada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarEvidencia = async (req, res) => {
  try {
    const { descripcion, tipo_evidencia, url_referencia,
            estado_cumplimiento, porcentaje_cumplimiento, observaciones, responsable_id } = req.body;
    const archivo_ruta = req.file ? req.file.path : undefined;
    const params = [descripcion, tipo_evidencia, url_referencia, estado_cumplimiento,
                    porcentaje_cumplimiento, observaciones, responsable_id, req.usuario.id];
    let sql = `UPDATE evidencias_acreditacion SET descripcion=$1, tipo_evidencia=$2,
               url_referencia=$3, estado_cumplimiento=$4, porcentaje_cumplimiento=$5,
               observaciones=$6, responsable_id=$7, actualizado_por=$8`;
    if (archivo_ruta) { params.push(archivo_ruta); sql += `, archivo_ruta=$${params.length}`; }
    params.push(req.params.evidId);
    sql += ` WHERE id=$${params.length} RETURNING *`;
    const resultado = await consulta(sql, params);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Evidencia no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminarEvidencia = async (req, res) => {
  try {
    await consulta('DELETE FROM evidencias_acreditacion WHERE id=$1', [req.params.evidId]);
    res.json({ exito: true, mensaje: 'Evidencia eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const avanceAutoevaluacion = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT
         COUNT(*) FILTER (WHERE estado_cumplimiento='cumplido') AS cumplidos,
         COUNT(*) FILTER (WHERE estado_cumplimiento='en_proceso') AS en_proceso,
         COUNT(*) FILTER (WHERE estado_cumplimiento='no_cumplido') AS no_cumplidos,
         COUNT(*) FILTER (WHERE estado_cumplimiento='no_iniciado') AS no_iniciados,
         COUNT(*) AS total,
         ROUND(AVG(porcentaje_cumplimiento),2) AS promedio_cumplimiento
       FROM evidencias_acreditacion WHERE autoevaluacion_id=$1`,
      [req.params.id]
    );
    const semaforo = resultado.rows[0];
    const pct = parseFloat(semaforo.promedio_cumplimiento) || 0;
    semaforo.color_semaforo = pct >= 75 ? 'verde' : pct >= 50 ? 'amarillo' : 'rojo';
    res.json({ exito: true, datos: semaforo });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const [autoEval, evidencias] = await Promise.all([
      consulta(`SELECT a.*, m.nombre AS modelo_nombre, u.nombres||' '||u.apellidos AS responsable_nombre
                FROM autoevaluaciones a JOIN modelos_acreditacion m ON m.id=a.modelo_id
                LEFT JOIN usuarios u ON u.id=a.responsable_id WHERE a.id=$1`, [req.params.id]),
      consulta(`SELECT ev.*, e.codigo AS estandar_codigo, e.nombre AS estandar_nombre
                FROM evidencias_acreditacion ev
                JOIN estandares_acreditacion e ON e.id=ev.estandar_id
                WHERE ev.autoevaluacion_id=$1 ORDER BY e.codigo`, [req.params.id])
    ]);

    if (!autoEval.rows.length) return res.status(404).json({ exito: false, mensaje: 'Autoevaluación no encontrada' });
    const ae = autoEval.rows[0];

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);
    const NEGRO = rgb(0, 0, 0);

    pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — INFORME DE AUTOEVALUACIÓN', { x: 20, y: height - 55, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et + ':', { x: 20, y, size: 9, font: fB, color: AZUL });
      pagina.drawText(val || '—', { x: 150, y, size: 9, font: fN, color: NEGRO });
      y -= 18;
    };
    fila('NOMBRE', ae.nombre); fila('MODELO', ae.modelo_nombre);
    fila('PERÍODO', ae.periodo); fila('ESTADO', ae.estado?.toUpperCase());
    fila('RESPONSABLE', ae.responsable_nombre);
    fila('INICIO', ae.fecha_inicio ? new Date(ae.fecha_inicio).toLocaleDateString('es-PE') : '—');
    fila('FIN', ae.fecha_fin ? new Date(ae.fecha_fin).toLocaleDateString('es-PE') : '—');

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('EVIDENCIAS REGISTRADAS', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    for (const ev of evidencias.rows) {
      const color = ev.estado_cumplimiento === 'cumplido' ? rgb(0.1, 0.6, 0.1) :
                    ev.estado_cumplimiento === 'en_proceso' ? rgb(0.8, 0.5, 0) : rgb(0.7, 0.1, 0.1);
      pagina.drawText(`[${ev.estandar_codigo}] ${ev.estandar_nombre}`, { x: 28, y, size: 8, font: fB, color: AZUL });
      y -= 12;
      pagina.drawText(`  Estado: ${ev.estado_cumplimiento} | Cumplimiento: ${ev.porcentaje_cumplimiento}%`, { x: 28, y, size: 8, font: fN, color: color });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="autoevaluacion-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listarModelos, listarEstandares, listarAutoevaluaciones, obtenerAutoevaluacion,
                   crearAutoevaluacion, actualizarAutoevaluacion, eliminarAutoevaluacion,
                   listarEvidencias, registrarEvidencia, actualizarEvidencia, eliminarEvidencia,
                   avanceAutoevaluacion, generarPDF };
