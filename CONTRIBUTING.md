# Cómo trabajamos en FoodieByte

Guía corta para que las dos personas del equipo trabajen de la misma forma. Si
algo de esto cambia, se actualiza acá en el mismo pull request.

## Antes de empezar

- **Node.js 22** (la versión recomendada está en `.nvmrc`; sirve cualquier 20.19+ o 22.12+).
- **PostgreSQL 14 o superior** corriendo en tu máquina.
- La instalación completa está en el [README](README.md#puesta-en-marcha).

## Ramas (git-flow)

| Rama | Para qué | Sale de | Vuelve a |
|---|---|---|---|
| `main` | Lo que está listo para entregar o mostrar | — | — |
| `develop` | Integración del trabajo terminado | `main` | `main`, a través de una `release/` |
| `feature/<nombre>` | Funcionalidades nuevas | `develop` | `develop` |
| `bugfix/<nombre>` | Correcciones de lo que está en `develop` | `develop` | `develop` |
| `release/<versión>` | Preparar una entrega (solo ajustes finales) | `develop` | `main` y `develop` |
| `hotfix/<nombre>` | Arreglo urgente de algo que ya está en `main` | `main` | `main` y `develop` |

Nunca se commitea directo en `main` ni en `develop`: todo entra por pull request.

Con git-flow (viene incluido en Git para Windows), la primera vez en cada clon:

```bash
git config gitflow.branch.master main
git config gitflow.branch.develop develop
git flow init -d
```

Y para cada rama nueva:

```bash
git flow feature start nombre-corto     # crea feature/nombre-corto desde develop
git push -u origin feature/nombre-corto
```

Sin git-flow es exactamente lo mismo a mano:

```bash
git switch develop && git pull
git switch -c feature/nombre-corto
```

## Commits

Mensajes en español, con el formato que ya usa el historial:

```
tipo: qué cambia, en minúscula y sin punto final

Por qué hacía falta, si no es obvio. El diff ya muestra el cómo.
```

| Tipo | Cuándo |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `docs` | Solo documentación |
| `refactor` | Cambio de código que no cambia el comportamiento |
| `test` | Pruebas nuevas o corregidas |
| `chore` | Dependencias, configuración y archivos del repositorio |

Un commit por cambio lógico: si el mensaje necesita un "y además", probablemente son dos.

## Pull requests

1. Antes de abrirlo, en tu máquina:

   ```bash
   cd server && npm test
   cd client && npm run lint && npm run build
   npm run test:e2e        # en la raíz, si el cambio toca la interfaz o un flujo
   ```

2. La base del PR es `develop` (o `main`, solo para `hotfix/` y `release/`).
3. Completá la plantilla: qué cambia, por qué y cómo lo verificaste.
4. El CI de GitHub corre las mismas verificaciones y tiene que quedar en verde.
5. Lo revisa la otra persona. Se mergea con **Create a merge commit** (sin squash) para que el historial de git-flow siga siendo legible.
6. Después de mergear, se puede borrar la rama.

Si una rama depende de otra que todavía no se mergeó, se crea encima de esa y en la descripción del PR se aclara en qué orden mergearlas.

## Base de datos

- El esquema solo cambia con **migraciones nuevas** en `server/migrations/`. Nunca se edita una migración que ya está en `develop`: la otra persona ya la corrió.
- Para instalar desde cero (dependencias, `.env`, bases y datos de la demo) alcanza con `npm run setup` en la raíz. Se puede volver a correr: no pisa nada.
- Después de hacer `pull` de algo con migraciones nuevas: `npm run db:migrate` en `server/` (o `npm run setup`, que también las aplica).
- Las pruebas usan una base aparte (`DB_NAME_TEST`). La crea `npm run setup` (a mano: `npm run db:test:create`), y `npm test` le aplica solo las migraciones pendientes.

## Fin de línea

`.gitattributes` fija LF para todos los archivos de texto. Si aparece un diff en el que "cambió todo el archivo" sin cambios reales, es un problema de fin de línea: avisá antes de commitearlo.
