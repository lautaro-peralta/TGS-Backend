# Base de Datos - TGS Backend

## Índice
- [Visión General](#visión-general)
- [Diagrama Entidad-Relación (ER)](#diagrama-entidad-relación-er)
- [Entidades Principales](#entidades-principales)
- [Relaciones entre Entidades](#relaciones-entre-entidades)
- [Configuración de MikroORM](#configuración-de-mikroorm)
- [Gestión de Esquemas](#gestión-de-esquemas)
- [Conceptos Avanzados](#conceptos-avanzados)

---

## Visión General

### Motor de Base de Datos

```
┌──────────────────────────────────────┐
│           MySQL 8.0+                 │
├──────────────────────────────────────┤
│ Charset: utf8mb4                     │
│ Collation: utf8mb4_unicode_ci       │
│ Engine: InnoDB (por defecto)        │
└──────────────────────────────────────┘
```

### ORM: MikroORM

**MikroORM** es el ORM (Object-Relational Mapping) utilizado para mapear objetos TypeScript a tablas de MySQL.

**Ventajas:**
- Type-safe: Aprovecha TypeScript para validación de tipos
- Data Mapper Pattern: Separa entidades de la lógica de persistencia
- Unit of Work: Gestiona automáticamente transacciones y cambios
- Identity Map: Evita duplicados y optimiza queries

```
┌─────────────────────────────────────────────────────────────┐
│                    MikroORM Workflow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TypeScript Entity (Code)                                   │
│         │                                                    │
│         │ MikroORM decorators (@Entity, @Property, etc.)   │
│         ▼                                                    │
│  Database Table (MySQL)                                     │
│                                                              │
│  ┌─────────────────┐        ┌─────────────────┐           │
│  │ Client.ts       │ ◄────► │ clients table   │           │
│  │ - id: string    │        │ - id VARCHAR    │           │
│  │ - name: string  │        │ - name VARCHAR  │           │
│  │ - email: string │        │ - email VARCHAR │           │
│  └─────────────────┘        └─────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Diagrama Entidad-Relación (ER)

### Diagrama Completo

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         TGS Database Schema                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│     User        │ ◄──┐
├─────────────────┤    │
│ PK: id (UUID)   │    │ 1:1
│ username        │    │
│ email (unique)  │    │
│ password        │    │
│ roles[]         │    │
│ isActive        │    │
│ isVerified      │    │
│ emailVerified   │    │
│ lastLoginAt     │    │
│ profileComplete │    │
│ createdAt       │    │
│ updatedAt       │    │
└─────────────────┘    │
                       │
                       │
┌─────────────────┐    │
│ BasePersonEntity│────┘
├─────────────────┤
│ PK: id (UUID)   │
│ dni (unique)    │
│ name            │
│ email           │
│ phone           │
│ address         │
└────────┬────────┘
         │
         │ Inheritance (extends)
         │
    ┌────┴─────┬──────────┬─────────────┬──────────────┐
    │          │          │             │              │
    ▼          ▼          ▼             ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐
│ Client │ │ Admin    │ │ Partner  │ │Distribut│ │Authority│
└───┬────┘ └──────────┘ └─────┬────┘ └────┬────┘ └────┬────┘
    │                          │           │           │
    │ 1:N                      │ N:M       │ 1:N       │ 1:N
    │                          │           │           │
    │                          │           │           │
    ▼                          ▼           ▼           ▼
┌─────────────────┐      ┌─────────────────┐    ┌─────────┐
│      Sale       │      │  ShelbyCouncil  │    │  Bribe  │
├─────────────────┤      ├─────────────────┤    └─────────┘
│ PK: id (UUID)   │      │ PK: id (UUID)   │
│ description     │      │ name            │
│ saleDate        │      │ foundedDate     │
│ saleAmount      │      └─────────────────┘
│ FK: clientId    │             │
│ FK: distributorId│            │ 1:N
│ FK: authorityId │             │
└────────┬────────┘             ▼
         │ 1:N         ┌─────────────────┐
         │             │ MonthlyReview   │
         ▼             ├─────────────────┤
┌─────────────────┐    │ PK: id (UUID)   │
│     Detail      │    │ reviewDate      │
├─────────────────┤    │ summary         │
│ PK: id (UUID)   │    │ FK: councilId   │
│ quantity        │    └─────────────────┘
│ unitPrice       │
│ subtotal        │           │ N:M
│ FK: saleId      │           │
│ FK: productId   │           ▼
└─────────────────┘    ┌─────────────────┐
         ▲             │     Topic       │
         │ 1:N         ├─────────────────┤
         │             │ PK: id (UUID)   │
┌─────────────────┐    │ name            │
│    Product      │    │ description     │
├─────────────────┤    └─────────────────┘
│ PK: id (UUID)   │
│ description     │           │ 1:N
│ detail          │           │
│ price           │           ▼
│ stock           │    ┌─────────────────┐
│ isIllegal       │    │    Decision     │
└─────┬───────────┘    ├─────────────────┤
      │                │ PK: id (UUID)   │
      │ N:M            │ description     │
      │                │ decisionDate    │
      ▼                │ isApproved      │
┌─────────────────┐    │ FK: topicId     │
│  Distributor    │    │ FK: partnerId   │
├─────────────────┤    └─────────────────┘
│ PK: id (UUID)   │
│ commission      │
│ FK: zoneId      │
└─────┬───────────┘
      │ N:1
      │
      ▼
┌─────────────────┐
│      Zone       │
├─────────────────┤
│ PK: id (UUID)   │
│ name (unique)   │
│ isHeadquarters  │
└─────────────────┘


┌──────────────────────────────────────────────────────────────┐
│               Entidades de Autenticación                     │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ RefreshToken    │    │EmailVerification │    │UserVerification │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ PK: id (UUID)   │    │ PK: id (UUID)    │    │ PK: id (UUID)   │
│ token           │    │ email            │    │ FK: userId      │
│ FK: userId      │    │ token            │    │ FK: personId    │
│ expiresAt       │    │ expiresAt        │    │ status          │
│ createdAt       │    │ createdAt        │    │ requestedRole   │
└─────────────────┘    └──────────────────┘    │ createdAt       │
                                                │ updatedAt       │
                                                └─────────────────┘

┌─────────────────┐
│  RoleRequest    │
├─────────────────┤
│ PK: id (UUID)   │
│ FK: userId      │
│ requestedRole   │
│ status          │
│ reason          │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

---

## Entidades Principales

### 1. User (Usuario del Sistema)

Entidad central de autenticación y autorización.

```typescript
// Tabla: users
@Entity({ tableName: 'users' })
export class User {
  id: string;                 // UUID v7
  username: string;           // Único
  email: string;              // Único
  password: string;           // Hasheado con Argon2
  roles: Role[];              // Array de roles [ADMIN, CLIENT, etc.]
  isActive: boolean;          // Cuenta activa
  isVerified: boolean;        // Verificado por admin
  emailVerified: boolean;     // Email validado
  lastLoginAt?: Date;
  profileCompleteness: number; // 0-100%
  createdAt: Date;
  updatedAt: Date;

  // Relación 1:1 con BasePersonEntity
  person?: Ref<BasePersonEntity>;
}
```

**Roles Disponibles:**
```typescript
enum Role {
  ADMIN = 'ADMIN',           // Administrador del sistema
  PARTNER = 'PARTNER',       // Socio (Shelby Council)
  DISTRIBUTOR = 'DISTRIBUTOR', // Distribuidor de productos
  CLIENT = 'CLIENT',         // Cliente
  USER = 'USER',             // Usuario básico (sin rol específico)
  AUTHORITY = 'AUTHORITY',   // Autoridad (policía, gobierno)
}
```

**Completitud de Perfil:**
- **25%**: Usuario registrado
- **+25%**: Usuario verificado por admin
- **+50%**: Información personal completa
- **100%**: Perfil completo

---

### 2. BasePersonEntity (Información Personal)

Entidad base para todas las personas en el sistema.

```typescript
// Tabla: persons
@Entity({ tableName: 'persons' })
export class BasePersonEntity {
  id: string;           // UUID v7
  dni: string;          // Único (DNI/ID)
  name: string;         // Nombre completo
  email: string;        // Email de contacto
  phone: string;        // Teléfono
  address: string;      // Dirección

  // Relación 1:1 con User (opcional)
  user?: Ref<User>;
}
```

**Herencia:**
Varias entidades heredan de `BasePersonEntity`:
- `Client` (Cliente)
- `Admin` (Administrador)
- `Partner` (Socio)
- `Distributor` (Distribuidor)
- `Authority` (Autoridad)

**Diagrama de Herencia:**
```
       BasePersonEntity (Abstract)
                │
    ┌───────────┼───────────┬──────────┬──────────┐
    │           │           │          │          │
  Client      Admin      Partner   Distributor  Authority
```

---

### 3. Client (Cliente)

Cliente que realiza compras.

```typescript
// Tabla: clients
@Entity({ tableName: 'clients' })
export class Client extends BasePersonEntity {
  // Hereda: id, dni, name, email, phone, address

  // Relación 1:N con Sale
  purchases: Collection<Sale>;
}
```

**Relaciones:**
- Puede tener muchas compras (`Sale`)

---

### 4. Sale (Venta)

Representa una venta realizada en el sistema.

```typescript
// Tabla: sales
@Entity({ tableName: 'sales' })
export class Sale extends BaseObjectEntity {
  id: string;
  description?: string;
  saleDate: Date;
  saleAmount: number;

  // Relaciones
  distributor: Ref<Distributor>;  // Requerido
  client?: Ref<Client>;           // Opcional
  authority?: Ref<Authority>;     // Opcional
  details: Collection<Detail>;    // Detalles de la venta
}
```

**Relaciones:**
- **N:1** con `Distributor` (un distributor puede tener muchas ventas)
- **N:1** con `Client` (un cliente puede tener muchas ventas)
- **N:1** con `Authority` (una autoridad puede tener muchas ventas asociadas)
- **1:N** con `Detail` (una venta tiene muchos detalles/productos)

---

### 5. Detail (Detalle de Venta)

Detalle de productos en una venta (línea de venta).

```typescript
// Tabla: details
@Entity({ tableName: 'details' })
export class Detail {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;

  // Relaciones
  sale: Ref<Sale>;
  product: Ref<Product>;
}
```

**Fórmula:**
```
subtotal = quantity × unitPrice
```

---

### 6. Product (Producto)

Productos disponibles para venta.

```typescript
// Tabla: products
@Entity({ tableName: 'products' })
export class Product extends BaseObjectEntity {
  id: string;
  description: string;
  detail?: string;
  price: number;
  stock: number;
  isIllegal: boolean;  // Producto ilegal (contrabando, etc.)

  // Relaciones
  distributors: Collection<Distributor>; // N:M
  details: Collection<Detail>;           // 1:N
}
```

**Relaciones:**
- **N:M** con `Distributor` (muchos productos pueden ser vendidos por muchos distribuidores)
- **1:N** con `Detail` (un producto puede estar en muchos detalles de venta)

---

### 7. Distributor (Distribuidor)

Distribuidor de productos en una zona.

```typescript
// Tabla: distributors
@Entity({ tableName: 'distributors' })
export class Distributor extends BasePersonEntity {
  // Hereda: id, dni, name, email, phone, address

  commission: number;

  // Relaciones
  zone: Ref<Zone>;                    // N:1
  products: Collection<Product>;      // N:M
  sales: Collection<Sale>;            // 1:N
}
```

**Relaciones:**
- **N:1** con `Zone` (un distribuidor opera en una zona)
- **N:M** con `Product` (distribuye múltiples productos)
- **1:N** con `Sale` (realiza múltiples ventas)

---

### 8. Zone (Zona Geográfica)

Zonas de operación del negocio.

```typescript
// Tabla: zones
@Entity({ tableName: 'zones' })
export class Zone extends BaseObjectEntity {
  id: string;
  name: string;         // Único (ej: "Birmingham", "London")
  isHeadquarters: boolean;

  // Relaciones
  distributors: Collection<Distributor>; // 1:N
}
```

**Zonas por Defecto (Development):**
- Birmingham (Headquarters)
- London
- Camden Town
- Small Heath

---

### 9. Partner (Socio - Shelby Council)

Socios que participan en el consejo Shelby.

```typescript
// Tabla: partners
@Entity({ tableName: 'partners' })
export class Partner extends BasePersonEntity {
  // Hereda: id, dni, name, email, phone, address

  // Relaciones
  shelbyCouncil: Collection<ShelbyCouncil>; // N:M
  decisions: Collection<Decision>;          // 1:N
}
```

---

### 10. ShelbyCouncil (Consejo Shelby)

Consejo directivo de la organización.

```typescript
// Tabla: shelby_councils
@Entity({ tableName: 'shelby_councils' })
export class ShelbyCouncil extends BaseObjectEntity {
  id: string;
  name: string;
  foundedDate: Date;

  // Relaciones
  partners: Collection<Partner>;          // N:M
  monthlyReviews: Collection<MonthlyReview>; // 1:N
}
```

---

### 11. Authority (Autoridad)

Autoridades gubernamentales o policiales.

```typescript
// Tabla: authorities
@Entity({ tableName: 'authorities' })
export class Authority extends BasePersonEntity {
  // Hereda: id, dni, name, email, phone, address

  rank: string;  // Rango (ej: "Inspector", "Detective")

  // Relaciones
  bribes: Collection<Bribe>;  // 1:N
  sales: Collection<Sale>;    // 1:N (ventas relacionadas)
}
```

---

## Relaciones entre Entidades

### Tipos de Relaciones en MikroORM

#### 1. One-to-One (1:1)

```typescript
// User ◄──► BasePersonEntity

// En User.entity.ts
@OneToOne({ entity: () => BasePersonEntity, nullable: true, owner: true })
person?: Ref<BasePersonEntity>;

// En BasePersonEntity.entity.ts
@OneToOne({ entity: () => User, nullable: true })
user?: Ref<User>;
```

**Explicación:**
- Un usuario tiene **una** información personal
- Una información personal pertenece a **un** usuario
- `owner: true` indica que User tiene la foreign key

**Tabla SQL:**
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  -- ... otros campos
  person_id VARCHAR(36),
  FOREIGN KEY (person_id) REFERENCES persons(id)
);
```

---

#### 2. One-to-Many (1:N) y Many-to-One (N:1)

```typescript
// Client ──< Sale (Un cliente tiene muchas compras)

// En Client.entity.ts
@OneToMany({ entity: () => Sale, mappedBy: 'client' })
purchases = new Collection<Sale>(this);

// En Sale.entity.ts
@ManyToOne({ entity: () => Client, nullable: true })
client?: Ref<Client>;
```

**Explicación:**
- Un cliente puede tener **muchas** ventas
- Una venta pertenece a **un** cliente
- `mappedBy` indica que Sale tiene la foreign key

**Tabla SQL:**
```sql
CREATE TABLE sales (
  id VARCHAR(36) PRIMARY KEY,
  -- ... otros campos
  client_id VARCHAR(36),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

---

#### 3. Many-to-Many (N:M)

```typescript
// Distributor ◄──► Product (Muchos distribuidores venden muchos productos)

// En Distributor.entity.ts
@ManyToMany({ entity: () => Product, owner: true })
products = new Collection<Product>(this);

// En Product.entity.ts
@ManyToMany({ entity: () => Distributor, mappedBy: (d) => d.products })
distributors = new Collection<Distributor>(this);
```

**Explicación:**
- Un distribuidor vende **muchos** productos
- Un producto es vendido por **muchos** distribuidores
- Requiere tabla intermedia (junction table)

**Tabla SQL (generada automáticamente):**
```sql
CREATE TABLE distributor_products (
  distributor_id VARCHAR(36),
  product_id VARCHAR(36),
  PRIMARY KEY (distributor_id, product_id),
  FOREIGN KEY (distributor_id) REFERENCES distributors(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

### Diagrama de Relaciones Clave

```
┌─────────────────────────────────────────────────────────────┐
│              Flujo de una Venta (Sale)                      │
└─────────────────────────────────────────────────────────────┘

     Client                         Distributor
       │                                 │
       │ N:1                            │ 1:N
       │                                 │
       └────────────► Sale ◄────────────┘
                       │
                       │ 1:N
                       │
                       ▼
                    Detail
                       │
                       │ N:1
                       │
                       ▼
                    Product
```

**Lectura del Diagrama:**
1. Un `Client` realiza una `Sale`
2. Un `Distributor` gestiona la `Sale`
3. La `Sale` contiene múltiples `Detail` (líneas de venta)
4. Cada `Detail` referencia un `Product` específico

---

## Configuración de MikroORM

### Archivo de Configuración

```typescript
// src/shared/db/orm.config.ts

export default {
  driver: MySqlDriver,
  entities: ['dist/**/*.entity.js'],       // Entidades compiladas
  entitiesTs: ['src/**/*.entity.ts'],      // Entidades TypeScript (desarrollo)

  // Conexión
  dbName: process.env.DB_NAME || 'tpdesarrollo',
  user: process.env.DB_USER || 'dsw',
  password: process.env.DB_PASSWORD || 'dsw',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),

  // Pool de conexiones
  pool: {
    min: 2,                      // Mínimo de conexiones abiertas
    max: 10,                     // Máximo de conexiones simultáneas
    acquireTimeoutMillis: 30000, // Timeout para obtener conexión
    idleTimeoutMillis: 30000,    // Cerrar conexiones inactivas
  },

  // Charset
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',

  // Debugging
  debug: process.env.NODE_ENV === 'development',
  highlighter: new SqlHighlighter(),
} as Options;
```

### Inicialización del ORM

```typescript
// src/shared/db/orm.ts

import config from './orm.config.js';
import { MikroORM } from '@mikro-orm/core';

// Instancia singleton del ORM
export let orm: MikroORM;

/**
 * Inicializa la conexión a la base de datos
 */
export async function initORM() {
  orm = await MikroORM.init(config);
  return orm;
}

/**
 * Sincroniza el schema (solo desarrollo)
 */
export async function syncSchema() {
  if (process.env.NODE_ENV === 'development') {
    const generator = orm.getSchemaGenerator();

    // Actualizar schema sin perder datos
    await generator.updateSchema();

    logger.info('Database schema synchronized successfully');
  }
}
```

---

## Gestión de Esquemas

### Development: Auto-Sync

En desarrollo, el schema se sincroniza automáticamente al iniciar:

```typescript
// src/app.ts - initDev()
if (process.env.NODE_ENV === 'development') {
  await syncSchema();  // Actualiza tablas automáticamente
  await createAdminDev();  // Crea datos de prueba
  await createZoneDev();
}
```

**Ventajas:**
- Desarrollo rápido
- No necesitas ejecutar migraciones manualmente
- Los cambios en entidades se reflejan inmediatamente

**Desventajas:**
- Puede perder datos si cambias tipos de columnas
- No es apto para producción

---

### Production: Migraciones

En producción, se deben usar **migraciones** para controlar cambios de schema:

```bash
# Crear una migración
npx mikro-orm migration:create

# Ejecutar migraciones pendientes
npx mikro-orm migration:up

# Revertir última migración
npx mikro-orm migration:down
```

**Ejemplo de Migración:**
```typescript
// src/migrations/Migration20251016000000.ts

import { Migration } from '@mikro-orm/migrations';

export class Migration20251016000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL,
        is_illegal BOOLEAN DEFAULT FALSE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  async down(): Promise<void> {
    this.addSql('DROP TABLE IF EXISTS products;');
  }
}
```

---

## Conceptos Avanzados

### 1. Unit of Work (UoW)

MikroORM usa el patrón **Unit of Work** para rastrear cambios en entidades.

```typescript
const em = orm.em.fork();  // Crear EntityManager

// Crear nueva entidad
const client = em.create(Client, {
  dni: '12345678',
  name: 'Thomas Shelby',
  email: 'thomas@shelby.com',
  phone: '+44 121 234 5678',
  address: 'Watery Lane, Birmingham'
});

// MikroORM rastrea que 'client' es nuevo (INSERT pendiente)

await em.flush();  // Ejecuta INSERT en base de datos
```

**Diagrama:**
```
┌────────────────────────────────────────────────────┐
│            Unit of Work Pattern                    │
├────────────────────────────────────────────────────┤
│                                                     │
│  1. em.create(Client, {...})                       │
│     └─ Registra en UoW: "NEW"                      │
│                                                     │
│  2. client.name = "New Name"                       │
│     └─ Registra en UoW: "DIRTY"                    │
│                                                     │
│  3. em.remove(client)                              │
│     └─ Registra en UoW: "REMOVED"                  │
│                                                     │
│  4. em.flush()                                     │
│     ├─ Genera SQLs: INSERT, UPDATE, DELETE        │
│     ├─ Ejecuta en transacción                     │
│     └─ Confirma cambios                           │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

### 2. Identity Map

Previene duplicados de la misma entidad en memoria.

```typescript
const em = orm.em.fork();

const client1 = await em.findOne(Client, { id: 'uuid-123' });
const client2 = await em.findOne(Client, { id: 'uuid-123' });

console.log(client1 === client2);  // true (misma referencia)
```

**Ventajas:**
- Evita inconsistencias
- Optimiza memoria
- Mejora rendimiento (una sola query por entidad)

---

### 3. Cascade Operations

Propagación automática de operaciones:

```typescript
// Sale.entity.ts
@OneToMany({
  entity: () => Detail,
  mappedBy: 'sale',
  cascade: [Cascade.ALL],       // Propaga INSERT, UPDATE, DELETE
  orphanRemoval: true,          // Elimina detalles huérfanos
})
details = new Collection<Detail>(this);
```

**Ejemplo:**
```typescript
const em = orm.em.fork();

const sale = await em.findOne(Sale, { id: 'sale-123' }, {
  populate: ['details']
});

// Eliminar sale
em.remove(sale);

await em.flush();
// ✅ Elimina Sale Y todos sus Details automáticamente (cascade + orphanRemoval)
```

---

### 4. Lazy Loading vs Eager Loading

#### Lazy Loading (por defecto)

```typescript
const client = await em.findOne(Client, { id: 'client-123' });

// purchases NO está cargado
console.log(client.purchases.isInitialized());  // false

// Cargar manualmente
await client.purchases.init();
console.log(client.purchases.isInitialized());  // true
```

#### Eager Loading (populate)

```typescript
const client = await em.findOne(Client, { id: 'client-123' }, {
  populate: ['purchases']  // Cargar compras en la misma query
});

console.log(client.purchases.isInitialized());  // true
```

**SQL Generado:**
```sql
-- Lazy (2 queries)
SELECT * FROM clients WHERE id = 'client-123';
SELECT * FROM sales WHERE client_id = 'client-123';

-- Eager (1 query con JOIN)
SELECT c.*, s.*
FROM clients c
LEFT JOIN sales s ON c.id = s.client_id
WHERE c.id = 'client-123';
```

---

### 5. Soft Delete (Eliminación Suave)

Actualmente **no implementado**, pero se puede agregar:

```typescript
@Entity()
export class Client extends BasePersonEntity {
  @Property({ default: false })
  isDeleted: boolean = false;

  @Property({ nullable: true })
  deletedAt?: Date;
}

// En lugar de em.remove():
client.isDeleted = true;
client.deletedAt = new Date();
await em.flush();

// Filtrar automáticamente eliminados:
@Filter({ name: 'active', cond: { isDeleted: false }, default: true })
```

---

## Buenas Prácticas

### 1. Siempre Usar fork()

```typescript
// ❌ NO hacer (reusa el mismo EntityManager global)
const em = orm.em;

// ✅ Hacer (crea nuevo EntityManager por request)
const em = orm.em.fork();
```

**Razón:** Evita problemas de concurrencia entre requests.

---

### 2. RequestContext Middleware

```typescript
// app.ts
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});
```

**Efecto:** Cada request tiene su propio EntityManager automáticamente.

---

### 3. Transacciones Explícitas

Para operaciones complejas:

```typescript
await em.transactional(async (em) => {
  const sale = em.create(Sale, { ... });

  for (const item of items) {
    const detail = em.create(Detail, {
      sale,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.quantity * item.unitPrice
    });
  }

  // Si algo falla, todo se revierte (rollback)
  await em.flush();
});
```

---

## Próximos Pasos

- **[Sistema de Autenticación](05-AUTHENTICATION.md)** - Flujo de autenticación y JWT
- **[API Endpoints](06-API-ENDPOINTS.md)** - Endpoints disponibles para cada entidad
- **[Arquitectura](02-ARCHITECTURE.md)** - Para entender cómo las entidades se usan en la aplicación

---

## Recursos Adicionales

- **Documentación MikroORM:** https://mikro-orm.io/docs/
- **MySQL 8.0 Reference:** https://dev.mysql.com/doc/refman/8.0/en/
- **TypeScript Decorators:** https://www.typescriptlang.org/docs/handbook/decorators.html

---

**Última actualización**: 2025-10-16
