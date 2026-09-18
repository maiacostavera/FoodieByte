'use strict';

require('dotenv').config({ quiet: true });

const app = require('./app');
const db = require('./models');

const PORT = Number(process.env.PORT) || 3000;

// El esquema lo administran las migraciones (npm run db:migrate), no sync():
// así el estado de la base es reproducible y versionado.
db.sequelize.authenticate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor FoodieByte corriendo en http://localhost:${PORT}`);
      console.log(`   Origen permitido para CORS: ${app.locals.origenesPermitidos.join(', ')}`);
    });
  })
  .catch(err => {
    console.error('❌ No se pudo conectar a la base de datos:', err.message);
    console.error('   Revisá las credenciales del archivo .env y que PostgreSQL esté corriendo.');
    console.error('   Para un diagnóstico detallado: npm run db:check');
    process.exit(1);
  });
