'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  /** Consultas que los foodies dejan en la publicación de un plato. */
  class Pregunta extends Model {
    static associate(models) {
      Pregunta.belongsTo(models.Plato, { foreignKey: 'platoId', as: 'plato' });
      Pregunta.belongsTo(models.Usuario, { foreignKey: 'usuarioId', as: 'autor' });
    }
  }

  Pregunta.init({
    platoId: { type: DataTypes.INTEGER, allowNull: false },
    usuarioId: { type: DataTypes.INTEGER, allowNull: false },
    texto: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true, len: [3, 500] }
    },
    respuesta: DataTypes.TEXT,
    respondidaEn: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Pregunta',
    tableName: 'Preguntas'
  });

  return Pregunta;
};
