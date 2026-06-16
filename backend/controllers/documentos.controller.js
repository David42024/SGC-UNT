const { consulta } = require('../config/db');
const { generarPDFDocumento } = require('../services/documentos.pdf');

const listar = async (req, res) => {
  try {
    const { estado, categoria_id, buscar, pagina = 1, limite = 20 } = req.query;
    const offset = (pagina - 1) * limite;
    const params = [];
    let where = 'WHERE 1=1';

    if (estado)       { params.push(estado);       where += ` AND d.estado = $${params.length}`; }
    if (categoria_id) { params.push(categoria_id); where += ` AND d.categoria_id = $${params.length}`; }
    if (buscar)       { params.push(`%${buscar}%`); where += ` AND (d.titulo ILIKE $${params.length} OR d.codigo ILIKE $${params.length})`; }

    params.push(limite); params.push(offset);

    const sql = `
      SELECT d.*, cd.nombre AS categoria_nombre,
             u1.nombres||' '||u1.apellidos AS responsable_nombre,
             u2.nombres||' '||u2.apellidos AS revisor_nombre,
             u3.nombres||' '||u3.apellidos AS aprobador_nombre,
             COUNT(*) OVER() AS total
      FROM documentos d
      JOIN categorias_documento cd ON cd.id = d.categoria_id
      LEFT JOIN usuarios u1 ON u1.id = d.responsable_id
      LEFT JOIN usuarios u2 ON u2.id = d.revisor_id
      LEFT JOIN usuarios u3 ON u3.id = d.aprobador_id
      ${where}
      ORDER BY d.creado_en DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const resultado = await consulta(sql, params);
    const total = resultado.rows[0]?.total || 0;

    res.json({
      exito: true,
      datos: resultado.rows,
      paginacion: { pagina: parseInt(pagina), limite: parseInt(limite), total: parseInt(total) }
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT d.*, cd.nombre AS categoria_nombre,
              u1.nombres||' '||u1.apellidos AS responsable_nombre,
              u2.nombres||' '||u2.apellidos AS revisor_nombre,
              u3.nombres||' '||u3.apellidos AS aprobador_nombre
       FROM documentos d
       JOIN categorias_documento cd ON cd.id = d.categoria_id
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

const crear = async (req, res) => {
  try {
    const { codigo, titulo, descripcion, categoria_id, responsable_id, revisor_id, aprobador_id,
            fecha_emision, fecha_vencimiento, proceso_id } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;

    const resultado = await consulta(
      `INSERT INTO documentos (codigo, titulo, descripcion, categoria_id, responsable_id,
        revisor_id, aprobador_id, fecha_emision, fecha_vencimiento, proceso_id,
        archivo_ruta, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
       RETURNING *`,
      [codigo, titulo, descripcion, categoria_id, responsable_id, revisor_id, aprobador_id,
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

const actualizar = async (req, res) => {
  try {
    const { titulo, descripcion, categoria_id, responsable_id, revisor_id, aprobador_id,
            fecha_emision, fecha_vencimiento, proceso_id } = req.body;
    const archivo_ruta = req.file ? req.file.path : undefined;

    const campos = [titulo, descripcion, categoria_id, responsable_id, revisor_id, aprobador_id,
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

const cambiarEstado = async (req, res) => {
  try {
    const { accion, comentario } = req.body;
    const FLUJO = {
      borrador: { enviar_revision: 'revision' },
      revision: { aprobar: 'aprobado', rechazar: 'borrador' },
      aprobado: { publicar: 'vigente' },
      vigente:  { obsoleter: 'obsoleto' }
    };

    const doc = await consulta('SELECT estado FROM documentos WHERE id = $1', [req.params.id]);
    if (!doc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });

    const estadoActual = doc.rows[0].estado;
    const nuevoEstado = FLUJO[estadoActual]?.[accion];
    if (!nuevoEstado) return res.status(400).json({ exito: false, mensaje: `Acción '${accion}' no válida en estado '${estadoActual}'` });

    await consulta('UPDATE documentos SET estado=$1, actualizado_por=$2 WHERE id=$3', [nuevoEstado, req.usuario.id, req.params.id]);
    await consulta(
      `INSERT INTO flujo_aprobacion_documento (documento_id, accion, estado_anterior, estado_nuevo, usuario_id, comentario, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$5,$5)`,
      [req.params.id, accion, estadoActual, nuevoEstado, req.usuario.id, comentario]
    );

    res.json({ exito: true, mensaje: `Estado cambiado a '${nuevoEstado}'`, estado_nuevo: nuevoEstado });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const nuevaVersion = async (req, res) => {
  try {
    const { version, descripcion_cambio } = req.body;
    const archivo_ruta = req.file ? req.file.path : null;

    const resultado = await consulta(
      `INSERT INTO versiones_documento (documento_id, version, descripcion_cambio, archivo_ruta, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$5) RETURNING *`,
      [req.params.id, version, descripcion_cambio, archivo_ruta, req.usuario.id]
    );
    await consulta('UPDATE documentos SET version_actual=$1, estado=$2, actualizado_por=$3 WHERE id=$4',
      [version, 'borrador', req.usuario.id, req.params.id]);

    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtenerVersiones = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT v.*, u.nombres||' '||u.apellidos AS creado_por_nombre
       FROM versiones_documento v LEFT JOIN usuarios u ON u.id = v.creado_por
       WHERE v.documento_id = $1 ORDER BY v.creado_en DESC`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const historialFlujo = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT f.*, u.nombres||' '||u.apellidos AS usuario_nombre
       FROM flujo_aprobacion_documento f LEFT JOIN usuarios u ON u.id = f.usuario_id
       WHERE f.documento_id = $1 ORDER BY f.fecha_accion DESC`,
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarCategorias = async (req, res) => {
  try {
    const resultado = await consulta('SELECT * FROM categorias_documento WHERE activo = true ORDER BY nombre');
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const estadisticas = async (req, res) => {
  try {
    const [total, porEstado, porCategoria] = await Promise.all([
      consulta('SELECT COUNT(*) AS total FROM documentos'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM documentos GROUP BY estado'),
      consulta(`SELECT cd.nombre AS categoria, COUNT(*) AS cantidad
                FROM documentos d JOIN categorias_documento cd ON cd.id = d.categoria_id GROUP BY cd.nombre`)
    ]);
    res.json({
      exito: true,
      datos: {
        total: parseInt(total.rows[0].total),
        por_estado: porEstado.rows,
        por_categoria: porCategoria.rows
      }
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    const resultado = await consulta('DELETE FROM documentos WHERE id = $1 RETURNING id', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });
    res.json({ exito: true, mensaje: 'Documento eliminado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT d.*, cd.nombre AS categoria_nombre,
              u1.nombres||' '||u1.apellidos AS responsable_nombre,
              u2.nombres||' '||u2.apellidos AS revisor_nombre
       FROM documentos d
       JOIN categorias_documento cd ON cd.id = d.categoria_id
       LEFT JOIN usuarios u1 ON u1.id = d.responsable_id
       LEFT JOIN usuarios u2 ON u2.id = d.revisor_id
       WHERE d.id = $1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Documento no encontrado' });

    const pdfBytes = await generarPDFDocumento(resultado.rows[0]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="documento-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, nuevaVersion,
                   obtenerVersiones, historialFlujo, listarCategorias, estadisticas, eliminar, generarPDF };
