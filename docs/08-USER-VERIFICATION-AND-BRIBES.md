# User Verification & Bribes - TGS Backend

## Índice
- [User Verification](#user-verification)
  - [Solicitar Verificación](#solicitar-verificación)
  - [Aprobar Verificación](#aprobar-verificación)
  - [Rechazar Verificación](#rechazar-verificación)
  - [Estado de Verificación](#estado-de-verificación)
- [Bribes (Sobornos)](#bribes-sobornos)
  - [Estructura de Datos](#estructura-de-datos)
  - [Buscar Bribes](#buscar-bribes)
  - [Pagar Bribe](#pagar-bribe)
  - [Pago Parcial](#pago-parcial)

---

## User Verification

El sistema de verificación de usuario valida toda la información personal (DNI, nombre, email, teléfono, dirección) mediante aprobación manual de un administrador.

### Solicitar Verificación

```http
POST /api/user-verification/request
Content-Type: application/json

{
  "email": "thomas.shelby@shelbyltd.co.uk"
}
```

**Respuesta Exitosa (201 Created):**

```json
{
  "success": true,
  "message": "User verification request submitted successfully",
  "data": {
    "id": 1,
    "email": "thomas.shelby@shelbyltd.co.uk",
    "expiresAt": "2025-11-16T12:00:00Z",
    "emailSent": true
  }
}
```

**Validaciones:**
- El usuario debe tener su email verificado
- Debe tener información personal completa
- No puede tener otra solicitud pendiente

---

### Aprobar Verificación (👤 ADMIN)

```http
POST /api/user-verification/admin/approve/:email
```

**Ejemplo:**

```http
POST /api/user-verification/admin/approve/thomas.shelby@shelbyltd.co.uk
```

**Respuesta Exitosa (200 OK):**

```json
{
  "success": true,
  "message": "User verification approved successfully",
  "data": {
    "email": "thomas.shelby@shelbyltd.co.uk",
    "verifiedAt": "2025-11-15T12:30:00Z",
    "user": {
      "id": "uuid-123",
      "isVerified": true,
      "profileCompleteness": 100,
      "canPurchase": true
    }
  }
}
```

**Validaciones Automáticas:**
- Verifica que el email no esté duplicado
- Verifica que el DNI sea único en el sistema
- Actualiza `User.isVerified = true`
- Recalcula `profileCompleteness`
- Envía email de bienvenida

---

### Rechazar Verificación (👤 ADMIN)

```http
POST /api/user-verification/admin/reject/:email
Content-Type: application/json

{
  "reason": "Incomplete personal information. Please provide valid DNI and address."
}
```

**Ejemplo:**

```http
POST /api/user-verification/admin/reject/suspicious.user@example.com
```

**Respuesta Exitosa (200 OK):**

```json
{
  "success": true,
  "message": "User verification rejected successfully",
  "data": {
    "id": 1,
    "token": "01936c2a-8b9e-7e8f-b123-456789abcdef",
    "email": "user@example.com",
    "status": "pending",
    "expiresAt": "2025-11-16T12:00:00Z",
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": "2025-11-15T10:00:00Z",
    "updatedAt": "2025-11-15T12:30:00Z",
    "verifiedAt": null
  }
}
```

**Comportamiento:**
- Incrementa el contador de `attempts`
- Si `attempts >= maxAttempts` (3), marca como `EXPIRED`
- Si `attempts < maxAttempts`, mantiene como `PENDING`
- Limpia el cooldown cache para permitir reintento inmediato
- Retorna la verificación actualizada

**Estados posibles:**
- `pending`: Puede reintentar (attempts < 3)
- `expired`: No puede reintentar (attempts >= 3)

---

### Estado de Verificación

```http
GET /api/user-verification/status/:email
```

**Ejemplo:**

```http
GET /api/user-verification/status/thomas.shelby@shelbyltd.co.uk
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "User verification status retrieved",
  "data": {
    "email": "thomas.shelby@shelbyltd.co.uk",
    "status": "pending",
    "verifiedAt": null,
    "expiresAt": "2025-11-16T12:00:00Z",
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": "2025-11-15T10:00:00Z"
  }
}
```

---

## Bribes (Sobornos)

Los sobornos son pagos realizados a autoridades. El sistema maneja pagos totales y parciales.

### Estructura de Datos

La entidad `Bribe` tiene los siguientes campos:

```typescript
{
  id: number,
  totalAmount: number,      // Monto total del soborno
  paidAmount: number,       // Monto pagado hasta ahora
  pendingAmount: number,    // Getter: totalAmount - paidAmount
  paid: boolean,            // Getter: paidAmount >= totalAmount
  creationDate: Date,
  authority: Authority,
  sale: Sale
}
```

**Importante:**
- `paid` es un **getter calculado**, no una columna de base de datos
- Se calcula como: `paidAmount >= totalAmount`
- `pendingAmount` también es un getter: `totalAmount - paidAmount`

---

### Buscar Bribes

```http
GET /api/bribes/search
```

**Query Parameters:**

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `paid` | `'true'` \| `'false'` | Filtrar por estado de pago | `paid=true` |
| `date` | ISO 8601 | Fecha para filtrar | `date=2025-11-15` |
| `type` | `'exact'` \| `'before'` \| `'after'` \| `'between'` | Tipo de búsqueda por fecha | `type=exact` |
| `endDate` | ISO 8601 | Fecha fin (solo para `type=between`) | `endDate=2025-11-20` |
| `page` | number | Número de página (default: 1) | `page=2` |
| `limit` | number | Items por página (default: 10, max: 100) | `limit=20` |

**Ejemplos:**

```http
# Sobornos completamente pagados
GET /api/bribes/search?paid=true

# Sobornos pendientes de pago
GET /api/bribes/search?paid=false

# Sobornos de una fecha específica
GET /api/bribes/search?date=2025-11-15&type=exact

# Sobornos en un rango de fechas
GET /api/bribes/search?date=2025-11-01&type=between&endDate=2025-11-30
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "Found 5 bribes",
  "data": [
    {
      "id": 1,
      "totalAmount": 1000.00,
      "paidAmount": 1000.00,
      "pendingAmount": 0.00,
      "paid": true,
      "creationDate": "2025-11-15T10:00:00Z",
      "authority": {
        "dni": "12345678",
        "name": "Inspector Campbell"
      },
      "sale": {
        "id": 42
      }
    },
    {
      "id": 2,
      "totalAmount": 500.00,
      "paidAmount": 200.00,
      "pendingAmount": 300.00,
      "paid": false,
      "creationDate": "2025-11-14T15:30:00Z",
      "authority": {
        "dni": "87654321",
        "name": "Major Campbell"
      },
      "sale": {
        "id": 43
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

**Nota Técnica:**
La búsqueda por `paid` usa SQL raw para comparar columnas:
- `paid=true`: `paid_amount >= total_amount`
- `paid=false`: `paid_amount < total_amount`

---

### Pagar Bribe (Completo)

```http
PUT /api/bribes/:id/pay
```

**Ejemplo:**

```http
PUT /api/bribes/1/pay
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "Bribe paid successfully",
  "data": {
    "id": 1,
    "paid": true,
    "totalAmount": 1000.00,
    "paidAmount": 1000.00,
    "pendingAmount": 0.00
  }
}
```

**Efecto:**
- Establece `paidAmount = totalAmount`
- El getter `paid` retorna `true` automáticamente

---

### Pago Parcial

```http
PATCH /api/bribes/:id/pay-amount
Content-Type: application/json

{
  "amount": 250.00
}
```

**Ejemplo:**

```http
PATCH /api/bribes/2/pay-amount
Content-Type: application/json

{
  "amount": 250.00
}
```

**Respuesta (200 OK):**

```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": 2,
    "totalAmount": 500.00,
    "paidAmount": 450.00,
    "pendingAmount": 50.00,
    "paid": false,
    "paymentMade": 250.00
  }
}
```

**Validaciones:**
- `amount` debe ser mayor a 0
- `amount` no puede exceder `pendingAmount`
- Si el pago completa el total, `paid` se vuelve `true` automáticamente

---

## Migración de Base de Datos

### Cambios en la tabla `bribes`

La tabla `bribes` sufrió los siguientes cambios:

**Antes:**
```sql
- amount NUMERIC(10,2)
- paid BOOLEAN
```

**Ahora:**
```sql
- total_amount NUMERIC(10,2)
- paid_amount NUMERIC(10,2) DEFAULT 0
```

**Migración SQL (Ya aplicada):**

```sql
-- Renombrar columna amount a total_amount
ALTER TABLE "bribes" RENAME COLUMN "amount" TO "total_amount";

-- Agregar columna paid_amount con valor por defecto 0
ALTER TABLE "bribes" ADD COLUMN "paid_amount" NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Actualizar registros existentes: si paid era true, copiar total_amount a paid_amount
UPDATE "bribes" SET "paid_amount" = "total_amount" WHERE "paid" = true;

-- Eliminar columna paid (ahora es un getter calculado)
ALTER TABLE "bribes" DROP COLUMN "paid";
```

---

## Códigos de Error Comunes

### User Verification

| Código | Error | Solución |
|--------|-------|----------|
| `403` | Email not verified | Verificar email antes de solicitar verificación |
| `404` | Verification request not found | Crear nueva solicitud |
| `409` | Verification already pending | Esperar aprobación/rechazo o que expire |
| `409` | Duplicate DNI | El DNI ya está registrado en el sistema |

### Bribes

| Código | Error | Solución |
|--------|-------|----------|
| `400` | Payment exceeds pending amount | Verificar `pendingAmount` antes de pagar |
| `404` | Bribe not found | Verificar ID del bribe |

---

**Última actualización**: 2025-11-15
