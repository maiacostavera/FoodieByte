'use strict';

/**
 * Pruebas de integración de la API de FoodieByte.
 *
 * Levanta la aplicación real (app.js) contra la base de pruebas y verifica
 * los puntos críticos del sistema: autenticación, aislamiento entre locales
 * (multitenencia), control de stock con transacciones y el cálculo de
 * comisiones del administrador.
 *
 * Uso:  npm test
 *
 * Corre siempre sobre la base DB_NAME_TEST (por defecto foodiebyte_test),
 * nunca sobre la de desarrollo. La primera vez hay que crearla con
 * npm run db:test:create; las migraciones las aplica pretest antes de cada corrida.
 */

// Tiene que definirse antes de cargar los modelos: selecciona config.test.
process.env.NODE_ENV = 'test';

require('dotenv').config({ quiet: true });

const assert = require('assert');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const db = require('../models');
const { Usuario, Plato, Pedido, PedidoItem, Pregunta, sequelize } = db;

const PUERTO = 4100;
const BASE = `http://127.0.0.1:${PUERTO}`;
const SUFIJO = `pruebas-${Date.now()}`;
const PASSWORD = 'pruebas123';

let servidor;
const creados = { usuarios: [], platos: [] };
let pasadas = 0;
const fallidas = [];

// --- utilidades -------------------------------------------------------------

const prueba = async (nombre, fn) => {
  try {
    await fn();
    pasadas++;
    console.log(`  ✅ ${nombre}`);
  } catch (err) {
    fallidas.push({ nombre, error: err });
    console.log(`  ❌ ${nombre}`);
    console.log(`     ${err.message}`);
  }
};

const seccion = (titulo) => console.log(`\n${titulo}`);

const pedir = async (metodo, ruta, { token, body } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const texto = await respuesta.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }

  return { estado: respuesta.status, datos };
};

const crearUsuario = async (nombre, rol) => {
  const email = `${nombre}-${SUFIJO}@pruebas.local`.toLowerCase();
  const usuario = await Usuario.create({
    nombre,
    email,
    password: await bcrypt.hash(PASSWORD, 10),
    rol
  });
  creados.usuarios.push(usuario.id);

  const { datos } = await pedir('POST', '/api/usuarios/login', {
    body: { email, password: PASSWORD }
  });

  return { usuario, token: datos.token, email };
};

const crearPlato = async (vendedorId, nombre, precio, stock) => {
  const plato = await Plato.create({
    nombre: `${nombre} ${SUFIJO}`,
    descripcion: 'Plato de prueba automatizada',
    precio,
    categoria: 'Pizzas',
    stock,
    vendedorId
  });
  creados.platos.push(plato.id);
  return plato;
};

const limpiar = async () => {
  if (creados.usuarios.length > 0) {
    // Las claves foráneas en cascada arrastran platos, pedidos, líneas y preguntas.
    await Usuario.destroy({ where: { id: { [Op.in]: creados.usuarios } } });
  }
  if (creados.platos.length > 0) {
    await Plato.destroy({ where: { id: { [Op.in]: creados.platos } } });
  }
};

// --- suite ------------------------------------------------------------------

async function ejecutar() {
  await sequelize.authenticate();

  // Salvaguarda: si por algún motivo se cargó otra configuración, se corta
  // antes de crear un solo dato.
  const baseDePruebas = process.env.DB_NAME_TEST || 'foodiebyte_test';
  if (sequelize.config.database !== baseDePruebas) {
    throw new Error(`Las pruebas iban a correr sobre "${sequelize.config.database}" en lugar de "${baseDePruebas}".`);
  }

  // Es la misma aplicación que arranca index.js, con CORS y manejo de
  // errores incluidos: solo cambia el puerto.
  const app = require('../app');
  servidor = app.listen(PUERTO);
  await new Promise(resolve => servidor.once('listening', resolve));

  console.log(`\nFoodieByte · pruebas de integración (${BASE}, base "${sequelize.config.database}")`);

  // Actores de la prueba: dos locales que compiten y dos clientes distintos.
  const local1 = await crearUsuario('LocalUno', 'vendedor');
  const local2 = await crearUsuario('LocalDos', 'vendedor');
  const cliente1 = await crearUsuario('ClienteUno', 'foodie');
  const cliente2 = await crearUsuario('ClienteDos', 'foodie');
  const admin = await crearUsuario('AdminPruebas', 'admin');

  const platoLocal1 = await crearPlato(local1.usuario.id, 'Pizza Local1', 1000, 5);
  const platoLocal2 = await crearPlato(local2.usuario.id, 'Pizza Local2', 2000, 5);
  const platoEscaso = await crearPlato(local1.usuario.id, 'Plato Escaso', 500, 1);

  // -------------------------------------------------------------------------
  seccion('AUTENTICACIÓN');

  await prueba('Un token inventado es rechazado con 401', async () => {
    const { estado } = await pedir('GET', '/api/pedidos/mis-pedidos', { token: 'token-falso' });
    assert.strictEqual(estado, 401);
  });

  await prueba('Sin token no se accede a rutas protegidas', async () => {
    const { estado } = await pedir('GET', '/api/pedidos/mis-pedidos');
    assert.strictEqual(estado, 401);
  });

  await prueba('El login no revela si el email existe', async () => {
    const inexistente = await pedir('POST', '/api/usuarios/login', {
      body: { email: 'nadie@pruebas.local', password: 'x' }
    });
    const passwordMala = await pedir('POST', '/api/usuarios/login', {
      body: { email: cliente1.email, password: 'password-incorrecta' }
    });
    assert.strictEqual(inexistente.estado, 401);
    assert.strictEqual(passwordMala.estado, 401);
    assert.strictEqual(inexistente.datos.mensaje, passwordMala.datos.mensaje);
  });

  await prueba('El registro público no permite auto-asignarse el rol admin', async () => {
    const email = `escalada-${SUFIJO}@pruebas.local`;
    const alta = await pedir('POST', '/api/usuarios/register', {
      body: { nombre: 'Intruso', email, password: PASSWORD, rol: 'admin' }
    });
    assert.strictEqual(alta.estado, 201);

    const usuario = await Usuario.findOne({ where: { email } });
    creados.usuarios.push(usuario.id);
    assert.strictEqual(usuario.rol, 'foodie');
  });

  await prueba('El endpoint público de generación de hashes ya no existe', async () => {
    const { estado } = await pedir('POST', '/api/usuarios/generar-hash', {
      body: { password: 'x' }
    });
    assert.ok(estado === 404 || estado === 405, `Se esperaba 404/405 y llegó ${estado}`);
  });

  // -------------------------------------------------------------------------
  seccion('PEDIDOS Y STOCK (transacciones)');

  let pedidoCliente1;

  await prueba('Un foodie puede confirmar un pedido y se descuenta el stock', async () => {
    const { estado, datos } = await pedir('POST', '/api/pedidos', {
      token: cliente1.token,
      body: { productos: [{ id: platoLocal1.id, cantidad: 2 }] }
    });
    assert.strictEqual(estado, 201);
    pedidoCliente1 = datos.pedido;

    await platoLocal1.reload();
    assert.strictEqual(platoLocal1.stock, 3, 'El stock debía bajar de 5 a 3');
    assert.strictEqual(Number(datos.pedido.total), 2000);
  });

  await prueba('El precio se toma de la base, no del carrito del navegador', async () => {
    const { datos } = await pedir('POST', '/api/pedidos', {
      token: cliente2.token,
      // El cliente intenta cobrarse $1 en lugar de $1000.
      body: { productos: [{ id: platoLocal1.id, cantidad: 1, precio: 1 }] }
    });
    assert.strictEqual(Number(datos.pedido.total), 1000, 'Se respetó un precio manipulado por el cliente');
  });

  await prueba('Sin stock suficiente el pedido se rechaza y no se descuenta nada', async () => {
    const { estado } = await pedir('POST', '/api/pedidos', {
      token: cliente1.token,
      body: { productos: [{ id: platoEscaso.id, cantidad: 99 }] }
    });
    assert.strictEqual(estado, 409);

    await platoEscaso.reload();
    assert.strictEqual(platoEscaso.stock, 1, 'El stock se modificó pese al rechazo');
  });

  await prueba('Dos compras simultáneas del último plato: solo una prospera', async () => {
    const [a, b] = await Promise.all([
      pedir('POST', '/api/pedidos', {
        token: cliente1.token,
        body: { productos: [{ id: platoEscaso.id, cantidad: 1 }] }
      }),
      pedir('POST', '/api/pedidos', {
        token: cliente2.token,
        body: { productos: [{ id: platoEscaso.id, cantidad: 1 }] }
      })
    ]);

    const exitosas = [a, b].filter(r => r.estado === 201).length;
    assert.strictEqual(exitosas, 1, `Prosperaron ${exitosas} compras del único plato disponible`);

    await platoEscaso.reload();
    assert.strictEqual(platoEscaso.stock, 0, 'El stock quedó negativo o sin descontar');
  });

  await prueba('Un vendedor no puede realizar compras', async () => {
    const { estado } = await pedir('POST', '/api/pedidos', {
      token: local1.token,
      body: { productos: [{ id: platoLocal2.id, cantidad: 1 }] }
    });
    assert.strictEqual(estado, 403);
  });

  await prueba('Se rechazan las cantidades inválidas', async () => {
    const negativa = await pedir('POST', '/api/pedidos', {
      token: cliente1.token,
      body: { productos: [{ id: platoLocal1.id, cantidad: -5 }] }
    });
    assert.strictEqual(negativa.estado, 400);
  });

  // -------------------------------------------------------------------------
  seccion('AISLAMIENTO ENTRE LOCALES (multitenencia)');

  // Pedido mixto: un mismo carrito con platos de los dos locales.
  const mixto = await pedir('POST', '/api/pedidos', {
    token: cliente2.token,
    body: {
      productos: [
        { id: platoLocal1.id, cantidad: 1 },
        { id: platoLocal2.id, cantidad: 2 }
      ]
    }
  });
  const pedidoMixto = mixto.datos.pedido;

  await prueba('Un cliente no puede ver los pedidos de otro cliente', async () => {
    const { datos } = await pedir('GET', '/api/pedidos/mis-pedidos', { token: cliente1.token });
    const ids = datos.map(p => p.id);
    assert.ok(!ids.includes(pedidoMixto.id), 'Se filtró el pedido de otro cliente');
    assert.ok(datos.every(p => p.usuarioId === cliente1.usuario.id));
  });

  await prueba('Cada local ve solo las comandas que incluyen sus platos', async () => {
    const { datos } = await pedir('GET', '/api/pedidos/comandas', { token: local2.token });
    const idsPlatos = datos.flatMap(p => p.items.map(i => i.platoId));
    assert.ok(idsPlatos.length > 0, 'El local no recibió ninguna comanda');
    assert.ok(!idsPlatos.includes(platoLocal1.id), 'El local vio platos de su competencia');
    assert.ok(idsPlatos.includes(platoLocal2.id));
  });

  await prueba('En un pedido mixto cada local ve solo su parte del importe', async () => {
    const { datos } = await pedir('GET', '/api/pedidos/comandas', { token: local2.token });
    const comanda = datos.find(p => p.id === pedidoMixto.id);
    assert.ok(comanda, 'El local no recibió el pedido mixto');
    // El pedido completo son $5000 ($1000 del local 1 + $4000 del local 2).
    assert.strictEqual(Number(comanda.totalVendedor), 4000);
    assert.strictEqual(comanda.items.length, 1);
  });

  await prueba('Un local no puede cambiar el estado de un pedido ajeno', async () => {
    const soloLocal1 = pedidoCliente1.id;
    const { estado } = await pedir('PUT', `/api/pedidos/${soloLocal1}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Rechazado' }
    });
    assert.strictEqual(estado, 403);

    const pedido = await Pedido.findByPk(soloLocal1);
    assert.strictEqual(pedido.estado, 'Pendiente', 'Un tercero alteró el estado del pedido');
  });

  await prueba('En un pedido mixto cada local cambia solo el estado de sus líneas', async () => {
    const respuesta = await pedir('PUT', `/api/pedidos/${pedidoMixto.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Enviado' }
    });
    assert.strictEqual(respuesta.estado, 200);

    const items = await PedidoItem.findAll({ where: { pedidoId: pedidoMixto.id } });
    const delLocal1 = items.find(i => i.vendedorId === local1.usuario.id);
    const delLocal2 = items.find(i => i.vendedorId === local2.usuario.id);

    assert.strictEqual(delLocal2.estado, 'Enviado');
    assert.strictEqual(delLocal1.estado, 'Pendiente', 'Se alteró la línea del otro local');

    // Mientras un local no despache, el pedido general sigue pendiente.
    const pedido = await Pedido.findByPk(pedidoMixto.id);
    assert.strictEqual(pedido.estado, 'Pendiente');
  });

  await prueba('El pedido pasa a Enviado cuando todos los locales despachan', async () => {
    await pedir('PUT', `/api/pedidos/${pedidoMixto.id}/estado`, {
      token: local1.token,
      body: { nuevoEstado: 'Enviado' }
    });
    const pedido = await Pedido.findByPk(pedidoMixto.id);
    assert.strictEqual(pedido.estado, 'Enviado');
  });

  await prueba('Las estadísticas del vendedor son solo de su propio local', async () => {
    const uno = await pedir('GET', '/api/pedidos/estadisticas', { token: local1.token });
    const dos = await pedir('GET', '/api/pedidos/estadisticas', { token: local2.token });

    // Local 1 despachó $1000 del pedido mixto; local 2 despachó $4000.
    assert.strictEqual(Number(uno.datos.totalFacturado), 1000);
    assert.strictEqual(Number(dos.datos.totalFacturado), 4000);

    const alertasDeUno = uno.datos.platosEnAlerta.map(p => p.id);
    assert.ok(!alertasDeUno.includes(platoLocal2.id), 'Se filtró el stock de otro local');
  });

  await prueba('La serie de ventas por día cubre dos semanas y cuadra con lo facturado', async () => {
    const { datos } = await pedir('GET', '/api/pedidos/estadisticas', { token: local1.token });
    assert.strictEqual(datos.ventasPorDia.length, 14);

    const fechas = datos.ventasPorDia.map(dia => dia.fecha);
    assert.deepStrictEqual([...fechas].sort(), fechas, 'Los días no vienen en orden');

    // Todo lo que vendió este local se vendió hoy, durante las pruebas: la
    // serie tiene que sumar exactamente lo facturado y caer en el último día.
    const sumaDeLaSerie = datos.ventasPorDia.reduce((acc, dia) => acc + dia.total, 0);
    assert.strictEqual(sumaDeLaSerie, Number(datos.totalFacturado));
    assert.strictEqual(datos.ventasPorDia[13].total, Number(datos.totalFacturado));
  });

  await prueba('Los platos más vendidos de un local son solo los suyos', async () => {
    const { datos } = await pedir('GET', '/api/pedidos/estadisticas', { token: local2.token });
    assert.ok(Array.isArray(datos.masVendidos) && datos.masVendidos.length > 0);

    const lineasPropias = await PedidoItem.findAll({ where: { vendedorId: local2.usuario.id } });
    const nombresPropios = new Set(lineasPropias.map(linea => linea.nombrePlato));
    assert.ok(datos.masVendidos.every(plato => nombresPropios.has(plato.nombre)), 'Aparecen platos de otro local');
  });

  await prueba('Un local no puede editar ni borrar el plato de otro', async () => {
    const edicion = await pedir('PUT', `/api/platos/${platoLocal2.id}/stock`, {
      token: local1.token,
      body: { stock: 99 }
    });
    const borrado = await pedir('DELETE', `/api/platos/${platoLocal2.id}`, { token: local1.token });

    assert.strictEqual(edicion.estado, 403);
    assert.strictEqual(borrado.estado, 403);

    await platoLocal2.reload();
    assert.notStrictEqual(platoLocal2.stock, 99);
  });

  await prueba('El inventario del vendedor devuelve solo sus platos', async () => {
    const { datos } = await pedir('GET', '/api/platos/mis-platos', { token: local1.token });
    assert.ok(datos.length > 0);
    assert.ok(datos.every(p => p.vendedorId === local1.usuario.id));
  });

  // -------------------------------------------------------------------------
  seccion('PANEL DE ADMINISTRACIÓN');

  await prueba('Un vendedor no accede a las rutas del administrador', async () => {
    const usuarios = await pedir('GET', '/api/admin/usuarios', { token: local1.token });
    const comisiones = await pedir('GET', '/api/admin/comisiones-vendedores', { token: local1.token });
    assert.strictEqual(usuarios.estado, 403);
    assert.strictEqual(comisiones.estado, 403);
  });

  await prueba('Un foodie tampoco accede a las rutas del administrador', async () => {
    const { estado } = await pedir('GET', '/api/admin/estadisticas', { token: cliente1.token });
    assert.strictEqual(estado, 403);
  });

  await prueba('La liquidación calcula la comisión del 5% por local', async () => {
    const { estado, datos } = await pedir('GET', '/api/admin/comisiones-vendedores', { token: admin.token });
    assert.strictEqual(estado, 200);

    const filaLocal1 = datos.find(f => f.id === local1.usuario.id);
    const filaLocal2 = datos.find(f => f.id === local2.usuario.id);

    assert.ok(filaLocal1 && filaLocal2, 'Faltan locales en la liquidación');
    assert.strictEqual(filaLocal1.totalVentas, 1000);
    assert.strictEqual(filaLocal1.comisionDebida, 50);
    assert.strictEqual(filaLocal2.totalVentas, 4000);
    assert.strictEqual(filaLocal2.comisionDebida, 200);
    assert.strictEqual(filaLocal2.netoVendedor, 3800);
  });

  await prueba('Los KPIs globales informan las ganancias de la plataforma', async () => {
    const { datos } = await pedir('GET', '/api/admin/estadisticas', { token: admin.token });
    assert.ok(typeof datos.gananciasPlataforma === 'number', 'No se devuelve gananciasPlataforma');
    assert.strictEqual(datos.porcentajeComision, 0.05);
    // La comisión siempre es el 5% del volumen despachado.
    assert.strictEqual(
      datos.gananciasPlataforma,
      Number((datos.volumenVentas * 0.05).toFixed(2))
    );
  });

  await prueba('El admin ve las ventas por día de toda la plataforma', async () => {
    const plataforma = await pedir('GET', '/api/admin/estadisticas', { token: admin.token });
    const uno = await pedir('GET', '/api/pedidos/estadisticas', { token: local1.token });
    const dos = await pedir('GET', '/api/pedidos/estadisticas', { token: local2.token });

    assert.strictEqual(plataforma.datos.ventasPorDia.length, 14);
    const hoy = (respuesta) => respuesta.datos.ventasPorDia[13].total;
    assert.ok(hoy(plataforma) >= hoy(uno) + hoy(dos), 'La plataforma vendió hoy menos que dos de sus locales');
  });

  await prueba('El admin no puede quitarse a sí mismo el rol de administrador', async () => {
    const { estado } = await pedir('PUT', `/api/admin/usuarios/${admin.usuario.id}/rol`, {
      token: admin.token,
      body: { nuevoRol: 'foodie' }
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('Un pedido rechazado no genera comisión', async () => {
    const previo = await pedir('GET', '/api/admin/estadisticas', { token: admin.token });

    const compra = await pedir('POST', '/api/pedidos', {
      token: cliente1.token,
      body: { productos: [{ id: platoLocal2.id, cantidad: 1 }] }
    });
    await pedir('PUT', `/api/pedidos/${compra.datos.pedido.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Rechazado' }
    });

    const posterior = await pedir('GET', '/api/admin/estadisticas', { token: admin.token });
    assert.strictEqual(posterior.datos.gananciasPlataforma, previo.datos.gananciasPlataforma);
  });

  // -------------------------------------------------------------------------
  seccion('SOLICITUD DE VENDEDOR Y PREGUNTAS');

  await prueba('La solicitud de vendedor guarda los datos del formulario', async () => {
    const { estado } = await pedir('POST', '/api/usuarios/solicitar-vendedor', {
      token: cliente1.token,
      body: {
        nombreLocal: 'El Rincón del Sabor',
        descripcionProductos: 'Comida casera',
        telefono: '1123456789',
        direccion: 'Av. Siempre Viva 742',
        categoria: 'Empanadas'
      }
    });
    assert.strictEqual(estado, 200);

    await cliente1.usuario.reload();
    assert.strictEqual(cliente1.usuario.solicitud_vendedor, true);
    assert.strictEqual(cliente1.usuario.nombre_local, 'El Rincón del Sabor');
    assert.strictEqual(cliente1.usuario.telefono, '1123456789');
    assert.strictEqual(cliente1.usuario.direccion, 'Av. Siempre Viva 742');
  });

  await prueba('El admin ve los datos de la solicitud para poder evaluarla', async () => {
    const { datos } = await pedir('GET', '/api/admin/usuarios', { token: admin.token });
    const postulante = datos.find(u => u.id === cliente1.usuario.id);
    assert.strictEqual(postulante.nombre_local, 'El Rincón del Sabor');
    assert.strictEqual(postulante.categoria_local, 'Empanadas');
  });

  await prueba('Las respuestas de la API nunca incluyen el hash de la contraseña', async () => {
    const { datos } = await pedir('GET', '/api/admin/usuarios', { token: admin.token });
    assert.ok(datos.every(u => u.password === undefined), 'Se filtró el hash de una contraseña');
  });

  let preguntaCreada;

  await prueba('Un foodie publica una pregunta y queda persistida', async () => {
    const { estado, datos } = await pedir('POST', `/api/platos/${platoLocal1.id}/preguntas`, {
      token: cliente2.token,
      body: { texto: '¿La pizza es apta para celíacos?' }
    });
    assert.strictEqual(estado, 201);
    preguntaCreada = datos.pregunta;

    // Se relee desde la base: no es solo estado del navegador.
    const enBase = await Pregunta.findByPk(preguntaCreada.id);
    assert.ok(enBase, 'La pregunta no se guardó en la base de datos');
    assert.strictEqual(enBase.texto, '¿La pizza es apta para celíacos?');
  });

  await prueba('Un local no puede responder preguntas de platos ajenos', async () => {
    const { estado } = await pedir('PUT', `/api/platos/${platoLocal1.id}/preguntas/${preguntaCreada.id}`, {
      token: local2.token,
      body: { respuesta: 'Respuesta indebida' }
    });
    assert.strictEqual(estado, 403);
  });

  await prueba('El dueño del plato responde y la respuesta queda persistida', async () => {
    const { estado } = await pedir('PUT', `/api/platos/${platoLocal1.id}/preguntas/${preguntaCreada.id}`, {
      token: local1.token,
      body: { respuesta: 'Sí, tenemos masa sin TACC.' }
    });
    assert.strictEqual(estado, 200);

    const enBase = await Pregunta.findByPk(preguntaCreada.id);
    assert.strictEqual(enBase.respuesta, 'Sí, tenemos masa sin TACC.');
    assert.ok(enBase.respondidaEn instanceof Date);
  });

  await prueba('Las preguntas se listan públicamente en la ficha del plato', async () => {
    const { estado, datos } = await pedir('GET', `/api/platos/${platoLocal1.id}/preguntas`);
    assert.strictEqual(estado, 200);
    assert.ok(datos.some(p => p.id === preguntaCreada.id));
    assert.ok(datos[0].autor && datos[0].autor.nombre, 'Falta el autor de la pregunta');
  });

  await prueba('Un vendedor no puede publicar preguntas', async () => {
    const { estado } = await pedir('POST', `/api/platos/${platoLocal2.id}/preguntas`, {
      token: local1.token,
      body: { texto: '¿Cuánto vendés por día?' }
    });
    assert.strictEqual(estado, 403);
  });

  // -------------------------------------------------------------------------
  seccion('CATÁLOGO PÚBLICO');

  await prueba('El catálogo y las categorías son accesibles sin iniciar sesión', async () => {
    const catalogo = await pedir('GET', '/api/platos');
    const categorias = await pedir('GET', '/api/platos/categorias');
    assert.strictEqual(catalogo.estado, 200);
    assert.strictEqual(categorias.estado, 200);
    assert.ok(Array.isArray(categorias.datos) && categorias.datos.includes('Pizzas'));
  });

  await prueba('La búsqueda filtra del lado del servidor', async () => {
    const { datos } = await pedir('GET', `/api/platos?busqueda=${encodeURIComponent(SUFIJO)}`);
    assert.ok(datos.length >= 3, 'La búsqueda no encontró los platos de prueba');
    assert.ok(datos.every(p => p.nombre.includes(SUFIJO)));
  });

  await prueba('La búsqueda toma % y _ como texto, no como comodines', async () => {
    const catalogo = await pedir('GET', '/api/platos');
    const conComodin = await pedir('GET', `/api/platos?busqueda=${encodeURIComponent('%')}`);
    assert.strictEqual(conComodin.estado, 200);
    assert.ok(conComodin.datos.length < catalogo.datos.length, 'El "%" se usó como comodín y devolvió todo el catálogo');
  });

  await prueba('Un parámetro de búsqueda repetido no rompe el catálogo', async () => {
    const { estado } = await pedir('GET', '/api/platos?busqueda=pizza&busqueda=sushi');
    assert.strictEqual(estado, 200);
  });

  await prueba('El precio de los platos llega como número', async () => {
    const { datos } = await pedir('GET', `/api/platos?busqueda=${encodeURIComponent(SUFIJO)}`);
    assert.ok(datos.length > 0);
    assert.ok(datos.every(p => typeof p.precio === 'number'), 'El precio llegó como texto');
  });

  // -------------------------------------------------------------------------
  seccion('DATOS INVÁLIDOS (400 en lugar de 500)');

  await prueba('Un id no numérico en la URL responde 400', async () => {
    const publica = await pedir('GET', '/api/platos/abc/preguntas');
    const protegida = await pedir('PUT', '/api/pedidos/abc/estado', {
      token: local1.token,
      body: { nuevoEstado: 'Enviado' }
    });
    const deAdmin = await pedir('DELETE', '/api/admin/platos/1e3', { token: admin.token });
    assert.strictEqual(publica.estado, 400);
    assert.strictEqual(protegida.estado, 400);
    assert.strictEqual(deAdmin.estado, 400);
  });

  await prueba('Un id fuera del rango de INTEGER responde 400', async () => {
    const { estado } = await pedir('GET', '/api/platos/99999999999/preguntas');
    assert.strictEqual(estado, 400);
  });

  await prueba('Un nombre demasiado largo en el registro responde 400', async () => {
    const email = `largo-${SUFIJO}@pruebas.local`;
    const { estado } = await pedir('POST', '/api/usuarios/register', {
      body: { nombre: 'x'.repeat(300), email, password: PASSWORD }
    });
    const colado = await Usuario.findOne({ where: { email } });
    if (colado) creados.usuarios.push(colado.id);
    assert.strictEqual(estado, 400);
  });

  await prueba('Campos con tipos inválidos en el registro responden 400', async () => {
    const { estado } = await pedir('POST', '/api/usuarios/register', {
      body: { nombre: 12345, email: { falso: true }, password: PASSWORD }
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('Un texto demasiado largo en la solicitud de vendedor responde 400', async () => {
    const { estado } = await pedir('POST', '/api/usuarios/solicitar-vendedor', {
      token: cliente2.token,
      body: {
        nombreLocal: 'Local de prueba',
        descripcionProductos: 'Comida casera',
        telefono: '1123456789',
        direccion: 'x'.repeat(300),
        categoria: 'Pizzas'
      }
    });
    assert.strictEqual(estado, 400);
    await cliente2.usuario.reload();
    assert.strictEqual(cliente2.usuario.solicitud_vendedor, false, 'Se guardó una solicitud inválida');
  });

  await prueba('Un plato con nombre demasiado largo responde 400', async () => {
    const { estado } = await pedir('POST', '/api/platos', {
      token: local1.token,
      body: { nombre: 'x'.repeat(300), precio: 100, stock: 1, categoria: 'Pizzas' }
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('El mismo email registrado dos veces a la vez: un alta y un 409', async () => {
    const email = `doble-${SUFIJO}@pruebas.local`;
    const alta = { body: { nombre: 'Alta doble', email, password: PASSWORD } };
    const respuestas = await Promise.all([
      pedir('POST', '/api/usuarios/register', alta),
      pedir('POST', '/api/usuarios/register', alta)
    ]);
    const creado = await Usuario.findOne({ where: { email } });
    if (creado) creados.usuarios.push(creado.id);
    assert.deepStrictEqual(respuestas.map(r => r.estado).sort(), [201, 409]);
  });

  // -------------------------------------------------------------------------
  seccion('ESTADOS FINALES Y STOCK DE LAS COMANDAS');

  const comprar = async (cliente, plato, cantidad) => {
    const { estado, datos } = await pedir('POST', '/api/pedidos', {
      token: cliente.token,
      body: { productos: [{ id: plato.id, cantidad }] }
    });
    assert.strictEqual(estado, 201, `La compra de preparación falló: ${datos && datos.mensaje}`);
    return datos.pedido;
  };

  const platoRechazos = await crearPlato(local2.usuario.id, 'Plato Rechazos', 800, 5);
  let pedidoRechazado;

  await prueba('Al rechazar un pedido las unidades vuelven al stock', async () => {
    pedidoRechazado = await comprar(cliente1, platoRechazos, 2);
    await platoRechazos.reload();
    assert.strictEqual(platoRechazos.stock, 3, 'La compra no descontó el stock');

    const { estado } = await pedir('PUT', `/api/pedidos/${pedidoRechazado.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Rechazado' }
    });
    assert.strictEqual(estado, 200);

    await platoRechazos.reload();
    assert.strictEqual(platoRechazos.stock, 5, 'El rechazo no repuso el stock');
  });

  await prueba('Un pedido rechazado no se puede volver a cambiar', async () => {
    const { estado } = await pedir('PUT', `/api/pedidos/${pedidoRechazado.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Enviado' }
    });
    assert.strictEqual(estado, 409);

    const lineas = await PedidoItem.findAll({ where: { pedidoId: pedidoRechazado.id } });
    assert.ok(lineas.every(l => l.estado === 'Rechazado'), 'Se alteró un estado final');
  });

  await prueba('Un pedido enviado tampoco se puede rechazar después', async () => {
    const pedido = await comprar(cliente1, platoRechazos, 1);
    await pedir('PUT', `/api/pedidos/${pedido.id}/estado`, { token: local2.token, body: { nuevoEstado: 'Enviado' } });
    await platoRechazos.reload();
    const stockTrasEnviar = platoRechazos.stock;

    const { estado } = await pedir('PUT', `/api/pedidos/${pedido.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Rechazado' }
    });
    assert.strictEqual(estado, 409);

    await platoRechazos.reload();
    assert.strictEqual(platoRechazos.stock, stockTrasEnviar, 'Se repuso el stock de un pedido ya enviado');
  });

  await prueba('Pendiente no es un estado al que se pueda pasar', async () => {
    const pedido = await comprar(cliente1, platoRechazos, 1);
    const { estado } = await pedir('PUT', `/api/pedidos/${pedido.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Pendiente' }
    });
    assert.strictEqual(estado, 400);
  });

  await prueba('La reposición respeta el stock máximo del plato', async () => {
    const platoTope = await crearPlato(local2.usuario.id, 'Plato Tope', 300, 1);
    const pedido = await comprar(cliente2, platoTope, 1);

    // Mientras el pedido estaba pendiente, el local recargó el stock al máximo.
    await pedir('PUT', `/api/platos/${platoTope.id}/stock`, { token: local2.token, body: { stock: 100 } });

    const { estado } = await pedir('PUT', `/api/pedidos/${pedido.id}/estado`, {
      token: local2.token,
      body: { nuevoEstado: 'Rechazado' }
    });
    assert.strictEqual(estado, 200);

    await platoTope.reload();
    assert.strictEqual(platoTope.stock, 100);
  });

  await prueba('Dos locales despachando a la vez dejan el pedido en Enviado', async () => {
    const platoA = await crearPlato(local1.usuario.id, 'Plato Simultáneo A', 100, 20);
    const platoB = await crearPlato(local2.usuario.id, 'Plato Simultáneo B', 100, 20);

    // Varias rondas, para que la carrera tenga oportunidad real de ocurrir.
    for (let ronda = 1; ronda <= 5; ronda++) {
      const { datos } = await pedir('POST', '/api/pedidos', {
        token: cliente2.token,
        body: { productos: [{ id: platoA.id, cantidad: 1 }, { id: platoB.id, cantidad: 1 }] }
      });
      const pedidoId = datos.pedido.id;

      await Promise.all([
        pedir('PUT', `/api/pedidos/${pedidoId}/estado`, { token: local1.token, body: { nuevoEstado: 'Enviado' } }),
        pedir('PUT', `/api/pedidos/${pedidoId}/estado`, { token: local2.token, body: { nuevoEstado: 'Enviado' } })
      ]);

      const pedido = await Pedido.findByPk(pedidoId);
      assert.strictEqual(pedido.estado, 'Enviado', `Ronda ${ronda}: el pedido quedó ${pedido.estado} con todas sus líneas enviadas`);
    }
  });

  await prueba('Un pedido con una parte enviada y otra rechazada queda Enviado', async () => {
    const platoA = await crearPlato(local1.usuario.id, 'Plato Mixto A', 100, 10);
    const platoB = await crearPlato(local2.usuario.id, 'Plato Mixto B', 100, 10);

    const { datos } = await pedir('POST', '/api/pedidos', {
      token: cliente2.token,
      body: { productos: [{ id: platoA.id, cantidad: 1 }, { id: platoB.id, cantidad: 1 }] }
    });
    const pedidoId = datos.pedido.id;

    const envio = await pedir('PUT', `/api/pedidos/${pedidoId}/estado`, { token: local1.token, body: { nuevoEstado: 'Enviado' } });
    assert.strictEqual(envio.datos.estadoPedido, 'Pendiente', 'Con un local sin responder, el pedido tiene que seguir Pendiente');

    const rechazo = await pedir('PUT', `/api/pedidos/${pedidoId}/estado`, { token: local2.token, body: { nuevoEstado: 'Rechazado' } });
    assert.strictEqual(rechazo.datos.estadoPedido, 'Enviado');

    const { datos: misPedidos } = await pedir('GET', '/api/pedidos/mis-pedidos', { token: cliente2.token });
    const pedido = misPedidos.find(p => p.id === pedidoId);
    assert.strictEqual(pedido.estado, 'Enviado', `El pedido quedó ${pedido.estado} sin líneas pendientes`);
    assert.deepStrictEqual(pedido.items.map(i => i.estado).sort(), ['Enviado', 'Rechazado'], 'Cada línea tiene que conservar su propio estado');
  });

  // -------------------------------------------------------------------------
  seccion('PERMISOS VIGENTES (el rol sale de la base, no del token)');

  await prueba('Un vendedor al que le quitan el rol pierde el acceso con su token anterior', async () => {
    const degradado = await crearUsuario('LocalDegradado', 'vendedor');
    const cambio = await pedir('PUT', `/api/admin/usuarios/${degradado.usuario.id}/rol`, {
      token: admin.token,
      body: { nuevoRol: 'foodie' }
    });
    assert.strictEqual(cambio.estado, 200);

    const nombre = `Plato con token viejo ${SUFIJO}`;
    const { estado } = await pedir('POST', '/api/platos', {
      token: degradado.token,
      body: { nombre, precio: 100, stock: 1, categoria: 'Pizzas' }
    });
    assert.strictEqual(estado, 401);
    assert.strictEqual(await Plato.count({ where: { nombre } }), 0, 'Se publicó un plato con un rol revocado');
  });

  await prueba('Al volver a iniciar sesión rige el rol nuevo', async () => {
    const promovido = await crearUsuario('ClientePromovido', 'foodie');
    await pedir('PUT', `/api/admin/usuarios/${promovido.usuario.id}/rol`, {
      token: admin.token,
      body: { nuevoRol: 'vendedor' }
    });

    const conTokenViejo = await pedir('GET', '/api/platos/mis-platos', { token: promovido.token });
    assert.strictEqual(conTokenViejo.estado, 401, 'El token anterior al cambio de rol siguió sirviendo');

    const login = await pedir('POST', '/api/usuarios/login', { body: { email: promovido.email, password: PASSWORD } });
    const conTokenNuevo = await pedir('GET', '/api/platos/mis-platos', { token: login.datos.token });
    assert.strictEqual(conTokenNuevo.estado, 200);
  });

  await prueba('Un usuario borrado de la base ya no puede usar su token', async () => {
    const borrado = await crearUsuario('ClienteBorrado', 'foodie');
    await Usuario.destroy({ where: { id: borrado.usuario.id } });

    const { estado } = await pedir('GET', '/api/pedidos/mis-pedidos', { token: borrado.token });
    assert.strictEqual(estado, 401);
  });

  // -------------------------------------------------------------------------
  seccion('CUENTAS DESACTIVADAS (el historial se conserva)');

  await prueba('Un usuario desactivado pierde el acceso con su token y no puede volver a entrar', async () => {
    const cliente = await crearUsuario('ClienteDesactivado', 'foodie');
    const baja = await pedir('PUT', `/api/admin/usuarios/${cliente.usuario.id}/desactivar`, { token: admin.token });
    assert.strictEqual(baja.estado, 200);

    const conToken = await pedir('GET', '/api/pedidos/mis-pedidos', { token: cliente.token });
    assert.strictEqual(conToken.estado, 401);

    const login = await pedir('POST', '/api/usuarios/login', { body: { email: cliente.email, password: PASSWORD } });
    assert.strictEqual(login.estado, 403);
  });

  await prueba('Una contraseña incorrecta no revela que la cuenta está desactivada', async () => {
    const cliente = await crearUsuario('ClienteInactivo', 'foodie');
    await pedir('PUT', `/api/admin/usuarios/${cliente.usuario.id}/desactivar`, { token: admin.token });

    const login = await pedir('POST', '/api/usuarios/login', { body: { email: cliente.email, password: 'incorrecta' } });
    assert.strictEqual(login.estado, 401);
  });

  await prueba('Desactivar un local conserva sus pedidos y su liquidación', async () => {
    const local = await crearUsuario('LocalHistorico', 'vendedor');
    const plato = await crearPlato(local.usuario.id, 'Plato Histórico', 1500, 10);
    const pedido = await comprar(cliente2, plato, 2);
    await pedir('PUT', `/api/pedidos/${pedido.id}/estado`, { token: local.token, body: { nuevoEstado: 'Enviado' } });

    const antes = await pedir('GET', '/api/admin/comisiones-vendedores', { token: admin.token });
    const filaAntes = antes.datos.find(f => f.id === local.usuario.id);
    assert.ok(filaAntes, 'El local no figuraba en la liquidación antes de desactivarlo');

    const baja = await pedir('PUT', `/api/admin/usuarios/${local.usuario.id}/desactivar`, { token: admin.token });
    assert.strictEqual(baja.estado, 200);

    const despues = await pedir('GET', '/api/admin/comisiones-vendedores', { token: admin.token });
    const filaDespues = despues.datos.find(f => f.id === local.usuario.id);
    assert.deepStrictEqual(filaDespues, filaAntes, 'La liquidación cambió al desactivar el local');
    assert.ok(await Pedido.findByPk(pedido.id), 'Se perdió el pedido del local desactivado');
  });

  await prueba('Los platos de un local desactivado salen del catálogo y vuelven al reactivarlo', async () => {
    const local = await crearUsuario('LocalCerrado', 'vendedor');
    const plato = await crearPlato(local.usuario.id, 'Plato Local Cerrado', 700, 10);
    const buscar = () => pedir('GET', `/api/platos?busqueda=${encodeURIComponent(plato.nombre)}`);

    assert.strictEqual((await buscar()).datos.length, 1, 'El plato no aparecía antes de desactivar el local');

    await pedir('PUT', `/api/admin/usuarios/${local.usuario.id}/desactivar`, { token: admin.token });
    assert.strictEqual((await buscar()).datos.length, 0, 'El plato siguió en el catálogo');

    const compra = await pedir('POST', '/api/pedidos', {
      token: cliente1.token,
      body: { productos: [{ id: plato.id, cantidad: 1 }] }
    });
    assert.strictEqual(compra.estado, 404, 'Se pudo comprar un plato de un local desactivado');

    await pedir('PUT', `/api/admin/usuarios/${local.usuario.id}/reactivar`, { token: admin.token });
    assert.strictEqual((await buscar()).datos.length, 1, 'El plato no volvió al catálogo al reactivar el local');
  });

  await prueba('Los platos de un vendedor que pierde el rol salen del catálogo', async () => {
    const local = await crearUsuario('LocalSinRol', 'vendedor');
    const plato = await crearPlato(local.usuario.id, 'Plato Local Sin Rol', 650, 10);
    await pedir('PUT', `/api/admin/usuarios/${local.usuario.id}/rol`, { token: admin.token, body: { nuevoRol: 'foodie' } });

    const { datos } = await pedir('GET', `/api/platos?busqueda=${encodeURIComponent(plato.nombre)}`);
    assert.strictEqual(datos.length, 0);
  });

  await prueba('Los KPIs no cuentan las cuentas desactivadas', async () => {
    const local = await crearUsuario('LocalKpi', 'vendedor');
    const antes = await pedir('GET', '/api/admin/estadisticas', { token: admin.token });
    await pedir('PUT', `/api/admin/usuarios/${local.usuario.id}/desactivar`, { token: admin.token });
    const despues = await pedir('GET', '/api/admin/estadisticas', { token: admin.token });

    assert.strictEqual(despues.datos.localesActivos, antes.datos.localesActivos - 1);
    assert.strictEqual(despues.datos.usuariosTotales, antes.datos.usuariosTotales - 1);
  });

  await prueba('El admin no puede desactivar su propia cuenta', async () => {
    const { estado } = await pedir('PUT', `/api/admin/usuarios/${admin.usuario.id}/desactivar`, { token: admin.token });
    assert.strictEqual(estado, 400);
  });

  await prueba('Los usuarios ya no se pueden borrar desde la API', async () => {
    const { estado } = await pedir('DELETE', `/api/admin/usuarios/${cliente1.usuario.id}`, { token: admin.token });
    assert.strictEqual(estado, 404);
    assert.ok(await Usuario.findByPk(cliente1.usuario.id), 'El usuario se borró');
  });

  // -------------------------------------------------------------------------
  seccion('SEGURIDAD DE LA API');

  // Utilidades de disco para comprobar que no quedan imágenes huérfanas.
  const fs = require('fs');
  const path = require('path');
  const { CARPETA_PLATOS } = require('../utils/imagenes');
  const archivosSubidos = () => fs.readdirSync(CARPETA_PLATOS).filter(nombre => !nombre.startsWith('.'));
  const rutaEnDisco = (imagenUrl) => path.join(CARPETA_PLATOS, path.basename(imagenUrl));
  const pngValido = {
    contenido: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
    tipo: 'image/png',
    nombre: 'foto.png'
  };

  // Envía un plato como multipart/form-data, igual que el formulario del panel.
  const enviarPlato = async (metodo, ruta, token, campos, archivo) => {
    const formulario = new FormData();
    for (const [clave, valor] of Object.entries(campos)) formulario.append(clave, String(valor));
    if (archivo) formulario.append('imagen', new Blob([archivo.contenido], { type: archivo.tipo }), archivo.nombre);
    const respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}` },
      body: formulario
    });
    return { estado: respuesta.status, datos: await respuesta.json() };
  };

  await prueba('Las respuestas incluyen encabezados de seguridad', async () => {
    const respuesta = await fetch(`${BASE}/api/health`);
    assert.strictEqual(respuesta.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(respuesta.headers.get('content-security-policy'), 'Falta Content-Security-Policy');
    // Las imágenes de /uploads se piden desde el origen del frontend.
    assert.strictEqual(respuesta.headers.get('cross-origin-resource-policy'), 'cross-origin');
  });

  await prueba('Muchos intentos fallidos de login para un mismo correo se frenan con 429', async () => {
    const email = `fuerza-bruta-${SUFIJO}@pruebas.local`;
    const estados = [];
    for (let intento = 1; intento <= 11; intento++) {
      const { estado } = await pedir('POST', '/api/usuarios/login', { body: { email, password: `intento-${intento}` } });
      estados.push(estado);
    }
    assert.ok(estados.slice(0, 10).every(e => e === 401), `Los primeros diez intentos debían dar 401: ${estados.join(', ')}`);
    assert.strictEqual(estados[10], 429);
  });

  await prueba('El bloqueo de un correo no impide entrar con otro', async () => {
    const { estado } = await pedir('POST', '/api/usuarios/login', { body: { email: cliente2.email, password: PASSWORD } });
    assert.strictEqual(estado, 200);
  });

  await prueba('Un archivo que no es imagen se rechaza aunque se declare PNG', async () => {
    const antes = archivosSubidos().length;
    const { estado } = await enviarPlato('POST', '/api/platos', local1.token,
      { nombre: `Plato imagen falsa ${SUFIJO}`, precio: 100, stock: 1, categoria: 'Pizzas' },
      { contenido: Buffer.from('<script>alert("hola")</script>'), tipo: 'image/png', nombre: 'falsa.png' });
    assert.strictEqual(estado, 400);
    assert.strictEqual(archivosSubidos().length, antes, 'El archivo falso quedó guardado en disco');
  });

  await prueba('Si el alta de un plato falla, la imagen subida no queda en disco', async () => {
    const antes = archivosSubidos().length;
    const { estado } = await enviarPlato('POST', '/api/platos', local1.token,
      { nombre: `Plato precio inválido ${SUFIJO}`, precio: 0, stock: 1, categoria: 'Pizzas' }, pngValido);
    assert.strictEqual(estado, 400);
    assert.strictEqual(archivosSubidos().length, antes, 'Quedó una imagen huérfana');
  });

  await prueba('Al reemplazar la imagen de un plato se borra la anterior', async () => {
    const alta = await enviarPlato('POST', '/api/platos', local1.token,
      { nombre: `Plato con foto ${SUFIJO}`, precio: 100, stock: 1, categoria: 'Pizzas' }, pngValido);
    assert.strictEqual(alta.estado, 201);
    creados.platos.push(alta.datos.plato.id);
    const imagenAnterior = alta.datos.plato.imagenUrl;

    const edicion = await enviarPlato('PUT', `/api/platos/${alta.datos.plato.id}`, local1.token,
      { nombre: `Plato con foto nueva ${SUFIJO}` }, pngValido);
    assert.strictEqual(edicion.estado, 200);
    const imagenNueva = edicion.datos.plato.imagenUrl;

    assert.notStrictEqual(imagenNueva, imagenAnterior);
    assert.ok(!fs.existsSync(rutaEnDisco(imagenAnterior)), 'La imagen anterior quedó en disco');
    assert.ok(fs.existsSync(rutaEnDisco(imagenNueva)), 'Se borró la imagen nueva');

    // Se elimina por la API para que la imagen nueva tampoco quede en disco.
    await pedir('DELETE', `/api/platos/${alta.datos.plato.id}`, { token: local1.token });
  });

  await prueba('Al eliminar un plato se borra su imagen del disco', async () => {
    const alta = await enviarPlato('POST', '/api/platos', local1.token,
      { nombre: `Plato a eliminar ${SUFIJO}`, precio: 100, stock: 1, categoria: 'Pizzas' }, pngValido);
    assert.strictEqual(alta.estado, 201);
    const archivo = rutaEnDisco(alta.datos.plato.imagenUrl);
    assert.ok(fs.existsSync(archivo), 'La imagen no se guardó');

    const baja = await pedir('DELETE', `/api/platos/${alta.datos.plato.id}`, { token: local1.token });
    assert.strictEqual(baja.estado, 200);
    assert.ok(!fs.existsSync(archivo), 'La imagen quedó huérfana en disco');
  });

  // -------------------------------------------------------------------------
  seccion('APLICACIÓN (app.js)');

  await prueba('Una ruta inexistente responde 404 en JSON', async () => {
    const { estado, datos } = await pedir('GET', '/api/no-existe');
    assert.strictEqual(estado, 404);
    assert.ok(datos && datos.mensaje, 'La respuesta 404 no trae un mensaje JSON');
  });

  await prueba('Un cuerpo que no es JSON válido responde 400 y no 500', async () => {
    const respuesta = await fetch(`${BASE}/api/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "sin cerrar"'
    });
    assert.strictEqual(respuesta.status, 400);
  });

  await prueba('Un origen no habilitado por CORS responde 403', async () => {
    const respuesta = await fetch(`${BASE}/api/platos/categorias`, {
      headers: { Origin: 'https://sitio-ajeno.example' }
    });
    assert.strictEqual(respuesta.status, 403);
  });
}

// --- arranque ---------------------------------------------------------------

(async () => {
  try {
    await ejecutar();
  } catch (err) {
    console.error('\n💥 Error inesperado durante las pruebas:', err);
    fallidas.push({ nombre: 'ejecución general', error: err });
  } finally {
    await limpiar().catch(err => console.error('Error al limpiar los datos de prueba:', err.message));
    if (servidor) servidor.close();
    await sequelize.close();

    const total = pasadas + fallidas.length;
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Resultado: ${pasadas}/${total} pruebas superadas`);
    if (fallidas.length > 0) {
      console.log('\nPruebas fallidas:');
      fallidas.forEach(f => console.log(`  • ${f.nombre}: ${f.error.message}`));
      process.exit(1);
    }
    console.log('✅ Todo en orden.\n');
    process.exit(0);
  }
})();
