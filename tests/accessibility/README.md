# API Accessibility Tests

Pruebas de accesibilidad y usabilidad de la API del backend TGS.

---

## Descripción General

Estos tests verifican que la API sea **fácil de usar, consistente y predecible** para los desarrolladores frontend y otros consumidores de la API.

**Aspectos validados**:
- ✅ Formato de respuestas consistente
- ✅ Mensajes de error descriptivos
- ✅ Metadata de paginación completa
- ✅ Formatos de datos estándares (ISO 8601, UTF-8)
- ✅ Tipos de datos consistentes
- ✅ Códigos de estado HTTP correctos

---

## Estructura de Tests

```
tests/accessibility/
├── api-response-format.test.ts    # Formato de respuestas
├── error-messages.test.ts         # Mensajes de error
├── metadata-validation.test.ts    # Metadata y paginación
└── README.md                      # Esta documentación
```

---

## Tests Implementados

### 1. API Response Format (`api-response-format.test.ts`)

**Propósito**: Verificar que todas las respuestas sigan el mismo formato estándar.

**Casos de prueba**:
- ✅ Respuestas exitosas tienen estructura `{ success: true, data: {...}, meta?: {...} }`
- ✅ Respuestas de error tienen estructura `{ success: false, error: {...} }`
- ✅ Códigos de estado HTTP correctos (200, 201, 204, 400, 401, 403, 404)
- ✅ Content-Type siempre es `application/json`
- ✅ Formato consistente para GET, POST, PATCH, DELETE

**Ejemplo de respuesta exitosa esperada**:
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Product Name",
    "price": 100
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

**Ejemplo de respuesta de error esperada**:
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed: name is required",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```

---

### 2. Error Messages (`error-messages.test.ts`)

**Propósito**: Verificar que los mensajes de error sean claros, descriptivos y útiles.

**Casos de prueba**:
- ✅ Errores de validación incluyen detalles específicos por campo
- ✅ Errores de autenticación son claros (missing token, invalid token, expired token)
- ✅ Errores de autorización explican permisos faltantes
- ✅ Errores 404 especifican qué recurso no se encontró
- ✅ No se expone información sensible (stack traces, SQL queries)
- ✅ Mensajes consistentes en idioma
- ✅ Rate limit errors son claros

**Ejemplos de mensajes de error**:

✅ **BUENO**:
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters long"
      }
    ]
  }
}
```

❌ **MALO**:
```json
{
  "error": "Invalid input"
}
```

---

### 3. Metadata Validation (`metadata-validation.test.ts`)

**Propósito**: Verificar que la metadata de paginación y otros metadatos sean correctos.

**Casos de prueba**:

#### Paginación
- ✅ Incluye `page`, `limit`, `total`, `totalPages`
- ✅ Incluye `hasNextPage` y `hasPreviousPage` (booleanos)
- ✅ Tipos de datos correctos (números)
- ✅ Cálculo correcto de `totalPages`
- ✅ Respeta límite máximo de página (ej: 100 items)
- ✅ Maneja páginas fuera de rango correctamente
- ✅ Valores por defecto cuando no se especifica paginación

#### Formatos de Datos
- ✅ Fechas en formato ISO 8601 (`2025-11-05T10:30:00.000Z`)
- ✅ URLs completas para recursos relacionados
- ✅ Tipos de datos consistentes (números, booleanos, strings)
- ✅ `null` para campos opcionales ausentes (no `undefined`)
- ✅ Arrays vacíos en lugar de `null` para listas

#### Encoding
- ✅ UTF-8 para caracteres especiales (ñ, á, é, etc.)
- ✅ HTML/JS escapado correctamente (prevención XSS)

**Ejemplo de metadata completa**:
```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 10,
    "total": 47,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

---

## Ejecución de Tests

### Ejecutar todos los tests de accesibilidad

```bash
# Usando pnpm
pnpm run test:accessibility

# Usando npm
npm run test:accessibility

# Usando Jest directamente
npx jest tests/accessibility
```

### Ejecutar test específico

```bash
# Test de formato de respuestas
pnpm run test:accessibility -- api-response-format.test.ts

# Test de mensajes de error
pnpm run test:accessibility -- error-messages.test.ts

# Test de metadata
pnpm run test:accessibility -- metadata-validation.test.ts
```

### Modo watch (desarrollo)

```bash
pnpm run test:accessibility -- --watch
```

### Con coverage

```bash
pnpm run test:accessibility -- --coverage
```

---

## Prerequisitos

### 1. Backend Corriendo

```bash
# Iniciar backend en modo desarrollo
pnpm run start:dev

# O en modo test
pnpm run start:test
```

### 2. Base de Datos con Datos de Prueba

```bash
# Ejecutar migraciones
pnpm run db:migrate

# Ejecutar seeds de prueba
pnpm run db:seed:test
```

**Usuarios de prueba necesarios**:
- `admin@test.com` (ADMIN) - Password: `TestPassword123`
- `seller@test.com` (VENDEDOR) - Password: `TestPassword123`
- `viewer@test.com` (VISUALIZADOR) - Password: `TestPassword123`

---

## Integración con CI/CD

### GitHub Actions

Estos tests se ejecutan automáticamente en cada PR y push a main:

```yaml
- name: Run Accessibility Tests
  run: pnpm run test:accessibility
  env:
    NODE_ENV: test
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Umbrales de Cobertura

| Métrica | Umbral |
|---------|--------|
| Statements | ≥ 80% |
| Branches | ≥ 75% |
| Functions | ≥ 80% |
| Lines | ≥ 80% |

---

## Buenas Prácticas Verificadas

### 1. Formato de Respuesta Consistente

✅ **Todas las respuestas exitosas**:
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}
```

✅ **Todas las respuestas de error**:
```typescript
interface ErrorResponse {
  success: false;
  error: {
    statusCode: number;
    message: string;
    details?: ValidationError[];
  };
}
```

### 2. Códigos de Estado HTTP

| Código | Uso | Ejemplo |
|--------|-----|---------|
| 200 | Éxito en GET/PATCH | `GET /api/products` |
| 201 | Recurso creado | `POST /api/products` |
| 204 | Éxito sin contenido | `DELETE /api/products/123` |
| 400 | Error de validación | Campos inválidos |
| 401 | No autenticado | Token faltante/inválido |
| 403 | No autorizado | Permisos insuficientes |
| 404 | Recurso no encontrado | `/api/products/999` |
| 409 | Conflicto | Email duplicado |
| 429 | Rate limit excedido | Demasiadas peticiones |
| 500 | Error interno | Error inesperado |

### 3. Metadata de Paginación

Siempre incluir estos campos:
```typescript
interface PaginationMeta {
  page: number;           // Página actual (1-indexed)
  limit: number;          // Items por página
  total: number;          // Total de items
  totalPages: number;     // Total de páginas
  hasNextPage: boolean;   // ¿Hay siguiente página?
  hasPreviousPage: boolean; // ¿Hay página anterior?
}
```

### 4. Formatos de Datos

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Fecha | ISO 8601 | `2025-11-05T10:30:00.000Z` |
| UUID | RFC 4122 | `123e4567-e89b-12d3-a456-426614174000` |
| Email | RFC 5322 | `user@example.com` |
| URL | Completa | `https://api.example.com/products/123` |
| Moneda | Number | `99.99` (no `"$99.99"`) |
| Booleano | Boolean | `true` (no `1`, `"true"`) |

### 5. Mensajes de Error

✅ **Descriptivos**:
```json
{
  "message": "Validation failed: email must be a valid email address"
}
```

❌ **Vagos**:
```json
{
  "message": "Invalid input"
}
```

---

## Troubleshooting

### Error: "Cannot connect to database"

**Causa**: Base de datos no está corriendo o variables de entorno incorrectas.

**Solución**:
```bash
# Verificar variables de entorno
cat .env.test

# Iniciar base de datos
docker-compose up -d postgres

# Verificar conexión
psql -U postgres -d tgs_backend_test -c "SELECT 1;"
```

---

### Error: "User not found: admin@test.com"

**Causa**: Seeds de prueba no se ejecutaron.

**Solución**:
```bash
# Ejecutar seeds de prueba
pnpm run db:seed:test

# Verificar usuarios
psql -U postgres -d tgs_backend_test -c "SELECT email, role FROM users WHERE email LIKE '%test.com';"
```

---

### Tests Fallan por Timeout

**Causa**: Backend no responde o base de datos lenta.

**Solución**:
```bash
# Aumentar timeout en Jest config
# jest.config.js
module.exports = {
  testTimeout: 30000 // 30 segundos
};
```

---

### Warnings sobre "open handles"

**Causa**: Conexiones no cerradas correctamente.

**Solución**:
```bash
# Ejecutar con --detectOpenHandles
pnpm run test:accessibility -- --detectOpenHandles

# Asegurar que se cierra la conexión en afterAll
afterAll(async () => {
  await app.close();
  await orm.close();
});
```

---

## Checklist de Accesibilidad de API

Usa este checklist para verificar nuevos endpoints:

- [ ] Respuestas siguen formato estándar (`{ success, data, meta }`)
- [ ] Errores incluyen `statusCode`, `message` y `details`
- [ ] Códigos de estado HTTP correctos
- [ ] Paginación incluye todos los campos (`page`, `limit`, `total`, etc.)
- [ ] Fechas en formato ISO 8601
- [ ] Tipos de datos consistentes (números, booleanos, strings)
- [ ] Campos opcionales son `null`, no `undefined`
- [ ] Arrays vacíos en lugar de `null` para listas
- [ ] Content-Type es `application/json`
- [ ] Mensajes de error descriptivos
- [ ] No se expone información sensible
- [ ] UTF-8 para caracteres especiales
- [ ] HTML/JS escapado correctamente

---

## Recursos

**REST API Best Practices**:
- https://restfulapi.net/
- https://swagger.io/resources/articles/best-practices-in-api-design/

**HTTP Status Codes**:
- https://httpstatuses.com/
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

**API Design Guidelines**:
- https://github.com/microsoft/api-guidelines
- https://cloud.google.com/apis/design

**ISO 8601 (Dates)**:
- https://www.iso.org/iso-8601-date-and-time-format.html

---

**Última actualización**: 5 de Noviembre, 2025
**Mantenido por**: Equipo de Backend TGS

---

🤖 **Generated with [Claude Code](https://claude.com/claude-code)**

Co-Authored-By: Claude <noreply@anthropic.com>
