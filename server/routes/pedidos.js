'use strict';

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Pedido, PedidoItem, Plato, Usuario, sequelize } = require('../models');
const { autenticar, requiereRol } = require('../middleware/auth');
const { validarIdDeRuta } = require('../middleware/validarId');
const { ROLES } = require('../config/seguridad');
const { LIMITES, MAX_INTEGER } = require('../config/limites');
const { responderError } = require('../utils/errores');
const { ventasPorDia, masVendidos } = require('../utils/estadisticas');

// Una línea pendiente solo puede pasar a uno de estos estados, y ahí queda:
// ni Enviado ni Rechazado se pueden revertir.
const ESTADOS_FINALES = ['Enviado', 'Rechazado'];

// Los ids de la URL se validan antes de consultar la base.
router.param('id', validarIdDeRuta);

/**
 * Error de negocio lanzado dentro de una transacción: la revierte y se
 * responde con su código, sin pasar por el manejo de errores inesperados.
 */
class ErrorDeNegocio extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

const incluirDetalle = [
  {
    model: PedidoItem,
    as: 'items',
    include: [
      { model: Usuario, as: 'vendedor', attributes: ['id', 'nombre', 'nombre_local'] },
      // La foto se muestra en el historial; si el plato ya no existe, viene en null.
      { model: Plato, as: 'plato', attributes: ['id', 'imagenUrl', 'categoria'] }
    ]
  }
];

/**
 * El estado del pedido se deriva del estado de sus líneas:
 * - Pendiente mientras algún local no haya respondido por su parte.
 * - Rechazado si todos los locales la rechazaron.
 * - Enviado en cuanto no queda nada pendiente y al menos un local despachó.
 *
 * Antes, un pedido con una línea enviada y otra rechazada quedaba Pendiente
 * para siempre, aunque ningún local tuviera ya nada que hacer. Cada línea
 * conserva su propio estado, así que el cliente sigue viendo qué se rechazó.
 */
const calcularEstadoDelPedido = (items) => {
  if (items.length === 0 || items.some(i => i.estado === 'Pendiente')) return 'Pendiente';
  if (items.every(i => i.estado === 'Rechazado')) return 'Rechazado';
  return 'Enviado';
};

const sincronizarEstadoDelPedido = async (pedidoId, transaction = null) => {
  const items = await PedidoItem.findAll({ where: { pedidoId }, transaction });
  const estado = calcularEstadoDelPedido(items);
  await Pedido.update({ estado }, { where: { id: pedidoId }, transaction });
  return estado;
};

/**
 * Devuelve al stock las unidades de las líneas rechazadas. Si el plato ya no
 * existe (platoId en NULL) no hay adónde devolverlas. El stock nunca supera
 * el máximo: si el local lo recargó a mano mientras tanto, se respeta el tope.
 */
const reponerStock = async (lineas, transaction) => {
  const unidadesPorPlato = new Map();
  for (const linea of lineas) {
    if (linea.platoId === null) continue;
    unidadesPorPlato.set(linea.platoId, (unidadesPorPlato.get(linea.platoId) || 0) + linea.cantidad);
  }

  // Mismo orden de bloqueo que al crear un pedido (ids ascendentes), para que
  // un rechazo y una compra simultáneos no se interbloqueen.
  const ids = [...unidadesPorPlato.keys()].sort((a, b) => a - b);
  for (const platoId of ids) {
    const plato = await Plato.findByPk(platoId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!plato) continue;
    const stock = Math.min(plato.stock + unidadesPorPlato.get(platoId), LIMITES.stock);
    await plato.update({ stock }, { transaction });
  }
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
    const id = Number(item?.id);
    // Number y no parseInt: parseInt("1.5") devuelve 1 y la validación de entero
    // pasa, así que una cantidad decimal se cobraba redondeada hacia abajo sin
    // avisar. Con Number, 1.5 sigue siendo 1.5 y el pedido se rechaza.
    const cantidad = Number(item?.cantidad);

    // Un id por encima del máximo de INTEGER haría fallar la consulta en PostgreSQL.
    if (!Number.isInteger(id) || id <= 0 || id > MAX_INTEGER) {
      return res.status(400).json({ mensaje: 'El carrito contiene un producto inválido.' });
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad de cada producto debe ser un entero mayor a 0.' });
    }
    consolidados.set(id, (consolidados.get(id) || 0) + cantidad);
  }

  // Datos de entrega: la dirección es obligatoria y las aclaraciones, opcionales.
  const { direccionEntrega: direccionRecibida, notas: notasRecibidas } = req.body;
  const direccionEntrega = typeof direccionRecibida === 'string' ? direccionRecibida.trim() : '';
  if (direccionEntrega.length < 5) {
    return res.status(400).json({ mensaje: 'Indicá la dirección de entrega: calle y número.' });
  }
  if (direccionEntrega.length > LIMITES.direccion) {
    return res.status(400).json({ mensaje: `La dirección de entrega puede tener hasta ${LIMITES.direccion} caracteres.` });
  }
  if (notasRecibidas !== undefined && notasRecibidas !== null && typeof notasRecibidas !== 'string') {
    return res.status(400).json({ mensaje: 'Las aclaraciones tienen que ser texto.' });
  }
  const notas = typeof notasRecibidas === 'string' ? notasRecibidas.trim() : '';
  if (notas.length > LIMITES.notasPedido) {
    return res.status(400).json({ mensaje: `Las aclaraciones pueden tener hasta ${LIMITES.notasPedido} caracteres.` });
  }

  // Orden estable por id: dos compras simultáneas bloquean las filas en el
  // mismo orden y no se produce un interbloqueo (deadlock) entre ellas.
  const idsOrdenados = [...consolidados.keys()].sort((a, b) => a - b);

  try {
    // Transacción administrada: Sequelize confirma si la función termina y
    // revierte si lanza. Antes el rollback se llamaba a mano en el catch, y si
    // algo fallaba después del commit intentaba revertir una transacción ya
    // cerrada: el cliente veía un error aunque el pedido se había guardado.
    const pedido = await sequelize.transaction(async (t) => {
      let totalCalculado = 0;
      const lineas = [];

      for (const platoId of idsOrdenados) {
        const cantidad = consolidados.get(platoId);

        const plato = await Plato.findByPk(platoId, { transaction: t, lock: t.LOCK.UPDATE });
        // Un plato cuyo local se desactivó o perdió el rol de vendedor ya no
        // está a la venta, aunque siga guardado en la base.
        const localHabilitado = plato && await Usuario.scope('habilitadoParaVender')
          .count({ where: { id: plato.vendedorId }, transaction: t });
        if (!plato || !localHabilitado) {
          throw new ErrorDeNegocio(404, `El plato con id ${platoId} ya no está disponible.`);
        }
        if (plato.stock < cantidad) {
          throw new ErrorDeNegocio(409, `Stock insuficiente de "${plato.nombre}". Quedan ${plato.stock} unidades.`);
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
        estado: 'Pendiente',
        direccionEntrega,
        notas: notas || null
      }, { transaction: t });

      const items = await PedidoItem.bulkCreate(
        lineas.map(linea => ({ ...linea, pedidoId: nuevoPedido.id })),
        { transaction: t }
      );

      // La respuesta se arma con lo que ya se guardó: no hace falta volver a
      // consultar la base después de confirmar.
      return { ...nuevoPedido.toJSON(), items: items.map(item => item.toJSON()) };
    });

    res.status(201).json({ mensaje: '¡Pedido confirmado con éxito! 🛍️', pedido });
  } catch (err) {
    if (err instanceof ErrorDeNegocio) {
      return res.status(err.estado).json({ mensaje: err.message });
    }
    responderError(res, err, {
      contexto: 'Error al procesar la transacción del pedido',
      mensaje: 'Error interno al procesar el pedido.'
    });
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
    responderError(res, err, {
      contexto: 'Error al obtener los pedidos del usuario',
      mensaje: 'Error interno al obtener los pedidos.'
    });
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
    responderError(res, err, { contexto: 'Error al obtener las comandas', mensaje: 'Error interno al obtener las comandas.' });
  }
});

// ---------------------------------------------------------------------------
// DESPACHAR O RECHAZAR LAS LÍNEAS PROPIAS DE UN PEDIDO
// Una línea solo pasa de Pendiente a Enviado o a Rechazado, y ese estado es
// final. Al rechazar, las unidades vuelven al stock del plato.
// ---------------------------------------------------------------------------
router.put('/:id/estado', autenticar, requiereRol(ROLES.VENDEDOR, ROLES.ADMIN), async (req, res) => {
  const { nuevoEstado } = req.body;
  if (!ESTADOS_FINALES.includes(nuevoEstado)) {
    return res.status(400).json({ mensaje: 'Estado inválido: un pedido pendiente solo puede pasar a Enviado o a Rechazado.' });
  }

  try {
    const estadoPedido = await sequelize.transaction(async (t) => {
      // Se bloquea el pedido antes de tocar sus líneas. Si dos locales de un
      // mismo pedido despachan a la vez, el segundo espera al primero y lee
      // las líneas ya actualizadas. Sin el bloqueo, los dos podían calcular el
      // estado general sobre datos viejos y dejar el pedido en Pendiente con
      // todas sus líneas enviadas.
      const pedido = await Pedido.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!pedido) throw new ErrorDeNegocio(404, 'Pedido no encontrado.');

      const filtro = { pedidoId: pedido.id };
      if (req.usuario.rol !== ROLES.ADMIN) filtro.vendedorId = req.usuario.id;

      const lineas = await PedidoItem.findAll({ where: filtro, transaction: t, lock: t.LOCK.UPDATE });

      // Sin líneas propias en este pedido, el vendedor no tiene nada que gestionar acá.
      if (lineas.length === 0) {
        throw new ErrorDeNegocio(403, 'Este pedido no incluye productos de tu local.');
      }

      const pendientes = lineas.filter(linea => linea.estado === 'Pendiente');
      if (pendientes.length === 0) {
        throw new ErrorDeNegocio(409, 'Este pedido ya no tiene productos pendientes: Enviado y Rechazado son estados finales.');
      }

      await PedidoItem.update(
        { estado: nuevoEstado },
        { where: { id: pendientes.map(linea => linea.id) }, transaction: t }
      );

      if (nuevoEstado === 'Rechazado') {
        await reponerStock(pendientes, t);
      }

      return sincronizarEstadoDelPedido(pedido.id, t);
    });

    res.json({
      mensaje: 'Estado actualizado exitosamente.',
      estadoVendedor: nuevoEstado,
      estadoPedido
    });
  } catch (err) {
    if (err instanceof ErrorDeNegocio) {
      return res.status(err.estado).json({ mensaje: err.message });
    }
    responderError(res, err, {
      contexto: 'Error al actualizar el estado del pedido',
      mensaje: 'Error interno al actualizar el estado.'
    });
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

    const vendedorId = esAdmin ? null : req.usuario.id;
    const [ventasDiarias, platosMasVendidos] = await Promise.all([
      ventasPorDia({ vendedorId }),
      masVendidos({ vendedorId })
    ]);

    res.json({
      totalFacturado: Number(Number(totalFacturado).toFixed(2)),
      totalPedidos: pedidosDistintos,
      pedidosPendientes,
      platosEnAlerta,
      ventasPorDia: ventasDiarias,
      masVendidos: platosMasVendidos
    });
  } catch (err) {
    responderError(res, err, {
      contexto: 'Error al obtener las estadísticas del vendedor',
      mensaje: 'Error interno al obtener las estadísticas.'
    });
  }
});

module.exports = router;
