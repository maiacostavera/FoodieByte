'use strict';

const { MAX_INTEGER } = require('../config/limites');

/**
 * Valida los parámetros de ruta que representan ids numéricos. Se registra en
 * cada router con router.param('id', validarIdDeRuta).
 *
 * Con MySQL, un id como "abc" se convertía en 0 y la consulta simplemente no
 * encontraba nada. PostgreSQL, en cambio, rechaza la consulta, y la API
 * respondía 500 como si el servidor se hubiera caído.
 */
const validarIdDeRuta = (req, res, next, valor) => {
  const esIdValido = /^\d+$/.test(valor) && Number(valor) >= 1 && Number(valor) <= MAX_INTEGER;
  if (!esIdValido) {
    return res.status(400).json({ mensaje: 'El identificador indicado no es válido.' });
  }
  next();
};

module.exports = { validarIdDeRuta };
