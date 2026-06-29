const express = require('express');
const router = express.Router();
const { Pedido, Plato, sequelize } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
// const verificarRol = require('../middlewares/verificarRol'); 

// CREAR NUEVO PEDIDO (Para compradores logueados)
router.post('/', async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) {
            return res.status(401).json({ mensaje: "Error de sesión: No se proporcionó el token de autorización." });
        }

        let decoded;
        try {
            const tokenStr = tokenHeader.split(' ')[1];
            decoded = jwt.verify(tokenStr, 'secret_key_foodiebyte');
        } catch (err) {
            return res.status(401).json({ mensaje: "Error de sesión: Token inválido o expirado." });
        }

        if (decoded.rol === 'vendedor' || decoded.rol === 'admin') {
            return res.status(403).json({ mensaje: "Los vendedores y administradores no pueden realizar pedidos." });
        }

        const usuarioIdInput = decoded.id;
        const { productos } = req.body;

        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ mensaje: "El carrito está vacío o es inválido." });
        }

        // 1. Iniciamos la transacción gestionada por Sequelize para garantizar la atomicidad
        const nuevoPedido = await sequelize.transaction(async (t) => {
            let totalCalculadoReal = 0;

            // Reparación de raíz: Ordenar los productos por ID para evitar Deadlocks de MySQL
            const productosOrdenados = [...productos].sort((a, b) => a.id - b.id);
            
            // Verificación previa y reducción de Stock atómica con bloqueo de filas
            for (const item of productosOrdenados) {
                const plato = await Plato.findByPk(item.id, {
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                
                if (!plato) {
                    throw { status: 404, mensaje: `El plato ${item.nombre || item.id} no existe.` };
                }

                // Validar cantidad numérica y positiva
                const cantidadSolicitada = parseInt(item.cantidad, 10);
                if (isNaN(cantidadSolicitada) || cantidadSolicitada <= 0) {
                    throw { status: 400, mensaje: `Cantidad inválida para el plato: ${plato.nombre}` };
                }

                if (plato.stock < cantidadSolicitada) {
                    throw { status: 400, mensaje: `Stock insuficiente para el plato: ${plato.nombre}` };
                }

                // 2. Descontar el stock real de forma segura dentro de la transacción
                await plato.update({ stock: plato.stock - cantidadSolicitada }, { transaction: t });

                // Calcular total seguro con el precio de la base de datos
                totalCalculadoReal += parseFloat(plato.precio) * cantidadSolicitada;
            }

            // 3. Crear el registro consolidado del pedido
            const pedidoCreado = await Pedido.create({
                usuarioId: usuarioIdInput,
                productos: JSON.stringify(productos), // Guardamos el detalle del carrito
                total: totalCalculadoReal,            // Usamos el total verificado por el backend
                estado: 'Pendiente'
            }, { transaction: t });

            return pedidoCreado;
        });

        res.status(201).json({ mensaje: "¡Pedido confirmado con éxito! 🛍️", pedido: nuevoPedido });

    } catch (err) {
        if (err.status) {
            // Son errores intencionados desde dentro de la transacción (ej: falta de stock)
            return res.status(err.status).json({ mensaje: err.mensaje });
        }
        console.error("Error al procesar pedido:", err);
        res.status(500).json({ error: "Error interno al procesar el pedido." });
    }
});

// OBTENER TODOS LOS PEDIDOS (PARA VENDEDORES Y ADMINS)
router.get('/todos', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ mensaje: 'No autorizado.' });
        
        // Verificación de rol a través del JWT
        const decoded = jwt.verify(token.split(' ')[1], 'secret_key_foodiebyte');
        if (decoded.rol !== 'vendedor' && decoded.rol !== 'admin') {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }

        const pedidos = await Pedido.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener pedidos:", err);
        res.status(500).json({ error: "Error interno al obtener los pedidos." });
    }
});

// ACTUALIZAR ESTADO DEL PEDIDO (PARA VENDEDORES Y ADMINS)
router.put('/:id/estado', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ mensaje: 'No autorizado.' });
        
        // Verificación de rol a través del JWT
        const decoded = jwt.verify(token.split(' ')[1], 'secret_key_foodiebyte');
        if (decoded.rol !== 'vendedor' && decoded.rol !== 'admin') {
            return res.status(403).json({ mensaje: 'Acceso denegado. Solo vendedores pueden cambiar el estado.' });
        }

        const { id } = req.params;
        const { nuevoEstado } = req.body;

        const estadosPermitidos = ['Pendiente', 'Enviado', 'Rechazado'];
        if (!estadosPermitidos.includes(nuevoEstado)) {
            return res.status(400).json({ mensaje: "Estado inválido." });
        }

        const pedido = await Pedido.findByPk(id);
        if (!pedido) return res.status(404).json({ mensaje: "Pedido no encontrado." });

        pedido.estado = nuevoEstado;
        await pedido.save();

        res.json({ mensaje: "Estado actualizado exitosamente.", pedido });
    } catch (err) {
        console.error("Error al actualizar estado:", err);
        res.status(500).json({ error: "Error interno al actualizar estado." });
    }
});
// OBTENER PEDIDOS POR USUARIO
router.get('/usuario/:usuarioId', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ mensaje: 'No autorizado. Token faltante.' });
        }

        const { usuarioId } = req.params;
        const pedidos = await Pedido.findAll({
            where: { usuarioId },
            order: [['createdAt', 'DESC']]
        });

        res.json(pedidos);
    } catch (err) {
        console.error("Error al obtener pedidos:", err);
        res.status(500).json({ error: "Error interno al obtener los pedidos." });
    }
});
// OBTENER ESTADÍSTICAS DEL VENDEDOR
router.get('/estadisticas', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ mensaje: 'No autorizado.' });
        }

        const totalFacturado = await Pedido.sum('total', { where: { estado: 'Enviado' } }) || 0;
        const totalPedidos = await Pedido.count();
        const platosEnAlerta = await Plato.findAll({
            where: {
                stock: { [Op.lt]: 5 }
            },
            attributes: ['id', 'nombre', 'stock']
        });

        res.json({
            totalFacturado,
            totalPedidos,
            platosEnAlerta
        });
    } catch (err) {
        console.error("Error al obtener estadísticas:", err);
        res.status(500).json({ error: "Error interno al obtener las estadísticas." });
    }
});

module.exports = router;