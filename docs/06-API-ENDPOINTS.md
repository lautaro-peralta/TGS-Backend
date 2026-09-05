# API Endpoints - TGS Backend

## Índice

- [Convenciones y Estándares](#convenciones-y-estándares)
- [Autenticación](#autenticación)
- [Gestión de Usuarios](#gestión-de-usuarios)
- [Clientes](#clientes)
- [Productos](#productos)
- [Ventas](#ventas)
- [Zonas](#zonas)
- [Distribuidores](#distribuidores)
- [Entidades del Consejo](#entidades-del-consejo)
- [Códigos de Estado HTTP](#códigos-de-estado-http)

---

## Convenciones y Estándares

### Base URL

```
Development:  http://localhost:3000
Production:   https://tgs-backend-u5xz.onrender.com
```

### Formato de Respuesta Estándar

Todas las respuestas siguen el formato:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-16T12:00:00.000Z",
    "statusCode": 200
  }
}
```

**Respuesta de Error:**

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "VALIDATION_ERROR"
    }
  ],
  "meta": {
    "timestamp": "2025-10-16T12:00:00.000Z",
    "statusCode": 400
  }
}
```

### Headers Requeridos

| Header         | Valor              | Cuándo               |
| -------------- | ------------------ | -------------------- |
| `Content-Type` | `application/json` | En requests con body |

### Autenticación

Los endpoints protegidos requieren un JWT válido enviado como cookie HTTP-Only. Las cookies se envían **automáticamente** por el navegador después de iniciar sesión, no necesitas configurarlas manualmente en cada request.

**Símbolos en la documentación:**

- 🔓 Endpoint público (sin autenticación)
- 🔒 Endpoint protegido (requiere autenticación)
- 👤 Requiere rol específico

---

## Autenticación

### 🔓 Registrar Usuario

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "thomas",
  "email": "thomas@shelby.com",
  "password": "SecurePass123!"
}
```

**Respuesta Exitosa (201 Created):**

```json
{
  "success": true,
  "message": "User created successfully. Please verify your email.",
  "data": {
    "id": "uuid-123",
    "username": "thomas",
    "email": "thomas@shelby.com",
    "roles": ["USER"],
    "emailVerified": false,
    "verificationRequired": true,
    "expiresAt": "2025-10-17T12:00:00Z"
  }
}
```

**Validaciones:**

- `username`: 3-50 caracteres
- `email`: Formato de email válido, único
- `password`: Mínimo 8 caracteres

---

### 🔓 Iniciar Sesión

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "thomas@shelby.com",
  "password": "SecurePass123!"
}
```

**Respuesta Exitosa (200 OK + Cookies):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": "uuid-123",
    "username": "thomas",
    "email": "thomas@shelby.com",
    "roles": ["USER"],
    "isActive": true,
    "isVerified": false,
    "emailVerified": true,
    "profileCompleteness": 25,
    "lastLoginAt": "2025-10-16T12:00:00Z",
    "hasPersonalInfo": false
  }
}
```

**Cookies Establecidas:**

- `access_token` (15 min de vida)
- `refresh_token` (7 días de vida)

**Errores Comunes:**

- `401`: Credenciales inválidas
- `403`: Email no verificado (si `EMAIL_VERIFICATION_REQUIRED=true`)

---

### 🔒 Cerrar Sesión

```http
POST /api/auth/logout
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Efecto:**

- Revoca refresh token en la base de datos
- Limpia cookies `access_token` y `refresh_token`

---

### 🔓 Renovar Token

```http
POST /api/auth/refresh
```

**Nota:** La cookie `refresh_token` se envía automáticamente.

**Respuesta (200 OK + Nuevas Cookies):**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": { ...user data... }
}
```

**Efecto:**

- Genera nuevo `access_token` (15 min)
- Rota `refresh_token` (nuevo token de 7 días)
- Revoca refresh token antiguo

---

### 🔒 Obtener Usuario Actual

```http
GET /api/auth/me
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "username": "thomas",
    "email": "thomas@shelby.com",
    "roles": ["USER"],
    "profileCompleteness": 25,
    "isVerified": false,
    "emailVerified": true,
    "hasPersonalInfo": false
  }
}
```

---

## Gestión de Usuarios

### 🔒 Listar Usuarios (👤 ADMIN)

```http
GET /api/users
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "username": "thomas",
      "email": "thomas@shelby.com",
      "roles": ["USER"],
      "isActive": true,
      "profileCompleteness": 25
    },
    ...
  ]
}
```

---

### 🔒 Obtener Usuario por ID (👤 ADMIN)

```http
GET /api/users/:id
```

**Ejemplo:**

```http
GET /api/users/uuid-123
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "username": "thomas",
    "email": "thomas@shelby.com",
    "roles": ["USER"],
    "isActive": true,
    "isVerified": false,
    "emailVerified": true,
    "profileCompleteness": 25,
    "createdAt": "2025-10-15T10:00:00Z",
    "updatedAt": "2025-10-16T12:00:00Z"
  }
}
```

---

### 🔒 Actualizar Información Personal

```http
PATCH /api/users/me/personal-info
Content-Type: application/json

{
  "dni": "12345678",
  "name": "Thomas Shelby",
  "email": "thomas@shelby.com",
  "phone": "+44 121 234 5678",
  "address": "Watery Lane, Birmingham"
}
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "Personal information updated successfully",
  "data": {
    "profileCompleteness": 75,
    "hasPersonalInfo": true,
    "canPurchase": false,
    "suggestions": [
      "Get your account verified by an administrator to enable purchases"
    ]
  }
}
```

---

### 🔒 Solicitar Cambio de Rol

```http
POST /api/role-requests
Content-Type: application/json

{
  "requestedRole": "CLIENT",
  "reason": "I want to purchase products"
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Role change request created successfully",
  "data": {
    "id": "request-uuid-1",
    "userId": "uuid-123",
    "requestedRole": "CLIENT",
    "status": "PENDING",
    "reason": "I want to purchase products",
    "createdAt": "2025-10-16T12:00:00Z"
  }
}
```

**Roles Disponibles:**

- `CLIENT`
- `DISTRIBUTOR`
- `PARTNER`
- `AUTHORITY`

---

## Clientes

### 🔒 Listar Clientes

```http
GET /api/clients
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "client-uuid-1",
      "dni": "12345678",
      "name": "Thomas Shelby",
      "email": "thomas@shelby.com",
      "phone": "+44 121 234 5678",
      "address": "Watery Lane, Birmingham"
    },
    ...
  ]
}
```

---

### 🔒 Obtener Cliente por ID

```http
GET /api/clients/:id
```

**Ejemplo:**

```http
GET /api/clients/client-uuid-1
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "client-uuid-1",
    "dni": "12345678",
    "name": "Thomas Shelby",
    "email": "thomas@shelby.com",
    "phone": "+44 121 234 5678",
    "address": "Watery Lane, Birmingham",
    "purchases": [
      {
        "id": "sale-uuid-1",
        "date": "2025-10-15T10:00:00Z",
        "amount": 1500.5,
        "description": "Whisky order"
      }
    ]
  }
}
```

---

### 🔒 Crear Cliente (👤 ADMIN)

```http
POST /api/clients
Content-Type: application/json

{
  "dni": "87654321",
  "name": "Arthur Shelby",
  "email": "arthur@shelby.com",
  "phone": "+44 121 234 9999",
  "address": "Small Heath, Birmingham"
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {
    "id": "client-uuid-2",
    "dni": "87654321",
    "name": "Arthur Shelby",
    ...
  }
}
```

---

## Productos

### 🔒 Listar Productos

```http
GET /api/products
```

**Query Parameters (Opcionales):**

- `isIllegal=true` - Filtrar productos ilegales
- `minPrice=100` - Precio mínimo
- `maxPrice=500` - Precio máximo

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "product-uuid-1",
      "description": "Premium Whisky",
      "detail": "Aged 12 years",
      "price": 150.0,
      "stock": 50,
      "isIllegal": false
    },
    {
      "id": "product-uuid-2",
      "description": "Contraband Tobacco",
      "detail": "Premium quality",
      "price": 75.0,
      "stock": 200,
      "isIllegal": true
    }
  ]
}
```

---

### 🔒 Obtener Producto por ID

```http
GET /api/products/:id
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "product-uuid-1",
    "description": "Premium Whisky",
    "detail": "Aged 12 years",
    "price": 150.0,
    "stock": 50,
    "isIllegal": false,
    "distributorsCount": 5,
    "detailsCount": 120
  }
}
```

---

### 🔒 Crear Producto (👤 ADMIN, DISTRIBUTOR)

```http
POST /api/products
Content-Type: application/json

{
  "description": "Irish Whisky",
  "detail": "Smooth and refined",
  "price": 200.00,
  "stock": 30,
  "isIllegal": false
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "product-uuid-3",
    "description": "Irish Whisky",
    "price": 200.0,
    "stock": 30,
    "isIllegal": false
  }
}
```

---

### 🔒 Actualizar Producto

```http
PATCH /api/products/:id
Content-Type: application/json

{
  "price": 180.00,
  "stock": 45
}
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": "product-uuid-3",
    "description": "Irish Whisky",
    "price": 180.0,
    "stock": 45
  }
}
```

---

## Ventas

### 🔒 Listar Ventas

```http
GET /api/sales
```

**Query Parameters (Opcionales):**

- `clientId=uuid` - Filtrar por cliente
- `distributorId=uuid` - Filtrar por distribuidor
- `startDate=2025-10-01` - Fecha inicio
- `endDate=2025-10-31` - Fecha fin

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "sale-uuid-1",
      "description": "Whisky order",
      "date": "2025-10-15T10:00:00Z",
      "amount": 1500.5,
      "client": {
        "id": "client-uuid-1",
        "name": "Thomas Shelby"
      },
      "distributor": {
        "id": "dist-uuid-1",
        "name": "John Doe"
      },
      "details": [
        {
          "id": "detail-uuid-1",
          "product": {
            "id": "product-uuid-1",
            "description": "Premium Whisky"
          },
          "quantity": 10,
          "unitPrice": 150.0,
          "subtotal": 1500.0
        }
      ]
    }
  ]
}
```

---

### 🔒 Crear Venta (👤 DISTRIBUTOR, ADMIN)

```http
POST /api/sales
Content-Type: application/json

{
  "description": "Monthly order",
  "saleDate": "2025-10-16T12:00:00Z",
  "distributorId": "dist-uuid-1",
  "clientId": "client-uuid-1",
  "authorityId": "auth-uuid-1",
  "details": [
    {
      "productId": "product-uuid-1",
      "quantity": 10,
      "unitPrice": 150.00
    },
    {
      "productId": "product-uuid-2",
      "quantity": 5,
      "unitPrice": 75.00
    }
  ]
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "id": "sale-uuid-2",
    "description": "Monthly order",
    "date": "2025-10-16T12:00:00Z",
    "amount": 1875.00,
    "details": [...]
  }
}
```

**Validaciones:**

- `distributorId`: Requerido, debe existir
- `details`: Mínimo 1 producto
- `quantity`: Mayor a 0
- `unitPrice`: Mayor a 0
- Stock suficiente para cada producto

---

## Zonas

### 🔒 Listar Zonas

```http
GET /api/zones
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "zone-uuid-1",
      "name": "Birmingham",
      "isHeadquarters": true
    },
    {
      "id": "zone-uuid-2",
      "name": "London",
      "isHeadquarters": false
    }
  ]
}
```

---

### 🔒 Crear Zona (👤 ADMIN)

```http
POST /api/zones
Content-Type: application/json

{
  "name": "Manchester",
  "isHeadquarters": false
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Zone created successfully",
  "data": {
    "id": "zone-uuid-3",
    "name": "Manchester",
    "isHeadquarters": false
  }
}
```

---

## Distribuidores

### 🔒 Listar Distribuidores

```http
GET /api/distributors
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "dist-uuid-1",
      "dni": "11223344",
      "name": "John Distributor",
      "email": "john@dist.com",
      "phone": "+44 121 555 1234",
      "address": "Birmingham, UK",
      "commission": 0.15,
      "zone": {
        "id": "zone-uuid-1",
        "name": "Birmingham"
      }
    }
  ]
}
```

---

### 🔒 Crear Distribuidor (👤 ADMIN)

```http
POST /api/distributors
Content-Type: application/json

{
  "dni": "99887766",
  "name": "New Distributor",
  "email": "new@dist.com",
  "phone": "+44 121 555 9999",
  "address": "London, UK",
  "commission": 0.12,
  "zoneId": "zone-uuid-2"
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Distributor created successfully",
  "data": {
    "id": "dist-uuid-2",
    "name": "New Distributor",
    "commission": 0.12,
    ...
  }
}
```

---

## Entidades del Consejo

### 🔒 Listar Decisiones (👤 PARTNER, ADMIN)

```http
GET /api/decisions
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "decision-uuid-1",
      "description": "Expand to London market",
      "decisionDate": "2025-10-10T15:00:00Z",
      "isApproved": true,
      "topic": {
        "id": "topic-uuid-1",
        "name": "Market Expansion"
      },
      "partner": {
        "id": "partner-uuid-1",
        "name": "Thomas Shelby"
      }
    }
  ]
}
```

---

### 🔒 Crear Decisión (👤 PARTNER, ADMIN)

```http
POST /api/decisions
Content-Type: application/json

{
  "description": "Increase product prices by 10%",
  "decisionDate": "2025-10-16T12:00:00Z",
  "isApproved": false,
  "topicId": "topic-uuid-2",
  "partnerId": "partner-uuid-1"
}
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "message": "Decision created successfully",
  "data": {
    "id": "decision-uuid-2",
    "description": "Increase product prices by 10%",
    "isApproved": false,
    ...
  }
}
```

---

## Códigos de Estado HTTP

### Respuestas Exitosas

| Código           | Significado    | Uso                         |
| ---------------- | -------------- | --------------------------- |
| `200 OK`         | Éxito          | GET, PATCH, DELETE exitosos |
| `201 Created`    | Recurso creado | POST exitoso                |
| `204 No Content` | Sin contenido  | DELETE exitoso sin body     |

### Errores del Cliente

| Código                     | Significado     | Cuándo                    |
| -------------------------- | --------------- | ------------------------- |
| `400 Bad Request`          | Datos inválidos | Validación de Zod falla   |
| `401 Unauthorized`         | No autenticado  | Token faltante o inválido |
| `403 Forbidden`            | Sin permisos    | Usuario sin rol requerido |
| `404 Not Found`            | No encontrado   | Recurso no existe         |
| `409 Conflict`             | Conflicto       | Email/username duplicado  |
| `422 Unprocessable Entity` | Error de lógica | Stock insuficiente, etc.  |

### Errores del Servidor

| Código                      | Significado        | Cuándo                |
| --------------------------- | ------------------ | --------------------- |
| `500 Internal Server Error` | Error del servidor | Excepción no manejada |

---

## Paginación (Próximamente)

Actualmente no implementado, pero el patrón recomendado sería:

```http
GET /api/products?page=1&limit=20
```

**Respuesta:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Próximos Pasos

- **[Autenticación](05-AUTHENTICATION.md)** - Detalles del sistema de autenticación
- **[Seguridad](07-SECURITY.md)** - Medidas de seguridad implementadas
- **[Base de Datos](04-DATABASE.md)** - Estructura de datos

---

**Última actualización**: 2025-10-16
