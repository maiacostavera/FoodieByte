'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// Zona horaria con la que se agrupan las ventas por día: un pedido de las
// 23:30 en Buenos Aires es de ese día, aunque en UTC ya sea el siguiente.
const ZONA_HORARIA = process.env.ZONA_HORARIA || 'America/Argentina/Buenos_Aires';

/**
 * Ventas despachadas por día en los últimos `dias` días, hoy incluido. Los
 * días sin ventas vienen en cero, así el gráfico no tiene huecos. Sin
 * vendedorId, suma toda la plataforma.
 *
 * Devuelve [{ fecha: 'AAAA-MM-DD', total, pedidos }], del más viejo al de hoy.
 */
const ventasPorDia = ({ vendedorId = null, dias = 14 } = {}) => sequelize.query(
  `SELECT to_char(dia, 'YYYY-MM-DD') AS fecha,
          COALESCE(SUM(i.subtotal) FILTER (WHERE i.estado = 'Enviado'), 0)::float AS total,
          COUNT(DISTINCT i."pedidoId") FILTER (WHERE i.estado = 'Enviado')::int AS pedidos
     FROM generate_series(
            (now() AT TIME ZONE :zona)::date - (:dias - 1),
            (now() AT TIME ZONE :zona)::date,
            interval '1 day'
          ) AS dia
     LEFT JOIN "PedidoItems" i
       ON (i."createdAt" AT TIME ZONE :zona)::date = dia::date
      AND (CAST(:vendedorId AS integer) IS NULL OR i."vendedorId" = :vendedorId)
    GROUP BY dia
    ORDER BY dia`,
  { replacements: { zona: ZONA_HORARIA, dias, vendedorId }, type: QueryTypes.SELECT }
);

/**
 * Platos con más unidades despachadas. Se agrupa por el nombre guardado en la
 * línea del pedido: así cuenta también lo vendido de platos que ya se borraron.
 */
const masVendidos = ({ vendedorId = null, limite = 5 } = {}) => sequelize.query(
  `SELECT i."nombrePlato" AS nombre,
          MAX(u.nombre_local) AS local,
          SUM(i.cantidad)::int AS unidades,
          SUM(i.subtotal)::float AS total
     FROM "PedidoItems" i
     LEFT JOIN "Usuarios" u ON u.id = i."vendedorId"
    WHERE i.estado = 'Enviado'
      AND (CAST(:vendedorId AS integer) IS NULL OR i."vendedorId" = :vendedorId)
    GROUP BY i."nombrePlato", i."vendedorId"
    ORDER BY unidades DESC, total DESC
    LIMIT :limite`,
  { replacements: { vendedorId, limite }, type: QueryTypes.SELECT }
);

module.exports = { ZONA_HORARIA, ventasPorDia, masVendidos };
