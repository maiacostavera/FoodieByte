'use strict';

// Lista única de categorías del catálogo. El frontend consume esta misma
// lista vía GET /api/platos/categorias, así no queda duplicada ni se
// desincroniza entre el filtro del menú, el alta de platos y el alta de local.
const CATEGORIAS = [
  'Pizzas',
  'Hamburguesas',
  'Empanadas',
  'Parrilla',
  'Sushi',
  'Vegano',
  'Postres'
];

module.exports = { CATEGORIAS };
