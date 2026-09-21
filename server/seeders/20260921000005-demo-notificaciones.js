'use strict';

/**
 * Avisos de la demo.
 *
 * Se derivan de los pedidos y consultas que ya cargaron los seeders anteriores,
 * en lugar de inventarlos: así lo que muestra la campanita se corresponde con
 * lo que hay en la aplicación. Los más recientes quedan sin leer para que el
 * contador se vea en la presentación.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    const [pedidos] = await queryInterface.sequelize.query(`
      SELECT p.id, p."usuarioId", p.total, p.estado, p."createdAt",
             (SELECT COUNT(*) FROM "PedidoItems" i WHERE i."pedidoId" = p.id) AS lineas
      FROM "Pedidos" p
      ORDER BY p."createdAt" DESC
      LIMIT 25
    `);

    const [lineasPorLocal] = await queryInterface.sequelize.query(`
      SELECT i."pedidoId", i."vendedorId", SUM(i.cantidad) AS unidades, SUM(i.subtotal) AS importe,
             p."createdAt"
      FROM "PedidoItems" i
      JOIN "Pedidos" p ON p.id = i."pedidoId"
      WHERE i."vendedorId" IS NOT NULL
      GROUP BY i."pedidoId", i."vendedorId", p."createdAt"
      ORDER BY p."createdAt" DESC
      LIMIT 25
    `);

    const [consultas] = await queryInterface.sequelize.query(`
      SELECT q.id, q."usuarioId", q.respuesta, q."createdAt",
             pl.id AS "platoId", pl.nombre AS "nombrePlato", pl."vendedorId"
      FROM "Preguntas" q
      JOIN platos pl ON pl.id = q."platoId"
      ORDER BY q."createdAt" DESC
      LIMIT 12
    `);

    const importe = (valor) => `$${Number(valor || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
    const plural = (n, s, p) => `${n} ${Number(n) === 1 ? s : p}`;
    const recortar = (t, max = 90) => {
      const limpio = String(t || '').trim().replace(/\s+/g, ' ');
      return limpio.length > max ? `${limpio.slice(0, max - 1)}…` : limpio;
    };

    const avisos = [];
    const agregar = (fila) => avisos.push({ leida: true, ...fila, updatedAt: fila.createdAt });

    for (const pedido of pedidos) {
      agregar({
        usuarioId: pedido.usuarioId,
        tipo: 'pedido_confirmado',
        titulo: `Pedido #${pedido.id} confirmado`,
        detalle: `${plural(pedido.lineas, 'producto', 'productos')} · ${importe(pedido.total)}`,
        pedidoId: pedido.id,
        createdAt: pedido.createdAt
      });

      if (pedido.estado === 'Enviado' || pedido.estado === 'Rechazado') {
        const enviado = pedido.estado === 'Enviado';
        const cuando = new Date(new Date(pedido.createdAt).getTime() + 35 * 60 * 1000);
        agregar({
          usuarioId: pedido.usuarioId,
          tipo: enviado ? 'pedido_enviado' : 'pedido_rechazado',
          titulo: enviado ? `Tu pedido #${pedido.id} está en camino` : `Tu pedido #${pedido.id} fue rechazado`,
          pedidoId: pedido.id,
          createdAt: cuando
        });
      }
    }

    for (const linea of lineasPorLocal) {
      agregar({
        usuarioId: linea.vendedorId,
        tipo: 'pedido_recibido',
        titulo: `Nuevo pedido #${linea.pedidoId}`,
        detalle: `${plural(linea.unidades, 'unidad', 'unidades')} · ${importe(linea.importe)}`,
        pedidoId: linea.pedidoId,
        createdAt: linea.createdAt
      });
    }

    for (const consulta of consultas) {
      agregar({
        usuarioId: consulta.vendedorId,
        tipo: 'pregunta_recibida',
        titulo: `Nueva consulta sobre ${consulta.nombrePlato}`,
        platoId: consulta.platoId,
        createdAt: consulta.createdAt
      });

      if (consulta.respuesta) {
        agregar({
          usuarioId: consulta.usuarioId,
          tipo: 'pregunta_respondida',
          titulo: `Respondieron tu consulta sobre ${consulta.nombrePlato}`,
          detalle: recortar(consulta.respuesta),
          platoId: consulta.platoId,
          createdAt: new Date(new Date(consulta.createdAt).getTime() + 3 * 60 * 60 * 1000)
        });
      }
    }

    // Una solicitud de local pendiente para cada administrador.
    const [admins] = await queryInterface.sequelize.query(
      `SELECT id FROM "Usuarios" WHERE rol = 'admin' AND activo = true`
    );
    const [postulantes] = await queryInterface.sequelize.query(
      `SELECT nombre, nombre_local FROM "Usuarios" WHERE solicitud_vendedor = true LIMIT 3`
    );
    const ahora = new Date();
    for (const admin of admins) {
      for (const [indice, postulante] of postulantes.entries()) {
        agregar({
          usuarioId: admin.id,
          tipo: 'solicitud_local',
          titulo: 'Nueva solicitud para vender',
          detalle: `${postulante.nombre} quiere registrar ${postulante.nombre_local || 'su local'}`,
          createdAt: new Date(ahora.getTime() - (indice + 1) * 6 * 60 * 60 * 1000)
        });
      }
    }

    if (avisos.length === 0) return;

    // Los más recientes de cada persona quedan sin leer: es lo que hace que la
    // campanita muestre el contador al abrir la demo.
    const porUsuario = new Map();
    for (const aviso of avisos) {
      const lista = porUsuario.get(aviso.usuarioId) || [];
      lista.push(aviso);
      porUsuario.set(aviso.usuarioId, lista);
    }
    for (const lista of porUsuario.values()) {
      lista.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      for (const aviso of lista.slice(0, 3)) aviso.leida = false;
    }

    return queryInterface.bulkInsert('Notificaciones', avisos.map(a => ({
      usuarioId: a.usuarioId,
      tipo: a.tipo,
      titulo: a.titulo,
      detalle: a.detalle || null,
      pedidoId: a.pedidoId || null,
      platoId: a.platoId || null,
      leida: a.leida,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt || a.createdAt
    })));
  },

  async down(queryInterface) {
    return queryInterface.bulkDelete('Notificaciones', null, {});
  }
};
