const router = require('express').Router();
const ctrl = require('../controllers/satisfaccion.controller');
const { verificarToken, tienePermiso, cargarPermisosUsuario } = require('../middleware/auth.middleware');
const { consulta } = require('../config/db');

// Rutas públicas para encuestas (sin autenticación) - deben ir antes del middleware
router.get('/publica/:uuid', async (req, res) => {
  try {
    const resultado = await consulta(
      `SELECT id, uuid, titulo, descripcion, tipo_publico, estado, fecha_inicio, fecha_cierre, anonima
       FROM encuestas WHERE uuid=$1 AND estado='publicada'`,
      [req.params.uuid]
    );
    if (!resultado.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada o no disponible' });
    res.json({ exito: true, datos: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.get('/publica/:uuid/preguntas', async (req, res) => {
  try {
    const encuesta = await consulta('SELECT id FROM encuestas WHERE uuid=$1 AND estado=\'publicada\'', [req.params.uuid]);
    if (!encuesta.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    
    const resultado = await consulta(
      `SELECT id, orden, texto, tipo_pregunta, obligatoria, opciones, escala_min, escala_max
       FROM preguntas_encuesta WHERE encuesta_id=$1 ORDER BY orden`,
      [encuesta.rows[0].id]
    );
    res.json({ exito: true, datos: resultado.rows });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

router.post('/publica/:uuid/responder', async (req, res) => {
  try {
    const { tipo_respondente, detalles } = req.body;
    const encuesta = await consulta('SELECT id FROM encuestas WHERE uuid=$1 AND estado=\'publicada\'', [req.params.uuid]);
    if (!encuesta.rows.length) return res.status(404).json({ exito: false, mensaje: 'Encuesta no encontrada' });
    
    const encuestaId = encuesta.rows[0].id;
    
    // Crear respuesta
    const respuesta = await consulta(
      `INSERT INTO respuestas_encuesta (encuesta_id, tipo_respondente, completada)
       VALUES ($1, $2, true) RETURNING id`,
      [encuestaId, tipo_respondente || 'estudiante']
    );
    
    const respuestaId = respuesta.rows[0].id;
    
    // Guardar detalles
    for (const detalle of detalles) {
      await consulta(
        `INSERT INTO detalle_respuestas (respuesta_id, pregunta_id, valor_numerico, valor_texto, valor_opcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [respuestaId, detalle.pregunta_id, detalle.valor_numerico, detalle.valor_texto, detalle.valor_opcion]
      );
    }
    
    // Actualizar contador de respuestas
    await consulta('UPDATE encuestas SET total_respuestas = total_respuestas + 1 WHERE id=$1', [encuestaId]);
    
    res.json({ exito: true, mensaje: 'Respuestas registradas exitosamente' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: error.message });
  }
});

// Aplicar middleware de autenticación para las rutas siguientes
router.use(verificarToken);
router.use(cargarPermisosUsuario);

router.get('/',                              ctrl.listar);
router.get('/estadisticas',                  ctrl.estadisticas);
router.get('/:id',                           ctrl.obtener);
router.get('/:id/preguntas',                 ctrl.listarPreguntas);
router.get('/:id/respuestas',                ctrl.listarRespuestas);
router.get('/:id/resultados',                ctrl.resultados);
router.get('/:id/pdf',                       ctrl.generarPDF);

router.post('/',                             tienePermiso('satisfaccion.crear'), ctrl.crear);
router.put('/:id',                           tienePermiso('satisfaccion.editar'), ctrl.actualizar);
router.patch('/:id/estado',                  tienePermiso('satisfaccion.publicar'), ctrl.cambiarEstado);
router.delete('/:id',                        tienePermiso('satisfaccion.eliminar'), ctrl.eliminar);

router.post('/:id/preguntas',                tienePermiso('satisfaccion.editar'), ctrl.crearPregunta);
router.put('/preguntas/:pregId',             tienePermiso('satisfaccion.editar'), ctrl.actualizarPregunta);
router.delete('/preguntas/:pregId',          tienePermiso('satisfaccion.editar'), ctrl.eliminarPregunta);

router.post('/:id/responder',                ctrl.responder);

module.exports = router;
