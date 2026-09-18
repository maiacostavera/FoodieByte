# Cambios

Qué trae cada versión de FoodieByte. El detalle de cada cambio está en su pull
request y el porqué, en [`PROJECT.md`](PROJECT.md).

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
