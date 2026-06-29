const express = require('express');
const router = express.Router();
const { Usuario } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// REGISTRO
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ mensaje: "Todos los campos son obligatorios." });
        }

        if (nombre.trim().length < 2) {
            return res.status(400).json({ mensaje: "El nombre debe tener al menos 2 caracteres." });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ mensaje: "El formato del email no es válido." });
        }

        if (password.length < 6) {
            return res.status(400).json({ mensaje: "La contraseña debe tener al menos 6 caracteres." });
        }

        const emailNormalizado = email.toLowerCase();

        const existe = await Usuario.findOne({ where: { email: emailNormalizado } });
        if (existe) {
            return res.status(400).json({ mensaje: "Este correo ya se encuentra registrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Usuario.create({
            nombre: nombre.trim(),
            email: emailNormalizado,
            password: hashedPassword,
            rol: 'foodie'
        });

        res.status(201).json({ mensaje: "¡Cuenta creada! Ya podés iniciar sesión." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al registrarse." });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ mensaje: "Email y contraseña son obligatorios." });
        }

        const emailNormalizado = email.toLowerCase();
        const usuario = await Usuario.findOne({ where: { email: emailNormalizado } });

        if (!usuario) return res.status(401).json({ mensaje: "Email no encontrado." });

        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) return res.status(401).json({ mensaje: "Contraseña incorrecta." });

        const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, 'secret_key_foodiebyte', { expiresIn: '24h' });

        res.json({
            mensaje: "¡Bienvenido!",
            token,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                rol: usuario.rol,
                nombre: usuario.nombre
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Error en el servidor." });
    }
});

// RUTA DE DIAGNÓSTICO: GENERAR HASH
router.post('/generar-hash', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: "Debes proveer una contraseña en el body." });
        }

        const hash = await bcrypt.hash(password, 10);

        res.json({
            mensaje: "Copia el hash generado y actualízalo en tu base de datos.",
            passwordOriginal: password,
            hashGenerado: hash
        });
    } catch (err) {
        res.status(500).json({ error: "Error al generar el hash." });
    }
});

// SOLICITAR SER VENDEDOR
router.post('/solicitar-vendedor', async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) return res.status(401).json({ mensaje: "No autorizado." });
        
        let decoded;
        try {
            const tokenStr = tokenHeader.split(' ')[1];
            decoded = jwt.verify(tokenStr, 'secret_key_foodiebyte');
        } catch (err) {
            return res.status(401).json({ mensaje: "Token inválido o expirado." });
        }

        const { nombreLocal, descripcionProductos, telefono, direccion, categoria } = req.body;
        if (!nombreLocal || !descripcionProductos || !telefono || !direccion || !categoria) {
            return res.status(400).json({ mensaje: "Todos los campos (nombre, descripción, teléfono, dirección y categoría) son obligatorios." });
        }

        const usuario = await Usuario.findByPk(decoded.id);
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado." });

        if (usuario.rol === 'vendedor' || usuario.rol === 'admin') {
            return res.status(400).json({ mensaje: "Ya posees un rol de gestión." });
        }

        await usuario.update({ solicitud_vendedor: true });
        
        res.json({ mensaje: "¡Solicitud enviada con éxito! Un administrador la revisará pronto." });
    } catch (err) {
        console.error("Error al solicitar vendedor:", err);
        res.status(500).json({ error: "Error interno al procesar la solicitud." });
    }
});

module.exports = router;
