# Scripts de Base de Datos - TGS Backend

Este directorio contiene scripts SQL para configurar y gestionar la base de datos en Neon Tech (PostgreSQL).

## Archivos

### `neon-schema.sql`

Script principal que crea toda la estructura de la base de datos (DDL - Data Definition Language).

**Contenido:**
- 25 tablas principales
- Índices optimizados para consultas
- Constraints y validaciones
- Triggers para actualización automática de timestamps
- 3 vistas útiles para consultas complejas
- Comentarios detallados en español

**Tablas creadas:**

#### Autenticación y Usuarios
- `users` - Usuarios del sistema con autenticación JWT
- `persons` - Información personal base
- `refresh_tokens` - Tokens de refresco para JWT
- `email_verifications` - Verificaciones automáticas de email
- `user_verifications` - Verificaciones manuales por admin
- `role_requests` - Solicitudes de roles especiales
- `notifications` - Notificaciones del sistema

#### Entidades del Negocio
- `distributors` - Distribuidores de productos
- `clients` - Clientes que realizan compras
- `partners` - Socios del negocio
- `authorities` - Autoridades con rangos
- `admins` - Administradores del sistema

#### Productos y Ventas
- `zones` - Zonas geográficas
- `products` - Catálogo de productos
- `distributors_products` - Productos por distribuidor (N:M)
- `sales` - Registro de ventas
- `sale_details` - Detalles de cada venta
- `bribes` - Sobornos a autoridades

#### Decisiones Estratégicas
- `topics` - Temas de discusión
- `strategic_decisions` - Decisiones estratégicas
- `strategic_decisions_users` - Usuarios en decisiones (N:M)
- `partners_decisions` - Socios en decisiones (N:M)
- `consejos_shelby` - Consejo Shelby (agregación)
- `monthly_reviews` - Revisiones mensuales
- `clandestine_agreements` - Acuerdos clandestinos

## Uso

### 1. Conectar a Neon Tech

```bash
# Obtener la connection string de Neon Tech dashboard
# Formato: postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### 2. Ejecutar el script de schema

#### Opción A: Usando psql (línea de comandos)

```bash
psql "postgresql://[connection-string]" -f scripts/neon-schema.sql
```

#### Opción B: Usando el dashboard de Neon Tech

1. Ir a la consola SQL del dashboard de Neon
2. Copiar el contenido de `neon-schema.sql`
3. Pegar y ejecutar

#### Opción C: Usando script npm

```bash
pnpm run schema:create
```

### 3. Verificar la creación

```sql
-- Ver todas las tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Contar registros en cada tabla
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Vistas Disponibles

### `v_sales_complete`
Vista completa de ventas con información de distribuidor, cliente, autoridad y zona.

```sql
SELECT * FROM v_sales_complete;
```

### `v_distributor_products`
Productos asignados a cada distribuidor con información de zona.

```sql
SELECT * FROM v_distributor_products WHERE zone_name = 'Centro';
```

### `v_user_stats`
Estadísticas de usuarios con completitud de perfil.

```sql
SELECT * FROM v_user_stats WHERE profile_completeness < 100;
```

## Notas Importantes

### Orden de Eliminación

Si necesitas eliminar la base de datos, usa este orden para evitar errores de foreign keys:

```sql
-- Opción 1: Eliminar todo el schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Opción 2: Eliminar tablas en orden inverso
-- (Ejecutar en el orden mostrado en el script, pero al revés)
```

### UUIDs

El sistema usa UUID v7 para:
- `users.id`
- `notifications.id`
- `role_requests.id`
- `refresh_tokens.id`

Esto requiere la extensión `uuid-ossp` que se crea automáticamente en el script.

### Triggers

Los siguientes triggers actualizan automáticamente `updated_at`:
- `users`
- `monthly_reviews`
- `user_verifications`

### Constraints Importantes

- **users.roles**: Array de roles (ADMIN, PARTNER, DISTRIBUTOR, CLIENT, USER, AUTHORITY)
- **authorities.rank**: Entre 0 y 3 (comisiones: 5%, 10%, 15%, 25%)
- **monthly_reviews**: Unique constraint en (year, month)
- **products**: Check constraints para price >= 0 y stock >= 0
- **bribes.paid_amount**: Debe ser <= total_amount

## Próximos Pasos

Después de crear el schema, puedes:

1. **Crear datos de prueba**: Ejecutar un script de seed con datos de ejemplo
2. **Configurar MikroORM**: Verificar que las entidades TypeScript coincidan con el schema
3. **Ejecutar migraciones**: Si usas MikroORM migrations, sincronizar el estado

## Troubleshooting

### Error: "extension uuid-ossp does not exist"
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "relation already exists"
El script usa `IF NOT EXISTS` para evitar este error. Si persiste, elimina las tablas primero.

### Error: "permission denied"
Verifica que tu usuario de Neon Tech tenga permisos de CREATE TABLE.

## Información de Contacto

Para más información sobre la estructura de la base de datos, consulta:
- Entidades TypeScript en `src/modules/*/`
- Configuración de MikroORM en `src/config/mikro-orm.config.ts`
