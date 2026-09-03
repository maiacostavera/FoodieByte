'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { Op } = require('sequelize');
const { Plato, Usuario, Pregunta } = require('../models');
const { autenticar, requiereRol } = require('../middleware/auth');
const { ROLES } = require('../config/seguridad');
const { CATEGORIAS } = require('../config/categorias');

const MIMES_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  // Ruta absoluta: si no, depende del directorio desde el que se arrancó node.
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'platos')),
  filename: (req, file, cb) => {
    const sufijo = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `imagen-${sufijo}${MIMES_PERMITIDOS[file.mimetype] || '.jpg'}`);
  }
});

const uploadPlato = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (MIMES_PERMITIDOS[file.mimetype]) return cb(null, true);
    cb(new Error('Formato no válido. Se aceptan imágenes .jpg, .png o .webp'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

/** Traduce los errores de carga de archivos a respuestas HTTP claras. */
const manejarErrorDeCarga = (err, res) => {
  if (err instanceof multer.MulterError) {
    const mensaje = err.code === 'LIMIT_FILE_SIZE'
      ? 'La imagen supera el tamaño máximo de 5 MB.'
      : 'No se pudo procesar la imagen enviada.';
    return res.status(400).json({ mensaje });
  }
  if (err.message && err.message.includes('Formato no válido')) {
    return res.status(400).json({ mensaje: err.message });
  }
  return null;
};

/** Valida y normaliza los campos que llegan desde el formulario del vendedor. */
const validarDatosDePlato = (body, { exigirTodos }) => {
  const datos = {};
  const errores = [];

  if (body.nombre !== undefined || exigirTodos) {
    const nombre = (body.nombre || '').trim();
    if (!nombre) errores.push('El nombre del plato es obligatorio.');
    else datos.nombre = nombre;
  }

  if (body.precio !== undefined || exigirTodos) {
    const precio = parseFloat(body.precio);
    if (Number.isNaN(precio) || precio <= 0) errores.push('El precio debe ser mayor a 0.');
    else datos.precio = precio;
  }

  if (body.stock !== undefined || exigirTodos) {
    const stock = parseInt(body.stock, 10);
    if (Number.isNaN(stock) || stock < 0 || stock > 100) {
      errores.push('El stock debe ser un número entre 0 y 100.');
    } else {
      datos.stock = stock;
    }
  }

  if (body.categoria !== undefined || exigirTodos) {
    if (!CATEGORIAS.includes(body.categoria)) errores.push('La categoría seleccionada no es válida.');
    else datos.categoria = body.categoria;
  }

  if (body.descripcion !== undefined) datos.descripcion = String(body.descripcion).trim();
  if (body.tiempo_prep !== undefined) datos.tiempo_prep = String(body.tiempo_prep).trim();

  // El FormData del navegador manda los booleanos como texto.
  if (body.es_vegano !== undefined) datos.es_vegano = body.es_vegano === true || body.es_vegano === 'true';
  if (body.es_sintacc !== undefined) datos.es_sintacc = body.es_sintacc === true || body.es_sintacc === 'true';

  return { datos, errores };
};

// LISTA DE CATEGORÍAS (pública) — evita duplicar la lista en el frontend
router.get('/categorias', (req, res) => res.json(CATEGORIAS));

// CATÁLOGO PÚBLICO (con búsqueda y filtro por categoría del lado del servidor)
router.get('/', async (req, res) => {
  try {
    const { busqueda, categoria } = req.query;
    const where = {};

    if (busqueda && busqueda.trim() !== '') {
      const texto = `%${busqueda.trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.like]: texto } },
        { descripcion: { [Op.like]: texto } },
        { categoria: { [Op.like]: texto } }
      ];
    }

    if (categoria && categoria !== 'Todos') {
      where.categoria = categoria;
    }

    const platos = await Plato.findAll({
      where,
      include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'nombre_local'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(platos);
  } catch (err) {
    console.error('Error al obtener el catálogo:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener los platos.' });
  }
});

// INVENTARIO DEL VENDEDOR AUTENTICADO
// El filtro por dueño se hace en la base, no en el navegador.
router.get('/mis-platos', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const where = req.usuario.rol === ROLES.ADMIN ? {} : { vendedorId: req.usuario.id };

    const platos = await Plato.findAll({
      where,
      include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'nombre_local'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(platos);
  } catch (err) {
    console.error('Error al obtener el inventario:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener el inventario.' });
  }
});

// CREAR PLATO
router.post('/', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), (req, res) => {
  uploadPlato.single('imagen')(req, res, async (errCarga) => {
    if (errCarga) {
      const respuesta = manejarErrorDeCarga(errCarga, res);
      if (respuesta) return respuesta;
      return res.status(500).json({ mensaje: 'Error al subir la imagen.' });
    }

    try {
      const { datos, errores } = validarDatosDePlato(req.body, { exigirTodos: true });
      if (errores.length > 0) return res.status(400).json({ mensaje: errores[0], errores });

      // El dueño sale siempre del token. Un vendedor no puede publicar
      // a nombre de otro local aunque mande vendedorId en el body.
      const vendedorId = req.usuario.rol === ROLES.ADMIN && req.body.vendedorId
        ? Number(req.body.vendedorId)
        : req.usuario.id;

      const nuevoPlato = await Plato.create({
        ...datos,
        vendedorId,
        imagenUrl: req.file ? `/uploads/platos/${req.file.filename}` : null
      });

      res.status(201).json({ mensaje: 'Plato creado con éxito.', plato: nuevoPlato });
    } catch (err) {
      console.error('Error al crear el plato:', err);
      res.status(500).json({ mensaje: 'Error interno al procesar el alta.' });
    }
  });
});

// ACTUALIZAR PLATO
router.put('/:id', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), (req, res) => {
  uploadPlato.single('imagen')(req, res, async (errCarga) => {
    if (errCarga) {
      const respuesta = manejarErrorDeCarga(errCarga, res);
      if (respuesta) return respuesta;
      return res.status(500).json({ mensaje: 'Error al subir la imagen.' });
    }

    try {
      const plato = await Plato.findByPk(req.params.id);
      if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

      if (req.usuario.rol !== ROLES.ADMIN && plato.vendedorId !== req.usuario.id) {
        return res.status(403).json({ mensaje: 'No tenés permisos sobre este producto.' });
      }

      const { datos, errores } = validarDatosDePlato(req.body, { exigirTodos: false });
      if (errores.length > 0) return res.status(400).json({ mensaje: errores[0], errores });

      if (req.file) datos.imagenUrl = `/uploads/platos/${req.file.filename}`;

      await plato.update(datos);
      res.json({ mensaje: 'Plato actualizado.', plato });
    } catch (err) {
      console.error('Error al actualizar el plato:', err);
      res.status(500).json({ mensaje: 'Error interno al actualizar el plato.' });
    }
  });
});

// ACTUALIZAR SOLO EL STOCK (desde la ficha del producto)
router.put('/:id/stock', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const stock = parseInt(req.body.stock, 10);
    if (Number.isNaN(stock) || stock < 0 || stock > 100) {
      return res.status(400).json({ mensaje: 'El stock debe ser un número entre 0 y 100.' });
    }

    const plato = await Plato.findByPk(req.params.id);
    if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

    if (req.usuario.rol !== ROLES.ADMIN && plato.vendedorId !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'Solo podés modificar el stock de tus propios platos.' });
    }

    await plato.update({ stock });
    res.json({ mensaje: 'Stock actualizado.', plato });
  } catch (err) {
    console.error('Error al actualizar el stock:', err);
    res.status(500).json({ mensaje: 'Error interno al actualizar el stock.' });
  }
});

// ELIMINAR PLATO
router.delete('/:id', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const plato = await Plato.findByPk(req.params.id);
    if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

    if (req.usuario.rol !== ROLES.ADMIN && plato.vendedorId !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'No tenés permisos sobre este producto.' });
    }

    await plato.destroy();
    res.json({ mensaje: 'Plato eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar el plato:', err);
    res.status(500).json({ mensaje: 'Error interno al eliminar el plato.' });
  }
});

// ---------------------------------------------------------------------------
// PREGUNTAS SOBRE UN PLATO
// ---------------------------------------------------------------------------

const incluirAutor = { model: Usuario, as: 'autor', attributes: ['id', 'nombre'] };

// LISTAR PREGUNTAS (público: se ven en la ficha del producto)
router.get('/:id/preguntas', async (req, res) => {
  try {
    const preguntas = await Pregunta.findAll({
      where: { platoId: req.params.id },
      include: [incluirAutor],
      order: [['createdAt', 'ASC']]
    });
    res.json(preguntas);
  } catch (err) {
    console.error('Error al obtener las preguntas:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener las preguntas.' });
  }
});

// PUBLICAR UNA PREGUNTA (solo foodies)
router.post('/:id/preguntas', autenticar, requiereRol(ROLES.FOODIE), async (req, res) => {
  try {
    const texto = (req.body.texto || '').trim();
    if (texto.length < 3) {
      return res.status(400).json({ mensaje: 'La consulta debe tener al menos 3 caracteres.' });
    }
    if (texto.length > 500) {
      return res.status(400).json({ mensaje: 'La consulta no puede superar los 500 caracteres.' });
    }

    const plato = await Plato.findByPk(req.params.id);
    if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

    const creada = await Pregunta.create({
      platoId: plato.id,
      usuarioId: req.usuario.id,
      texto
    });

    const pregunta = await Pregunta.findByPk(creada.id, { include: [incluirAutor] });
    res.status(201).json({ mensaje: 'Consulta enviada. El vendedor te responderá pronto.', pregunta });
  } catch (err) {
    console.error('Error al publicar la pregunta:', err);
    res.status(500).json({ mensaje: 'Error interno al enviar la consulta.' });
  }
});

// RESPONDER UNA PREGUNTA (solo el dueño del plato, o el admin)
router.put('/:platoId/preguntas/:preguntaId', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const respuesta = (req.body.respuesta || '').trim();
    if (respuesta.length < 2) {
      return res.status(400).json({ mensaje: 'La respuesta no puede estar vacía.' });
    }

    const pregunta = await Pregunta.findOne({
      where: { id: req.params.preguntaId, platoId: req.params.platoId },
      include: [{ model: Plato, as: 'plato', attributes: ['id', 'vendedorId'] }]
    });
    if (!pregunta) return res.status(404).json({ mensaje: 'Pregunta no encontrada.' });

    if (req.usuario.rol !== ROLES.ADMIN && pregunta.plato.vendedorId !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'Solo podés responder preguntas de tus propios platos.' });
    }

    await pregunta.update({ respuesta, respondidaEn: new Date() });

    const actualizada = await Pregunta.findByPk(pregunta.id, { include: [incluirAutor] });
    res.json({ mensaje: 'Respuesta publicada.', pregunta: actualizada });
  } catch (err) {
    console.error('Error al responder la pregunta:', err);
    res.status(500).json({ mensaje: 'Error interno al responder la consulta.' });
  }
});

module.exports = router;
