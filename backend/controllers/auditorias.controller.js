const { pool, consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const listarProgramas = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT pa.*, u.nombres||' '||u.apellidos AS responsable_nombre,
              COUNT(a.id) AS total_auditorias
       FROM programas_auditoria pa
       LEFT JOIN usuarios u ON u.id = pa.responsable_id
       LEFT JOIN auditorias a ON a.programa_id = pa.id
       GROUP BY pa.id, u.nombres, u.apellidos ORDER BY pa.año DESC`
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtenerPrograma = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT pa.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM programas_auditoria pa LEFT JOIN usuarios u ON u.id=pa.responsable_id WHERE pa.id=$1`,
      [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Programa no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crearPrograma = async (req, res) => {
  try {
    const { nombre, descripcion, año, responsable_id } = req.body;
    const resultado = await consulta(
      `INSERT INTO programas_auditoria (nombre, descripcion, año, responsable_id, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
      [nombre, descripcion, año, responsable_id, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarPrograma = async (req, res) => {
  try {
    const { nombre, descripcion, estado, responsable_id } = req.body;
    const resultado = await consulta(
      `UPDATE programas_auditoria SET nombre=$1, descripcion=$2, estado=$3, responsable_id=$4, actualizado_por=$5
       WHERE id=$6 RETURNING *`,
      [nombre, descripcion, estado, responsable_id, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Programa no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listar = async (req, res) => {
  try {
    const { estado, tipo_auditoria, programa_id } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    
    // Check if user is admin
    if (req.usuario.rol.toLowerCase() !== 'admin') {
      params.push(req.usuario.id);
      where += ` AND a.id IN (
        SELECT auditoria_id FROM auditores_auditoria WHERE usuario_id = $${params.length}
      )`;
    }
    
    if (estado)          { params.push(estado);          where += ` AND a.estado=$${params.length}`; }
    if (tipo_auditoria)  { params.push(tipo_auditoria);  where += ` AND a.tipo_auditoria=$${params.length}`; }
    if (programa_id)     { params.push(programa_id);     where += ` AND a.programa_id=$${params.length}`; }

    const resultado = await consulta(
      `SELECT 
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
       ${where} 
       ORDER BY a.creado_en DESC`, params
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT a.*, u.nombres||' '||u.apellidos AS auditor_lider_nombre,
              pa.nombre AS programa_nombre, p.nombre AS proceso_nombre
       FROM auditorias a
       LEFT JOIN usuarios u ON u.id=a.auditor_lider_id
       LEFT JOIN programas_auditoria pa ON pa.id=a.programa_id
       LEFT JOIN procesos p ON p.id=a.proceso_id
       WHERE a.id=$1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Auditoría no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crear = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { programa_id, codigo, titulo, tipo_auditoria, alcance, objetivo,
            proceso_id, auditor_lider_id, fecha_planificada, fecha_inicio, fecha_fin, estado = 'planificado' } = req.body;
    const resultado = await client.query(
      `INSERT INTO auditorias (programa_id, codigo, titulo, tipo_auditoria, alcance, objetivo,
       proceso_id, auditor_lider_id, fecha_planificada, fecha_inicio, fecha_fin, estado, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13) RETURNING *`,
      [programa_id || null, codigo, titulo, tipo_auditoria, alcance, objetivo,
       proceso_id || null, auditor_lider_id, fecha_planificada, fecha_inicio, fecha_fin, estado, req.usuario.id]
    );
    
    // Add auditor líder to audit team
    await client.query(
      `INSERT INTO auditores_auditoria (auditoria_id, usuario_id, rol_auditoria, creado_por, actualizado_por)
       VALUES ($1,$2,'auditor_lider',$3,$3) ON CONFLICT (auditoria_id, usuario_id) DO UPDATE SET rol_auditoria='auditor_lider'`,
      [resultado.rows[0].id, auditor_lider_id, req.usuario.id]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Auditoría creada exitosamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El código de auditoría ya existe' });
    res.status(500).json({ exito: false, mensaje: error.message });
  } finally {
    client.release();
  }
};

const actualizar = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { titulo, tipo_auditoria, alcance, objetivo, proceso_id, auditor_lider_id,
            fecha_planificada, fecha_inicio, fecha_fin, estado, conclusion_general } = req.body;
    
    // Get current auditor líder
    const currentAudit = await client.query('SELECT auditor_lider_id FROM auditorias WHERE id=$1', [req.params.id]);
    if (!currentAudit.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ exito: false, mensaje: 'Auditoría no encontrada' });
    }
    const oldLiderId = currentAudit.rows[0].auditor_lider_id;
    
    const resultado = await client.query(
      `UPDATE auditorias SET titulo=$1, tipo_auditoria=$2, alcance=$3, objetivo=$4,
       proceso_id=$5, auditor_lider_id=$6, fecha_planificada=$7, fecha_inicio=$8,
       fecha_fin=$9, estado=$10, conclusion_general=$11, actualizado_por=$12
       WHERE id=$13 RETURNING *`,
      [titulo, tipo_auditoria, alcance, objetivo, proceso_id || null, auditor_lider_id,
       fecha_planificada, fecha_inicio, fecha_fin, estado, conclusion_general, req.usuario.id, req.params.id]
    );
    
    // If auditor líder changed, update the team
    if (oldLiderId !== auditor_lider_id) {
      // Remove old lider from team
      await client.query('DELETE FROM auditores_auditoria WHERE auditoria_id=$1 AND usuario_id=$2', [req.params.id, oldLiderId]);
      // Add new lider to team
      await client.query(
        `INSERT INTO auditores_auditoria (auditoria_id, usuario_id, rol_auditoria, creado_por, actualizado_por)
         VALUES ($1,$2,'auditor_lider',$3,$3) ON CONFLICT (auditoria_id, usuario_id) DO UPDATE SET rol_auditoria='auditor_lider'`,
        [req.params.id, auditor_lider_id, req.usuario.id]
      );
    }
    
    await client.query('COMMIT');
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false, mensaje: error.message });
  } finally {
    client.release();
  }
};

const eliminar = async (req, res) => {
  try {
    await consulta('DELETE FROM auditorias WHERE id=$1', [req.params.id]);
    res.json({ exito: true, mensaje: 'Auditoría eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const agregarAuditor = async (req, res) => {
  try {
    const { usuario_id, rol_auditoria } = req.body;
    // First get the audit to check if we're trying to add the auditor líder
    const audit = await consulta('SELECT auditor_lider_id FROM auditorias WHERE id=$1', [req.params.id]);
    if (!audit.rows.length) return res.status(404).json({ exito: false, mensaje: 'Auditoría no encontrada' });
    
    let finalRol = rol_auditoria || 'auditor';
    // If user is the auditor líder, force role to 'auditor_lider'
    if (usuario_id === audit.rows[0].auditor_lider_id) {
      finalRol = 'auditor_lider';
    }
    
    const resultado = await consulta(
      `INSERT INTO auditores_auditoria (auditoria_id, usuario_id, rol_auditoria, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$4) ON CONFLICT (auditoria_id, usuario_id) DO UPDATE SET rol_auditoria=$3 RETURNING *`,
      [req.params.id, usuario_id, finalRol, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminarAuditor = async (req, res) => {
  try {
    // First check if this is the auditor líder
    const audit = await consulta('SELECT auditor_lider_id FROM auditorias WHERE id=$1', [req.params.id]);
    if (!audit.rows.length) return res.status(404).json({ exito: false, mensaje: 'Auditoría no encontrada' });
    
    if (parseInt(req.params.uid) === audit.rows[0].auditor_lider_id) {
      return res.status(400).json({ exito: false, mensaje: 'No se puede remover al auditor líder del equipo' });
    }
    
    await consulta('DELETE FROM auditores_auditoria WHERE auditoria_id=$1 AND usuario_id=$2', [req.params.id, req.params.uid]);
    res.json({ exito: true, mensaje: 'Auditor removido' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarAuditores = async (req, res) => {
  try {
    // First, make sure the auditor líder is in the team
    await consulta(
      `INSERT INTO auditores_auditoria (auditoria_id, usuario_id, rol_auditoria, creado_por, actualizado_por)
       SELECT id, auditor_lider_id, 'auditor_lider', auditor_lider_id, auditor_lider_id
       FROM auditorias WHERE id=$1
       ON CONFLICT (auditoria_id, usuario_id) DO UPDATE SET rol_auditoria='auditor_lider'`,
      [req.params.id]
    );
    
    const resultado = await consulta(
      `SELECT aa.*, u.nombres||' '||u.apellidos AS nombre, u.correo, r.nombre AS rol_sistema
       FROM auditores_auditoria aa
       JOIN usuarios u ON u.id=aa.usuario_id
       JOIN roles r ON r.id=u.rol_id
       WHERE aa.auditoria_id=$1`, [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarHallazgos = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT h.*, u.nombres||' '||u.apellidos AS responsable_nombre, p.nombre AS proceso_nombre
       FROM hallazgos_auditoria h
       LEFT JOIN usuarios u ON u.id=h.responsable_id
       LEFT JOIN procesos p ON p.id=h.proceso_id
       WHERE h.auditoria_id=$1 ORDER BY h.clasificacion, h.codigo`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const registrarHallazgo = async (req, res) => {
  try {
    const { codigo, descripcion, clasificacion, proceso_id, estandar_ref,
            evidencia_objetiva, responsable_id, fecha_limite } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;
    const resultado = await consulta(
      `INSERT INTO hallazgos_auditoria (auditoria_id, codigo, descripcion, clasificacion,
       proceso_id, estandar_ref, evidencia_objetiva, archivo_ruta, responsable_id, fecha_limite,
       creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [req.params.id, codigo, descripcion, clasificacion, proceso_id || null,
       estandar_ref, evidencia_objetiva, archivo_ruta, responsable_id || null, fecha_limite, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Hallazgo registrado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarHallazgo = async (req, res) => {
  try {
    const { descripcion, clasificacion, estandar_ref, evidencia_objetiva, responsable_id, fecha_limite } = req.body;
    const archivo_ruta = req.file ? req.file.path : undefined;
    const params = [descripcion, clasificacion, estandar_ref, evidencia_objetiva, responsable_id, fecha_limite, req.usuario.id];
    let sql = `UPDATE hallazgos_auditoria SET descripcion=$1, clasificacion=$2, estandar_ref=$3,
               evidencia_objetiva=$4, responsable_id=$5, fecha_limite=$6, actualizado_por=$7`;
    if (archivo_ruta) { params.push(archivo_ruta); sql += `, archivo_ruta=$${params.length}`; }
    params.push(req.params.hId);
    sql += ` WHERE id=$${params.length} RETURNING *`;
    const resultado = await consulta(sql, params);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Hallazgo no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarEstadoHallazgo = async (req, res) => {
  try {
    const { estado } = req.body;
    const resultado = await consulta(
      'UPDATE hallazgos_auditoria SET estado=$1, actualizado_por=$2 WHERE id=$3 RETURNING *',
      [estado, req.usuario.id, req.params.hId]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Hallazgo no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarEstadoAuditoria = async (req, res) => {
  try {
    const { estado } = req.body;
    const resultado = await consulta(
      'UPDATE auditorias SET estado=$1, actualizado_por=$2 WHERE id=$3 RETURNING *',
      [estado, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Auditoría no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const estadisticas = async (req, res) => {
  try {
    const [totales, porEstado, porClasif] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM auditorias'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM auditorias GROUP BY estado'),
      consulta('SELECT clasificacion, COUNT(*) AS cantidad FROM hallazgos_auditoria GROUP BY clasificacion')
    ]);
    res.json({ exito: true, datos: { total: parseInt(totales.rows[0].total), por_estado: porEstado.rows, hallazgos_por_clasificacion: porClasif.rows } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const [auditoria, hallazgos, equipo] = await Promise.all([
      consulta(`SELECT a.*, u.nombres||' '||u.apellidos AS auditor_lider_nombre
                FROM auditorias a LEFT JOIN usuarios u ON u.id=a.auditor_lider_id WHERE a.id=$1`, [req.params.id]),
      consulta('SELECT * FROM hallazgos_auditoria WHERE auditoria_id=$1 ORDER BY clasificacion', [req.params.id]),
      consulta(`SELECT aa.rol_auditoria, u.nombres||' '||u.apellidos AS nombre
                FROM auditores_auditoria aa JOIN usuarios u ON aa.usuario_id=u.id 
                WHERE aa.auditoria_id=$1 ORDER BY aa.rol_auditoria DESC, u.apellidos`, [req.params.id])
    ]);
    if (!auditoria.rows.length) return res.status(404).json({ exito: false, mensaje: 'Auditoría no encontrada' });
    const a = auditoria.rows[0];

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — INFORME DE AUDITORÍA', { x: 20, y: height - 55, size: 10, font: fN, color: rgb(0.8, 0.9, 1) });

    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et + ':', { x: 20, y, size: 9, font: fB, color: AZUL });
      pagina.drawText(String(val || '—'), { x: 150, y, size: 9, font: fN, color: rgb(0, 0, 0) });
      y -= 18;
    };
    fila('CÓDIGO', a.codigo); fila('TÍTULO', a.titulo);
    fila('TIPO', a.tipo_auditoria?.toUpperCase()); fila('ESTADO', a.estado?.toUpperCase());
    fila('AUDITOR LÍDER', a.auditor_lider_nombre);
    fila('F. PLANIFICADA', a.fecha_planificada ? new Date(a.fecha_planificada).toLocaleDateString('es-PE') : '—');
    fila('F. INICIO', a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString('es-PE') : '—');
    fila('F. FIN', a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString('es-PE') : '—');

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('EQUIPO DE AUDITORÍA', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    const rolLabel = (r) => r === 'auditor_lider' ? 'Auditor Líder' : r === 'observador' ? 'Observador' : 'Auditor';
    for (const m of equipo.rows) {
      pagina.drawText(`- ${rolLabel(m.rol_auditoria)}: ${m.nombre}`, {
        x: 28, y, size: 8, font: fN, color: rgb(0, 0, 0)
      });
      y -= 14;
    }

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('HALLAZGOS', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    const colorClasif = (c) => c === 'no_conformidad_mayor' ? rgb(0.8, 0.1, 0.1) :
                               c === 'no_conformidad_menor' ? rgb(0.8, 0.5, 0) :
                               c === 'conforme' ? rgb(0.1, 0.6, 0.1) : rgb(0.4, 0.4, 0.4);

    for (const h of hallazgos.rows) {
      pagina.drawText(`[${h.clasificacion.toUpperCase()}] ${h.codigo}: ${h.descripcion?.substring(0, 60)}`, {
        x: 28, y, size: 8, font: fN, color: colorClasif(h.clasificacion)
      });
      y -= 14;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listarProgramas, obtenerPrograma, crearPrograma, actualizarPrograma,
                   listar, obtener, crear, actualizar, eliminar, cambiarEstadoAuditoria,
                   agregarAuditor, eliminarAuditor, listarAuditores,
                   listarHallazgos, registrarHallazgo, actualizarHallazgo, cambiarEstadoHallazgo,
                   estadisticas, generarPDF };
