# Guía de Inicio Rápido - TGS Backend

## Índice

- [Requisitos Previos](#requisitos-previos)
- [Instalación Paso a Paso](#instalación-paso-a-paso)
- [Configuración Inicial](#configuración-inicial)
- [Primera Ejecución](#primera-ejecución)
- [Verificación del Sistema](#verificación-del-sistema)
- [Solución de Problemas Comunes](#solución-de-problemas-comunes)

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente en tu sistema:

### Software Requerido

| Software       | Versión Mínima  | Propósito                        |
| -------------- | --------------- | -------------------------------- |
| **Node.js**    | 18.x o superior | Runtime de JavaScript            |
| **pnpm**       | 8.x o superior  | Gestor de paquetes (recomendado) |
| **PostgreSQL** | 16 o superior   | Base de datos relacional         |
| **Git**        | 2.x o superior  | Control de versiones             |

### Software Opcional

| Software   | Versión         | Propósito                      |
| ---------- | --------------- | ------------------------------ |
| **Redis**  | 6.x o superior  | Sistema de caché (opcional)    |
| **Docker** | 20.x o superior | Contenedores (para despliegue) |

### Verificar Instalaciones

```bash
# Verificar Node.js
node --version
# Debe mostrar: v18.x.x o superior

# Verificar pnpm (si no está instalado, ver abajo)
pnpm --version
# Debe mostrar: 8.x.x o superior

# Verificar PostgreSQL
psql --version
# Debe mostrar: psql (PostgreSQL) 16.x o superior

# Verificar Git
git --version
# Debe mostrar: git version 2.x.x o superior
```

### Instalar pnpm (si no está instalado)

```bash
# Con npm
npm install -g pnpm

# Con Homebrew (macOS)
brew install pnpm

# Con Scoop (Windows)
scoop install nodejs-lts pnpm
```

---

## Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
# Clonar el proyecto
git clone https://github.com/lautaro-peralta/GarrSYS.git

# Navegar al directorio del backend
cd GarrSYS/TGS-Backend
```

### 2. Instalar Dependencias

```bash
# Instalar todas las dependencias del proyecto
pnpm install
```

Este comando instalará:

- Dependencias de producción (Express, MikroORM, etc.)
- Dependencias de desarrollo (TypeScript, tipos, etc.)

**Salida esperada:**

```
Packages: +XXX
++++++++++++++++++++++++++++++++++++
Progress: resolved XXX, reused XXX, downloaded X, added XXX, done
```

### 3. Configurar la Base de Datos

#### Opción A: PostgreSQL Local

1. **Iniciar PostgreSQL:**

```bash
# En Linux/macOS
sudo systemctl start postgresql

# En Windows (como servicio)
net start postgresql-x64-16

# O usar pgAdmin según tu instalación
```

2. **Crear la base de datos:**

```bash
# Conectar a PostgreSQL
psql -U postgres

# Dentro de PostgreSQL, ejecutar:
CREATE DATABASE tpdesarrollo WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';

# Crear usuario (opcional, recomendado)
CREATE USER dsw WITH PASSWORD 'dsw';
GRANT ALL PRIVILEGES ON DATABASE tpdesarrollo TO dsw;

# Salir de PostgreSQL
\q
```

#### Opción B: Docker (Recomendada)

```bash
# Usar docker-compose desde el repositorio principal
cd ../../infra
docker compose up -d

# Esto levantará PostgreSQL 16 y Redis automáticamente
# Verificar que los contenedores están corriendo
docker compose ps
```

---

## Configuración Inicial

### 1. Crear Archivo de Entorno

```bash
# Crear archivo de configuración para desarrollo
# En Linux/macOS
cp .env.example .env.development

# En Windows (PowerShell)
Copy-Item .env.example .env.development
```

### 2. Editar Variables de Entorno

Abre el archivo `.env.development` con tu editor favorito y configura las siguientes variables:

```env
# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
NODE_ENV=development
PORT=3000

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
DB_HOST=localhost
DB_PORT=5432              # Puerto por defecto de PostgreSQL
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=tpdesarrollo

# ============================================================================
# JWT AUTHENTICATION
# ============================================================================
# IMPORTANTE: Cambiar en producción por una clave segura de al menos 32 caracteres
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-32chars
JWT_EXPIRES_IN=15m

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL=info            # Opciones: debug, info, warn, error

# ============================================================================
# SECURITY
# ============================================================================
ALLOWED_ORIGINS=http://localhost:4200
TRUST_PROXY=false
ENABLE_SECURITY_HEADERS=true
ENABLE_RATE_LIMITING=true

# ============================================================================
# REDIS (Opcional - Deshabilitado por defecto)
# ============================================================================
REDIS_ENABLED=false       # Cambiar a true solo si tienes Redis instalado
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# ============================================================================
# EMAIL SERVICE (Opcional para desarrollo)
# ============================================================================
# Para desarrollo, puedes usar Mailtrap o dejar sin configurar
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=                # Tu email
SMTP_PASS=                # Tu contraseña de aplicación
SMTP_FROM=noreply@tgs-system.com

# ============================================================================
# FRONTEND URL (para enlaces en emails)
# ============================================================================
FRONTEND_URL=http://localhost:4200

# ============================================================================
# EMAIL VERIFICATION (Modo Demo)
# ============================================================================
# Para desarrollo/evaluación, puedes desactivar la verificación obligatoria
EMAIL_VERIFICATION_REQUIRED=false
```

### 3. Configuraciones Importantes

#### Modo Demo (Recomendado para Evaluación)

Para ejecutar sin verificación de email obligatoria:

```env
EMAIL_VERIFICATION_REQUIRED=false
```

O usar el comando directo:

```bash
pnpm start:demo
```

#### Configuración de Email (Opcional)

Si deseas probar el sistema de emails:

**Mailtrap (Recomendado para Testing)**

1. Crea una cuenta gratuita en [Mailtrap.io](https://mailtrap.io)
2. Copia las credenciales SMTP de tu bandeja de entrada
3. Úsalas en las variables SMTP

---

## Primera Ejecución

### 1. Compilar el Proyecto

```bash
# Compilar TypeScript a JavaScript
pnpm build
```

**Salida esperada:**

```
> proyecto_tgs@1.0.0 build
> tsc -p ./tsconfig.json

# Sin errores
```

### 2. Iniciar el Servidor en Modo Desarrollo

```bash
# Modo desarrollo con recarga automática
pnpm start:dev

# O en modo demo (sin verificación de email)
pnpm start:demo
```

**Salida esperada:**

```
[HH:MM:SS] Starting compilation in watch mode...
[HH:MM:SS] Found 0 errors. Watching for file changes.

INFO: Database schema synchronized successfully
INFO: Default admin created: admin@tgs.com / admin123
INFO: Default zones created successfully
INFO: Email service initialized but not available (missing SMTP credentials)
INFO: Email verification: DISABLED (demo mode)
INFO: Loading development routes...

┌─────────────────────────────┐
│   🚀 TGS API Routes         │
├─────────────────────────────┤
│ /api/clients                │
│ /api/auth                   │
│ /api/sales                  │
│ /api/authorities            │
│ /api/zones                  │
│ /api/products               │
│ ... (más rutas)             │
└─────────────────────────────┘

INFO: Server running on http://localhost:3000/ [development]
```

### 3. Datos Iniciales Creados

El sistema crea automáticamente en modo desarrollo:

#### Usuario Administrador por Defecto

```
Email: admin@tgs.com
Password: admin123
Rol: ADMIN
```

#### Zonas por Defecto

- Birmingham
- London
- Camden Town
- Small Heath

---

## Verificación del Sistema

### 1. Health Check

Verifica que el servidor está funcionando correctamente:

```bash
# Usando curl
curl http://localhost:3000/health

# Usando navegador
# Visita: http://localhost:3000/health
```

**Respuesta esperada:**

```json
{
  "status": "ok",
  "timestamp": "2025-10-16T12:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "database": "connected",
  "redis": "disabled"
}
```

### 2. Probar Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@tgs.com",
    "password": "admin123"
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "...",
    "username": "admin",
    "email": "admin@tgs.com",
    "roles": ["ADMIN"],
    "isActive": true
  }
}
```

**Nota:** Los tokens de autenticación se establecen automáticamente como cookies HTTP-Only (`access_token` y `refresh_token`). El parámetro `-c cookies.txt` guarda las cookies para requests posteriores.

### 3. Verificar Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres -d tpdesarrollo

# Dentro de PostgreSQL, verificar tablas creadas
\dt

# Verificar usuario admin
SELECT * FROM users LIMIT 1;

# Salir
\q
```

**Tablas esperadas:**

```
 Schema |        Name         | Type  |  Owner
--------+---------------------+-------+----------
 public | users               | table | postgres
 public | admins              | table | postgres
 public | clients             | table | postgres
 public | zones               | table | postgres
 public | products            | table | postgres
 public | sales               | table | postgres
 ... (más tablas)
```

---

## Solución de Problemas Comunes

### Error: "Cannot find module"

**Problema:** Faltan dependencias instaladas

**Solución:**

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Error: "ECONNREFUSED" al conectar a PostgreSQL

**Problema:** PostgreSQL no está ejecutándose o usa un puerto diferente

**Soluciones:**

```bash
# 1. Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# 2. Verificar el puerto de PostgreSQL
psql -U postgres -c "SHOW port;"

# 3. Actualizar DB_PORT en .env.development con el puerto correcto (por defecto 5432)
```

### Error: "Access denied for user"

**Problema:** Credenciales incorrectas de base de datos

**Soluciones:**

```bash
# 1. Verificar usuario y contraseña en .env.development
# 2. Recrear usuario en PostgreSQL:

psql -U postgres
DROP USER IF EXISTS dsw;
CREATE USER dsw WITH PASSWORD 'dsw';
GRANT ALL PRIVILEGES ON DATABASE tpdesarrollo TO dsw;
\q
```

### Error: "JWT_SECRET must be at least 32 characters"

**Problema:** El JWT_SECRET es muy corto

**Solución:**

```bash
# Generar un JWT_SECRET seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copiar la salida y pegarla en .env.development como JWT_SECRET
```

### El servidor inicia pero no responde

**Problema:** Puerto 3000 ya está en uso

**Soluciones:**

```bash
# Opción 1: Cambiar el puerto en .env.development
PORT=3001

# Opción 2: Encontrar y matar el proceso en el puerto 3000
# En Linux/macOS:
lsof -ti:3000 | xargs kill -9

# En Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Error de TypeScript al compilar

**Problema:** Versión incompatible o configuración incorrecta

**Solución:**

```bash
# Verificar versión de TypeScript
pnpm list typescript

# Limpiar cache de TypeScript
pnpm exec tsc --build --clean

# Recompilar
pnpm build
```

---

## Siguiente Paso

Una vez que el sistema esté funcionando correctamente, continúa con:

- **[Arquitectura del Proyecto](02-ARCHITECTURE.md)** - Para entender la estructura del código
- **[API Endpoints](06-API-ENDPOINTS.md)** - Para explorar las operaciones disponibles
- **[Configuración de Entorno](03-ENVIRONMENT-CONFIG.md)** - Para configuraciones avanzadas

---

## Recursos de Ayuda

- **Logs del servidor:** Revisa la salida de la consola para mensajes de error detallados
- **Base de datos:** Usa un cliente PostgreSQL (pgAdmin, DBeaver, etc.) para inspeccionar los datos
- **Documentación de MikroORM:** https://mikro-orm.io/docs/
- **Documentación de Express:** https://expressjs.com/
- **Documentación de PostgreSQL:** https://www.postgresql.org/docs/16/

---

**¡Felicidades!** 🎉 Tu entorno de desarrollo está listo para comenzar a trabajar con TGS Backend.
