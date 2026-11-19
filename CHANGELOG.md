# Cambios

Qué trae cada versión de FoodieByte. El detalle de cada cambio está en su pull
request y el porqué, en [`PROJECT.md`](PROJECT.md).

## Sin publicar

### Funcionalidades

- **Campana de notificaciones** para los tres roles: pedidos, despachos,
  rechazos, consultas y solicitudes de alta de local.
- **El administrador resuelve la parte pendiente de cualquier local** desde la
  pestaña *Pedidos*. Es la única forma de cerrar los pedidos de un local
  desactivado, que antes quedaban "Pendiente" para siempre: el panel los
  señala con un aviso. Rechazar devuelve el stock, y el aviso al cliente nombra
  al local.

### Correcciones

- Un pedido a la API sin cuerpo respondía 500 en las once rutas que reciben
  datos. Ahora cada una responde con un 400 claro.
- Las consultas y respuestas que no eran texto daban 500, y la respuesta no
  tenía largo máximo.
- El precio y el stock aceptaban texto de más (`"12abc"` quedaba en 12, `"5.7"`
  en 5). Ahora se rechazan, igual que un precio con más de dos decimales.
- El pedido aceptaba `true` o `[2]` como cantidades.
- El administrador podía asignarle un plato a una cuenta de cliente, y el plato
  no aparecía en ningún lado.
- Dos envíos del carrito en el mismo instante creaban dos pedidos.
- Una cantidad decimal se cobraba redondeada hacia abajo.
- Un local o el admin que entraba a *Mis pedidos* veía una pantalla de compras
  vacía. Ahora va a su panel.
- "Quedan 1 unidades" y otros mensajes de stock usan el singular.

### Diseño

- **Animaciones con [React Bits](https://reactbits.dev)**: el título de la portada
  rota la comida ("La mejor *pizza* de tu barrio"), las cifras de la portada y del
  panel cuentan hasta su valor, el botón "Ver el menú" sigue al cursor, las
  tarjetas tienen un brillo que sigue al mouse y agregar un plato suelta chispas.
  Respetan "reducir movimiento" y se leen bien con lector de pantalla. Detalle en
  `client/README.md`.

### Accesibilidad y diseño

- Los grises de texto secundario, el verde de éxito y el rojo de las
  iniciales ahora cumplen el contraste mínimo WCAG AA (4,5:1). axe no informa
  violaciones A/AA en ninguna pantalla.
- El pie usa el logo vectorial en su versión para fondo oscuro, en lugar de
  una imagen PNG en una caja blanca.

### Calidad

- `npm audit` en cero en la raíz, el servidor y el cliente.
- El recorrido de celular esperaba la tarjeta de carga en lugar de un plato
  real y fallaba siempre.
- 101 pruebas de la API (antes 89) y 14 recorridos de punta a punta (antes 13).

## 1.0.1 · 18/09/2026

- **La terminal de `npm run dev` ya no se llena de SQL.** La API muestra solo los
  pedidos HTTP; para ver cada consulta, `DB_LOGGING=true` en `server/.env`. Lo
  mismo en la salida del script de migración desde MySQL, que ahora se lee de un
  vistazo.

## 1.0.0 · 18/09/2026

Primera versión lista para presentar. Reúne las tres rondas de trabajo sobre el
proyecto original: 16 pull requests revisados y probados.

### Para usarla

- **Instalación con un comando.** `npm run setup` instala las dependencias, crea
  los `.env`, pide la contraseña de PostgreSQL, crea las bases, aplica las
  migraciones y carga la demo. Después, `npm run dev` levanta la API y la web
  juntas. (#12)
- **`npm run demo:reiniciar`** deja la demo como recién instalada, con pedidos
  del día. (#12)
- **Demo realista**: 7 locales, 45 platos con foto, 8 clientes con seis semanas
  de pedidos, consultas respondidas y sin responder, dos solicitudes de alta y
  una cuenta desactivada. (#11)
- **Guion para la presentación** en el README.

### Funcionalidades

- **Rediseño completo** con un sistema de diseño propio: portada con buscador,
  filtros por categoría y por local, orden por precio, ficha del plato, carrito
  lateral, panel de gestión por pestañas y versión para celular. (#14)
- **Cada pantalla tiene su dirección** (`#/plato/12`, `#/pedidos`, `#/panel`) y
  el botón atrás funciona. (#14)
- **Dirección de entrega y aclaraciones** en cada pedido; el local las ve en la
  comanda. (#16)
- **Métricas**: ventas de los últimos 14 días y platos más vendidos, para cada
  local y para toda la plataforma. (#13)
- **Consultas públicas** sobre los platos, que responde el local. (primera ronda)
- **Solicitud de alta de local** con sus datos, que el administrador aprueba o
  rechaza. (primera ronda)
- **Liquidaciones** por local con la comisión de la plataforma. (primera ronda)
- **Cuentas que se desactivan** en lugar de borrarse, sin alterar el historial. (#6)

### Correcciones

- Un pedido con una parte enviada y otra rechazada quedaba "Pendiente" para
  siempre. (#10)
- Rechazar un pedido no reponía el stock, y dos locales despachando a la vez
  desincronizaban el pedido. (#4)
- Un rol quitado seguía valiendo hasta que vencía la sesión. (#5)
- Borrar un usuario reescribía las liquidaciones. (#6)
- Ids no numéricos, textos largos y emails duplicados en simultáneo daban error
  500 con PostgreSQL. (#2)
- Dos rutas no verificaban el token y un vendedor podía ver las comandas de
  otros locales. (primera ronda)

### Seguridad

- Límite de intentos en el ingreso y el registro, encabezados de seguridad y
  validación del contenido real de las imágenes subidas. (#7)
- Dependencias sin vulnerabilidades conocidas (`npm audit` en cero). (#1 y release)
- Las contraseñas de la demo no llegan al build de producción. (release)

### Calidad

- **80 pruebas de integración** de la API contra PostgreSQL real. (#3 en adelante)
- **13 recorridos de punta a punta** con Playwright, en escritorio y celular. (#15)
- **CI con 4 jobs** en cada pull request: API, frontend, instalación desde cero y
  Playwright. (#3, #12 y #15)

### Base de datos

- **PostgreSQL** en lugar de MySQL, con el esquema versionado en 7 migraciones.
  (primera ronda y #6, #16)
- Script para traer los datos de una base MySQL anterior, opcional. (primera ronda)
