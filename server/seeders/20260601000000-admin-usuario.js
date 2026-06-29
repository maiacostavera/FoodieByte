'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const existe = await queryInterface.rawSelect('Usuarios', {
      where: { email: 'admin@foodiebyte.com' }
    }, ['id']);

    if (!existe) {
      return queryInterface.bulkInsert('Usuarios', [{
        nombre: 'Administrador',
        email: 'admin@foodiebyte.com',
        password: hashedPassword,
        rol: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Usuarios', { email: 'admin@foodiebyte.com' }, {});
  }
};
