# Sistema de Autenticación - TGS Backend

## Índice
- [Visión General](#visión-general)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Flujo Completo de Autenticación](#flujo-completo-de-autenticación)
- [Registro de Usuarios](#registro-de-usuarios)
- [Login y Generación de Tokens](#login-y-generación-de-tokens)
- [Verificación de Email](#verificación-de-email)
- [Roles y Permisos](#roles-y-permisos)
- [Middleware de Autenticación](#middleware-de-autenticación)
- [Seguridad](#seguridad)

---

## Visión General

TGS Backend implementa un **sistema de autenticación basado en JWT (JSON Web Tokens)** con las siguientes características:

- **Registro de usuarios** con validación de datos
- **Login/Logout** con gestión de sesiones
- **Verificación de email** obligatoria (configurable)
- **Tokens de acceso** (access tokens) de corta duración
- **Tokens de refresco** (refresh tokens) de larga duración
- **Sistema de roles** multi-nivel (RBAC - Role-Based Access Control)
- **Verificación de usuarios** por administradores
- **Hashing seguro de contraseñas** con Argon2

---

## Tecnologías Utilizadas

```
┌─────────────────────────────────────────────────────────┐
│            Stack de Autenticación                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  • JWT (jsonwebtoken)                                   │
│    └─ Tokens firmados y verificables                    │
│                                                          │
│  • Argon2 (argon2)                                      │
│    └─ Hashing de contraseñas (ganador PHC)             │
│                                                          │
│  • Zod (zod)                                            │
│    └─ Validación de esquemas de datos                   │
│                                                          │
│  • HTTP-Only Cookies                                    │
│    └─ Almacenamiento seguro de tokens                   │
│                                                          │
│  • Nodemailer / SendGrid                                │
│    └─ Envío de emails de verificación                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Flujo Completo de Autenticación

### Diagrama de Flujo General

```
┌──────────────────────────────────────────────────────────────────┐
│                  Flujo de Autenticación Completo                  │
└──────────────────────────────────────────────────────────────────┘

┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌─────────────────┐
│   REGISTER      │ ─────┐
│ POST /register  │      │
└────┬────────────┘      │
     │                   │ EMAIL_VERIFICATION_REQUIRED=true
     │                   │
     ▼                   ▼
┌─────────────────┐ ┌──────────────────┐
│  User Created   │ │ Email Sent       │
│  (emailVerified │ │ (Token valid     │
│   = false)      │ │  24 hours)       │
└────┬────────────┘ └────┬─────────────┘
     │                   │
     │                   ▼
     │            ┌──────────────────┐
     │            │ User clicks link │
     │            │ GET /verify      │
     │            │ ?token=abc123... │
     │            └────┬─────────────┘
     │                 │
     │                 ▼
     │            ┌──────────────────┐
     │            │ emailVerified    │
     │            │ = true           │
     │            └────┬─────────────┘
     │                 │
     │◄────────────────┘
     │
     ▼
┌─────────────────┐
│     LOGIN       │
│  POST /login    │
│  {email, pass}  │
└────┬────────────┘
     │
     │ ✅ Email verified
     │ ✅ Password correct
     │
     ▼
┌─────────────────────────────────────┐
│  Generate Tokens:                   │
│  • Access Token  (15 min - cookie)  │
│  • Refresh Token (7 days - cookie)  │
└────┬────────────────────────────────┘
     │
     ▼
┌─────────────────┐
│  User Session   │
│  Active         │
└────┬────────────┘
     │
     │ After 15 min (access token expired)
     │
     ▼
┌─────────────────┐
│   REFRESH       │
│ POST /refresh   │
│ (with refresh_  │
│  token cookie)  │
└────┬────────────┘
     │
     │ ✅ Refresh token valid
     │
     ▼
┌─────────────────────────────────────┐
│  Rotate Tokens:                     │
│  • New Access Token  (15 min)       │
│  • New Refresh Token (7 days)       │
│  • Old Refresh Token revoked        │
└────┬────────────────────────────────┘
     │
     │ Repeat until logout or refresh token expires
     │
     ▼
┌─────────────────┐
│    LOGOUT       │
│  POST /logout   │
└────┬────────────┘
     │
     │ • Revoke refresh token
     │ • Clear cookies
     │
     ▼
┌─────────┐
│   END   │
└─────────┘
```

---

## Registro de Usuarios

### Endpoint: POST /api/auth/register

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "thomas",
  "email": "thomas@shelby.com",
  "password": "SecurePassword123!"
}
```

### Proceso Paso a Paso

```
┌──────────────────────────────────────────────────────────────┐
│                    Registro de Usuario                        │
└──────────────────────────────────────────────────────────────┘

1. Validación de Datos (Zod Schema)
   ├─ username: string (min 3, max 50)
   ├─ email: email válido
   └─ password: string (min 8 caracteres)

2. Verificar Duplicados
   ├─ Username ya existe? → 409 Conflict
   └─ Email ya existe?    → 409 Conflict

3. Hash de Contraseña (Argon2)
   ├─ Input:  "SecurePassword123!"
   └─ Output: "$argon2id$v=19$m=65536,t=3,p=4$..."

4. Crear Entidad User
   ├─ id: UUID v7
   ├─ username: "thomas"
   ├─ email: "thomas@shelby.com"
   ├─ password: [hash from step 3]
   ├─ roles: [Role.USER]
   ├─ emailVerified: false
   └─ profileCompleteness: 25%

5. Persistir en Base de Datos
   └─ INSERT INTO users (...)

6a. Si EMAIL_VERIFICATION_REQUIRED = true
   ├─ Crear EmailVerification token
   ├─ Enviar email con link de verificación
   └─ Response: 201 Created
      {
        "message": "User created. Please verify your email.",
        "data": {
          "id": "...",
          "username": "thomas",
          "email": "thomas@shelby.com",
          "emailVerified": false,
          "verificationRequired": true,
          "expiresAt": "2025-10-17T12:00:00Z"
        }
      }

6b. Si EMAIL_VERIFICATION_REQUIRED = false (modo demo)
   └─ Response: 201 Created
      {
        "message": "User created (demo mode)",
        "data": {
          "id": "...",
          "username": "thomas",
          "emailVerified": false,
          "verificationRequired": false,
          "mode": "demo"
        }
      }
```

### Código Ejemplo

```typescript
// auth.controller.ts - register()

const hashedPassword = await argon2.hash(password);

const newUser = new User(
  username,
  email,
  hashedPassword,
  [Role.USER]
);

await em.persistAndFlush(newUser);

if (env.EMAIL_VERIFICATION_REQUIRED) {
  const emailVerification = new EmailVerification(email);
  await em.persistAndFlush(emailVerification);

  await emailService.sendVerificationEmail(
    email,
    emailVerification.token,
    username
  );
}
```

---

## Login y Generación de Tokens

### Endpoint: POST /api/auth/login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "thomas@shelby.com",
  "password": "SecurePassword123!"
}
```

### Proceso Paso a Paso

```
┌──────────────────────────────────────────────────────────────┐
│                    Login de Usuario                           │
└──────────────────────────────────────────────────────────────┘

1. Buscar Usuario por Email
   └─ SELECT * FROM users WHERE email = '...'

2. Verificar Contraseña
   ├─ Hash almacenado: "$argon2id$v=19$m=65536..."
   ├─ Contraseña ingresada: "SecurePassword123!"
   └─ argon2.verify(hash, password) → true/false

3. Si EMAIL_VERIFICATION_REQUIRED = true
   └─ ¿emailVerified = true?
      ├─ NO  → 403 Forbidden "Email verification required"
      └─ YES → Continuar

4. Actualizar Last Login
   └─ UPDATE users SET lastLoginAt = NOW() WHERE id = '...'

5. Generar Access Token (JWT)
   ┌────────────────────────────────────────────┐
   │ Header:                                    │
   │ { "alg": "HS256", "typ": "JWT" }           │
   │                                            │
   │ Payload:                                   │
   │ {                                          │
   │   "id": "user-uuid-123",                   │
   │   "roles": ["USER"],                       │
   │   "iat": 1697634567,  ← Issued At         │
   │   "exp": 1697635467   ← Expires (15 min)  │
   │ }                                          │
   │                                            │
   │ Signature:                                 │
   │ HMACSHA256(header + payload, JWT_SECRET)   │
   └────────────────────────────────────────────┘

   Resultado: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InV...

6. Generar Refresh Token
   ├─ Token: crypto.randomBytes(64).toString('hex')
   ├─ Hash: argon2.hash(token)
   └─ Guardar en DB:
      INSERT INTO refresh_tokens (
        token: [hash],
        user_id: '...',
        expiresAt: NOW() + 7 days,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      )

7. Establecer Cookies HTTP-Only
   ├─ access_token:
   │  ├─ value: [JWT from step 5]
   │  ├─ httpOnly: true (no accesible por JS)
   │  ├─ secure: true (solo HTTPS en producción)
   │  ├─ sameSite: 'strict' (CSRF protection)
   │  └─ maxAge: 15 minutes
   │
   └─ refresh_token:
      ├─ value: [Token from step 6]
      ├─ httpOnly: true
      ├─ secure: true (production)
      ├─ sameSite: 'strict'
      └─ maxAge: 7 days

8. Response
   └─ 200 OK
      {
        "success": true,
        "message": "Login successful",
        "data": {
          "id": "user-uuid-123",
          "username": "thomas",
          "email": "thomas@shelby.com",
          "roles": ["USER"],
          "emailVerified": true,
          "profileCompleteness": 25,
          "lastLoginAt": "2025-10-16T12:30:00Z"
        }
      }
```

### Tokens: Access vs Refresh

```
┌─────────────────────────────────────────────────────────────┐
│                  Access Token vs Refresh Token               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ACCESS TOKEN (Short-lived)                                 │
│  ┌────────────────────────────────────────┐                │
│  │ • Duración: 15 minutos                 │                │
│  │ • Almacenado en: Cookie HTTP-Only      │                │
│  │ • Uso: Autenticación en cada request   │                │
│  │ • Contiene: id, roles                  │                │
│  │ • Formato: JWT firmado                 │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  REFRESH TOKEN (Long-lived)                                 │
│  ┌────────────────────────────────────────┐                │
│  │ • Duración: 7 días                     │                │
│  │ • Almacenado en: Cookie HTTP-Only + DB │                │
│  │ • Uso: Renovar access token expirado   │                │
│  │ • Contiene: Token aleatorio            │                │
│  │ • Formato: Hash almacenado en DB       │                │
│  │ • Rotación: Se renueva en cada refresh │                │
│  └────────────────────────────────────────┘                │
│                                                              │
│  ¿Por qué dos tokens?                                       │
│  • Access token corto = menos riesgo si se compromete       │
│  • Refresh token largo = UX sin logins frecuentes          │
│  • Refresh token revocable = logout efectivo               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Verificación de Email

### Flujo de Verificación

```
┌──────────────────────────────────────────────────────────────┐
│              Verificación de Email                            │
└──────────────────────────────────────────────────────────────┘

1. Usuario se registra
   └─ POST /api/auth/register

2. Sistema genera token de verificación
   ├─ Token: crypto.randomBytes(32).toString('hex')
   ├─ Hash: argon2.hash(token)
   └─ Guardar en DB:
      INSERT INTO email_verifications (
        email: "thomas@shelby.com",
        token: [hash],
        expiresAt: NOW() + 24 hours
      )

3. Sistema envía email
   ┌─────────────────────────────────────────┐
   │ To: thomas@shelby.com                   │
   │ Subject: Verify your email - TGS        │
   │                                         │
   │ Hi Thomas,                              │
   │                                         │
   │ Click the link below to verify:        │
   │ http://localhost:3000/verify?token=abc │
   │                                         │
   │ Expires in 24 hours.                    │
   └─────────────────────────────────────────┘

4. Usuario hace click en el link
   └─ GET /api/email-verification/verify?token=abc123...

5. Sistema valida token
   ├─ Buscar en DB por hash
   ├─ ¿Token existe y no expiró?
   │  ├─ NO  → 400 Bad Request "Invalid or expired token"
   │  └─ YES → Continuar
   │
   └─ Actualizar usuario:
      UPDATE users
      SET emailVerified = true
      WHERE email = 'thomas@shelby.com'

6. Response
   └─ 200 OK
      {
        "success": true,
        "message": "Email verified successfully. You can now log in.",
        "data": {
          "email": "thomas@shelby.com",
          "verified": true
        }
      }
```

### Endpoints de Verificación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/email-verification/send` | POST | Envía email de verificación (nuevo o reenvío) |
| `/api/email-verification/verify` | GET | Verifica email con token |

---

## Roles y Permisos

### Sistema de Roles (RBAC)

```typescript
// src/modules/auth/user/user.entity.ts

export enum Role {
  ADMIN = 'ADMIN',           // Administrador total
  PARTNER = 'PARTNER',       // Socio (Shelby Council)
  DISTRIBUTOR = 'DISTRIBUTOR', // Distribuidor
  CLIENT = 'CLIENT',         // Cliente (puede comprar)
  USER = 'USER',             // Usuario básico (sin rol específico)
  AUTHORITY = 'AUTHORITY',   // Autoridad (policía, gobierno)
}
```

### Jerarquía de Roles

```
┌─────────────────────────────────────────────────────────┐
│                  Jerarquía de Roles                      │
└─────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  ADMIN   │ ← Acceso total
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼─────┐    ┌────▼─────┐    ┌────▼─────┐
   │ PARTNER  │    │DISTRIBUTOR│    │AUTHORITY │
   └──────────┘    └──────────┘    └──────────┘
                         │
                    ┌────▼─────┐
                    │ CLIENT   │
                    └──────────┘
                         │
                    ┌────▼─────┐
                    │   USER   │ ← Acceso básico
                    └──────────┘
```

### Permisos por Rol

| Rol | Permisos |
|-----|----------|
| **ADMIN** | • Gestionar usuarios<br>• Verificar usuarios<br>• Aprobar cambios de rol<br>• Ver todas las entidades<br>• CRUD completo |
| **PARTNER** | • Participar en Shelby Council<br>• Crear/votar decisiones<br>• Ver monthly reviews |
| **DISTRIBUTOR** | • Crear ventas<br>• Gestionar productos asignados<br>• Ver zona asignada |
| **CLIENT** | • Realizar compras<br>• Ver historial de compras |
| **USER** | • Ver perfil<br>• Solicitar cambio de rol<br>• Completar información personal |
| **AUTHORITY** | • Recibir sobornos<br>• Ver ventas relacionadas |

### Middleware de Roles

```typescript
// src/modules/auth/auth.middleware.ts

/**
 * Middleware para requerir roles específicos
 */
export const requireRoles = (...allowedRoles: Role[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const userRoles = req.user.roles;
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));

    if (!hasPermission) {
      return ResponseUtil.forbidden(
        res,
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

// Uso en rutas:
router.get('/admin-only',
  authenticateToken,
  requireRoles(Role.ADMIN),
  controller.adminAction
);
```

---

## Middleware de Autenticación

### authenticateToken

Valida el token JWT en cada request protegido:

```typescript
// auth.middleware.ts

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const em = orm.em.fork();

  try {
    // 1. Obtener token de la cookie
    const token = req.cookies.access_token;

    if (!token) {
      return ResponseUtil.unauthorized(res, 'Access token required');
    }

    // 2. Verificar y decodificar JWT
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // 3. Buscar usuario en DB
    const user = await em.findOne(User, { id: decoded.id });

    if (!user || !user.isActive) {
      return ResponseUtil.unauthorized(res, 'Invalid user');
    }

    // 4. Adjuntar usuario al request
    req.user = user;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return ResponseUtil.unauthorized(res, 'Token expired');
    }
    return ResponseUtil.unauthorized(res, 'Invalid token');
  }
};
```

### Diagrama de Flujo del Middleware

```
┌────────────────────────────────────────────────────────────┐
│          authenticateToken Middleware                       │
└────────────────────────────────────────────────────────────┘

Request Incoming
       │
       ▼
┌──────────────────┐
│ Get Cookie       │
│ "access_token"   │
└────┬─────────────┘
     │
     ├─ ❌ No cookie → 401 Unauthorized
     │
     ▼
┌──────────────────┐
│ Verify JWT       │
│ jwt.verify(...)  │
└────┬─────────────┘
     │
     ├─ ❌ Invalid signature → 401 Unauthorized
     ├─ ❌ Token expired     → 401 Unauthorized (hint: use /refresh)
     │
     ▼
┌──────────────────┐
│ Decode Payload   │
│ { id, roles }    │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Find User in DB  │
└────┬─────────────┘
     │
     ├─ ❌ User not found → 401 Unauthorized
     ├─ ❌ User inactive  → 401 Unauthorized
     │
     ▼
┌──────────────────┐
│ Attach to req    │
│ req.user = user  │
└────┬─────────────┘
     │
     ▼
  next() → Continue to route handler
```

---

## Seguridad

### 1. Hashing de Contraseñas (Argon2)

**¿Por qué Argon2?**
- Ganador del Password Hashing Competition (PHC) 2015
- Resistente a ataques GPU/ASIC
- Configurable en memoria, tiempo y paralelismo

```typescript
// Hashear contraseña
const hash = await argon2.hash('password123');
// → "$argon2id$v=19$m=65536,t=3,p=4$..."

// Verificar contraseña
const isValid = await argon2.verify(hash, 'password123');
// → true
```

**Parámetros de Argon2 (por defecto):**
- Memory: 64 MB (`m=65536`)
- Iterations: 3 (`t=3`)
- Parallelism: 4 threads (`p=4`)

---

### 2. JWT Security Best Practices

```typescript
// Generar JWT
const token = jwt.sign(
  { id: user.id, roles: user.roles },  // Payload mínimo
  env.JWT_SECRET,                       // Clave secreta (min 32 chars)
  { expiresIn: '15m' }                  // Expiración corta
);
```

**Mejores Prácticas:**
- ✅ Tokens de corta duración (15 min)
- ✅ No almacenar datos sensibles en payload (es decodificable)
- ✅ Usar HTTPS en producción
- ✅ Rotar refresh tokens
- ✅ Validar siempre la firma

---

### 3. HTTP-Only Cookies

```typescript
res.cookie('access_token', token, {
  httpOnly: true,        // ✅ No accesible por JavaScript
  secure: true,          // ✅ Solo HTTPS (producción)
  sameSite: 'strict',    // ✅ Protección CSRF
  maxAge: 15 * 60 * 1000 // ✅ Expiración explícita
});
```

**Ventajas:**
- Protección contra XSS (JavaScript no puede leer la cookie)
- Protección contra CSRF (`sameSite: strict`)
- Automáticamente enviada en requests al mismo origen

---

### 4. Refresh Token Rotation

Al hacer `/refresh`, se genera un **nuevo** refresh token y se revoca el anterior:

```
Old Refresh Token (7 días) → USADO
   └─ Revocar (isRevoked = true)

New Refresh Token (7 días) → ACTIVO
   └─ Guardar en DB
```

**Ventaja:** Si un token se compromete, solo es válido hasta el próximo refresh.

---

### 5. Verificación de Email

**Protege contra:**
- Registro con emails falsos
- Spam/bots
- Usuarios malintencionados

**Implementación:**
- Token de verificación hasheado en DB
- Expiración de 24 horas
- Link único por usuario

---

## Endpoints de Autenticación

| Endpoint | Método | Autenticación | Descripción |
|----------|--------|---------------|-------------|
| `/api/auth/register` | POST | No | Registrar nuevo usuario |
| `/api/auth/login` | POST | No | Iniciar sesión |
| `/api/auth/logout` | POST | Sí | Cerrar sesión |
| `/api/auth/refresh` | POST | Refresh Token | Renovar access token |
| `/api/auth/me` | GET | Sí | Obtener info del usuario actual |

---

## Ejemplo Completo: Ciclo de Vida de un Usuario

```
1. Registro
   POST /api/auth/register
   {
     "username": "thomas",
     "email": "thomas@shelby.com",
     "password": "SecurePass123!"
   }

   Response: 201 Created
   {
     "message": "User created. Please verify your email.",
     "data": {
       "id": "uuid-123",
       "emailVerified": false
     }
   }

2. Verificación de Email
   (Usuario hace click en email)
   GET /api/email-verification/verify?token=abc123...

   Response: 200 OK
   {
     "message": "Email verified successfully"
   }

3. Login
   POST /api/auth/login
   {
     "email": "thomas@shelby.com",
     "password": "SecurePass123!"
   }

   Response: 200 OK (+ cookies: access_token, refresh_token)
   {
     "success": true,
     "data": {
       "id": "uuid-123",
       "username": "thomas",
       "roles": ["USER"],
       "profileCompleteness": 25
     }
   }

4. Acceder a Recursos Protegidos
   GET /api/users/me
   (Las cookies se envían automáticamente)

   Response: 200 OK
   {
     "data": {
       "id": "uuid-123",
       "username": "thomas",
       ...
     }
   }

5. Renovar Token (después de 15 min)
   POST /api/auth/refresh
   (La cookie refresh_token se envía automáticamente)

   Response: 200 OK (+ nuevas cookies establecidas)

6. Logout
   POST /api/auth/logout

   Response: 200 OK (cookies cleared)
```

---

## Próximos Pasos

- **[API Endpoints](06-API-ENDPOINTS.md)** - Documentación completa de todos los endpoints
- **[Seguridad](07-SECURITY.md)** - Medidas de seguridad adicionales
- **[Configuración de Email](EMAIL_CONFIGURATION.md)** - Configurar servicio de email

---

**Última actualización**: 2025-10-16
