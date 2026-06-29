const jwt = require('jsonwebtoken');

const esAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ mensaje: 'Acceso denegado. Token faltante.' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ mensaje: 'Formato de token inválido.' });
        }

        const decoded = jwt.verify(token, 'secret_key_foodiebyte');
        
        if (decoded.rol !== 'admin') {
            return res.status(403).json({ mensaje: 'Acceso denegado. Se requieren permisos de administrador.' });
        }

        // Si es admin, inyectamos la info del usuario en la request por si se necesita
        req.usuario = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
    }
};

module.exports = esAdmin;
