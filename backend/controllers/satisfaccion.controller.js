const { consulta } = require('../config/db');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const obtenerEstadoDinamico = (encuesta) => {
  if (encuesta.estado === 'suspendido') {
    return 'suspendido';
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const inicio = encuesta.fecha_inicio ? new Date(encuesta.fecha_inicio).toISOString().slice(0, 10) : null;
  const cierre = encuesta.fecha_cierre ? new Date(encuesta.fecha_cierre).toISOString().slice(0, 10) : null;

  if (inicio && hoy < inicio) {
    return 'pendiente';
  }
  if (cierre && hoy > cierre) {
    return 'finalizado';
  }
  return 'en_progreso';
};

const obtenerTextoLocalizado = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.es || val.default || Object.values(val)[0] || '';
  }
  return String(val);
};

const listar = async (req, res) => {
  try {
    const { estado, tipo_publico } = req.query;
    const params = [];
    let where = 'WHERE 1=1';
    if (tipo_publico) { params.push(tipo_publico); where += ` AND e.tipo_publico=$${params.length}`; }

    const resultado = await consulta(
      `SELECT e.*, u.nombres||' '||u.apellidos AS responsable_nombre,
              COUNT(p.id) AS total_preguntas
       FROM encuestas e
       LEFT JOIN usuarios u ON u.id=e.responsable_id
       LEFT JOIN preguntas_encuesta p ON p.encuesta_id=e.id
       ${where} GROUP BY e.id, u.nombres, u.apellidos ORDER BY e.creado_en DESC`, params
    );
    
    let datos = resultado.rows.map(e => ({
      ...e,
      estado: obtenerEstadoDinamico(e)
    }));

    if (estado) {
      datos = datos.filter(e => e.estado === estado);
    }

    res.json({ exito: true, datos });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtener = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT e.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM encuestas e LEFT JOIN usuarios u ON u.id=e.responsable_id WHERE e.id=$1`, [req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    const e = resultado.rows[0];
    res.json({ exito: true, datos: { ...e, estado: obtenerEstadoDinamico(e) } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crear = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_inicio, fecha_cierre, anonima, visibilidad, privacidad, estructura_json } = req.body;
    const tPub = (visibilidad === 'estudiante') ? 'estudiante' : 'todos';
    const respId = req.usuario.id;

    const resultado = await consulta(
      `INSERT INTO encuestas (titulo, descripcion, tipo_publico, fecha_inicio, fecha_cierre,
       anonima, responsable_id, visibilidad, privacidad, estructura_json, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) RETURNING *`,
      [titulo, descripcion, tPub, fecha_inicio || null, fecha_cierre || null,
       anonima !== false, respId, visibilidad || 'publica', privacidad || 'anonima',
       estructura_json ? (typeof estructura_json === 'string' ? estructura_json : JSON.stringify(estructura_json)) : null, req.usuario.id]
    );
    const enc = resultado.rows[0];
    res.status(201).json({ exito: true, datos: { ...enc, estado: obtenerEstadoDinamico(enc) }, mensaje: 'Encuesta creada exitosamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizar = async (req, res) => {
  try {
    const { titulo, descripcion, fecha_inicio, fecha_cierre, anonima, visibilidad, privacidad, estructura_json } = req.body;
    
    const queryOriginal = await consulta('SELECT responsable_id FROM encuestas WHERE id=$1', [req.params.id]);
    if (!queryOriginal.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    const original = queryOriginal.rows[0];
    const respId = original.responsable_id || req.usuario.id;
    const tPub = (visibilidad === 'estudiante') ? 'estudiante' : 'todos';

    const resultado = await consulta(
      `UPDATE encuestas SET titulo=$1, descripcion=$2, tipo_publico=$3, fecha_inicio=$4,
       fecha_cierre=$5, anonima=$6, responsable_id=$7, visibilidad=$8, privacidad=$9,
       estructura_json=$10, actualizado_por=$11
       WHERE id=$12 RETURNING *`,
      [titulo, descripcion, tPub, fecha_inicio || null, fecha_cierre || null,
       anonima !== false, respId, visibilidad || 'publica', privacidad || 'anonima',
       estructura_json ? (typeof estructura_json === 'string' ? estructura_json : JSON.stringify(estructura_json)) : null, req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    const enc = resultado.rows[0];
    res.json({ exito: true, datos: { ...enc, estado: obtenerEstadoDinamico(enc) } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body; // 'suspendido' o 'activo'
    
    if (estado === 'suspendido') {
      const queryEnc = await consulta('SELECT * FROM encuestas WHERE id=$1', [req.params.id]);
      if (!queryEnc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
      const enc = queryEnc.rows[0];
      if (obtenerEstadoDinamico(enc) === 'finalizado') {
        return res.status(400).json({ exito: false, mensaje: 'No se puede suspender una encuesta finalizada' });
      }
    }

    const resultado = await consulta(
      'UPDATE encuestas SET estado=$1, actualizado_por=$2 WHERE id=$3 RETURNING *',
      [estado === 'suspendido' ? 'suspendido' : 'activo', req.usuario.id, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    const enc = resultado.rows[0];
    res.json({ exito: true, datos: { ...enc, estado: obtenerEstadoDinamico(enc) } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminar = async (req, res) => {
  try {
    await consulta('DELETE FROM encuestas WHERE id=$1', [req.params.id]);
    res.json({ exito: true, mensaje: 'Encuesta eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarPreguntas = async (req, res) => {
  try {
    const resultado = await consulta(
      'SELECT * FROM preguntas_encuesta WHERE encuesta_id=$1 ORDER BY orden',
      [req.params.id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const crearPregunta = async (req, res) => {
  try {
    const { orden, texto, tipo_pregunta, obligatoria, opciones, escala_min, escala_max } = req.body;
    const resultado = await consulta(
      `INSERT INTO preguntas_encuesta (encuesta_id, orden, texto, tipo_pregunta, obligatoria, opciones, escala_min, escala_max, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,
      [req.params.id, orden || 1, texto, tipo_pregunta, obligatoria !== false,
       opciones ? JSON.stringify(opciones) : null, escala_min || 1, escala_max || 5, req.usuario.id]
    );
    res.status(201).json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const actualizarPregunta = async (req, res) => {
  try {
    const { orden, texto, tipo_pregunta, obligatoria, opciones, escala_min, escala_max } = req.body;
    const resultado = await consulta(
      `UPDATE preguntas_encuesta SET orden=$1, texto=$2, tipo_pregunta=$3, obligatoria=$4,
       opciones=$5, escala_min=$6, escala_max=$7, actualizado_por=$8 WHERE id=$9 RETURNING *`,
      [orden, texto, tipo_pregunta, obligatoria !== false,
       opciones ? JSON.stringify(opciones) : null, escala_min || 1, escala_max || 5, req.usuario.id, req.params.pregId]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Pregunta no encontrada' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const eliminarPregunta = async (req, res) => {
  try {
    await consulta('DELETE FROM preguntas_encuesta WHERE id=$1', [req.params.pregId]);
    res.json({ exito: true, mensaje: 'Pregunta eliminada' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const responder = async (req, res) => {
  try {
    const { tipo_respondente, respuestas } = req.body;

    const queryEnc = await consulta(
      'SELECT * FROM encuestas WHERE id=$1', [req.params.id]
    );
    if (!queryEnc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });

    const enc = queryEnc.rows[0];
    const estadoCalculado = obtenerEstadoDinamico(enc);
    if (estadoCalculado !== 'en_progreso') {
      return res.status(400).json({ exito: false, mensaje: 'La encuesta no está abierta para recibir respuestas' });
    }

    const respuesta = await consulta(
      `INSERT INTO respuestas_encuesta (encuesta_id, respondente_id, tipo_respondente, ip_origen, completada, creado_por, actualizado_por)
       VALUES ($1,$2,$3,$4,true,$5,$5) RETURNING *`,
      [req.params.id, req.usuario.id, tipo_respondente || req.usuario.rol, req.ip, req.usuario.id]
    );

    for (const r of respuestas) {
      await consulta(
        `INSERT INTO detalle_respuestas (respuesta_id, pregunta_id, valor_numerico, valor_texto, valor_opcion, creado_por, actualizado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$6)`,
        [respuesta.rows[0].id, r.pregunta_id, r.valor_numerico || null, r.valor_texto || null, r.valor_opcion || null, req.usuario.id]
      );
    }

    await consulta('UPDATE encuestas SET total_respuestas = total_respuestas + 1 WHERE id=$1', [enc.id]);
    res.status(201).json({ exito: true, mensaje: 'Respuesta registrada exitosamente', token: respuesta.rows[0].token_respuesta });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarRespuestas = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT re.*, u.nombres||' '||u.apellidos AS respondente_nombre
       FROM respuestas_encuesta re LEFT JOIN usuarios u ON u.id=re.respondente_id
       WHERE re.encuesta_id=$1 ORDER BY re.fecha_respuesta DESC`, [req.params.id]
    );

    const respuestas = resultado.rows;
    const tieneLegacy = respuestas.some(r => !r.respuestas_json);

    if (tieneLegacy && respuestas.length > 0) {
      const detalles = await consulta(
        `SELECT dr.*, p.tipo_pregunta 
         FROM detalle_respuestas dr
         JOIN respuestas_encuesta re ON re.id = dr.respuesta_id
         JOIN preguntas_encuesta p ON p.id = dr.pregunta_id
         WHERE re.encuesta_id = $1`, [req.params.id]
      );

      const detallesPorRespuesta = {};
      detalles.rows.forEach(d => {
        if (!detallesPorRespuesta[d.respuesta_id]) {
          detallesPorRespuesta[d.respuesta_id] = {};
        }
        let valor = null;
        if (d.valor_numerico !== null) {
          valor = Number(d.valor_numerico);
        } else if (d.valor_opcion !== null) {
          valor = d.valor_opcion;
        } else if (d.valor_texto !== null) {
          valor = d.valor_texto;
        }
        detallesPorRespuesta[d.respuesta_id][d.pregunta_id] = valor;
      });

      respuestas.forEach(r => {
        if (!r.respuestas_json) {
          r.respuestas_json = detallesPorRespuesta[r.id] || {};
        }
      });
    }

    res.json({ exito: true, datos: respuestas });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const resultados = async (req, res) => {
  try {
    const queryEnc = await consulta('SELECT * FROM encuestas WHERE id=$1', [req.params.id]);
    if (!queryEnc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    const enc = queryEnc.rows[0];

    // Si es una encuesta basada en SurveyJS
    if (enc.estructura_json) {
      let schema = {};
      try {
        schema = typeof enc.estructura_json === 'string' ? JSON.parse(enc.estructura_json) : enc.estructura_json;
      } catch (err) {
        schema = {};
      }

      const questions = [];
      if (schema && Array.isArray(schema.pages)) {
        schema.pages.forEach(page => {
          if (Array.isArray(page.elements)) {
            page.elements.forEach(el => {
              questions.push(el);
            });
          }
        });
      }

      const respuestasQuery = await consulta(
        'SELECT respuestas_json FROM respuestas_encuesta WHERE encuesta_id = $1 AND completada = true',
        [req.params.id]
      );
      const respuestasList = respuestasQuery.rows.map(r => r.respuestas_json).filter(Boolean);

      const resultadosPorPregunta = questions.map((q, idx) => {
        const valores = respuestasList.map(r => r[q.name]).filter(v => v !== undefined && v !== null);

        let media = null;
        let moda = null;
        let conteoOpciones = {};
        let respuestasTexto = [];

        if (q.type === 'rating') {
          const nums = valores.map(v => parseFloat(v)).filter(n => !isNaN(n));
          if (nums.length) {
            media = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
            moda = calcularModa(nums);
          }
        } else if (q.type === 'comment' || q.type === 'text') {
          respuestasTexto = valores.map(v => String(v).trim()).filter(Boolean);
        } else if (['radiogroup', 'dropdown', 'checkbox', 'boolean'].includes(q.type)) {
          valores.forEach(v => {
            if (Array.isArray(v)) {
              v.forEach(item => {
                const key = String(item);
                conteoOpciones[key] = (conteoOpciones[key] || 0) + 1;
              });
            } else {
              const key = String(v);
              conteoOpciones[key] = (conteoOpciones[key] || 0) + 1;
            }
          });
        } else if (q.type === 'file') {
          respuestasTexto = valores.map(v => {
            if (Array.isArray(v)) {
              return v.map(f => `Archivo: ${f.name} (${f.type || 'tipo desconocido'})`).join(', ');
            } else if (v && typeof v === 'object') {
              return `Archivo: ${v.name} (${v.type || 'tipo desconocido'})`;
            }
            try {
              const parsed = typeof v === 'string' ? JSON.parse(v) : v;
              if (Array.isArray(parsed)) {
                return parsed.map(f => `Archivo: ${f.name} (${f.type || 'tipo desconocido'})`).join(', ');
              }
            } catch (e) {}
            return String(v);
          }).filter(Boolean);
        } else {
          // Tipos no estructurados: los guardamos como texto
          respuestasTexto = valores.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v).trim()).filter(Boolean);
        }

        const tipoPregunta = q.type === 'rating' ? 'likert' :
                             (q.type === 'comment' || q.type === 'text') ? 'texto_abierto' :
                             (['radiogroup', 'dropdown', 'checkbox', 'boolean'].includes(q.type)) ? 'opcion_multiple' : 'texto_abierto';

        return {
          pregunta: {
            id: idx + 1,
            orden: idx + 1,
            texto: obtenerTextoLocalizado(q.title || q.name),
            tipo_pregunta: tipoPregunta,
            escala_min: 1,
            escala_max: q.rateMax || 5
          },
          total_respuestas: valores.length,
          media,
          moda,
          nps: null,
          conteo_opciones: conteoOpciones,
          respuestas_texto: respuestasTexto
        };
      });

      return res.json({ exito: true, datos: resultadosPorPregunta });
    }

    // Código legacy para encuestas de preguntas individuales de base de datos
    const preguntas = await consulta(
      'SELECT * FROM preguntas_encuesta WHERE encuesta_id=$1 ORDER BY orden', [req.params.id]
    );

    const resultadosPorPregunta = await Promise.all(
      preguntas.rows.map(async (p) => {
        const detalles = await consulta(
          `SELECT dr.* FROM detalle_respuestas dr
           JOIN respuestas_encuesta re ON re.id=dr.respuesta_id
           WHERE dr.pregunta_id=$1 AND re.encuesta_id=$2 AND re.completada=true`,
          [p.id, req.params.id]
        );

        const valores = detalles.rows.map(d => d.valor_numerico).filter(v => v !== null);
        const media = valores.length ? (valores.reduce((a, b) => a + parseFloat(b), 0) / valores.length).toFixed(2) : null;
        const moda = valores.length ? calcularModa(valores) : null;

        // NPS para preguntas tipo nps
        let nps = null;
        if (p.tipo_pregunta === 'nps' && valores.length) {
          const promotores = valores.filter(v => v >= 9).length;
          const detractores = valores.filter(v => v <= 6).length;
          nps = Math.round(((promotores - detractores) / valores.length) * 100);
        }

        // Conteo opciones para opcion_multiple
        const conteoOpciones = {};
        if (p.tipo_pregunta === 'opcion_multiple') {
          detalles.rows.forEach(d => {
            if (d.valor_opcion) conteoOpciones[d.valor_opcion] = (conteoOpciones[d.valor_opcion] || 0) + 1;
          });
        }

        return {
          pregunta: p,
          total_respuestas: detalles.rows.length,
          media,
          moda,
          nps,
          conteo_opciones: conteoOpciones,
          respuestas_texto: p.tipo_pregunta === 'texto_abierto' ? detalles.rows.map(d => d.valor_texto).filter(Boolean) : []
        };
      })
    );

    res.json({ exito: true, datos: resultadosPorPregunta });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const calcularModa = (arr) => {
  const freq = {};
  arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return parseFloat(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
};

const estadisticas = async (req, res) => {
  try {
    const [total, porEstado, porPublico] = await Promise.all([
      consulta('SELECT COUNT(*) AS total, SUM(total_respuestas) AS total_respuestas FROM encuestas'),
      consulta('SELECT estado, COUNT(*) AS cantidad FROM encuestas GROUP BY estado'),
      consulta('SELECT tipo_publico, COUNT(*) AS cantidad FROM encuestas GROUP BY tipo_publico')
    ]);
    res.json({ exito: true, datos: { total: parseInt(total.rows[0].total), total_respuestas: parseInt(total.rows[0].total_respuestas || 0), por_estado: porEstado.rows, por_publico: porPublico.rows } });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const generarPDF = async (req, res) => {
  try {
    const queryEnc = await consulta(
      `SELECT e.*, u.nombres||' '||u.apellidos AS responsable_nombre
       FROM encuestas e LEFT JOIN usuarios u ON u.id=e.responsable_id WHERE e.id=$1`,
      [req.params.id]
    );
    if (!queryEnc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    const enc = queryEnc.rows[0];

    let estadsPorPregunta = [];

    if (enc.estructura_json) {
      let schema = {};
      try {
        schema = typeof enc.estructura_json === 'string' ? JSON.parse(enc.estructura_json) : enc.estructura_json;
      } catch (err) {
        schema = {};
      }

      const questions = [];
      if (schema && Array.isArray(schema.pages)) {
        schema.pages.forEach(page => {
          if (Array.isArray(page.elements)) {
            page.elements.forEach(el => {
              questions.push(el);
            });
          }
        });
      }

      const respuestasQuery = await consulta(
        'SELECT respuestas_json FROM respuestas_encuesta WHERE encuesta_id = $1 AND completada = true',
        [req.params.id]
      );
      const respuestasList = respuestasQuery.rows.map(r => r.respuestas_json).filter(Boolean);

      estadsPorPregunta = questions.map((q, idx) => {
        const valores = respuestasList.map(r => r[q.name]).filter(v => v !== undefined && v !== null);
        let media = '—';
        if (q.type === 'rating') {
          const nums = valores.map(v => parseFloat(v)).filter(n => !isNaN(n));
          if (nums.length) {
            media = (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
          }
        }
        return {
          orden: idx + 1,
          texto: obtenerTextoLocalizado(q.title || q.name),
          tipo_pregunta: q.type,
          media,
          total_resp: valores.length
        };
      });
    } else {
      const preguntas = await consulta('SELECT * FROM preguntas_encuesta WHERE encuesta_id=$1 ORDER BY orden', [req.params.id]);
      estadsPorPregunta = await Promise.all(preguntas.rows.map(async (p) => {
        const vals = await consulta(
          `SELECT dr.valor_numerico FROM detalle_respuestas dr
           JOIN respuestas_encuesta re ON re.id=dr.respuesta_id
           WHERE dr.pregunta_id=$1 AND re.encuesta_id=$2 AND dr.valor_numerico IS NOT NULL`,
          [p.id, req.params.id]
        );
        const nums = vals.rows.map(r => parseFloat(r.valor_numerico)).filter(n => !isNaN(n));
        const media = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : '—';
        return { ...p, media, total_resp: nums.length };
      }));
    }

    const pdfDoc = await PDFDocument.create();
    const pagina = pdfDoc.addPage([595, 842]);
    const { width, height } = pagina.getSize();
    const fN = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const AZUL = rgb(0.02, 0.35, 0.65);
    const BLANCO = rgb(1, 1, 1);

    pagina.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: AZUL });
    pagina.drawText('UNIVERSIDAD NACIONAL DE TRUJILLO', { x: 20, y: height - 35, size: 14, font: fB, color: BLANCO });
    pagina.drawText('SGC-UNT — RESULTADOS DE ENCUESTA DE SATISFACCIÓN', { x: 20, y: height - 55, size: 9, font: fN, color: rgb(0.8, 0.9, 1) });

    let y = height - 105;
    const fila = (et, val) => {
      pagina.drawText(et + ':', { x: 20, y, size: 9, font: fB, color: AZUL });
      pagina.drawText(String(val || '—'), { x: 150, y, size: 9, font: fN, color: rgb(0,0,0) });
      y -= 18;
    };
    fila('ENCUESTA', enc.titulo); fila('PÚBLICO', enc.tipo_publico?.toUpperCase());
    fila('ESTADO', enc.estado?.toUpperCase());
    fila('TOTAL RESPUESTAS', enc.total_respuestas);
    fila('RESPONSABLE', enc.responsable_nombre);

    y -= 10;
    pagina.drawRectangle({ x: 20, y: y - 5, width: width - 40, height: 20, color: AZUL });
    pagina.drawText('RESULTADOS POR PREGUNTA', { x: 28, y: y + 2, size: 10, font: fB, color: BLANCO });
    y -= 25;

    for (const p of estadsPorPregunta) {
      pagina.drawText(`${p.orden}. ${p.texto?.substring(0, 65)}`, { x: 28, y, size: 8, font: fB, color: rgb(0.1,0.1,0.4) });
      y -= 12;
      pagina.drawText(`   Tipo: ${p.tipo_pregunta} | Respuestas: ${p.total_resp} | Promedio: ${p.media}`, { x: 28, y, size: 8, font: fN, color: rgb(0.3,0.3,0.3) });
      y -= 16;
      if (y < 60) break;
    }

    pagina.drawLine({ start: { x: 20, y: 50 }, end: { x: width - 20, y: 50 }, thickness: 1, color: AZUL });
    pagina.drawText(`Generado: ${new Date().toLocaleString('es-PE')}`, { x: 20, y: 35, size: 8, font: fN, color: rgb(0.5,0.5,0.5) });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="encuesta-${req.params.id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const cambiarFechas = async (req, res) => {
  try {
    const { fecha_inicio_nueva, fecha_cierre_nueva, motivo } = req.body;
    if (!motivo) return res.status(400).json({ exito: false, mensaje: 'Debe ingresar un motivo para el cambio de fechas' });

    const queryEnc = await consulta('SELECT * FROM encuestas WHERE id=$1', [req.params.id]);
    if (!queryEnc.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    
    const enc = queryEnc.rows[0];
    
    // Convertir de forma segura a strings tipo YYYY-MM-DD
    const formatDate = (d) => {
      if (!d) return null;
      try {
        return new Date(d).toISOString().slice(0, 10);
      } catch {
        return null;
      }
    };
    
    const fecha_inicio_anterior = formatDate(enc.fecha_inicio);
    const fecha_cierre_anterior = formatDate(enc.fecha_cierre);

    let tipo_ajuste = 'ampliacion';
    if (fecha_cierre_anterior && fecha_cierre_nueva) {
      if (new Date(fecha_cierre_nueva) < new Date(fecha_cierre_anterior)) {
        tipo_ajuste = 'reduccion';
      }
    }

    const { HistorialFechasEncuesta } = require('../models');
    
    await HistorialFechasEncuesta.create({
      encuesta_id: enc.id,
      usuario_id: req.usuario.id,
      fecha_inicio_anterior,
      fecha_cierre_anterior,
      fecha_inicio_nueva: fecha_inicio_nueva || null,
      fecha_cierre_nueva: fecha_cierre_nueva || null,
      tipo_ajuste,
      motivo
    });

    const resultado = await consulta(
      `UPDATE encuestas SET fecha_inicio=$1, fecha_cierre=$2, actualizado_por=$3 WHERE id=$4 RETURNING *`,
      [fecha_inicio_nueva || null, fecha_cierre_nueva || null, req.usuario.id, enc.id]
    );

    const updated = resultado.rows[0];
    res.json({ 
      exito: true, 
      datos: { ...updated, estado: obtenerEstadoDinamico(updated) }, 
      mensaje: `Fechas actualizadas exitosamente (${tipo_ajuste === 'ampliacion' ? 'Ampliación' : 'Reducción'})` 
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const listarPublicas = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT id, uuid, titulo, descripcion, tipo_publico, estado, fecha_inicio, fecha_cierre, anonima, visibilidad, privacidad
       FROM encuestas
       WHERE visibilidad IN ('publica', 'estudiante') AND estado != 'suspendido'
       ORDER BY creado_en DESC`
    );

    const activas = resultado.rows.map(e => ({
      ...e,
      estado: obtenerEstadoDinamico(e)
    })).filter(e => e.estado === 'en_progreso');

    res.json({ exito: true, datos: activas });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const obtenerPublicaPorUuid = async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT id, uuid, titulo, descripcion, tipo_publico, estado, fecha_inicio, fecha_cierre, anonima, visibilidad, privacidad, estructura_json
       FROM encuestas WHERE uuid=$1`,
      [req.params.uuid]
    );
    if (!resultado.rows.length) {
      return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada o no disponible' });
    }

    const enc = resultado.rows[0];
    const estadoCalculado = obtenerEstadoDinamico(enc);

    if (enc.visibilidad === 'privada') {
      return res.status(403).json({ exito: false, mensaje: 'Esta encuesta es privada y requiere inicio de sesión' });
    }
    
    if (estadoCalculado === 'suspendido') {
      return res.status(403).json({ exito: false, mensaje: 'Esta encuesta ha sido suspendida temporalmente' });
    }
    if (estadoCalculado === 'pendiente') {
      return res.status(403).json({ exito: false, mensaje: 'Esta encuesta aún no ha iniciado' });
    }
    if (estadoCalculado === 'finalizado') {
      return res.status(403).json({ exito: false, mensaje: 'Esta encuesta ya ha finalizado' });
    }

    res.json({ exito: true, datos: enc });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

const responderPublica = async (req, res) => {
  try {
    const { codigo_estudiante, respuestas } = req.body;

    const resultado = await consulta(
      `SELECT * FROM encuestas WHERE uuid=$1`, [req.params.uuid]
    );
    if (!resultado.rows.length) {
      return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    }

    const enc = resultado.rows[0];
    const estadoCalculado = obtenerEstadoDinamico(enc);

    if (estadoCalculado !== 'en_progreso') {
      return res.status(400).json({ exito: false, mensaje: 'La encuesta no está abierta para recibir respuestas' });
    }

    if (enc.visibilidad === 'estudiante') {
      if (!codigo_estudiante || !/^\d{10}$/.test(codigo_estudiante)) {
        return res.status(400).json({ exito: false, mensaje: 'Debe proporcionar un código de estudiante válido de 10 dígitos' });
      }
    }

    const codEst = (enc.privacidad === 'no_anonima' && enc.visibilidad === 'estudiante') ? codigo_estudiante : null;

    const { RespuestaEncuesta } = require('../models');

    const respuesta = await RespuestaEncuesta.create({
      encuesta_id: enc.id,
      tipo_respondente: enc.visibilidad === 'estudiante' ? 'estudiante' : 'publico',
      completada: true,
      respuestas_json: respuestas,
      codigo_estudiante: codEst
    });

    await consulta('UPDATE encuestas SET total_respuestas = total_respuestas + 1 WHERE id=$1', [enc.id]);

    res.status(201).json({ 
      exito: true, 
      mensaje: 'Respuestas registradas exitosamente', 
      token: respuesta.token_respuesta 
    });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
};

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar,
                   listarPreguntas, crearPregunta, actualizarPregunta, eliminarPregunta,
                   responder, listarRespuestas, resultados, estadisticas, generarPDF,
                   cambiarFechas, listarPublicas, obtenerPublicaPorUuid, responderPublica };
