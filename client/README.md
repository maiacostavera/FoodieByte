# FoodieByte · Frontend

Aplicación React 19 + Vite que consume la API de `server/`.

La instalación, las variables de entorno y el resto de la documentación del
proyecto están en el [README principal](../README.md).

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve el build para verificarlo |
| `npm run lint` | ESLint |

## Estructura de `src/`

| Carpeta | Contenido |
|---|---|
| `App.jsx` | Decide qué pantalla mostrar según la dirección (`#/plato/12`, `#/panel`…) y carga el catálogo |
| `api/client.js` | Instancia de Axios: URL base, token y manejo de sesión vencida |
| `state/` | Contexto global: sesión, carrito, avisos y confirmaciones |
| `components/` | Pantallas (catálogo, ficha, carrito, pedidos, ingreso) y piezas comunes (`Modal`, `Icono`, `Logo`) |
| `components/panel/` | Panel de gestión: resumen con gráfico, comandas, menú, usuarios, liquidaciones y pedidos |
| `components/reactbits/` | Componentes animados copiados de [React Bits](https://reactbits.dev), sin cambios |
| `estilos/` | CSS de toda la aplicación; las variables de diseño están en `base.css` |
| `utils/` | Rutas, formato de precios y fechas, imágenes de los platos y límites de los formularios |
| `assets/` | Imágenes importadas como módulos para que entren al build |

## Cómo están hechos los estilos

Los componentes usan clases CSS (`boton boton--primario`, `tarjeta`, `etiqueta etiqueta--exito`…)
en lugar de estilos en línea: así tienen estados al pasar el mouse y con el foco del teclado,
transiciones y diseño adaptable a celulares. Los colores, radios y sombras son variables
definidas en `estilos/base.css`: para cambiar el aspecto de la aplicación se tocan ahí.

Quedan estilos en línea solo donde el valor se calcula al momento: el ancho de una barra del
ranking, la posición del cartel del gráfico o una imagen de fondo importada.

## Cómo se navega

No hay librería de rutas: `utils/rutas.js` lee el hash de la dirección (`#/plato/12`) y
`App.jsx` muestra la pantalla que corresponde. Para ir a otra pantalla se usa
`navegar(RUTAS.pedidos)`. El botón atrás del navegador funciona porque cada pantalla es una
dirección distinta.

## Animaciones (React Bits)

Cinco componentes de [React Bits](https://reactbits.dev) están copiados tal cual en
`components/reactbits/`, tomados de la versión JS + CSS del repositorio
(`DavidHDev/react-bits`, commit `fefc5b0`). Usan una sola dependencia, `motion`.

| Componente | Dónde | Qué hace |
|---|---|---|
| `RotatingText` | Título de la portada | Rota la comida: "La mejor *pizza* / *sushi*… de tu barrio" |
| `CountUp` | Cifras de la portada y del panel | Cuentan hasta su valor; en la portada, como un odómetro |
| `Magnet` | Botón "Ver el menú" | Sigue un poco al cursor cuando se le acerca |
| `SpotlightCard` | Tarjetas del catálogo | Brillo rojizo que sigue al cursor |
| `ClickSpark` | Botón "+" de cada plato | Chispas en los colores de la marca al agregar |

Cosas que conviene saber antes de tocarlos:

- **No se editan los archivos de `reactbits/`**: todo se ajusta con sus props y con
  CSS en `estilos/`, así se pueden reemplazar por una versión nueva. ESLint tiene una
  excepción solo para esa carpeta (`eslint.config.js` explica por qué).
- **Respetan "reducir movimiento"** del sistema: no animan, y el título queda fijo en
  "comida" (`Banner.jsx`).
- **El título no cambia de alto al rotar**: la palabra va en su propio renglón (en
  celulares, sola), así el largo de "hamburguesa" no mueve el resto de la página.
- **`SpotlightCard` lleva `proximity={0}`**: con el valor de fábrica, cada movimiento del
  mouse despierta a las 45 tarjetas y cruzar la grilla hace unas 14 veces más trabajo.
- **`CountUp` usa punto decimal**: los importes con centavos se muestran fijos, sin
  animación (`ResumenVentas.jsx`).
- **Para los lectores de pantalla** el texto animado está oculto y cada componente deja
  el valor final legible. Las pruebas de Playwright verifican eso (`toHaveAccessibleName`,
  `toMatchAriaSnapshot`) en lugar del texto visible.
- La licencia de React Bits (MIT + Commons Clause) permite usarlos dentro de la
  aplicación, no revenderlos sueltos. Está en `components/reactbits/LICENSE.md`.
