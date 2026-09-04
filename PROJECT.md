# FoodieByte · Estado del proyecto y traspaso

Documento de traspaso para quien retome el desarrollo.
Última actualización: commit `15dbb12`, rama `main`.

Para instalar y correr el proyecto, el documento de referencia es
[`README.md`](README.md). Este archivo cuenta **en qué estado está**, **qué se
cambió y por qué**, y **qué queda pendiente**.

---

## Resumen en 30 segundos

FoodieByte es una plataforma de gestión gastronómica (proyecto final de carrera)
con tres roles: foodie, vendedor y administrador. Stack: React 19 + Vite en el
frontend, Node/Express + Sequelize en el backend, **PostgreSQL** en la base.

El código está terminado y verificado. **Lo que falta es un paso operativo que
solo puede hacer la dueña del proyecto en su máquina**: migrar los datos de su
MySQL local a PostgreSQL. Ver [Qué queda pendiente](#qué-queda-pendiente).

| | Estado |
|---|---|
| Código en `main` | ✅ Todo pusheado y mergeado, árbol limpio |
| Pruebas de integración | ✅ 36/36 contra PostgreSQL real |
| ESLint del frontend | ✅ 0 errores |
| Build de producción | ✅ Compila |
| Migración de datos de la dueña | ⚠️ **Pendiente**, bloqueada por configuración local |

---

## Índice

- [De dónde viene el proyecto](#de-dónde-viene-el-proyecto)
- [Qué se corrigió](#qué-se-corrigió)
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

## Qué se corrigió

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
se **deriva** (queda `Enviado` cuando todos despacharon, `Rechazado` si todos
rechazaron, `Pendiente` mientras falte alguno).

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

### El script de migración

`server/scripts/migrar-mysql-a-postgres.js`, expuesto como `npm run migrar:mysql`.
Copia MySQL → PostgreSQL conservando los IDs originales, para no invalidar
relaciones ni las rutas de las imágenes.

Banderas: `--dry-run` (simula sin escribir), `--force` (vacía el destino antes),
`--reparar-codificacion` (arregla acentos rotos).

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

### Lo único que bloquea: la migración en la máquina de la dueña

**Estado: sin ejecutar.** No es un problema de código. La migración tiene que
correrse donde viven las dos bases, y quedó trabada en la configuración local:
`sequelize` fallaba con *"la autenticación password falló para el usuario
postgres"*.

Ese mensaje es ambiguo a propósito de PostgreSQL: aparece igual si la contraseña
está mal, si el `.env` no existe (el código cae en el usuario `postgres` por
defecto), o si el archivo quedó como `.env.txt`, que es lo que hace el Bloc de
notas de Windows al guardar un archivo nuevo.

Por eso se agregaron dos cosas:

- `npm run db:check` muestra qué configuración está leyendo la aplicación (sin
  imprimir la contraseña, solo su longitud), intenta conectarse y traduce el
  fallo a una causa concreta, identificada por el código de error de PostgreSQL
  y no por el texto del mensaje, que cambia según el idioma del sistema.
- `config/config.js` corta el arranque con un mensaje explícito si falta el
  `.env` o si `DB_PASSWORD` / `JWT_SECRET` siguen teniendo el texto de ejemplo.
  Vive en `config.js` y no en el arranque del servidor porque es el punto por el
  que pasan tanto la aplicación como `sequelize-cli`: así `db:create`,
  `db:migrate`, `db:seed` y `npm start` dan todos el mismo diagnóstico.

**El primer paso de quien retome esto es correr `npm run db:check` y no avanzar
hasta que diga `✅ Conexión establecida correctamente`.** Todos los comandos
siguientes fallan con el mismo error hasta que la conexión funcione.

Después, la secuencia está en el
[README](README.md#migrar-datos-desde-mysql): `db:create`, `db:migrate`,
`--dry-run`, y recién ahí `migrar:mysql`.

### Alternativa si los datos dejan de importar

Si en algún momento se decide que los datos de prueba no valen la pena, todo se
simplifica: `npm run db:setup` crea el esquema y carga datos de ejemplo (dos
locales con diez platos, pensados para poder demostrar el aislamiento entre
vendedores). Se saltea la migración por completo.

### Cosas menores que quedaron afuera

- **Sin CI.** No hay GitHub Actions. Las pruebas se corren a mano con `npm test`
  y necesitan una base PostgreSQL levantada.
- **Sin pruebas de frontend.** La verificación del frontend se hizo con scripts
  de Playwright hechos para el momento, que no quedaron en el repositorio. Solo
  hay ESLint.
- **`categoria` sigue en la base real** pero el modelo se eliminó: las categorías
  son una lista fija que sirve `GET /platos/categorias`.
- **Las imágenes se guardan en disco**, en `server/uploads/platos/`. No hay
  limpieza de archivos huérfanos cuando se borra un plato.

---

## Decisiones de arquitectura

Cosas que parecen raras hasta que se sabe por qué están.

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

**El esquema lo administran las migraciones, no `sync()`.** `index.js` solo hace
`authenticate()`. Así el estado de la base queda versionado y es reproducible.

**Las categorías las sirve el backend.** Estaban escritas a mano en tres archivos
del frontend y se habían desincronizado entre sí (a una le faltaba "Parrilla").
Ahora salen de `config/categorias.js` vía `GET /platos/categorias`.

---

## Mapa del código

```
FoodieByte/
├── client/                        React 19 + Vite
│   └── src/
│       ├── api/client.js          Axios: URL base, token y sesión vencida
│       ├── utils/imagenes.js      Resolución de la imagen de cada plato
│       ├── state/                 Context de sesión y carrito
│       └── components/admin/      Piezas del panel de gestión
│
└── server/                        Node + Express + Sequelize
    ├── config/
    │   ├── config.js              Conexión + validación del .env
    │   ├── seguridad.js           JWT, roles y porcentaje de comisión
    │   └── categorias.js          Lista única de categorías
    ├── middleware/auth.js         Único jwt.verify del backend
    ├── migrations/                5 migraciones, esquema versionado
    ├── models/                    Usuario · Plato · Pedido · PedidoItem · Pregunta
    ├── routes/                    usuarios(4) · platos(10) · pedidos(5) · admin(9)
    ├── scripts/
    │   ├── migrar-mysql-a-postgres.js
    │   └── verificar-conexion.js
    ├── seeders/                   Admin + 2 locales de demo + 10 platos
    └── pruebas/pruebas-api.js     36 pruebas de integración
```

Los 28 endpoints están listados en el [README](README.md#api).

---

## Cómo verificar que todo sigue bien

Con PostgreSQL corriendo y el `.env` configurado:

```bash
cd server && npm run db:check   # la conexión responde
cd server && npm test           # 36/36
cd client && npm run lint       # 0 errores
cd client && npm run build      # compila
```

Las pruebas crean y borran sus propios datos, pero conviene correrlas sobre una
base de desarrollo. Cubren autenticación, stock transaccional con un caso de
concurrencia real, aislamiento entre locales, cálculo de comisiones y preguntas.

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

**`git pull` borra `server/node_modules`** en los clones viejos, porque esos
archivos estaban versionados y dejaron de estarlo. Hay que correr `npm install`
después. No es un error.

**Los seeders necesitan `ADMIN_PASSWORD` en el `.env`** y cortan si falta. Es
deliberado: no hay contraseñas por defecto en el código.

---

## Ideas para continuar

Ninguna es necesaria para que el proyecto funcione; son las que más valor
agregarían, en orden de relación esfuerzo/beneficio.

1. **Pruebas de frontend.** Es el hueco más grande. Vitest para el carrito y el
   contexto, o Playwright para los tres roles.
2. **CI en GitHub Actions.** Un workflow con un servicio PostgreSQL que corra
   `npm test` y `npm run lint` en cada push. El proyecto ya está preparado: las
   pruebas no necesitan nada más que la base.
3. **Paginación del catálogo.** Hoy `GET /platos` devuelve todo. Con 28 platos no
   molesta, con 500 sí.
4. **Limpieza de imágenes huérfanas** al borrar un plato.
5. **Valoraciones de verdad**, si se quieren recuperar. Se quitaron por ser un
   mock; implementarlas es una tabla, dos endpoints y el promedio en la ficha.
