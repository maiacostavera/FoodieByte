'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Notificaciones', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      usuarioId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tipo: {
        type: Sequelize.ENUM(
          'pedido_confirmado', 'pedido_enviado', 'pedido_rechazado', 'pregunta_respondida',
          'pedido_recibido', 'pregunta_recibida', 'solicitud_local'
        ),
        allowNull: false
      },
      titulo: { type: Sequelize.STRING, allowNull: false },
      detalle: { type: Sequelize.STRING },
      // Sin clave foránea a propósito: si el pedido o el plato se borran, el
      // aviso sigue siendo parte del historial de la persona.
      pedidoId: { type: Sequelize.INTEGER },
      platoId: { type: Sequelize.INTEGER },
      leida: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    // La consulta de cada persona es siempre "las mías, las más nuevas primero".
    await queryInterface.addIndex('Notificaciones', ['usuarioId', 'createdAt']);
    await queryInterface.addIndex('Notificaciones', ['usuarioId', 'leida']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Notificaciones');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Notificaciones_tipo";');
  }
};
