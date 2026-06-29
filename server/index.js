const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const platosRouter = require('./routes/platos');
const usuariosRouter = require('./routes/usuarios');
const pedidosRouter = require('./routes/pedidos');
const adminRouter = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/platos', platosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/admin', adminRouter);

const PORT = 3000;

// Sincronización y arranque del servidor
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor FoodieByte corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ Error al conectar la base de datos:", err);
});