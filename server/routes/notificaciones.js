'use strict';

const express = require('express');
const router = express.Router();
const { Notificacion } = require('../models');
const { autenticar } = require('../middleware/auth');
const { validarIdDeRuta } = require('../middleware/validarId');
const { responderError } = require('../utils/errores');

// Todas las rutas son del usuario autenticado: nunca se recibe un id de
// destinatario por parámetro, se toma del token.
router.use(autenticar);
router.param('id', validarIdDeRuta);

const LIMITE = 30;

/** Listado propio, las más nuevas primero, con el contador de no leídas. */
router.get('/', async (req, res) => {
  try {
    const [notificaciones, sinLeer] = await Promise.all([
      Notificacion.findAll({
        where: { usuarioId: req.usuario.id },
        order: [['createdAt', 'DESC']],
        limit: LIMITE
      }),
      Notificacion.count({ where: { usuarioId: req.usuario.id, leida: false } })
    ]);

    res.json({ notificaciones, sinLeer });
  } catch (err) {
    responderError(res, err, {
      contexto: 'Error al obtener las notificaciones',
      mensaje: 'Error interno al obtener las notificaciones.'
    });
  }
});

/** Contador solo: es lo que consulta la campanita cada tanto. */
router.get('/sin-leer', async (req, res) => {
  try {
    const sinLeer = await Notificacion.count({ where: { usuarioId: req.usuario.id, leida: false } });
    res.json({ sinLeer });
  } catch (err) {
    responderError(res, err, {
      contexto: 'Error al contar las notificaciones',
      mensaje: 'Error interno al contar las notificaciones.'
    });
  }
});

/** Marca una como leída. El where incluye el usuario: nadie toca las ajenas. */
router.put('/:id/leida', async (req, res) => {
  try {
    const [actualizadas] = await Notificacion.update(
      { leida: true },
      { where: { id: req.params.id, usuarioId: req.usuario.id } }
    );

    if (actualizadas === 0) {
      return res.status(404).json({ mensaje: 'Notificación no encontrada.' });
    }
    res.json({ mensaje: 'Notificación marcada como leída.' });
  } catch (err) {
    responderError(res, err, {
      contexto: 'Error al marcar la notificación',
      mensaje: 'Error interno al marcar la notificación.'
    });
  }
});

/** Marca todas las propias como leídas. */
router.put('/leidas', async (req, res) => {
  try {
    const [actualizadas] = await Notificacion.update(
      { leida: true },
      { where: { usuarioId: req.usuario.id, leida: false } }
    );
    res.json({ mensaje: 'Notificaciones marcadas como leídas.', actualizadas });
  } catch (err) {
    responderError(res, err, {
      contexto: 'Error al marcar las notificaciones',
      mensaje: 'Error interno al marcar las notificaciones.'
    });
  }
});

module.exports = router;
