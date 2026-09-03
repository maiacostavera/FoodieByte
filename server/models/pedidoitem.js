'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /**
   * Cada línea de un pedido. Guarda el vendedorId para que un local pueda ver
   * y gestionar únicamente las comandas que le corresponden, aunque el carrito
   * del cliente haya mezclado platos de varios locales.
   *
   * nombrePlato y precioUnitario son una "foto" del momento de la compra: si
   * después el vendedor cambia el precio o borra el plato, el historial y las
   * liquidaciones siguen siendo correctos.
   */
  class PedidoItem extends Model {
    static associate(models) {
      PedidoItem.belongsTo(models.Pedido, { foreignKey: 'pedidoId', as: 'pedido' });
      PedidoItem.belongsTo(models.Plato, { foreignKey: 'platoId', as: 'plato' });
      PedidoItem.belongsTo(models.Usuario, { foreignKey: 'vendedorId', as: 'vendedor' });
    }
  }

  const decimalNumerico = (campo) => ({
    get() {
      const valor = this.getDataValue(campo);
      return valor === null ? null : Number(valor);
    }
  });

  PedidoItem.init({
    pedidoId: { type: DataTypes.INTEGER, allowNull: false },
    platoId: { type: DataTypes.INTEGER, allowNull: true },
    vendedorId: { type: DataTypes.INTEGER, allowNull: true },
    nombrePlato: { type: DataTypes.STRING, allowNull: false },
    precioUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      ...decimalNumerico('precioUnitario')
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 }
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      ...decimalNumerico('subtotal')
    },
    estado: {
      type: DataTypes.ENUM('Pendiente', 'Enviado', 'Rechazado'),
      allowNull: false,
      defaultValue: 'Pendiente'
    }
  }, {
    sequelize,
    modelName: 'PedidoItem',
    tableName: 'PedidoItems'
  });

  return PedidoItem;
};
