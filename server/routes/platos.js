const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Plato } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/platos/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg');
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(new Error('Formato no válido. El sistema solo acepta imágenes .jpg'), false);
    }
};

const uploadPlato = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// OBTENER PLATOS (con búsqueda y filtro por categoría desde el servidor)
router.get('/', async (req, res) => {
    try {
        const { busqueda, categoria } = req.query;
        const where = {};

        if (busqueda && busqueda.trim() !== '') {
            where.nombre = { [Op.like]: `%${busqueda.trim()}%` };
        }

        if (categoria && categoria !== 'Todos') {
            where.categoria = categoria;
        }

        const platos = await Plato.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(platos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREAR PLATO
router.post('/', uploadPlato.single('imagen'), async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) return res.status(401).json({ mensaje: 'No autorizado.' });

        const decoded = jwt.verify(tokenHeader.split(' ')[1], 'secret_key_foodiebyte');
        if (!['vendedor', 'admin'].includes(decoded.rol)) {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }

        const {
            nombre, descripcion, precio, categoria,
            stock, tiempo_prep, es_vegano, es_sintacc
        } = req.body;

        if (!nombre || !precio || stock < 1) {
            return res.status(400).json({ mensaje: "Faltan datos obligatorios o el stock es inválido." });
        }

        if (parseFloat(precio) <= 0) {
            return res.status(400).json({ mensaje: "El precio debe ser mayor a 0." });
        }

        const imagenUrl = req.file ? `/uploads/platos/${req.file.filename}` : req.body.imagenUrl;
        // Asignación estricta de propiedad (multitenencia)
        const vendedorId = decoded.rol === 'admin' && req.body.vendedorId ? req.body.vendedorId : decoded.id;

        const nuevoPlato = await Plato.create({
            nombre, descripcion, precio, categoria, stock,
            tiempo_prep, es_vegano, es_sintacc, vendedorId, imagenUrl
        });

        res.status(201).json({ mensaje: "Plato creado con éxito", plato: nuevoPlato });
    } catch (err) {
        console.error("Error al crear plato:", err);
        if (err instanceof multer.MulterError || err.message.includes('Formato no válido')) {
            return res.status(400).json({ mensaje: err.message });
        }
        res.status(500).json({ error: "Error interno al procesar el alta." });
    }
});

// ACTUALIZAR PLATO
router.put('/:id', uploadPlato.single('imagen'), async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) return res.status(401).json({ mensaje: 'No autorizado.' });

        const decoded = jwt.verify(tokenHeader.split(' ')[1], 'secret_key_foodiebyte');
        if (!['vendedor', 'admin'].includes(decoded.rol)) {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }

        const { id } = req.params;
        const plato = await Plato.findByPk(id);
        if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado' });

        // El admin puede tocar todo, el vendedor solo lo suyo:
        if (decoded.rol !== 'admin' && plato.vendedorId !== decoded.id) {
            return res.status(403).json({ mensaje: 'Acceso denegado: No tienes permisos sobre este producto.' });
        }

        let updateData = { ...req.body };
        if (req.file) {
            updateData.imagenUrl = `/uploads/platos/${req.file.filename}`;
        }
        if (decoded.rol !== 'admin') {
            delete updateData.vendedorId;
        }

        await plato.update(updateData);
        res.json({ mensaje: "¡Actualizado!", plato });
    } catch (err) {
        if (err instanceof multer.MulterError || err.message.includes('Formato no válido')) {
            return res.status(400).json({ mensaje: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});

// ACTUALIZAR STOCK (para vendedores desde la publicación)
router.put('/:id/stock', async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) return res.status(401).json({ mensaje: 'No autorizado.' });

        const decoded = jwt.verify(tokenHeader.split(' ')[1], 'secret_key_foodiebyte');
        if (!['vendedor', 'admin'].includes(decoded.rol)) {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }

        const { stock } = req.body;
        if (stock === undefined || stock < 0) {
            return res.status(400).json({ mensaje: 'El stock debe ser un número mayor o igual a 0.' });
        }

        const plato = await Plato.findByPk(req.params.id);
        if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

        if (decoded.rol === 'vendedor' && plato.vendedorId !== decoded.id) {
            return res.status(403).json({ mensaje: 'Solo podés modificar el stock de tus propios platos.' });
        }

        await plato.update({ stock });
        res.json({ mensaje: 'Stock actualizado.', plato });
    } catch (err) {
        console.error('Error al actualizar stock:', err);
        res.status(500).json({ error: 'Error interno al actualizar el stock.' });
    }
});

// ELIMINAR PLATO
router.delete('/:id', async (req, res) => {
    try {
        const tokenHeader = req.headers.authorization;
        if (!tokenHeader) return res.status(401).json({ mensaje: 'No autorizado.' });

        const decoded = jwt.verify(tokenHeader.split(' ')[1], 'secret_key_foodiebyte');
        if (!['vendedor', 'admin'].includes(decoded.rol)) {
            return res.status(403).json({ mensaje: 'Acceso denegado.' });
        }

        const plato = await Plato.findByPk(req.params.id);
        if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

        // El admin puede tocar todo, el vendedor solo lo suyo:
        if (decoded.rol !== 'admin' && plato.vendedorId !== decoded.id) {
            return res.status(403).json({ mensaje: 'Acceso denegado: No tienes permisos sobre este producto.' });
        }

        await plato.destroy();
        res.json({ mensaje: "Plato eliminado exitosamente." });
    } catch (err) {
        console.error("Error al eliminar plato:", err);
        res.status(500).json({ error: "Error interno al eliminar el plato." });
    }
});

module.exports = router;
