'use strict';

const fs = require('fs');
const path = require('path');

const rutaEnv = path.join(__dirname, '..', '.env');
const existeEnv = fs.existsSync(rutaEnv);

require('dotenv').config({ quiet: true });

// Sin estas comprobaciones, un .env ausente o a medio completar produce el
// mismo error de autenticación que una contraseña equivocada, y no hay forma
// de distinguirlos desde la salida de sequelize-cli.
if (!existeEnv) {
  console.error('\n❌ No se encontró el archivo .env en la carpeta server/.');
  console.error(`   Se buscó en: ${rutaEnv}`);
  console.error('\n   Crealo copiando la plantilla y completá tus datos:');
  console.error('     copy .env.example .env      (Windows)');
  console.error('     cp .env.example .env        (Mac o Linux)');
  console.error('\n   Ojo en Windows: si lo creaste con el Bloc de notas puede haber');
  console.error('   quedado como ".env.txt". Verificalo con: npm run db:check\n');
  process.exit(1);
}

const PLACEHOLDERS = ['TU_PASSWORD', 'cambiame', 'CAMBIAME', 'tu_password'];
const contienePlaceholder = (valor) =>
  typeof valor === 'string' && PLACEHOLDERS.some(p => valor.includes(p));

if (contienePlaceholder(process.env.DB_PASSWORD)) {
  console.error('\n❌ DB_PASSWORD todavía tiene el texto de ejemplo del .env.');
  console.error('   Reemplazalo por la contraseña real de tu PostgreSQL.');
  console.error(`   Archivo a editar: ${rutaEnv}\n`);
  process.exit(1);
}

if (contienePlaceholder(process.env.JWT_SECRET)) {
  console.error('\n❌ JWT_SECRET todavía tiene el texto de ejemplo del .env.');
  console.error('   Generá una clave propia con:');
  console.error('     node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n');
  process.exit(1);
}

// Configuración compartida por la app (models/index.js) y por sequelize-cli.
// Todos los valores sensibles salen del archivo .env (ver .env.example).
const base = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || null,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  // Muchos PostgreSQL en la nube (Neon, Supabase, Railway) exigen TLS.
  // Se activa con DB_SSL=true en el .env; en local no hace falta.
  dialectOptions: process.env.DB_SSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {}
};

module.exports = {
  development: {
    ...base,
    database: process.env.DB_NAME || 'foodiebyte_db',
    logging: console.log
  },
  test: {
    ...base,
    database: process.env.DB_NAME_TEST || 'foodiebyte_test',
    logging: false
  },
  production: {
    ...base,
    database: process.env.DB_NAME || 'foodiebyte_db',
    logging: false
  }
};
