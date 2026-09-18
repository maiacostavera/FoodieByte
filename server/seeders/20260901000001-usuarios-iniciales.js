'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const bcrypt = require('bcrypt');
const { LOCALES, CLIENTES, POSTULANTES, DESACTIVADOS, EMAILS_DEMO } = require('./datos/demo');

const DIA = 24 * 60 * 60 * 1000;

const emailAdmin = () => (process.env.ADMIN_EMAIL || 'admin@foodiebyte.com').toLowerCase();

// Cada fila lleva todas las columnas: en una inserción múltiple, una columna
// ausente se envía como NULL y choca con las que no lo admiten (como activo).
const filaDeUsuario = (cuenta, ahora) => ({
  nombre: cuenta.nombre,
  email: cuenta.email.toLowerCase(),
  rol: cuenta.rol,
  activo: cuenta.activo ?? true,
  solicitud_vendedor: Boolean(cuenta.solicitud_vendedor),
  solicitud_fecha: cuenta.solicitud_fecha ?? null,
  nombre_local: cuenta.nombre_local ?? null,
  telefono: cuenta.telefono ?? null,
  direccion: cuenta.direccion ?? null,
  categoria_local: cuenta.categoria_local ?? null,
  descripcion_productos: cuenta.descripcion_productos ?? null,
  createdAt: new Date(ahora.getTime() - cuenta.alta * DIA),
  updatedAt: ahora
});

/**
 * Cuentas de la demo: el administrador, los locales, los clientes, dos
 * solicitudes de alta pendientes y una cuenta desactivada. Los datos salen de
 * seeders/datos/demo.js y las contraseñas del .env: ADMIN_PASSWORD para el
 * administrador y DEMO_PASSWORD para todas las demás.
 */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const passwordAdmin = process.env.ADMIN_PASSWORD;

    if (!passwordAdmin) {
      throw new Error('Falta ADMIN_PASSWORD en el .env. Copiá .env.example como .env y completalo.');
    }

    const passwordDemo = process.env.DEMO_PASSWORD || passwordAdmin;

    const cuentas = [
      { nombre: 'Administrador', email: emailAdmin(), rol: 'admin', alta: 200, esAdmin: true },
      ...LOCALES.map(local => ({ ...local, rol: 'vendedor' })),
      ...CLIENTES.map(cliente => ({ ...cliente, rol: 'foodie' })),
      ...POSTULANTES.map(postulante => ({
        ...postulante,
        rol: 'foodie',
        solicitud_vendedor: true,
        solicitud_fecha: new Date(ahora.getTime() - postulante.solicitud * DIA)
      })),
      ...DESACTIVADOS.map(cuenta => ({ ...cuenta, rol: 'foodie', activo: false }))
    ];

    // Se puede correr más de una vez: las cuentas que ya existen no se tocan.
    const nuevas = [];
    for (const cuenta of cuentas) {
      const existe = await queryInterface.rawSelect('Usuarios', {
        where: { email: cuenta.email.toLowerCase() }
      }, ['id']);
      if (existe) continue;

      nuevas.push({
        ...filaDeUsuario(cuenta, ahora),
        password: await bcrypt.hash(cuenta.esAdmin ? passwordAdmin : passwordDemo, 10)
      });
    }

    if (nuevas.length > 0) {
      await queryInterface.bulkInsert('Usuarios', nuevas);
    }
  },

  async down(queryInterface, Sequelize) {
    // Las claves foráneas en cascada se llevan también sus platos, pedidos y consultas.
    return queryInterface.bulkDelete('Usuarios', {
      email: { [Sequelize.Op.in]: [emailAdmin(), ...EMAILS_DEMO] }
    });
  }
};
