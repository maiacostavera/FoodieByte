# FoodieByte

Plataforma integral de gestión gastronómica que conecta comensales (*foodies*) con
locales de comida, con gestión de inventario, seguimiento de pedidos y liquidación
de comisiones.

Proyecto final de carrera — arquitectura full-stack adaptada a PostgreSQL.

> **¿Retomás el desarrollo?** Empezá por [`PROJECT.md`](PROJECT.md): cuenta en qué
> estado está el proyecto, qué se cambió y por qué, y qué queda pendiente.
> Este README es la referencia para instalar y correr.

---

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Roles y funcionalidades](#roles-y-funcionalidades)
- [Puesta en marcha](#puesta-en-marcha)
- [Migrar datos desde MySQL](#migrar-datos-desde-mysql)
- [Variables de entorno](#variables-de-entorno)
- [Modelo de datos](#modelo-de-datos)
- [API](#api)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Pruebas](#pruebas)
- [Estructura del proyecto](#estructura-del-proyecto)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 (hooks + Context API), Axios, Vite |
| Backend | Node.js, Express 5 |
| Base de datos | PostgreSQL 14+, gestionada con el ORM Sequelize |
| Seguridad | JSON Web Tokens (JWT) y hashing de contraseñas con bcrypt |
| Archivos | Multer para la carga de imágenes de los platos |

---

## Roles y funcionalidades

### Público (sin sesión)
- Catálogo de platos con buscador y filtro por categoría, ambos resueltos en el servidor.
- Ficha de cada producto con sus consultas y respuestas.

### Foodie
- Carrito de compras persistente entre recargas.
- Confirmación de pedidos con descuento de stock **transaccional**.
- Historial propio de pedidos con el estado de cada línea.
- Consultas públicas sobre los platos.
- Solicitud de alta como vendedor.

### Vendedor (local)
- ABM completo de su menú, con carga de imágenes.
- Panel de comandas separado en Pendientes / Enviados / Rechazados.
- Cambio de estado únicamente sobre sus propios productos.
- Resumen de ventas: facturación, comandas recibidas, pendientes y alertas de stock.
- Respuesta a las consultas de sus clientes.

### Administrador
- KPIs globales: usuarios, platos, locales, pedidos y volumen de ventas.
- Liquidación de comisiones por local (5 % configurable).
- Gestión global de usuarios y cambio de roles.
- Evaluación de las solicitudes de alta de local, con todos los datos del formulario.
- Moderación de cualquier plato o pedido de la plataforma.

---

## Puesta en marcha

### Requisitos

- Node.js 18 o superior
- PostgreSQL 14 o superior, en ejecución

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # completá las credenciales de tu MySQL
npm run db:setup          # crea la base, corre las migraciones y carga los datos de ejemplo
npm start                 # http://localhost:3000
```

> **Si venís de la versión con MySQL** y querés conservar tus datos, no corras
> `db:seed`: creá el esquema vacío con `npm run db:create && npm run db:migrate`
> y después seguí [Migrar datos desde MySQL](#migrar-datos-desde-mysql).

### 2. Frontend

En otra terminal:

```bash
cd client
npm install
cp .env.example .env      # VITE_API_URL apunta al backend
npm run dev               # http://localhost:5173
```

### Usuarios de ejemplo

Los crea `npm run db:setup` con las contraseñas que definas en el `.env`
(`ADMIN_PASSWORD` y `DEMO_PASSWORD`):

| Rol | Email |
|---|---|
| Administrador | `admin@foodiebyte.com` |
| Vendedor | `lanonna@foodiebyte.com` |
| Vendedor | `saborcriollo@foodiebyte.com` |

Los foodies se crean desde el formulario de registro de la aplicación.

> Hay dos locales de ejemplo a propósito: permiten comprobar que cada vendedor
> ve únicamente su inventario y sus comandas.

### Comandos disponibles

**server**

| Comando | Descripción |
|---|---|
| `npm start` | Levanta la API |
| `npm run dev` | La levanta con recarga automática |
| `npm run db:check` | Diagnostica la conexión y muestra qué configuración se está leyendo |
| `npm run db:setup` | Crea la base, migra y carga datos de ejemplo |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Carga los datos de ejemplo |
| `npm run db:reset` | **Borra** la base y la reconstruye desde cero |
| `npm run migrar:mysql` | Copia los datos de una base MySQL a PostgreSQL |
| `npm test` | Pruebas de integración de la API |

**client**

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build para verificarlo |
| `npm run lint` | ESLint |

---

## Variables de entorno

El backend no tiene ningún valor sensible escrito en el código. Todo sale del
`.env`, que **no se versiona**; `.env.example` documenta cada variable.

| Variable | Descripción |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a PostgreSQL (el puerto por defecto es `5432`) |
| `DB_SSL` | `true` si el servidor exige TLS (Neon, Supabase, Railway); `false` en local |
| `JWT_SECRET` | Clave de firma de los tokens. Generala con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Vigencia del token (por defecto `24h`) |
| `PORT` | Puerto de la API (por defecto `3000`) |
| `CORS_ORIGIN` | Origen del frontend habilitado; admite varios separados por coma |
| `COMISION_PLATAFORMA` | Comisión sobre las ventas concretadas (`0.05` = 5 %) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenciales del administrador inicial |
| `MYSQL_*` | Solo para la migración puntual desde MySQL; se pueden borrar después |

En el cliente, `VITE_API_URL` define la URL de la API.

---

## Migrar datos desde MySQL

El proyecto usaba MySQL. `server/scripts/migrar-mysql-a-postgres.js` copia una
base MySQL existente a PostgreSQL conservando los IDs originales, de modo que
las relaciones y las rutas de las imágenes siguen siendo válidas.

### Cómo se usa

1. Dejá encendido el MySQL de origen y completá las variables `MYSQL_*` del `.env`.
2. Creá el esquema en PostgreSQL **sin datos de ejemplo**:

   ```bash
   npm run db:create && npm run db:migrate
   ```

3. Probá primero en seco: lee, valida y muestra el resumen sin escribir nada.

   ```bash
   node scripts/migrar-mysql-a-postgres.js --dry-run
   ```

4. Si el resumen es correcto, migrá:

   ```bash
   npm run migrar:mysql
   ```

### Banderas

| Bandera | Para qué sirve |
|---|---|
| `--dry-run` | Simula la migración completa sin escribir en PostgreSQL |
| `--force` | Vacía el destino antes de migrar (por defecto se niega a escribir sobre datos existentes) |
| `--reparar-codificacion` | Arregla los acentos y las ñ que hayan quedado mal codificados en el origen |
| `--exportar <archivo>` | Lee MySQL y guarda los datos en un JSON, sin tocar PostgreSQL |
| `--importar <archivo>` | Escribe en PostgreSQL desde ese JSON, sin necesitar MySQL |

Las dos últimas sirven cuando MySQL y PostgreSQL están en máquinas distintas:
se exporta donde vive MySQL, se copia el archivo, y se importa donde vive
PostgreSQL. El JSON contiene hashes de contraseñas y datos de usuarios, así que
no debe subirse al repositorio.

### Qué resuelve

- **Detecta el esquema de origen.** Si la base todavía guarda los productos del
  pedido como un JSON en `Pedidos.productos`, los descompone en líneas de
  `PedidoItems` y recupera el vendedor de cada una desde el plato. Un pedido que
  mezclaba dos locales queda correctamente separado.
- **Sanea los datos.** Roles que ya no existen (`comprador`), emails duplicados o
  vacíos, platos sin vendedor, pedidos que apuntan a usuarios borrados: cada caso
  se informa y se resuelve sin abortar la migración.
- **Acentos mal codificados.** Es habitual que una base creada desde
  phpMyAdmin guarde `PizzerÃ­a` en lugar de `Pizzería`. El script lo detecta y
  avisa; con `--reparar-codificacion` lo corrige.
- **Ajusta las secuencias.** Después de insertar con IDs explícitos, los
  contadores de PostgreSQL se reposicionan. Sin esto, el primer alta desde la
  aplicación fallaría por clave duplicada.
- **Todo o nada.** La escritura ocurre dentro de una transacción: si algo falla,
  la base de destino queda intacta.
- **Verifica el resultado.** Al terminar compara los conteos y controla que el
  total de cada pedido coincida con la suma de sus líneas.

Las imágenes de los platos no están en la base: viven en `server/uploads/platos/`
y no se tocan durante la migración.

---

## Modelo de datos

```
Usuario ──< Plato ──< PedidoItem >── Pedido >── Usuario
   │           │                                   (comprador)
   │           └──< Pregunta >── Usuario
   └──────────────────────────────────< (vendedor de la línea)
```

| Tabla | Rol |
|---|---|
| `Usuarios` | Cuentas y roles (`foodie`, `vendedor`, `admin`) más los datos de la solicitud de alta de local |
| `platos` | Catálogo, con `vendedorId` como dueño |
| `Pedidos` | Cabecera de la compra: comprador, total y estado general |
| `PedidoItems` | Una fila por producto comprado, con su `vendedorId`, precio, cantidad y estado |
| `Preguntas` | Consultas de los foodies y su respuesta |

El esquema lo administran las migraciones de Sequelize (`server/migrations/`),
no `sequelize.sync()`: así el estado de la base queda versionado y es
reproducible en cualquier máquina.

> En PostgreSQL los nombres con mayúsculas son sensibles a mayúsculas y hay que
> escribirlos entre comillas dobles al consultarlos a mano:
> `SELECT * FROM "Usuarios";` funciona, `SELECT * FROM Usuarios;` no.
> La tabla `platos` está en minúsculas y no las necesita.

---

## API

Base: `http://localhost:3000/api`

### Usuarios

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/usuarios/register` | Público |
| `POST` | `/usuarios/login` | Público |
| `GET` | `/usuarios/perfil` | Autenticado |
| `POST` | `/usuarios/solicitar-vendedor` | Autenticado |

### Platos

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/platos` | Público (acepta `?busqueda=` y `?categoria=`) |
| `GET` | `/platos/categorias` | Público |
| `GET` | `/platos/mis-platos` | Vendedor · admin |
| `POST` | `/platos` | Vendedor · admin |
| `PUT` | `/platos/:id` | Dueño del plato · admin |
| `PUT` | `/platos/:id/stock` | Dueño del plato · admin |
| `DELETE` | `/platos/:id` | Dueño del plato · admin |
| `GET` | `/platos/:id/preguntas` | Público |
| `POST` | `/platos/:id/preguntas` | Foodie |
| `PUT` | `/platos/:platoId/preguntas/:preguntaId` | Dueño del plato · admin |

### Pedidos

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/pedidos` | Foodie |
| `GET` | `/pedidos/mis-pedidos` | Autenticado (solo los propios) |
| `GET` | `/pedidos/comandas` | Vendedor (solo las suyas) · admin |
| `PUT` | `/pedidos/:id/estado` | Vendedor (solo sus líneas) · admin |
| `GET` | `/pedidos/estadisticas` | Vendedor (solo lo suyo) · admin |

### Administración

Todas requieren rol `admin`.

| Método | Ruta |
|---|---|
| `GET` | `/admin/usuarios` |
| `PUT` | `/admin/usuarios/:id/rol` |
| `PUT` | `/admin/usuarios/:id/rechazar-vendedor` |
| `DELETE` | `/admin/usuarios/:id` |
| `GET` | `/admin/platos` |
| `DELETE` | `/admin/platos/:id` |
| `GET` | `/admin/pedidos` |
| `GET` | `/admin/estadisticas` |
| `GET` | `/admin/comisiones-vendedores` |

---

## Decisiones de diseño

### Un único punto de autenticación

`server/middleware/auth.js` es el **único** lugar del backend que llama a
`jwt.verify`. Cada ruta protegida se declara como
`router.get('/x', autenticar, requiereRol('vendedor'), handler)`. Cuando la
verificación se repite ruta por ruta es fácil que en alguna se omita, y esa ruta
queda abierta sin que nada lo delate.

### Multitenencia por línea de pedido

Un carrito puede mezclar platos de varios locales, así que el aislamiento no
puede vivir en el pedido: vive en `PedidoItems`, donde cada fila guarda su
`vendedorId` y su propio `estado`.

- Cada local recibe del servidor solo sus líneas, y solo puede cambiar el estado de esas.
- El estado general del pedido se **deriva**: queda `Enviado` cuando todos los
  locales despacharon, `Rechazado` si todos rechazaron, y `Pendiente` mientras falte alguno.
- Las comisiones se calculan sobre las líneas efectivamente despachadas.

### Los importes los decide el servidor

Al confirmar un pedido el cliente envía únicamente `id` y `cantidad`. El precio
y el total se leen de la base dentro de la transacción: un precio manipulado
desde el navegador no tiene efecto.

### Control de stock transaccional

La creación de un pedido corre dentro de una transacción de Sequelize con
`SELECT ... FOR UPDATE` sobre cada plato. Las filas se bloquean siempre en orden
ascendente de `id` para que dos compras simultáneas no se interbloqueen. Si
cualquier ítem no tiene stock, la transacción se revierte completa y no se
descuenta nada.

### Configuración por entorno

Ni la clave de firma de los JWT, ni las credenciales de la base, ni la URL de la
API están escritas en el código. El backend lee todo del `.env` y aborta el
arranque en producción si falta `JWT_SECRET`.

---

## Pruebas

```bash
cd server
npm test
```

Levanta la API contra la base configurada y verifica 36 escenarios agrupados en:

- **Autenticación** — tokens inválidos, mensajes de login que no revelan qué correos existen, imposibilidad de auto-asignarse el rol `admin` al registrarse.
- **Pedidos y stock** — descuento correcto, rechazo por falta de stock sin efectos colaterales, dos compras simultáneas del último plato disponible, precios inmunes a manipulación del cliente.
- **Aislamiento entre locales** — un cliente no lee pedidos ajenos, un local no ve ni modifica las comandas ni los platos de otro, y en un pedido mixto cada local gestiona solo su parte.
- **Administración** — control de acceso por rol y exactitud del cálculo de comisiones.
- **Solicitudes y preguntas** — persistencia real de los datos y control de quién puede responder.

Las pruebas crean y eliminan sus propios datos; aun así conviene ejecutarlas
sobre una base de desarrollo.

---

## Estructura del proyecto

```
FoodieByte/
├── client/
│   ├── src/
│   │   ├── api/client.js          Instancia de Axios: URL base, token y manejo de sesión vencida
│   │   ├── assets/                Imágenes (importadas como módulos para que entren al build)
│   │   ├── components/
│   │   │   ├── admin/             Piezas del panel de gestión
│   │   │   └── ...                Navbar, Banner, Carrito, Login, Signup, etc.
│   │   ├── state/                 Context de sesión y carrito
│   │   ├── utils/imagenes.js      Resolución de la imagen de cada plato
│   │   └── App.jsx
│   └── .env.example
│
└── server/
    ├── config/                    Configuración de base, seguridad y categorías
    ├── middleware/auth.js         Autenticación y control de roles
    ├── migrations/                Esquema versionado
    ├── models/                    Modelos de Sequelize
    ├── pruebas/                   Pruebas de integración
    ├── scripts/                   Migración puntual de datos desde MySQL
    ├── routes/                    usuarios · platos · pedidos · admin
    ├── seeders/                   Datos de ejemplo
    ├── uploads/platos/            Imágenes subidas por los vendedores
    ├── .env.example
    └── index.js
```
