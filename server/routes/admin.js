'use strict';

const express = require('express');
const router = express.Router();
const { fn, col } = require('sequelize');
const { Usuario, Plato, Pedido, PedidoItem } = require('../models');
const { autenticar, requiereRol } = require('../middleware/auth');
const { validarIdDeRuta } = require('../middleware/validarId');
const { ROLES, COMISION_PLATAFORMA } = require('../config/seguridad');
const { responderError } = require('../utils/errores');

// Todas las rutas de este router son exclusivas del administrador.
router.use(autenticar, requiereRol(ROLES.ADMIN));

// Los ids de la URL se validan antes de consultar la base.
router.param('id', validarIdDeRuta);

const redondear = (valor) => Number(Number(valor || 0).toFixed(2));

// ---------------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------------
router.get('/usuarios', async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: [
        'id', 'nombre', 'email', 'rol', 'activo', 'createdAt', 'solicitud_vendedor',
        // Datos del formulario de alta, para poder evaluar la solicitud.
        'nombre_local', 'telefono', 'direccion', 'categoria_local',
        'descripcion_productos', 'solicitud_fecha'
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(usuarios);
  } catch (err) {
    responderError(res, err, { contexto: 'Error al obtener los usuarios', mensaje: 'Error interno al obtener los usuarios.' });
  }
});

router.put('/usuarios/:id/rol', async (req, res) => {
  try {
    const { nuevoRol } = req.body;

    if (!Object.values(ROLES).includes(nuevoRol)) {
      return res.status(400).json({ mensaje: 'Rol inválido.' });
    }

    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    // Un admin no puede quitarse a sí mismo los permisos y dejar la
    // plataforma sin administrador por accidente.
    if (usuario.id === req.usuario.id && nuevoRol !== ROLES.ADMIN) {
      return res.status(400).json({ mensaje: 'No podés cambiar tu propio rol de administrador.' });
    }

    // Al aprobar un vendedor se cierra su solicitud pendiente.
    const cambios = { rol: nuevoRol };
    if (nuevoRol !== ROLES.FOODIE) cambios.solicitud_vendedor = false;

    await usuario.update(cambios);

    res.json({
      mensaje: 'Rol actualizado exitosamente.',
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: nuevoRol }
    });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al cambiar el rol', mensaje: 'Error interno al cambiar el rol.' });
  }
});

router.put('/usuarios/:id/rechazar-vendedor', async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    await usuario.update({ solicitud_vendedor: false });
    res.json({ mensaje: 'Solicitud rechazada exitosamente.' });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al rechazar la solicitud', mensaje: 'Error interno al procesar el rechazo.' });
  }
});

/**
 * Las cuentas se desactivan en lugar de borrarse. Borrar un usuario eliminaba
 * en cascada sus pedidos, y con ellos cambiaban las liquidaciones ya
 * calculadas de los locales. Una cuenta desactivada no puede iniciar sesión
 * ni vender, pero su historial queda intacto y se puede reactivar.
 */
const cambiarActivacion = (activo) => async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado.' });

    if (!activo && usuario.id === req.usuario.id) {
      return res.status(400).json({ mensaje: 'No podés desactivar tu propia cuenta de administrador.' });
    }

    await usuario.update({ activo });
    res.json({
      mensaje: activo ? 'Cuenta reactivada.' : 'Cuenta desactivada: sus pedidos y ventas se conservan.',
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, activo }
    });
  } catch (err) {
    responderError(res, err, {
      contexto: activo ? 'Error al reactivar el usuario' : 'Error al desactivar el usuario',
      mensaje: 'Error interno al cambiar el estado de la cuenta.'
    });
  }
};

router.put('/usuarios/:id/desactivar', cambiarActivacion(false));
router.put('/usuarios/:id/reactivar', cambiarActivacion(true));

// ---------------------------------------------------------------------------
// PLATOS
// ---------------------------------------------------------------------------
router.get('/platos', async (req, res) => {
  try {
    const platos = await Plato.findAll({
      include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'email', 'nombre_local'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(platos);
  } catch (err) {
    responderError(res, err, { contexto: 'Error al obtener los platos', mensaje: 'Error interno al obtener los platos.' });
  }
});

router.delete('/platos/:id', async (req, res) => {
  try {
    const plato = await Plato.findByPk(req.params.id);
    if (!plato) return res.status(404).json({ mensaje: 'Plato no encontrado.' });

    await plato.destroy();
    res.json({ mensaje: 'Plato eliminado exitosamente.' });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al eliminar el plato', mensaje: 'Error interno al eliminar el plato.' });
  }
});

// ---------------------------------------------------------------------------
// PEDIDOS
// ---------------------------------------------------------------------------
router.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] },
        {
          model: PedidoItem,
          as: 'items',
          include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'nombre_local'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(pedidos);
  } catch (err) {
    responderError(res, err, { contexto: 'Error al obtener los pedidos', mensaje: 'Error interno al obtener los pedidos.' });
  }
});

// ---------------------------------------------------------------------------
// KPIs GLOBALES
// ---------------------------------------------------------------------------
router.get('/estadisticas', async (req, res) => {
  try {
    const [
      usuariosTotales,
      platosPublicados,
      localesActivos,
      pedidosEnviados,
      pedidosTotales,
      ventasConcretadas
    ] = await Promise.all([
      // Las cuentas desactivadas no cuentan como usuarios ni como locales, y
      // un plato solo está publicado si su local puede vender.
      Usuario.count({ where: { activo: true } }),
      Plato.count({
        include: [{ model: Usuario.scope('habilitadoParaVender'), as: 'vendedor', attributes: [], required: true }]
      }),
      Usuario.count({ where: { rol: ROLES.VENDEDOR, activo: true } }),
      Pedido.count({ where: { estado: 'Enviado' } }),
      Pedido.count(),
      // Solo factura lo despachado: los pedidos pendientes o rechazados
      // no generan comisión para la plataforma.
      PedidoItem.sum('subtotal', { where: { estado: 'Enviado' } })
    ]);

    const volumenVentas = redondear(ventasConcretadas);

    res.json({
      usuariosTotales,
      platosPublicados,
      localesActivos,
      pedidosEnviados,
      pedidosTotales,
      volumenVentas,
      porcentajeComision: COMISION_PLATAFORMA,
      gananciasPlataforma: redondear(volumenVentas * COMISION_PLATAFORMA)
    });
  } catch (err) {
    responderError(res, err, { contexto: 'Error al obtener las estadísticas', mensaje: 'Error interno al obtener las estadísticas.' });
  }
});

// ---------------------------------------------------------------------------
// LIQUIDACIÓN DE COMISIONES POR LOCAL
// Suma lo vendido por cada local (solo líneas despachadas) y calcula la
// comisión que la plataforma le cobra sobre esas ventas. Los locales
// desactivados siguen apareciendo: sus ventas pasadas existieron.
// ---------------------------------------------------------------------------
router.get('/comisiones-vendedores', async (req, res) => {
  try {
    const filas = await PedidoItem.findAll({
      attributes: [
        'vendedorId',
        [fn('SUM', col('subtotal')), 'totalVentas'],
        [fn('SUM', col('cantidad')), 'unidadesVendidas'],
        [fn('COUNT', fn('DISTINCT', col('pedidoId'))), 'cantidadPedidos']
      ],
      where: { estado: 'Enviado' },
      include: [{
        model: Usuario,
        as: 'vendedor',
        attributes: ['id', 'nombre', 'email', 'nombre_local'],
        required: true
      }],
      group: ['vendedorId', 'vendedor.id'],
      // Se ordena por la expresión agregada y no por su alias: los alias de
      // SELECT no son citables igual en todos los motores, y las comillas
      // invertidas de MySQL son sintaxis inválida en PostgreSQL.
      order: [[fn('SUM', col('subtotal')), 'DESC']],
      raw: true,
      nest: true
    });

    const liquidacion = filas.map(fila => {
      const totalVentas = redondear(fila.totalVentas);
      return {
        id: fila.vendedorId,
        nombre: fila.vendedor.nombre_local || fila.vendedor.nombre,
        email: fila.vendedor.email,
        cantidadPedidos: Number(fila.cantidadPedidos) || 0,
        unidadesVendidas: Number(fila.unidadesVendidas) || 0,
        totalVentas,
        porcentajeComision: COMISION_PLATAFORMA,
        comisionDebida: redondear(totalVentas * COMISION_PLATAFORMA),
        // Lo que le queda al local una vez descontada la comisión.
        netoVendedor: redondear(totalVentas * (1 - COMISION_PLATAFORMA))
      };
    });

    res.json(liquidacion);
  } catch (err) {
    responderError(res, err, { contexto: 'Error al calcular las comisiones', mensaje: 'Error interno al calcular las comisiones.' });
  }
});

module.exports = router;
