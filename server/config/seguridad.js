'use strict';

require('dotenv').config({ quiet: true });

// Punto único de verdad para los parámetros de seguridad y de negocio.
// Si falta el secreto en producción cortamos el arranque: es preferible
// no levantar el servidor antes que firmar tokens con una clave conocida.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Falta la variable JWT_SECRET. Copiá .env.example como .env y completala.');
  }
  console.warn('⚠️  No hay JWT_SECRET en el .env: se usa una clave de desarrollo. No la uses en producción.');
}

module.exports = {
  JWT_SECRET: JWT_SECRET || 'foodiebyte-desarrollo-inseguro',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  COMISION_PLATAFORMA: Number(process.env.COMISION_PLATAFORMA) || 0.05,
  ROLES: { FOODIE: 'foodie', VENDEDOR: 'vendedor', ADMIN: 'admin' }
};
