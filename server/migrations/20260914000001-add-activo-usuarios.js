'use strict';

/**
 * Las cuentas se desactivan en lugar de borrarse. Borrar un usuario eliminaba
 * en cascada sus pedidos, y con ellos cambiaban las liquidaciones ya
 * calculadas de los locales. Desactivarlo le quita el acceso y lo saca de la
 * plataforma, pero conserva todo su historial.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Usuarios', 'activo', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Usuarios', 'activo');
  }
};
