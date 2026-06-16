const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const listar = async (req, res) => {
  try {
    const { tipo_id, nivel, activo = 'true', buscar } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (tipo_id) { params.push(tipo_id); where += ` AND p.tipo_id = $${params.length}`; }
    if (nivel)   { params.push(nivel);   where += ` AND p.nivel = $${params.length}`; }
    if (activo)  { params.push(activo === 'true'); where += ` AND p.activo = $${params.length}`; }
    if (buscar)  { params.push(`%${buscar}%`); where += ` AND (p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length})`; }

    const resultado = await consulta(
      `SELECT p.*, tp.nombre AS tipo_nombre,
              u.nombres||' '||u.apellidos AS responsable_nombre,
              pp.nombre AS proceso_padre_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       LEFT JOIN procesos pp ON pp.id = p.proceso_padre_id
       ${where} ORDER BY tp.nombre, p.nivel, p.nombre`, params
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const mapa = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT p.*, tp.nombre AS tipo_nombre,
              u.nombres||' '||u.apellidos AS responsable_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       WHERE p.activo = true ORDER BY tp.nombre, p.proceso_padre_id NULLS FIRST, p.nombre`
    );

    const construirArbol = (procesos, padreId = null) =>
      procesos.filter(p => p.proceso_padre_id == padreId).map(p => ({
        ...p, hijos: construirArbol(procesos, p.id)
      }));

    res.json({ exito: true, datos: construirArbol(resultado.rows) });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT p.*, tp.nombre AS tipo_nombre,
              u.nombres||' '||u.apellidos AS responsable_nombre,
              pp.nombre AS proceso_padre_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       LEFT JOIN procesos pp ON pp.id = p.proceso_padre_id
       WHERE p.id = $1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Proceso no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crear = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, tipo_id, proceso_padre_id, nivel, responsable_id,
            objetivo, alcance, entradas, salidas, recursos, indicadores_clave } = req.body;
    const resultado = await consulta(
      `INSERT INTO procesos (codigo, nombre, descripcion, tipo_id, proceso_padre_id, nivel,
       responsable_id, objetivo, alcance, entradas, salidas, recursos, indicadores_clave,
       creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14) RETURNING *`,
      [codigo, nombre, descripcion, tipo_id, proceso_padre_id || null, nivel,
       responsable_id, objetivo, alcance, entradas, salidas, recursos, indicadores_clave, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Proceso creado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El código del proceso ya existe' });
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { nombre, descripcion, tipo_id, proceso_padre_id, nivel, responsable_id,
            objetivo, alcance, entradas, salidas, recursos, indicadores_clave, activo } = req.body;
    const resultado = await consulta(
      `UPDATE procesos SET nombre=$1, descripcion=$2, tipo_id=$3, proceso_padre_id=$4, nivel=$5,
       responsable_id=$6, objetivo=$7, alcance=$8, entradas=$9, salidas=$10, recursos=$11,
       indicadores_clave=$12, activo=$13, actualizado_por=$14
       WHERE id=$15 RETURNING *`,
      [nombre, descripcion, tipo_id, proceso_padre_id || null, nivel, responsable_id,
       objetivo, alcance, entradas, salidas, recursos, indicadores_clave,
       activo !== undefined ? activo : true, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Proceso no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0], mensaje: 'Proceso actualizado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    const resultado = await consulta('UPDATE procesos SET activo=false WHERE id=$1 RETURNING id', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Proceso no encontrado' });
    res.json({ exito: true, mensaje: 'Proceso desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarTipos = async (req, res) => {
  try {
    const resultado = await consulta('SELECT * FROM tipos_proceso ORDER BY nombre');
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarActividades = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT a.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM actividades_proceso a LEFT JOIN usuarios u ON u.id = a.responsable_id
       WHERE a.proceso_id = $1 ORDER BY a.orden`, [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crearActividad = async (req, res) => {
  try {
    const { orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias } = req.body;
    const resultado = await consulta(
      `INSERT INTO actividades_proceso (proceso_id, orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
      [req.params.id, orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarActividad = async (req, res) => {
  try {
    const { orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias } = req.body;
    const resultado = await consulta(
      `UPDATE actividades_proceso SET orden=$1, nombre=$2, descripcion=$3, responsable_id=$4,
       tipo_actividad=$5, duracion_estimada_dias=$6, actualizado_por=$7
       WHERE id=$8 AND proceso_id=$9 RETURNING *`,
      [orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias,
       req.usuario.id, req.params.actId, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Actividad no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminarActividad = async (req, res) => {
  try {
    await consulta('DELETE FROM actividades_proceso WHERE id=$1 AND proceso_id=$2', [req.params.actId, req.params.id]);
    res.json({ exito: true, mensaje: 'Actividad eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const estadisticas = async (req, res) => {
  try {
    const [total, porTipo, porNivel] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM procesos WHERE activo=true'),
      consulta(`SELECT tp.nombre AS tipo, COUNT(*) AS cantidad
                FROM procesos p JOIN tipos_proceso tp ON tp.id = p.tipo_id
                WHERE p.activo=true GROUP BY tp.nombre`),
      consulta('SELECT nivel, COUNT(*) AS cantidad FROM procesos WHERE activo=true GROUP BY nivel')
    ]);
    res.json({ exito: true, datos: { total: parseInt(total.rows[0].total), por_tipo: porTipo.rows, por_nivel: porNivel.rows } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const proc = await consulta(
      `SELECT p.*, tp.nombre AS tipo_nombre, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM procesos p JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id WHERE p.id=$1`, [req.params.id]
    );
    if (!proc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Proceso no encontrado' });

    const actividades = await consulta(
      `SELECT a.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM actividades_proceso a LEFT JOIN usuarios u ON u.id = a.responsable_id
       WHERE a.proceso_id=$1 ORDER BY a.orden`, [req.params.id]
    );

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fNegrilla = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fNegrilla, color: BLANCO });
    pagina.drawText('SGC-UNT — FICHA DE PROCESO', { x: 20, y: height - 55, size: 10, font: fNormal, color: rgb(0.8, 0.9, 1) });

    const p = proc.rows[0];
    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et+':', { x: 20, y, size: 9, font: fNegrilla, color: AZUL });
      pagina.drawText(val||'—', { x: 150, y, size: 9, font: fNormal, color: rgb(0,0,0) });
      y -= 18;
    };
    fila('CÓDIGO', p.codigo); fila('NOMBRE', p.nombre);
    fila('TIPO', p.tipo_nombre); fila('NIVEL', p.nivel.toUpperCase());
    fila('RESPONSABLE', p.responsable_nombre);
    fila('OBJETIVO', p.objetivo); fila('ENTRADAS', p.entradas); fila('SALIDAS', p.salidas);

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('ACTIVIDADES DEL PROCESO', { x: 28, y: y + 2, size: 10, font: fNegrilla, color: BLANCO });
    y -= 25;
    for (const act of actividades.rows) {
      pagina.drawText(`${act.orden}. [${act.tipo_actividad}] ${act.nombre}`, { x: 28, y, size: 9, font: fNormal, color: rgb(0,0,0) });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fNormal, color: rgb(0.5,0.5,0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proceso-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listar, mapa, obtener, crear, actualizar, eliminar, listarTipos,
                   listarActividades, crearActividad, actualizarActividad, eliminarActividad,
                   estadisticas, generarPDF };
