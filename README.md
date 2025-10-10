# TGS Backend - The Garrison System

Este repositorio contiene el backend del sistema **The Garrison System**, desarrollado en **Node.js** con **TypeScript** y utilizando **MikroORM** para la gestión de la base de datos MySQL.

Repo general (repositorio padre):
<https://github.com/Lau-prog/TP-Desarrollo-de-Software>

## Estructura del Repositorio

La estructura del proyecto está organizada de la siguiente manera para mantener una separación clara de responsabilidades y facilitar el mantenimiento.

```structure
TGS-Backend/
├───.gitignore
├───package.json
├───pnpm-lock.yaml
├───pnpm-workspace.yaml
├───README.md
├───tsconfig.json
├───docs/
└───src/
    ├───app.ts
    ├───server.ts
    ├───config/
    ├───modules/
    └───shared/
```

### `src`

El directorio principal que contiene todo el código fuente de la aplicación.

- **`app.ts`**: Punto de entrada de la aplicación Express, donde se configuran los middlewares y las rutas principales.
- **`server.ts`**: Script que inicia el servidor HTTP y lo pone a escuchar en el puerto configurado.

```structure
src/
├───config/
│   └───env.ts
├───modules/
│   ├───admin/
│   ├───auth/
│   └───...
└───shared/
    ├───db/
    ├───middleware/
    └───utils/
```

- **`config/`**: Contiene la configuración de la aplicación, como las variables de entorno.

- **`modules/`**: Es el corazón de la aplicación. Cada subdirectorio representa una entidad o módulo de negocio (ej. `client`, `product`, `sale`). Dentro de cada módulo se encuentran:
  - `*.controller.ts`: Maneja la lógica de las peticiones HTTP (request y response).
  - `*.entity.ts`: Define la estructura de la entidad para la base de datos con MikroORM.
  - `*.routes.ts`: Define las rutas (endpoints) específicas del módulo.
  - `*.schema.ts`: Define los esquemas de validación (usando Zod) para los datos de entrada.

- **`shared/`**: Contiene código reutilizable a través de toda la aplicación.
  - `db/`: Configuración de la conexión a la base de datos y del ORM.
  - `middleware/`: Middlewares personalizados (ej. para validación de datos).
  - `utils/`: Funciones de utilidad (ej. logger, manejo de respuestas).
