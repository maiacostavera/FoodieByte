'use strict';

/**
 * Corre antes de `npm run dev`. Si el proyecto todavía no se instaló, lo dice
 * con un mensaje claro en lugar de dejar que falle con un error de módulos.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

const faltantes = [
  ['node_modules', 'las dependencias de la raíz'],
  ['server/node_modules', 'las dependencias del servidor'],
  ['client/node_modules', 'las dependencias del cliente'],
  ['server/.env', 'la configuración del servidor (server/.env)']
].filter(([ruta]) => !fs.existsSync(path.join(RAIZ, ruta)));

if (faltantes.length > 0) {
  console.error('\n\x1b[31m✖ FoodieByte todavía no está instalado.\x1b[0m');
  console.error(`  Falta: ${faltantes.map(([, descripcion]) => descripcion).join(', ')}.`);
  console.error('  Corré primero:  npm run setup\n');
  process.exit(1);
}
