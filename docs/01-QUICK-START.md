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

| Software | Versión Mínima | Propósito |
|----------|----------------|-----------|
| **Node.js** | 18.x o superior | Runtime de JavaScript |
| **pnpm** | 8.x o superior | Gestor de paquetes (recomendado) |
| **MySQL** | 8.0 o superior | Base de datos relacional |
| **Git** | 2.x o superior | Control de versiones |

### Software Opcional

| Software | Versión | Propósito |
|----------|---------|-----------|
| **Redis** | 6.x o superior | Sistema de caché (opcional) |
| **Docker** | 20.x o superior | Contenedores (para despliegue) |

### Verificar Instalaciones

```bash
# Verificar Node.js
node --version
# Debe mostrar: v18.x.x o superior

# Verificar pnpm (si no está instalado, ver abajo)
pnpm --version
# Debe mostrar: 8.x.x o superior

# Verificar MySQL
mysql --version
# Debe mostrar: mysql Ver 8.0.x o superior

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
git clone https://github.com/Lau-prog/TP-Desarrollo-de-Software.git

# Navegar al directorio del backend
cd TP-Desarrollo-de-Software/TGS-Backend
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

#### Opción A: MySQL Local

1. **Iniciar MySQL:**
```bash
# En Linux/macOS
sudo systemctl start mysql

# En Windows (como servicio)
net start MySQL80

# O usar XAMPP/WAMP/MAMP según tu instalación
```

2. **Crear la base de datos:**
```bash
# Conectar a MySQL
mysql -u root -p

# Dentro de MySQL, ejecutar:
CREATE DATABASE tpdesarrollo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Crear usuario (opcional, recomendado)
CREATE USER 'dsw'@'localhost' IDENTIFIED BY 'dsw';
GRANT ALL PRIVILEGES ON tpdesarrollo.* TO 'dsw'@'localhost';
FLUSH PRIVILEGES;

# Salir de MySQL
EXIT;
```

#### Opción B: Docker (Alternativa)

```bash
# Crear y ejecutar contenedor MySQL
docker run --name tgs-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=tpdesarrollo \
  -e MYSQL_USER=dsw \
  -e MYSQL_PASSWORD=dsw \
  -p 3307:3306 \
  -d mysql:8.0

# Verificar que el contenedor está corriendo
docker ps
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
DB_PORT=3307              # 3306 si usas el puerto por defecto de MySQL
DB_USER=dsw
DB_PASSWORD=dsw
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
ALLOWED_ORIGINS=http://localhost:3000
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
FRONTEND_URL=http://localhost:3000

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

**Opción 1: Gmail (Desarrollo)**
1. Habilita la verificación en 2 pasos en tu cuenta de Gmail
2. Genera una "Contraseña de aplicación" en tu cuenta de Google
3. Usa esa contraseña en `SMTP_PASS`

**Opción 2: Mailtrap (Recomendado para Testing)**
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
  -d '{
    "email": "admin@tgs.com",
    "password": "admin123"
  }'
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@tgs.com",
      "role": "ADMIN"
    }
  }
}
```

### 3. Verificar Base de Datos

```bash
# Conectar a MySQL
mysql -u dsw -p tpdesarrollo

# Dentro de MySQL, verificar tablas creadas
SHOW TABLES;

# Verificar usuario admin
SELECT * FROM user LIMIT 1;

# Salir
EXIT;
```

**Tablas esperadas:**
```
+---------------------------+
| Tables_in_tpdesarrollo    |
+---------------------------+
| user                      |
| admin                     |
| client                    |
| zone                      |
| product                   |
| sale                      |
| ... (más tablas)          |
+---------------------------+
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

### Error: "ECONNREFUSED" al conectar a MySQL

**Problema:** MySQL no está ejecutándose o usa un puerto diferente

**Soluciones:**
```bash
# 1. Verificar que MySQL está corriendo
sudo systemctl status mysql

# 2. Verificar el puerto de MySQL
mysql -u root -p -e "SHOW VARIABLES LIKE 'port';"

# 3. Actualizar DB_PORT en .env.development con el puerto correcto
```

### Error: "Access denied for user"

**Problema:** Credenciales incorrectas de base de datos

**Soluciones:**
```bash
# 1. Verificar usuario y contraseña en .env.development
# 2. Recrear usuario en MySQL:

mysql -u root -p
DROP USER IF EXISTS 'dsw'@'localhost';
CREATE USER 'dsw'@'localhost' IDENTIFIED BY 'dsw';
GRANT ALL PRIVILEGES ON tpdesarrollo.* TO 'dsw'@'localhost';
FLUSH PRIVILEGES;
EXIT;
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
- **Base de datos:** Usa un cliente MySQL (MySQL Workbench, DBeaver, etc.) para inspeccionar los datos
- **Documentación de MikroORM:** https://mikro-orm.io/docs/
- **Documentación de Express:** https://expressjs.com/

---

**¡Felicidades!** 🎉 Tu entorno de desarrollo está listo para comenzar a trabajar con TGS Backend.
