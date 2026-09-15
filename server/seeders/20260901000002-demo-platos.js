'use strict';

const fs = require('fs');
const path = require('path');
const { Op, QueryTypes } = require('sequelize');
const { CARPETA_PLATOS, PREFIJO_URL, borrarArchivo } = require('../utils/imagenes');
const { LOCALES } = require('./datos/demo');

const CARPETA_FOTOS = path.join(__dirname, 'fotos');
const HORA = 60 * 60 * 1000;

// Los platos se publicaron antes del historial de pedidos de la demo, que
// abarca las últimas seis semanas: ningún pedido queda anterior a su plato.
const DIAS_DESDE_LA_PUBLICACION = 45;

// Nombre con el que la foto queda en uploads/. El prefijo la distingue de las
// fotos que suben los locales desde el panel.
const archivoSubido = (foto) => `demo-${foto}.webp`;

/**
 * Catálogo de la demo: los platos de cada local, con su foto.
 *
 * Las fechas de publicación intercalan los locales (el primer plato de cada
 * uno, después el segundo, y así). Como el catálogo se ordena del más nuevo
 * al más viejo, la portada muestra variedad desde la primera fila.
 */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    await fs.promises.mkdir(CARPETA_PLATOS, { recursive: true });

    for (const [posicionLocal, local] of LOCALES.entries()) {
      const vendedorId = await queryInterface.rawSelect('Usuarios', { where: { email: local.email } }, ['id']);
      if (!vendedorId) {
        throw new Error(`Falta el local ${local.email}. Ejecutá primero el seeder de usuarios.`);
      }

      const filas = [];
      for (const [posicionPlato, plato] of local.platos.entries()) {
        // Se puede correr más de una vez: los platos que ya existen no se duplican.
        const existe = await queryInterface.rawSelect('platos', { where: { vendedorId, nombre: plato.nombre } }, ['id']);
        if (existe) continue;

        // La foto se copia a uploads/ como si el local la hubiera subido: así
        // se puede reemplazar o borrar desde el panel sin tocar el original.
        const archivo = archivoSubido(plato.foto);
        await fs.promises.copyFile(path.join(CARPETA_FOTOS, `${plato.foto}.webp`), path.join(CARPETA_PLATOS, archivo));

        const orden = posicionPlato * LOCALES.length + posicionLocal;
        const publicado = new Date(ahora.getTime() - (DIAS_DESDE_LA_PUBLICACION * 24 + orden * 3) * HORA);

        filas.push({
          nombre: plato.nombre,
          descripcion: plato.descripcion,
          precio: plato.precio,
          categoria: plato.categoria,
          stock: plato.stock,
          tiempo_prep: plato.tiempo_prep,
          es_vegano: Boolean(plato.es_vegano),
          es_sintacc: Boolean(plato.es_sintacc),
          imagenUrl: `${PREFIJO_URL}${archivo}`,
          vendedorId,
          createdAt: publicado,
          updatedAt: publicado
        });
      }

      if (filas.length > 0) {
        await queryInterface.bulkInsert('platos', filas);
      }
    }
  },

  async down(queryInterface) {
    const vendedores = await queryInterface.sequelize.query(
      'SELECT id FROM "Usuarios" WHERE email IN (:emails)',
      { replacements: { emails: LOCALES.map(local => local.email) }, type: QueryTypes.SELECT }
    );

    if (vendedores.length > 0) {
      await queryInterface.bulkDelete('platos', { vendedorId: { [Op.in]: vendedores.map(v => v.id) } });
    }

    for (const local of LOCALES) {
      for (const plato of local.platos) {
        await borrarArchivo(path.join(CARPETA_PLATOS, archivoSubido(plato.foto)));
      }
    }
  }
};
