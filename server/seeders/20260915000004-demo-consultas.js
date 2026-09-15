'use strict';

const { QueryTypes } = require('sequelize');
const { LOCALES, CONSULTAS } = require('./datos/demo');

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

/**
 * Consultas públicas sobre los platos, con y sin respuesta. Las que quedan sin
 * responder sirven para mostrar en vivo cómo contesta un local desde la ficha.
 */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date();
    const consultar = (sql, replacements) =>
      queryInterface.sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

    const platos = await consultar(
      `SELECT p.id, p.nombre
         FROM platos p
         JOIN "Usuarios" u ON u.id = p."vendedorId"
        WHERE u.email IN (:emails)`,
      { emails: LOCALES.map(local => local.email) }
    );
    const clientes = await consultar(
      'SELECT id, email FROM "Usuarios" WHERE email IN (:emails)',
      { emails: [...new Set(CONSULTAS.map(consulta => consulta.cliente))] }
    );

    const idDePlato = new Map(platos.map(plato => [plato.nombre, plato.id]));
    const idDeCliente = new Map(clientes.map(cliente => [cliente.email, cliente.id]));

    const filas = [];
    for (const [indice, consulta] of CONSULTAS.entries()) {
      const platoId = idDePlato.get(consulta.plato);
      const usuarioId = idDeCliente.get(consulta.cliente);
      if (!platoId || !usuarioId) {
        throw new Error(`La consulta sobre "${consulta.plato}" no encuentra su plato o su cliente. Ejecutá primero los seeders anteriores.`);
      }

      // Se puede correr más de una vez: una consulta ya cargada no se repite.
      const existe = await queryInterface.rawSelect('Preguntas', {
        where: { platoId, usuarioId, texto: consulta.texto }
      }, ['id']);
      if (existe) continue;

      // Horas distintas para cada consulta, y la respuesta llega un rato después.
      const creada = new Date(ahora.getTime() - consulta.hace * DIA - ((indice % 5) + 1) * HORA);
      const respondida = consulta.respuesta
        ? new Date(Math.min(creada.getTime() + ((indice % 3) + 1) * HORA, ahora.getTime()))
        : null;

      filas.push({
        platoId,
        usuarioId,
        texto: consulta.texto,
        respuesta: consulta.respuesta || null,
        respondidaEn: respondida,
        createdAt: creada,
        updatedAt: respondida || creada
      });
    }

    if (filas.length > 0) {
      await queryInterface.bulkInsert('Preguntas', filas);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DELETE FROM "Preguntas" WHERE "usuarioId" IN (SELECT id FROM "Usuarios" WHERE email IN (:emails))',
      { replacements: { emails: [...new Set(CONSULTAS.map(consulta => consulta.cliente))] } }
    );
  }
};
