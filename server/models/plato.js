'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Plato extends Model {
    static associate(models) {
      if (models.Usuario) {
        Plato.belongsTo(models.Usuario, { foreignKey: 'vendedorId', as: 'vendedor' });
      }
    }
  }

  Plato.init({
    nombre: DataTypes.STRING,
    descripcion: DataTypes.TEXT,
    precio: DataTypes.DECIMAL(10, 2),
    categoria: DataTypes.STRING,
    imagenUrl: DataTypes.STRING,
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: { min: 0, max: 100 }
    },
    vendedorId: DataTypes.INTEGER,
    tiempo_prep: { type: DataTypes.STRING, defaultValue: '20-30 min' },
    es_vegano: { type: DataTypes.BOOLEAN, defaultValue: false },
    es_sintacc: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    sequelize,
    modelName: 'Plato',
    tableName: 'platos',
    underscored: false,
  });

  return Plato;
};