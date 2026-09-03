'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pedidos', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      estado: {
        type: Sequelize.ENUM('Pendiente', 'Enviado', 'Rechazado'),
        allowNull: false,
        defaultValue: 'Pendiente'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('Pedidos', ['usuarioId']);
    await queryInterface.addIndex('Pedidos', ['estado']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Pedidos');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Pedidos_estado";');
  }
};
