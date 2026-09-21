'use strict';
const { Model } = require('sequelize');

// Cada tipo define qué ícono y qué texto muestra el frontend, y a quién llega.
const TIPOS = [
  'pedido_confirmado',   // al cliente, cuando su pedido se registra
  'pedido_enviado',      // al cliente, cuando un local despacha lo suyo
  'pedido_rechazado',    // al cliente, cuando un local rechaza lo suyo
  'pregunta_respondida', // al cliente, cuando el local contesta su consulta
  'pedido_recibido',     // al local, cuando le entra una comanda
  'pregunta_recibida',   // al local, cuando le preguntan por un plato
  'solicitud_local'      // al administrador, cuando alguien pide vender
];

module.exports = (sequelize, DataTypes) => {
  /**
   * Aviso dirigido a una persona concreta. Se guarda en la base y no se calcula
   * al vuelo: así sobrevive a recargas y cierres de sesión, y cada quien tiene
   * su propio estado de leído.
   */
  class Notificacion extends Model {
    static associate(models) {
      Notificacion.belongsTo(models.Usuario, { foreignKey: 'usuarioId', as: 'destinatario' });
    }
  }

  Notificacion.init({
    usuarioId: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.ENUM(...TIPOS), allowNull: false },
    titulo: { type: DataTypes.STRING, allowNull: false },
    detalle: { type: DataTypes.STRING },
    // Identificadores para que el frontend pueda llevar a la pantalla correcta.
    pedidoId: DataTypes.INTEGER,
    platoId: DataTypes.INTEGER,
    leida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    sequelize,
    modelName: 'Notificacion',
    tableName: 'Notificaciones'
  });

  Notificacion.TIPOS = TIPOS;
  return Notificacion;
};
