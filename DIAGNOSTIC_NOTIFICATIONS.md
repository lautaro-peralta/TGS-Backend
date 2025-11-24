# 🔍 Diagnóstico: "Failed to retrieve notifications"

## ✅ Verificaciones Completadas

### 1. Rutas Registradas Correctamente
- ✅ `notificationRouter` importado en `app.ts:45`
- ✅ Rutas montadas en `app.ts:608` como `/api/notifications`
- ✅ Middleware de autenticación aplicado en todas las rutas de usuario

### 2. Endpoint Específico
```typescript
GET /api/notifications/me
- Requiere autenticación (authMiddleware)
- Controller: notificationController.getMyNotifications
- Archivo: src/modules/notification/notification.controller.ts:111-133
```

## 🔴 Causas Más Probables del Error

### **Causa #1: Tabla `notification` no existe (CONFIRMADO)**
```
Error: relation "notification" does not exist
```

**Solución**: Ejecutar uno de estos comandos:

```bash
# Opción A: Script SQL directo
psql -U postgres -d tpdesarrollo < notification_table.sql

# Opción B: Script Node.js seguro
npm run build && npm run schema:update

# Opción C: MikroORM CLI
npm run build && npx mikro-orm schema:update --run
```

---

### **Causa #2: Usuario no autenticado**
```typescript
const userId = (req as any).user.id; // línea 113
```

Si `req.user` es `undefined`, causará error al intentar acceder a `.id`

**Verificar**:
- ¿La cookie de autenticación está siendo enviada?
- ¿El JWT es válido?
- ¿El token ha expirado (JWT_EXPIRES_IN=15m)?

**Solución**:
- Hacer login nuevamente para obtener nuevo token
- Verificar que el navegador esté enviando cookies

---

### **Causa #3: Error de conexión a la base de datos**
```typescript
const em = orm.em.fork(); // línea 112
```

**Verificar**:
```bash
# Verificar si PostgreSQL está corriendo
pg_isready

# Verificar conexión
psql -U postgres -d tpdesarrollo -c "SELECT 1;"
```

---

### **Causa #4: Entity `Notification` no registrada en MikroORM**

Verificar que la entidad esté en el array de entities:
```typescript
// src/shared/db/orm.config.ts:10-11
entities: ['dist/**/*.entity.js'],
entitiesTs: ['src/**/*.entity.ts'],
```

---

## 🧪 Cómo Diagnosticar el Problema Real

### Paso 1: Ver logs del servidor
```bash
# Buscar el error específico en los logs
tail -f logs/app.log | grep -i notification

# O si no hay archivo de log, ver consola del servidor
```

### Paso 2: Hacer petición con CURL
```bash
curl -X GET http://localhost:3000/api/notifications/me \
  -H "Cookie: token=TU_JWT_TOKEN" \
  -v
```

### Paso 3: Verificar que la tabla existe
```sql
-- Conectar a la base de datos
psql -U postgres -d tpdesarrollo

-- Listar todas las tablas
\dt

-- Ver estructura de la tabla notification
\d notification

-- Si no existe, crearla con:
-- (ver script SQL en este documento al final)
```

### Paso 4: Verificar autenticación
```bash
# Hacer login primero
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}' \
  -c cookies.txt

# Luego usar el token guardado
curl -X GET http://localhost:3000/api/notifications/me \
  -b cookies.txt
```

---

## 📊 Script SQL para Crear la Tabla

```sql
-- ============================================================================
-- TABLA DE NOTIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNREAD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP NULL,
    related_entity_id VARCHAR(255) NULL,
    related_entity_type VARCHAR(50) NULL,
    metadata JSONB NULL,
    user_id UUID NOT NULL,

    -- Foreign key constraint
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES "user"(id)
        ON DELETE CASCADE,

    -- Check constraints
    CONSTRAINT chk_notification_type
        CHECK (type IN (
            'USER_VERIFICATION_APPROVED',
            'USER_VERIFICATION_REJECTED',
            'ROLE_REQUEST_APPROVED',
            'ROLE_REQUEST_REJECTED',
            'SYSTEM'
        )),

    CONSTRAINT chk_notification_status
        CHECK (status IN ('UNREAD', 'READ')),

    CONSTRAINT chk_related_entity_type
        CHECK (related_entity_type IS NULL OR related_entity_type IN (
            'role-request',
            'user-verification',
            'system'
        ))
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_status ON notification(status);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_user_status ON notification(user_id, status);

-- Verificar que se creó correctamente
SELECT 'notification' as table_name, count(*) as row_count FROM notification;
```

---

## 🔧 Solución Rápida (Paso a Paso)

### 1. Crear la tabla de notificaciones
```bash
# Conectar a PostgreSQL
psql -U postgres -d tpdesarrollo

# Copiar y ejecutar el script SQL de arriba
```

### 2. Verificar que funcionó
```sql
-- Ver la tabla
\d notification

-- Debe mostrar la estructura de la tabla
```

### 3. Reiniciar el servidor
```bash
npm run start:dev
```

### 4. Probar el endpoint
```bash
# En tu navegador o Postman:
GET http://localhost:3000/api/notifications/me
```

---

## 📝 Errores Relacionados

| Error | Causa | Solución |
|-------|-------|----------|
| `relation "notification" does not exist` | Tabla no existe | Ejecutar script SQL |
| `Cannot read property 'id' of undefined` | Usuario no autenticado | Hacer login |
| `connect ECONNREFUSED` | PostgreSQL no está corriendo | Iniciar PostgreSQL |
| `password authentication failed` | Credenciales incorrectas | Verificar .env |
| `EntityManager is closed` | Error de ORM | Reiniciar servidor |

---

## 🎯 Próximos Pasos

1. ✅ **Identificar el error específico** - Ver logs del servidor
2. ✅ **Crear la tabla** - Ejecutar script SQL o `npm run schema:update`
3. ✅ **Verificar autenticación** - Hacer login y obtener token válido
4. ✅ **Probar endpoint** - Hacer petición GET a `/api/notifications/me`
5. ✅ **Crear notificación de prueba** - Aprobar/rechazar una verificación

---

## 📞 Información de Contacto de Debugging

**Archivo del controlador**: `src/modules/notification/notification.controller.ts:111-133`
**Archivo de rutas**: `src/modules/notification/notification.routes.ts:80-84`
**Entity**: `src/modules/notification/notification.entity.ts`
