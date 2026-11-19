'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Op } = require('sequelize');
const { Plato, Usuario, Pregunta } = require('../models');
const { autenticar, requiereRol } = require('../middleware/auth');
const { validarIdDeRuta } = require('../middleware/validarId');
const { ROLES } = require('../config/seguridad');
const { CATEGORIAS } = require('../config/categorias');
const { LIMITES, MAX_INTEGER } = require('../config/limites');
const { responderError } = require('../utils/errores');
const avisos = require('../utils/notificaciones');
const { CARPETA_PLATOS, esImagenValida, borrarArchivo } = require('../utils/imagenes');

// Los ids de la URL se validan antes de consultar la base.
router.param('id', validarIdDeRuta);
router.param('platoId', validarIdDeRuta);
router.param('preguntaId', validarIdDeRuta);

const MIMES_PERMITIDOS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  // Ruta absoluta: si no, depende del directorio desde el que se arrancó node.
  destination: (req, file, cb) => cb(null, CARPETA_PLATOS),
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

const IMAGEN_INVALIDA = { mensaje: 'El archivo no es una imagen .jpg, .png o .webp válida.' };

/**
 * Convierte a número sin aceptar texto de más. parseFloat("12abc") da 12 y
 * parseInt("5.7") da 5: el plato se guardaba con otro valor sin avisar. Acá
 * "12abc" y "5,7" son inválidos, y "5.7" sigue siendo 5.7 para que la
 * validación de entero lo rechace.
 */
const aNumeroEstricto = (valor) => {
  if (typeof valor === 'number') return valor;
  if (typeof valor !== 'string' || !/^\s*\d+(\.\d+)?\s*$/.test(valor)) return NaN;
  return Number(valor);
};

const esStockValido = (stock) => Number.isInteger(stock) && stock >= 0 && stock <= LIMITES.stock;

/** Valida y normaliza los campos que llegan desde el formulario del vendedor. */
const validarDatosDePlato = (body, { exigirTodos }) => {
  const datos = {};
  const errores = [];

  if (body.nombre !== undefined || exigirTodos) {
    const nombre = String(body.nombre ?? '').trim();
    if (!nombre) errores.push('El nombre del plato es obligatorio.');
    else if (nombre.length > LIMITES.nombre) errores.push(`El nombre del plato no puede superar los ${LIMITES.nombre} caracteres.`);
    else datos.nombre = nombre;
  }

  if (body.precio !== undefined || exigirTodos) {
    const precio = aNumeroEstricto(body.precio);
    if (!Number.isFinite(precio) || precio <= 0) errores.push('El precio debe ser un número mayor a 0.');
    else if (precio > LIMITES.precio) errores.push('El precio supera el máximo permitido.');
    // La columna guarda dos decimales: 0.001 se habría guardado como $0,00.
    else if (Math.abs(Math.round(precio * 100) - precio * 100) > 1e-6) errores.push('El precio puede tener hasta 2 decimales.');
    else datos.precio = precio;
  }

  if (body.stock !== undefined || exigirTodos) {
    const stock = aNumeroEstricto(body.stock);
    if (!esStockValido(stock)) {
      errores.push(`El stock debe ser un número entre 0 y ${LIMITES.stock}.`);
    } else {
      datos.stock = stock;
    }
  }

  if (body.categoria !== undefined || exigirTodos) {
    if (!CATEGORIAS.includes(body.categoria)) errores.push('La categoría seleccionada no es válida.');
    else datos.categoria = body.categoria;
  }

  if (body.descripcion !== undefined) {
    const descripcion = String(body.descripcion).trim();
    if (descripcion.length > LIMITES.descripcion) {
      errores.push(`La descripción no puede superar los ${LIMITES.descripcion} caracteres.`);
    } else {
      datos.descripcion = descripcion;
    }
  }

  if (body.tiempo_prep !== undefined) {
    const tiempoPrep = String(body.tiempo_prep).trim();
    if (tiempoPrep.length > LIMITES.tiempoPrep) {
      errores.push(`El tiempo de preparación no puede superar los ${LIMITES.tiempoPrep} caracteres.`);
    } else {
      datos.tiempo_prep = tiempoPrep;
    }
  }

  // El FormData del navegador manda los booleanos como texto.
  if (body.es_vegano !== undefined) datos.es_vegano = body.es_vegano === true || body.es_vegano === 'true';
  if (body.es_sintacc !== undefined) datos.es_sintacc = body.es_sintacc === true || body.es_sintacc === 'true';

  return { datos, errores };
};

/**
 * En ILIKE, % y _ son comodines. Se escapan para que la búsqueda tome lo que
 * escribió el usuario como texto literal: buscar "%" no debe traer todo.
 */
const escaparComodines = (texto) => texto.replace(/[\\%_]/g, '\\$&');

// LISTA DE CATEGORÍAS (pública) — evita duplicar la lista en el frontend
router.get('/categorias', (req, res) => res.json(CATEGORIAS));

// CATÁLOGO PÚBLICO (con búsqueda y filtro por categoría del lado del servidor)
router.get('/', async (req, res) => {
  try {
    // Con un parámetro repetido (?busqueda=a&busqueda=b) Express entrega un
    // array en lugar de un texto: se ignora en vez de romper la consulta.
    const busqueda = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : '';
    const where = {};

    if (busqueda !== '') {
      const texto = `%${escaparComodines(busqueda)}%`;
      // iLike (ILIKE de PostgreSQL) ignora mayúsculas y minúsculas. Con LIKE
      // a secas, buscar "pizza" no encontraría "Pizza Margherita": en MySQL
      // funcionaba por la colación por defecto, en PostgreSQL no.
      where[Op.or] = [
        { nombre: { [Op.iLike]: texto } },
        { descripcion: { [Op.iLike]: texto } },
        { categoria: { [Op.iLike]: texto } }
      ];
    }

    if (categoria && categoria !== 'Todos') {
      where.categoria = categoria;
    }

    const platos = await Plato.findAll({
      where,
      include: [{
        // Solo se publican los platos de locales habilitados: si el local se
        // desactiva o pierde el rol de vendedor, sus platos salen del catálogo.
        model: Usuario.scope('habilitadoParaVender'),
        as: 'vendedor',
        attributes: ['id', 'nombre', 'nombre_local'],
        required: true
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(platos);
  } catch (err) {
    responderError(res, err, { contexto: 'Error al obtener el catálogo', mensaje: 'Error interno al obtener los platos.' });
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
    responderError(res, err, { contexto: 'Error al obtener el inventario', mensaje: 'Error interno al obtener el inventario.' });
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

    // Multer ya guardó la imagen en disco antes de validar el resto: si el
    // alta no prospera, se borra para no dejar un archivo huérfano.
    const descartarImagen = () => borrarArchivo(req.file?.path);

    try {
      if (req.file && !(await esImagenValida(req.file.path))) {
        await descartarImagen();
        return res.status(400).json(IMAGEN_INVALIDA);
      }

      const { datos, errores } = validarDatosDePlato(req.body, { exigirTodos: true });
      if (errores.length > 0) {
        await descartarImagen();
        return res.status(400).json({ mensaje: errores[0], errores });
      }

      // El dueño sale siempre del token. Un vendedor no puede publicar
      // a nombre de otro local aunque mande vendedorId en el body.
      const vendedorId = req.usuario.rol === ROLES.ADMIN && req.body.vendedorId
        ? Number(req.body.vendedorId)
        : req.usuario.id;

      // El admin puede publicar a nombre de un local, pero tiene que ser un
      // local habilitado: asignado a un cliente o a una cuenta desactivada, el
      // plato quedaba guardado sin aparecer en ningún catálogo.
      if (vendedorId !== req.usuario.id) {
        const localValido = Number.isInteger(vendedorId) && vendedorId > 0 && vendedorId <= MAX_INTEGER &&
          await Usuario.scope('habilitadoParaVender').count({ where: { id: vendedorId } });
        if (!localValido) {
          await descartarImagen();
          return res.status(400).json({ mensaje: 'El plato tiene que pertenecer a un local activo.' });
        }
      }

      const nuevoPlato = await Plato.create({
        ...datos,
        vendedorId,
        imagenUrl: req.file ? `/uploads/platos/${req.file.filename}` : null
      });

      res.status(201).json({ mensaje: 'Plato creado con éxito.', plato: nuevoPlato });
    } catch (err) {
      await descartarImagen();
      responderError(res, err, { contexto: 'Error al crear el plato', mensaje: 'Error interno al procesar el alta.' });
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

    // Si la edición no prospera, la imagen nueva se borra. Si prospera, el
    // modelo Plato borra la anterior.
    const descartarImagen = () => borrarArchivo(req.file?.path);

    try {
      const plato = await Plato.findByPk(req.params.id);
      if (!plato) {
        await descartarImagen();
        return res.status(404).json({ mensaje: 'Plato no encontrado.' });
      }

      if (req.usuario.rol !== ROLES.ADMIN && plato.vendedorId !== req.usuario.id) {
        await descartarImagen();
        return res.status(403).json({ mensaje: 'No tenés permisos sobre este producto.' });
      }

      if (req.file && !(await esImagenValida(req.file.path))) {
        await descartarImagen();
        return res.status(400).json(IMAGEN_INVALIDA);
      }

      const { datos, errores } = validarDatosDePlato(req.body, { exigirTodos: false });
      if (errores.length > 0) {
        await descartarImagen();
        return res.status(400).json({ mensaje: errores[0], errores });
      }

      if (req.file) datos.imagenUrl = `/uploads/platos/${req.file.filename}`;

      await plato.update(datos);
      res.json({ mensaje: 'Plato actualizado.', plato });
    } catch (err) {
      await descartarImagen();
      responderError(res, err, { contexto: 'Error al actualizar el plato', mensaje: 'Error interno al actualizar el plato.' });
    }
  });
});

// ACTUALIZAR SOLO EL STOCK (desde la ficha del producto)
router.put('/:id/stock', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const stock = aNumeroEstricto(req.body.stock);
    if (!esStockValido(stock)) {
      return res.status(400).json({ mensaje: `El stock debe ser un número entre 0 y ${LIMITES.stock}.` });
    }

    const plato = await Plato.findByPk(req.params.id);
    if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

    if (req.usuario.rol !== ROLES.ADMIN && plato.vendedorId !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'Solo podés modificar el stock de tus propios platos.' });
    }

    await plato.update({ stock });
    res.json({ mensaje: 'Stock actualizado.', plato });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al actualizar el stock', mensaje: 'Error interno al actualizar el stock.' });
  }
});

// ELIMINAR PLATO (el modelo borra también su imagen del disco)
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
    responderError(res, err, { contexto: 'Error al eliminar el plato', mensaje: 'Error interno al eliminar el plato.' });
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
    responderError(res, err, { contexto: 'Error al obtener las preguntas', mensaje: 'Error interno al obtener las preguntas.' });
  }
});

// PUBLICAR UNA PREGUNTA (solo foodies)
router.post('/:id/preguntas', autenticar, requiereRol(ROLES.FOODIE), async (req, res) => {
  try {
    // El body es JSON arbitrario: un número u objeto en lugar de texto daba un 500.
    const texto = typeof req.body.texto === 'string' ? req.body.texto.trim() : '';
    if (texto.length < 3) {
      return res.status(400).json({ mensaje: 'La consulta debe tener al menos 3 caracteres.' });
    }
    if (texto.length > LIMITES.pregunta) {
      return res.status(400).json({ mensaje: `La consulta no puede superar los ${LIMITES.pregunta} caracteres.` });
    }

    const plato = await Plato.findByPk(req.params.id);
    if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

    const creada = await Pregunta.create({
      platoId: plato.id,
      usuarioId: req.usuario.id,
      texto
    });

    await avisos.preguntaRecibida({
      vendedorId: plato.vendedorId,
      platoId: plato.id,
      nombrePlato: plato.nombre,
      texto
    });

    const pregunta = await Pregunta.findByPk(creada.id, { include: [incluirAutor] });
    res.status(201).json({ mensaje: 'Consulta enviada. El vendedor te responderá pronto.', pregunta });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al publicar la pregunta', mensaje: 'Error interno al enviar la consulta.' });
  }
});

// RESPONDER UNA PREGUNTA (solo el dueño del plato, o el admin)
router.put('/:platoId/preguntas/:preguntaId', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const respuesta = typeof req.body.respuesta === 'string' ? req.body.respuesta.trim() : '';
    if (respuesta.length < 2) {
      return res.status(400).json({ mensaje: 'La respuesta no puede estar vacía.' });
    }
    // La columna es TEXT y no tiene tope propio: sin este límite se guardaba
    // cualquier largo. Es el mismo máximo que ya tenía el campo de la ficha.
    if (respuesta.length > LIMITES.respuesta) {
      return res.status(400).json({ mensaje: `La respuesta no puede superar los ${LIMITES.respuesta} caracteres.` });
    }

    const pregunta = await Pregunta.findOne({
      where: { id: req.params.preguntaId, platoId: req.params.platoId },
      include: [{ model: Plato, as: 'plato', attributes: ['id', 'nombre', 'vendedorId'] }]
    });
    if (!pregunta) return res.status(404).json({ mensaje: 'Pregunta no encontrada.' });

    if (req.usuario.rol !== ROLES.ADMIN && pregunta.plato.vendedorId !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'Solo podés responder preguntas de tus propios platos.' });
    }

    await pregunta.update({ respuesta, respondidaEn: new Date() });

    await avisos.preguntaRespondida({
      usuarioId: pregunta.usuarioId,
      platoId: pregunta.plato.id,
      nombrePlato: pregunta.plato.nombre,
      respuesta
    });

    const actualizada = await Pregunta.findByPk(pregunta.id, { include: [incluirAutor] });
    res.json({ mensaje: 'Respuesta publicada.', pregunta: actualizada });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al responder la pregunta', mensaje: 'Error interno al responder la consulta.' });
  }
});

module.exports = router;
