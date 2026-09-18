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
