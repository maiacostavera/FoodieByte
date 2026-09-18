'use strict';
const { Model } = require('sequelize');
const { LIMITES } = require('../config/limites');
const { borrarImagenSubida } = require('../utils/imagenes');

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
      validate: { min: 0.01 },
      // Igual que Pedido.total: PostgreSQL entrega DECIMAL como texto y la
      // API devolvía "1200.00" en lugar de 1200.
      get() {
        const valor = this.getDataValue('precio');
        return valor === null ? null : Number(valor);
      }
    },
    categoria: DataTypes.STRING,
    imagenUrl: DataTypes.STRING,
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 0, max: LIMITES.stock }
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

  // Las imágenes subidas son archivos en disco. Al eliminar un plato o
  // reemplazar su foto, el archivo anterior se borra: antes quedaban huérfanos
  // para siempre. Vale para cualquier ruta que borre o edite un plato, incluidas
  // las del administrador.
  Plato.addHook('afterDestroy', (plato) => borrarImagenSubida(plato.imagenUrl));
  Plato.addHook('afterUpdate', async (plato) => {
    if (plato.changed('imagenUrl')) await borrarImagenSubida(plato.previous('imagenUrl'));
  });

  return Plato;
};
