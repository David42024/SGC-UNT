// ============================================================
// CONTROLADOR DE PROCESOS - SGC UNT
// VERSIÓN CORRECTA (SIN CORRECCIONES INVENTADAS)
// ============================================================

const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// --- FUNCIÓN AUXILIAR PARA FORMATEAR RESPUESTAS ---
const formatearRespuesta = (exito, datos = null, mensaje = '') => ({ exito, datos, mensaje });

// --- FUNCIÓN AUXILIAR PARA NORMALIZAR TEXTO (mayúsculas, null-safe) ---
const normalizar = (str) => (str ? String(str).toUpperCase() : null);

// --- VALORES VÁLIDOS PARA CAMPOS RESTRINGIDOS ---
const NIVELES_VALIDOS = ['macroproceso', 'proceso', 'subproceso'];

// ============================================================
// VALIDACIÓN DE PROCESO (crear / actualizar)
// ============================================================
const validarProceso = (body, { esCreacion }) => {
  const errores = [];

  if (esCreacion && (!body.codigo || !String(body.codigo).trim())) {
    errores.push('El código es obligatorio');
  }
  if (!body.nombre || !String(body.nombre).trim()) {
    errores.push('El nombre es obligatorio');
  }
  if (!body.tipo_id) {
    errores.push('El tipo de proceso es obligatorio');
  }
  if (!body.responsable_id) {
    errores.push('El responsable es obligatorio');
  }
  if (!body.nivel || !NIVELES_VALIDOS.includes(body.nivel)) {
    errores.push(`El nivel debe ser uno de: ${NIVELES_VALIDOS.join(', ')}`);
  }

  return errores;
};

// ============================================================
// 1. LISTAR PROCESOS (CON FILTROS AVANZADOS)
// ============================================================
const listar = async (req, res) => {
  try {
    const { tipo_id, nivel, activo = 'true', buscar } = req.query;
    const params = [];
    const condiciones = [];

    const mostrarActivos = activo === 'true';
    params.push(mostrarActivos);
    condiciones.push(`p.activo = $${params.length}`);

    if (tipo_id) {
      params.push(tipo_id);
      condiciones.push(`p.tipo_id = $${params.length}`);
    }
    if (nivel) {
      params.push(nivel);
      condiciones.push(`p.nivel = $${params.length}`);
    }
    if (buscar) {
      params.push(`%${buscar}%`);
      condiciones.push(`(p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length} OR p.descripcion ILIKE $${params.length})`);
    }

    const where = `WHERE ${condiciones.join(' AND ')}`;

    const resultado = await consulta(
      `SELECT p.*, 
              tp.nombre AS tipo_nombre,
              u.nombres || ' ' || u.apellidos AS responsable_nombre,
              pp.nombre AS proceso_padre_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       LEFT JOIN procesos pp ON pp.id = p.proceso_padre_id
       ${where}
       ORDER BY tp.nombre, p.nivel, p.nombre`,
      params
    );

    res.json(formatearRespuesta(true, resultado.rows));
  } catch (error) {
    console.error('Error en listar procesos:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 2. OBTENER MAPA DE PROCESOS (ESTRUCTURA JERÁRQUICA)
// ============================================================
const mapa = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT p.*, 
              tp.nombre AS tipo_nombre,
              u.nombres || ' ' || u.apellidos AS responsable_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       WHERE p.activo = true
       ORDER BY tp.nombre, p.proceso_padre_id NULLS FIRST, p.nombre`
    );

    // ✅ CORRECTO: Comparación exacta con ===
    const construirArbol = (procesos, padreId = null) =>
      procesos
        .filter(p => p.proceso_padre_id === padreId)
        .map(p => ({
          ...p,
          hijos: construirArbol(procesos, p.id),
        }));

    res.json(formatearRespuesta(true, construirArbol(resultado.rows)));
  } catch (error) {
    console.error('Error en mapa de procesos:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 3. OBTENER UN PROCESO POR ID
// ============================================================
const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT p.*,
              tp.nombre AS tipo_nombre,
              u.nombres || ' ' || u.apellidos AS responsable_nombre,
              pp.nombre AS proceso_padre_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       LEFT JOIN procesos pp ON pp.id = p.proceso_padre_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json(formatearRespuesta(false, null, 'Proceso no encontrado'));
    }

    res.json(formatearRespuesta(true, resultado.rows[0]));
  } catch (error) {
    console.error('Error en obtener proceso:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 4. CREAR UN NUEVO PROCESO
// ============================================================
const crear = async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, tipo_id, proceso_padre_id, nivel, responsable_id,
      objetivo, alcance, entradas, salidas, recursos, indicadores_clave, activo = true
    } = req.body;

    const errores = validarProceso(req.body, { esCreacion: true });
    if (errores.length) {
      return res.status(400).json(formatearRespuesta(false, null, errores.join('. ')));
    }

    const resultado = await consulta(
      `INSERT INTO procesos 
        (codigo, nombre, descripcion, tipo_id, proceso_padre_id, nivel,
         responsable_id, objetivo, alcance, entradas, salidas, recursos, 
         indicadores_clave, activo, creado_por, actualizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
       RETURNING *`,
      [
        normalizar(codigo), normalizar(nombre), normalizar(descripcion),
        tipo_id, proceso_padre_id || null, nivel,
        responsable_id, normalizar(objetivo), normalizar(alcance),
        normalizar(entradas), normalizar(salidas), normalizar(recursos),
        normalizar(indicadores_clave), activo, req.usuario.id
      ]
    );

    res.status(201).json(formatearRespuesta(true, resultado.rows[0], 'Proceso creado exitosamente'));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json(formatearRespuesta(false, null, 'El código del proceso ya existe'));
    }
    console.error('Error en crear proceso:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 5. ACTUALIZAR UN PROCESO EXISTENTE
// ============================================================
const actualizar = async (req, res) => {
  try {
    const {
      nombre, descripcion, tipo_id, proceso_padre_id, nivel, responsable_id,
      objetivo, alcance, entradas, salidas, recursos, indicadores_clave, activo
    } = req.body;

    const errores = validarProceso(req.body, { esCreacion: false });
    if (errores.length) {
      return res.status(400).json(formatearRespuesta(false, null, errores.join('. ')));
    }

    // ✅ CORRECTO: Prevención de ciclo directo
    if (proceso_padre_id && String(proceso_padre_id) === String(req.params.id)) {
      return res.status(400).json(formatearRespuesta(false, null, 'Un proceso no puede ser su propio proceso padre'));
    }

    const resultado = await consulta(
      `UPDATE procesos 
       SET nombre = $1, descripcion = $2, tipo_id = $3, proceso_padre_id = $4, 
           nivel = $5, responsable_id = $6, objetivo = $7, alcance = $8, 
           entradas = $9, salidas = $10, recursos = $11, indicadores_clave = $12, 
           activo = $13, actualizado_por = $14, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $15
       RETURNING *`,
      [
        normalizar(nombre), normalizar(descripcion), tipo_id, proceso_padre_id || null,
        nivel, responsable_id, normalizar(objetivo), normalizar(alcance),
        normalizar(entradas), normalizar(salidas), normalizar(recursos),
        normalizar(indicadores_clave), activo !== undefined ? activo : true, req.usuario.id, req.params.id
      ]
    );

    if (!resultado.rows.length) {
      return res.status(404).json(formatearRespuesta(false, null, 'Proceso no encontrado'));
    }

    res.json(formatearRespuesta(true, resultado.rows[0], 'Proceso actualizado correctamente'));
  } catch (error) {
    console.error('Error en actualizar proceso:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 6. ELIMINAR (DESACTIVAR) UN PROCESO
// ============================================================
const eliminar = async (req, res) => {
  try {
    const resultado = await consulta(
      'UPDATE procesos SET activo = false, actualizado_por = $1 WHERE id = $2 RETURNING id',
      [req.usuario.id, req.params.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json(formatearRespuesta(false, null, 'Proceso no encontrado'));
    }

    res.json(formatearRespuesta(true, null, 'Proceso desactivado correctamente'));
  } catch (error) {
    console.error('Error en eliminar proceso:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 7. LISTAR TIPOS DE PROCESO
// ============================================================
const listarTipos = async (req, res) => {
  try {
    const resultado = await consulta('SELECT * FROM tipos_proceso ORDER BY nombre');
    res.json(formatearRespuesta(true, resultado.rows));
  } catch (error) {
    console.error('Error en listar tipos de proceso:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 8. LISTAR ACTIVIDADES DE UN PROCESO
// ============================================================
const listarActividades = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT a.*, 
              u.nombres || ' ' || u.apellidos AS responsable_nombre
       FROM actividades_proceso a
       LEFT JOIN usuarios u ON u.id = a.responsable_id
       WHERE a.proceso_id = $1
       ORDER BY a.orden`,
      [req.params.id]
    );

    res.json(formatearRespuesta(true, resultado.rows));
  } catch (error) {
    console.error('Error en listar actividades:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 9. CREAR UNA NUEVA ACTIVIDAD PARA UN PROCESO
// ============================================================
const crearActividad = async (req, res) => {
  try {
    const { orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json(formatearRespuesta(false, null, 'El nombre de la actividad es obligatorio'));
    }
    if (orden === undefined || orden === null || isNaN(Number(orden))) {
      return res.status(400).json(formatearRespuesta(false, null, 'El orden de la actividad es obligatorio y debe ser numérico'));
    }

    const resultado = await consulta(
      `INSERT INTO actividades_proceso 
        (proceso_id, orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias, creado_por, actualizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       RETURNING *`,
      [req.params.id, orden, normalizar(nombre), normalizar(descripcion),
       responsable_id, tipo_actividad, duracion_estimada_dias, req.usuario.id]
    );

    res.status(201).json(formatearRespuesta(true, resultado.rows[0], 'Actividad creada exitosamente'));
  } catch (error) {
    console.error('Error en crear actividad:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 10. ACTUALIZAR UNA ACTIVIDAD
// ============================================================
const actualizarActividad = async (req, res) => {
  try {
    const { orden, nombre, descripcion, responsable_id, tipo_actividad, duracion_estimada_dias } = req.body;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json(formatearRespuesta(false, null, 'El nombre de la actividad es obligatorio'));
    }
    if (orden === undefined || orden === null || isNaN(Number(orden))) {
      return res.status(400).json(formatearRespuesta(false, null, 'El orden de la actividad es obligatorio y debe ser numérico'));
    }

    const resultado = await consulta(
      `UPDATE actividades_proceso 
       SET orden = $1, nombre = $2, descripcion = $3, responsable_id = $4, 
           tipo_actividad = $5, duracion_estimada_dias = $6, actualizado_por = $7
       WHERE id = $8 AND proceso_id = $9
       RETURNING *`,
      [orden, normalizar(nombre), normalizar(descripcion),
       responsable_id, tipo_actividad, duracion_estimada_dias,
       req.usuario.id, req.params.actId, req.params.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json(formatearRespuesta(false, null, 'Actividad no encontrada'));
    }

    res.json(formatearRespuesta(true, resultado.rows[0], 'Actividad actualizada correctamente'));
  } catch (error) {
    console.error('Error en actualizar actividad:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 11. ELIMINAR UNA ACTIVIDAD
// ============================================================
const eliminarActividad = async (req, res) => {
  try {
    // ✅ CORRECTO: RETURNING id para verificar existencia
    const resultado = await consulta(
      'DELETE FROM actividades_proceso WHERE id = $1 AND proceso_id = $2 RETURNING id',
      [req.params.actId, req.params.id]
    );

    if (!resultado.rows.length) {
      return res.status(404).json(formatearRespuesta(false, null, 'Actividad no encontrada'));
    }

    res.json(formatearRespuesta(true, null, 'Actividad eliminada correctamente'));
  } catch (error) {
    console.error('Error en eliminar actividad:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 12. OBTENER ESTADÍSTICAS DE PROCESOS
// ============================================================
const estadisticas = async (req, res) => {
  try {
    const [total, porTipo, porNivel] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM procesos WHERE activo = true'),
      consulta(
        `SELECT tp.nombre AS tipo, COUNT(*) AS cantidad
         FROM procesos p
         JOIN tipos_proceso tp ON tp.id = p.tipo_id
         WHERE p.activo = true
         GROUP BY tp.nombre`
      ),
      consulta(
        `SELECT nivel, COUNT(*) AS cantidad
         FROM procesos
         WHERE activo = true
         GROUP BY nivel`
      ),
    ]);

    res.json(formatearRespuesta(true, {
      total: parseInt(total.rows[0].total, 10),
      por_tipo: porTipo.rows,
      por_nivel: porNivel.rows,
    }));
  } catch (error) {
    console.error('Error en estadísticas de procesos:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// 13. GENERAR PDF DE UN PROCESO (CON WRAP DE TEXTO)
// ============================================================
const dividirEnLineas = (texto, font, size, maxWidth) => {
  if (!texto) return ['—'];
  const palabras = String(texto).split(/\s+/).filter(Boolean);
  if (!palabras.length) return ['—'];

  const lineas = [];
  let lineaActual = '';

  for (const palabra of palabras) {
    const candidata = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    const ancho = font.widthOfTextAtSize(candidata, size);
    if (ancho <= maxWidth) {
      lineaActual = candidata;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      if (font.widthOfTextAtSize(palabra, size) > maxWidth) {
        let truncada = palabra;
        while (truncada.length > 1 && font.widthOfTextAtSize(truncada + '…', size) > maxWidth) {
          truncada = truncada.slice(0, -1);
        }
        lineas.push(truncada + '…');
        lineaActual = '';
      } else {
        lineaActual = palabra;
      }
    }
  }
  if (lineaActual) lineas.push(lineaActual);

  return lineas;
};

const generarPDF = async (req, res) => {
  try {
    const proc = await consulta(
      `SELECT p.*, 
              tp.nombre AS tipo_nombre,
              u.nombres || ' ' || u.apellidos AS responsable_nombre
       FROM procesos p
       JOIN tipos_proceso tp ON tp.id = p.tipo_id
       LEFT JOIN usuarios u ON u.id = p.responsable_id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!proc.rows.length) {
      return res.status(404).json(formatearRespuesta(false, null, 'Proceso no encontrado'));
    }

    const actividades = await consulta(
      `SELECT a.*, 
              u.nombres || ' ' || u.apellidos AS responsable_nombre
       FROM actividades_proceso a
       LEFT JOIN usuarios u ON u.id = a.responsable_id
       WHERE a.proceso_id = $1
       ORDER BY a.orden`,
      [req.params.id]
    );

    const pdfDoc = await PDFDocument.create();
    const MARGEN_INFERIOR = 50;
    const ANCHO_PAGINA = 595;
    const ALTO_PAGINA = 842;

    let pagina = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
    const { width, height } = pagina.getSize();

    const fNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fNegrilla = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    const dibujarEncabezado = (pag) => {
      pag.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
      pag.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fNegrilla, color: BLANCO });
      pag.drawText('SGC-UNT — FICHA DE PROCESO', { x: 20, y: height - 55, size: 10, font: fNormal, color: rgb(0.8, 0.9, 1) });
    };

    dibujarEncabezado(pagina);

    const p = proc.rows[0];
    let y = height - 105;

    const asegurarEspacio = (alturaNecesaria) => {
      if (y - alturaNecesaria < MARGEN_INFERIOR) {
        pagina = pdfDoc.addPage([ANCHO_PAGINA, ALTO_PAGINA]);
        dibujarEncabezado(pagina);
        y = height - 105;
      }
    };

    const ANCHO_VALOR = width - 150 - 20;
    const fila = (etiqueta, valor) => {
      const lineas = dividirEnLineas(valor, fNormal, 9, ANCHO_VALOR);
      asegurarEspacio(lineas.length * 14);

      pagina.drawText(`${etiqueta}:`, { x: 20, y, size: 9, font: fNegrilla, color: AZUL });
      lineas.forEach((linea, i) => {
        pagina.drawText(linea, { x: 150, y: y - (i * 14), size: 9, font: fNormal, color: rgb(0, 0, 0) });
      });
      y -= Math.max(18, lineas.length * 14 + 4);
    };

    fila('CÓDIGO', p.codigo);
    fila('NOMBRE', p.nombre);
    fila('TIPO', p.tipo_nombre);
    fila('NIVEL', p.nivel ? p.nivel.toUpperCase() : '—');
    fila('RESPONSABLE', p.responsable_nombre);
    fila('OBJETIVO', p.objetivo);
    fila('ALCANCE', p.alcance);
    fila('ENTRADAS', p.entradas);
    fila('SALIDAS', p.salidas);
    fila('RECURSOS', p.recursos);
    fila('INDICADORES CLAVE', p.indicadores_clave);

    asegurarEspacio(30);
    y -= 10;
    asegurarEspacio(25);

    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('ACTIVIDADES DEL PROCESO', { x: 28, y: y + 2, size: 10, font: fNegrilla, color: BLANCO });
    y -= 25;

    const ANCHO_ACTIVIDAD = width - 28 - 20;
    for (const act of actividades.rows) {
      const texto = `${act.orden}. [${act.tipo_actividad || 'Sin Tipo'}] ${act.nombre}`;
      const lineas = dividirEnLineas(texto, fNormal, 9, ANCHO_ACTIVIDAD);
      asegurarEspacio(lineas.length * 14);

      lineas.forEach((linea, i) => {
        pagina.drawText(linea, { x: 28, y: y - (i * 14), size: 9, font: fNormal, color: rgb(0, 0, 0) });
      });
      y -= lineas.length * 14;
    }

    asegurarEspacio(35);
    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    pagina.drawText(`Generado: ${fecha}`, { x: 20, y: 35, size: 8, font: fNormal, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proceso-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json(formatearRespuesta(false, null, error.message));
  }
};

// ============================================================
// EXPORTACIÓN DE TODAS LAS FUNCIONES
// ============================================================
module.exports = {
  listar,
  mapa,
  obtener,
  crear,
  actualizar,
  eliminar,
  listarTipos,
  listarActividades,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  estadisticas,
  generarPDF
};