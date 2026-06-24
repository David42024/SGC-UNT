const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

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
    const [resumen, ultimasMediciones, alertasPendientes, porModulo, porSemaforo, tendencias] = await Promise.all([
      consulta(`SELECT
                  COUNT(*) FILTER (WHERE activo=true) AS total_activos,
                  COUNT(*) FILTER (WHERE NOT activo) AS total_inactivos
                FROM indicadores`),
      consulta(`SELECT i.id, i.nombre, i.modulo, i.unidad_medida, i.meta,
                  mi.valor, mi.estado_semaforo, mi.periodo, mi.fecha_medicion
                FROM mediciones_indicador mi
                JOIN indicadores i ON i.id=mi.indicador_id
                WHERE mi.id IN (
                  SELECT DISTINCT ON (indicador_id) id FROM mediciones_indicador ORDER BY indicador_id, fecha_medicion DESC, id DESC
                ) ORDER BY mi.estado_semaforo DESC, i.nombre`),
      consulta(`SELECT ai.*, i.nombre AS indicador_nombre
                FROM alertas_indicador ai JOIN indicadores i ON i.id=ai.indicador_id
                WHERE ai.enviada=false ORDER BY ai.fecha_alerta DESC LIMIT 10`),
      consulta(`SELECT modulo, COUNT(*) AS total
                FROM indicadores WHERE activo=true
                GROUP BY modulo ORDER BY total DESC`),
      consulta(`SELECT mi.estado_semaforo, COUNT(*) AS total
                FROM mediciones_indicador mi
                WHERE mi.id IN (
                  SELECT DISTINCT ON (indicador_id) id FROM mediciones_indicador ORDER BY indicador_id, fecha_medicion DESC, id DESC
                )
                GROUP BY mi.estado_semaforo`),
      consulta(`SELECT i.nombre, i.modulo, mi.valor, mi.estado_semaforo, mi.periodo, mi.fecha_medicion
                FROM mediciones_indicador mi
                JOIN indicadores i ON i.id=mi.indicador_id
                WHERE mi.fecha_medicion >= NOW() - INTERVAL '6 months'
                ORDER BY mi.fecha_medicion DESC LIMIT 50`)
    ]);
    res.json({
      exito: true,
      datos: {
        resumen: resumen.rows[0],
        ultimas_mediciones: ultimasMediciones.rows,
        alertas_pendientes: alertasPendientes.rows,
        por_modulo: porModulo.rows,
        por_semaforo: porSemaforo.rows,
        tendencias: tendencias.rows
      }
    });
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
      pagina.drawText(String(val || '—'), { x: 150, y, size: 9, font: fN, color: rgb(0, 0, 0) });
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
      const colorSem = m.estado_semaforo === 'verde' ? rgb(0.1, 0.6, 0.1) : m.estado_semaforo === 'rojo' ? rgb(0.8, 0.1, 0.1) : rgb(0.8, 0.6, 0);
      pagina.drawText(m.periodo, { x: 28, y, size: 8, font: fN, color: rgb(0, 0, 0) });
      pagina.drawText(String(m.valor), { x: 160, y, size: 8, font: fN, color: rgb(0, 0, 0) });
      pagina.drawText(String(m.meta_periodo || ind.meta), { x: 240, y, size: 8, font: fN, color: rgb(0, 0, 0) });
      pagina.drawText(m.estado_semaforo?.toUpperCase(), { x: 310, y, size: 8, font: fB, color: colorSem });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5, 0.5, 0.5) });

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
       ${where} ORDER BY i.creado_en ASC`,
      params
    );

    const pdfDoc = await PDFDocument.create();
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let pagina = pdfDoc.addPage([595, 842]);
    const width = 595;
    const height = 842;
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);
    const NEGRO = rgb(0, 0, 0);

    // Encabezado
    pagina.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: AZUL });
    pagina.drawText('REPORTE DE INDICADORES', { x: 20, y: height - 35, size: 16, font: fB, color: BLANCO });
    pagina.drawText('Sistema de Gestión de Calidad - UNT', { x: 20, y: height - 15, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    const fechaReporte = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    pagina.drawText(`Fecha: ${fechaReporte}`, { x: 20, y: height - 80, size: 9, font: fN, color: NEGRO });

    // Filtros aplicados
    let y = 720;
    pagina.drawText(`Total: ${resultado.rows.length} indicadores`, { x: 20, y, size: 11, font: fB, color: AZUL });
    y -= 15;

    const filtros = [];
    if (modulo) filtros.push(`Módulo: ${modulo}`);
    if (activo !== undefined) filtros.push(`Estado: ${activo === 'true' ? 'Activos' : 'Inactivos'}`);

    if (filtros.length > 0) {
      pagina.drawText(`Filtros aplicados: ${filtros.join(' | ')}`, { x: 20, y, size: 9, font: fN, color: rgb(0.5, 0.5, 0.5) });
      y -= 20;
    } else {
      pagina.drawText(`Filtros: Ninguno (mostrando todos)`, { x: 20, y, size: 9, font: fN, color: rgb(0.5, 0.5, 0.5) });
      y -= 20;
    }

    // Tabla de indicadores
    resultado.rows.forEach((ind, i) => {
      if (y < 50) {
        pagina = pdfDoc.addPage([595, 842]);
        y = 800;
      }

      pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 15, color: AZUL });
      pagina.drawText(`${ind.codigo} - ${ind.nombre}`, { x: 25, y: y + 2, size: 9, font: fB, color: BLANCO });
      y -= 20;

      pagina.drawText(`Módulo: ${ind.modulo} | Responsable: ${ind.responsable_nombre || 'N/A'}`, { x: 25, y, size: 8, font: fN, color: NEGRO });
      y -= 12;
      pagina.drawText(`Fórmula: ${ind.formula}`, { x: 25, y, size: 8, font: fN, color: rgb(0.4, 0.4, 0.4) });
      y -= 12;
      pagina.drawText(`Último valor: ${ind.ultimo_valor || 'N/A'} | Semáforo: ${ind.semaforo_actual || 'N/A'}`, { x: 25, y, size: 8, font: fN, color: NEGRO });
      y -= 20;
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-indicadores.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};
const generarReporteDashboard = async (req, res) => {
  try {
    console.log('Iniciando generación de reporte del dashboard...');

    // Obtener datos de todo el dashboard
    const [docs, proc, audits, acciones, riesgos, indicadores, encuestas, usuarios, riesgoNivel, docsEstado] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM documentos'),
      consulta('SELECT COUNT(*) AS total FROM procesos WHERE activo=true'),
      consulta('SELECT COUNT(*) AS total FROM auditorias'),
      consulta('SELECT COUNT(*) AS total FROM no_conformidades'),
      consulta('SELECT COUNT(*) AS total FROM riesgos'),
      consulta('SELECT COUNT(*) FILTER (WHERE activo=true) AS total_activos, COUNT(*) FILTER (WHERE NOT activo) AS total_inactivos FROM indicadores'),
      consulta('SELECT COUNT(*) AS total FROM encuestas'),
      consulta('SELECT COUNT(*) AS total FROM usuarios'),
      consulta('SELECT clasificacion_nivel, COUNT(*) AS cantidad FROM riesgos GROUP BY clasificacion_nivel'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM documentos GROUP BY estado')
    ]);

    const [indicadoresPorModulo, indicadoresPorSemaforo] = await Promise.all([
      consulta('SELECT modulo, COUNT(*) AS total FROM indicadores WHERE activo=true GROUP BY modulo ORDER BY total DESC'),
      consulta(`SELECT mi.estado_semaforo, COUNT(*) AS total
                FROM mediciones_indicador mi
                WHERE mi.id IN (
                  SELECT DISTINCT ON (indicador_id) id FROM mediciones_indicador ORDER BY indicador_id, fecha_medicion DESC, id DESC
                )
                GROUP BY mi.estado_semaforo`),
    ]);

    const pdfDoc = await PDFDocument.create();
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Leer y embeber logo UNT
    let logoImage = null;
    try {
      const logoPath = path.join(__dirname, '../../frontend/public/logo_unt.png');
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
      }
    } catch (error) {
      console.log('No se pudo cargar el logo:', error.message);
    }

    // Constantes de diseño
    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGEN = 40;
    const CONTENT_W = PAGE_W - MARGEN * 2;
    const AZUL = rgb(0, 0.24, 0.65);
    const AZUL_CLARO = rgb(0.93, 0.95, 1);
    const BLANCO = rgb(1, 1, 1);
    const NEGRO = rgb(0.13, 0.13, 0.13);
    const GRIS = rgb(0.5, 0.5, 0.5);
    const GRIS_CLARO = rgb(0.96, 0.96, 0.97);
    const VERDE = rgb(0, 0.65, 0.32);
    const AMARILLO = rgb(1, 0.55, 0);
    const ROJO = rgb(0.86, 0.08, 0.24);
    const FOOTER_Y = 30;

    const fechaReporte = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });

    const stats = {
      docs: parseInt(docs.rows[0]?.total) || 0,
      proc: parseInt(proc.rows[0]?.total) || 0,
      audits: parseInt(audits.rows[0]?.total) || 0,
      acciones: parseInt(acciones.rows[0]?.total) || 0,
      riesgos: parseInt(riesgos.rows[0]?.total) || 0,
      indicadores: parseInt(indicadores.rows[0]?.total_activos) || 0,
      encuestas: parseInt(encuestas.rows[0]?.total) || 0,
      usuarios: parseInt(usuarios.rows[0]?.total) || 0,
    };

    // ── Helpers ──────────────────────────────────────────────
    const drawFooter = (pg) => {
      pg.drawLine({ start: { x: MARGEN, y: FOOTER_Y + 10 }, end: { x: PAGE_W - MARGEN, y: FOOTER_Y + 10 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
      pg.drawText(`Generado por SGC-UNT — ${fechaReporte}`, { x: MARGEN, y: FOOTER_Y, size: 7, font: fN, color: GRIS });
      pg.drawText('Universidad Nacional de Trujillo', { x: PAGE_W - MARGEN - fN.widthOfTextAtSize('Universidad Nacional de Trujillo', 7), y: FOOTER_Y, size: 7, font: fN, color: GRIS });
    };

    const nuevaPagina = () => {
      const pg = pdfDoc.addPage([PAGE_W, PAGE_H]);
      drawFooter(pg);
      return pg;
    };

    const drawSectionTitle = (pg, titulo, yPos) => {
      pg.drawRectangle({ x: MARGEN, y: yPos - 4, width: CONTENT_W, height: 22, color: AZUL });
      pg.drawText(titulo, { x: MARGEN + 10, y: yPos + 2, size: 10, font: fB, color: BLANCO });
      return yPos - 30;
    };

    const drawKpiCard = (pg, x, yPos, label, valor, subtexto, accentColor) => {
      const cardW = (CONTENT_W - 20) / 3;
      const cardH = 60;
      // Fondo
      pg.drawRectangle({ x, y: yPos - cardH, width: cardW, height: cardH, color: GRIS_CLARO, borderColor: rgb(0.88, 0.88, 0.88), borderWidth: 0.5 });
      // Acento superior
      pg.drawRectangle({ x, y: yPos - 3, width: cardW, height: 3, color: accentColor });
      // Valor
      pg.drawText(valor.toString(), { x: x + 12, y: yPos - 30, size: 22, font: fB, color: accentColor });
      // Label
      pg.drawText(label, { x: x + 12, y: yPos - 16, size: 9, font: fN, color: NEGRO });
      // Subtexto
      pg.drawText(subtexto, { x: x + 12, y: yPos - 46, size: 7, font: fN, color: GRIS });
    };

    const drawHorizontalBar = (pg, x, yPos, label, valor, maxVal, barColor, total) => {
      const maxBarW = CONTENT_W - 160;
      const barW = maxVal > 0 ? (valor / maxVal) * maxBarW : 0;
      const barH = 16;
      const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
      // Label
      pg.drawText(label, { x: x, y: yPos + 3, size: 9, font: fN, color: NEGRO });
      // Bar background
      pg.drawRectangle({ x: x + 110, y: yPos - 2, width: maxBarW, height: barH, color: rgb(0.92, 0.92, 0.92) });
      // Bar fill
      if (barW > 0) {
        pg.drawRectangle({ x: x + 110, y: yPos - 2, width: barW, height: barH, color: barColor });
      }
      // Value + percentage
      pg.drawText(`${valor} (${pct}%)`, { x: x + 115 + maxBarW + 5, y: yPos + 3, size: 8, font: fB, color: NEGRO });
      return yPos - 28;
    };

    // ══════════════════════════════════════════════════════════
    // PÁGINA 1
    // ══════════════════════════════════════════════════════════
    let pagina = nuevaPagina();
    let y;

    // ── Encabezado ──────────────────────────────────────────
    pagina.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: AZUL });

    if (logoImage) {
      const logoDims = logoImage.scale(0.06);
      pagina.drawImage(logoImage, { x: MARGEN, y: PAGE_H - 70, width: logoDims.width, height: logoDims.height });
      pagina.drawText('SGC-UNT', { x: MARGEN + logoDims.width + 12, y: PAGE_H - 35, size: 22, font: fB, color: BLANCO });
      pagina.drawText('Reporte Ejecutivo del Dashboard', { x: MARGEN + logoDims.width + 12, y: PAGE_H - 55, size: 11, font: fN, color: rgb(0.8, 0.88, 1) });
    } else {
      pagina.drawText('SGC-UNT', { x: MARGEN, y: PAGE_H - 35, size: 22, font: fB, color: BLANCO });
      pagina.drawText('Reporte Ejecutivo del Dashboard', { x: MARGEN, y: PAGE_H - 55, size: 11, font: fN, color: rgb(0.8, 0.88, 1) });
    }

    // Fecha en esquina derecha del header
    const fechaCorta = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    pagina.drawText(fechaCorta, { x: PAGE_W - MARGEN - fN.widthOfTextAtSize(fechaCorta, 10), y: PAGE_H - 30, size: 10, font: fN, color: BLANCO });
    pagina.drawText('Sistema de Gestión de Calidad', { x: PAGE_W - MARGEN - fN.widthOfTextAtSize('Sistema de Gestión de Calidad', 8), y: PAGE_H - 50, size: 8, font: fN, color: rgb(0.8, 0.88, 1) });

    y = PAGE_H - 100;

    // ── Resumen Ejecutivo ────────────────────────────────────
    y = drawSectionTitle(pagina, 'RESUMEN EJECUTIVO', y);

    const descripcionResumen = [
      `El Sistema de Gestión de Calidad de la Universidad Nacional de Trujillo presenta el siguiente`,
      `estado al ${fechaReporte}. Este reporte consolida los datos de todos los módulos del sistema.`
    ];
    descripcionResumen.forEach(linea => {
      pagina.drawText(linea, { x: MARGEN, y, size: 9, font: fN, color: NEGRO });
      y -= 14;
    });
    y -= 6;

    // Destacados
    const totalGeneral = stats.docs + stats.proc + stats.audits + stats.acciones + stats.riesgos;
    pagina.drawRectangle({ x: MARGEN, y: y - 40, width: CONTENT_W, height: 40, color: AZUL_CLARO, borderColor: AZUL, borderWidth: 0.5 });
    pagina.drawText('Resumen:', { x: MARGEN + 10, y: y - 14, size: 9, font: fB, color: AZUL });
    pagina.drawText(
      `${stats.indicadores} indicadores activos - ${stats.docs} documentos - ${stats.proc} procesos - ${stats.riesgos} riesgos - ${stats.acciones} no conformidades - ${stats.usuarios} usuarios`,
      { x: MARGEN + 10, y: y - 30, size: 8, font: fN, color: NEGRO }
    );
    y -= 55;

    // ── KPIs Principales ─────────────────────────────────────
    y = drawSectionTitle(pagina, 'INDICADORES CLAVE DE RENDIMIENTO (KPIs)', y);

    const cardW = (CONTENT_W - 20) / 3;

    // Fila 1
    drawKpiCard(pagina, MARGEN, y, 'Documentos', stats.docs, stats.docs === 0 ? 'Sin documentos registrados' : 'Total registrados', stats.docs > 0 ? AZUL : GRIS);
    drawKpiCard(pagina, MARGEN + cardW + 10, y, 'Procesos activos', stats.proc, stats.proc === 0 ? 'Sin procesos activos' : 'En el mapa de procesos', stats.proc > 0 ? VERDE : GRIS);
    drawKpiCard(pagina, MARGEN + (cardW + 10) * 2, y, 'Auditorías', stats.audits, stats.audits === 0 ? 'Sin auditorías programadas' : 'Total en el sistema', stats.audits > 0 ? rgb(0.42, 0.27, 0.67) : GRIS);
    y -= 75;

    // Fila 2
    drawKpiCard(pagina, MARGEN, y, 'No conformidades', stats.acciones, stats.acciones === 0 ? 'Sin no conformidades' : 'Registradas', stats.acciones > 0 ? AMARILLO : GRIS);
    drawKpiCard(pagina, MARGEN + cardW + 10, y, 'Riesgos', stats.riesgos, stats.riesgos === 0 ? 'Sin riesgos identificados' : 'Registrados', stats.riesgos > 0 ? rgb(1, 0.55, 0) : GRIS);
    drawKpiCard(pagina, MARGEN + (cardW + 10) * 2, y, 'Indicadores', stats.indicadores, stats.indicadores === 0 ? 'Sin indicadores activos' : 'Activos monitoreados', stats.indicadores > 0 ? VERDE : GRIS);
    y -= 80;

    // ── Documentos por Estado ─────────────────────────────────
    y = drawSectionTitle(pagina, 'DOCUMENTOS POR ESTADO', y);

    if (docsEstado && docsEstado.rows.length > 0) {
      const totalDocs = docsEstado.rows.reduce((sum, r) => sum + parseInt(r.cantidad), 0);
      const maxValDoc = Math.max(...docsEstado.rows.map(r => parseInt(r.cantidad)));
      const coloresEstado = {
        borrador: rgb(0.23, 0.51, 0.96),
        revision: rgb(0.96, 0.62, 0.04),
        aprobado: rgb(0.55, 0.36, 0.96),
        vigente: VERDE,
        obsoleto: GRIS
      };

      pagina.drawText(`Total de documentos: ${totalDocs}`, { x: MARGEN, y, size: 8, font: fN, color: GRIS });
      y -= 18;

      docsEstado.rows.forEach(d => {
        const label = d.estado.charAt(0).toUpperCase() + d.estado.slice(1).replace(/_/g, ' ');
        const color = coloresEstado[d.estado] || AZUL;
        y = drawHorizontalBar(pagina, MARGEN, y, label, parseInt(d.cantidad), maxValDoc, color, totalDocs);
      });
    } else {
      pagina.drawText('No hay documentos registrados en el sistema.', { x: MARGEN, y, size: 9, font: fN, color: GRIS });
      y -= 20;
    }
    y -= 10;

    // ── Riesgos por Nivel ─────────────────────────────────────
    y = drawSectionTitle(pagina, 'RIESGOS POR NIVEL', y);

    if (riesgoNivel && riesgoNivel.rows.length > 0) {
      const totalRiesgos = riesgoNivel.rows.reduce((sum, r) => sum + parseInt(r.cantidad), 0);
      const maxValRiesgo = Math.max(...riesgoNivel.rows.map(r => parseInt(r.cantidad)));
      const coloresNivel = {
        bajo: VERDE,
        moderado: AMARILLO,
        alto: rgb(1, 0.55, 0),
        critico: ROJO
      };

      pagina.drawText(`Total de riesgos: ${totalRiesgos}`, { x: MARGEN, y, size: 8, font: fN, color: GRIS });
      y -= 18;

      riesgoNivel.rows.forEach(r => {
        const label = r.clasificacion_nivel.charAt(0).toUpperCase() + r.clasificacion_nivel.slice(1);
        const color = coloresNivel[r.clasificacion_nivel] || AZUL;
        y = drawHorizontalBar(pagina, MARGEN, y, label, parseInt(r.cantidad), maxValRiesgo, color, totalRiesgos);
      });
    } else {
      pagina.drawText('No hay riesgos identificados en el sistema.', { x: MARGEN, y, size: 9, font: fN, color: GRIS });
      y -= 20;
    }

    // ══════════════════════════════════════════════════════════
    // PÁGINA 2
    // ══════════════════════════════════════════════════════════
    pagina = nuevaPagina();
    y = PAGE_H - 50;

    // ── Indicadores por Módulo ────────────────────────────────
    y = drawSectionTitle(pagina, 'INDICADORES POR MÓDULO', y);

    if (indicadoresPorModulo.rows.length > 0) {
      const totalInd = indicadoresPorModulo.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
      const maxValInd = Math.max(...indicadoresPorModulo.rows.map(r => parseInt(r.total)));

      pagina.drawText(`Total de indicadores activos: ${totalInd}`, { x: MARGEN, y, size: 8, font: fN, color: GRIS });
      y -= 18;

      indicadoresPorModulo.rows.forEach(mod => {
        const label = mod.modulo === 'general' ? 'General' : 
                      mod.modulo === 'satisfaccion' ? 'Satisfacción' :
                      mod.modulo.charAt(0).toUpperCase() + mod.modulo.slice(1);
        y = drawHorizontalBar(pagina, MARGEN, y, label, parseInt(mod.total), maxValInd, AZUL, totalInd);
      });
    } else {
      pagina.drawText('No hay indicadores activos en el sistema.', { x: MARGEN, y, size: 9, font: fN, color: GRIS });
      y -= 20;
    }
    y -= 15;

    // ── Estado de Indicadores (Semáforo) ──────────────────────
    y = drawSectionTitle(pagina, 'ESTADO DE INDICADORES (SEMÁFORO)', y);

    if (indicadoresPorSemaforo.rows.length > 0) {
      const totalSem = indicadoresPorSemaforo.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
      const coloresSemaforo = {
        verde: VERDE,
        amarillo: AMARILLO,
        rojo: ROJO
      };
      const labelsSemaforo = {
        verde: 'En meta (verde)',
        amarillo: 'En alerta (amarillo)',
        rojo: 'Critico (rojo)'
      };

      pagina.drawText(`Total de indicadores con medicion: ${totalSem}`, { x: MARGEN, y, size: 8, font: fN, color: GRIS });
      y -= 18;

      indicadoresPorSemaforo.rows.forEach(s => {
        const label = labelsSemaforo[s.estado_semaforo] || s.estado_semaforo;
        const color = coloresSemaforo[s.estado_semaforo] || AZUL;
        y = drawHorizontalBar(pagina, MARGEN, y, label, parseInt(s.total), totalSem, color, totalSem);
      });
    } else {
      pagina.drawText('No hay mediciones registradas para los indicadores.', { x: MARGEN, y, size: 9, font: fN, color: GRIS });
      y -= 20;
    }
    y -= 15;

    // ── Análisis Detallado ────────────────────────────────────
    y = drawSectionTitle(pagina, 'ANALISIS DETALLADO', y);

    // Fortalezas
    pagina.drawText('Fortalezas:', { x: MARGEN, y, size: 9, font: fB, color: VERDE });
    y -= 16;
    const fortalezas = [];
    if (stats.indicadores >= 10) fortalezas.push(`Sistema robusto de ${stats.indicadores} indicadores activos para monitoreo continuo.`);
    if (stats.proc > 0) fortalezas.push(`${stats.proc} procesos activos mapeados e identificados.`);
    if (stats.docs > 0) fortalezas.push(`${stats.docs} documentos registrados en el sistema documental.`);
    if (stats.usuarios > 1) fortalezas.push(`${stats.usuarios} usuarios activos participando en el SGC.`);
    if (fortalezas.length === 0) fortalezas.push('El sistema esta en etapa inicial de implementacion.');

    fortalezas.forEach(f => {
      pagina.drawText(`  - ${f}`, { x: MARGEN, y, size: 8, font: fN, color: NEGRO });
      y -= 14;
    });
    y -= 8;

    // Áreas de mejora
    pagina.drawText('Areas de mejora:', { x: MARGEN, y, size: 9, font: fB, color: AMARILLO });
    y -= 16;
    const mejoras = [];
    if (stats.audits === 0) mejoras.push('No hay auditorias programadas. Se recomienda planificar la primera auditoria interna.');
    if (stats.docs < 5) mejoras.push('Pocos documentos registrados. Incorporar politicas, manuales y procedimientos pendientes.');
    if (stats.acciones > 0) mejoras.push(`${stats.acciones} no conformidades requieren seguimiento y cierre oportuno.`);
    const riesgosAltos = riesgoNivel.rows.filter(r => r.clasificacion_nivel === 'alto' || r.clasificacion_nivel === 'critico');
    if (riesgosAltos.length > 0) {
      const cantAltos = riesgosAltos.reduce((s, r) => s + parseInt(r.cantidad), 0);
      mejoras.push(`${cantAltos} riesgos en nivel alto/critico requieren planes de mitigacion urgentes.`);
    }
    if (mejoras.length === 0) mejoras.push('No se identificaron areas criticas de mejora.');

    mejoras.forEach(m => {
      pagina.drawText(`  - ${m}`, { x: MARGEN, y, size: 8, font: fN, color: NEGRO });
      y -= 14;
    });
    y -= 15;

    // ── Alertas Críticas ──────────────────────────────────────
    const alertas = [];
    if (stats.docs === 0) alertas.push('Sin documentos registrados en el sistema.');
    if (stats.audits === 0) alertas.push('Sin auditorias programadas para el periodo actual.');
    if (stats.acciones > 3) alertas.push(`${stats.acciones} no conformidades requieren atencion inmediata.`);
    if (riesgosAltos.length > 0) alertas.push('Existen riesgos en nivel alto/critico sin mitigar.');

    if (alertas.length > 0) {
      // Calcular alto del recuadro
      const alertaH = 30 + alertas.length * 14;
      pagina.drawRectangle({ x: MARGEN, y: y - alertaH, width: CONTENT_W, height: alertaH, color: rgb(1, 0.95, 0.95), borderColor: ROJO, borderWidth: 0.5 });
      pagina.drawText('ALERTAS CRITICAS', { x: MARGEN + 10, y: y - 16, size: 10, font: fB, color: ROJO });
      alertas.forEach((a, i) => {
        pagina.drawText(`- ${a}`, { x: MARGEN + 10, y: y - 32 - (i * 14), size: 8, font: fN, color: NEGRO });
      });
      y -= alertaH + 15;
    }

    // ── Recomendaciones ───────────────────────────────────────
    y = drawSectionTitle(pagina, 'RECOMENDACIONES', y);

    const recomendaciones = [];
    if (stats.audits === 0) recomendaciones.push('Programar la primera auditoria interna del sistema de gestion de calidad.');
    if (stats.docs < 5) recomendaciones.push('Completar el acervo documental con politicas, manuales y procedimientos faltantes.');
    if (stats.indicadores < 12) recomendaciones.push('Expandir el sistema de indicadores para cubrir todos los objetivos estrategicos (OEI.01 a OC.01).');
    if (stats.acciones > 0) recomendaciones.push('Implementar seguimiento semanal a las no conformidades abiertas para asegurar cierre oportuno.');
    if (riesgosAltos.length > 0) recomendaciones.push('Priorizar planes de tratamiento para riesgos en nivel alto y critico.');
    recomendaciones.push('Mantener el monitoreo periodico de todos los modulos del SGC.');

    recomendaciones.forEach((rec, i) => {
      pagina.drawText(`${i + 1}. ${rec}`, { x: MARGEN, y, size: 8, font: fN, color: NEGRO });
      y -= 16;
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-ejecutivo-dashboard.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error al generar reporte del dashboard:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = {
  listar, dashboard, obtener, crear, actualizar, toggleActivo, eliminar,
  registrarMedicion, actualizarMedicion, listarMediciones, eliminarMedicion, listarParametros, listarAlertas, generarPDF, generarReporte, generarReporteDashboard
};
