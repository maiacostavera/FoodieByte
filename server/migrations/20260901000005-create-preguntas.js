'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Preguntas', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      platoId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'platos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      texto: { type: Sequelize.TEXT, allowNull: false },
      respuesta: { type: Sequelize.TEXT },
      respondidaEn: { type: Sequelize.DATE },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('Preguntas', ['platoId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Preguntas');
  }
};
