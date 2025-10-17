# Configuración de Entorno - TGS Backend

## Índice
- [Variables de Entorno](#variables-de-entorno)
- [Archivos de Configuración](#archivos-de-configuración)
- [Modos de Operación](#modos-de-operación)
- [Configuración por Categoría](#configuración-por-categoría)
- [Validación de Configuración](#validación-de-configuración)
- [Mejores Prácticas](#mejores-prácticas)

---

## Variables de Entorno

### ¿Qué son las Variables de Entorno?

Las variables de entorno son **valores de configuración** que se cargan al iniciar la aplicación y permiten personalizar el comportamiento del sistema sin modificar el código fuente.

**Ventajas:**
- Separación entre código y configuración
- Diferentes configuraciones para cada entorno (dev, prod)
- Seguridad: credenciales fuera del código
- Flexibilidad: cambiar configuración sin recompilar

---

## Archivos de Configuración

### Estructura de Archivos .env

```
TGS-Backend/
├── .env.development      # Configuración de desarrollo (local)
├── .env.production       # Configuración de producción
└── .env.test             # Configuración para tests (opcional)
```

**IMPORTANTE:** Los archivos `.env.*` están en `.gitignore` y **NUNCA** se suben al repositorio por seguridad.

### Cómo se Cargan las Variables

```typescript
// src/config/env.ts

// 1. Se carga el archivo según NODE_ENV
config({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });

// 2. Se validan con Zod (errores si faltan variables requeridas)
const envSchema = z.object({ ... });

// 3. Se exportan tipadas
export const env = envSchema.parse(process.env);
```

**Flujo:**

```
┌─────────────────────────────────────────────────────┐
│ 1. NODE_ENV determina qué archivo cargar           │
│                                                      │
│    NODE_ENV=development → .env.development          │
│    NODE_ENV=production  → .env.production           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. dotenv carga variables en process.env           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Zod valida tipos y valores requeridos           │
│    - Convierte strings a números/booleans          │
│    - Lanza error si falta variable obligatoria     │
│    - Aplica valores por defecto                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Variables disponibles tipadas en toda la app    │
│                                                      │
│    import { env } from './config/env.js';          │
│    console.log(env.PORT); // number                │
└─────────────────────────────────────────────────────┘
```

---

## Modos de Operación

### 1. Modo Desarrollo (Development)

**Cuándo usar:** Desarrollo local en tu máquina

```bash
# Archivo: .env.development
NODE_ENV=development
```

**Características:**
- Logging detallado (nivel `debug` o `info`)
- Auto-sincronización de schema de base de datos
- Creación automática de datos de prueba (admin, zonas)
- Hot reload con `tsc-watch`
- SQL queries visibles en consola

**Comando:**
```bash
pnpm start:dev
```

### 2. Modo Demo

**Cuándo usar:** Evaluaciones académicas, demos rápidas, testing sin email

```bash
# Archivo: .env.development con:
EMAIL_VERIFICATION_REQUIRED=false

# O usar variable de entorno directa:
APP_MODE=demo
```

**Características:**
- Todo lo del modo desarrollo
- Verificación de email desactivada
- Los usuarios pueden iniciar sesión sin verificar email

**Comando:**
```bash
pnpm start:demo
```

### 3. Modo Producción (Production)

**Cuándo usar:** Servidor en producción (deploy real)

```bash
# Archivo: .env.production
NODE_ENV=production
```

**Características:**
- Logging mínimo (nivel `warn` o `error`)
- NO auto-sincroniza schema (usa migraciones)
- NO crea datos de prueba
- Sin SQL queries en consola
- Verificación de email obligatoria
- Rate limiting estricto

**Comando:**
```bash
# 1. Compilar
pnpm build

# 2. Ejecutar
pnpm start:prod
```

---

## Configuración por Categoría

### Aplicación (Application)

```env
# Entorno de ejecución
NODE_ENV=development
# Valores: development | production | test

# Puerto del servidor HTTP
PORT=3000
# Por defecto: 3000
# Cambiar si el puerto está ocupado
```

**Explicación:**
- `NODE_ENV`: Determina el comportamiento global de la app
- `PORT`: Puerto donde escucha el servidor Express

---

### Base de Datos (Database)

```env
# Host de la base de datos
DB_HOST=localhost
# localhost para desarrollo local
# IP o hostname en producción

# Puerto de MySQL
DB_PORT=3307
# 3306 es el puerto por defecto de MySQL
# 3307 si tienes MySQL en puerto alternativo (ej: XAMPP)

# Usuario de la base de datos
DB_USER=dsw

# Contraseña del usuario
DB_PASSWORD=dsw

# Nombre de la base de datos
DB_NAME=tpdesarrollo
```

**Conexión Docker-aware:**

El sistema detecta automáticamente si está corriendo en Docker:

```typescript
// src/config/env.ts
const isDocker = process.env.DOCKER_CONTAINER === 'true';

// Defaults automáticos:
DB_HOST: z.string().default(isDocker ? 'mysql' : 'localhost')
DB_PORT: z.coerce.number().default(isDocker ? 3306 : 3307)
```

**Configuración de Pooling:**

```typescript
// src/shared/db/orm.config.ts
pool: {
  min: 2,                      // Mínimo de conexiones siempre abiertas
  max: 10,                     // Máximo de conexiones simultáneas
  acquireTimeoutMillis: 30000, // Timeout para obtener conexión
  idleTimeoutMillis: 30000,    // Timeout para cerrar conexiones inactivas
}
```

**Diagrama de Pool de Conexiones:**

```
┌──────────────────────────────────────────────────────────┐
│               MySQL Connection Pool                      │
│                                                           │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐           │
│  │Conn1│  │Conn2│  │Conn3│  │Conn4│  │Conn5│  ...      │
│  │BUSY │  │BUSY │  │IDLE │  │IDLE │  │IDLE │           │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘           │
│     ▲        ▲                                            │
│     │        │                                            │
│  Request  Request                                         │
│     1        2                                            │
│                                                           │
│  Min: 2 conexiones siempre vivas                         │
│  Max: 10 conexiones máximas                              │
└──────────────────────────────────────────────────────────┘
```

---

### Autenticación (JWT)

```env
# Clave secreta para firmar tokens JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars
# DEBE tener al menos 32 caracteres
# Genera uno seguro: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Tiempo de expiración del access token
JWT_EXPIRES_IN=15m
# Formatos: 15m, 1h, 7d, etc.
# Recomendado: 15-60 minutos
```

**¿Cómo funciona JWT?**

```
┌────────────────────────────────────────────────────────────┐
│                     JWT TOKEN                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Header:                                                    │
│  {                                                          │
│    "alg": "HS256",        ← Algoritmo de firma            │
│    "typ": "JWT"                                            │
│  }                                                          │
│                                                             │
│  Payload:                                                   │
│  {                                                          │
│    "userId": "uuid-123",   ← Datos del usuario            │
│    "role": "ADMIN",                                        │
│    "iat": 1634567890,      ← Issued at                    │
│    "exp": 1634571490       ← Expiration (15min después)   │
│  }                                                          │
│                                                             │
│  Signature:                                                 │
│  HMACSHA256(                                               │
│    base64UrlEncode(header) + "." +                        │
│    base64UrlEncode(payload),                              │
│    JWT_SECRET              ← Clave secreta                │
│  )                                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘

Resultado:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkLTEyMyIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTYzNDU2Nzg5MCwiZXhwIjoxNjM0NTcxNDkwfQ.abc123...
```

---

### Logging

```env
# Nivel de detalle de logs
LOG_LEVEL=info
# Valores: debug | info | warn | error
# - debug: Todo (SQL queries, detalles internos)
# - info: Información general (requests, respuestas)
# - warn: Advertencias (Redis caído, email no configurado)
# - error: Solo errores
```

**Niveles de Log en Práctica:**

```typescript
// Ejemplo de uso
import logger from './shared/utils/logger.js';

logger.debug({ userId: '123' }, 'Usuario encontrado en caché');  // Solo en development
logger.info('Servidor iniciado en puerto 3000');                   // Siempre visible
logger.warn('Redis no disponible, usando memoria');               // Advertencias
logger.error({ err: error }, 'Error al conectar a la base de datos'); // Errores críticos
```

**Salida en consola:**

```
[14:32:45.123] DEBUG: Usuario encontrado en caché
    userId: "123"

[14:32:45.456] INFO: Servidor iniciado en puerto 3000

[14:32:46.789] WARN: Redis no disponible, usando memoria

[14:32:47.012] ERROR: Error al conectar a la base de datos
    err: {
      "type": "Error",
      "message": "Connection refused",
      "stack": "..."
    }
```

---

### Seguridad (Security)

```env
# Orígenes permitidos para CORS (separados por coma)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
# Lista de URLs del frontend que pueden hacer requests

# Confiar en proxy (para obtener IP real detrás de Nginx, etc.)
TRUST_PROXY=false
# true en producción si usas reverse proxy

# Habilitar headers de seguridad (Helmet)
ENABLE_SECURITY_HEADERS=true
# Recomendado: siempre true

# Habilitar rate limiting
ENABLE_RATE_LIMITING=true
# Limita requests por IP para prevenir abusos

# Nivel de log para eventos de seguridad
SECURITY_LOG_LEVEL=warn
# Valores: debug | info | warn | error
```

**CORS Explicado:**

```
┌─────────────────────────────────────────────────────────────┐
│                     CORS (Cross-Origin Resource Sharing)    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (http://localhost:3000)                           │
│         │                                                    │
│         │ GET /api/clients                                  │
│         ├────────────────────────────►                      │
│         │                              Backend              │
│         │ ◄────────────────────────── (http://localhost:3001)│
│         │ Access-Control-Allow-Origin:                      │
│         │ http://localhost:3000                             │
│                                                              │
│  Si el origen NO está en ALLOWED_ORIGINS:                   │
│  ❌ Request bloqueado por el navegador                      │
│                                                              │
│  Si el origen SÍ está en ALLOWED_ORIGINS:                   │
│  ✅ Request permitido                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Redis (Opcional)

```env
# Habilitar o deshabilitar Redis
REDIS_ENABLED=false
# false: usa caché en memoria
# true: usa Redis (requiere servidor Redis corriendo)

# Host de Redis
REDIS_HOST=localhost
# localhost en desarrollo
# redis en Docker
# IP del servidor Redis en producción

# Puerto de Redis
REDIS_PORT=6379
# Puerto por defecto de Redis

# Contraseña de Redis (opcional)
REDIS_PASSWORD=
# Dejar vacío si no tiene contraseña

# Base de datos de Redis (0-15)
REDIS_DB=0
# Redis tiene 16 bases de datos (0-15)
```

**Fallback a Memoria:**

```
┌────────────────────────────────────────────────────┐
│              REDIS_ENABLED=true                    │
│                                                     │
│  ┌─────────────┐  Conectar  ┌─────────────┐       │
│  │   App       ├───────────►│   Redis     │       │
│  └─────────────┘            └─────────────┘       │
│         │                                           │
│         │ ✅ Conectado → Usar Redis               │
│         │ ❌ Error → Fallback a memoria           │
│                                                     │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│              REDIS_ENABLED=false                   │
│                                                     │
│  ┌─────────────┐                                   │
│  │   App       │  Usar caché en memoria           │
│  └─────────────┘  (Map de JavaScript)             │
│                                                     │
└────────────────────────────────────────────────────┘
```

Consulta [REDIS_CONFIGURATION.md](REDIS_CONFIGURATION.md) para más detalles.

---

### Servicio de Email

```env
# ============================================================================
# SMTP (Desarrollo - Mailtrap, Gmail, etc.)
# ============================================================================

SMTP_HOST=smtp.gmail.com
# Host del servidor SMTP

SMTP_PORT=587
# 587: STARTTLS (recomendado)
# 465: SSL/TLS
# 25: Sin cifrado (no recomendado)

SMTP_SECURE=false
# false para puerto 587 (STARTTLS)
# true para puerto 465 (SSL)

SMTP_USER=tu-email@gmail.com
# Usuario/email para autenticación SMTP

SMTP_PASS=tu-app-password
# Contraseña de aplicación (NO tu contraseña normal)

SMTP_FROM=noreply@tgs-system.com
# Dirección "From" de los emails enviados

# ============================================================================
# SendGrid (Producción - Alternativa)
# ============================================================================

SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxx
# API Key de SendGrid

SENDGRID_FROM=noreply@tudominio.com
# Email verificado en SendGrid

# ============================================================================
# Configuración General de Email
# ============================================================================

FRONTEND_URL=http://localhost:3000
# URL del frontend para enlaces en emails (verificación, reset password)

EMAIL_VERIFICATION_REQUIRED=true
# true: usuarios DEBEN verificar email antes de usar la app
# false: verificación opcional (modo demo)
```

**Flujo de Email:**

```
┌───────────────────────────────────────────────────────────┐
│                   Email Service Flow                      │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  1. Usuario se registra                                   │
│     │                                                      │
│     ▼                                                      │
│  2. Sistema genera token de verificación                  │
│     │                                                      │
│     ▼                                                      │
│  3. Email Service envía email                             │
│     │                                                      │
│     ├─ Si SMTP configurado:                               │
│     │  └─ Envía vía Nodemailer (Gmail, Mailtrap)         │
│     │                                                      │
│     ├─ Si SendGrid configurado:                           │
│     │  └─ Envía vía SendGrid API                         │
│     │                                                      │
│     └─ Si nada configurado:                               │
│        └─ Log warning (no se envía email)                │
│                                                            │
│  4. Usuario recibe email con link:                        │
│     http://localhost:3000/verify?token=abc123...          │
│                                                            │
│  5. Usuario hace click → verifica su cuenta              │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

Consulta [EMAIL_CONFIGURATION.md](EMAIL_CONFIGURATION.md) para configuración detallada.

---

## Validación de Configuración

### Schema de Validación con Zod

```typescript
// src/config/env.ts

const envSchema = z.object({
  // Validación de NODE_ENV: solo acepta 3 valores
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Validación de PORT: debe ser número, default 3000
  PORT: z.coerce.number().default(3000),

  // Validación de JWT_SECRET: mínimo 32 caracteres
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Validación de EMAIL: debe ser email válido
  SMTP_FROM: z.string().email().optional(),

  // ... más validaciones
});

// Parse y validación
export const env = envSchema.parse(process.env);
```

**¿Qué pasa si hay un error?**

```bash
# Si JWT_SECRET tiene solo 10 caracteres:

Error: JWT_SECRET must be at least 32 characters
  at envSchema.parse (env.ts:32)

# La aplicación NO inicia hasta corregir el error
```

### Conversión Automática de Tipos

```typescript
// En .env.development:
PORT=3000              # String "3000"
REDIS_ENABLED=true     # String "true"

// Después de Zod:
env.PORT              // number: 3000
env.REDIS_ENABLED     // boolean: true
```

---

## Mejores Prácticas

### 1. Nunca Subir .env al Repositorio

```bash
# .gitignore
.env
.env.*
!.env.example  # Solo el ejemplo se sube
```

### 2. Usar .env.example como Plantilla

```bash
# .env.example (SÍ se sube a Git)
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3307
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
JWT_SECRET=genera-uno-seguro-de-al-menos-32-caracteres
```

### 3. Diferentes Configuraciones por Entorno

```
Development:
- LOG_LEVEL=debug
- EMAIL_VERIFICATION_REQUIRED=false
- REDIS_ENABLED=false

Production:
- LOG_LEVEL=error
- EMAIL_VERIFICATION_REQUIRED=true
- REDIS_ENABLED=true
- TRUST_PROXY=true
```

### 4. Generar Secretos Seguros

```bash
# JWT_SECRET seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Salida ejemplo:
# f4d8c9a7b2e1f6d4c9a7b2e1f6d4c9a7b2e1f6d4c9a7b2e1f6d4c9a7b2e1
```

### 5. Documentar Variables Personalizadas

Si agregas nuevas variables:

```typescript
// 1. Agregar al schema en env.ts
const envSchema = z.object({
  // ... variables existentes

  // Nueva variable
  MI_NUEVA_VAR: z.string().default('valor-por-defecto'),
});

// 2. Agregar a .env.example
MI_NUEVA_VAR=ejemplo-de-valor

// 3. Documentar en esta guía
```

---

## Tabla Resumen de Variables

| Variable | Tipo | Requerida | Default | Descripción |
|----------|------|-----------|---------|-------------|
| `NODE_ENV` | enum | No | development | Entorno de ejecución |
| `PORT` | number | No | 3000 | Puerto del servidor |
| `DB_HOST` | string | No | localhost | Host de MySQL |
| `DB_PORT` | number | No | 3307 | Puerto de MySQL |
| `DB_USER` | string | No | dsw | Usuario de MySQL |
| `DB_PASSWORD` | string | No | dsw | Contraseña de MySQL |
| `DB_NAME` | string | No | tpdesarrollo | Nombre de la BD |
| `JWT_SECRET` | string | **Sí** | - | Clave JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | string | No | 15m | Expiración del token |
| `LOG_LEVEL` | enum | No | info | Nivel de logging |
| `ALLOWED_ORIGINS` | string | No | localhost:3000 | CORS origins |
| `REDIS_ENABLED` | boolean | No | false | Habilitar Redis |
| `EMAIL_VERIFICATION_REQUIRED` | boolean | No | true | Verificación obligatoria |

---

## Troubleshooting

### Error: "JWT_SECRET must be at least 32 characters"

```bash
# Generar un JWT_SECRET válido:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiar el resultado a .env.development:
JWT_SECRET=<resultado-del-comando>
```

### Error: "Cannot find module '.env.development'"

```bash
# Crear el archivo .env.development
cp .env.example .env.development

# Editar con tus valores
```

### Cambios en .env no se reflejan

```bash
# Reiniciar el servidor:
# 1. Detener con Ctrl+C
# 2. Volver a ejecutar:
pnpm start:dev
```

### ¿Cómo sé qué variables están cargadas?

```typescript
// Agregar temporalmente en server.ts:
console.log('Environment:', {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  DB_HOST: env.DB_HOST,
  // ... otras variables que quieras verificar
});

// NO imprimir secretos (JWT_SECRET, passwords)
```

---

## Próximos Pasos

- **[Base de Datos](04-DATABASE.md)** - Configuración de la base de datos en detalle
- **[Seguridad](07-SECURITY.md)** - Mejores prácticas de seguridad
- **[REDIS_CONFIGURATION.md](REDIS_CONFIGURATION.md)** - Configuración avanzada de Redis

---

**Última actualización**: 2025-10-16
