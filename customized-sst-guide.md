# Guía de Uso del CLI `customized-sst`

Esta guía detalla los comandos disponibles en `customized-sst` para la inicialización de nuevos proyectos serverless monorepo de SST v3 (Ion) y la generación automatizada de entidades utilizando ElectroDB y DynamoDB.

---

## 🛠️ Instalación

Puedes instalar este CLI globalmente de forma local (si clonaste este repo) o apuntando directamente a tu repositorio de GitHub:

### Instalación desde tu repositorio de GitHub (Recomendado)
```bash
# Limpiar instalaciones anteriores
npm rm -g customized-sst

# Instalar desde tu GitHub
npm install -g git+ssh://git@github.com-personal:Angelagex/customized-sst.git
```

### Instalación local para desarrollo
Dentro de la carpeta del proyecto clonado `customized-sst`, ejecuta:
```bash
npm link
```

---

## 🚀 Comandos del CLI

### 1. `customized-sst init <project-name>`
Este comando sirve para **inicializar un nuevo proyecto monorepo** basado en este template personalizado.

#### ¿Cómo se ejecuta?
```bash
customized-sst init mi-nueva-app
```

#### ¿Qué hace por debajo?
1. **Scaffolding Inteligente**: Crea una carpeta con el nombre proporcionado (`mi-nueva-app`) y copia recursivamente toda la estructura del monorepo (`infra`, `packages`, `sst.config.ts`, etc.).
2. **Exclusiones**: Omite automáticamente carpetas administrativas locales como `.git`, `node_modules`, `.sst` y la carpeta `bin/` del CLI.
3. **Personalización del Proyecto**:
   * Reemplaza automáticamente todos los nombres genéricos (`@monorepo-template`, `monorepo-template`) en los archivos del proyecto (`package.json`, `sst.config.ts`, imports en `packages/`, etc.) por el nombre de tu nuevo proyecto (`mi-nueva-app`, `@mi-nueva-app/core`, etc.).
   * Remueve las propiedades de empaquetado del CLI (`bin`, `files`, dependencias del CLI como `commander`) para dejar un monorepo limpio y optimizado para desarrollo.
4. **Instalación de Dependencias**: Elimina el `package-lock.json` genérico copiado y ejecuta `npm install` automáticamente en el proyecto destino para generar dependencias y tipos limpios.
5. **Control de Versiones**: Inicializa un repositorio Git local (`git init`) y realiza el primer commit automático.

---

### 2. `customized-sst generate <entity-name>`
*(Atajo alternativo: `customized-sst g <entity-name>`)*

Este comando sirve para **generar de forma automatizada una nueva entidad de datos** y toda su infraestructura CRUD asociada dentro de tu monorepo.

#### ¿Cómo se ejecuta?
*Debes ejecutar este comando desde la raíz del proyecto generado.*
```bash
customized-sst generate User
```

#### ¿Qué archivos crea en tu proyecto?

##### En el paquete Core (`packages/core/src/user/`):
* **`entity.ts`**: Define la entidad de ElectroDB.
  * Vinculada a la tabla DynamoDB compartida (`Resource.Database.name`).
  * Inyecta por defecto los **atributos base** (`createdAt`, `updatedAt`, `deletedAt`) definidos en `packages/core/src/entities/base.ts`.
  * Define el índice primario estándar (`pk`, `sk`) utilizando el `id` de la entidad.
* **`repository.ts`**: Implementa la lógica de operaciones CRUD del repositorio:
  * `create(data)`: Crea una nueva entidad.
  * `get(id)`: Obtiene la entidad por ID (retorna `null` si fue borrada lógicamente).
  * `update(id, data)`: Actualiza propiedades de la entidad.
  * `delete(id)`: **Soft Delete (Borrado lógico)**. Establece un timestamp numérico en `deletedAt` en lugar de borrar el ítem de DynamoDB.
  * `list(limit, cursor)`: Lista los ítems utilizando **Paginación por Cursores** nativa de ElectroDB y excluye automáticamente los eliminados con la cláusula `.where(({ deletedAt }, { notExists }) => notExists(deletedAt))`.
* **`index.ts`**: Expone las exportaciones para que puedas importar el repositorio en otros paquetes usando la ruta limpia `@mi-nueva-app/core/user`.

##### En el paquete Functions (`packages/functions/src/user/`):
Crea controladores Lambda individuales para cada una de las rutas de tu API:
* **`create.ts`**: Lambda para procesar solicitudes POST.
* **`get.ts`**: Lambda para procesar solicitudes GET por ID (`/users/{id}`).
* **`update.ts`**: Lambda para procesar solicitudes PUT por ID.
* **`delete.ts`**: Lambda para procesar solicitudes DELETE por ID.
* **`list.ts`**: Lambda para procesar solicitudes de listado con paginación (`limit` y `cursor` en query parameters).

##### En la Infraestructura (`infra/api.ts`):
* **Registro de Rutas**: Lee tu archivo de infraestructura `infra/api.ts` y añade de forma automática y segura (evitando duplicados si corres el comando dos veces) los enrutamientos al recurso `sst.aws.ApiGatewayV2`:
  ```typescript
  myApi.route("POST /users", "packages/functions/src/user/create.handler");
  myApi.route("GET /users/{id}", "packages/functions/src/user/get.handler");
  myApi.route("PUT /users/{id}", "packages/functions/src/user/update.handler");
  myApi.route("DELETE /users/{id}", "packages/functions/src/user/delete.handler");
  myApi.route("GET /users", "packages/functions/src/user/list.handler");
  ```

---

## 💡 Tips de Desarrollo

### Advertencia sobre Tipos en TypeScript
Al inicializar un proyecto o generar una entidad por primera vez, verás advertencias en tu editor de código sobre que `Resource.Database` o `Resource.MyBucket` no existen. 

**Esto es completamente normal.** SST v3 genera estos tipos dinámicamente en el directorio local `.sst/platform/config.d.ts`. Para solucionarlo, solo debes ejecutar por primera vez tu entorno local:
```bash
# Levanta SST Ion localmente y genera los archivos de tipos de TS
npx sst dev
```
Una vez iniciado el servidor de desarrollo, los errores de TypeScript desaparecerán por completo.
