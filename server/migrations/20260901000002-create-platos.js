'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('platos', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      nombre: { type: Sequelize.STRING, allowNull: false },
      descripcion: { type: Sequelize.TEXT },
      precio: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      categoria: { type: Sequelize.STRING },
      imagenUrl: { type: Sequelize.STRING },
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      vendedorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        // Si se elimina el vendedor, sus platos salen del catálogo con él.
        onDelete: 'CASCADE'
      },
      tiempo_prep: { type: Sequelize.STRING, defaultValue: '20-30 min' },
      es_vegano: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      es_sintacc: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // Índices para el buscador y el filtro por categoría del catálogo público.
    await queryInterface.addIndex('platos', ['categoria']);
    await queryInterface.addIndex('platos', ['vendedorId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('platos');
  }
};
