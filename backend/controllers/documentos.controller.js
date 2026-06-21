const { consulta } = require('../config/db');
const { generarPDFDocumento } = require('../services/documentos.pdf');

// ============================================================
// LISTAR DOCUMENTOS CON FILTROS Y PAGINACIÓN
// ============================================================
const listar = async (req, res) => {
  try {
    const { estado, categoria_id, proceso_id, buscar, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    const params = [];
    let where = 'WHERE 1=1';

    if (estado)       { params.push(estado);       where += ` AND d.estado = $${params.length}`; }
    if (categoria_id) { params.push(categoria_id); where += ` AND d.categoria_id = $${params.length}`; }
    if (proceso_id)   { params.push(proceso_id);   where += ` AND d.proceso_id = $${params.length}`; }
    if (buscar)       { params.push(`%${buscar}%`); where += ` AND (d.titulo ILIKE $${params.length} OR d.codigo ILIKE $${params.length})`; }

    params.push(limite); params.push(offset);

    const sql = `
      SELECT d.*, cd.nombre AS categoria_nombre,
             p.nombre AS proceso_nombre,
             u1.nombres||' '||u1.apellidos AS responsable_nombre,
             u2.nombres||' '||u2.apellidos AS revisor_nombre,
             u3.nombres||' '||u3.apellidos AS aprobador_nombre,
             COUNT(*) OVER() AS total
      FROM documentos d
      JOIN categorias_documento cd ON cd.id = d.categoria_id
      LEFT JOIN procesos p ON p.id = d.proceso_id
      LEFT JOIN usuarios u1 ON u1.id = d.responsable_id
      LEFT JOIN usuarios u2 ON u2.id = d.revisor_id
      LEFT JOIN usuarios u3 ON u3.id = d.aprobador_id
      ${where}
      ORDER BY d.creado_en DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    // 👇 AGREGA ESTO PARA VER LA CONSULTA
    console.log('SQL:', sql);
    console.log('Params:', params);

    const resultado = await consulta(sql, params);
    const total = resultado.rows[0]?.total || 0;

    res.json({
      exito: true,
      datos: resultado.rows,
      paginacion: { pagina: parseInt(pagina), limite: parseInt(limite), total: parseInt(total) }
    });
  } catch (error) {
    // 👇 AGREGA ESTO PARA VER EL ERROR REAL
    console.error('Error en listar:', error);
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// OBTENER DOCUMENTO POR ID
// ============================================================
const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT d.*, cd.nombre AS categoria_nombre,
              p.nombre AS proceso_nombre,
              u1.nombres||' '||u1.apellidos AS responsable_nombre,
              u2.nombres||' '||u2.apellidos AS revisor_nombre,
              u3.nombres||' '||u3.apellidos AS aprobador_nombre
       FROM documentos d
       JOIN categorias_documento cd ON cd.id = d.categoria_id
       LEFT JOIN procesos p ON p.id = d.proceso_id
       LEFT JOIN usuarios u1 ON u1.id = d.responsable_id
       LEFT JOIN usuarios u2 ON u2.id = d.revisor_id
       LEFT JOIN usuarios u3 ON u3.id = d.aprobador_id
       WHERE d.id = $1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// CREAR DOCUMENTO CON VALIDACIONES
// ============================================================
const crear = async (req, res) => {
  try {
    const { codigo, titulo, descripcion, categoria_id, responsable_id, revisor_id, aprobador_id,
            fecha_emision, fecha_vencimiento, proceso_id } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;

    // ==========================================
    // VALIDACIONES
    // ==========================================
    const errores = [];

    // 1. Campos obligatorios
    if (!codigo) errores.push('El código es obligatorio');
    if (!titulo) errores.push('El título es obligatorio');
    if (!categoria_id) errores.push('La categoría es obligatoria');
    if (!responsable_id) errores.push('El responsable es obligatorio');

    // 2. Formato del código (ej: POL-001)
    if (codigo && !/^[A-Z]{3}-\d{3}$/.test(codigo)) {
      errores.push('El código debe tener formato: AAA-001 (ej: POL-001)');
    }

    // 3. Validar que la categoría exista
    if (categoria_id) {
      const cat = await consulta('SELECT id FROM categorias_documento WHERE id = $1 AND activo = true', [categoria_id]);
      if (!cat.rows.length) errores.push('La categoría seleccionada no existe');
    }

    // 4. Validar que el responsable exista y esté activo
    if (responsable_id) {
      const usr = await consulta('SELECT id FROM usuarios WHERE id = $1 AND activo = true', [responsable_id]);
      if (!usr.rows.length) errores.push('El responsable seleccionado no existe o está inactivo');
    }

    // 5. Validar que el revisor exista (si se seleccionó)
    if (revisor_id) {
      const usr = await consulta('SELECT id FROM usuarios WHERE id = $1 AND activo = true', [revisor_id]);
      if (!usr.rows.length) errores.push('El revisor seleccionado no existe o está inactivo');
    }

    // 6. Validar que el aprobador exista (si se seleccionó)
    if (aprobador_id) {
      const usr = await consulta('SELECT id FROM usuarios WHERE id = $1 AND activo = true', [aprobador_id]);
      if (!usr.rows.length) errores.push('El aprobador seleccionado no existe o está inactivo');
    }

    // 7. Validar que el proceso exista (si se seleccionó)
    if (proceso_id) {
      const proc = await consulta('SELECT id FROM procesos WHERE id = $1 AND activo = true', [proceso_id]);
      if (!proc.rows.length) errores.push('El proceso seleccionado no existe');
    }

    // 8. Fechas: fecha_vencimiento debe ser posterior a fecha_emision
    if (fecha_emision && fecha_vencimiento && new Date(fecha_vencimiento) < new Date(fecha_emision)) {
      errores.push('La fecha de vencimiento debe ser posterior a la fecha de emisión');
    }

    if (errores.length > 0) {
      return res.status(400).json({ exito: false, mensaje: 'Errores de validación', errores });
    }
    // ==========================================

    // ==========================================
    // NORMALIZAR A MAYÚSCULAS (formato estándar)
    // ==========================================
    const codigoMay = codigo.toUpperCase();
    const tituloMay = titulo.toUpperCase();
    const descripcionMay = descripcion ? descripcion.toUpperCase() : descripcion;
    // ==========================================

    const resultado = await consulta(
      `INSERT INTO documentos (codigo, titulo, descripcion, categoria_id, responsable_id,
        revisor_id, aprobador_id, fecha_emision, fecha_vencimiento, proceso_id,
        archivo_ruta, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
       RETURNING *`,
      [codigoMay, tituloMay, descripcionMay, categoria_id, responsable_id, revisor_id, aprobador_id,
       fecha_emision, fecha_vencimiento, proceso_id, archivo_ruta, req.usuario.id]
    );

    // Registrar en historial
    await consulta(
      `INSERT INTO flujo_aprobacion_documento (documento_id, accion, estado_anterior, estado_nuevo, usuario_id, comentario, creado_por, actualizado_por)
       VALUES ($1,'enviar_revision',null,'borrador',$2,'Documento creado',$2,$2)`,
      [resultado.rows[0].id, req.usuario.id]
    );

    // Crear versión inicial
    await consulta(
      `INSERT INTO versiones_documento (documento_id, version, descripcion_cambio, archivo_ruta, estado, creado_por, actualizado_por)
       VALUES ($1,'1.0','Versión inicial',$2,'borrador',$3,$3)`,
      [resultado.rows[0].id, archivo_ruta, req.usuario.id]
    );

    res.status(201).json({ exito: true, datos: resultado.rows[0], mensaje: 'Documento creado exitosamente' });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ exito: false, mensaje: 'El código del documento ya existe' });
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// ACTUALIZAR DOCUMENTO
// ============================================================
const actualizar = async (req, res) => {
  try {
    const { titulo, descripcion, categoria_id, responsable_id, revisor_id, aprobador_id,
            fecha_emision, fecha_vencimiento, proceso_id } = req.body;
    const archivo_ruta = req.file ? req.file.path : undefined;

    // ==========================================
    // NORMALIZAR A MAYÚSCULAS (formato estándar)
    // ==========================================
    const tituloMay = titulo.toUpperCase();
    const descripcionMay = descripcion ? descripcion.toUpperCase() : descripcion;
    // ==========================================

    const campos = [tituloMay, descripcionMay, categoria_id, responsable_id, revisor_id, aprobador_id,
                    fecha_emision, fecha_vencimiento, proceso_id, req.usuario.id, req.params.id];
    let sql = `UPDATE documentos SET titulo=$1, descripcion=$2, categoria_id=$3, responsable_id=$4,
               revisor_id=$5, aprobador_id=$6, fecha_emision=$7, fecha_vencimiento=$8,
               proceso_id=$9, actualizado_por=$10`;
    if (archivo_ruta) { campos.splice(10, 0, archivo_ruta); sql += `, archivo_ruta=$11`; }
    sql += ` WHERE id=$${campos.length} RETURNING *`;

    const resultado = await consulta(sql, campos);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });
    res.json({ exito: true, datos: resultado.rows[0], mensaje: 'Documento actualizado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// CAMBIAR ESTADO CON FLUJO COMPLETO Y PERMISOS
// ============================================================
const cambiarEstado = async (req, res) => {
  try {
    const { accion, comentario } = req.body;

    // ==========================================
    // CONTROL DE ACCESO POR ROLES
    // ==========================================
    const rolesPermitidos = ['admin', 'gestor_calidad', 'auditor'];
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        exito: false,
        mensaje: 'No tienes permisos para cambiar el estado de un documento'
      });
    }

    // Solo admin y gestor_calidad pueden aprobar y publicar
    if ((accion === 'aprobar' || accion === 'publicar') && !['admin', 'gestor_calidad'].includes(req.usuario.rol)) {
      return res.status(403).json({
        exito: false,
        mensaje: 'Solo administradores y gestores de calidad pueden aprobar o publicar documentos'
      });
    }

    // Comentario obligatorio al rechazar u observar
    if ((accion === 'rechazar' || accion === 'observar') && !comentario) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Debes proporcionar un comentario para ' + (accion === 'rechazar' ? 'rechazar' : 'observar') + ' el documento'
      });
    }
    // ==========================================

    // ==========================================
    // FLUJO DE APROBACIÓN CON "OBSERVAR"
    // ==========================================
    const FLUJO = {
      borrador: { 
        enviar_revision: 'revision' 
      },
      revision: { 
        aprobar: 'aprobado', 
        rechazar: 'borrador',
        observar: 'revision'   // Vuelve a revisión con observaciones
      },
      aprobado: { 
        publicar: 'vigente' 
      },
      vigente: { 
        obsoleter: 'obsoleto' 
      }
    };
    // ==========================================

    const doc = await consulta('SELECT estado FROM documentos WHERE id = $1', [req.params.id]);
    if (!doc.rows.length) {
      return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });
    }

    const estadoActual = doc.rows[0].estado;
    const nuevoEstado = FLUJO[estadoActual]?.[accion];
    
    if (!nuevoEstado) {
      return res.status(400).json({ 
        exito: false, 
        mensaje: `Acción '${accion}' no válida en estado '${estadoActual}'` 
      });
    }

    await consulta(
      'UPDATE documentos SET estado=$1, actualizado_por=$2 WHERE id=$3', 
      [nuevoEstado, req.usuario.id, req.params.id]
    );

    await consulta(
      `INSERT INTO flujo_aprobacion_documento 
       (documento_id, accion, estado_anterior, estado_nuevo, usuario_id, comentario, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$5,$5)`,
      [req.params.id, accion, estadoActual, nuevoEstado, req.usuario.id, comentario]
    );

    res.json({ 
      exito: true, 
      mensaje: `Estado cambiado a '${nuevoEstado}'`, 
      estado_nuevo: nuevoEstado 
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// NUEVA VERSIÓN
// ============================================================
const nuevaVersion = async (req, res) => {
  try {
    const { version, descripcion_cambio } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;

    const resultado = await consulta(
      `INSERT INTO versiones_documento (documento_id, version, descripcion_cambio, archivo_ruta, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
      [req.params.id, version, descripcion_cambio, archivo_ruta, req.usuario.id]
    );

    await consulta(
      'UPDATE documentos SET version_actual=$1, estado=$2, actualizado_por=$3 WHERE id=$4',
      [version, 'borrador', req.usuario.id, req.params.id]
    );

    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// OBTENER VERSIONES DE UN DOCUMENTO
// ============================================================
const obtenerVersiones = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT v.*, u.nombres||' '||u.apellidos AS creado_por_nombre
       FROM versiones_documento v 
       LEFT JOIN usuarios u ON u.id = v.creado_por
       WHERE v.documento_id = $1 
       ORDER BY v.creado_en DESC`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// HISTORIAL DE FLUJO DE APROBACIÓN
// ============================================================
const historialFlujo = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT f.*, u.nombres||' '||u.apellidos AS usuario_nombre
       FROM flujo_aprobacion_documento f 
       LEFT JOIN usuarios u ON u.id = f.usuario_id
       WHERE f.documento_id = $1 
       ORDER BY f.fecha_accion DESC`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// LISTAR CATEGORÍAS
// ============================================================
const listarCategorias = async (req, res) => {
  try {
    const resultado = await consulta(
      'SELECT * FROM categorias_documento WHERE activo = true ORDER BY nombre'
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// ESTADÍSTICAS COMPLETAS (con proceso)
// ============================================================
const estadisticas = async (req, res) => {
  try {
    const [total, porEstado, porCategoria, porProceso, ultimos] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM documentos'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM documentos GROUP BY estado'),
      consulta(`SELECT cd.nombre AS categoria, COUNT(*) AS cantidad
                FROM documentos d 
                JOIN categorias_documento cd ON cd.id = d.categoria_id 
                GROUP BY cd.nombre`),
      consulta(`SELECT p.nombre AS proceso, COUNT(*) AS cantidad
                FROM documentos d 
                LEFT JOIN procesos p ON p.id = d.proceso_id
                GROUP BY p.nombre 
                ORDER BY cantidad DESC`),
      // FIX: se agrega la consulta de "últimos documentos" que el Dashboard
      // espera en stats.docs.ultimos y que antes no existía en la respuesta.
      // Se alias "titulo AS nombre" porque el Dashboard lee doc.nombre.
      consulta(`SELECT d.id, d.codigo, d.titulo AS nombre, d.estado, d.creado_en
                FROM documentos d
                ORDER BY d.creado_en DESC
                LIMIT 5`)
    ]);

    // FIX: PostgreSQL devuelve COUNT(*) como string (ej. "3"), no como number.
    // Recharts necesita un número real en dataKey="cantidad" para graduar
    // correctamente cada porción del PieChart; con un string el gráfico
    // se renderiza roto (arcos sin proporción, como en el bug reportado).
    // Se convierte explícitamente con parseInt en los tres listados.
    const porEstadoNum = porEstado.rows.map(r => ({
      ...r,
      cantidad: parseInt(r.cantidad, 10)
    }));
    const porCategoriaNum = porCategoria.rows.map(r => ({
      ...r,
      cantidad: parseInt(r.cantidad, 10)
    }));
    const porProcesoNum = porProceso.rows.map(r => ({
      ...r,
      cantidad: parseInt(r.cantidad, 10)
    }));

    res.json({
      exito: true,
      datos: {
        total: parseInt(total.rows[0].total, 10),
        por_estado: porEstadoNum,
        por_categoria: porCategoriaNum,
        por_proceso: porProcesoNum,
        ultimos: ultimos.rows
      }
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// ELIMINAR DOCUMENTO
// ============================================================
const eliminar = async (req, res) => {
  try {
    const resultado = await consulta(
      'DELETE FROM documentos WHERE id = $1 RETURNING id', 
      [req.params.id]
    );
    if (!resultado.rows.length) {
      return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });
    }
    res.json({ exito: true, mensaje: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

// ============================================================
// GENERAR PDF
// ============================================================
const generarPDF = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT d.*, cd.nombre AS categoria_nombre,
              p.nombre AS proceso_nombre,
              u1.nombres||' '||u1.apellidos AS responsable_nombre,
              u2.nombres||' '||u2.apellidos AS revisor_nombre
       FROM documentos d
       JOIN categorias_documento cd ON cd.id = d.categoria_id
       LEFT JOIN procesos p ON p.id = d.proceso_id
       LEFT JOIN usuarios u1 ON u1.id = d.responsable_id
       LEFT JOIN usuarios u2 ON u2.id = d.revisor_id
       WHERE d.id = $1`, 
      [req.params.id]
    );
    
    if (!resultado.rows.length) {
      return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });
    }

    const pdfBytes = await generarPDFDocumento(resultado.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="documento-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { 
  listar, 
  obtener, 
  crear, 
  actualizar, 
  cambiarEstado, 
  nuevaVersion,
  obtenerVersiones, 
  historialFlujo, 
  listarCategorias, 
  estadisticas, 
  eliminar, 
  generarPDF 
};