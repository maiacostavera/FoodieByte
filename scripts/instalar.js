'use strict';

/**
 * Instalador de FoodieByte (`npm run setup`). Deja el proyecto listo para
 * `npm run dev`:
 *   1. Verifica la versión de Node.
 *   2. Instala las dependencias de la raíz, del servidor y del cliente.
 *   3. Crea los archivos .env que falten y pide la contraseña de PostgreSQL.
 *   4. Crea las bases, aplica las migraciones y carga la demo.
 *
 * Se puede correr todas las veces que haga falta: lo que ya está hecho no se
 * repite ni se pisa. Sin una terminal interactiva (por ejemplo, en el CI) toma
 * la contraseña de la variable de entorno DB_PASSWORD.
 *
 * Solo usa módulos de Node: tiene que funcionar antes de instalar nada.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const SERVIDOR = path.join(RAIZ, 'server');
const CLIENTE = path.join(RAIZ, 'client');
const ENV_SERVIDOR = path.join(SERVIDOR, '.env');
const ENV_CLIENTE = path.join(CLIENTE, '.env');

const negrita = (texto) => `\x1b[1m${texto}\x1b[0m`;
const verde = (texto) => `\x1b[32m${texto}\x1b[0m`;
const rojo = (texto) => `\x1b[31m${texto}\x1b[0m`;

const titulo = (numero, texto) => console.log(`\n${negrita(`${numero}. ${texto}`)}`);
const listo = (texto) => console.log(`  ${verde('✔')} ${texto}`);

const abortar = (...lineas) => {
  console.error(`\n${rojo(`✖ ${lineas[0]}`)}`);
  for (const linea of lineas.slice(1)) console.error(`  ${linea}`);
  console.error('');
  process.exit(1);
};

const correr = (comando, cwd, { silencioso = false } = {}) =>
  spawnSync(comando, { cwd, shell: true, encoding: 'utf8', stdio: silencioso ? 'pipe' : 'inherit' });

// --- Archivos .env ------------------------------------------------------------

const leerValor = (texto, clave) => {
  const linea = texto.match(new RegExp(`^${clave}=(.*)$`, 'm'));
  return linea ? linea[1].trim().replace(/^(['"])(.*)\1$/, '$2') : undefined;
};

// Un valor con espacios, # o comillas va entre comillas para que dotenv lo lea entero.
const formatearValor = (valor) => {
  if (!/[\s#'"\\]/.test(valor)) return valor;
  return valor.includes('"') ? `'${valor}'` : `"${valor}"`;
};

const asignarValor = (texto, clave, valor) => {
  const linea = `${clave}=${formatearValor(valor)}`;
  const patron = new RegExp(`^${clave}=.*$`, 'm');
  // Se reemplaza con una función: una contraseña con "$" no tiene que interpretarse.
  return patron.test(texto) ? texto.replace(patron, () => linea) : `${texto.trimEnd()}\n${linea}\n`;
};

const esValorDeEjemplo = (valor) => /cambiame|TU_PASSWORD/i.test(valor || '');

// --- Contraseña de PostgreSQL -------------------------------------------------

/** Pide un dato por teclado. En una terminal interactiva no lo muestra. */
const preguntarOculto = (pregunta) => new Promise((resolve) => {
  if (!process.stdin.isTTY) {
    // Sin terminal interactiva (por ejemplo, Git Bash sin winpty) se lee una línea común.
    const lector = readline.createInterface({ input: process.stdin, output: process.stdout });
    let respondio = false;
    lector.question(pregunta, (respuesta) => {
      respondio = true;
      lector.close();
      resolve(respuesta);
    });
    lector.on('close', () => { if (!respondio) resolve(''); });
    return;
  }

  process.stdout.write(pregunta);
  let valor = '';

  const alEscribir = (texto) => {
    for (const caracter of texto) {
      if (caracter === '\r' || caracter === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', alEscribir);
        process.stdout.write('\n');
        resolve(valor);
        return;
      }
      if (caracter === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(130);
      }
      if (caracter === '\u007f' || caracter === '\b') {
        if (valor.length > 0) {
          valor = valor.slice(0, -1);
          process.stdout.write('\b \b');
        }
        continue;
      }
      if (caracter >= ' ') {
        valor += caracter;
        process.stdout.write('*');
      }
    }
  };

  process.stdin.setRawMode(true);
  process.stdin.setEncoding('utf8');
  process.stdin.resume();
  process.stdin.on('data', alEscribir);
});

const obtenerPassword = async () => {
  if (process.env.DB_PASSWORD !== undefined) return process.env.DB_PASSWORD;
  console.log('  FoodieByte guarda los datos en PostgreSQL. Escribí la contraseña que elegiste');
  console.log('  para el usuario "postgres" al instalarlo (si no le pusiste, apretá Enter).');
  return preguntarOculto('  Contraseña: ');
};

// --- Pasos --------------------------------------------------------------------

const verificarNode = () => {
  titulo(1, 'Node.js');
  const [mayor, menor] = process.versions.node.split('.').map(Number);
  const compatible = (mayor === 20 && menor >= 19) || (mayor === 22 && menor >= 12) || mayor >= 23;
  if (!compatible) {
    abortar(
      `Tenés Node ${process.versions.node} y FoodieByte necesita Node 22 (o 20.19 en adelante).`,
      'Descargá la versión LTS desde https://nodejs.org, abrí una terminal nueva y volvé a correr: npm run setup'
    );
  }
  listo(`Node ${process.versions.node}`);
};

const instalarDependencias = () => {
  titulo(2, 'Dependencias (la primera vez tarda un par de minutos)');

  for (const [nombre, carpeta] of [['de la raíz', RAIZ], ['del servidor', SERVIDOR], ['del cliente', CLIENTE]]) {
    // npm deja su propio registro en node_modules al terminar: si es más nuevo
    // que el package-lock, las dependencias ya están instaladas y al día.
    const registro = path.join(carpeta, 'node_modules', '.package-lock.json');
    const lock = path.join(carpeta, 'package-lock.json');
    if (fs.existsSync(registro) && fs.statSync(registro).mtimeMs >= fs.statSync(lock).mtimeMs) {
      listo(`Dependencias ${nombre} (ya estaban instaladas)`);
      continue;
    }

    // Sin instalación previa, npm ci instala exactamente las versiones del package-lock.
    const comando = fs.existsSync(path.join(carpeta, 'node_modules'))
      ? 'npm install --no-audit --no-fund --loglevel=error'
      : 'npm ci --no-audit --no-fund --loglevel=error';
    const resultado = correr(comando, carpeta, { silencioso: true });
    if (resultado.status !== 0) {
      console.error(resultado.stderr || resultado.stdout);
      abortar(
        `No se pudieron instalar las dependencias ${nombre}.`,
        'Revisá la conexión a internet y que no haya otra instancia de FoodieByte corriendo, y volvé a correr: npm run setup'
      );
    }
    listo(`Dependencias ${nombre}`);
  }
};

const prepararConfiguracion = async () => {
  titulo(3, 'Configuración');

  if (fs.existsSync(ENV_CLIENTE)) {
    listo('client/.env ya existe');
  } else {
    fs.copyFileSync(path.join(CLIENTE, '.env.example'), ENV_CLIENTE);
    listo('Se creó client/.env');
  }

  if (!fs.existsSync(ENV_SERVIDOR)) {
    let texto = fs.readFileSync(path.join(SERVIDOR, '.env.example'), 'utf8');
    texto = asignarValor(texto, 'JWT_SECRET', crypto.randomBytes(48).toString('hex'));
    texto = asignarValor(texto, 'DB_PASSWORD', await obtenerPassword());
    fs.writeFileSync(ENV_SERVIDOR, texto);
    listo('Se creó server/.env, con una clave propia para firmar las sesiones');
    return;
  }

  // Un .env que ya existe se respeta; solo se completa lo que impediría arrancar.
  const original = fs.readFileSync(ENV_SERVIDOR, 'utf8');
  let texto = original;
  if (esValorDeEjemplo(leerValor(texto, 'JWT_SECRET')) || !leerValor(texto, 'JWT_SECRET')) {
    texto = asignarValor(texto, 'JWT_SECRET', crypto.randomBytes(48).toString('hex'));
  }
  if (esValorDeEjemplo(leerValor(texto, 'DB_PASSWORD'))) {
    texto = asignarValor(texto, 'DB_PASSWORD', await obtenerPassword());
  }
  // Las contraseñas de la demo son las que documenta el README. Un .env copiado
  // de una versión anterior de .env.example trae "cambiame-…": se reemplazan.
  for (const [clave, valor] of [['ADMIN_PASSWORD', 'admin1234'], ['DEMO_PASSWORD', 'demo1234']]) {
    const actual = leerValor(texto, clave);
    if (!actual || esValorDeEjemplo(actual)) texto = asignarValor(texto, clave, valor);
  }
  // Las versiones anteriores habilitaban solo localhost; la web también se abre como 127.0.0.1.
  if (leerValor(texto, 'CORS_ORIGIN') === 'http://localhost:5173') {
    texto = asignarValor(texto, 'CORS_ORIGIN', 'http://localhost:5173,http://127.0.0.1:5173');
  }
  const completadas = ['JWT_SECRET', 'DB_PASSWORD', 'ADMIN_PASSWORD', 'DEMO_PASSWORD', 'CORS_ORIGIN']
    .filter(clave => leerValor(texto, clave) !== leerValor(original, clave));
  if (completadas.length > 0) fs.writeFileSync(ENV_SERVIDOR, texto);
  listo(completadas.length > 0
    ? `server/.env ya existe: se respeta tu configuración y se actualizó ${completadas.join(', ')}`
    : 'server/.env ya existe: se respeta tu configuración');
};

const prepararBase = async () => {
  titulo(4, 'Base de datos');

  for (let intento = 1; ; intento++) {
    const resultado = correr('node scripts/preparar-base.js', SERVIDOR);
    if (resultado.status === 0) return;

    // Código 2: PostgreSQL rechazó la contraseña. Se vuelve a pedir, salvo que
    // venga de una variable de entorno (ahí preguntar no cambiaría nada).
    if (resultado.status === 2 && process.env.DB_PASSWORD === undefined && intento < 3) {
      const password = await preguntarOculto('\n  Probemos de nuevo. Contraseña del usuario "postgres": ');
      fs.writeFileSync(ENV_SERVIDOR, asignarValor(fs.readFileSync(ENV_SERVIDOR, 'utf8'), 'DB_PASSWORD', password));
      continue;
    }
    if (resultado.status === 2) {
      abortar('La contraseña de PostgreSQL no coincide.', 'Corregí DB_PASSWORD (y DB_USER, si no usás "postgres") en server/.env y volvé a correr: npm run setup');
    }
    if (resultado.status === 3) {
      abortar('FoodieByte necesita PostgreSQL instalado y encendido.', 'Cuando lo tengas, volvé a correr: npm run setup');
    }
    abortar('No se pudo preparar la base de datos.', 'Leé el mensaje de arriba. Para un diagnóstico detallado: npm --prefix server run db:check');
  }
};

const mostrarResumen = () => {
  const env = fs.readFileSync(ENV_SERVIDOR, 'utf8');
  const cuenta = (rol, email, password) => `    ${rol.padEnd(15)}${email.padEnd(30)}${password}`;

  console.log(`
${verde(negrita('✔ Todo listo.'))}

  Para levantar la aplicación:   ${negrita('npm run dev')}
  Después abrí en el navegador:  ${negrita('http://localhost:5173')}

  Cuentas de la demo:
${cuenta('Administrador', leerValor(env, 'ADMIN_EMAIL') || 'admin@foodiebyte.com', leerValor(env, 'ADMIN_PASSWORD') || '')}
${cuenta('Local', 'lanonna@foodiebyte.com', leerValor(env, 'DEMO_PASSWORD') || '')}
${cuenta('Cliente', 'lucia@foodiebyte.com', leerValor(env, 'DEMO_PASSWORD') || '')}
`);
};

const principal = async () => {
  console.log(negrita('\nInstalación de FoodieByte'));
  verificarNode();
  instalarDependencias();
  await prepararConfiguracion();
  await prepararBase();
  mostrarResumen();
};

principal().catch((err) => abortar(err.message));
