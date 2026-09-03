'use strict';
require('dotenv').config({ quiet: true });
const bcrypt = require('bcrypt');

/**
 * Usuarios base para poder probar la plataforma:
 * un administrador y dos locales de demostración.
 * Las contraseñas salen del .env (ver .env.example).
 */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const passwordAdmin = process.env.ADMIN_PASSWORD;

    if (!passwordAdmin) {
      throw new Error('Falta ADMIN_PASSWORD en el .env. Copiá .env.example como .env y completalo.');
    }

    const passwordDemo = process.env.DEMO_PASSWORD || passwordAdmin;

    const usuarios = [
      {
        nombre: 'Administrador',
        email: (process.env.ADMIN_EMAIL || 'admin@foodiebyte.com').toLowerCase(),
        password: await bcrypt.hash(passwordAdmin, 10),
        rol: 'admin',
        nombre_local: null
      },
      {
        nombre: 'La Nonna',
        email: 'lanonna@foodiebyte.com',
        password: await bcrypt.hash(passwordDemo, 10),
        rol: 'vendedor',
        nombre_local: 'Pizzería La Nonna'
      },
      {
        nombre: 'Sabor Criollo',
        email: 'saborcriollo@foodiebyte.com',
        password: await bcrypt.hash(passwordDemo, 10),
        rol: 'vendedor',
        nombre_local: 'Parrilla Sabor Criollo'
      }
    ];

    for (const usuario of usuarios) {
      const existe = await queryInterface.rawSelect('Usuarios', {
        where: { email: usuario.email }
      }, ['id']);

      if (!existe) {
        await queryInterface.bulkInsert('Usuarios', [{
          ...usuario,
          solicitud_vendedor: false,
          createdAt: ahora,
          updatedAt: ahora
        }]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Usuarios', {
      email: {
        [Sequelize.Op.in]: [
          (process.env.ADMIN_EMAIL || 'admin@foodiebyte.com').toLowerCase(),
          'lanonna@foodiebyte.com',
          'saborcriollo@foodiebyte.com'
        ]
      }
    });
  }
};
