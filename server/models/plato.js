'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Plato extends Model {
    static associate(models) {
      Plato.belongsTo(models.Usuario, { foreignKey: 'vendedorId', as: 'vendedor' });
      Plato.hasMany(models.PedidoItem, { foreignKey: 'platoId', as: 'items' });
      Plato.hasMany(models.Pregunta, { foreignKey: 'platoId', as: 'preguntas' });
    }
  }

  Plato.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    descripcion: DataTypes.TEXT,
    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 }
    },
    categoria: DataTypes.STRING,
    imagenUrl: DataTypes.STRING,
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 0, max: 100 }
    },
    vendedorId: { type: DataTypes.INTEGER, allowNull: false },
    tiempo_prep: { type: DataTypes.STRING, defaultValue: '20-30 min' },
    es_vegano: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    es_sintacc: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    sequelize,
    modelName: 'Plato',
    tableName: 'platos'
  });

  return Plato;
};
