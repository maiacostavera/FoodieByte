'use strict';

/**
 * Errores de PostgreSQL causados por un dato que envió el cliente y no por
 * una falla del servidor. Se identifican por el código SQLSTATE, que no
 * cambia con el idioma en que esté configurada la base.
 */
const DATOS_INVALIDOS = {
  '22001': 'Uno de los textos supera el largo permitido.',
  '22003': 'Uno de los valores numéricos está fuera de rango.',
  '22P02': 'Uno de los valores enviados tiene un formato inválido.',
  '23503': 'Uno de los datos hace referencia a un registro que no existe.'
};

/**
 * Responde un error capturado en una ruta. Lo que se debe a los datos del
 * cliente se informa como 400 o 409; el resto se registra en el log y se
 * responde como 500, sin exponer detalles internos.
 *
 * Antes cada ruta respondía 500 ante cualquier excepción, así que un texto
 * demasiado largo o un email registrado dos veces a la vez parecían una
 * caída del servidor.
 */
const responderError = (res, err, { contexto, mensaje, conflicto }) => {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ mensaje: conflicto || 'Ya existe un registro con esos datos.' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ mensaje: 'Alguno de los datos enviados no es válido.' });
  }

  const codigo = err.original?.code || err.parent?.code;
  if (DATOS_INVALIDOS[codigo]) {
    return res.status(400).json({ mensaje: DATOS_INVALIDOS[codigo] });
  }

  console.error(`${contexto}:`, err);
  return res.status(500).json({ mensaje });
};

module.exports = { responderError };
