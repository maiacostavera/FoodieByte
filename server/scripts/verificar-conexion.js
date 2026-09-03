'use strict';

/**
 * Diagnóstico de la conexión a la base de datos.
 *
 * Muestra qué configuración está leyendo realmente la aplicación e intenta
 * conectarse, traduciendo los errores más comunes a una explicación concreta.
 * No imprime la contraseña, solo si está definida y cuántos caracteres tiene.
 *
 * Uso:  npm run db:check
 */

const fs = require('fs');
const path = require('path');

const rutaEnv = path.join(__dirname, '..', '.env');
const existeEnv = fs.existsSync(rutaEnv);

require('dotenv').config({ quiet: true });

console.log('\n═══ Diagnóstico de conexión ═══\n');

// --- 1. ¿Existe el archivo .env? ---
if (!existeEnv) {
  console.log('❌ No se encontró el archivo .env en la carpeta server/.');
  console.log('   Sin él la aplicación usa valores por defecto y la conexión falla.');
  console.log('\n   En Windows, el error más común es que el Bloc de notas lo guarde');
  console.log('   como ".env.txt". Estos son los archivos que hay en la carpeta:\n');

  for (const archivo of fs.readdirSync(path.join(__dirname, '..'))) {
    if (archivo.toLowerCase().includes('env')) console.log(`     ${archivo}`);
  }
  console.log('\n   Si ves ".env.txt", renombralo a ".env" (sin extensión).');
  process.exit(1);
}

console.log('✅ Archivo .env encontrado');

// --- 2. ¿Qué configuración se está leyendo? ---
const password = process.env.DB_PASSWORD;

console.log('\nConfiguración que está leyendo la aplicación:');
console.log(`   DB_HOST:     ${process.env.DB_HOST || '(sin definir → 127.0.0.1)'}`);
console.log(`   DB_PORT:     ${process.env.DB_PORT || '(sin definir → 5432)'}`);
console.log(`   DB_NAME:     ${process.env.DB_NAME || '(sin definir → foodiebyte_db)'}`);
console.log(`   DB_USER:     ${process.env.DB_USER || '(sin definir → postgres)'}`);

if (password === undefined) {
  console.log('   DB_PASSWORD: ⚠️  sin definir');
} else if (password === '') {
  console.log('   DB_PASSWORD: ⚠️  definida pero vacía');
} else {
  console.log(`   DB_PASSWORD: definida (${password.length} caracteres)`);

  // Errores de tipeo habituales al copiar y pegar en el .env
  if (password.includes('TU_PASSWORD') || password.includes('cambiame')) {
    console.log('\n   ❌ La contraseña sigue siendo el texto de ejemplo.');
    console.log('      Reemplazala por la contraseña real de tu PostgreSQL.');
    process.exit(1);
  }
  if (password !== password.trim()) {
    console.log('\n   ⚠️  La contraseña tiene espacios al principio o al final.');
    console.log('      Borralos: en el .env va pegada al signo igual, sin comillas.');
  }
  if (password.includes('#')) {
    console.log('\n   ⚠️  La contraseña contiene "#", que en un .env inicia un comentario.');
    console.log('      Escribila entre comillas dobles: DB_PASSWORD="mi#clave"');
  }
}

// --- 3. Intento de conexión real ---
console.log('\nProbando la conexión…');

const db = require('../models');
const { QueryTypes } = require('sequelize');

db.sequelize.authenticate({ logging: false })
  .then(async () => {
    console.log('✅ Conexión establecida correctamente.\n');

    const [filaVersion] = await db.sequelize.query('SELECT version() AS version', {
      logging: false, type: QueryTypes.SELECT
    });
    if (filaVersion) console.log(`   ${String(filaVersion.version).split(',')[0]}`);

    // Se consulta pg_tables y se castea a text: las columnas de
    // information_schema usan un tipo propio que el driver no mapea a objeto.
    const tablas = await db.sequelize.query(
      `SELECT tablename::text AS nombre FROM pg_tables
       WHERE schemaname = 'public' ORDER BY tablename`,
      { logging: false, type: QueryTypes.SELECT }
    );

    if (tablas.length === 0) {
      console.log('\n   La base está vacía: todavía no corriste "npm run db:migrate".');
    } else {
      console.log(`\n   Tablas en la base (${tablas.length}):`);
      for (const t of tablas) console.log(`     ${t.nombre}`);
    }

    console.log('');
    await db.sequelize.close();
    process.exit(0);
  })
  .catch(async (err) => {
    const mensaje = err.original?.message || err.message || '';
    const codigo = err.original?.code;

    console.log('❌ No se pudo conectar.\n');

    // La traducción del mensaje depende del idioma del servidor, así que
    // se usa también el código de error de PostgreSQL, que es estable.
    if (codigo === '28P01' || /password|contrase|autentifica/i.test(mensaje)) {
      console.log('   Motivo: la contraseña de PostgreSQL es incorrecta.\n');
      console.log('   Comprobala abriendo una terminal y ejecutando:');
      console.log(`     psql -U ${process.env.DB_USER || 'postgres'} -h 127.0.0.1 -d postgres -c "SELECT 1"`);
      console.log('   Te va a pedir la contraseña. La que funcione ahí es la que va en el .env.');
    } else if (codigo === 'ECONNREFUSED') {
      console.log('   Motivo: no hay nadie escuchando en ese host y puerto.\n');
      console.log('   PostgreSQL no está corriendo, o está en otro puerto.');
      console.log('   En Windows: Servicios → buscá "postgresql" → Iniciar.');
    } else if (codigo === '3D000') {
      console.log(`   Motivo: la base "${process.env.DB_NAME || 'foodiebyte_db'}" no existe todavía.\n`);
      console.log('   Creala con: npm run db:create');
    } else if (codigo === 'ENOTFOUND') {
      console.log('   Motivo: no se pudo resolver el host indicado en DB_HOST.');
    } else {
      console.log(`   Mensaje del servidor: ${mensaje}`);
      if (codigo) console.log(`   Código: ${codigo}`);
    }

    console.log('');
    try { await db.sequelize.close(); } catch { /* ya cerrada */ }
    process.exit(1);
  });
