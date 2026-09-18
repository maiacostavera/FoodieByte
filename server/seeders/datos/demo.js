'use strict';

/**
 * Datos de demostración de FoodieByte.
 *
 * Todo lo que se ve en una instalación nueva sale de este archivo: locales,
 * platos, clientes, consultas y solicitudes de alta. Los seeders solo lo leen,
 * así que para cambiar un precio, sumar un plato o renombrar un local alcanza
 * con editarlo acá y volver a cargar los datos con `npm run db:reset` (en server/).
 *
 * Las fotos están en `seeders/fotos/` y al cargar los datos se copian a
 * `uploads/platos/`, igual que si el local las hubiera subido desde el panel.
 * Son de Unsplash (licencia libre); el detalle está en `seeders/fotos/CREDITOS.md`.
 *
 * Los precios están en pesos argentinos. Las contraseñas no están acá: salen
 * del .env (ADMIN_PASSWORD para el administrador y DEMO_PASSWORD para el resto).
 */

// `alta` es la antigüedad de la cuenta en días: las fechas se calculan
// respecto del momento en que se cargan los datos, así la demo siempre
// muestra actividad reciente.
const LOCALES = [
  {
    nombre: 'La Nonna',
    email: 'lanonna@foodiebyte.com',
    nombre_local: 'Pizzería La Nonna',
    telefono: '11 4832-5510',
    direccion: 'Av. Raúl Scalabrini Ortiz 1850, Palermo, CABA',
    categoria_local: 'Pizzas',
    descripcion_productos: 'Pizza a la piedra con masa madre de 48 horas y postres italianos caseros.',
    alta: 190,
    platos: [
      { nombre: 'Pizza Margherita', descripcion: 'Salsa de tomates San Marzano, mozzarella fior di latte, albahaca fresca y oliva extra virgen.', precio: 17500, categoria: 'Pizzas', stock: 25, tiempo_prep: '25-35 min', foto: 'pizza-margherita' },
      { nombre: 'Pizza Napolitana', descripcion: 'Muzzarella, rodajas de tomate, ajo, orégano y hojas de albahaca.', precio: 18900, categoria: 'Pizzas', stock: 22, tiempo_prep: '25-35 min', foto: 'pizza-napolitana' },
      { nombre: 'Pizza de Pepperoni', descripcion: 'Muzzarella y abundante pepperoni levemente picante. La favorita de los chicos.', precio: 19800, categoria: 'Pizzas', stock: 18, tiempo_prep: '25-35 min', foto: 'pizza-pepperoni' },
      { nombre: 'Pizza Muzzarella', descripcion: 'La clásica porteña: salsa de tomate, doble muzzarella, orégano y aceitunas verdes.', precio: 15900, categoria: 'Pizzas', stock: 30, tiempo_prep: '20-30 min', foto: 'pizza-muzzarella' },
      { nombre: 'Pizza Especial de la Casa', descripcion: 'Jamón cocido, morrones asados, champiñones, aceitunas negras y muzzarella.', precio: 21500, categoria: 'Pizzas', stock: 4, tiempo_prep: '30-40 min', foto: 'pizza-especial' },
      { nombre: 'Calzone de Jamón y Queso', descripcion: 'Masa rellena de jamón, muzzarella y ricota, gratinada con salsa pomodoro.', precio: 16800, categoria: 'Pizzas', stock: 12, tiempo_prep: '30-40 min', foto: 'calzone-jamon-queso' },
      { nombre: 'Tiramisú', descripcion: 'Vainillas embebidas en café, crema de mascarpone y cacao amargo. Porción individual.', precio: 7900, categoria: 'Postres', stock: 15, tiempo_prep: '5-10 min', foto: 'tiramisu' }
    ]
  },
  {
    nombre: 'Sabor Criollo',
    email: 'saborcriollo@foodiebyte.com',
    nombre_local: 'Parrilla Sabor Criollo',
    telefono: '11 4361-2207',
    direccion: 'Defensa 1120, San Telmo, CABA',
    categoria_local: 'Parrilla',
    descripcion_productos: 'Parrilla a la leña con cortes de novillo y postres de campo.',
    alta: 175,
    platos: [
      { nombre: 'Asado de Tira con Papas Fritas', descripcion: '400 g de tira de novillo a la leña, con papas fritas caseras y chimichurri.', precio: 26500, categoria: 'Parrilla', stock: 14, tiempo_prep: '35-45 min', es_sintacc: true, foto: 'asado-de-tira' },
      { nombre: 'Bife de Chorizo', descripcion: 'Corte de 400 g a punto, con sal parrillera y ensalada mixta.', precio: 29800, categoria: 'Parrilla', stock: 10, tiempo_prep: '30-40 min', es_sintacc: true, foto: 'bife-de-chorizo' },
      { nombre: 'Vacío a la Parrilla', descripcion: 'Vacío tierno cocido lento a las brasas, con provenzal y papas al plomo.', precio: 27500, categoria: 'Parrilla', stock: 0, tiempo_prep: '40-50 min', es_sintacc: true, foto: 'vacio-a-la-parrilla' },
      { nombre: 'Parrillada para Dos', descripcion: 'Asado, vacío, chorizo, morcilla, chinchulines y molleja, con dos guarniciones.', precio: 58900, categoria: 'Parrilla', stock: 6, tiempo_prep: '45-55 min', es_sintacc: true, foto: 'parrillada-para-dos' },
      { nombre: 'Bondiola Braseada al Pan', descripcion: 'Bondiola desmechada cocida 8 horas, en pan de campo con cebolla morada y chimichurri.', precio: 14900, categoria: 'Parrilla', stock: 20, tiempo_prep: '20-25 min', foto: 'bondiola-al-pan' },
      { nombre: 'Entraña con Papas Rústicas', descripcion: 'Entraña grillada con papas rústicas al romero y alioli casero.', precio: 28500, categoria: 'Parrilla', stock: 3, tiempo_prep: '30-40 min', es_sintacc: true, foto: 'entrana-con-papas' },
      { nombre: 'Flan Casero con Dulce de Leche', descripcion: 'Flan de huevos de campo con caramelo, dulce de leche y crema.', precio: 6500, categoria: 'Postres', stock: 16, tiempo_prep: '5-10 min', es_sintacc: true, foto: 'flan-casero' }
    ]
  },
  {
    nombre: 'Barrio Burger',
    email: 'barrioburger@foodiebyte.com',
    nombre_local: 'Barrio Burger',
    telefono: '11 4855-9031',
    direccion: 'Thames 702, Villa Crespo, CABA',
    categoria_local: 'Hamburguesas',
    descripcion_productos: 'Hamburguesas smash de carne de pastura en pan de papa, con papas cortadas a mano.',
    alta: 140,
    platos: [
      { nombre: 'Clásica con Cheddar', descripcion: 'Doble medallón smash, cheddar fundido, pepinos, cebolla y salsa de la casa. Con papas.', precio: 16900, categoria: 'Hamburguesas', stock: 40, tiempo_prep: '15-25 min', foto: 'burger-clasica-cheddar' },
      { nombre: 'Doble Bacon', descripcion: 'Dos medallones de 120 g, doble cheddar, panceta crocante y barbacoa ahumada. Con papas.', precio: 19900, categoria: 'Hamburguesas', stock: 35, tiempo_prep: '15-25 min', foto: 'burger-doble-bacon' },
      { nombre: 'Completa con Papas', descripcion: 'Medallón de 180 g, lechuga, tomate, cebolla morada, cheddar y mayonesa de ajo, con papas en vaso.', precio: 18500, categoria: 'Hamburguesas', stock: 30, tiempo_prep: '15-25 min', foto: 'burger-completa-papas' },
      { nombre: 'Crispy Chicken', descripcion: 'Pollo rebozado en panko, coleslaw, pepinillos y mayonesa picante. Con papas.', precio: 17500, categoria: 'Hamburguesas', stock: 25, tiempo_prep: '20-25 min', foto: 'burger-crispy-chicken' },
      { nombre: 'Hongos y Suizo', descripcion: 'Medallón de 180 g, hongos salteados, queso suizo y cebolla caramelizada. Con papas.', precio: 19500, categoria: 'Hamburguesas', stock: 20, tiempo_prep: '20-25 min', foto: 'burger-hongos-suizo' },
      { nombre: 'Papas con Cheddar y Verdeo', descripcion: 'Porción grande de papas fritas bañadas en cheddar, con panceta y cebolla de verdeo.', precio: 9900, categoria: 'Hamburguesas', stock: 50, tiempo_prep: '10-15 min', foto: 'papas-cheddar-verdeo' }
    ]
  },
  {
    nombre: 'Sakura Sushi',
    email: 'sakura@foodiebyte.com',
    nombre_local: 'Sakura Sushi Bar',
    telefono: '11 4781-6630',
    direccion: 'Av. Cabildo 2150, Belgrano, CABA',
    categoria_local: 'Sushi',
    descripcion_productos: 'Sushi de autor con salmón rosado fresco y arroz preparado en el día.',
    alta: 160,
    platos: [
      { nombre: 'Philadelphia Roll x10', descripcion: 'Salmón rosado, queso crema y palta, envuelto en arroz y sésamo.', precio: 16500, categoria: 'Sushi', stock: 30, tiempo_prep: '25-35 min', foto: 'philadelphia-roll' },
      { nombre: 'Combinado Clásico 15 piezas', descripcion: 'Cinco Philadelphia, cinco New York y cinco hosomaki de salmón, con soja y wasabi.', precio: 21900, categoria: 'Sushi', stock: 25, tiempo_prep: '25-35 min', foto: 'combinado-15-piezas' },
      { nombre: 'Combinado Premium 30 piezas', descripcion: 'Sashimi, nigiris, rolls tempura y especiales del chef. Ideal para compartir.', precio: 42500, categoria: 'Sushi', stock: 8, tiempo_prep: '35-45 min', foto: 'combinado-30-piezas' },
      { nombre: 'Nigiri de Salmón x4', descripcion: 'Láminas de salmón rosado sobre arroz de sushi, con un toque de lima.', precio: 11900, categoria: 'Sushi', stock: 20, tiempo_prep: '15-20 min', foto: 'nigiri-salmon' },
      { nombre: 'Hosomaki de Salmón x8', descripcion: 'Rolls finos de alga nori con salmón rosado y arroz.', precio: 9800, categoria: 'Sushi', stock: 24, tiempo_prep: '15-20 min', foto: 'hosomaki-salmon' },
      { nombre: 'Crispy Roll x10', descripcion: 'Roll rebozado en panko con langostinos, queso crema y salsa teriyaki.', precio: 17900, categoria: 'Sushi', stock: 2, tiempo_prep: '25-35 min', foto: 'crispy-roll' },
      { nombre: 'Poke de Salmón', descripcion: 'Arroz de sushi, salmón marinado, edamame, pepino, rabanitos, palta y sésamo.', precio: 18500, categoria: 'Sushi', stock: 15, tiempo_prep: '15-20 min', foto: 'poke-salmon' }
    ]
  },
  {
    nombre: 'Verde Raíz',
    email: 'verderaiz@foodiebyte.com',
    nombre_local: 'Verde Raíz',
    telefono: '11 4554-2918',
    direccion: 'Av. Federico Lacroze 2980, Colegiales, CABA',
    categoria_local: 'Vegano',
    descripcion_productos: 'Cocina 100 % vegetal, de estación y sin ultraprocesados.',
    alta: 120,
    platos: [
      { nombre: 'Buddha Bowl', descripcion: 'Quinoa, palta, garbanzos crocantes, hojas verdes, maní tostado y aderezo de limón.', precio: 13900, categoria: 'Vegano', stock: 20, tiempo_prep: '15-20 min', es_vegano: true, es_sintacc: true, foto: 'buddha-bowl' },
      { nombre: 'Bowl de Falafel y Hummus', descripcion: 'Falafel casero, hummus, arroz yamaní, verduras asadas y salsa tahini.', precio: 14500, categoria: 'Vegano', stock: 18, tiempo_prep: '15-20 min', es_vegano: true, es_sintacc: true, foto: 'bowl-falafel-hummus' },
      { nombre: 'Falafel con Pickles x6', descripcion: 'Seis falafel con nabo encurtido, pepinos agridulces y salsa picante.', precio: 10900, categoria: 'Vegano', stock: 25, tiempo_prep: '15-20 min', es_vegano: true, es_sintacc: true, foto: 'falafel-pickles' },
      { nombre: 'Bowl de Tofu Glaseado', descripcion: 'Tofu glaseado con miel de agave, arroz jazmín, palta y chauchas salteadas.', precio: 14900, categoria: 'Vegano', stock: 16, tiempo_prep: '20-25 min', es_vegano: true, foto: 'bowl-tofu-glaseado' },
      { nombre: 'Wraps de Falafel', descripcion: 'Tres wraps de falafel con verduras asadas, papas rústicas y dips.', precio: 13500, categoria: 'Vegano', stock: 12, tiempo_prep: '20-25 min', es_vegano: true, foto: 'wrap-falafel' },
      { nombre: 'Ensalada Mediterránea con Tofu', descripcion: 'Tomates, aceitunas negras, albahaca, cebolla morada y tofu marinado en hierbas.', precio: 11500, categoria: 'Vegano', stock: 22, tiempo_prep: '10-15 min', es_vegano: true, es_sintacc: true, foto: 'ensalada-mediterranea' },
      { nombre: 'Poke Vegano de Quinoa', descripcion: 'Quinoa, arvejas, zanahoria, repollo morado, calabaza asada y mango.', precio: 12900, categoria: 'Vegano', stock: 1, tiempo_prep: '15-20 min', es_vegano: true, es_sintacc: true, foto: 'poke-vegano-quinoa' }
    ]
  },
  {
    nombre: 'Doña Rosa',
    email: 'donarosa@foodiebyte.com',
    nombre_local: 'Empanadas Doña Rosa',
    telefono: '11 4903-7745',
    direccion: 'Av. Rivadavia 5410, Caballito, CABA',
    categoria_local: 'Empanadas',
    descripcion_productos: 'Empanadas al horno de barro con recetas de familia tucumana.',
    alta: 150,
    platos: [
      { nombre: 'Empanadas de Carne Cortada a Cuchillo x6', descripcion: 'Carne cortada a cuchillo, cebolla de verdeo, huevo y comino. Receta tucumana.', precio: 16800, categoria: 'Empanadas', stock: 40, tiempo_prep: '20-30 min', foto: 'empanadas-carne-cuchillo' },
      { nombre: 'Empanadas de Jamón y Queso x6', descripcion: 'Jamón cocido y muzzarella en masa hojaldrada.', precio: 14900, categoria: 'Empanadas', stock: 40, tiempo_prep: '20-30 min', foto: 'empanadas-jamon-queso' },
      { nombre: 'Empanadas de Humita x6', descripcion: 'Choclo cremoso, zapallo y queso, con un toque de albahaca.', precio: 14900, categoria: 'Empanadas', stock: 30, tiempo_prep: '20-30 min', foto: 'empanadas-humita' },
      { nombre: 'Docena Surtida', descripcion: 'Doce empanadas: dos de cada gusto entre carne, pollo, jamón y queso, humita, caprese y salteña.', precio: 29900, categoria: 'Empanadas', stock: 25, tiempo_prep: '25-35 min', foto: 'empanadas-docena-surtida' },
      { nombre: 'Empanadas Caprese x6', descripcion: 'Muzzarella, tomate, albahaca y aceitunas negras.', precio: 14900, categoria: 'Empanadas', stock: 18, tiempo_prep: '20-30 min', foto: 'empanadas-caprese' },
      { nombre: 'Empanadas Salteñas x6', descripcion: 'Carne, papa, huevo y un toque picante, cerradas con repulgue a mano.', precio: 16800, categoria: 'Empanadas', stock: 35, tiempo_prep: '20-30 min', foto: 'empanadas-saltenas' }
    ]
  },
  {
    nombre: 'Dulce Tentación',
    email: 'dulcetentacion@foodiebyte.com',
    nombre_local: 'Dulce Tentación',
    telefono: '11 4812-3390',
    direccion: 'Av. Santa Fe 1820, Recoleta, CABA',
    categoria_local: 'Postres',
    descripcion_productos: 'Pastelería artesanal y helados de elaboración propia.',
    alta: 110,
    platos: [
      { nombre: 'Cheesecake de Frutos Rojos', descripcion: 'Base de galletitas, crema de queso horneada y coulis de frutos rojos. Porción.', precio: 8900, categoria: 'Postres', stock: 12, tiempo_prep: '5-10 min', foto: 'cheesecake-frutos-rojos' },
      { nombre: 'Torta Húmeda de Chocolate', descripcion: 'Bizcochuelo húmedo de cacao con ganache de chocolate semiamargo y cerezas. Porción.', precio: 8500, categoria: 'Postres', stock: 10, tiempo_prep: '5-10 min', foto: 'torta-humeda-chocolate' },
      { nombre: 'Brownie con Helado', descripcion: 'Brownie tibio con nueces, dos bochas de crema americana y salsa de chocolate.', precio: 9500, categoria: 'Postres', stock: 14, tiempo_prep: '10-15 min', foto: 'brownie-con-helado' },
      { nombre: 'Helado Artesanal 1/2 kg', descripcion: 'Hasta tres gustos: dulce de leche granizado, chocolate suizo, frutilla a la crema y más.', precio: 12900, categoria: 'Postres', stock: 30, tiempo_prep: '10-15 min', foto: 'helado-artesanal' },
      { nombre: 'Chocotorta', descripcion: 'Galletitas de chocolate, dulce de leche y queso crema, con cobertura de chocolate. Porción.', precio: 7900, categoria: 'Postres', stock: 18, tiempo_prep: '5-10 min', foto: 'chocotorta' }
    ]
  }
];

// La primera clienta es la cuenta de demostración que figura en el README.
// `entrega` es la dirección a la que llegan sus pedidos.
const CLIENTES = [
  { nombre: 'Lucía Fernández', email: 'lucia@foodiebyte.com', alta: 95, entrega: 'Gorriti 4520, 3° B, Palermo' },
  { nombre: 'Martín Gómez', email: 'martin.gomez@ejemplo.com', alta: 88, entrega: 'Av. Cabildo 1830, 5° A, Belgrano' },
  { nombre: 'Sofía Rodríguez', email: 'sofia.rodriguez@ejemplo.com', alta: 80, entrega: 'Thames 1150, PB 2, Villa Crespo' },
  { nombre: 'Tomás Pereyra', email: 'tomas.pereyra@ejemplo.com', alta: 72, entrega: 'Av. Rivadavia 6120, 8° C, Caballito' },
  { nombre: 'Valentina López', email: 'valentina.lopez@ejemplo.com', alta: 66, entrega: 'Humboldt 1970, Palermo' },
  { nombre: 'Joaquín Díaz', email: 'joaquin.diaz@ejemplo.com', alta: 60, entrega: 'Defensa 980, 2° A, San Telmo' },
  { nombre: 'Camila Romero', email: 'camila.romero@ejemplo.com', alta: 54, entrega: 'Av. Federico Lacroze 3100, 4° D, Colegiales' },
  { nombre: 'Nicolás Álvarez', email: 'nicolas.alvarez@ejemplo.com', alta: 48, entrega: 'Arenales 2450, 7° B, Recoleta' }
];

// Foodies que pidieron dar de alta su local: el administrador los ve como
// solicitudes pendientes y puede aprobarlas o rechazarlas en la demo.
const POSTULANTES = [
  {
    nombre: 'Julieta Sosa',
    email: 'julieta.sosa@ejemplo.com',
    alta: 20,
    solicitud: 1,
    nombre_local: 'La Pastería de Juli',
    telefono: '11 4862-1174',
    direccion: 'Av. Corrientes 4120, Almagro, CABA',
    categoria_local: 'Otros',
    descripcion_productos: 'Pastas frescas caseras: sorrentinos, ñoquis y ravioles con salsas a elección.'
  },
  {
    nombre: 'Diego Castro',
    email: 'diego.castro@ejemplo.com',
    alta: 35,
    solicitud: 3,
    nombre_local: 'Taquería El Güero',
    telefono: '11 4776-3052',
    direccion: 'Honduras 5080, Palermo, CABA',
    categoria_local: 'Otros',
    descripcion_productos: 'Tacos, quesadillas y burritos con tortillas de maíz hechas en el local.'
  }
];

// Una cuenta dada de baja: no puede entrar, pero sus pedidos siguen contando
// en las ventas y liquidaciones de los locales.
const DESACTIVADOS = [
  { nombre: 'Federico Ruiz', email: 'federico.ruiz@ejemplo.com', alta: 130, entrega: 'Av. Scalabrini Ortiz 1500, Palermo' }
];

// Consultas públicas sobre los platos. Las que no tienen respuesta quedan
// para responderlas en vivo desde el panel del local.
const CONSULTAS = [
  { plato: 'Pizza Margherita', cliente: 'tomas.pereyra@ejemplo.com', hace: 12, texto: '¿La masa es de harina común o tienen opción integral?', respuesta: 'Usamos harina 0000 con masa madre de 48 horas. Por ahora no tenemos integral, pero la estamos probando.' },
  { plato: 'Pizza Especial de la Casa', cliente: 'sofia.rodriguez@ejemplo.com', hace: 9, texto: '¿Se puede pedir sin aceitunas?', respuesta: '¡Sí! Escribinos por acá antes de pedir y la preparamos sin aceitunas.' },
  { plato: 'Pizza de Pepperoni', cliente: 'nicolas.alvarez@ejemplo.com', hace: 1, texto: '¿El pepperoni pica mucho? Es para chicos.' },
  { plato: 'Calzone de Jamón y Queso', cliente: 'lucia@foodiebyte.com', hace: 0, texto: '¿Viene cortado en porciones o entero?' },
  { plato: 'Parrillada para Dos', cliente: 'martin.gomez@ejemplo.com', hace: 15, texto: '¿Alcanza para tres personas?', respuesta: 'Es abundante. Para tres con buen apetito te recomendamos sumar una guarnición.' },
  { plato: 'Bife de Chorizo', cliente: 'joaquin.diaz@ejemplo.com', hace: 7, texto: '¿Lo pueden hacer jugoso?', respuesta: 'Sí. Sale a punto, pero lo hacemos jugoso o bien cocido si nos avisás.' },
  { plato: 'Clásica con Cheddar', cliente: 'valentina.lopez@ejemplo.com', hace: 11, texto: '¿Tienen pan sin TACC?', respuesta: 'El pan de papa tiene gluten. Estamos buscando un proveedor de pan sin TACC certificado.' },
  { plato: 'Doble Bacon', cliente: 'camila.romero@ejemplo.com', hace: 2, texto: '¿La salsa barbacoa es picante?' },
  { plato: 'Combinado Premium 30 piezas', cliente: 'sofia.rodriguez@ejemplo.com', hace: 6, texto: '¿Qué pescados trae el sashimi?', respuesta: 'Salmón rosado y pesca blanca del día: seis cortes en total.' },
  { plato: 'Poke de Salmón', cliente: 'lucia@foodiebyte.com', hace: 4, texto: '¿Se puede cambiar el salmón por langostinos?', respuesta: 'Sí, con un adicional de $2.500. Avisanos por acá cuando hagas el pedido.' },
  { plato: 'Buddha Bowl', cliente: 'camila.romero@ejemplo.com', hace: 8, texto: '¿El aderezo lleva miel?', respuesta: 'No, es 100 % vegetal: limón, tahini y un toque de agave.' },
  { plato: 'Empanadas de Carne Cortada a Cuchillo x6', cliente: 'tomas.pereyra@ejemplo.com', hace: 10, texto: '¿Son al horno o fritas?', respuesta: 'Al horno de barro, como en Tucumán.' },
  { plato: 'Docena Surtida', cliente: 'martin.gomez@ejemplo.com', hace: 3, texto: '¿Puedo elegir los gustos de la docena?', respuesta: 'Sí. Por defecto van dos de cada gusto; si preferís otra combinación, escribinos por acá.' },
  { plato: 'Chocotorta', cliente: 'valentina.lopez@ejemplo.com', hace: 5, texto: '¿Hacen tortas enteras por encargo?', respuesta: 'Sí, con 48 horas de anticipación. Llamanos al local y la reservamos.' },
  { plato: 'Helado Artesanal 1/2 kg', cliente: 'joaquin.diaz@ejemplo.com', hace: 1, texto: '¿Tienen gustos sin azúcar agregada?' }
];

/** Todos los correos que crean los seeders, para poder deshacerlos. */
const EMAILS_DEMO = [
  ...LOCALES.map(l => l.email),
  ...CLIENTES.map(c => c.email),
  ...POSTULANTES.map(p => p.email),
  ...DESACTIVADOS.map(d => d.email)
];

module.exports = { LOCALES, CLIENTES, POSTULANTES, DESACTIVADOS, CONSULTAS, EMAILS_DEMO };
