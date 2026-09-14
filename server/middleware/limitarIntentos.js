'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { LIMITE_DE_INTENTOS } = require('../config/seguridad');

/**
 * Frena la fuerza bruta sobre el login: después de varios intentos fallidos
 * para un mismo correo desde la misma IP, responde 429 durante un rato. Los
 * logins correctos no cuentan, y un correo bloqueado no afecta a los demás.
 */
const limitarLogin = rateLimit({
  windowMs: LIMITE_DE_INTENTOS.login.minutos * 60 * 1000,
  limit: LIMITE_DE_INTENTOS.login.fallidos,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    // ipKeyGenerator agrupa las direcciones IPv6 por subred: si no, rotar la
    // dirección dentro de la misma subred alcanzaría para esquivar el límite.
    return `${ipKeyGenerator(req.ip)}|${email}`;
  },
  message: { mensaje: 'Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar.' }
});

/** Limita la creación masiva de cuentas desde una misma IP. */
const limitarRegistro = rateLimit({
  windowMs: LIMITE_DE_INTENTOS.registro.minutos * 60 * 1000,
  limit: LIMITE_DE_INTENTOS.registro.maximo,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { mensaje: 'Se crearon demasiadas cuentas desde esta conexión. Probá de nuevo más tarde.' }
});

module.exports = { limitarLogin, limitarRegistro };
