'use strict';

/**
 * Datos de entrega del pedido: la dirección y las aclaraciones para el local
 * ("timbre 3B", "sin cebolla"). Las columnas admiten NULL solo para no romper
 * los pedidos que ya existían; la API exige la dirección en cada pedido nuevo.
 */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Pedidos', 'direccionEntrega', {
      type: Sequelize.STRING(200),
      allowNull: true
    });
    await queryInterface.addColumn('Pedidos', 'notas', {
      type: Sequelize.STRING(300),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Pedidos', 'notas');
    await queryInterface.removeColumn('Pedidos', 'direccionEntrega');
  }
};
