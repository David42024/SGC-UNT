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
