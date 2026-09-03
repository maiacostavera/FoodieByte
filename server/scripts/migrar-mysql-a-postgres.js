'use strict';

/**
 * Migración de datos de MySQL/MariaDB a PostgreSQL.
 *
 * Lee la base MySQL de origen (la de XAMPP), la copia a la base PostgreSQL
 * ya migrada y deja los IDs originales intactos para que las relaciones y
 * las rutas de las imágenes sigan siendo válidas.
 *
 * Detecta solo con qué esquema está la base de origen:
 *   - Esquema nuevo: ya tiene la tabla PedidoItems, se copia tal cual.
 *   - Esquema viejo: los productos del pedido están serializados como JSON
 *     en Pedidos.productos; se descomponen en líneas de PedidoItems.
 *
 * Uso:
 *   node scripts/migrar-mysql-a-postgres.js --dry-run   (simula, no escribe)
 *   node scripts/migrar-mysql-a-postgres.js             (migra de verdad)
 *   node scripts/migrar-mysql-a-postgres.js --force     (sobrescribe el destino)
 *   node scripts/migrar-mysql-a-postgres.js --reparar-codificacion
 *                                                       (arregla acentos rotos)
 *
 * Requisitos previos:
 *   1. Los datos de conexión a MySQL en el .env (variables MYSQL_*).
 *   2. La base PostgreSQL creada y migrada: npm run db:create && npm run db:migrate
 *      (sin seed: los datos los trae esta migración).
 */

require('dotenv').config({ quiet: true });

const mysql = require('mysql2/promise');
const db = require('../models');
const { sequelize } = db;

const ARGS = process.argv.slice(2);
const SIMULACRO = ARGS.includes('--dry-run');
const FORZAR = ARGS.includes('--force');
const REPARAR_CODIFICACION = ARGS.includes('--reparar-codificacion');

const ROLES_VALIDOS = ['foodie', 'vendedor', 'admin'];
const ESTADOS_VALIDOS = ['Pendiente', 'Enviado', 'Rechazado'];

const resumen = [];
const advertencias = [];

const log = (msg) => console.log(msg);
const aviso = (msg) => { advertencias.push(msg); console.log(`   ⚠️  ${msg}`); };

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Mapa de nombre lógico -> nombre real de la tabla en el origen.
 *
 * En Windows, MySQL guarda los nombres de tabla en minúsculas
 * (lower_case_table_names=1), así que "Usuarios" queda como "usuarios".
 * En Linux y macOS se respetan las mayúsculas. Para que el script funcione
 * en cualquier sistema, se leen los nombres reales una sola vez y después
 * se usan tal como están escritos en la base.
 */
async function mapaDeTablas(conexion, baseDatos) {
  const [filas] = await conexion.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?`,
    [baseDatos]
  );

  const mapa = new Map();
  for (const fila of filas) {
    const nombre = fila.TABLE_NAME || fila.table_name;
    mapa.set(String(nombre).toLowerCase(), nombre);
  }
  return mapa;
}

/** Nombre real de una tabla, sin importar cómo esté escrita. */
const nombreReal = (mapa, tabla) => mapa.get(tabla.toLowerCase()) || null;

const tablaExiste = (mapa, tabla) => mapa.has(tabla.toLowerCase());

/** Columnas realmente presentes en una tabla del origen. */
async function columnasDe(conexion, baseDatos, mapa, tabla) {
  const real = nombreReal(mapa, tabla);
  if (!real) return new Set();

  const [filas] = await conexion.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [baseDatos, real]
  );
  return new Set(filas.map(f => f.COLUMN_NAME || f.column_name));
}

/** Lee una tabla completa usando su nombre real. */
async function leerTabla(conexion, mapa, tabla) {
  const real = nombreReal(mapa, tabla);
  if (!real) return [];
  const [filas] = await conexion.query(`SELECT * FROM \`${real}\` ORDER BY id`);
  return filas;
}

/** MySQL guarda los booleanos como 0/1 y a veces llegan como Buffer. */
const aBooleano = (valor) => {
  if (valor === null || valor === undefined) return false;
  if (Buffer.isBuffer(valor)) return valor[0] === 1;
  return valor === 1 || valor === true || valor === '1';
};

const aFecha = (valor) => (valor ? new Date(valor) : new Date());

// --- Codificación -----------------------------------------------------------
// Es habitual que una base creada desde XAMPP/phpMyAdmin guarde texto UTF-8
// que ya fue interpretado como latin1: "Pizzería" queda como "PizzerÃ­a".
// El texto está mal en el origen, no lo rompe la migración, pero es el momento
// justo para arreglarlo.

const MARCAS_MOJIBAKE = /[ÃÂ][\u0080-\u00bf]|â€|Ã±|Ã³|Ã­|Ã©|Ã¡|Ãº/;

let textosSospechosos = 0;
let textosReparados = 0;

/** ¿El texto tiene señales de doble codificación? */
const pareceMojibake = (texto) =>
  typeof texto === 'string' && texto.length > 0 && MARCAS_MOJIBAKE.test(texto);

/**
 * Revierte la doble codificación reinterpretando los bytes como UTF-8.
 * Solo devuelve el arreglo si el resultado es válido; si no, deja el original.
 */
const repararTexto = (texto) => {
  try {
    const reparado = Buffer.from(texto, 'latin1').toString('utf8');
    // El carácter de reemplazo indica que la reinterpretación no era correcta.
    if (reparado.includes('\uFFFD') || reparado === texto) return null;
    return reparado;
  } catch {
    return null;
  }
};

/** Aplica el saneo de codificación a un texto según la bandera elegida. */
const sanear = (valor) => {
  if (typeof valor !== 'string' || !pareceMojibake(valor)) return valor;

  textosSospechosos++;
  if (!REPARAR_CODIFICACION) return valor;

  const reparado = repararTexto(valor);
  if (!reparado) return valor;

  textosReparados++;
  return reparado;
};

const aNumero = (valor, porDefecto = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
};

/** Normaliza un valor contra una lista permitida (los ENUM de PostgreSQL son estrictos). */
const normalizar = (valor, permitidos, porDefecto, contexto) => {
  if (permitidos.includes(valor)) return valor;
  if (valor !== null && valor !== undefined && valor !== '') {
    aviso(`${contexto}: valor "${valor}" no es válido, se usa "${porDefecto}".`);
  }
  return porDefecto;
};

/**
 * Tras insertar con IDs explícitos, las secuencias de PostgreSQL siguen en 1.
 * Sin este ajuste, el primer alta desde la aplicación choca con un ID existente.
 */
async function ajustarSecuencias(transaction) {
  const tablas = ['Usuarios', 'platos', 'Pedidos', 'PedidoItems', 'Preguntas'];
  for (const tabla of tablas) {
    await sequelize.query(
      `SELECT setval(
         pg_get_serial_sequence('"${tabla}"', 'id'),
         COALESCE((SELECT MAX(id) FROM "${tabla}"), 0) + 1,
         false
       )`,
      { transaction, logging: false }
    );
  }
}

/**
 * Control de integridad: el total de cada pedido debe coincidir con la suma
 * de sus líneas. Una diferencia señala datos que venían inconsistentes del
 * origen (por ejemplo, un JSON de productos corrupto).
 */
async function verificarTotales() {
  const [filas] = await sequelize.query(`
    SELECT p.id, p.total AS total_pedido, COALESCE(SUM(i.subtotal), 0) AS suma_lineas
    FROM "Pedidos" p
    LEFT JOIN "PedidoItems" i ON i."pedidoId" = p.id
    GROUP BY p.id, p.total
    HAVING p.total <> COALESCE(SUM(i.subtotal), 0)
    ORDER BY p.id
  `, { logging: false });

  return filas.map(f => ({
    id: f.id,
    totalPedido: Number(f.total_pedido),
    sumaLineas: Number(f.suma_lineas)
  }));
}

// ---------------------------------------------------------------------------
// Lectura del origen
// ---------------------------------------------------------------------------

async function leerOrigen(conexion, baseDatos) {
  const mapa = await mapaDeTablas(conexion, baseDatos);

  // Las tablas imprescindibles tienen que estar, más allá de cómo se escriban.
  const faltantes = ['Usuarios', 'platos', 'Pedidos'].filter(t => !tablaExiste(mapa, t));
  if (faltantes.length > 0) {
    throw new Error(
      `A la base de origen le faltan tablas: ${faltantes.join(', ')}.\n` +
      `   Tablas encontradas: ${[...mapa.values()].join(', ')}`
    );
  }

  const esquemaNuevo = tablaExiste(mapa, 'PedidoItems');
  log(`\n📖 Esquema de origen detectado: ${esquemaNuevo ? 'NUEVO (con PedidoItems)' : 'ANTERIOR (productos en JSON)'}`);

  // Tablas de versiones anteriores del proyecto que ya no tienen equivalente.
  const SIN_EQUIVALENTE = ['comentarios', 'valoraciones', 'categoria', 'categorias'];
  const ignoradas = [];
  for (const tabla of SIN_EQUIVALENTE) {
    if (!tablaExiste(mapa, tabla)) continue;
    const [conteo] = await conexion.query(`SELECT COUNT(*) AS n FROM \`${nombreReal(mapa, tabla)}\``);
    ignoradas.push({ tabla: nombreReal(mapa, tabla), filas: Number(conteo[0].n) });
  }

  const colUsuarios = await columnasDe(conexion, baseDatos, mapa, 'Usuarios');
  const colPlatos = await columnasDe(conexion, baseDatos, mapa, 'platos');
  const colPedidos = await columnasDe(conexion, baseDatos, mapa, 'Pedidos');

  const usuarios = await leerTabla(conexion, mapa, 'Usuarios');
  const platos = await leerTabla(conexion, mapa, 'platos');
  const pedidos = await leerTabla(conexion, mapa, 'Pedidos');
  const items = esquemaNuevo ? await leerTabla(conexion, mapa, 'PedidoItems') : [];
  const preguntas = tablaExiste(mapa, 'Preguntas') ? await leerTabla(conexion, mapa, 'Preguntas') : [];

  return {
    esquemaNuevo, usuarios, platos, pedidos, items, preguntas,
    colUsuarios, colPlatos, colPedidos, ignoradas, mapa
  };
}

// ---------------------------------------------------------------------------
// Transformación
// ---------------------------------------------------------------------------

function transformarUsuarios(filas, columnas) {
  const vistos = new Set();
  const salida = [];

  for (const u of filas) {
    const email = String(u.email || '').trim().toLowerCase();

    if (!email) {
      aviso(`Usuario #${u.id} ("${u.nombre}") no tiene email: se omite.`);
      continue;
    }
    // La tabla nueva exige email único; la anterior no lo garantizaba.
    if (vistos.has(email)) {
      aviso(`Email duplicado "${email}" (usuario #${u.id}): se omite el repetido.`);
      continue;
    }
    vistos.add(email);

    salida.push({
      id: u.id,
      nombre: sanear(String(u.nombre || 'Sin nombre').trim()),
      email,
      password: u.password,
      rol: normalizar(u.rol, ROLES_VALIDOS, 'foodie', `Usuario #${u.id} rol`),
      solicitud_vendedor: columnas.has('solicitud_vendedor') ? aBooleano(u.solicitud_vendedor) : false,
      nombre_local: columnas.has('nombre_local') ? sanear(u.nombre_local) || null : null,
      telefono: columnas.has('telefono') ? (u.telefono || null) : null,
      direccion: columnas.has('direccion') ? sanear(u.direccion) || null : null,
      categoria_local: columnas.has('categoria_local') ? (u.categoria_local || null) : null,
      descripcion_productos: columnas.has('descripcion_productos') ? sanear(u.descripcion_productos) || null : null,
      solicitud_fecha: columnas.has('solicitud_fecha') && u.solicitud_fecha ? new Date(u.solicitud_fecha) : null,
      createdAt: aFecha(u.createdAt),
      updatedAt: aFecha(u.updatedAt)
    });
  }

  return salida;
}

function transformarPlatos(filas, columnas, idsUsuarios, vendedorPorDefecto) {
  const salida = [];

  for (const p of filas) {
    let vendedorId = p.vendedorId;

    // En el esquema anterior vendedorId admitía NULL y podía apuntar a un
    // usuario borrado; ahora es obligatorio y con clave foránea.
    if (!vendedorId || !idsUsuarios.has(vendedorId)) {
      if (!vendedorPorDefecto) {
        aviso(`Plato #${p.id} ("${p.nombre}") no tiene vendedor válido y no hay ninguno al que asignarlo: se omite.`);
        continue;
      }
      aviso(`Plato #${p.id} ("${p.nombre}") sin vendedor válido: se asigna al usuario #${vendedorPorDefecto}.`);
      vendedorId = vendedorPorDefecto;
    }

    const precio = aNumero(p.precio, 0);
    if (precio <= 0) aviso(`Plato #${p.id} ("${p.nombre}") tiene precio ${precio}.`);

    salida.push({
      id: p.id,
      nombre: sanear(String(p.nombre || 'Sin nombre').trim()),
      descripcion: sanear(p.descripcion) || null,
      precio,
      categoria: p.categoria || null,
      imagenUrl: columnas.has('imagenUrl') ? (p.imagenUrl || null) : null,
      stock: Math.max(0, Math.min(100, Math.trunc(aNumero(p.stock, 0)))),
      vendedorId,
      tiempo_prep: columnas.has('tiempo_prep') ? (p.tiempo_prep || '20-30 min') : '20-30 min',
      es_vegano: columnas.has('es_vegano') ? aBooleano(p.es_vegano) : false,
      es_sintacc: columnas.has('es_sintacc') ? aBooleano(p.es_sintacc) : false,
      createdAt: aFecha(p.createdAt),
      updatedAt: aFecha(p.updatedAt)
    });
  }

  return salida;
}

function transformarPedidos(filas, idsUsuarios) {
  const salida = [];

  for (const p of filas) {
    if (!idsUsuarios.has(p.usuarioId)) {
      aviso(`Pedido #${p.id} pertenece al usuario #${p.usuarioId}, que no existe: se omite.`);
      continue;
    }

    salida.push({
      id: p.id,
      usuarioId: p.usuarioId,
      total: aNumero(p.total, 0),
      estado: normalizar(p.estado, ESTADOS_VALIDOS, 'Pendiente', `Pedido #${p.id} estado`),
      createdAt: aFecha(p.createdAt),
      updatedAt: aFecha(p.updatedAt)
    });
  }

  return salida;
}

/** Esquema nuevo: las líneas ya existen, solo se sanean. */
function transformarItems(filas, idsPedidos, idsPlatos, idsUsuarios) {
  return filas
    .filter(i => {
      if (!idsPedidos.has(i.pedidoId)) {
        aviso(`Línea #${i.id} apunta al pedido #${i.pedidoId}, que no se migró: se omite.`);
        return false;
      }
      return true;
    })
    .map(i => ({
      id: i.id,
      pedidoId: i.pedidoId,
      platoId: idsPlatos.has(i.platoId) ? i.platoId : null,
      vendedorId: idsUsuarios.has(i.vendedorId) ? i.vendedorId : null,
      nombrePlato: sanear(String(i.nombrePlato || 'Producto').trim()),
      precioUnitario: aNumero(i.precioUnitario, 0),
      cantidad: Math.max(1, Math.trunc(aNumero(i.cantidad, 1))),
      subtotal: aNumero(i.subtotal, 0),
      estado: normalizar(i.estado, ESTADOS_VALIDOS, 'Pendiente', `Línea #${i.id} estado`),
      createdAt: aFecha(i.createdAt),
      updatedAt: aFecha(i.updatedAt)
    }));
}

/**
 * Esquema anterior: cada pedido guardaba sus productos como un texto JSON.
 * Se descompone en líneas y se recupera el vendedor desde el plato, que es
 * lo que permite el aislamiento entre locales en el modelo nuevo.
 */
function derivarItemsDesdeJSON(pedidosOrigen, pedidosMigrados, platosPorId) {
  const idsMigrados = new Set(pedidosMigrados.map(p => p.id));
  const items = [];
  let siguienteId = 1;

  for (const pedido of pedidosOrigen) {
    if (!idsMigrados.has(pedido.id)) continue;

    let productos = [];
    try {
      const crudo = pedido.productos;
      productos = typeof crudo === 'string' ? JSON.parse(crudo) : (crudo || []);
    } catch {
      aviso(`Pedido #${pedido.id}: el JSON de productos está corrupto, no se pueden recuperar sus líneas.`);
      continue;
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      aviso(`Pedido #${pedido.id} no tiene productos: queda sin líneas.`);
      continue;
    }

    const estadoPedido = normalizar(pedido.estado, ESTADOS_VALIDOS, 'Pendiente', `Pedido #${pedido.id} estado`);

    for (const producto of productos) {
      const platoId = Number(producto.id);
      const plato = platosPorId.get(platoId);
      const cantidad = Math.max(1, Math.trunc(aNumero(producto.cantidad, 1)));

      // El precio del JSON es el que se cobró; si falta, se usa el del plato.
      const precioUnitario = aNumero(producto.precio, plato ? plato.precio : 0);

      if (!plato) {
        aviso(`Pedido #${pedido.id}: el plato #${platoId} ya no existe; la línea conserva nombre y precio pero queda sin vendedor.`);
      }

      items.push({
        id: siguienteId++,
        pedidoId: pedido.id,
        platoId: plato ? plato.id : null,
        vendedorId: plato ? plato.vendedorId : null,
        nombrePlato: sanear(String(producto.nombre || (plato ? plato.nombre : 'Producto')).trim()),
        precioUnitario,
        cantidad,
        subtotal: Number((precioUnitario * cantidad).toFixed(2)),
        // El esquema anterior tenía un único estado por pedido: se replica
        // en todas sus líneas, que es la equivalencia exacta.
        estado: estadoPedido,
        createdAt: aFecha(pedido.createdAt),
        updatedAt: aFecha(pedido.updatedAt)
      });
    }
  }

  return items;
}

function transformarPreguntas(filas, idsPlatos, idsUsuarios) {
  return filas
    .filter(p => {
      if (!idsPlatos.has(p.platoId) || !idsUsuarios.has(p.usuarioId)) {
        aviso(`Pregunta #${p.id} referencia un plato o usuario inexistente: se omite.`);
        return false;
      }
      return true;
    })
    .map(p => ({
      id: p.id,
      platoId: p.platoId,
      usuarioId: p.usuarioId,
      texto: sanear(String(p.texto || '').trim()) || '(consulta vacía)',
      respuesta: sanear(p.respuesta) || null,
      respondidaEn: p.respondidaEn ? new Date(p.respondidaEn) : null,
      createdAt: aFecha(p.createdAt),
      updatedAt: aFecha(p.updatedAt)
    }));
}

// ---------------------------------------------------------------------------
// Proceso principal
// ---------------------------------------------------------------------------

async function migrar() {
  const baseDatos = process.env.MYSQL_NAME || 'foodiebyte_db';

  log('\n╔══════════════════════════════════════════════════════════╗');
  log('║  FoodieByte · migración de datos MySQL → PostgreSQL      ║');
  log('╚══════════════════════════════════════════════════════════╝');
  if (SIMULACRO) log('\n🔍 MODO SIMULACRO: se lee y se valida todo, pero no se escribe nada.');

  // --- Conexión al origen ---
  let conexion;
  try {
    conexion = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: baseDatos,
      dateStrings: false,
      // Explícito para no introducir corrupción al leer: si la conexión
      // negocia latin1, los acentos y las ñ llegan mal.
      charset: 'utf8mb4'
    });
    log(`\n✅ Conectado al origen MySQL: ${baseDatos}`);
  } catch (err) {
    log(`\n❌ No se pudo conectar a MySQL: ${err.message}`);
    log('   Revisá las variables MYSQL_* del .env y que MySQL esté encendido en XAMPP.');
    process.exit(1);
  }

  // --- Conexión al destino ---
  try {
    await sequelize.authenticate();
    log(`✅ Conectado al destino PostgreSQL: ${sequelize.config.database}`);
  } catch (err) {
    log(`\n❌ No se pudo conectar a PostgreSQL: ${err.message}`);
    log('   Revisá las variables DB_* del .env y que hayas corrido: npm run db:migrate');
    await conexion.end();
    process.exit(1);
  }

  // --- El destino debe estar vacío ---
  const usuariosEnDestino = await db.Usuario.count();
  if (usuariosEnDestino > 0 && !FORZAR && !SIMULACRO) {
    log(`\n⚠️  El destino ya tiene ${usuariosEnDestino} usuarios.`);
    log('   Para no mezclar datos, la migración se detiene acá.');
    log('   Si querés reemplazarlos, volvé a empezar de cero:');
    log('     npm run db:reset  (y después no corras el seed)');
    log('   O ejecutá este script con --force para borrar el destino y migrar encima.');
    await conexion.end();
    await sequelize.close();
    process.exit(1);
  }

  // --- Lectura y transformación ---
  const origen = await leerOrigen(conexion, baseDatos);

  log('\n📊 Contenido de la base de origen:');
  log(`   Usuarios: ${origen.usuarios.length}`);
  log(`   Platos:   ${origen.platos.length}`);
  log(`   Pedidos:  ${origen.pedidos.length}`);
  if (origen.esquemaNuevo) log(`   Líneas de pedido: ${origen.items.length}`);
  log(`   Preguntas: ${origen.preguntas.length}`);

  if (origen.ignoradas.length > 0) {
    log('\n📌 Tablas de versiones anteriores que NO se migran (el modelo actual no las tiene):');
    for (const { tabla, filas } of origen.ignoradas) {
      log(`   ${tabla}: ${filas} fila(s)`);
    }
    log('   Quedan intactas en MySQL por si las necesitás.');
  }

  log('\n🔧 Transformando y validando…');

  const usuarios = transformarUsuarios(origen.usuarios, origen.colUsuarios);
  const idsUsuarios = new Set(usuarios.map(u => u.id));

  // Si algún plato quedó huérfano, se le asigna un vendedor real de la base.
  const vendedorPorDefecto = (usuarios.find(u => u.rol === 'vendedor')
    || usuarios.find(u => u.rol === 'admin')
    || usuarios[0] || {}).id || null;

  const platos = transformarPlatos(origen.platos, origen.colPlatos, idsUsuarios, vendedorPorDefecto);
  const idsPlatos = new Set(platos.map(p => p.id));
  const platosPorId = new Map(platos.map(p => [p.id, p]));

  const pedidos = transformarPedidos(origen.pedidos, idsUsuarios);
  const idsPedidos = new Set(pedidos.map(p => p.id));

  const items = origen.esquemaNuevo
    ? transformarItems(origen.items, idsPedidos, idsPlatos, idsUsuarios)
    : derivarItemsDesdeJSON(origen.pedidos, pedidos, platosPorId);

  const preguntas = transformarPreguntas(origen.preguntas, idsPlatos, idsUsuarios);

  resumen.push(['Usuarios', origen.usuarios.length, usuarios.length]);
  resumen.push(['Platos', origen.platos.length, platos.length]);
  resumen.push(['Pedidos', origen.pedidos.length, pedidos.length]);
  resumen.push(['Líneas de pedido', origen.esquemaNuevo ? origen.items.length : '(desde JSON)', items.length]);
  resumen.push(['Preguntas', origen.preguntas.length, preguntas.length]);

  if (SIMULACRO) {
    imprimirResumen();
    log('\n🔍 Simulacro terminado: no se escribió nada en PostgreSQL.');
    log('   Si el resumen te cierra, volvé a correrlo sin --dry-run.');
    await conexion.end();
    await sequelize.close();
    return;
  }

  // --- Escritura, todo o nada ---
  log('\n💾 Escribiendo en PostgreSQL…');
  const t = await sequelize.transaction();

  try {
    if (FORZAR && usuariosEnDestino > 0) {
      log('   Vaciando el destino (--force)…');
      // El orden importa por las claves foráneas.
      await db.Pregunta.destroy({ where: {}, transaction: t });
      await db.PedidoItem.destroy({ where: {}, transaction: t });
      await db.Pedido.destroy({ where: {}, transaction: t });
      await db.Plato.destroy({ where: {}, transaction: t });
      await db.Usuario.destroy({ where: {}, transaction: t });
    }

    // Se insertan en orden de dependencia para no violar las claves foráneas.
    if (usuarios.length) await db.Usuario.bulkCreate(usuarios, { transaction: t, validate: false });
    log(`   ✅ Usuarios: ${usuarios.length}`);

    if (platos.length) await db.Plato.bulkCreate(platos, { transaction: t, validate: false });
    log(`   ✅ Platos: ${platos.length}`);

    if (pedidos.length) await db.Pedido.bulkCreate(pedidos, { transaction: t, validate: false });
    log(`   ✅ Pedidos: ${pedidos.length}`);

    if (items.length) await db.PedidoItem.bulkCreate(items, { transaction: t, validate: false });
    log(`   ✅ Líneas de pedido: ${items.length}`);

    if (preguntas.length) await db.Pregunta.bulkCreate(preguntas, { transaction: t, validate: false });
    log(`   ✅ Preguntas: ${preguntas.length}`);

    await ajustarSecuencias(t);
    log('   ✅ Secuencias de IDs ajustadas');

    await t.commit();
  } catch (err) {
    await t.rollback();
    log(`\n❌ La migración falló y se revirtió por completo: ${err.message}`);
    log('   La base PostgreSQL quedó como estaba. No se migró nada a medias.');
    console.error(err);
    await conexion.end();
    await sequelize.close();
    process.exit(1);
  }

  // --- Verificación contra el destino real ---
  log('\n🔎 Verificando lo que quedó en PostgreSQL…');
  const conteos = {
    Usuarios: await db.Usuario.count(),
    Platos: await db.Plato.count(),
    Pedidos: await db.Pedido.count(),
    'Líneas de pedido': await db.PedidoItem.count(),
    Preguntas: await db.Pregunta.count()
  };

  let todoOk = true;
  const esperados = { Usuarios: usuarios.length, Platos: platos.length, Pedidos: pedidos.length, 'Líneas de pedido': items.length, Preguntas: preguntas.length };
  for (const [tabla, cantidad] of Object.entries(conteos)) {
    const ok = cantidad === esperados[tabla];
    if (!ok) todoOk = false;
    log(`   ${ok ? '✅' : '❌'} ${tabla}: ${cantidad}`);
  }

  const descuadres = await verificarTotales();
  if (descuadres.length === 0) {
    log('   ✅ Los totales de todos los pedidos coinciden con sus líneas');
  } else {
    log(`   ⚠️  ${descuadres.length} pedido(s) con el total descuadrado respecto de sus líneas:`);
    for (const d of descuadres) {
      log(`      Pedido #${d.id}: total ${d.totalPedido} vs. suma de líneas ${d.sumaLineas}`);
    }
    log('      Venían así del origen. Revisalos a mano si te importan esos pedidos.');
  }

  imprimirResumen();

  await conexion.end();
  await sequelize.close();

  if (!todoOk) {
    log('\n❌ Los conteos no coinciden. Revisá los mensajes de arriba.');
    process.exit(1);
  }

  log('\n🎉 Migración completada.');
  log('   Las imágenes de los platos no están en la base: siguen en server/uploads/platos/');
  log('   y las rutas guardadas en imagenUrl siguen siendo válidas.');
  log('   Arrancá el servidor con: npm start');
}

function imprimirResumen() {
  log('\n' + '─'.repeat(58));
  log('RESUMEN');
  log('─'.repeat(58));
  log('Tabla'.padEnd(24) + 'En origen'.padEnd(16) + 'Migradas');
  for (const [tabla, origen, destino] of resumen) {
    log(String(tabla).padEnd(24) + String(origen).padEnd(16) + String(destino));
  }
  if (textosSospechosos > 0) {
    log('');
    if (REPARAR_CODIFICACION) {
      log(`🔤 Codificación: ${textosReparados} de ${textosSospechosos} texto(s) con acentos rotos fueron reparados.`);
      if (textosReparados < textosSospechosos) {
        log(`   Los ${textosSospechosos - textosReparados} restantes no se pudieron reinterpretar y se copiaron tal cual.`);
      }
    } else {
      log(`🔤 Se detectaron ${textosSospechosos} texto(s) con acentos posiblemente rotos (ej. "PizzerÃ­a" en vez de "Pizzería").`);
      log('   Vienen así desde MySQL; la migración no los rompió.');
      log('   Para arreglarlos, volvé a correr con: --reparar-codificacion');
    }
  }

  if (advertencias.length > 0) {
    log(`\n${advertencias.length} advertencia(s) durante la migración (detalladas arriba).`);
  } else if (textosSospechosos === 0) {
    log('\nSin advertencias: los datos de origen estaban íntegros.');
  }
}

migrar().catch(async (err) => {
  console.error('\n💥 Error inesperado:', err);
  try { await sequelize.close(); } catch { /* ya cerrada */ }
  process.exit(1);
});
