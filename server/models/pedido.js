'use strict';
const { Model } = require('sequelize');

const ESTADOS = ['Pendiente', 'Enviado', 'Rechazado'];

module.exports = (sequelize, DataTypes) => {
  class Pedido extends Model {
    static associate(models) {
      Pedido.belongsTo(models.Usuario, { foreignKey: 'usuarioId', as: 'usuario' });
      Pedido.hasMany(models.PedidoItem, { foreignKey: 'pedidoId', as: 'items', onDelete: 'CASCADE' });
    }
  }

  Pedido.init({
    usuarioId: { type: DataTypes.INTEGER, allowNull: false },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      // El driver de PostgreSQL devuelve DECIMAL como texto para no perder
      // precisión; lo normalizamos a número para que el front no tenga que
      // parsear en cada pantalla.
      get() {
        const valor = this.getDataValue('total');
        return valor === null ? null : Number(valor);
      }
    },
    estado: {
      type: DataTypes.ENUM(...ESTADOS),
      allowNull: false,
      defaultValue: 'Pendiente'
    },
    // Admiten NULL por los pedidos anteriores a esta columna; la API exige la
    // dirección en cada pedido nuevo.
    direccionEntrega: { type: DataTypes.STRING(200), allowNull: true },
    notas: { type: DataTypes.STRING(300), allowNull: true }
  }, {
    sequelize,
    modelName: 'Pedido',
    tableName: 'Pedidos'
  });

  Pedido.ESTADOS = ESTADOS;
  return Pedido;
};
