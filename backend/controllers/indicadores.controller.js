const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const listar = async (req, res) => {
  try {
    const { modulo, activo, page = 1, limit = 10 } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (modulo) { params.push(modulo); where += ` AND i.modulo=$${params.length}`; }
    if (activo !== undefined) { params.push(activo === 'true'); where += ` AND i.activo=$${params.length}`; }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const [resultado, totalResult] = await Promise.all([
      consulta(
        `SELECT i.*, u.nombres||' '||u.apellidos AS responsable_nombre,
                (SELECT mi.valor FROM mediciones_indicador mi WHERE mi.indicador_id=i.id ORDER BY mi.fecha_medicion DESC, mi.id DESC LIMIT 1) AS ultimo_valor,
                (SELECT mi.estado_semaforo FROM mediciones_indicador mi WHERE mi.indicador_id=i.id ORDER BY mi.fecha_medicion DESC, mi.id DESC LIMIT 1) AS semaforo_actual
         FROM indicadores i LEFT JOIN usuarios u ON u.id=i.responsable_id
         ${where} ORDER BY i.creado_en ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offset]
      ),
      consulta(`SELECT COUNT(*) AS total FROM indicadores i ${where}`, params)
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
};

const dashboard = async (req, res) => {
  try {
    const [resumen, ultimasMediciones, alertasPendientes] = await Promise.all([
      consulta(`SELECT
                  COUNT(*) FILTER (WHERE activo=true) AS total_activos,
                  COUNT(*) FILTER (WHERE NOT activo) AS total_inactivos
                FROM indicadores`),
      consulta(`SELECT i.nombre, i.modulo, i.unidad_medida, i.meta,
                  mi.valor, mi.estado_semaforo, mi.periodo, mi.fecha_medicion
                FROM mediciones_indicador mi
                JOIN indicadores i ON i.id=mi.indicador_id
                WHERE mi.id IN (
                  SELECT DISTINCT ON (indicador_id) id FROM mediciones_indicador ORDER BY indicador_id, fecha_medicion DESC, id DESC
                ) ORDER BY mi.estado_semaforo DESC, i.nombre`),
      consulta(`SELECT ai.*, i.nombre AS indicador_nombre
                FROM alertas_indicador ai JOIN indicadores i ON i.id=ai.indicador_id
                WHERE ai.enviada=false ORDER BY ai.fecha_alerta DESC LIMIT 10`)
    ]);
    res.json({ exito: true, datos: { resumen: resumen.rows[0], ultimas_mediciones: ultimasMediciones.rows, alertas_pendientes: alertasPendientes.rows } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT i.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM indicadores i LEFT JOIN usuarios u ON u.id=i.responsable_id WHERE i.id=$1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Indicador no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crear = async (req, res) => {
  try {
    const { codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida,
            meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, parametros } = req.body;
    const resultado = await consulta(
      `INSERT INTO indicadores (codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida,
       meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING *`,
      [codigo, nombre, descripcion, modulo, tipo, formula, unidad_medida,
       meta || null, umbral_alerta || null, umbral_critico || null, frecuencia_medicion, responsable_id, req.usuario.id]
    );
    
    // Guardar parámetros si se proporcionan
    if (parametros && Array.isArray(parametros) && parametros.length > 0) {
      const indicadorId = resultado.rows[0].id;
      for (const p of parametros) {
        await consulta(
          `INSERT INTO parametros_indicador (indicador_id, nombre, etiqueta, orden, tipo, obligatorio)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [indicadorId, p.nombre, p.etiqueta, p.orden, p.tipo, p.obligatorio]
        );
      }
    }
    
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Indicador creado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El código del indicador ya existe' });
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { nombre, descripcion, modulo, tipo, formula, unidad_medida,
            meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, parametros } = req.body;
    const resultado = await consulta(
      `UPDATE indicadores SET nombre=$1, descripcion=$2, modulo=$3, tipo=$4, formula=$5,
       unidad_medida=$6, meta=$7, umbral_alerta=$8, umbral_critico=$9, frecuencia_medicion=$10,
       responsable_id=$11, actualizado_por=$12 WHERE id=$13 RETURNING *`,
      [nombre, descripcion, modulo, tipo, formula, unidad_medida,
       meta, umbral_alerta, umbral_critico, frecuencia_medicion, responsable_id, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Indicador no encontrado' });
    
    // Actualizar parámetros si se proporcionan
    if (parametros && Array.isArray(parametros)) {
      const indicadorId = req.params.id;
      // Eliminar parámetros existentes
      await consulta('DELETE FROM parametros_indicador WHERE indicador_id=$1', [indicadorId]);
      // Insertar nuevos parámetros
      for (const p of parametros) {
        await consulta(
          `INSERT INTO parametros_indicador (indicador_id, nombre, etiqueta, orden, tipo, obligatorio)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [indicadorId, p.nombre, p.etiqueta, p.orden, p.tipo, p.obligatorio]
        );
      }
    }
    
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const toggleActivo = async (req, res) => {
  try {
    const resultado = await consulta(
      'UPDATE indicadores SET activo = NOT activo, actualizado_por=$1 WHERE id=$2 RETURNING activo', [req.usuario.id, req.params.id]
    );
    res.json({ exito: true, activo: resultado.rows[0]?.activo });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    await consulta('DELETE FROM indicadores WHERE id=$1', [req.params.id]);
    res.json({ exito: true, mensaje: 'Indicador eliminado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const calcularSemaforo = (valor, umbralAlerta, umbralCritico, meta) => {
  if (!umbralCritico && !umbralAlerta) return 'verde';
  if (umbralCritico && valor <= umbralCritico) return 'rojo';
  if (umbralAlerta && valor <= umbralAlerta) return 'amarillo';
  return 'verde';
};

const registrarMedicion = async (req, res) => {
  try {
    const { periodo, valor, meta_periodo, fuente_datos, observaciones, parametros } = req.body;
    const indicador = await consulta('SELECT * FROM indicadores WHERE id=$1', [req.params.id]);
    if (!indicador.rows.length) return res.status(404).json({ exito: false, mensaje: 'Indicador no encontrado' });

    const ind = indicador.rows[0];
    const semaforo = calcularSemaforo(valor, ind.umbral_alerta, ind.umbral_critico, ind.meta);

    const resultado = await consulta(
      `INSERT INTO mediciones_indicador (indicador_id, periodo, valor, meta_periodo, estado_semaforo,
       fuente_datos, observaciones, parametros, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [req.params.id, periodo, valor, meta_periodo || ind.meta, semaforo, fuente_datos, observaciones, JSON.stringify(parametros || {}), req.usuario.id]
    );

    // Generar alerta si aplica
    if (semaforo !== 'verde') {
      await consulta(
        `INSERT INTO alertas_indicador (indicador_id, medicion_id, tipo_alerta, mensaje, creado_por, actualizado_por)
         VALUES ($1,$2,$3,$4,$5,$5)`,
        [req.params.id, resultado.rows[0].id,
         semaforo === 'rojo' ? 'critico' : 'bajo_umbral',
         `Indicador '${ind.nombre}' en estado ${semaforo.toUpperCase()} (valor: ${valor}, meta: ${ind.meta})`,
         req.usuario.id]
      );
    }

    res.status(201).json({ exito: true, datos: resultado.rows[0], semaforo });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarMedicion = async (req, res) => {
  try {
    const { valor, meta_periodo, fuente_datos, observaciones, parametros } = req.body;
    const med = await consulta('SELECT i.*, m.parametros FROM mediciones_indicador m JOIN indicadores i ON i.id=m.indicador_id WHERE m.id=$1', [req.params.medId]);
    if (!med.rows.length) return res.status(404).json({ exito: false, mensaje: 'Medición no encontrada' });

    const ind = med.rows[0];
    const semaforo = calcularSemaforo(valor, ind.umbral_alerta, ind.umbral_critico, ind.meta);
    const resultado = await consulta(
      `UPDATE mediciones_indicador SET valor=$1, meta_periodo=$2, estado_semaforo=$3,
       fuente_datos=$4, observaciones=$5, parametros=$6, actualizado_por=$7 WHERE id=$8 RETURNING *`,
      [valor, meta_periodo, semaforo, fuente_datos, observaciones, JSON.stringify(parametros || ind.parametros), req.usuario.id, req.params.medId]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Medición no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarMediciones = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT m.*, u.nombres||' '||u.apellidos AS creado_por_nombre
       FROM mediciones_indicador m LEFT JOIN usuarios u ON u.id=m.creado_por
       WHERE m.indicador_id=$1 ORDER BY m.fecha_medicion DESC`, [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarParametros = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT * FROM parametros_indicador WHERE indicador_id=$1 AND activo=true ORDER BY orden`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminarMedicion = async (req, res) => {
  try {
    await consulta('DELETE FROM mediciones_indicador WHERE id=$1', [req.params.medId]);
    res.json({ exito: true, mensaje: 'Medición eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarAlertas = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT ai.*, i.nombre AS indicador_nombre, i.modulo
       FROM alertas_indicador ai JOIN indicadores i ON i.id=ai.indicador_id
       WHERE ai.enviada=false ORDER BY ai.fecha_alerta DESC`
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};
const generarPDF = async (req, res) => {
  try {
    const { periodo_inicio, periodo_fin } = req.query;
    const [indicador, mediciones] = await Promise.all([
      consulta(`SELECT i.*, u.nombres||' '||u.apellidos AS responsable_nombre
                FROM indicadores i LEFT JOIN usuarios u ON u.id=i.responsable_id WHERE i.id=$1`, [req.params.id]),
      consulta(`SELECT * FROM mediciones_indicador WHERE indicador_id=$1 ORDER BY fecha_medicion DESC LIMIT 12`, [req.params.id])
    ]);
    if (!indicador.rows.length) return res.status(404).json({ exito: false, mensaje: 'Indicador no encontrado' });
    const ind = indicador.rows[0];

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    pagina.drawRectangle({ x: 0, y: height - 70, width, height: 70, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — REPORTE DE INDICADOR DE GESTIÓN', { x: 20, y: height - 55, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et + ':', { x: 20, y, size: 9, font: fB, color: AZUL });
      pagina.drawText(String(val || '—'), { x: 150, y, size: 9, font: fN, color: rgb(0,0,0) });
      y -= 18;
    };
    fila('CÓDIGO', ind.codigo); fila('NOMBRE', ind.nombre);
    fila('MÓDULO', ind.modulo); fila('TIPO', ind.tipo);
    fila('META', `${ind.meta} ${ind.unidad_medida || ''}`);
    fila('UMBRAL ALERTA', `${ind.umbral_alerta || '—'}`);
    fila('RESPONSABLE', ind.responsable_nombre);
    fila('FRECUENCIA', ind.frecuencia_medicion);

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('HISTORIAL DE MEDICIONES', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    // Encabezado tabla
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 16, color: rgb(0.9, 0.93, 0.98) });
    pagina.drawText('PERÍODO', { x: 28, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('VALOR', { x: 160, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('META', { x: 240, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('SEMÁFORO', { x: 310, y, size: 8, font: fB, color: AZUL });
    y -= 20;

    for (const m of mediciones.rows) {
      const colorSem = m.estado_semaforo === 'verde' ? rgb(0.1,0.6,0.1) : m.estado_semaforo === 'rojo' ? rgb(0.8,0.1,0.1) : rgb(0.8,0.6,0);
      pagina.drawText(m.periodo, { x: 28, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(String(m.valor), { x: 160, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(String(m.meta_periodo || ind.meta), { x: 240, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(m.estado_semaforo?.toUpperCase(), { x: 310, y, size: 8, font: fB, color: colorSem });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5,0.5,0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="indicador-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};


const generarReporte = async (req, res) => {
  try {
    const { modulo, activo } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (modulo) { params.push(modulo); where += ` AND i.modulo=$${params.length}`; }
    if (activo !== undefined) { params.push(activo === 'true'); where += ` AND i.activo=$${params.length}`; }

    const resultado = await consulta(
      `SELECT i.*, u.nombres||' '||u.apellidos AS responsable_nombre,
              (SELECT mi.valor FROM mediciones_indicador mi WHERE mi.indicador_id=i.id ORDER BY mi.fecha_medicion DESC, mi.id DESC LIMIT 1) AS ultimo_valor,
              (SELECT mi.estado_semaforo FROM mediciones_indicador mi WHERE mi.indicador_id=i.id ORDER BY mi.fecha_medicion DESC, mi.id DESC LIMIT 1) AS semaforo_actual
       FROM indicadores i LEFT JOIN usuarios u ON u.id=i.responsable_id
       ${where} ORDER BY i.modulo, i.nombre`, params
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
    pagina.drawText('SGC-UNT — REPORTE DE INDICADORES', { x: 20, y: height - 55, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    // Filtros aplicados
    y -= 50;
    pagina.drawText('Filtros aplicados:', { x: 20, y, size: 10, font: fB, color: AZUL });
    y -= 15;
    pagina.drawText(`Módulo: ${modulo || 'Todos'}`, { x: 20, y, size: 9, font: fN, color: rgb(0,0,0) });
    y -= 12;
    pagina.drawText(`Estado: ${activo !== undefined ? (activo === 'true' ? 'Activos' : 'Inactivos') : 'Todos'}`, { x: 20, y, size: 9, font: fN, color: rgb(0,0,0) });
    y -= 12;
    pagina.drawText(`Total de indicadores: ${resultado.rows.length}`, { x: 20, y, size: 9, font: fN, color: rgb(0,0,0) });

    y -= 20;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('LISTADO DE INDICADORES', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    // Encabezado tabla
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 16, color: rgb(0.9, 0.93, 0.98) });
    pagina.drawText('CÓDIGO', { x: 25, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('NOMBRE', { x: 90, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('MÓDULO', { x: 300, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('ÚLTIMO VALOR', { x: 380, y, size: 8, font: fB, color: AZUL });
    pagina.drawText('META', { x: 460, y, size: 8, font: fB, color: AZUL });
    y -= 12;

    // Filas
    for (const ind of resultado.rows) {
      if (y < 50) {
        pagina = pdfDoc.addPage([595, 842]);
        y = 800;
        pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 16, color: rgb(0.9, 0.93, 0.98) });
        pagina.drawText('CÓDIGO', { x: 25, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('NOMBRE', { x: 90, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('MÓDULO', { x: 300, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('ÚLTIMO VALOR', { x: 380, y, size: 8, font: fB, color: AZUL });
        pagina.drawText('META', { x: 460, y, size: 8, font: fB, color: AZUL });
        y -= 12;
      }
      pagina.drawText(ind.codigo || '—', { x: 25, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText((ind.nombre || '').substring(0, 35), { x: 90, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(ind.modulo || '—', { x: 300, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(ind.ultimo_valor != null ? String(ind.ultimo_valor) : '—', { x: 380, y, size: 8, font: fN, color: rgb(0,0,0) });
      pagina.drawText(`${ind.meta || '—'} ${ind.unidad_medida || ''}`, { x: 460, y, size: 8, font: fN, color: rgb(0,0,0) });
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
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-indicadores.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listar, dashboard, obtener, crear, actualizar, toggleActivo, eliminar,
                   registrarMedicion, actualizarMedicion, listarMediciones, eliminarMedicion, listarParametros, listarAlertas, generarPDF, generarReporte };
