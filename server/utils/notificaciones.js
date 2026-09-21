'use strict';

const { Notificacion, Usuario } = require('../models');
const { ROLES } = require('../config/seguridad');

/**
 * Creación de avisos.
 *
 * Un aviso nunca debe hacer fallar la operación que lo origina: si un pedido se
 * guardó bien, que no se haya podido escribir la notificación es un problema
 * menor y se registra, pero el cliente ve su compra confirmada igual. Por eso
 * todo lo de acá atrapa sus propios errores.
 *
 * Cuando se pasa una transacción, el aviso entra dentro de ella y se revierte
 * junto con la operación si algo falla más adelante.
 */

const crear = async (datos, transaction = null) => {
  try {
    return await Notificacion.create(datos, { transaction });
  } catch (err) {
    console.error('No se pudo crear la notificación:', err.message);
    return null;
  }
};

const crearVarias = async (lista, transaction = null) => {
  if (lista.length === 0) return [];
  try {
    return await Notificacion.bulkCreate(lista, { transaction });
  } catch (err) {
    console.error('No se pudieron crear las notificaciones:', err.message);
    return [];
  }
};

const formatearImporte = (valor) =>
  `$${Number(valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

const enPlural = (cantidad, singular, plural) =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;

// --- Pedidos ----------------------------------------------------------------

/**
 * Un pedido genera dos clases de aviso: la confirmación para quien compró y
 * una comanda para cada local involucrado, con solo su parte del pedido.
 */
const pedidoCreado = async ({ pedido, lineas, compradorId }, transaction) => {
  const avisos = [{
    usuarioId: compradorId,
    tipo: 'pedido_confirmado',
    titulo: `Pedido #${pedido.id} confirmado`,
    detalle: `${enPlural(lineas.length, 'producto', 'productos')} · ${formatearImporte(pedido.total)}`,
    pedidoId: pedido.id
  }];

  // Un carrito puede mezclar locales: cada uno recibe un aviso con su parte.
  const porVendedor = new Map();
  for (const linea of lineas) {
    if (!linea.vendedorId) continue;
    const actual = porVendedor.get(linea.vendedorId) || { unidades: 0, importe: 0 };
    actual.unidades += linea.cantidad;
    actual.importe += Number(linea.subtotal);
    porVendedor.set(linea.vendedorId, actual);
  }

  for (const [vendedorId, resumen] of porVendedor) {
    avisos.push({
      usuarioId: vendedorId,
      tipo: 'pedido_recibido',
      titulo: `Nuevo pedido #${pedido.id}`,
      detalle: `${enPlural(resumen.unidades, 'unidad', 'unidades')} · ${formatearImporte(resumen.importe)}`,
      pedidoId: pedido.id
    });
  }

  return crearVarias(avisos, transaction);
};

/** El local cambió el estado de sus líneas: se avisa a quien compró. */
const estadoDePedidoCambiado = async ({ pedidoId, compradorId, nuevoEstado, nombreLocal }, transaction) => {
  if (nuevoEstado === 'Pendiente') return null;

  const esEnviado = nuevoEstado === 'Enviado';
  return crear({
    usuarioId: compradorId,
    tipo: esEnviado ? 'pedido_enviado' : 'pedido_rechazado',
    titulo: esEnviado ? `Tu pedido #${pedidoId} está en camino` : `Tu pedido #${pedidoId} fue rechazado`,
    detalle: nombreLocal
      ? (esEnviado ? `${nombreLocal} despachó tu pedido` : `${nombreLocal} no pudo prepararlo`)
      : undefined,
    pedidoId
  }, transaction);
};

// --- Preguntas --------------------------------------------------------------

const preguntaRecibida = async ({ vendedorId, platoId, nombrePlato, texto }, transaction) => {
  if (!vendedorId) return null;
  return crear({
    usuarioId: vendedorId,
    tipo: 'pregunta_recibida',
    titulo: `Nueva consulta sobre ${nombrePlato}`,
    detalle: recortar(texto),
    platoId
  }, transaction);
};

const preguntaRespondida = async ({ usuarioId, platoId, nombrePlato, respuesta }, transaction) => {
  return crear({
    usuarioId,
    tipo: 'pregunta_respondida',
    titulo: `Respondieron tu consulta sobre ${nombrePlato}`,
    detalle: recortar(respuesta),
    platoId
  }, transaction);
};

// --- Altas de local ---------------------------------------------------------

/** Todo administrador se entera cuando alguien pide vender en la plataforma. */
const solicitudDeLocal = async ({ nombreSolicitante, nombreLocal }, transaction) => {
  try {
    const admins = await Usuario.findAll({
      where: { rol: ROLES.ADMIN, activo: true },
      attributes: ['id'],
      transaction
    });

    return crearVarias(admins.map(admin => ({
      usuarioId: admin.id,
      tipo: 'solicitud_local',
      titulo: 'Nueva solicitud para vender',
      detalle: `${nombreSolicitante} quiere registrar ${nombreLocal}`
    })), transaction);
  } catch (err) {
    console.error('No se pudo avisar a los administradores:', err.message);
    return [];
  }
};

/** El detalle es una línea en un menú desplegable, no un texto completo. */
const recortar = (texto, maximo = 90) => {
  const limpio = String(texto || '').trim().replace(/\s+/g, ' ');
  return limpio.length > maximo ? `${limpio.slice(0, maximo - 1)}…` : limpio;
};

module.exports = {
  pedidoCreado,
  estadoDePedidoCambiado,
  preguntaRecibida,
  preguntaRespondida,
  solicitudDeLocal
};
