'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Pedido extends Model {
    static associate(models) {
      // Un pedido pertenece a un usuario
      Pedido.belongsTo(models.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
    }
  }
  Pedido.init({
    usuarioId: DataTypes.INTEGER,
    // Guardamos el array de productos serializado como string (TEXT)
    productos: DataTypes.TEXT,
    total: DataTypes.FLOAT,
    estado: {
      type: DataTypes.STRING,
      defaultValue: 'Pendiente' // Estado por defecto para las compras de Nicolás
    }
  }, {
    sequelize,
    modelName: 'Pedido',
  });
  return Pedido;
};