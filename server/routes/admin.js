const express = require('express');
const router = express.Router();
const { Usuario, Plato, Pedido, sequelize } = require('../models');
const { Op } = require('sequelize');
const esAdmin = require('../middleware/authAdmin');

// OBTENER TODOS LOS USUARIOS
router.get('/usuarios', esAdmin, async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: ['id', 'nombre', 'email', 'rol', 'createdAt', 'solicitud_vendedor'],
            order: [['createdAt', 'DESC']]
        });
        res.json(usuarios);
    } catch (err) {
        console.error("Error al obtener usuarios:", err);
        res.status(500).json({ error: "Error interno al obtener los usuarios." });
    }
});

// CAMBIAR ROL DE USUARIO
router.put('/usuarios/:id/rol', esAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoRol } = req.body;

        const rolesPermitidos = ['foodie', 'vendedor', 'admin'];
        if (!rolesPermitidos.includes(nuevoRol)) {
            return res.status(400).json({ mensaje: "Rol inválido." });
        }

        const usuario = await Usuario.findByPk(id);
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado." });

        if (usuario.id === req.usuario.id && nuevoRol !== 'admin') {
            return res.status(400).json({ mensaje: "No podés cambiar tu propio rol de administrador." });
        }

        await usuario.update({ rol: nuevoRol });
        res.json({ mensaje: "Rol actualizado exitosamente.", usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: nuevoRol } });
    } catch (err) {
        console.error("Error al cambiar rol:", err);
        res.status(500).json({ error: "Error interno al cambiar el rol." });
    }
});

// RECHAZAR SOLICITUD DE VENDEDOR
router.put('/usuarios/:id/rechazar-vendedor', esAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado." });

        await usuario.update({ solicitud_vendedor: false });
        res.json({ mensaje: "Solicitud rechazada exitosamente." });
    } catch (err) {
        console.error("Error al rechazar solicitud:", err);
        res.status(500).json({ error: "Error interno al procesar el rechazo." });
    }
});

// ELIMINAR USUARIO POR ID
router.delete('/usuarios/:id', esAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id);
        if (!usuario) return res.status(404).json({ mensaje: "Usuario no encontrado." });

        if (usuario.id === req.usuario.id) {
            return res.status(400).json({ mensaje: "No puedes eliminar tu propia cuenta de administrador." });
        }

        await usuario.destroy();
        res.json({ mensaje: "Usuario eliminado exitosamente." });
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        res.status(500).json({ error: "Error interno al eliminar el usuario." });
    }
});

// OBTENER TODOS LOS PLATOS (ADMIN - con info del vendedor)
router.get('/platos', esAdmin, async (req, res) => {
    try {
        const platos = await Plato.findAll({
            include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(platos);
    } catch (err) {
        console.error("Error al obtener platos:", err);
        res.status(500).json({ error: "Error interno al obtener los platos." });
    }
});

// ELIMINAR CUALQUIER PLATO (ADMIN)
router.delete('/platos/:id', esAdmin, async (req, res) => {
    try {
        const plato = await Plato.findByPk(req.params.id);
        if (!plato) return res.status(404).json({ mensaje: "Plato no encontrado." });

        await plato.destroy();
        res.json({ mensaje: "Plato eliminado exitosamente." });
    } catch (err) {
        console.error("Error al eliminar plato:", err);
        res.status(500).json({ error: "Error interno al eliminar el plato." });
    }
});

// OBTENER TODOS LOS PEDIDOS (ADMIN - con info del usuario)
router.get('/pedidos', esAdmin, async (req, res) => {
    try {
        const pedidos = await Pedido.findAll({
            include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener pedidos:", err);
        res.status(500).json({ error: "Error interno al obtener los pedidos." });
    }
});

// ESTADÍSTICAS GLOBALES (ADMIN)
router.get('/estadisticas', esAdmin, async (req, res) => {
    try {
        const usuariosTotales = await Usuario.count();
        console.log('Usuarios contados:', usuariosTotales);
        
        const platosPublicados = await Plato.count();
        console.log('Platos contados:', platosPublicados);
        
        const localesActivos = await Usuario.count({ where: { rol: 'vendedor' } });
        console.log('Locales contados:', localesActivos);
        
        const pedidosEnviados = await Pedido.count({ where: { estado: 'Enviado' } });
        console.log('Pedidos contados:', pedidosEnviados);

        res.json({
            usuariosTotales,
            platosPublicados,
            localesActivos,
            pedidosEnviados
        });
    } catch (err) {
        console.error("Error al obtener estadísticas:", err);
        res.status(500).json({ error: "Error interno al obtener las estadísticas." });
    }
});

module.exports = router;
