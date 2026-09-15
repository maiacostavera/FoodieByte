'use strict';

require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const platosRouter = require('./routes/platos');
const usuariosRouter = require('./routes/usuarios');
const pedidosRouter = require('./routes/pedidos');
const adminRouter = require('./routes/admin');

/**
 * Aplicación Express lista pero sin escuchar en ningún puerto. index.js la
 * arranca, y las pruebas de integración la levantan en otro puerto: así se
 * prueba exactamente la misma configuración que corre en producción, con CORS
 * y manejo de errores incluidos.
 */
const app = express();

// Solo se aceptan pedidos del frontend declarado en el .env, no de cualquier origen.
const origenesPermitidos = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origen => origen.trim())
  .filter(Boolean);

app.locals.origenesPermitidos = origenesPermitidos;

app.use(cors({
  origin: (origin, callback) => {
    // Sin origin son herramientas como curl o Postman, o la carga de imágenes.
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  }
}));

app.use(express.json({ limit: '1mb' }));

// En las pruebas, el log de cada request solo tapa los resultados.
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Imágenes de los platos subidas por los vendedores.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Chequeo de salud, útil para verificar que la API está levantada.
app.get('/api/health', (req, res) => res.json({ estado: 'ok', hora: new Date().toISOString() }));

app.use('/api/platos', platosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/admin', adminRouter);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Manejador de errores final: evita que se filtren stack traces al cliente.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  // express.json rechaza cuerpos que no son JSON o que superan el límite:
  // es un error del cliente, no del servidor.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ mensaje: 'El cuerpo de la solicitud supera el tamaño permitido.' });
  }
  if (err.message && err.message.startsWith('Origen no permitido')) {
    return res.status(403).json({ mensaje: err.message });
  }

  console.error('Error no controlado:', err);
  res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

module.exports = app;
