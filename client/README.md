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
| `api/client.js` | Instancia de Axios: URL base, token y manejo de sesión vencida |
| `state/` | Contexto global de sesión, carrito y avisos |
| `components/` | Pantallas y piezas de la interfaz |
| `components/admin/` | Piezas del panel de gestión |
| `utils/` | Funciones auxiliares (resolución de la imagen de cada plato) |
| `assets/` | Imágenes importadas como módulos para que entren al build |
