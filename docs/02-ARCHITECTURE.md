# Arquitectura del Proyecto - TGS Backend

## Índice
- [Visión General](#visión-general)
- [Estructura de Directorios](#estructura-de-directorios)
- [Patrones de Diseño](#patrones-de-diseño)
- [Flujo de Datos](#flujo-de-datos)
- [Separación de Responsabilidades](#separación-de-responsabilidades)
- [Diagramas de Arquitectura](#diagramas-de-arquitectura)

---

## Visión General

TGS Backend está construido siguiendo una **arquitectura modular en capas**, donde cada componente tiene responsabilidades bien definidas. Esta arquitectura promueve:

- **Mantenibilidad**: Código organizado y fácil de modificar
- **Escalabilidad**: Capacidad de crecer sin refactorización mayor
- **Testabilidad**: Componentes independientes fáciles de probar
- **Reutilización**: Código compartido entre módulos

### Stack Tecnológico Principal

```
┌─────────────────────────────────────────┐
│           TypeScript/Node.js            │
├─────────────────────────────────────────┤
│ Framework:      Express.js              │
│ ORM:            MikroORM                │
│ Validación:     Zod                     │
│ Autenticación:  JWT + Argon2            │
│ Logging:        Pino                    │
│ Base de Datos:  MySQL 8.0               │
│ Cache:          Redis (opcional)        │
└─────────────────────────────────────────┘
```

---

## Estructura de Directorios

### Vista General del Proyecto

```
TGS-Backend/
│
├── src/                          # Código fuente principal
│   ├── app.ts                    # Configuración de Express y middlewares
│   ├── server.ts                 # Punto de entrada del servidor
│   │
│   ├── config/                   # Configuraciones globales
│   │   └── env.ts                # Variables de entorno validadas con Zod
│   │
│   ├── modules/                  # Módulos de negocio (entidades)
│   │   ├── auth/                 # Autenticación y autorización
│   │   ├── admin/                # Gestión de administradores
│   │   ├── client/               # Gestión de clientes
│   │   ├── product/              # Gestión de productos
│   │   ├── sale/                 # Gestión de ventas
│   │   ├── zone/                 # Gestión de zonas
│   │   ├── distributor/          # Gestión de distribuidores
│   │   ├── partner/              # Gestión de socios
│   │   ├── authority/            # Gestión de autoridades
│   │   ├── bribe/                # Gestión de sobornos
│   │   ├── decision/             # Gestión de decisiones
│   │   ├── topic/                # Gestión de temas
│   │   ├── shelbyCouncil/        # Consejo Shelby y revisiones
│   │   └── clandestineAgreement/ # Acuerdos clandestinos
│   │
│   └── shared/                   # Código compartido entre módulos
│       ├── db/                   # Configuración de base de datos
│       ├── middleware/           # Middlewares globales
│       ├── services/             # Servicios compartidos
│       ├── utils/                # Utilidades y helpers
│       ├── errors/               # Clases de error personalizadas
│       ├── routes/               # Rutas compartidas (health, redis)
│       ├── controllers/          # Controladores compartidos
│       ├── schemas/              # Esquemas de validación compartidos
│       ├── base.person.entity.ts # Entidad base para personas
│       └── base.object.entity.ts # Entidad base para objetos
│
├── dist/                         # Código compilado (generado por TypeScript)
├── docs/                         # Documentación del proyecto
├── scripts/                      # Scripts de utilidad
│
├── .env.development              # Variables de entorno (no versionado)
├── .env.production               # Variables de entorno producción
├── .gitignore                    # Archivos ignorados por Git
├── package.json                  # Dependencias y scripts
├── pnpm-lock.yaml                # Lock file de pnpm
├── tsconfig.json                 # Configuración de TypeScript
└── README.md                     # Documentación principal
```

### Anatomía de un Módulo

Cada módulo en `src/modules/` sigue una estructura consistente:

```
module_name/
├── module_name.entity.ts         # Definición de la entidad (modelo de datos)
├── module_name.controller.ts     # Lógica de negocio y controladores
├── module_name.routes.ts         # Definición de rutas HTTP
└── module_name.schema.ts         # Esquemas de validación con Zod
```

#### Ejemplo: Módulo de Cliente

```typescript
// client/
├── client.entity.ts              # Entidad Client con decoradores MikroORM
├── client.controller.ts          # Controladores: findAll, findOne, sanitizeClient, etc.
├── client.routes.ts              # Rutas: GET /api/clients, POST /api/clients/:id, etc.
└── client.schema.ts              # Esquemas de validación para crear/actualizar clientes
```

---

## Patrones de Diseño

### 1. Patrón MVC (Model-View-Controller) Adaptado

Aunque es una API REST (sin vistas tradicionales), seguimos una arquitectura similar:

```
┌──────────────┐
│   REQUEST    │ ← Cliente HTTP
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   ROUTES     │ ← Define endpoints y métodos HTTP
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  MIDDLEWARE  │ ← Autenticación, validación, etc.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ CONTROLLER   │ ← Lógica de negocio
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   ENTITY     │ ← Modelo de datos (ORM)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   DATABASE   │ ← MySQL
└──────────────┘
```

### 2. Patrón Repository (Implementado por MikroORM)

MikroORM actúa como un patrón Repository, abstrayendo el acceso a datos:

```typescript
// En lugar de SQL directo:
const users = await orm.em.find(User, { role: 'ADMIN' });

// MikroORM genera y ejecuta:
// SELECT * FROM user WHERE role = 'ADMIN'
```

**Ventajas:**
- Abstracción de la base de datos
- Métodos de consulta reutilizables
- Facilita testing con mocks

### 3. Middleware Pattern

Los middlewares procesan requests secuencialmente:

```typescript
// Flujo de middleware en app.ts
app.use(cors(secureCors));              // 1. CORS
app.use(securityMiddleware);             // 2. Headers de seguridad
app.use(authRateLimit);                  // 3. Rate limiting
app.use(express.json());                 // 4. Parseo de JSON
app.use(cookieParser());                 // 5. Parseo de cookies
app.use(RequestContext.create);          // 6. Contexto de ORM
```

### 4. Dependency Injection (DI)

Inyección de dependencias mediante imports:

```typescript
// En vez de instanciar servicios en cada archivo:
// ❌ const redis = new RedisService();

// Importamos una instancia singleton:
// ✅ import { redisService } from './shared/services/redis.service.js';
```

### 5. Factory Pattern

Usado para crear objetos complejos:

```typescript
// Ejemplo: Creación de tokens
export const createTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });

  const refreshToken = jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};
```

---

## Flujo de Datos

### Flujo de un Request Típico

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CLIENT REQUEST                                                │
│    POST /api/clients { name: "John Doe", email: "..." }         │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SECURITY MIDDLEWARE                                           │
│    ├─ CORS validation                                           │
│    ├─ Security headers (Helmet)                                 │
│    ├─ Rate limiting                                             │
│    └─ Body size limit check                                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. LOGGING MIDDLEWARE                                            │
│    ├─ Generate request ID (UUID)                                │
│    ├─ Start timer                                               │
│    └─ Log request details                                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. MIKROORM CONTEXT                                              │
│    └─ Create database context for this request                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. ROUTE HANDLER (clientRouter)                                 │
│    └─ Match: POST /api/clients → clientController.add           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. AUTHENTICATION MIDDLEWARE (si requiere autenticación)         │
│    ├─ Validate JWT token                                        │
│    ├─ Extract user info                                         │
│    └─ Attach to req.user                                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. VALIDATION MIDDLEWARE                                         │
│    ├─ Validate request body against Zod schema                  │
│    ├─ Sanitize input                                            │
│    └─ Return 400 if invalid                                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. CONTROLLER LOGIC                                              │
│    ├─ Business logic execution                                  │
│    ├─ Database operations via ORM                               │
│    └─ Prepare response data                                     │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. RESPONSE                                                      │
│    └─ Send JSON response with status code                       │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. LOGGING (on response finish)                                │
│     ├─ Log response status                                      │
│     ├─ Log response time                                        │
│     └─ Log any errors                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Ejemplo Concreto: Crear un Cliente

```typescript
// 1. REQUEST
POST /api/clients
Headers: {
  "Authorization": "Bearer eyJhbGc...",
  "Content-Type": "application/json"
}
Body: {
  "name": "Thomas Shelby",
  "lastname": "Shelby",
  "phone": "+44 121 234 5678",
  "email": "thomas@shelby.com",
  "zoneId": "zone-uuid-123"
}

// 2-4. Middlewares de seguridad, logging, contexto ORM

// 5. ROUTE
// src/modules/client/client.routes.ts
router.post('/', authenticateToken, validateRequest(createClientSchema), add);

// 6. AUTHENTICATION
// Verifica JWT → extrae user_id y role

// 7. VALIDATION
// Valida body contra createClientSchema (Zod)

// 8. CONTROLLER
// src/modules/client/client.controller.ts
const add = async (req: Request, res: Response) => {
  const em = orm.em.fork();
  const { name, lastname, phone, email, zoneId } = req.body;

  // Buscar zona
  const zone = await em.findOne(Zone, { id: zoneId });

  // Crear cliente
  const client = em.create(Client, {
    name,
    lastname,
    phone,
    email,
    zone
  });

  await em.flush();

  res.status(201).json({
    status: 'success',
    data: sanitizeClient(client)
  });
};

// 9. RESPONSE
{
  "status": "success",
  "data": {
    "id": "client-uuid-456",
    "name": "Thomas Shelby",
    "lastname": "Shelby",
    "phone": "+44 121 234 5678",
    "email": "thomas@shelby.com",
    "zone": {
      "id": "zone-uuid-123",
      "name": "Birmingham"
    }
  }
}

// 10. LOGGING
INFO: POST /api/clients - 201 (45ms)
```

---

## Separación de Responsabilidades

### Principio de Responsabilidad Única (SRP)

Cada archivo/clase tiene una única responsabilidad:

| Archivo | Responsabilidad |
|---------|-----------------|
| `*.entity.ts` | Definir estructura de datos y relaciones |
| `*.controller.ts` | Lógica de negocio y operaciones |
| `*.routes.ts` | Definir endpoints HTTP y aplicar middlewares |
| `*.schema.ts` | Validación de entrada de datos |
| `*.middleware.ts` | Procesamiento transversal de requests |

### Capas de la Aplicación

```
┌──────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                      │
│  (Routes, Middlewares, Request/Response handling)    │
│                                                       │
│  Archivos: *.routes.ts, *.middleware.ts              │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              BUSINESS LOGIC LAYER                    │
│  (Controllers, Validation, Business Rules)           │
│                                                       │
│  Archivos: *.controller.ts, *.schema.ts              │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              DATA ACCESS LAYER                       │
│  (ORM, Entities, Database operations)                │
│                                                       │
│  Archivos: *.entity.ts, orm.ts                       │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│              DATABASE LAYER                          │
│  (MySQL, Physical storage)                           │
└──────────────────────────────────────────────────────┘
```

---

## Diagramas de Arquitectura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         TGS BACKEND API                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │   Express.js  │  │   MikroORM    │  │     Pino      │       │
│  │   (HTTP)      │  │   (ORM)       │  │   (Logging)   │       │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘       │
│          │                  │                  │                │
│  ┌───────▼──────────────────▼──────────────────▼───────┐       │
│  │                                                       │       │
│  │              APPLICATION CORE                        │       │
│  │                                                       │       │
│  │  ┌─────────────────────────────────────────────┐    │       │
│  │  │  Auth Module  │  Client Module  │  ...      │    │       │
│  │  └─────────────────────────────────────────────┘    │       │
│  │                                                       │       │
│  │  ┌─────────────────────────────────────────────┐    │       │
│  │  │  Shared Services (Redis, Email, Cache)      │    │       │
│  │  └─────────────────────────────────────────────┘    │       │
│  │                                                       │       │
│  │  ┌─────────────────────────────────────────────┐    │       │
│  │  │  Middleware (Security, Auth, Validation)    │    │       │
│  │  └─────────────────────────────────────────────┘    │       │
│  │                                                       │       │
│  └───────────────────────────────────────────────────┬─┘       │
│                                                        │         │
└────────────────────────────────────────────────────────┼─────────┘
                                                         │
                 ┌───────────────────────────────────────┼─────────┐
                 │                                       │         │
          ┌──────▼──────┐                        ┌──────▼──────┐  │
          │    MySQL    │                        │    Redis    │  │
          │  (Database) │                        │   (Cache)   │  │
          └─────────────┘                        └─────────────┘  │
                                                                   │
                                                  (Opcional)       │
                                                                   │
                                             External Services     │
                                          ┌──────────────────────┐ │
                                          │  SMTP / SendGrid     │ │
                                          │  (Email Service)     │ │
                                          └──────────────────────┘ │
                                                                   │
                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Diagrama de Secuencia: Login de Usuario

```
┌──────┐          ┌──────────┐      ┌─────────────┐      ┌──────────┐
│Client│          │  Routes  │      │ Controller  │      │ Database │
└───┬──┘          └────┬─────┘      └──────┬──────┘      └────┬─────┘
    │                  │                   │                   │
    │ POST /api/auth/login                 │                   │
    │ {email, password}│                   │                   │
    ├─────────────────►│                   │                   │
    │                  │                   │                   │
    │                  │ validateRequest   │                   │
    │                  │ (loginSchema)     │                   │
    │                  ├──────────┐        │                   │
    │                  │          │        │                   │
    │                  │◄─────────┘        │                   │
    │                  │                   │                   │
    │                  │ login(req, res)   │                   │
    │                  ├──────────────────►│                   │
    │                  │                   │                   │
    │                  │                   │ findOne(User)     │
    │                  │                   ├──────────────────►│
    │                  │                   │                   │
    │                  │                   │ User data         │
    │                  │                   │◄──────────────────┤
    │                  │                   │                   │
    │                  │                   │ verify password   │
    │                  │                   │ (Argon2)          │
    │                  │                   ├──────────┐        │
    │                  │                   │          │        │
    │                  │                   │◄─────────┘        │
    │                  │                   │                   │
    │                  │                   │ generate JWT      │
    │                  │                   ├──────────┐        │
    │                  │                   │          │        │
    │                  │                   │◄─────────┘        │
    │                  │                   │                   │
    │                  │                   │ save refresh      │
    │                  │                   │ token             │
    │                  │                   ├──────────────────►│
    │                  │                   │                   │
    │                  │ Response          │                   │
    │                  │◄──────────────────┤                   │
    │                  │                   │                   │
    │ 200 OK           │                   │                   │
    │ {accessToken,    │                   │                   │
    │  user}           │                   │                   │
    │◄─────────────────┤                   │                   │
    │                  │                   │                   │
```

### Diagrama de Módulos y Dependencias

```
┌──────────────────────────────────────────────────────────────────┐
│                         src/app.ts                               │
│                      (Express Application)                       │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ imports
             │
    ┌────────▼────────────────────────────────────────┐
    │                                                  │
    │              src/modules/*                       │
    │                                                  │
    │  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
    │  │   auth/    │  │  client/   │  │   sale/   │ │
    │  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘ │
    │        │               │               │       │
    │        └───────┬───────┴───────┬───────┘       │
    │                │               │               │
    │         depends on      depends on            │
    │                │               │               │
    └────────────────┼───────────────┼───────────────┘
                     │               │
                     ▼               ▼
    ┌────────────────────────────────────────────────┐
    │                                                 │
    │            src/shared/*                         │
    │                                                 │
    │  ┌───────────┐  ┌──────────┐  ┌────────────┐  │
    │  │    db/    │  │ services/│  │ middleware/│  │
    │  │           │  │          │  │            │  │
    │  │ orm.ts    │  │ redis    │  │ security   │  │
    │  │ orm       │  │ email    │  │ auth       │  │
    │  │ config.ts │  │ cache    │  │ validation │  │
    │  └───────────┘  └──────────┘  └────────────┘  │
    │                                                 │
    │  ┌───────────┐  ┌──────────┐                  │
    │  │  utils/   │  │ errors/  │                  │
    │  │           │  │          │                  │
    │  │ logger.ts │  │ custom-  │                  │
    │  │ pretty    │  │ errors.ts│                  │
    │  │ .log.ts   │  │          │                  │
    │  └───────────┘  └──────────┘                  │
    │                                                 │
    └─────────────────────────────────────────────────┘
```

---

## Conceptos Clave

### 1. Modularidad

Cada módulo es independiente y contiene todo lo necesario para gestionar una entidad:

**Ventajas:**
- Fácil de entender y mantener
- Cambios en un módulo no afectan a otros
- Facilita el trabajo en equipo (cada dev puede trabajar en un módulo)

### 2. Reutilización de Código

El directorio `shared/` contiene código reutilizable:

```typescript
// Ejemplo: Logger usado en toda la aplicación
import logger from './shared/utils/logger.js';

// En cualquier archivo:
logger.info('Usuario creado exitosamente');
logger.error({ err: error }, 'Error al crear usuario');
```

### 3. Inyección de Dependencias

Servicios singleton importados:

```typescript
// services/redis.service.ts - Exporta instancia única
export const redisService = new RedisService();

// Cualquier módulo lo importa:
import { redisService } from '@/shared/services/redis.service.js';
```

### 4. Validación en Capas

- **Nivel 1:** Validación de esquema (Zod) en middleware
- **Nivel 2:** Validación de negocio en controller
- **Nivel 3:** Validación de integridad en base de datos (constraints)

---

## Próximos Pasos

Para profundizar en la arquitectura, consulta:

- **[Base de Datos (04-DATABASE.md)](04-DATABASE.md)** - Para entender el modelo de datos
- **[API Endpoints (06-API-ENDPOINTS.md)](06-API-ENDPOINTS.md)** - Para ver cómo se exponen los módulos
- **[Validación (VALIDATION_ARCHITECTURE.md)](VALIDATION_ARCHITECTURE.md)** - Para detalles sobre Zod

---

**Última actualización**: 2025-10-16
