'use strict';

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Pedido, PedidoItem, Plato, Usuario, sequelize } = require('../models');
const { autenticar, requiereRol } = require('../middleware/auth');
const { ROLES } = require('../config/seguridad');

const ESTADOS = Pedido.ESTADOS;

const incluirDetalle = [
  {
    model: PedidoItem,
    as: 'items',
    include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'nombre_local'] }]
  }
];

/**
 * El estado del pedido se deriva del estado de sus líneas:
 * queda Enviado solo si todos los locales despacharon su parte,
 * Rechazado si todos la rechazaron, y Pendiente mientras falte alguno.
 */
const calcularEstadoDelPedido = (items) => {
  if (items.length === 0) return 'Pendiente';
  if (items.every(i => i.estado === 'Enviado')) return 'Enviado';
  if (items.every(i => i.estado === 'Rechazado')) return 'Rechazado';
  return 'Pendiente';
};

const sincronizarEstadoDelPedido = async (pedidoId, transaction = null) => {
  const items = await PedidoItem.findAll({ where: { pedidoId }, transaction });
  const estado = calcularEstadoDelPedido(items);
  await Pedido.update({ estado }, { where: { id: pedidoId }, transaction });
  return estado;
};

// ---------------------------------------------------------------------------
// CREAR PEDIDO (solo foodies)
// ---------------------------------------------------------------------------
router.post('/', autenticar, requiereRol(ROLES.FOODIE), async (req, res) => {
  const { productos } = req.body;

  if (!Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ mensaje: 'El carrito está vacío o es inválido.' });
  }

  // Consolidamos por id: si el mismo plato llega repetido, sumamos cantidades
  // para no descontar stock dos veces ni bloquear la misma fila dos veces.
  const consolidados = new Map();
  for (const item of productos) {
    const id = Number(item.id);
    const cantidad = parseInt(item.cantidad, 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ mensaje: 'El carrito contiene un producto inválido.' });
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad de cada producto debe ser un entero mayor a 0.' });
    }
    consolidados.set(id, (consolidados.get(id) || 0) + cantidad);
  }

  // Orden estable por id: dos compras simultáneas bloquean las filas en el
  // mismo orden y no se produce un interbloqueo (deadlock) entre ellas.
  const idsOrdenados = [...consolidados.keys()].sort((a, b) => a - b);

  const t = await sequelize.transaction();
  try {
    let totalCalculado = 0;
    const lineas = [];

    for (const platoId of idsOrdenados) {
      const cantidad = consolidados.get(platoId);

      const plato = await Plato.findByPk(platoId, { transaction: t, lock: t.LOCK.UPDATE });
      if (!plato) {
        await t.rollback();
        return res.status(404).json({ mensaje: `El plato con id ${platoId} ya no está disponible.` });
      }
      if (plato.stock < cantidad) {
        await t.rollback();
        return res.status(409).json({
          mensaje: `Stock insuficiente de "${plato.nombre}". Quedan ${plato.stock} unidades.`
        });
      }

      await plato.decrement('stock', { by: cantidad, transaction: t });

      // El precio sale siempre de la base, nunca del carrito del navegador:
      // así el cliente no puede manipular el importe que se cobra.
      const precioUnitario = Number(plato.precio);
      const subtotal = precioUnitario * cantidad;
      totalCalculado += subtotal;

      lineas.push({
        platoId: plato.id,
        vendedorId: plato.vendedorId,
        nombrePlato: plato.nombre,
        precioUnitario,
        cantidad,
        subtotal,
        estado: 'Pendiente'
      });
    }

    const nuevoPedido = await Pedido.create({
      usuarioId: req.usuario.id,
      total: Number(totalCalculado.toFixed(2)),
      estado: 'Pendiente'
    }, { transaction: t });

    await PedidoItem.bulkCreate(
      lineas.map(linea => ({ ...linea, pedidoId: nuevoPedido.id })),
      { transaction: t }
    );

    await t.commit();

    const pedido = await Pedido.findByPk(nuevoPedido.id, { include: incluirDetalle });
    res.status(201).json({ mensaje: '¡Pedido confirmado con éxito! 🛍️', pedido });
  } catch (err) {
    await t.rollback();
    console.error('Error al procesar la transacción del pedido:', err);
    res.status(500).json({ mensaje: 'Error interno al procesar el pedido.' });
  }
});

// ---------------------------------------------------------------------------
// MIS PEDIDOS (el usuario del token, nunca un id de la URL)
// ---------------------------------------------------------------------------
router.get('/mis-pedidos', autenticar, async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: { usuarioId: req.usuario.id },
      include: incluirDetalle,
      order: [['createdAt', 'DESC']]
    });
    res.json(pedidos);
  } catch (err) {
    console.error('Error al obtener los pedidos del usuario:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener los pedidos.' });
  }
});

// ---------------------------------------------------------------------------
// COMANDAS DEL VENDEDOR
// Cada local recibe únicamente los pedidos que incluyen platos suyos, y de
// esos pedidos solo sus propias líneas. El administrador ve todo.
// ---------------------------------------------------------------------------
router.get('/comandas', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const esAdmin = req.usuario.rol === ROLES.ADMIN;

    const pedidos = await Pedido.findAll({
      include: [
        {
          model: PedidoItem,
          as: 'items',
          required: !esAdmin,
          where: esAdmin ? undefined : { vendedorId: req.usuario.id },
          include: [{ model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'nombre_local'] }]
        },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Para el vendedor el importe relevante es el de sus líneas, no el total
    // del pedido (que puede incluir platos de otros locales).
    const respuesta = pedidos.map(pedido => {
      const plano = pedido.toJSON();
      plano.totalVendedor = plano.items.reduce((acc, item) => acc + Number(item.subtotal), 0);
      plano.estadoVendedor = calcularEstadoDelPedido(plano.items);
      return plano;
    });

    res.json(respuesta);
  } catch (err) {
    console.error('Error al obtener las comandas:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener las comandas.' });
  }
});

// ---------------------------------------------------------------------------
// CAMBIAR EL ESTADO DE LAS LÍNEAS PROPIAS DE UN PEDIDO
// ---------------------------------------------------------------------------
router.put('/:id/estado', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nuevoEstado } = req.body;
    if (!ESTADOS.includes(nuevoEstado)) {
      await t.rollback();
      return res.status(400).json({ mensaje: 'Estado inválido.' });
    }

    const pedido = await Pedido.findByPk(req.params.id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ mensaje: 'Pedido no encontrado.' });
    }

    const esAdmin = req.usuario.rol === ROLES.ADMIN;
    const filtro = { pedidoId: pedido.id };
    if (!esAdmin) filtro.vendedorId = req.usuario.id;

    const [actualizadas] = await PedidoItem.update(
      { estado: nuevoEstado },
      { where: filtro, transaction: t }
    );

    // Sin líneas propias en este pedido, el vendedor no tiene nada que gestionar acá.
    if (actualizadas === 0) {
      await t.rollback();
      return res.status(403).json({ mensaje: 'Este pedido no incluye productos de tu local.' });
    }

    const estadoGeneral = await sincronizarEstadoDelPedido(pedido.id, t);
    await t.commit();

    res.json({
      mensaje: 'Estado actualizado exitosamente.',
      estadoVendedor: nuevoEstado,
      estadoPedido: estadoGeneral
    });
  } catch (err) {
    await t.rollback();
    console.error('Error al actualizar el estado del pedido:', err);
    res.status(500).json({ mensaje: 'Error interno al actualizar el estado.' });
  }
});

// ---------------------------------------------------------------------------
// ESTADÍSTICAS DEL VENDEDOR (solo sobre sus propios datos)
// ---------------------------------------------------------------------------
router.get('/estadisticas', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  try {
    const esAdmin = req.usuario.rol === ROLES.ADMIN;
    const filtroVendedor = esAdmin ? {} : { vendedorId: req.usuario.id };

    const totalFacturado = await PedidoItem.sum('subtotal', {
      where: { ...filtroVendedor, estado: 'Enviado' }
    }) || 0;

    // Pedidos distintos que incluyen al menos un producto del local.
    const pedidosDistintos = await PedidoItem.count({
      where: filtroVendedor,
      distinct: true,
      col: 'pedidoId'
    });

    const pedidosPendientes = await PedidoItem.count({
      where: { ...filtroVendedor, estado: 'Pendiente' },
      distinct: true,
      col: 'pedidoId'
    });

    const platosEnAlerta = await Plato.findAll({
      where: {
        stock: { [Op.lt]: 5 },
        ...(esAdmin ? {} : { vendedorId: req.usuario.id })
      },
      attributes: ['id', 'nombre', 'stock'],
      order: [['stock', 'ASC']]
    });

    res.json({
      totalFacturado: Number(Number(totalFacturado).toFixed(2)),
      totalPedidos: pedidosDistintos,
      pedidosPendientes,
      platosEnAlerta
    });
  } catch (err) {
    console.error('Error al obtener las estadísticas del vendedor:', err);
    res.status(500).json({ mensaje: 'Error interno al obtener las estadísticas.' });
  }
});

module.exports = router;
