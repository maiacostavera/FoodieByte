'use strict';

/**
 * Catálogo de demostración. Los platos se reparten entre los dos locales
 * de prueba para que se pueda verificar que cada vendedor ve únicamente
 * su propio inventario y sus propias comandas.
 */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date();

    const idLaNonna = await queryInterface.rawSelect('Usuarios', {
      where: { email: 'lanonna@foodiebyte.com' }
    }, ['id']);

    const idSaborCriollo = await queryInterface.rawSelect('Usuarios', {
      where: { email: 'saborcriollo@foodiebyte.com' }
    }, ['id']);

    if (!idLaNonna || !idSaborCriollo) {
      throw new Error('Faltan los vendedores de demo. Ejecutá primero el seeder de usuarios iniciales.');
    }

    const platos = [
      ['Pizza Margherita', 'Tomate, mozzarella y albahaca fresca.', 1200.00, 'Pizzas', 20, '25-35 min', false, false, idLaNonna],
      ['Pizza Napolitana', 'Mozzarella, rodajas de tomate y ajo.', 1350.00, 'Pizzas', 18, '25-35 min', false, false, idLaNonna],
      ['Hamburguesa Foodie', 'Carne vacuna, queso cheddar y panceta ahumada.', 1500.00, 'Hamburguesas', 15, '20-30 min', false, false, idLaNonna],
      ['Bowl Vegano', 'Arroz integral, palta, tofu marinado, edamame y hummus.', 1100.00, 'Vegano', 12, '15-25 min', true, true, idLaNonna],
      ['Tiramisú Italiano', 'Postre clásico con mascarpone, café y cacao.', 800.00, 'Postres', 18, '10-15 min', false, false, idLaNonna],

      ['Empanadas Criollas x6', 'Empanadas de carne cortada a cuchillo, con huevo y aceituna.', 950.00, 'Empanadas', 30, '15-20 min', false, false, idSaborCriollo],
      ['Asado para 2', 'Vacío, chorizo, morcilla y ensalada mixta.', 3200.00, 'Parrilla', 8, '40-50 min', false, true, idSaborCriollo],
      ['Provoleta a la Parrilla', 'Queso provolone con orégano y aceite de oliva.', 900.00, 'Parrilla', 14, '15-20 min', false, true, idSaborCriollo],
      ['Sushi Combo 20 piezas', 'Combinado de salmón, Philadelphia y langostino.', 2800.00, 'Sushi', 10, '30-40 min', false, false, idSaborCriollo],
      ['Flan Casero con Dulce', 'Flan de huevo con dulce de leche y crema.', 750.00, 'Postres', 20, '10-15 min', false, true, idSaborCriollo]
    ];

    return queryInterface.bulkInsert('platos', platos.map(
      ([nombre, descripcion, precio, categoria, stock, tiempo_prep, es_vegano, es_sintacc, vendedorId]) => ({
        nombre, descripcion, precio, categoria, stock, tiempo_prep, es_vegano, es_sintacc, vendedorId,
        imagenUrl: null,
        createdAt: ahora,
        updatedAt: ahora
      })
    ));
  },

  async down(queryInterface) {
    return queryInterface.bulkDelete('platos', null, {});
  }
};
