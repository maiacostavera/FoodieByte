# FoodieByte · Estado del proyecto y traspaso

Documento de traspaso para quien retome el desarrollo.
Última actualización: segunda ronda de mejoras (pull requests #1 a #9 hacia `develop`).

Para instalar y correr el proyecto, el documento de referencia es
[`README.md`](README.md). La forma de trabajar con ramas, commits y pull requests
está en [`CONTRIBUTING.md`](CONTRIBUTING.md). Este archivo cuenta **en qué estado
está**, **qué se cambió y por qué**, y **qué queda pendiente**.

---

## Resumen en 30 segundos

FoodieByte es una plataforma de gestión gastronómica (proyecto final de carrera)
con tres roles: foodie, vendedor y administrador. Stack: React 19 + Vite en el
frontend, Node/Express + Sequelize en el backend, **PostgreSQL** en la base.

Hubo dos rondas de trabajo. La primera migró el proyecto a PostgreSQL y corrigió
seguridad y multitenencia: está en `main`. La segunda hizo una revisión completa y
dejó **nueve pull requests encadenados hacia `develop`**, pendientes de revisión.

| | Estado |
|---|---|
| Primera ronda: migración a PostgreSQL | ✅ En `main` |
| Segunda ronda: PRs #1 a #9 | ⏳ Abiertos hacia `develop`, se mergean **en orden** |
| Pruebas de integración | ✅ 73 escenarios contra PostgreSQL real, en una base aparte |
| Integración continua | ✅ GitHub Actions en cada pull request hacia `develop` y `main` |
| ESLint del frontend y build | ✅ 0 errores, compila |
| Migración de los datos reales a PostgreSQL | ⚠️ **Pendiente** — ver más abajo |

---

## Qué hacer primero

1. **Mergear los PRs #1 → #2 → … → #9 en ese orden**, todos con *Create a merge
   commit* (sin squash): cada rama sale de la anterior.
2. Después de mergear, en `server/`:

   ```bash
   npm install              # el PR #7 agrega helmet y express-rate-limit
   npm run db:migrate       # el PR #6 agrega la columna Usuarios.activo
   npm run db:test:create   # una sola vez: base aparte para las pruebas (PR #3)
   npm test                 # todas en verde
   ```

3. Quien tenga permisos de administrador del repositorio: proteger `main` y
   `develop` exigiendo el CI en verde, y poner `develop` como rama por defecto.
4. Resolver la migración de los datos reales (sección siguiente).

---

# ⚠️ TAREA PENDIENTE — migrar los datos de MySQL a PostgreSQL

**El código está listo y verificado; esto es un paso operativo** que no se pudo
ejecutar porque depende de la base local de la dueña del repositorio.

Todo lo necesario está en el repositorio. Este es el procedimiento completo.

## Antes de empezar: ¿dónde está cada base?

Los datos originales viven en un **MySQL de XAMPP en la máquina de la dueña**
(`foodiebyte_db`: 7 usuarios, 28 platos, 20 pedidos). Según dónde trabajes,
cambia el camino:

| Situación | Camino |
|---|---|
| Trabajás en la máquina que tiene el MySQL original | **Camino A** (directo) |
| Trabajás en otra máquina | **Camino B** (en dos mitades) |
| Los datos de prueba ya no importan | **Camino C** (empezar limpio) |

---

## Camino A — MySQL y PostgreSQL en la misma máquina

Con MySQL encendido en XAMPP y PostgreSQL corriendo, parado en `server/`:

```bash
npm install
npm run db:check      # NO AVANZAR hasta que diga "Conexión establecida correctamente"
npm run db:create
npm run db:migrate    # NO correr db:seed: los datos los trae la migración
node scripts/migrar-mysql-a-postgres.js --dry-run
npm run migrar:mysql
```

## Camino B — Las bases están en máquinas distintas

La migración se parte en dos y solo viaja un archivo JSON.

**En la máquina que tiene el MySQL** (solo necesita MySQL, no PostgreSQL):

```bash
node scripts/migrar-mysql-a-postgres.js --exportar datos-foodiebyte.json
```

Genera un JSON con los datos ya transformados y validados. Pesa unos pocos KB.
Copiá también `server/uploads/platos/` si querés conservar las fotos: son
archivos en disco, no están en la base.

**En la máquina que tiene PostgreSQL** (no necesita MySQL):

```bash
npm run db:check
npm run db:create && npm run db:migrate
node scripts/migrar-mysql-a-postgres.js --importar datos-foodiebyte.json
```

> No subas el JSON al repositorio: contiene los hashes de las contraseñas y los
> datos de los usuarios.

## Camino C — Empezar limpio

Si se decide que los datos de prueba no valen la pena, no hay migración:

```bash
npm run db:setup
```

Crea el esquema y carga la demo completa: siete locales con 45 platos y fotos,
clientes con seis semanas de pedidos, consultas y solicitudes de alta. El detalle
está en la sección "Datos de demostración" del README.

---

## El bloqueo que hay que resolver primero

La dueña quedó trabada acá, y es lo primero con lo que te vas a encontrar:

```
ERROR: la autenticación password falló para el usuario «postgres»
```

**Ese mensaje es ambiguo:** aparece igual si la contraseña está mal, si falta el
`.env` (el código cae en el usuario `postgres` por defecto), o si el archivo
quedó como `.env.txt`, que es lo que hace el Bloc de notas de Windows al guardar
un archivo nuevo.

`npm run db:check` distingue los cuatro casos y dice cuál es. **Corrélo primero
y no avances hasta que dé verde**, porque todos los comandos siguientes fallan
con el mismo error hasta que la conexión funcione.

Para crear el `.env` en Windows sin que quede como `.env.txt`:

```
copy .env.example .env
notepad .env
```

El Bloc de notas agrega `.txt` a los archivos nuevos, pero conserva el nombre al
abrir uno que ya existe.

## Qué esperar del `--dry-run`

Con la base real tiene que decir **`ANTERIOR (productos en JSON)`** y mostrar
`7 / 28 / 20` coincidiendo en las dos columnas. Va a informar además:

- Tres tablas que no se migran (`comentarios`, `valoraciones`, `categoria`).
  Es correcto: las primeras dos están vacías y el modelo actual no las tiene.
- Cuántas fotos se recuperaron de la columna `imagen`.
- Si hay acentos rotos (`🔤`). En ese caso, agregá `--reparar-codificacion`.

El `--dry-run` no escribe nada. La migración real corre en una transacción: si
algo falla, PostgreSQL queda intacto. **MySQL nunca se modifica**, solo se lee.

## Cómo saber que salió bien

```bash
npm run db:test:create                      # si todavía no existe la base de pruebas
npm test                                    # todas en verde
npm start                                   # y en client/: npm run dev
```

En la aplicación: el catálogo tiene que mostrar los 28 platos, cada vendedor solo
su propio inventario, y la pestaña de liquidaciones del admin con importes
calculados. Los usuarios entran con sus contraseñas de siempre: los hashes se
migran tal cual, y todas las cuentas quedan activas.

## Cuando termines

Actualizá este documento: mové esta sección a "completado" y borrá la fila
pendiente de la tabla de estado. El resto del archivo explica **por qué** el
código quedó como quedó, y sigue siendo válido.

---

## Índice

- [Qué hacer primero](#qué-hacer-primero)
- [⚠️ TAREA PENDIENTE](#️-tarea-pendiente--migrar-los-datos-de-mysql-a-postgresql)
- [De dónde viene el proyecto](#de-dónde-viene-el-proyecto)
- [Segunda ronda: revisión completa y nueve PRs](#segunda-ronda-revisión-completa-y-nueve-prs)
- [Qué se corrigió en la primera ronda](#qué-se-corrigió-en-la-primera-ronda)
- [La historia de la base de datos](#la-historia-de-la-base-de-datos)
- [Qué queda pendiente](#qué-queda-pendiente)
- [Decisiones de arquitectura](#decisiones-de-arquitectura)
- [Mapa del código](#mapa-del-código)
- [Cómo verificar que todo sigue bien](#cómo-verificar-que-todo-sigue-bien)
- [Trampas conocidas](#trampas-conocidas)
- [Ideas para continuar](#ideas-para-continuar)

---

## De dónde viene el proyecto

El proyecto se desarrolló con asistencia de IA y llegó a esta sesión con una
descripción que prometía más de lo que el código hacía. Se auditó completo
(backend, frontend, modelos, migraciones, build) y se corrigió.

Los ocho commits de la intervención, del más viejo al más nuevo:

| Commit | Qué hizo |
|---|---|
| `0aab40d` | Seguridad, multitenencia y funcionalidades que faltaban |
| `4ae90b2` | Documentación de la migración de esquema |
| `39cf91b` | Sincronización del package-lock |
| `a94279c` | Cambio de motor de MySQL a PostgreSQL |
| `b8f36a1` | Nombres de tabla en minúsculas (Windows) |
| `4ee534c` | Recuperación de fotos en la columna `imagen` |
| `52c3313` | `npm run db:check` para diagnosticar la conexión |
| `15dbb12` | Mensajes de error claros cuando falta configuración |

---

## Segunda ronda: revisión completa y nueve PRs

Se revisó de nuevo todo el repositorio y cada hallazgo importante se confirmó
contra la API real antes de cambiar el código. Las decisiones de negocio las tomó
el equipo: **rechazar un pedido repone el stock y cierra su estado**, **las
cuentas se desactivan en lugar de borrarse** y **la ficha del producto es
pública**.

A partir de esta ronda se trabaja con git-flow: existe `develop`, cada cambio va
en su propia rama y entra por pull request. Cada rama se armó sobre la anterior y
trae sus propias pruebas.

| PR | Rama | Qué resuelve |
|---|---|---|
| #1 | `bugfix/dependencias` | Vulnerabilidades altas en multer, path-to-regexp, lodash y axios; archivos y dependencias sin uso |
| #2 | `bugfix/postgres-robustez` | Ids no numéricos, textos largos, tipos inválidos y emails duplicados en simultáneo daban 500 con PostgreSQL |
| #3 | `feature/infra-equipo` | CI, base de pruebas aparte, `app.js` separado de `index.js`, `.gitattributes`, versión de Node y guía de contribución |
| #4 | `bugfix/pedidos-stock-estados` | Rechazar no reponía el stock, los estados se podían revertir y dos locales despachando a la vez desincronizaban el pedido |
| #5 | `bugfix/permisos-vigentes` | Un rol quitado seguía valiendo hasta 24 horas porque se leía del token |
| #6 | `bugfix/integridad-historial` | Borrar un usuario reescribía liquidaciones, y los platos de un vendedor sin rol seguían a la venta |
| #7 | `bugfix/seguridad-api` | Sin límite de intentos de login, sin encabezados de seguridad, imágenes falsas aceptadas e imágenes huérfanas en disco |
| #8 | `feature/mejoras-frontend` | Ficha pública, resultados de búsqueda viejos, stock desactualizado tras comprar, formato de precios y celular |
| #9 | `feature/actualiza-traspaso` | Este documento |

El antes y el después de cada cambio está en la descripción de su PR. Las
decisiones de diseño que dejaron están en el
[README](README.md#decisiones-de-diseño).

---

## Qué se corrigió en la primera ronda

### Seguridad

**Dos rutas no verificaban el token.** `GET /pedidos/usuario/:id` y
`GET /pedidos/estadisticas` comprobaban que el header `Authorization` existiera,
pero **nunca llamaban a `jwt.verify`**. Con cualquier cadena como token se podían
leer los pedidos de cualquier usuario y la facturación total de la plataforma.

La causa de fondo: la verificación del JWT estaba copiada a mano en cada ruta,
diez veces, y en dos se habían olvidado de escribirla. Ahora
`middleware/auth.js` es el **único** lugar del backend que llama a `jwt.verify`,
y cada ruta protegida se declara así:

```js
router.get('/x', autenticar, requiereRol('vendedor'), handler)
```

Además: se eliminó `POST /usuarios/generar-hash`, que era un oráculo de bcrypt
público; el secreto de los JWT y las credenciales salen del `.env`; CORS quedó
restringido al origen configurado; el login devuelve el mismo mensaje para email
inexistente y contraseña incorrecta; el registro público ignora el rol enviado en
el body; y las respuestas nunca incluyen el hash de la contraseña.

### Multitenencia

`GET /pedidos/todos` devolvía **todas las comandas de la plataforma a cualquier
vendedor**, que además podía cambiar el estado de pedidos ajenos.

El problema de fondo era el modelo: los productos del pedido se guardaban como
un texto JSON en `Pedidos.productos`, así que no había forma de saber a qué local
pertenecía cada producto. Se normalizó en la tabla `PedidoItems`, donde cada
línea guarda su `vendedorId`, el precio del momento de la compra y **su propio
estado**.

Con eso, un carrito que mezcla dos locales funciona bien: cada uno recibe solo
sus líneas, solo puede cambiar el estado de esas, y el estado general del pedido
se **deriva** (`Pendiente` mientras algún local no respondió, `Rechazado` si
todos rechazaron y `Enviado` cuando no queda nada pendiente y al menos uno
despachó; las líneas rechazadas conservan su estado).

### Funcionalidades que el frontend llamaba y no existían

- `GET /admin/comisiones-vendedores` daba 404: la tabla de liquidación siempre
  aparecía vacía. El "dashboard financiero" de la descripción no funcionaba.
- El KPI de ganancias mostraba `$0` porque `/admin/estadisticas` nunca devolvía
  `gananciasPlataforma`.
- Las preguntas sobre los platos eran un **mock**: el endpoint no existía y el
  `catch` del frontend simulaba el éxito guardando la consulta en memoria. Al
  recargar desaparecía. Ahora hay tabla `Preguntas` y endpoints reales.
- El formulario "Quiero ser Vendedor" mandaba nombre del local, teléfono,
  dirección, categoría y descripción, y el backend **descartaba todo**: solo
  ponía `solicitud_vendedor = true`. El admin aprobaba a ciegas.

### Datos inventados que se quitaron

Preguntas ficticias de "Carlos" y "Ana" que aparecían en **todos** los platos;
"(12 valoraciones)" fijo con estrellas que no guardaban nada; notificaciones
falsas del vendedor ("Comanda #1024"). Las preguntas se implementaron de verdad;
valoraciones y notificaciones se eliminaron por decisión de la dueña.

### Bugs que rompían

- **Las imágenes por categoría no entraban al build.** Estaban como rutas de
  texto `'/src/assets/pizza.webp'`: funcionan con `npm run dev` pero dan 404 en
  producción. Ahora se importan como módulos. El mapeo además apuntaba a
  `parrilla.webp` cuando el archivo se llama `parilla.webp` (una sola r), así que
  esa categoría nunca mostró imagen ni siquiera en desarrollo.
- **Las migraciones no coincidían con los modelos en ninguna tabla** y la app
  dependía de `sequelize.sync()`. Correr `sequelize db:migrate` en un clon limpio
  reventaba. Se reescribieron las cinco.
- **La tipografía Poppins nunca cargaba**: el `href` de Google Fonts tenía
  formato Markdown adentro (`href="[url](url)"`).
- El resumen de ventas del vendedor quedaba con cifras viejas al despachar una
  comanda.
- No había manejo de sesión expirada: a las 24 horas todo fallaba en silencio y
  el usuario seguía aparentando estar autenticado.

### Higiene

`server/node_modules` estaba versionado: **4.827 de los 4.917 archivos** del
repositorio. Hoy son 78. También se sacaron las imágenes subidas en ejecución.
`banner.png` pasó de 6,7 MB a 75 KB en WebP. Se resolvieron los 13 errores de
ESLint y se borraron `App.css` y `themes.css`, que no se importaban en ningún
lado. `test-stock.js`, que ya no compilaba contra la API, se reemplazó por una
suite de 36 pruebas de integración.

---

## La historia de la base de datos

Esta es la parte con más matices y la que conviene leer entera antes de tocar
nada relacionado con datos.

### Punto de partida

El proyecto usaba **MySQL vía XAMPP** en Windows. La dueña tiene ahí una base
`foodiebyte_db` con datos de prueba que quiere conservar:

```
usuarios       7 filas
platos        28 filas
pedidos       20 filas
preguntas      0 filas
comentarios    0 filas
valoraciones   0 filas
categoria      1 fila
```

### El cambio de motor

Se pasó a **PostgreSQL** por pedido de la dueña, con el criterio de dejar un
solo motor (no soporte dual). Se reemplazó `mysql2` por `pg`; `mysql2` quedó como
dependencia de desarrollo porque el script de migración necesita leer el origen.

**Dos cosas del código habrían roto con el cambio, y ninguna era obvia:**

1. `routes/admin.js` ordenaba la liquidación con ``literal('`totalVentas`')``.
   Las comillas invertidas son sintaxis de MySQL; en PostgreSQL la consulta
   falla y la tabla de liquidaciones deja de cargar.

2. `routes/platos.js` buscaba con `Op.like`. MySQL ignora mayúsculas por su
   colación por defecto, **PostgreSQL no**. Buscar `pizza` habría dejado de
   encontrar `Pizza Margherita`. Este es el peor tipo de bug: no falla, solo
   devuelve resultados incompletos, y se descubre en la defensa. Se cambió a
   `Op.iLike`.

También se ajustaron las migraciones para que el `down` elimine los tipos ENUM:
en PostgreSQL el tipo sobrevive al `DROP TABLE` y volver a migrar falla.

La segunda ronda encontró tres diferencias más con MySQL que terminaban en 500:
un id no numérico en la URL (MySQL lo convertía en 0; PostgreSQL rechaza la
consulta), un texto más largo que su columna, y el `DECIMAL`, que el driver de
PostgreSQL devuelve como texto. Las resolvió el PR #2.

### El script de migración

`server/scripts/migrar-mysql-a-postgres.js`, expuesto como `npm run migrar:mysql`.
Copia MySQL → PostgreSQL conservando los IDs originales, para no invalidar
relaciones ni las rutas de las imágenes.

Banderas: `--dry-run` (simula sin escribir), `--force` (vacía el destino antes),
`--reparar-codificacion` (arregla acentos rotos).

Y para cuando las dos bases están en máquinas distintas, la migración se puede
partir en dos mitades que solo comparten un archivo JSON: `--exportar <archivo>`
lee MySQL y escribe el archivo sin tocar PostgreSQL, y `--importar <archivo>`
escribe en PostgreSQL sin necesitar MySQL. Verificado con el servidor MySQL
apagado durante la importación.

### Los cuatro problemas que aparecieron al probarlo contra datos reales

Cada uno se descubrió replicando la base real y ejecutando la migración, no
leyendo el código. Vale la pena conocerlos porque son trampas que se repiten.

**1. Nombres de tabla en minúsculas.** En Windows, MySQL guarda las tablas en
minúsculas (`lower_case_table_names=1`): `Usuarios` queda como `usuarios`. La
consulta a `information_schema` comparaba con mayúsculas y devolvía cero
coincidencias, así que el script creía que la base no tenía `PedidoItems` y la
trataba como esquema anterior. Ahora los nombres reales se leen una vez y se
indexan en minúsculas.

**2. Dos columnas de imagen.** La tabla `platos` tiene `imagenUrl` **y** `imagen`,
de versiones distintas del proyecto, con los datos repartidos entre las dos. El
script solo leía la primera: en la prueba, 9 de 28 platos habrían perdido la foto
sin ningún aviso. Ahora toma la que tenga valor y reporta cuántas recuperó.

**3. Texto con doble codificación.** Es habitual que una base creada desde
phpMyAdmin guarde `PizzerÃ­a` en lugar de `Pizzería`. El texto ya está mal en el
origen (la migración no lo rompe), pero es el momento justo para arreglarlo. El
script lo detecta y avisa; con `--reparar-codificacion` lo corrige
reinterpretando los bytes.

**4. Datos que el esquema nuevo no admite.** Roles inexistentes como `comprador`,
emails duplicados o vacíos, platos sin vendedor, pedidos que apuntan a usuarios
borrados, JSON corrupto en `productos`. Cada caso se informa y se resuelve sin
abortar la migración.

### Las tres tablas huérfanas

La base real tiene `comentarios`, `valoraciones` y `categoria`, que **no existen
en el código**. Las tres primeras están vacías: las creó un `sync()` de alguna
versión anterior y nunca se usaron, lo que encaja con que la interfaz fingiera
las preguntas y las estrellas.

El script las detecta, informa cuántas filas tienen y **no las migra**: no hay
dónde ponerlas. Quedan intactas en MySQL. Si alguna vez tuvieran datos, habría
que decidir si se les da modelo y pantalla o se exportan aparte.

### Detalle que no se puede arreglar

La columna `precio` de la base real es `decimal(10,0)`: **sin decimales**. Un
plato de $1200.50 ya está guardado como 1201. Los centavos se perdieron antes de
esta intervención; la migración copia lo que hay. En el esquema nuevo la columna
es `DECIMAL(10,2)`, así que de acá en adelante los decimales se respetan.

### Cambios de esquema de la segunda ronda

- **`20260914000001-add-activo-usuarios`** (PR #6): columna `Usuarios.activo`,
  booleana y `true` por defecto. Las cuentas existentes, y las que traiga el
  script de migración, quedan activas sin tocar nada.
- **Base de pruebas aparte** (PR #3): las pruebas corren sobre `foodiebyte_test`
  (`DB_NAME_TEST`) y `npm test` le aplica las migraciones pendientes antes de
  correr. La base de desarrollo ya no recibe datos de prueba.

### Cómo se verificó

No alcanza con que el script no tire error. Se probó contra tres bases MySQL
reales, y en cada una se comprobó el contenido, no solo los conteos:

1. **Esquema nuevo, datos sanos.** Migró todo y después las 36 pruebas de
   integración pasaron *sobre la base migrada*, que es lo que demuestra que las
   secuencias de IDs quedaron bien: la aplicación puede crear registros nuevos
   sin chocar con los IDs importados.
2. **Esquema anterior con datos sucios.** Los pedidos con JSON se descompusieron
   en líneas y un pedido que mezclaba dos locales quedó correctamente separado.
   Los cinco problemas de datos se informaron sin abortar.
3. **Réplica exacta de la base real** (7 usuarios, 28 platos, 20 pedidos, columnas
   y tipos idénticos, nombres en minúscula). Se recuperaron las 9 fotos de la
   columna alternativa, los acentos y las ñ se conservaron, y la aplicación
   corriendo sobre esos datos mostró el catálogo, el aislamiento entre locales y
   las liquidaciones correctamente en un navegador real.

---

## Qué queda pendiente

### Lo que bloquea: la migración de los datos

**Estado: sin ejecutar.** El procedimiento completo está al principio de este
documento, en [TAREA PENDIENTE](#️-tarea-pendiente--migrar-los-datos-de-mysql-a-postgresql).
No es un problema de código: la migración tiene que correrse donde viven las dos
bases, y quedó trabada en la configuración local, con *"la autenticación password
falló para el usuario postgres"*.

Por eso existen dos ayudas:

- `npm run db:check` muestra qué configuración está leyendo la aplicación (sin
  imprimir la contraseña, solo su longitud), intenta conectarse y traduce el
  fallo a una causa concreta, identificada por el código de error de PostgreSQL
  y no por el texto del mensaje, que cambia según el idioma del sistema.
- `config/config.js` corta el arranque con un mensaje explícito si no hay `.env`
  ni variables de entorno de la base, o si `DB_PASSWORD` / `JWT_SECRET` siguen
  teniendo el texto de ejemplo. Vive en `config.js` porque es el punto por el que
  pasan tanto la aplicación como `sequelize-cli`.

**El primer paso de quien retome esto es correr `npm run db:check` y no avanzar
hasta que diga `✅ Conexión establecida correctamente`.**

### Alternativa si los datos dejan de importar

`npm run db:setup` crea el esquema y carga la demo completa (siete locales, 45
platos con foto, seis semanas de pedidos, consultas y solicitudes de alta). Se
saltea la migración por completo.

### Del repositorio y el equipo

- **Revisar y mergear los PRs #1 a #9 en orden**, con *Create a merge commit*.
- **Proteger `main` y `develop`** exigiendo el CI en verde, y poner `develop` como
  rama por defecto. Necesita permisos de administrador del repositorio.
- A partir de ahora, los cambios nuevos salen de `develop` y vuelven a `develop`
  por pull request; `main` solo recibe versiones listas. Ver
  [CONTRIBUTING.md](CONTRIBUTING.md).

### Cosas menores que quedaron afuera

- **Sin pruebas de frontend.** Solo ESLint, build y pruebas a mano en el navegador.
- **`categoria` sigue en la base real** pero el modelo se eliminó: las categorías
  son una lista fija que sirve `GET /platos/categorias`.
- **Los contadores del límite de intentos viven en memoria.** Se reinician con el
  servidor y no se comparten entre varias instancias.
- **Imágenes de categoría de 96×96 px** (pizza, hamburguesa, postre y sushi): se
  ven pixeladas en la ficha. Se decidió dejarlas así por ahora.

---

## Decisiones de arquitectura

Cosas que parecen raras hasta que se sabe por qué están. El detalle de cada una
está en el [README](README.md#decisiones-de-diseño).

**El estado vive en la línea del pedido, no en el pedido.** Un carrito puede
mezclar locales, así que el aislamiento no puede vivir en la cabecera. Cada fila
de `PedidoItems` tiene su `vendedorId` y su `estado`; el estado del pedido se
deriva de todas sus líneas. Las comisiones se calculan sobre las líneas
efectivamente despachadas.

**Los importes los decide el servidor.** Al confirmar un pedido el cliente envía
únicamente `id` y `cantidad`. El precio y el total se leen de la base dentro de
la transacción, así un precio manipulado desde el navegador no tiene efecto. Hay
una prueba que lo verifica.

**Las líneas se bloquean en orden ascendente de id.** La creación de un pedido
corre en una transacción con `SELECT ... FOR UPDATE` sobre cada plato. El orden
fijo evita que dos compras simultáneas se interbloqueen. Hay una prueba de
concurrencia sobre el último plato disponible.

**`PedidoItem` guarda `nombrePlato` y `precioUnitario`.** Es una foto del momento
de la compra: si el vendedor cambia el precio o borra el plato, el historial y
las liquidaciones siguen siendo correctos. Por eso `platoId` admite `NULL` con
`ON DELETE SET NULL`.

**Enviado y Rechazado son finales, y rechazar repone el stock.** Una línea solo
pasa de `Pendiente` a uno de los dos. Antes de cambiarla se bloquea el pedido, así
dos locales que despachan a la vez no calculan el estado general sobre datos
viejos.

**El rol se lee de la base en cada request.** El token guarda el rol del momento
del login; si el administrador lo cambia o desactiva la cuenta, el token deja de
servir enseguida en lugar de valer hasta que vence.

**Las cuentas se desactivan, no se borran.** Borrar un usuario arrastraba sus
pedidos y reescribía las liquidaciones. La regla de quién puede vender vive en un
único lugar: el scope `habilitadoParaVender` del modelo `Usuario`.

**Los datos inválidos son un 400, no un 500.** Los ids de la URL, los largos y los
tipos se validan antes de llegar a la base, y `utils/errores.js` traduce lo que
igual llegue.

**`app.js` y `index.js` están separados.** Las pruebas levantan la misma
aplicación que producción, con CORS, límites y manejo de errores incluidos.

**El esquema lo administran las migraciones, no `sync()`.** `index.js` solo hace
`authenticate()`. Así el estado de la base queda versionado y es reproducible.

**Las categorías las sirve el backend.** Estaban escritas a mano en tres archivos
del frontend y se habían desincronizado entre sí (a una le faltaba "Parrilla").
Ahora salen de `config/categorias.js` vía `GET /platos/categorias`.

---

## Mapa del código

```
FoodieByte/
├── .github/                       CI (GitHub Actions) y plantilla de pull request
├── CONTRIBUTING.md                Ramas, commits y pull requests
├── client/                        React 19 + Vite
│   └── src/
│       ├── api/client.js          Axios: URL base, token y sesión vencida
│       ├── utils/                 Imágenes, formato de precios y límites de formularios
│       ├── state/                 Context de sesión y carrito
│       ├── estilos/               CSS con variables de diseño (colores, radios, sombras)
│       └── components/panel/      Panel de gestión del local y del administrador
│
└── server/                        Node + Express + Sequelize
    ├── app.js                     Aplicación Express (la usan index.js y las pruebas)
    ├── index.js                   Arranque: conecta la base y escucha
    ├── config/
    │   ├── config.js              Conexión + validación del entorno
    │   ├── seguridad.js           JWT, roles, comisión y límite de intentos
    │   ├── limites.js             Largos máximos, stock máximo e id máximo
    │   └── categorias.js          Lista única de categorías
    ├── middleware/
    │   ├── auth.js                Único jwt.verify; rol y estado leídos de la base
    │   ├── validarId.js           Ids de la URL
    │   └── limitarIntentos.js     Fuerza bruta en login y registro
    ├── migrations/                6 migraciones, esquema versionado
    ├── models/                    Usuario · Plato · Pedido · PedidoItem · Pregunta
    ├── routes/                    usuarios · platos · pedidos · admin
    ├── utils/
    │   ├── errores.js             Errores de datos de la base → 400 / 409
    │   └── imagenes.js            Validación y borrado de las imágenes subidas
    ├── scripts/
    │   ├── migrar-mysql-a-postgres.js
    │   └── verificar-conexion.js
    ├── seeders/                   Demo: cuentas, platos con foto, pedidos y consultas
    │   ├── datos/demo.js          Todo el contenido de la demo, en un solo archivo
    │   └── fotos/                 Fotos de los platos (Unsplash, ver CREDITOS.md)
    └── pruebas/pruebas-api.js     73 pruebas de integración
```

Los endpoints y los códigos de error están listados en el [README](README.md#api).

---

## Cómo verificar que todo sigue bien

Con PostgreSQL corriendo y el `.env` configurado:

```bash
cd server && npm run db:check         # la conexión responde
cd server && npm run db:test:create   # solo la primera vez
cd server && npm test                 # todas en verde
cd client && npm run lint             # 0 errores
cd client && npm run build            # compila
```

Las pruebas corren sobre `foodiebyte_test`, nunca sobre la base de desarrollo, y
cortan antes de crear un solo dato si la configuración apunta a otra base. Crean
y borran sus propios datos y no dejan imágenes en `uploads/platos`. El CI de
GitHub corre lo mismo en cada pull request.

Si se toca la lógica de pedidos, comisiones o permisos, **`npm test` es la red de
seguridad**: varias de esas pruebas existen porque el bug que verifican estuvo
presente en el código.

---

## Trampas conocidas

**Los nombres con mayúscula en PostgreSQL necesitan comillas dobles.**
`SELECT * FROM "Usuarios";` funciona, `SELECT * FROM Usuarios;` no. La tabla
`platos` está en minúscula y no las necesita.

**`information_schema` devuelve columnas con un tipo propio** (`sql_identifier`)
que el driver de PostgreSQL no mapea a propiedades del objeto: las consultas
devuelven filas sin nombre. Hay que castear a `text` o usar `pg_tables`.
`scripts/verificar-conexion.js` tiene el caso resuelto.

**El `.env` no admite comillas ni espacios sobrantes.** `DB_PASSWORD="clave"`
hace que la contraseña incluya las comillas. Y un `#` inicia un comentario, así
que una contraseña que lo contenga **sí** hay que encomillarla.

**En Windows el Bloc de notas guarda los archivos nuevos con `.txt`.** Para
crear el `.env`: `copy .env.example .env` y después `notepad .env`, que al abrir
un archivo existente conserva el nombre.

**Después de un `pull` con migraciones o dependencias nuevas**, correr
`npm run db:migrate` y `npm install` en `server/`. La base de pruebas la migra
sola `npm test`.

**Cambiar el rol de alguien cierra su sesión.** Es intencional: el servidor
compara el rol del token con el de la base. Al aprobar a un vendedor, tiene que
volver a iniciar sesión para ver su panel.

**Desactivar un local saca sus platos del catálogo.** No se borran: vuelven al
reactivarlo. Si un plato "desapareció", revisar que su local esté activo y siga
teniendo rol de vendedor.

**Detrás de un proxy hay que configurar `trust proxy`.** El límite de intentos
agrupa por IP. Si la API se publica detrás de un proxy o balanceador (Render,
Railway, Nginx) sin `app.set('trust proxy', 1)`, todos los usuarios comparten la
IP del proxy: diez fallos de cualquiera bloquean ese correo para todos, y el tope
de registros pasa a ser global.

**Fin de línea.** `.gitattributes` fija LF para los archivos de texto. Un diff
donde "cambia todo el archivo" sin cambios reales es de fin de línea: no
commitearlo.

**Los seeders necesitan `ADMIN_PASSWORD` en el `.env`** y cortan si falta. En el
código no hay contraseñas: las de la demo (`admin1234` y `demo1234`) están en
`.env.example`, que es solo una plantilla para correrlo en local.

**Los seeders se pueden correr más de una vez** sin duplicar nada, pero no
actualizan lo que ya existe. Si cambiás `seeders/datos/demo.js`, recargá todo
con `npm run db:reset`.

---

## Ideas para continuar

Ninguna es necesaria para que el proyecto funcione; son las que más valor
agregarían, en orden de relación esfuerzo/beneficio.

1. **Pruebas de frontend.** Es el hueco más grande. Vitest para el carrito y el
   contexto, o Playwright para los tres roles.
2. **Primera versión.** Con los PRs mergeados, abrir `release/1.0.0` desde
   `develop` y llevarla a `main` con su tag.
3. **Paginación del catálogo.** Hoy `GET /platos` devuelve todo. Con 28 platos no
   molesta, con 500 sí.
4. **Preparación para deploy.** Soporte para `DATABASE_URL`, `trust proxy` y un
   almacenamiento compartido (por ejemplo Redis) para el límite de intentos.
5. **Valoraciones de verdad**, si se quieren recuperar. Se quitaron por ser un
   mock; implementarlas es una tabla, dos endpoints y el promedio en la ficha.
6. **Imágenes de categoría en mejor resolución** para pizza, hamburguesa, postre
   y sushi.
