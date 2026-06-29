'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.bulkInsert('platos', [
      {
        nombre: 'Pizza Margherita',
        descripcion: 'Tomate, mozzarella y albahaca fresca.',
        precio: 1200.00,
        categoria: 'Pizzas',
        imagenUrl: null,
        stock: 20,
        vendedorId: null,
        tiempo_prep: '25-35 min',
        es_vegano: false,
        es_sintacc: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Hamburguesa Foodie',
        descripcion: 'Carne vacuna, queso cheddar y panceta ahumada.',
        precio: 1500.00,
        categoria: 'Hamburguesas',
        imagenUrl: null,
        stock: 15,
        vendedorId: null,
        tiempo_prep: '20-30 min',
        es_vegano: false,
        es_sintacc: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Empanadas Criollas x6',
        descripcion: 'Empanadas de carne cortada a cuchillo, con huevo y aceituna.',
        precio: 950.00,
        categoria: 'Empanadas',
        imagenUrl: null,
        stock: 30,
        vendedorId: null,
        tiempo_prep: '15-20 min',
        es_vegano: false,
        es_sintacc: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Sushi Combo 20 piezas',
        descripcion: 'Combinado de salmón, Philadelphia y langostino.',
        precio: 2800.00,
        categoria: 'Sushi',
        imagenUrl: null,
        stock: 10,
        vendedorId: null,
        tiempo_prep: '30-40 min',
        es_vegano: false,
        es_sintacc: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Bowl Vegano',
        descripcion: 'Arroz integral, palta, tofu marinado, edamame y hummus.',
        precio: 1100.00,
        categoria: 'Vegano',
        imagenUrl: null,
        stock: 12,
        vendedorId: null,
        tiempo_prep: '15-25 min',
        es_vegano: true,
        es_sintacc: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Asado para 2',
        descripcion: 'Vacío, chorizo, morcilla y ensalada mixta.',
        precio: 3200.00,
        categoria: 'Parrilla',
        imagenUrl: null,
        stock: 8,
        vendedorId: null,
        tiempo_prep: '40-50 min',
        es_vegano: false,
        es_sintacc: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Tiramisú Italiano',
        descripcion: 'Postre clásico con mascarpone, café y cacao.',
        precio: 800.00,
        categoria: 'Postres',
        imagenUrl: null,
        stock: 18,
        vendedorId: null,
        tiempo_prep: '10-15 min',
        es_vegano: false,
        es_sintacc: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('platos', null, {});
  }
};
