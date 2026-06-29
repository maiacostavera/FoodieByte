const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        // Asumiendo que el usuario ya pasó por la autenticación JWT y está en req.usuario
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: "Acceso denegado: rol insuficiente" });
        }
        next();
    };
};

module.exports = verificarRol;