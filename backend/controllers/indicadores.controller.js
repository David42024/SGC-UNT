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
    const [docs, proc, audits, acciones, riesgos, indicadores, encuestas, usuarios] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM documentos'),
      consulta('SELECT COUNT(*) AS total FROM procesos WHERE activo=true'),
      consulta('SELECT COUNT(*) AS total FROM auditorias'),
      consulta('SELECT COUNT(*) AS total FROM no_conformidades'),
      consulta('SELECT COUNT(*) AS total FROM riesgos'),
      consulta('SELECT COUNT(*) FILTER (WHERE activo=true) AS total_activos, COUNT(*) FILTER (WHERE NOT activo) AS total_inactivos FROM indicadores'),
      consulta('SELECT COUNT(*) AS total FROM encuestas'),
      consulta('SELECT COUNT(*) AS total FROM usuarios'),
    ]);

    const [docsEstado, riesgosNivel, indicadoresPorModulo, indicadoresPorSemaforo] = await Promise.all([
      consulta('SELECT estado, COUNT(*) AS cantidad FROM documentos GROUP BY estado'),
      consulta('SELECT clasificacion_nivel, COUNT(*) AS cantidad FROM riesgos GROUP BY clasificacion_nivel'),
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

    // PORTADA INSTITUCIONAL
    let pagina = pdfDoc.addPage([595, 842]);
    const width = 595;
    const height = 842;
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);
    const NEGRO = rgb(0, 0, 0);
    const VERDE = rgb(0.06, 0.73, 0.51);
    const AMARILLO = rgb(0.96, 0.62, 0.04);
    const ROJO = rgb(0.94, 0.27, 0.27);

    // Encabezado portada
    pagina.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 50, size: 18, font: fB, color: BLANCO });
    pagina.drawText('SISTEMA DE GESTIÓN DE CALIDAD', { x: 20, y: height - 30, size: 12, font: fN, color: rgb(0.8, 0.9, 1) });
    pagina.drawText('SGC-UNT', { x: 20, y: height - 15, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    // Título del reporte
    pagina.drawText('REPORTE GENERAL DEL DASHBOARD', { x: 20, y: height - 180, size: 24, font: fB, color: AZUL });
    pagina.drawText('Sistema de Gestión de Calidad Institucional', { x: 20, y: height - 210, size: 14, font: fN, color: NEGRO });

    const fechaReporte = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
    pagina.drawText(`Fecha de generación: ${fechaReporte}`, { x: 20, y: height - 250, size: 10, font: fN, color: rgb(0.5, 0.5, 0.5) });

    // PÁGINA 2: RESUMEN EJECUTIVO
    pagina = pdfDoc.addPage([595, 842]);
    let y = 800;

    pagina.drawRectangle({ x: 0, y: height - 50, width, height: 50, color: AZUL });
    pagina.drawText('RESUMEN EJECUTIVO', { x: 20, y: height - 30, size: 14, font: fB, color: BLANCO });

    y -= 70;
    pagina.drawText('KPIs CLAVE DEL SISTEMA', { x: 20, y, size: 12, font: fB, color: AZUL });
    y -= 20;

    const stats = {
      docs: docs.rows[0]?.total || 0,
      proc: proc.rows[0]?.total || 0,
      audits: audits.rows[0]?.total || 0,
      acciones: acciones.rows[0]?.total || 0,
      riesgos: riesgos.rows[0]?.total || 0,
      indicadores: indicadores.rows[0]?.total_activos || 0,
      encuestas: encuestas.rows[0]?.total || 0,
      usuarios: usuarios.rows[0]?.total || 0,
    };

    // KPIs en grid
    const kpis = [
      { label: 'Documentos', valor: stats.docs },
      { label: 'Procesos activos', valor: stats.proc },
      { label: 'Auditorías', valor: stats.audits },
      { label: 'No conformidades', valor: stats.acciones },
      { label: 'Riesgos', valor: stats.riesgos },
      { label: 'Indicadores activos', valor: stats.indicadores },
      { label: 'Encuestas', valor: stats.encuestas },
      { label: 'Usuarios', valor: stats.usuarios },
    ];

    kpis.forEach((kpi, i) => {
      if (i % 2 === 0 && i > 0) y -= 15;
      const x = i % 2 === 0 ? 20 : 310;
      pagina.drawText(`${kpi.label}: ${kpi.valor}`, { x, y, size: 10, font: fN, color: NEGRO });
      if (i % 2 === 1) y -= 20;
    });

    y -= 30;
    pagina.drawLine({ start: { x: 20, y }, end: { x: width - 20, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // PÁGINA 3: ESTADO POR MÓDULO
    pagina = pdfDoc.addPage([595, 842]);
    y = 800;

    pagina.drawRectangle({ x: 0, y: height - 50, width, height: 50, color: AZUL });
    pagina.drawText('ESTADO POR MÓDULO', { x: 20, y: height - 30, size: 14, font: fB, color: BLANCO });

    // Documentos por estado
    if (docsEstado.rows.length > 0) {
      y -= 70;
      pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
      pagina.drawText('DOCUMENTOS POR ESTADO', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
      y -= 25;

      docsEstado.rows.forEach((m, i) => {
        pagina.drawText(`${m.estado}: ${m.cantidad}`, { x: 30, y, size: 9, font: fN, color: NEGRO });
        y -= 15;
      });
      y -= 20;
    }

    // Riesgos por nivel
    if (riesgosNivel.rows.length > 0) {
      y -= 50;
      pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
      pagina.drawText('RIESGOS POR NIVEL', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
      y -= 25;

      riesgosNivel.rows.forEach((s, i) => {
        pagina.drawText(`${s.clasificacion_nivel}: ${s.cantidad}`, { x: 30, y, size: 9, font: fN, color: NEGRO });
        y -= 15;
      });
    }

    // PÁGINA 4: INDICADORES
    pagina = pdfDoc.addPage([595, 842]);
    y = 800;

    pagina.drawRectangle({ x: 0, y: height - 50, width, height: 50, color: AZUL });
    pagina.drawText('INDICADORES', { x: 20, y: height - 30, size: 14, font: fB, color: BLANCO });

    // Indicadores por módulo
    if (indicadoresPorModulo.rows.length > 0) {
      y -= 70;
      pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
      pagina.drawText('INDICADORES POR MÓDULO', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
      y -= 25;

      indicadoresPorModulo.rows.forEach((m, i) => {
        pagina.drawText(`${m.modulo}: ${m.total}`, { x: 30, y, size: 9, font: fN, color: NEGRO });
        y -= 15;
      });
      y -= 20;
    }

    // Estado de indicadores por semáforo
    if (indicadoresPorSemaforo.rows.length > 0) {
      y -= 50;
      pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
      pagina.drawText('ESTADO DE INDICADORES (SEMÁFORO)', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
      y -= 25;

      indicadoresPorSemaforo.rows.forEach(s => {
        const color = s.estado_semaforo === 'verde' ? VERDE : s.estado_semaforo === 'amarillo' ? AMARILLO : ROJO;
        pagina.drawRectangle({ x: 30, y: y - 3, width: 10, height: 10, color });
        pagina.drawText(`${s.estado_semaforo}: ${s.total}`, { x: 45, y, size: 9, font: fN, color: NEGRO });
        y -= 15;
      });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-dashboard-general.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error al generar reporte del dashboard:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listar, dashboard, obtener, crear, actualizar, toggleActivo, eliminar,
                   registrarMedicion, actualizarMedicion, listarMediciones, eliminarMedicion, listarParametros, listarAlertas, generarPDF, generarReporte, generarReporteDashboard };
