'use strict';

/**
 * Límites de los datos que llegan del cliente, en un único lugar.
 *
 * Las columnas STRING son VARCHAR(255) en PostgreSQL, que rechaza cualquier
 * valor más largo. Si no se valida antes, la API responde con un error en
 * lugar de explicarle al usuario qué campo corregir.
 */
const LIMITES = {
  nombre: 100,
  email: 255,
  // bcrypt descarta lo que pasa de 72 bytes.
  password: 72,
  nombreLocal: 100,
  telefono: 30,
  direccion: 200,
  descripcion: 1000,
  tiempoPrep: 50,
  // Aclaraciones del cliente para el local al hacer un pedido.
  notasPedido: 300,
  // Unidades máximas en stock de un plato: lo validan el modelo y las rutas.
  stock: 100,
  // Máximo que entra en una columna DECIMAL(10, 2).
  precio: 99999999.99
};

// Máximo de una columna INTEGER de PostgreSQL: un id mayor no puede existir.
const MAX_INTEGER = 2147483647;

module.exports = { LIMITES, MAX_INTEGER };
