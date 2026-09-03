'use strict';

require('dotenv').config({ quiet: true });

// Configuración compartida por la app (models/index.js) y por sequelize-cli.
// Todos los valores sensibles salen del archivo .env (ver .env.example).
const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
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
