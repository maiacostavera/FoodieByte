'use strict';

require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./models');

const platosRouter = require('./routes/platos');
const usuariosRouter = require('./routes/usuarios');
const pedidosRouter = require('./routes/pedidos');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Solo se aceptan pedidos del frontend declarado en el .env, no de cualquier origen.
const origenesPermitidos = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origen => origen.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Sin origin son herramientas como curl o Postman, o la carga de imágenes.
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    return callback(new Error(`Origen no permitido por CORS: ${origin}`));
  }
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

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
  console.error('Error no controlado:', err);
  if (res.headersSent) return next(err);
  const esErrorDeCors = err.message && err.message.startsWith('Origen no permitido');
  res.status(esErrorDeCors ? 403 : 500).json({
    mensaje: esErrorDeCors ? err.message : 'Error interno del servidor.'
  });
});

// El esquema lo administran las migraciones (npm run db:migrate), no sync():
// así el estado de la base es reproducible y versionado.
db.sequelize.authenticate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor FoodieByte corriendo en http://localhost:${PORT}`);
      console.log(`   Origen permitido para CORS: ${origenesPermitidos.join(', ')}`);
    });
  })
  .catch(err => {
    console.error('❌ No se pudo conectar a la base de datos:', err.message);
    console.error('   Revisá las credenciales del archivo .env y que MySQL esté corriendo.');
    process.exit(1);
  });
