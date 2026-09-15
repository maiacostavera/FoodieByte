'use strict';

const { QueryTypes } = require('sequelize');
const { LOCALES, CLIENTES, DESACTIVADOS } = require('./datos/demo');

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const DIAS_DE_HISTORIAL = 42;

/**
 * Historial de pedidos de la demo: seis semanas de ventas para que los
 * paneles, las estadísticas y las liquidaciones muestren movimiento real, más
 * pedidos de las últimas horas que siguen pendientes para despacharlos o
 * rechazarlos en vivo.
 *
 * El historial se genera con una semilla fija: cada instalación carga
 * exactamente los mismos pedidos, con fechas relativas al momento de la carga.
 */

// Pedidos escritos a mano: cada local tiene comandas pendientes y la cuenta de
// demostración (Lucía) muestra todos los estados posibles de un pedido.
// `estados` dice cómo respondió cada local; si no figura, su parte está Pendiente.
const PEDIDOS_FIJOS = [
  { cliente: 'lucia@foodiebyte.com', hace: 25 * MINUTO, items: [['Pizza Margherita', 1], ['Tiramisú', 2]] },
  { cliente: 'valentina.lopez@ejemplo.com', hace: 35 * MINUTO, items: [['Doble Bacon', 1], ['Papas con Cheddar y Verdeo', 1]] },
  { cliente: 'martin.gomez@ejemplo.com', hace: 50 * MINUTO, items: [['Pizza de Pepperoni', 2]] },
  { cliente: 'camila.romero@ejemplo.com', hace: 1 * HORA, items: [['Buddha Bowl', 1], ['Brownie con Helado', 1]] },
  { cliente: 'sofia.rodriguez@ejemplo.com', hace: 80 * MINUTO, items: [['Pizza Napolitana', 1], ['Combinado Clásico 15 piezas', 1]] },
  { cliente: 'tomas.pereyra@ejemplo.com', hace: 2 * HORA, items: [['Parrillada para Dos', 1], ['Flan Casero con Dulce de Leche', 2]] },
  { cliente: 'joaquin.diaz@ejemplo.com', hace: 3 * HORA, items: [['Docena Surtida', 1]] },
  {
    cliente: 'nicolas.alvarez@ejemplo.com', hace: 4 * HORA,
    items: [['Pizza Muzzarella', 1], ['Empanadas de Jamón y Queso x6', 1]],
    estados: { 'lanonna@foodiebyte.com': 'Enviado' }
  },
  {
    cliente: 'lucia@foodiebyte.com', hace: 2 * DIA + 3 * HORA,
    items: [['Clásica con Cheddar', 2]],
    estados: { 'barrioburger@foodiebyte.com': 'Enviado' }
  },
  {
    cliente: 'lucia@foodiebyte.com', hace: 6 * DIA + 2 * HORA,
    items: [['Poke de Salmón', 1], ['Chocotorta', 1]],
    estados: { 'sakura@foodiebyte.com': 'Enviado', 'dulcetentacion@foodiebyte.com': 'Rechazado' }
  },
  {
    cliente: 'lucia@foodiebyte.com', hace: 9 * DIA + 1 * HORA,
    items: [['Empanadas Salteñas x6', 2], ['Helado Artesanal 1/2 kg', 1]],
    estados: { 'donarosa@foodiebyte.com': 'Enviado', 'dulcetentacion@foodiebyte.com': 'Enviado' }
  },
  {
    cliente: 'lucia@foodiebyte.com', hace: 12 * DIA + 4 * HORA,
    items: [['Bife de Chorizo', 1]],
    estados: { 'saborcriollo@foodiebyte.com': 'Rechazado' }
  }
];

// mulberry32: generador pseudoaleatorio chico y reproducible a partir de una semilla.
const crearAzar = (semilla) => () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Misma regla que routes/pedidos.js: el estado del pedido se deriva de sus líneas.
const estadoDelPedido = (lineas) => {
  if (lineas.some(linea => linea.estado === 'Pendiente')) return 'Pendiente';
  if (lineas.every(linea => linea.estado === 'Rechazado')) return 'Rechazado';
  return 'Enviado';
};

// Los precios suben con el tiempo: un pedido viejo guarda el precio de ese
// momento, igual que en la aplicación real (precioUnitario es una foto).
const precioDeEntonces = (precioActual, dias) =>
  Math.round((precioActual * (1 - dias * 0.0015)) / 100) * 100;

/** Pedidos al azar de las últimas seis semanas, ya resueltos por los locales. */
const generarHistorial = (ahora, platos, clientes, desactivados) => {
  const azar = crearAzar(20260915);
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  const cantidadAlAzar = () => {
    const r = azar();
    return r < 0.75 ? 1 : r < 0.97 ? 2 : 3;
  };

  // Los dos primeros platos de cada menú son los que más se venden.
  const ponderados = platos.flatMap(plato => (plato.destacado ? [plato, plato, plato] : [plato]));
  const pedidos = [];

  for (let dias = DIAS_DE_HISTORIAL; dias >= 1; dias--) {
    const dia = new Date(ahora.getTime() - dias * DIA);
    const finDeSemana = [0, 5, 6].includes(dia.getDay());
    const cantidadDelDia = (finDeSemana ? 3 : 1) + Math.floor(azar() * 3);

    for (let n = 0; n < cantidadDelDia; n++) {
      // Al mediodía o a la noche, que es cuando se pide comida.
      const creado = new Date(dia);
      creado.setHours(elegir([12, 13, 13, 14, 20, 21, 21, 22, 23]), Math.floor(azar() * 60), 0, 0);

      // La cuenta desactivada tiene pedidos solo de antes de su baja.
      const cliente = dias > 25 && azar() < 0.15 ? elegir(desactivados) : elegir(clientes);

      const primero = elegir(ponderados);
      const items = [[primero, cantidadAlAzar()]];
      const r = azar();
      const cantidadDeLineas = r < 0.6 ? 1 : r < 0.9 ? 2 : 3;

      while (items.length < cantidadDeLineas) {
        // Un carrito puede sumar otro plato del mismo local o de uno distinto.
        const mismoLocal = azar() < 0.55;
        const opciones = platos.filter(plato =>
          (mismoLocal ? plato.vendedorId === primero.vendedorId : plato.vendedorId !== primero.vendedorId) &&
          !items.some(([elegido]) => elegido.id === plato.id)
        );
        if (opciones.length === 0) break;
        items.push([elegir(opciones), cantidadAlAzar()]);
      }

      // Cada local responde por su parte completa: la despacha o, a veces, la rechaza.
      const respuestaDelLocal = new Map();
      for (const [plato] of items) {
        if (!respuestaDelLocal.has(plato.vendedorId)) {
          respuestaDelLocal.set(plato.vendedorId, azar() < 0.93 ? 'Enviado' : 'Rechazado');
        }
      }

      pedidos.push({
        usuarioId: cliente.id,
        creado,
        lineas: items.map(([plato, cantidad]) => ({ plato, cantidad, estado: respuestaDelLocal.get(plato.vendedorId) }))
      });
    }
  }

  return pedidos;
};

module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const consultar = (sql, replacements) =>
      queryInterface.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    const platos = await consultar(
      `SELECT p.id, p.nombre, p.precio, p."vendedorId", u.email AS "emailLocal"
         FROM platos p
         JOIN "Usuarios" u ON u.id = p."vendedorId"
        WHERE u.email IN (:emails)
        ORDER BY p.id`,
      { emails: LOCALES.map(local => local.email) }
    );

    const cuentas = await consultar(
      'SELECT id, email FROM "Usuarios" WHERE email IN (:emails) ORDER BY id',
      { emails: [...CLIENTES, ...DESACTIVADOS].map(cuenta => cuenta.email) }
    );

    if (platos.length === 0 || cuentas.length === 0) {
      throw new Error('Faltan los locales, los platos o los clientes de la demo. Ejecutá primero los seeders anteriores.');
    }

    // Se puede correr más de una vez: si los clientes ya tienen pedidos, no se duplican.
    const [{ existentes }] = await consultar(
      'SELECT COUNT(*)::int AS existentes FROM "Pedidos" WHERE "usuarioId" IN (:ids)',
      { ids: cuentas.map(cuenta => cuenta.id) }
    );
    if (existentes > 0) return;

    const destacados = new Set(LOCALES.flatMap(local => local.platos.slice(0, 2).map(plato => plato.nombre)));
    for (const plato of platos) plato.destacado = destacados.has(plato.nombre);

    const platoPorNombre = new Map(platos.map(plato => [plato.nombre, plato]));
    const cuentaPorEmail = new Map(cuentas.map(cuenta => [cuenta.email, cuenta]));
    const emailsDesactivados = new Set(DESACTIVADOS.map(cuenta => cuenta.email));

    const fijos = PEDIDOS_FIJOS.map(({ cliente, hace, items, estados = {} }) => ({
      usuarioId: cuentaPorEmail.get(cliente).id,
      creado: new Date(ahora.getTime() - hace),
      lineas: items.map(([nombre, cantidad]) => {
        const plato = platoPorNombre.get(nombre);
        if (!plato) throw new Error(`El pedido fijo menciona un plato que no existe: "${nombre}".`);
        return { plato, cantidad, estado: estados[plato.emailLocal] || 'Pendiente' };
      })
    }));

    const historial = generarHistorial(
      ahora,
      platos,
      cuentas.filter(cuenta => !emailsDesactivados.has(cuenta.email)),
      cuentas.filter(cuenta => emailsDesactivados.has(cuenta.email))
    );

    // En orden cronológico, para que los números de pedido crezcan con la fecha.
    const pedidos = [...historial, ...fijos].sort((a, b) => a.creado - b.creado);

    await queryInterface.sequelize.transaction(async (transaction) => {
      const lineasAInsertar = [];

      for (const pedido of pedidos) {
        const dias = (ahora - pedido.creado) / DIA;
        const lineas = pedido.lineas.map(({ plato, cantidad, estado }) => {
          const precioUnitario = precioDeEntonces(Number(plato.precio), dias);
          return {
            platoId: plato.id,
            vendedorId: plato.vendedorId,
            nombrePlato: plato.nombre,
            precioUnitario,
            cantidad,
            subtotal: precioUnitario * cantidad,
            estado
          };
        });

        // Lo que ya respondió un local se actualizó unos minutos después de la compra.
        const respondido = new Date(Math.min(pedido.creado.getTime() + 35 * MINUTO, ahora.getTime()));
        const estado = estadoDelPedido(lineas);

        const [fila] = await queryInterface.sequelize.query(
          `INSERT INTO "Pedidos" ("usuarioId", total, estado, "createdAt", "updatedAt")
           VALUES (:usuarioId, :total, :estado, :creado, :actualizado)
           RETURNING id`,
          {
            replacements: {
              usuarioId: pedido.usuarioId,
              total: lineas.reduce((acc, linea) => acc + linea.subtotal, 0),
              estado,
              creado: pedido.creado,
              actualizado: lineas.every(linea => linea.estado === 'Pendiente') ? pedido.creado : respondido
            },
            type: QueryTypes.SELECT,
            transaction
          }
        );

        for (const linea of lineas) {
          lineasAInsertar.push({
            ...linea,
            pedidoId: fila.id,
            createdAt: pedido.creado,
            updatedAt: linea.estado === 'Pendiente' ? pedido.creado : respondido
          });
        }
      }

      await queryInterface.bulkInsert('PedidoItems', lineasAInsertar, { transaction });
    });
  },

  async down(queryInterface) {
    // Las líneas se borran en cascada con su pedido.
    await queryInterface.sequelize.query(
      'DELETE FROM "Pedidos" WHERE "usuarioId" IN (SELECT id FROM "Usuarios" WHERE email IN (:emails))',
      { replacements: { emails: [...CLIENTES, ...DESACTIVADOS].map(cuenta => cuenta.email) } }
    );
  }
};
