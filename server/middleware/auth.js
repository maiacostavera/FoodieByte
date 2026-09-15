'use strict';

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { JWT_SECRET } = require('../config/seguridad');

/**
 * Verifica el JWT del header Authorization y deja el usuario en req.usuario.
 * Toda ruta protegida debe pasar por acá: es el único lugar del backend que
 * llama a jwt.verify, así ninguna ruta puede "olvidarse" de validar el token.
 *
 * La firma no alcanza: el token guarda el rol que el usuario tenía al iniciar
 * sesión. Por eso se lo busca en la base en cada request y manda el rol de la
 * base. Si el usuario ya no existe o su rol cambió, el token deja de servir y
 * hay que volver a iniciar sesión.
 */
const autenticar = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token faltante o mal formado.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token faltante.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    const expirado = err.name === 'TokenExpiredError';
    return res.status(401).json({
      mensaje: expirado ? 'Tu sesión expiró. Iniciá sesión nuevamente.' : 'Token inválido.',
      expirado
    });
  }

  try {
    const usuario = await Usuario.findByPk(Number(decoded.id), { attributes: ['id', 'rol'] });

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Tu cuenta ya no está disponible. Iniciá sesión nuevamente.', expirado: true });
    }
    // Sin esta comprobación, un vendedor al que el administrador le quitaba el
    // rol seguía publicando platos hasta que su token vencía.
    if (usuario.rol !== decoded.rol) {
      return res.status(401).json({ mensaje: 'Tus permisos cambiaron. Iniciá sesión nuevamente.', expirado: true });
    }

    req.usuario = { id: usuario.id, rol: usuario.rol };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restringe el acceso a los roles indicados. Se usa siempre después de autenticar.
 * Ejemplo: router.get('/x', autenticar, requiereRol('admin'), handler)
 */
const requiereRol = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token faltante.' });
  }
  if (!rolesPermitidos.includes(req.usuario.rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: no tenés permisos para esta operación.' });
  }
  next();
};

module.exports = { autenticar, requiereRol };
