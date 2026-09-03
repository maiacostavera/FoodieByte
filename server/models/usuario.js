'use strict';
const { Model } = require('sequelize');
const { ROLES } = require('../config/seguridad');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Plato, { foreignKey: 'vendedorId', as: 'platos' });
      Usuario.hasMany(models.Pedido, { foreignKey: 'usuarioId', as: 'pedidos' });
      Usuario.hasMany(models.Pregunta, { foreignKey: 'usuarioId', as: 'preguntas' });
    }

    // Nunca exponemos el hash de la contraseña en las respuestas de la API.
    toJSON() {
      const { password, ...resto } = this.get();
      return resto;
    }
  }

  Usuario.init({
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [2, 100] }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: { type: DataTypes.STRING, allowNull: false },
    rol: {
      type: DataTypes.ENUM(ROLES.FOODIE, ROLES.VENDEDOR, ROLES.ADMIN),
      allowNull: false,
      defaultValue: ROLES.FOODIE
    },
    solicitud_vendedor: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // Datos del formulario "Quiero ser Vendedor". Antes se descartaban:
    // ahora quedan guardados para que el admin evalúe la solicitud.
    nombre_local: DataTypes.STRING,
    telefono: DataTypes.STRING,
    direccion: DataTypes.STRING,
    categoria_local: DataTypes.STRING,
    descripcion_productos: DataTypes.TEXT,
    solicitud_fecha: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Usuario',
    tableName: 'Usuarios'
  });

  return Usuario;
};
