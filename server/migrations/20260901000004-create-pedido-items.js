'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PedidoItems', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      pedidoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Pedidos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      platoId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'platos', key: 'id' },
        onUpdate: 'CASCADE',
        // El plato puede desaparecer del catálogo; la línea del pedido queda
        // igual porque guarda el nombre y el precio del momento de la compra.
        onDelete: 'SET NULL'
      },
      vendedorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nombrePlato: { type: Sequelize.STRING, allowNull: false },
      precioUnitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      cantidad: { type: Sequelize.INTEGER, allowNull: false },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      // El estado vive en la línea: en un pedido que mezcla locales, cada
      // vendedor gestiona únicamente el estado de sus propios productos.
      estado: {
        type: Sequelize.ENUM('Pendiente', 'Enviado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Pendiente'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // Índice clave: es el que permite a cada vendedor filtrar sus comandas
    // y el que usa el cálculo de comisiones del administrador.
    await queryInterface.addIndex('PedidoItems', ['vendedorId']);
    await queryInterface.addIndex('PedidoItems', ['pedidoId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PedidoItems');
  }
};
