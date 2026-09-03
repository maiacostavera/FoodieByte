'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { autenticar } = require('../middleware/auth');
const { JWT_SECRET, JWT_EXPIRES_IN, ROLES } = require('../config/seguridad');
const { CATEGORIAS } = require('../config/categorias');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// REGISTRO
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }
    if (nombre.trim().length < 2) {
      return res.status(400).json({ mensaje: 'El nombre debe tener al menos 2 caracteres.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ mensaje: 'El formato del email no es válido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const emailNormalizado = email.trim().toLowerCase();

    const existe = await Usuario.findOne({ where: { email: emailNormalizado } });
    if (existe) {
      return res.status(409).json({ mensaje: 'Este correo ya se encuentra registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // El rol nunca se toma del body: todo registro público nace como foodie.
    await Usuario.create({
      nombre: nombre.trim(),
      email: emailNormalizado,
      password: hashedPassword,
      rol: ROLES.FOODIE
    });

    res.status(201).json({ mensaje: '¡Cuenta creada! Ya podés iniciar sesión.' });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ mensaje: 'Error interno al registrarse.' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } });

    // Mismo mensaje para email inexistente y contraseña incorrecta: si los
    // diferenciamos, cualquiera puede averiguar qué correos están registrados.
    const credencialesInvalidas = { mensaje: 'Email o contraseña incorrectos.' };
    if (!usuario) return res.status(401).json(credencialesInvalidas);

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) return res.status(401).json(credencialesInvalidas);

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
        nombre: usuario.nombre
      }
    });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    res.status(500).json({ mensaje: 'Error interno en el servidor.' });
  }
});

// PERFIL DEL USUARIO AUTENTICADO
// El front lo usa al recargar la página para revalidar la sesión guardada.
router.get('/perfil', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: ['id', 'nombre', 'email', 'rol', 'solicitud_vendedor']
    });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (err) {
    console.error('Error al obtener el perfil:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener el perfil.' });
  }
});

// SOLICITAR SER VENDEDOR
router.post('/solicitar-vendedor', autenticar, async (req, res) => {
  try {
    const { nombreLocal, descripcionProductos, telefono, direccion, categoria } = req.body;

    if (!nombreLocal || !descripcionProductos || !telefono || !direccion || !categoria) {
      return res.status(400).json({
        mensaje: 'Todos los campos (nombre, descripción, teléfono, dirección y categoría) son obligatorios.'
      });
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
      nombre_local: nombreLocal.trim(),
      descripcion_productos: descripcionProductos.trim(),
      telefono: String(telefono).trim(),
      direccion: direccion.trim(),
      categoria_local: categoria
    });

    res.json({ mensaje: '¡Solicitud enviada con éxito! Un administrador la revisará pronto.' });
  } catch (err) {
    console.error('Error al solicitar el alta de vendedor:', err);
    res.status(500).json({ mensaje: 'Error interno al procesar la solicitud.' });
  }
});

module.exports = router;
