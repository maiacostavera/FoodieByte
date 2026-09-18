# FoodieByte

Plataforma integral de gestión gastronómica que conecta comensales (*foodies*) con
locales de comida, con gestión de inventario, seguimiento de pedidos y liquidación
de comisiones.

Proyecto final de carrera — arquitectura full-stack adaptada a PostgreSQL.

> **¿Retomás el desarrollo?** Empezá por [`PROJECT.md`](PROJECT.md): cuenta en qué
> estado está el proyecto, qué se cambió y por qué, y qué queda pendiente.
> Este README es la referencia para instalar y correr.
>
> **¿Vas a contribuir?** La forma de trabajar con ramas, commits y pull requests
> está en [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Cómo correrlo en tu compu

### 1. Instalá estos tres programas

| Programa | Para qué | Descarga |
|---|---|---|
| **Node.js 22** (versión LTS) | Corre la API y la web | https://nodejs.org |
| **PostgreSQL 16 o superior** | Guarda los datos | https://www.postgresql.org/download/ |
| **Git** | Descarga el proyecto | https://git-scm.com |

> Al instalar PostgreSQL te pide una contraseña para el usuario `postgres`.
> **Anotala**: el instalador de FoodieByte te la va a pedir.

### 2. Corré cuatro comandos

En una terminal (en Windows sirve PowerShell o la terminal de VS Code):

```bash
git clone https://github.com/maiacostavera/FoodieByte.git
cd FoodieByte
npm run setup
npm run dev
```

- **`npm run setup`** instala todo, te pide la contraseña de PostgreSQL, crea la
  base y carga la demo. Se corre **una sola vez**.
- **`npm run dev`** levanta la API y la web juntas. Cuando arranque, abrí
  **http://localhost:5173**. Para cerrarla: `Ctrl + C`.

Las próximas veces alcanza con `npm run dev`.

### 3. Entrá con una cuenta de la demo

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@foodiebyte.com` | `admin1234` |
| Local | `lanonna@foodiebyte.com` | `demo1234` |
| Cliente | `lucia@foodiebyte.com` | `demo1234` |

Qué trae la demo: ver [Datos de demostración](#datos-de-demostración).

### Antes de presentar

```bash
npm run demo:reiniciar
```

Deja la demo como recién instalada: borra lo que se haya creado probando y vuelve
a cargar los datos con fechas de hoy, así los pedidos pendientes son "de hace
unos minutos". Se puede correr con la aplicación abierta.

### Si algo falla

| Qué aparece | Qué hacer |
|---|---|
| `node` o `npm` "no se reconoce como un comando" | Instalá Node.js y abrí una terminal **nueva**. |
| "No hay un PostgreSQL respondiendo" | Iniciá el servicio: tecla Windows → *Servicios* → `postgresql-x64-…` → clic derecho → *Iniciar*. |
| "PostgreSQL rechazó el usuario o su contraseña" | `npm run setup` la vuelve a pedir. También se puede corregir `DB_PASSWORD` en `server/.env`. |
| "Port 5173 is already in use" o `EADDRINUSE` | Ya hay otra copia corriendo: cerrala con `Ctrl + C` o cerrá esa terminal. |
| La página abre pero no aparecen platos | La API tarda unos segundos más en arrancar: esperá y recargá. |

Para instalarlo a mano, paso por paso, está la [Instalación manual](#instalación-manual).

---

## Índice

- [Cómo correrlo en tu compu](#cómo-correrlo-en-tu-compu)
- [Stack tecnológico](#stack-tecnológico)
- [Roles y funcionalidades](#roles-y-funcionalidades)
- [Instalación manual](#instalación-manual)
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
| Seguridad | JSON Web Tokens (JWT), bcrypt, helmet y límite de intentos con express-rate-limit |
| Archivos | Multer para la carga de imágenes de los platos |

---

## Roles y funcionalidades

### Público (sin sesión)
- Portada con las cifras reales del catálogo (platos, locales y categorías).
- Catálogo con buscador y filtro por categoría (resueltos en el servidor), filtro por local y orden por precio o nombre.
- Ficha de cada plato con su foto, stock, consultas y respuestas, y otros platos del mismo local.
- Preguntas frecuentes, términos y política de privacidad.

### Foodie
- Carrito en un panel lateral, que se conserva entre recargas y avisa si el pedido incluye varios locales.
- Confirmación de pedidos con descuento de stock **transaccional**.
- Historial de pedidos agrupado por local, con el estado de cada parte y el total sin lo rechazado.
- Consultas públicas sobre los platos.
- Solicitud de alta como vendedor, con su estado visible mientras está en revisión.

### Vendedor (local)
- Resumen con facturación, pedidos, pendientes, gráfico de ventas de los últimos 14 días y platos más vendidos.
- Comandas pendientes como tarjetas, de la más vieja a la más nueva, e historial filtrable.
- Despacho o rechazo únicamente de sus propios productos; al rechazar, el stock vuelve.
- ABM de su menú con búsqueda, vista previa de la foto y alertas de poco stock.
- Respuesta a las consultas de sus clientes desde la ficha del plato.

### Administrador
- Indicadores globales, gráfico de ventas de la plataforma y platos más vendidos.
- Liquidación de comisiones por local (5 % configurable).
- Gestión de usuarios con búsqueda y filtros: cambio de roles y desactivación de cuentas, que conserva su historial.
- Solicitudes de alta de local como tarjetas, con todos los datos del formulario.
- Moderación de cualquier plato y listado de todos los pedidos.

### En toda la aplicación
- Cada pantalla tiene su dirección (`#/plato/12`, `#/pedidos`, `#/panel`…): el botón atrás del navegador funciona.
- Las acciones que no se pueden deshacer piden confirmación en una ventana propia.
- Diseño adaptable a celulares, con foco visible para teclado y sin animaciones para quien las desactivó en su sistema.
- Con `npm run dev`, la pantalla de ingreso ofrece entrar con un clic con las cuentas de la demo.

---

## Instalación manual

Es lo mismo que hace `npm run setup`, paso por paso: sirve para entender qué pasa
o para instalarlo sin el instalador.

### Requisitos

- Node.js 20.19 o superior (la versión recomendada está en `.nvmrc`)
- PostgreSQL 14 o superior, en ejecución

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # completá las credenciales de tu PostgreSQL
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

### Datos de demostración

`npm run db:setup` carga una demo completa, pensada para mostrar la plataforma
funcionando como si estuviera en uso:

- 7 locales con 45 platos, cada uno con su foto, precios en pesos y stock
  (algunos en alerta y uno agotado).
- 8 clientes con seis semanas de pedidos: la mayoría despachados, algunos
  rechazados, pedidos con varios locales y comandas pendientes de las últimas horas.
- Consultas sobre los platos, respondidas y sin responder.
- Dos solicitudes de alta de local esperando la aprobación del administrador.
- Una cuenta desactivada, cuyos pedidos siguen contando en las liquidaciones.

Las cuentas para entrar:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@foodiebyte.com` | `admin1234` |
| Vendedor | `lanonna@foodiebyte.com` | `demo1234` |
| Foodie | `lucia@foodiebyte.com` | `demo1234` |

Los otros locales (`saborcriollo@`, `barrioburger@`, `sakura@`, `verderaiz@`,
`donarosa@` y `dulcetentacion@foodiebyte.com`) también entran con `demo1234`.
Las contraseñas salen de `ADMIN_PASSWORD` y `DEMO_PASSWORD` en el `.env`.

Todo el contenido está en [`server/seeders/datos/demo.js`](server/seeders/datos/demo.js):
para cambiar un precio o sumar un plato, se edita ese archivo y se recarga con
`npm run demo:reiniciar`. Las fotos son de Unsplash; los créditos están en
[`server/seeders/fotos/CREDITOS.md`](server/seeders/fotos/CREDITOS.md).

### Comandos disponibles

**raíz** (los que se usan en el día a día)

| Comando | Descripción |
|---|---|
| `npm run setup` | Instala las dependencias, crea los `.env`, prepara las bases y carga la demo |
| `npm run dev` | Levanta la API (puerto 3000) y la web (puerto 5173) juntas |
| `npm run demo:reiniciar` | **Borra** la base y las fotos subidas, y vuelve a cargar la demo con fechas de hoy |
| `npm test` | Pruebas de integración de la API |
| `npm run lint` · `npm run build` | Lint y build del frontend |

**server**

| Comando | Descripción |
|---|---|
| `npm start` | Levanta la API |
| `npm run dev` | La levanta con recarga automática |
| `npm run db:check` | Diagnostica la conexión y muestra qué configuración se está leyendo |
| `npm run db:setup` | Crea la base, migra y carga datos de ejemplo |
| `npm run db:preparar` | Crea las bases que falten (desarrollo y pruebas), migra las dos y carga la demo si la base está vacía |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Carga los datos de ejemplo |
| `npm run db:reset` | **Borra** la base y las fotos subidas, y la reconstruye con la demo (corta las conexiones abiertas) |
| `npm run db:test:create` | Crea la base de pruebas (una sola vez) |
| `npm run migrar:mysql` | Copia los datos de una base MySQL a PostgreSQL |
| `npm test` | Pruebas de integración contra la base de pruebas |

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
`.env`, que **no se versiona**, o de variables de entorno ya definidas (así corre
en el CI y en servidores en la nube, donde no hay archivo). `.env.example`
documenta cada variable.

| Variable | Descripción |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexión a PostgreSQL (el puerto por defecto es `5432`) |
| `DB_NAME_TEST` | Base que usan las pruebas (por defecto `foodiebyte_test`) |
| `DB_SSL` | `true` si el servidor exige TLS (Neon, Supabase, Railway); `false` en local |
| `JWT_SECRET` | Clave de firma de los tokens. Generala con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Vigencia del token (por defecto `24h`) |
| `PORT` | Puerto de la API (por defecto `3000`) |
| `CORS_ORIGIN` | Origen del frontend habilitado; admite varios separados por coma |
| `COMISION_PLATAFORMA` | Comisión sobre las ventas concretadas (`0.05` = 5 %) |
| `ZONA_HORARIA` | Zona con la que se agrupan las ventas por día (por defecto `America/Argentina/Buenos_Aires`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credenciales del administrador que crean los seeders |
| `DEMO_PASSWORD` | Contraseña de las demás cuentas de la demo (locales y clientes) |
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
| `Usuarios` | Cuentas y roles (`foodie`, `vendedor`, `admin`), si la cuenta está activa, y los datos de la solicitud de alta de local |
| `platos` | Catálogo, con `vendedorId` como dueño |
| `Pedidos` | Cabecera de la compra: comprador, total y estado general |
| `PedidoItems` | Una fila por producto comprado, con su `vendedorId`, precio, cantidad y estado |
| `Preguntas` | Consultas de los foodies y su respuesta |

El esquema lo administran las migraciones de Sequelize (`server/migrations/`),
no `sequelize.sync()`: así el estado de la base queda versionado y es
reproducible en cualquier máquina. Después de actualizar el código, `npm run
db:migrate` aplica las migraciones nuevas.

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
| `POST` | `/usuarios/register` | Público (hasta 20 cuentas por hora por conexión) |
| `POST` | `/usuarios/login` | Público (10 intentos fallidos por correo cada 15 minutos) |
| `GET` | `/usuarios/perfil` | Autenticado |
| `POST` | `/usuarios/solicitar-vendedor` | Autenticado |

### Platos

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/platos` | Público (acepta `?busqueda=` y `?categoria=`; solo platos de locales activos) |
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
| `PUT` | `/pedidos/:id/estado` | Vendedor (solo sus líneas pendientes) · admin. Acepta `Enviado` o `Rechazado` |
| `GET` | `/pedidos/estadisticas` | Vendedor (solo lo suyo) · admin |

### Administración

Todas requieren rol `admin`.

| Método | Ruta |
|---|---|
| `GET` | `/admin/usuarios` |
| `PUT` | `/admin/usuarios/:id/rol` |
| `PUT` | `/admin/usuarios/:id/rechazar-vendedor` |
| `PUT` | `/admin/usuarios/:id/desactivar` |
| `PUT` | `/admin/usuarios/:id/reactivar` |
| `GET` | `/admin/platos` |
| `DELETE` | `/admin/platos/:id` |
| `GET` | `/admin/pedidos` |
| `GET` | `/admin/estadisticas` |
| `GET` | `/admin/comisiones-vendedores` |

### Códigos de error

Todas las respuestas de error tienen la forma `{ "mensaje": "..." }`.

| Código | Cuándo |
|---|---|
| `400` | Datos inválidos: campos faltantes, tipos incorrectos, textos que superan el largo permitido, un cuerpo que no es JSON, una imagen cuyo contenido no es JPEG, PNG ni WebP, o un id de la URL que no es un entero positivo |
| `401` | Falta el token, es inválido o expiró, o el usuario ya no existe, fue desactivado o cambió de rol desde que inició sesión |
| `403` | El rol no alcanza, el recurso pertenece a otro local, la cuenta está desactivada (al iniciar sesión) o el origen no está habilitado por CORS |
| `404` | El recurso o la ruta no existen, o el plato ya no está a la venta |
| `409` | Conflicto: email ya registrado, stock insuficiente, solicitud de vendedor ya pendiente o un pedido que ya tiene estado final |
| `413` | El cuerpo de la solicitud supera el tamaño permitido |
| `429` | Demasiados intentos: logins fallidos repetidos para un mismo correo, o demasiadas cuentas creadas desde una misma conexión |
| `500` | Error inesperado del servidor; el detalle queda solo en el log |

---

## Decisiones de diseño

### Un único punto de autenticación

`server/middleware/auth.js` es el **único** lugar del backend que llama a
`jwt.verify`. Cada ruta protegida se declara como
`router.get('/x', autenticar, requiereRol('vendedor'), handler)`. Cuando la
verificación se repite ruta por ruta es fácil que en alguna se omita, y esa ruta
queda abierta sin que nada lo delate.

Además de validar la firma, `autenticar` busca al usuario en la base en cada
request. El token guarda el rol que el usuario tenía al iniciar sesión: sin esa
consulta, un vendedor al que el administrador le quitaba el rol seguía
publicando platos hasta que el token vencía, 24 horas después. Si el usuario ya
no existe, está desactivado o su rol cambió, la API responde 401 y el frontend
cierra la sesión mostrando el motivo.

### Protección básica de la API

- **Encabezados de seguridad** con `helmet`: `nosniff`, Content-Security-Policy y
  protección contra *clickjacking*, entre otros. La política de recursos entre
  orígenes se abre a `cross-origin` para que el frontend pueda mostrar las
  imágenes de `/uploads` desde otro puerto.
- **Límite de intentos** (`middleware/limitarIntentos.js`): diez logins fallidos
  para un mismo correo desde la misma IP bloquean ese correo durante 15 minutos
  con un 429, sin afectar a los demás. Cada conexión puede crear hasta 20 cuentas
  por hora. Los valores están en `config/seguridad.js`.
- **Imágenes verificadas por su contenido**: el tipo que declara el navegador se
  puede falsificar, así que se revisan los primeros bytes del archivo. Si el alta
  o la edición de un plato falla, la imagen recién subida se borra; al reemplazar
  la foto o eliminar el plato, el modelo `Plato` borra el archivo anterior.

Los contadores de intentos viven en la memoria del proceso: si la API se
reinicia vuelven a cero, y con varias instancias habría que llevarlos a un
almacenamiento compartido, por ejemplo Redis.

### Multitenencia por línea de pedido

Un carrito puede mezclar platos de varios locales, así que el aislamiento no
puede vivir en el pedido: vive en `PedidoItems`, donde cada fila guarda su
`vendedorId` y su propio `estado`.

- Cada local recibe del servidor solo sus líneas, y solo puede cambiar el estado de esas.
- El estado general del pedido se **deriva**: queda `Pendiente` mientras algún
  local no haya respondido, `Rechazado` si todos rechazaron, y `Enviado` cuando no
  queda nada pendiente y al menos un local despachó. Cada línea conserva su propio
  estado, así que el cliente ve qué parte se rechazó.
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

### Enviado y Rechazado son estados finales

Cada línea de un pedido pasa de `Pendiente` a `Enviado` o a `Rechazado`, y ahí
queda: ninguno de los dos se puede revertir.

- **Al rechazar, las unidades vuelven al stock** del plato, sin superar el
  máximo permitido.
- **Se bloquea el pedido** antes de cambiar sus líneas. Si dos locales de un
  mismo pedido despachan a la vez, el segundo espera al primero y el estado
  general se calcula sobre datos actualizados.
- Las operaciones usan transacciones administradas por Sequelize: si algo
  falla se revierte todo, y nunca se intenta revertir una transacción que ya
  se confirmó.

### Las cuentas se desactivan, no se borran

Borrar un usuario eliminaba en cascada sus pedidos, y con ellos cambiaban las
liquidaciones ya calculadas de los locales. Por eso la API ya no borra cuentas:
el administrador las **desactiva**.

- Una cuenta desactivada no puede iniciar sesión y su token deja de servir.
- Los platos de un local desactivado, o que perdió el rol de vendedor, salen del
  catálogo y no se pueden comprar, pero siguen guardados.
- Sus pedidos, ventas y liquidaciones quedan intactos, y la cuenta se puede
  reactivar.

La regla de quién puede vender vive en un único lugar: el scope
`habilitadoParaVender` del modelo `Usuario`, que usan el catálogo, la compra y
los KPIs del administrador.

### Los datos inválidos son un 400, no un 500

PostgreSQL es estricto con los datos: rechaza un id como `"abc"` (MySQL lo
convertía en 0 y la consulta no encontraba nada) y rechaza cualquier texto más
largo que su columna. Para que eso no se vea como una caída del servidor:

- `middleware/validarId.js` valida los ids de la URL antes de consultar la base.
- `config/limites.js` concentra los largos máximos que validan las rutas.
- `utils/errores.js` traduce cualquier error de datos que igual llegue a la base
  en un 400 o un 409, y deja el 500 solo para fallas reales.

### La aplicación y el arranque están separados

`server/app.js` arma la aplicación Express completa (CORS, rutas y manejo de
errores) sin ponerla a escuchar. `index.js` la arranca, y las pruebas la
levantan en otro puerto: así se prueba exactamente lo mismo que corre en
producción.

### Configuración por entorno

Ni la clave de firma de los JWT, ni las credenciales de la base, ni la URL de la
API están escritas en el código. El backend lee todo del `.env` o del entorno, y
aborta el arranque en producción si falta `JWT_SECRET`.

---

## Pruebas

Las pruebas corren contra una base **aparte** (`DB_NAME_TEST`, por defecto
`foodiebyte_test`), así nunca tocan los datos de desarrollo.

```bash
cd server
npm run db:test:create    # solo la primera vez
npm test                  # aplica las migraciones pendientes a la base de pruebas y corre la suite
```

Levantan la misma aplicación que `npm start` (`server/app.js`) y verifican los
escenarios críticos del sistema, agrupados en:

- **Autenticación** — tokens inválidos, mensajes de login que no revelan qué correos existen, imposibilidad de auto-asignarse el rol `admin` al registrarse.
- **Permisos vigentes** — un token deja de servir cuando el usuario se elimina o cambia de rol, y al volver a iniciar sesión rige el rol nuevo.
- **Cuentas desactivadas** — pierden el acceso sin revelar que existen, conservan sus pedidos y liquidaciones, sus platos salen del catálogo y vuelven al reactivarlas, y los usuarios ya no se pueden borrar desde la API.
- **Seguridad de la API** — encabezados de seguridad, bloqueo por intentos fallidos de login que no afecta a otros correos, imágenes falsas rechazadas, y ningún archivo huérfano cuando falla un alta, se reemplaza una foto o se elimina un plato.
- **Pedidos y stock** — descuento correcto, rechazo por falta de stock sin efectos colaterales, dos compras simultáneas del último plato disponible, precios inmunes a manipulación del cliente.
- **Estados finales** — al rechazar vuelve el stock (sin superar el máximo), Enviado y Rechazado no se pueden revertir, y dos locales despachando a la vez dejan el pedido en Enviado.
- **Aislamiento entre locales** — un cliente no lee pedidos ajenos, un local no ve ni modifica las comandas ni los platos de otro, y en un pedido mixto cada local gestiona solo su parte.
- **Administración** — control de acceso por rol y exactitud del cálculo de comisiones.
- **Solicitudes y preguntas** — persistencia real de los datos y control de quién puede responder.
- **Catálogo público** — acceso sin sesión, búsqueda del lado del servidor que toma `%` y `_` como texto, y precios devueltos como número.
- **Datos inválidos** — ids no numéricos o fuera de rango, textos demasiado largos, tipos incorrectos y un mismo email registrado dos veces a la vez responden 400 o 409, nunca 500.
- **Aplicación** — rutas inexistentes, cuerpos que no son JSON y orígenes no habilitados por CORS responden con el código correcto.

### Integración continua

Cada push a `main` o `develop`, y cada pull request hacia esas ramas, corre en
GitHub Actions (`.github/workflows/ci.yml`): las pruebas de la API contra un
PostgreSQL descartable, y el lint y el build del frontend.

---

## Estructura del proyecto

```
FoodieByte/
├── .github/                       CI (GitHub Actions) y plantilla de pull request
├── client/
│   ├── src/
│   │   ├── api/client.js          Instancia de Axios: URL base, token y manejo de sesión vencida
│   │   ├── assets/                Imágenes (importadas como módulos para que entren al build)
│   │   ├── components/            Pantallas y piezas de la interfaz
│   │   │   └── panel/             Panel de gestión del local y del administrador
│   │   ├── estilos/               CSS: variables de diseño, componentes, páginas y panel
│   │   ├── state/                 Context de sesión, carrito, avisos y confirmaciones
│   │   ├── utils/                 Rutas, formato de precios y fechas, imágenes y límites
│   │   └── App.jsx                Pantalla actual según la dirección y datos del catálogo
│   └── .env.example
│
├── server/
│   ├── config/                    Base de datos, seguridad, categorías y límites de los datos
│   ├── middleware/                Autenticación, roles, validación de ids y límite de intentos
│   ├── migrations/                Esquema versionado
│   ├── models/                    Modelos de Sequelize
│   ├── pruebas/                   Pruebas de integración
│   ├── scripts/                   Migración puntual de datos desde MySQL
│   ├── routes/                    usuarios · platos · pedidos · admin
│   ├── seeders/                   Datos de demostración (contenido en datos/, fotos en fotos/)
│   ├── uploads/platos/            Imágenes subidas por los vendedores
│   ├── utils/                     Traducción de errores de la base y manejo de imágenes subidas
│   ├── app.js                     Aplicación Express (la usan index.js y las pruebas)
│   ├── index.js                   Arranque: conecta la base y escucha
│   └── .env.example
│
├── CONTRIBUTING.md                Ramas, commits y pull requests
└── PROJECT.md                     Estado del proyecto y traspaso
```
