# Seguridad y Mejores Prácticas - TGS Backend

## Índice
- [Visión General](#visión-general)
- [Seguridad en Autenticación](#seguridad-en-autenticación)
- [Protección contra Ataques Comunes](#protección-contra-ataques-comunes)
- [Rate Limiting](#rate-limiting)
- [Headers de Seguridad](#headers-de-seguridad)
- [Validación de Datos](#validación-de-datos)
- [Logging y Monitoreo](#logging-y-monitoreo)
- [Mejores Prácticas de Desarrollo](#mejores-prácticas-de-desarrollo)

---

## Visión General

TGS Backend implementa múltiples capas de seguridad siguiendo las mejores prácticas de la industria y los estándares OWASP (Open Web Application Security Project).

### Capas de Seguridad

```
┌──────────────────────────────────────────────────────────┐
│                 Capas de Seguridad                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Network Layer                                        │
│     • HTTPS/TLS en producción                           │
│     • Firewall configuration                            │
│                                                           │
│  2. Application Layer                                    │
│     • Rate Limiting (Express Rate Limit)                │
│     • Security Headers (Helmet)                         │
│     • CORS Policy                                       │
│                                                           │
│  3. Authentication Layer                                 │
│     • JWT Tokens (short-lived)                          │
│     • Refresh Token Rotation                            │
│     • HTTP-Only Cookies                                 │
│     • Email Verification                                │
│                                                           │
│  4. Authorization Layer                                  │
│     • Role-Based Access Control (RBAC)                  │
│     • Middleware de roles                               │
│     • User Verification (admin approval)                │
│                                                           │
│  5. Data Layer                                           │
│     • Input Validation (Zod)                            │
│     • SQL Injection Prevention (ORM)                    │
│     • Password Hashing (Argon2)                         │
│     • Data Sanitization                                 │
│                                                           │
│  6. Monitoring Layer                                     │
│     • Request Logging (Pino)                            │
│     • Error Tracking                                    │
│     • Security Event Logging                            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Seguridad en Autenticación

### 1. Password Hashing con Argon2

**¿Por qué Argon2?**

Argon2 es el ganador del Password Hashing Competition (2015) y proporciona:

- **Resistencia a ataques GPU/ASIC** (hardware especializado)
- **Protección contra rainbow tables**
- **Configurable** (memoria, tiempo, paralelismo)

```typescript
// Hashear contraseña al registrar
const hashedPassword = await argon2.hash('userPassword123');
// Resultado: "$argon2id$v=19$m=65536,t=3,p=4$..."

// Verificar contraseña al login
const isValid = await argon2.verify(hashedPassword, 'userPassword123');
// Resultado: true
```

**Parámetros de Seguridad:**

| Parámetro | Valor | Significado |
|-----------|-------|-------------|
| Memory (m) | 65536 KB | ~64 MB de RAM requeridos |
| Iterations (t) | 3 | 3 pasadas computacionales |
| Parallelism (p) | 4 | 4 threads en paralelo |

**Comparación con otros algoritmos:**

```
Algoritmo      │ Seguridad │ Velocidad │ Resistencia GPU
───────────────┼───────────┼───────────┼─────────────────
MD5            │ ❌ Roto   │ ⚡⚡⚡     │ ❌ Ninguna
SHA-1          │ ❌ Roto   │ ⚡⚡⚡     │ ❌ Ninguna
bcrypt         │ ✅ Buena  │ ⚡        │ ⚠️ Media
scrypt         │ ✅ Buena  │ ⚡        │ ✅ Alta
Argon2         │ ✅ Mejor  │ ⚡        │ ✅ Muy Alta
```

---

### 2. JWT Tokens

**Configuración Segura:**

```typescript
// Generación de JWT
const accessToken = jwt.sign(
  {
    id: user.id,
    roles: user.roles  // Solo datos no sensibles
  },
  env.JWT_SECRET,      // Clave secreta (min 32 caracteres)
  {
    expiresIn: '15m',  // Expiración corta
    algorithm: 'HS256' // Algoritmo HMAC SHA-256
  }
);
```

**Mejores Prácticas:**

✅ **DO:**
- Usar tokens de corta duración (15 minutos)
- Almacenar en HTTP-Only cookies
- Rotar refresh tokens
- Validar firma en cada request
- Usar HTTPS en producción

❌ **DON'T:**
- Almacenar datos sensibles en payload (es decodificable)
- Usar LocalStorage (vulnerable a XSS)
- Tokens de larga duración sin renovación
- JWT_SECRET corto o predecible

---

### 3. Refresh Token Rotation

**Flujo de Rotación:**

```
┌──────────────────────────────────────────────────────────┐
│           Refresh Token Rotation                         │
└──────────────────────────────────────────────────────────┘

1. Usuario hace login
   └─ Se genera Refresh Token RT1 (válido 7 días)

2. Access Token expira (15 min)
   └─ Cliente solicita renovación con RT1

3. Sistema valida RT1
   ├─ ✅ Válido → Generar RT2 (nuevo)
   │             Revocar RT1 (marcar isRevoked=true)
   │             Retornar nuevo Access Token
   └─ ❌ Inválido → 401 Unauthorized (relogin necesario)

4. Cliente usa RT2 para próxima renovación
   └─ RT1 ya NO es válido (detecta robo de token)
```

**Ventajas:**
- Detecta tokens robados (token usado dos veces = anomalía)
- Limita ventana de compromiso
- Permite revocación efectiva

---

### 4. HTTP-Only Cookies

```typescript
res.cookie('access_token', token, {
  httpOnly: true,        // ✅ No accesible por JavaScript
  secure: true,          // ✅ Solo HTTPS (producción)
  sameSite: 'strict',    // ✅ Protección CSRF
  maxAge: 15 * 60 * 1000 // 15 minutos
});
```

**Protección contra ataques:**

| Ataque | Sin httpOnly | Con httpOnly |
|--------|--------------|--------------|
| **XSS** (Cross-Site Scripting) | ❌ Vulnerable (JS puede leer token) | ✅ Protegido |
| **CSRF** (sin sameSite) | ❌ Vulnerable | ⚠️ Vulnerable |
| **CSRF** (con sameSite: strict) | ❌ Vulnerable | ✅ Protegido |

---

## Protección contra Ataques Comunes

### 1. SQL Injection

**Prevención:** Uso de ORM (MikroORM)

```typescript
// ❌ VULNERABLE (SQL directo)
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
// Si email = "'; DROP TABLE users; --" → DESASTRE

// ✅ SEGURO (ORM con prepared statements)
const user = await em.findOne(User, { email });
// MikroORM automáticamente escapa valores
```

**Cómo funciona:**

```sql
-- Query generada por MikroORM (internamente)
SELECT * FROM users WHERE email = ?
-- Parámetros: ['thomas@shelby.com']

-- PostgreSQL trata el valor como string literal, no como SQL
```

---

### 2. Cross-Site Scripting (XSS)

**Prevención:**

1. **HTTP-Only Cookies** (tokens no accesibles por JS)
2. **Content Security Policy** (headers de Helmet)
3. **Sanitización de salida** (automática en JSON responses)

```typescript
// ❌ VULNERABLE (renderizar HTML directamente)
res.send(`<div>Hello ${user.name}</div>`);
// Si name = "<script>alert('XSS')</script>" → EJECUTA JS

// ✅ SEGURO (JSON API)
res.json({ name: user.name });
// JSON.stringify() automáticamente escapa caracteres especiales
```

**Content Security Policy (CSP):**

```typescript
// Configurado en Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],     // Solo scripts del mismo origen
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    }
  }
}));
```

---

### 3. Cross-Site Request Forgery (CSRF)

**Prevención:**

1. **SameSite Cookies:**

```typescript
res.cookie('access_token', token, {
  sameSite: 'strict'  // Cookie NO se envía en requests cross-origin
});
```

2. **Origin Validation (CORS):**

```typescript
// CORS Configuration
const secureCors = {
  origin: env.ALLOWED_ORIGINS.split(','), // Solo orígenes permitidos
  credentials: true,                      // Permite cookies
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

**Flujo de Protección:**

```
┌──────────────────────────────────────────────────────────┐
│                CSRF Protection                           │
└──────────────────────────────────────────────────────────┘

Ataque CSRF:
  Sitio malicioso (evil.com) intenta:
  POST http://localhost:3000/api/sales
  Cookie: access_token=stolen_token

  ├─ Sin sameSite:
  │  └─ ❌ Cookie se envía → ATAQUE EXITOSO
  │
  └─ Con sameSite: strict:
     └─ ✅ Cookie NO se envía → ATAQUE BLOQUEADO
```

---

### 4. Brute Force Attacks

**Prevención:** Rate Limiting (ver sección siguiente)

---

## Rate Limiting

### Configuración

```typescript
// src/shared/middleware/security.middleware.ts

// 1. Rate Limit General
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100,                   // 100 requests por IP
  message: 'Too many requests from this IP'
});

// 2. Rate Limit para Autenticación (más estricto)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,                    // 10 intentos de login
  message: 'Too many authentication attempts'
});

// 3. Rate Limit para Operaciones Sensibles
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 20,                    // 20 requests por IP
  message: 'Too many sensitive operations'
});
```

### Aplicación de Rate Limits

```typescript
// app.ts
app.use('/api/auth', authRateLimit);      // Login, register
app.use('/api/admin', sensitiveRateLimit); // Operaciones admin
app.use(generalRateLimit);                 // Todo lo demás
```

### Diagrama de Funcionamiento

```
┌──────────────────────────────────────────────────────────┐
│              Rate Limiting Flow                          │
└──────────────────────────────────────────────────────────┘

Request 1-10:
  IP: 192.168.1.100 → /api/auth/login
  └─ ✅ Permitido (contador: 1, 2, 3, ..., 10)

Request 11:
  IP: 192.168.1.100 → /api/auth/login
  └─ ❌ 429 Too Many Requests
     {
       "error": "Too many authentication attempts",
       "retryAfter": "14:59"  // Tiempo hasta reset
     }

Después de 15 minutos:
  Contador se resetea a 0
  └─ ✅ Requests permitidos nuevamente
```

---

## Headers de Seguridad

### Helmet Middleware

Helmet configura automáticamente múltiples headers de seguridad:

```typescript
// src/shared/middleware/security.middleware.ts

import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,  // 1 año
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
});
```

### Headers Importantes

| Header | Valor | Protección |
|--------|-------|------------|
| **X-Content-Type-Options** | `nosniff` | Previene MIME type sniffing |
| **X-Frame-Options** | `DENY` | Previene clickjacking |
| **X-XSS-Protection** | `1; mode=block` | Activa filtro XSS del navegador |
| **Strict-Transport-Security** | `max-age=31536000` | Fuerza HTTPS |
| **Content-Security-Policy** | Ver arriba | Controla recursos permitidos |
| **Referrer-Policy** | `no-referrer` | No envía referrer a otros sitios |

**Ejemplo de Response Headers:**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
```

---

## Validación de Datos

### Zod Schema Validation

Toda entrada de datos se valida con Zod:

```typescript
// src/modules/auth/auth.schema.ts

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username must contain only letters, numbers, and underscores'),

  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});
```

### Middleware de Validación

```typescript
// src/shared/middleware/validation.middleware.ts

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);  // Valida y lanza error si inválido
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ResponseUtil.badRequest(res, 'Validation failed', error.errors);
      }
      next(error);
    }
  };
};

// Uso en rutas:
router.post('/register',
  validateRequest(registerSchema),  // ← Valida ANTES del controller
  authController.register
);
```

### Beneficios

✅ **Type Safety:** TypeScript infiere tipos automáticamente
✅ **Sanitización:** Transforma datos (ej: email a lowercase)
✅ **Mensajes de Error:** Claros y específicos
✅ **Previene Ataques:** Rechaza payloads maliciosos

---

## Logging y Monitoreo

### Pino Logger

```typescript
// src/shared/utils/logger.ts

import pino from 'pino';

const logger = pino({
  level: env.LOG_LEVEL,  // 'info' en prod, 'debug' en dev
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

export default logger;
```

### Logging de Seguridad

```typescript
// Ejemplo: Login fallido
logger.warn({
  event: 'LOGIN_FAILED',
  email: 'attacker@evil.com',
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
}, 'Failed login attempt');

// Ejemplo: Token expirado
logger.info({
  event: 'TOKEN_EXPIRED',
  userId: user.id,
  timestamp: new Date().toISOString()
}, 'Access token expired, refresh needed');

// Ejemplo: Operación sensible
logger.info({
  event: 'USER_VERIFIED',
  adminId: admin.id,
  userId: user.id,
  timestamp: new Date().toISOString()
}, 'User verified by admin');
```

### Eventos de Seguridad a Monitorear

| Evento | Nivel | Descripción |
|--------|-------|-------------|
| `LOGIN_FAILED` | WARN | Intento de login fallido |
| `MULTIPLE_LOGIN_FAILURES` | ERROR | 5+ fallos consecutivos |
| `TOKEN_EXPIRED` | INFO | Token expirado (normal) |
| `INVALID_TOKEN` | WARN | Token inválido/manipulado |
| `ROLE_ESCALATION_ATTEMPT` | ERROR | Intento de elevar privilegios |
| `SENSITIVE_OPERATION` | INFO | Operaciones críticas (ej: cambio de rol) |
| `UNUSUAL_ACTIVITY` | WARN | Actividad sospechosa |

---

## Mejores Prácticas de Desarrollo

### 1. Principio de Mínimo Privilegio

```typescript
// ❌ NO dar permisos innecesarios
router.get('/users', authController.getAllUsers);

// ✅ Requerir rol específico
router.get('/users',
  authenticateToken,
  requireRoles(Role.ADMIN),  // Solo ADMIN
  authController.getAllUsers
);
```

---

### 2. Validar Siempre en el Backend

```typescript
// ❌ Confiar en validación del frontend
// Frontend puede ser bypasseado

// ✅ Validar en CADA endpoint del backend
router.post('/products',
  authenticateToken,
  validateRequest(createProductSchema),  // ← SIEMPRE validar
  productController.create
);
```

---

### 3. Sanitizar Salidas

```typescript
// Método toDTO() en entidades para controlar qué se expone

class User {
  id: string;
  email: string;
  password: string;  // ← NUNCA exponer

  toDTO() {
    return {
      id: this.id,
      email: this.email,
      // password NO se incluye
    };
  }
}

// En controller:
res.json({ data: user.toDTO() });  // ✅ Seguro
```

---

### 4. Manejo de Errores Seguro

```typescript
// ❌ Exponer detalles internos
catch (error) {
  res.status(500).json({
    error: error.message,     // "MongoError: Connection failed at 192.168.1.5:27017"
    stack: error.stack        // ← NUNCA exponer en producción
  });
}

// ✅ Mensaje genérico, log detallado
catch (error) {
  logger.error({ err: error }, 'Internal server error');
  res.status(500).json({
    error: 'Internal server error'  // Mensaje genérico
  });
}
```

---

### 5. Mantener Dependencias Actualizadas

```bash
# Revisar vulnerabilidades
npm audit

# Actualizar dependencias
npm update

# Revisar CVEs (Common Vulnerabilities and Exposures)
npm audit fix
```

---

### 6. Variables de Entorno Seguras

```bash
# ❌ NO hacer
JWT_SECRET=123456

# ✅ Generar secreto seguro (min 32 caracteres)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: f4d8c9a7b2e1f6d4c9a7b2e1f6d4c9a7b2e1f6d4c9a7b2e1f6d4c9a7b2e1
```

---

### 7. HTTPS en Producción

```typescript
// Forzar HTTPS con middleware
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// Configurar Strict-Transport-Security (HSTS)
app.use(helmet.hsts({
  maxAge: 31536000,  // 1 año
  includeSubDomains: true,
  preload: true
}));
```

---

## Checklist de Seguridad

### Pre-Deployment

- [ ] `JWT_SECRET` es fuerte (min 32 caracteres aleatorios)
- [ ] `NODE_ENV=production` configurado
- [ ] HTTPS habilitado (certificado SSL/TLS válido)
- [ ] Rate limiting habilitado
- [ ] Headers de seguridad (Helmet) activos
- [ ] CORS configurado correctamente
- [ ] Email verification habilitado (`EMAIL_VERIFICATION_REQUIRED=true`)
- [ ] Logs configurados (nivel `warn` o `error`)
- [ ] Dependencias actualizadas (`npm audit` sin vulnerabilidades críticas)
- [ ] Base de datos con credenciales seguras

### Post-Deployment

- [ ] Monitorear logs de seguridad
- [ ] Revisar intentos de login fallidos
- [ ] Verificar certificados SSL antes de expiración
- [ ] Actualizar dependencias regularmente
- [ ] Backup de base de datos configurado

---

## Recursos Adicionales

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Helmet.js Docs:** https://helmetjs.github.io/
- **Argon2 Specs:** https://github.com/P-H-C/phc-winner-argon2
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725

---

**Última actualización**: 2025-10-16
