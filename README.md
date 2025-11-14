# TGS Backend - The Garrison System

Este repositorio contiene el backend del sistema **The Garrison System**, desarrollado en **Node.js** con **TypeScript** y utilizando **MikroORM** para la gestión de la base de datos PostgreSQL.

Repo general (repositorio padre):
<https://github.com/Lau-prog/GarrSYS>

---

## ⚡ Inicio Rápido

### Con Infraestructura Docker (Recomendado)

Si estás usando el repositorio principal, la forma más fácil es levantar PostgreSQL y Redis con Docker:

```bash
# Desde el repositorio principal (TP-Desarrollo-de-Software)
cd infra
docker compose up -d

# Luego, en este repositorio
pnpm install
cp .env.example .env.development
pnpm start:dev
```

### Sin Docker

Si prefieres instalar PostgreSQL y Redis localmente, sigue las instrucciones en la sección [Configuración del Entorno](#configuración-del-entorno) o consulta la documentación completa en [docs/01-QUICK-START.md](docs/01-QUICK-START.md).

---

## 📚 Documentación Completa

Para una documentación académica completa y detallada, consulta la carpeta [docs/](docs/):

- **[Índice de Documentación](docs/INDEX.md)** - Punto de entrada a toda la documentación
- **[Inicio Rápido](docs/01-QUICK-START.md)** - Guía paso a paso para iniciar la aplicación
- **[Arquitectura](docs/02-ARCHITECTURE.md)** - Estructura del proyecto y patrones de diseño
- **[Configuración de Entorno](docs/03-ENVIRONMENT-CONFIG.md)** - Variables de entorno explicadas
- **[Base de Datos](docs/04-DATABASE.md)** - Modelo de datos y entidades
- **[Autenticación](docs/05-AUTHENTICATION.md)** - Sistema de autenticación con JWT
- **[API Endpoints](docs/06-API-ENDPOINTS.md)** - Documentación completa de endpoints
- **[Seguridad](docs/07-SECURITY.md)** - Mejores prácticas de seguridad
- **[Testing & Automatización](docs/TESTING.md)** - Estrategia completa de testing y CI/CD

---

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
  - `middleware/`: Middlewares personalizados (ej. para validación de datos, seguridad, rate limiting).
  - `services/`: Servicios compartidos (Redis, cache, email).
  - `utils/`: Funciones de utilidad (ej. logger, manejo de respuestas).

## Configuración del Entorno

### Variables de Entorno

Crea un archivo `.env.development` en la raíz del proyecto basado en `.env.example`:

```bash
# Copia el archivo de ejemplo
cp .env.example .env.development
```

Luego edita `.env.development` con tus valores. Variables principales:

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tpdesarrollo

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m

# Logging
LOG_LEVEL=info

# Security
ALLOWED_ORIGINS=http://localhost:4200
TRUST_PROXY=false
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true

# Redis (Opcional - Deshabilitado por defecto)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Email Service (SMTP) - Para verificación de emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM=noreply@tgs-system.com

# Frontend URL
FRONTEND_URL=http://localhost:4200
```

**Nota sobre verificación de emails:**

- El servicio de email es opcional
- Si no configuras SMTP, la app funciona normalmente
- Los tokens de verificación se generan pero los emails no se envían
- Para producción, configura SMTP con credenciales reales

### Modo Demo (Para Evaluación/Testing)

Si necesitas ejecutar el sistema **sin verificación obligatoria de email** (útil para evaluaciones académicas o demos rápidas), tienes dos opciones:

#### Opción 1: Usar el script de demo (Recomendado)

```bash
pnpm start:demo
```

Este comando inicia el servidor en modo desarrollo con la verificación de email desactivada.

#### Opción 2: Configurar manualmente en .env

Edita tu archivo `.env.development` y establece:

```env
EMAIL_VERIFICATION_REQUIRED=false
```

Luego ejecuta normalmente:

```bash
pnpm start:dev
```

**Importante:** En producción, `EMAIL_VERIFICATION_REQUIRED` siempre debe estar en `true` para garantizar la seguridad de las cuentas de usuario.

### Redis (Opcional)

**Redis está deshabilitado por defecto**. La aplicación funciona perfectamente sin Redis utilizando un cache en memoria como respaldo.

Si necesitas habilitar Redis (recomendado para producción):

1. Instala y ejecuta Redis en tu máquina
2. Establece `REDIS_ENABLED=true` en tu archivo `.env`
3. Consulta [`docs/REDIS_CONFIGURATION.md`](docs/REDIS_CONFIGURATION.md) para más detalles

**Nota**: Si anteriormente veías errores de conexión a Redis al iniciar el servidor, esto ya está resuelto. El servidor ya no intenta conectarse a Redis cuando está deshabilitado.

---

## 🧪 Testing & Calidad de Código

El proyecto cuenta con una estrategia completa de testing y automatización que garantiza la calidad y confiabilidad del código.

### Ejecutar Tests

```bash
# Todos los tests
pnpm test

# Por tipo
pnpm run test:unit              # Tests unitarios (rápidos)
pnpm run test:integration       # Tests de integración (con DB)
pnpm run test:e2e               # Tests end-to-end (flujos completos)
pnpm run test:performance       # Pruebas de carga con Artillery
pnpm run test:security          # Escaneo de seguridad (Snyk + npm audit)
pnpm run test:regression        # Tests de regresión (API contracts)

# Con cobertura
pnpm run test:coverage

# Modo watch (desarrollo)
pnpm run test:watch
```

### Servicios de Test con Docker

```bash
# Iniciar servicios de test (PostgreSQL, Redis, MailHog)
docker-compose -f docker-compose.test.yml up -d

# Detener servicios
docker-compose -f docker-compose.test.yml down
```

### Cobertura de Código

- **Objetivo Global**: ≥ 80% en branches, functions, lines, statements
- **Módulos Críticos**: ≥ 90% (Auth, User, Security)
- **Reportes**: Disponibles en `coverage/index.html` después de ejecutar tests

### CI/CD

El proyecto incluye un pipeline completo de CI/CD con GitHub Actions que ejecuta:

- ✅ Linting y type checking
- ✅ Tests unitarios (paralelos)
- ✅ Tests de integración (con PostgreSQL)
- ✅ Tests E2E (full stack)
- ✅ Escaneo de seguridad (Snyk + npm audit)
- ✅ Tests de performance (Artillery)
- ✅ Tests de regresión (API snapshots)
- ✅ Reportes de cobertura (Codecov)
- ✅ Notificaciones automáticas

### Documentación Completa

Para más detalles sobre testing, consulta:
- **[Guía de Testing](docs/TESTING.md)** - Documentación completa de estrategia de testing
- **[Tests README](tests/README.md)** - Guía rápida del directorio de tests
- **[Resumen de Implementación](TESTING_IMPLEMENTATION_SUMMARY.md)** - Resumen técnico de la implementación
