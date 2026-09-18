'use strict';

/**
 * Deja la base de datos lista para usar la aplicación:
 *   1. Comprueba que PostgreSQL responda con el usuario y la contraseña del .env.
 *   2. Crea la base de desarrollo y la de pruebas si no existen.
 *   3. Aplica las migraciones pendientes en las dos.
 *   4. Si la base de desarrollo está vacía, carga la demo.
 *
 * Con --reiniciar, antes borra la base de desarrollo y las fotos subidas y la
 * arma de nuevo con la demo original. Conviene hacerlo antes de presentar: las
 * fechas de la demo se calculan al cargarla, así los pedidos quedan del día.
 *
 * Uso:  npm run db:preparar        (lo usa también `npm run setup` en la raíz)
 *       npm run db:reset           (con --reiniciar)
 *
 * Con --conservar-fotos, --reiniciar no toca uploads/: lo usan las pruebas de
 * punta a punta, que arman su propia base pero comparten esa carpeta.
 *
 * Termina con código 2 si PostgreSQL rechaza las credenciales y con 3 si no
 * responde: el instalador de la raíz los usa para saber si tiene que volver a
 * pedir la contraseña.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');
const config = require('../config/config');
const { CARPETA_PLATOS } = require('../utils/imagenes');

const CARPETA_SERVIDOR = path.join(__dirname, '..');
const reiniciar = process.argv.includes('--reiniciar');
const conservarFotos = process.argv.includes('--conservar-fotos');
const desarrollo = config.development;
const baseDePruebas = config.test.database;

const listo = (texto) => console.log(`  \x1b[32m✔\x1b[0m ${texto}`);

const nuevoCliente = (database) => new Client({
  host: desarrollo.host,
  port: desarrollo.port,
  user: desarrollo.username,
  password: desarrollo.password ?? undefined,
  database,
  ssl: desarrollo.dialectOptions.ssl
});

// El nombre de una base no se puede pasar como parámetro de la consulta: se cita a mano.
const citar = (nombre) => `"${String(nombre).replace(/"/g, '""')}"`;

const existeBase = async (cliente, nombre) =>
  (await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre])).rowCount > 0;

/** Corre sequelize-cli y devuelve cuántos pasos aplicó. Si falla, muestra toda la salida. */
const sequelizeCli = (argumentos) => {
  const resultado = spawnSync(`npx sequelize-cli ${argumentos}`, {
    cwd: CARPETA_SERVIDOR, shell: true, encoding: 'utf8'
  });
  const salida = `${resultado.stdout || ''}${resultado.stderr || ''}`;
  if (resultado.status !== 0) {
    console.error(salida);
    throw new Error(`Falló "sequelize-cli ${argumentos}".`);
  }
  return salida.split('\n').filter(linea => /^== .*: migrated/.test(linea)).length;
};

/** Explica el error y devuelve el código de salida que corresponde. */
const explicarError = (err) => {
  const mensaje = err.message || '';

  if (err.code === '28P01' || err.code === '28000' || /password|SASL|contrase/i.test(mensaje)) {
    console.error(`\n  \x1b[31m✖\x1b[0m PostgreSQL rechazó el usuario "${desarrollo.username}" o su contraseña.`);
    console.error('    Se configuran en server/.env (DB_USER y DB_PASSWORD).');
    return 2;
  }

  if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(err.code)) {
    console.error(`\n  \x1b[31m✖\x1b[0m No hay un PostgreSQL respondiendo en ${desarrollo.host}:${desarrollo.port}.`);
    console.error('    Si no lo tenés, instalalo desde https://www.postgresql.org/download/');
    console.error('    Si ya lo tenés, iniciá el servicio. En Windows: tecla Windows → "Servicios" →');
    console.error('    buscá "postgresql" → clic derecho → Iniciar.');
    return 3;
  }

  console.error(`\n  \x1b[31m✖\x1b[0m ${mensaje}`);
  return 1;
};

const borrarFotosSubidas = () => {
  if (!fs.existsSync(CARPETA_PLATOS)) return 0;
  // Los archivos ocultos, como .gitkeep, quedan.
  const archivos = fs.readdirSync(CARPETA_PLATOS).filter(archivo => !archivo.startsWith('.'));
  for (const archivo of archivos) fs.unlinkSync(path.join(CARPETA_PLATOS, archivo));
  return archivos.length;
};

const principal = async () => {
  // Reiniciar borra la base entera: nunca sobre una base de producción.
  if (reiniciar && process.env.NODE_ENV === 'production') {
    console.error('\n  \x1b[31m✖\x1b[0m Con NODE_ENV=production no se borra la base. --reiniciar es solo para desarrollo y demos.');
    process.exit(1);
  }

  // Se conecta a la base "postgres", que existe siempre, para poder crear o borrar las demás.
  const servidor = nuevoCliente('postgres');
  await servidor.connect();
  listo(`PostgreSQL responde en ${desarrollo.host}:${desarrollo.port}`);

  try {
    if (reiniciar && await existeBase(servidor, desarrollo.database)) {
      // Se cortan las conexiones abiertas (por ejemplo, la API corriendo) para
      // poder borrarla. La API se reconecta sola en la siguiente consulta.
      await servidor.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
        [desarrollo.database]
      );
      await servidor.query(`DROP DATABASE ${citar(desarrollo.database)}`);
      const fotos = conservarFotos ? 0 : borrarFotosSubidas();
      listo(`Base "${desarrollo.database}" borrada${fotos > 0 ? ` junto con ${fotos} fotos subidas` : ''}`);
    }

    for (const nombre of [desarrollo.database, baseDePruebas]) {
      if (await existeBase(servidor, nombre)) continue;
      await servidor.query(`CREATE DATABASE ${citar(nombre)}`);
      listo(`Base "${nombre}" creada`);
    }
  } finally {
    await servidor.end();
  }

  const migraciones = sequelizeCli('db:migrate');
  sequelizeCli('db:migrate --env test');
  listo(migraciones > 0 ? `${migraciones} migraciones aplicadas` : 'Esquema al día, sin migraciones pendientes');

  const base = nuevoCliente(desarrollo.database);
  await base.connect();
  const { rows: [{ cuentas }] } = await base.query('SELECT COUNT(*)::int AS cuentas FROM "Usuarios"');
  await base.end();

  if (cuentas === 0) {
    sequelizeCli('db:seed:all');
    listo('Datos de la demo cargados');
  } else {
    listo(`La base ya tiene datos (${cuentas} cuentas) y no se tocan. Para volver a la demo original: npm run demo:reiniciar`);
  }
};

principal().catch((err) => process.exit(explicarError(err)));
