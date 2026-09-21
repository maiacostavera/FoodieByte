'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { autenticar } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN, ROLES } = require('../config/seguridad');
const { CATEGORIAS } = require('../config/categorias');
const { LIMITES } = require('../config/limites');
const { responderError } = require('../utils/errores');
const avisos = require('../utils/notificaciones');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El body es JSON arbitrario: un campo puede llegar como número u objeto, y
// llamar a .trim() sobre eso hacía fallar la ruta con un 500.
const comoTexto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// REGISTRO
router.post('/register', async (req, res) => {
  try {
    const nombre = comoTexto(req.body.nombre);
    const email = comoTexto(req.body.email).toLowerCase();
    const { password } = req.body;

    if (!nombre || !email || typeof password !== 'string' || !password) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }
    if (nombre.length < 2 || nombre.length > LIMITES.nombre) {
      return res.status(400).json({ mensaje: `El nombre debe tener entre 2 y ${LIMITES.nombre} caracteres.` });
    }
    if (email.length > LIMITES.email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ mensaje: 'El formato del email no es válido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }
    // bcrypt descarta lo que pasa de 72 bytes: dos contraseñas iguales hasta
    // ahí serían equivalentes sin que nadie lo note.
    if (Buffer.byteLength(password, 'utf8') > LIMITES.password) {
      return res.status(400).json({ mensaje: `La contraseña no puede superar los ${LIMITES.password} caracteres.` });
    }

    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(409).json({ mensaje: 'Este correo ya se encuentra registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // El rol nunca se toma del body: todo registro público nace como foodie.
    await Usuario.create({
      nombre,
      email,
      password: hashedPassword,
      rol: ROLES.FOODIE
    });

    res.status(201).json({ mensaje: '¡Cuenta creada! Ya podés iniciar sesión.' });
  } catch (err) {
    // Dos altas simultáneas con el mismo email pasan la consulta previa: la
    // restricción única de la base frena a la segunda y se informa como 409.
    responderError(res, err, {
      contexto: 'Error al registrar usuario',
      mensaje: 'Error interno al registrarse.',
      conflicto: 'Este correo ya se encuentra registrado.'
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const email = comoTexto(req.body.email).toLowerCase();
    const { password } = req.body;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await Usuario.findOne({ where: { email } });

    // Mismo mensaje para email inexistente y contraseña incorrecta: si los
    // diferenciamos, cualquiera puede averiguar qué correos están registrados.
    const credencialesInvalidas = { mensaje: 'Email o contraseña incorrectos.' };
    if (!usuario) return res.status(401).json(credencialesInvalidas);

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) return res.status(401).json(credencialesInvalidas);

    // Se informa recién después de validar la contraseña: así no sirve para
    // averiguar qué correos están registrados.
    if (!usuario.activo) {
      return res.status(403).json({ mensaje: 'Tu cuenta está desactivada. Contactá a un administrador.' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      mensaje: '¡Bienvenido!',
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        nombre: usuario.nombre,
        nombre_local: usuario.nombre_local,
        solicitud_vendedor: usuario.solicitud_vendedor
      }
    });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al iniciar sesión', mensaje: 'Error interno en el servidor.' });
  }
});

// PERFIL DEL USUARIO AUTENTICADO
// El front lo usa al recargar la página para revalidar la sesión guardada.
router.get('/perfil', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: ['id', 'nombre', 'email', 'rol', 'solicitud_vendedor', 'nombre_local']
    });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (err) {
    responderError(res, err, { contexto: 'Error al obtener el perfil', mensaje: 'Error interno al obtener el perfil.' });
  }
});

// SOLICITAR SER VENDEDOR
router.post('/solicitar-vendedor', autenticar, async (req, res) => {
  try {
    const nombreLocal = comoTexto(req.body.nombreLocal);
    const descripcionProductos = comoTexto(req.body.descripcionProductos);
    const direccion = comoTexto(req.body.direccion);
    // El teléfono puede llegar como número según el cliente que lo envíe.
    const telefono = typeof req.body.telefono === 'number'
      ? String(req.body.telefono)
      : comoTexto(req.body.telefono);
    const { categoria } = req.body;

    if (!nombreLocal || !descripcionProductos || !telefono || !direccion || !categoria) {
      return res.status(400).json({
        mensaje: 'Todos los campos (nombre, descripción, teléfono, dirección y categoría) son obligatorios.'
      });
    }

    const campos = [
      ['nombre del local', nombreLocal, LIMITES.nombreLocal],
      ['teléfono', telefono, LIMITES.telefono],
      ['dirección', direccion, LIMITES.direccion],
      ['descripción', descripcionProductos, LIMITES.descripcion]
    ];
    const excedido = campos.find(([, valor, limite]) => valor.length > limite);
    if (excedido) {
      const [campo, , limite] = excedido;
      return res.status(400).json({ mensaje: `El campo ${campo} no puede superar los ${limite} caracteres.` });
    }

    const categoriasValidas = [...CATEGORIAS, 'Otros'];
    if (!categoriasValidas.includes(categoria)) {
      return res.status(400).json({ mensaje: 'La categoría seleccionada no es válida.' });
    }

    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    if (usuario.rol === ROLES.VENDEDOR || usuario.rol === ROLES.ADMIN) {
      return res.status(400).json({ mensaje: 'Ya poseés un rol de gestión.' });
    }
    if (usuario.solicitud_vendedor) {
      return res.status(409).json({ mensaje: 'Ya tenés una solicitud pendiente de revisión.' });
    }

    // Guardamos los datos del formulario para que el administrador pueda
    // evaluar la solicitud con información real y no a ciegas.
    await usuario.update({
      solicitud_vendedor: true,
      solicitud_fecha: new Date(),
      nombre_local: nombreLocal,
      descripcion_productos: descripcionProductos,
      telefono,
      direccion,
      categoria_local: categoria
    });

    await avisos.solicitudDeLocal({
      nombreSolicitante: usuario.nombre,
      nombreLocal: nombreLocal.trim()
    });


    res.json({ mensaje: '¡Solicitud enviada con éxito! Un administrador la revisará pronto.' });
  } catch (err) {
    responderError(res, err, {
      contexto: 'Error al solicitar el alta de vendedor',
      mensaje: 'Error interno al procesar la solicitud.'
    });
  }
});

module.exports = router;
