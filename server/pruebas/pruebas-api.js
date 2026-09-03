'use strict';

/**
 * Pruebas de integración de la API de FoodieByte.
 *
 * Levanta el servidor real contra la base de datos configurada en el .env y
 * verifica los puntos críticos del sistema: autenticación, aislamiento entre
 * locales (multitenencia), control de stock con transacciones y el cálculo
 * de comisiones del administrador.
 *
 * Uso:  npm test     (requiere la base migrada: npm run db:setup)
 *
 * ⚠️  Las pruebas crean y borran sus propios datos. Usá una base de desarrollo.
 */

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
  process.env.PORT = String(PUERTO);

  // Levantamos la app tal como se sirve en producción.
  const express = require('express');
  const cors = require('cors');
  const servidorApp = express();
  servidorApp.use(cors());
  servidorApp.use(express.json());
  servidorApp.use('/api/platos', require('../routes/platos'));
  servidorApp.use('/api/usuarios', require('../routes/usuarios'));
  servidorApp.use('/api/pedidos', require('../routes/pedidos'));
  servidorApp.use('/api/admin', require('../routes/admin'));

  await sequelize.authenticate();
  servidor = servidorApp.listen(PUERTO);
  await new Promise(resolve => servidor.once('listening', resolve));

  console.log(`\nFoodieByte · pruebas de integración (${BASE})`);

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
