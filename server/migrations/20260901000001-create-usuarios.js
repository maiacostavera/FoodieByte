'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Usuarios', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      nombre: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false, unique: true },
      password: { type: Sequelize.STRING, allowNull: false },
      rol: {
        type: Sequelize.ENUM('foodie', 'vendedor', 'admin'),
        allowNull: false,
        defaultValue: 'foodie'
      },
      solicitud_vendedor: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },

      // Datos del formulario de alta de local
      nombre_local: { type: Sequelize.STRING },
      telefono: { type: Sequelize.STRING },
      direccion: { type: Sequelize.STRING },
      categoria_local: { type: Sequelize.STRING },
      descripcion_productos: { type: Sequelize.TEXT },
      solicitud_fecha: { type: Sequelize.DATE },

      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('Usuarios', ['rol']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Usuarios');
    // En PostgreSQL el tipo ENUM sobrevive al DROP TABLE: si no se elimina,
    // volver a correr la migración falla porque el tipo ya existe.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Usuarios_rol";');
  }
};
