'use strict';

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/seguridad');

/**
 * Verifica el JWT del header Authorization y deja el usuario en req.usuario.
 * Toda ruta protegida debe pasar por acá: es el único lugar del backend que
 * llama a jwt.verify, así ninguna ruta puede "olvidarse" de validar el token.
 */
const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token faltante o mal formado.' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso denegado. Token faltante.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = { id: Number(decoded.id), rol: decoded.rol };
    next();
  } catch (err) {
    const expirado = err.name === 'TokenExpiredError';
    return res.status(401).json({
      mensaje: expirado ? 'Tu sesión expiró. Iniciá sesión nuevamente.' : 'Token inválido.',
      expirado
    });
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
