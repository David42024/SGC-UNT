require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { logger } = require('./config/logger');

const app = express();

// ── Middlewares globales ──────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// ── Test endpoints (sin autenticación) ────────────────────────────
const { consulta } = require('./config/db');

app.get('/api/test/acciones', async (req, res) => {
  try {
    const resultado = await consulta(`
      SELECT nc.*, u.nombres||' '||u.apellidos AS responsable_nombre,
              p.nombre AS proceso_nombre,
              COUNT(pa.id) AS total_actividades,
              COUNT(pa.id) FILTER (WHERE pa.estado='completado') AS actividades_completadas,
              acr.metodo AS metodo_analisis,
              acr.causa_raiz
       FROM no_conformidades nc
       LEFT JOIN usuarios u ON u.id=nc.responsable_id
       LEFT JOIN procesos p ON p.id=nc.proceso_id
       LEFT JOIN planes_accion_capa pa ON pa.no_conformidad_id=nc.id
       LEFT JOIN analisis_causa_raiz acr ON acr.no_conformidad_id=nc.id
       GROUP BY nc.id, u.nombres, u.apellidos, p.nombre, acr.metodo, acr.causa_raiz
       ORDER BY nc.creado_en DESC
    `);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    console.error('Error test/acciones:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/auditorias', async (req, res) => {
  try {
    const resultado = await consulta(`
      SELECT 
        a.*, 
        u.nombres||' '||u.apellidos AS auditor_lider_nombre,
        pa.nombre AS programa_nombre,
        p.nombre AS proceso_nombre,
        COALESCE(h.total, 0) AS total_hallazgos,
        COALESCE(h.hallazgos_por_estado, '{}'::jsonb) AS hallazgos_por_estado
       FROM auditorias a
       LEFT JOIN usuarios u ON u.id=a.auditor_lider_id
       LEFT JOIN programas_auditoria pa ON pa.id=a.programa_id
       LEFT JOIN procesos p ON p.id=a.proceso_id
       LEFT JOIN (
         SELECT 
           auditoria_id, 
           COUNT(*) AS total,
           jsonb_object_agg(estado, cantidad) AS hallazgos_por_estado
         FROM (
           SELECT auditoria_id, estado, COUNT(*) AS cantidad
           FROM hallazgos_auditoria
           GROUP BY auditoria_id, estado
         ) t
         GROUP BY auditoria_id
       ) h ON h.auditoria_id=a.id
       ORDER BY a.creado_en DESC
    `);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    console.error('Error test/auditorias:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/procesos', async (req, res) => {
  try {
    const resultado = await consulta(`SELECT * FROM procesos ORDER BY nombre`);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/usuarios', async (req, res) => {
  try {
    const resultado = await consulta(`
      SELECT u.id, u.nombres, u.apellidos, u.correo, r.nombre AS rol 
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id 
      ORDER BY u.apellidos
    `);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/acreditacion/autoevaluaciones', async (req, res) => {
  try {
    const resultado = await consulta(`
      SELECT ae.*, u.nombres || ' ' || u.apellidos AS responsable_nombre, m.nombre AS modelo_nombre
      FROM autoevaluaciones ae
      LEFT JOIN usuarios u ON u.id = ae.responsable_id
      LEFT JOIN modelos_acreditacion m ON m.id = ae.modelo_id
      ORDER BY ae.creado_en DESC
    `);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    console.error('Error test/acreditacion/autoevaluaciones:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/acreditacion/autoevaluaciones/:id/evidencias', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await consulta(`
      SELECT ea.*, 
        e.codigo AS estandar_codigo, 
        e.nombre AS estandar_nombre,
        u.nombres || ' ' || u.apellidos AS responsable_nombre
      FROM evidencias_acreditacion ea
      LEFT JOIN estandares_acreditacion e ON e.id = ea.estandar_id
      LEFT JOIN usuarios u ON u.id = ea.responsable_id
      WHERE ea.autoevaluacion_id = $1
      ORDER BY e.codigo
    `, [id]);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    console.error('Error test/acreditacion/autoevaluaciones/:id/evidencias:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/acreditacion/modelos', async (req, res) => {
  try {
    const resultado = await consulta(`SELECT * FROM modelos_acreditacion ORDER BY nombre`);
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/acreditacion/modelos/:modeloId/estandares', async (req, res) => {
  try {
    const { modeloId } = req.params;
    const resultado = await consulta(`SELECT * FROM estandares_acreditacion WHERE modelo_id = $1 ORDER BY codigo`, [modeloId]);
    
    // Convert to tree structure (parent -> children)
    const estandares = resultado.rows;
    const map = new Map();
    const root = [];
    
    estandares.forEach(e => { map.set(e.id, { ...e, hijos: [] }); });
    estandares.forEach(e => {
      const node = map.get(e.id);
      if (e.padre_id && map.has(e.padre_id)) map.get(e.padre_id).hijos.push(node);
      else root.push(node);
    });
    
    res.json({ exito: true, datos: root });
  } catch (error) {
    console.error('Error test/acreditacion/modelos/:modeloId/estandares:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/acreditacion/autoevaluaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const aeResult = await consulta(`
      SELECT ae.*, 
        u.nombres || ' ' || u.apellidos AS responsable_nombre, 
        m.nombre AS modelo_nombre,
        m.entidad AS modelo_entidad,
        m.version AS modelo_version
      FROM autoevaluaciones ae
      LEFT JOIN usuarios u ON u.id = ae.responsable_id
      LEFT JOIN modelos_acreditacion m ON m.id = ae.modelo_id
      WHERE ae.id = $1
    `, [id]);

    if (aeResult.rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Autoevaluación no encontrada' });
    }

    const factoresResult = await consulta(`
      SELECT 
        e.*,
        COUNT(ea.id) AS total_evidencias,
        COUNT(ea.id) FILTER (WHERE ea.estado_cumplimiento = 'cumplido') AS cumplidos,
        COALESCE(AVG(ea.porcentaje_cumplimiento), 0) AS porcentaje_promedio,
        CASE 
          WHEN COUNT(ea.id) FILTER (WHERE ea.estado_cumplimiento = 'cumplido') = COUNT(ea.id) AND COUNT(ea.id) > 0 THEN 'completado'
          WHEN COUNT(ea.id) > 0 THEN 'en_proceso'
          ELSE 'pendiente'
        END AS estado
      FROM estandares_acreditacion e
      LEFT JOIN evidencias_acreditacion ea ON ea.estandar_id = e.id AND ea.autoevaluacion_id = $1
      WHERE e.modelo_id = (SELECT modelo_id FROM autoevaluaciones WHERE id = $1)
        AND e.nivel = 'factor'
      GROUP BY e.id
      ORDER BY e.codigo
    `, [id]);

    res.json({ 
      exito: true, 
      datos: {
        ...aeResult.rows[0],
        factores: factoresResult.rows
      }
    });
  } catch (error) {
    console.error('Error test/acreditacion/autoevaluaciones/:id:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.get('/api/test/acreditacion/autoevaluaciones/:id/factores/:factorId/evaluacion', async (req, res) => {
  try {
    const { id, factorId } = req.params;
    const result = await consulta(
      'SELECT * FROM evidencias_acreditacion WHERE autoevaluacion_id = $1 AND estandar_id = $2 LIMIT 1',
      [id, factorId]
    );
    res.json({ exito: true, datos: result.rows[0] || null });
  } catch (error) {
    console.error('Error obteniendo evaluación:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.post('/api/test/acreditacion/autoevaluaciones/:id/evidencias', async (req, res) => {
  try {
    const { id } = req.params;
    const { estandar_id, descripcion, tipo_evidencia, estado_cumplimiento, porcentaje_cumplimiento, observaciones, responsable_id } = req.body;
    await consulta(
      `INSERT INTO evidencias_acreditacion 
      (autoevaluacion_id, estandar_id, descripcion, tipo_evidencia, estado_cumplimiento, porcentaje_cumplimiento, observaciones, responsable_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, estandar_id, descripcion, tipo_evidencia || 'documento', estado_cumplimiento || 'no_iniciado', porcentaje_cumplimiento || 0, observaciones || '', responsable_id || null]
    );
    res.json({ exito: true, mensaje: 'Evidencia creada correctamente' });
  } catch (error) {
    console.error('Error creando evidencia:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.put('/api/test/evidencias/:evidId', async (req, res) => {
  try {
    const { evidId } = req.params;
    const { estado_cumplimiento, porcentaje_cumplimiento } = req.body;
    
    await consulta(
      `UPDATE evidencias_acreditacion 
       SET estado_cumplimiento = $1, porcentaje_cumplimiento = $2, actualizado_en = NOW()
       WHERE id = $3`,
      [estado_cumplimiento, porcentaje_cumplimiento, evidId]
    );

    res.json({ exito: true, mensaje: 'Evidencia actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando evidencia:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

app.post('/api/test/acreditacion/autoevaluaciones/:id/factores/:factorId/evaluacion', async (req, res) => {
  try {
    const { id, factorId } = req.params;
    const { cumplimiento, puntaje, observaciones } = req.body;
    const autoevaluacionId = Number(id);
    const estandarId = Number(factorId);
    
    const estadoCumplimiento = {
      'cumple': 'cumplido',
      'cumple_parcialmente': 'en_proceso',
      'no_cumple': 'no_cumplido',
      'no_aplica': 'no_iniciado'
    }[cumplimiento] || 'no_iniciado';
    
    const existing = await consulta(
      'SELECT id FROM evidencias_acreditacion WHERE autoevaluacion_id = $1 AND estandar_id = $2',
      [autoevaluacionId, estandarId]
    );

    if (existing.rows.length > 0) {
      await consulta(
        `UPDATE evidencias_acreditacion 
         SET estado_cumplimiento = $1, porcentaje_cumplimiento = $2, observaciones = $3, actualizado_en = NOW()
         WHERE id = $4`,
        [estadoCumplimiento, puntaje || 0, observaciones || '', existing.rows[0].id]
      );
    } else {
      await consulta(
        `INSERT INTO evidencias_acreditacion 
        (autoevaluacion_id, estandar_id, descripcion, tipo_evidencia, estado_cumplimiento, porcentaje_cumplimiento, observaciones)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [autoevaluacionId, estandarId, 'Evaluación del factor', 'documento', estadoCumplimiento, puntaje || 0, observaciones || '']
      );
    }

    res.json({ exito: true, mensaje: 'Evaluación guardada correctamente' });
  } catch (error) {
    console.error('Error guardando evaluación:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});
// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/documentos',    require('./routes/documentos.routes'));
app.use('/api/procesos',      require('./routes/procesos.routes'));
app.use('/api/acreditacion',  require('./routes/acreditacion.routes'));
app.use('/api/auditorias',    require('./routes/auditorias.routes'));
app.use('/api/acciones',      require('./routes/acciones.routes'));
app.use('/api/riesgos',       require('./routes/riesgos.routes'));
app.use('/api/indicadores',   require('./routes/indicadores.routes'));
app.use('/api/satisfaccion',  require('./routes/satisfaccion.routes'));
app.use('/api/usuarios',      require('./routes/usuarios.routes'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', version: '1.0.0', sistema: 'SGC-UNT', timestamp: new Date() });
});

// ── Manejador de errores global ───────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.message} — ${req.method} ${req.originalUrl}`);
  res.status(err.status || 500).json({
    exito: false,
    mensaje: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PUERTO = process.env.PORT || 4000;
app.listen(PUERTO, () => {
  logger.info(`SGC-UNT backend iniciado en puerto ${PUERTO}`);
});

module.exports = app;

// Restart trigger 2

