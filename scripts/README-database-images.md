# Scripts SQL para Imágenes de Productos

Este directorio contiene scripts SQL para gestionar las imágenes de productos en la base de datos.

## 📋 Scripts Disponibles

### 1. `add-image-urls-column.sql`
**Propósito:** Crear la columna `image_urls` en la tabla `products`

**Características:**
- ✅ Agrega columna JSONB para almacenar arrays de URLs
- ✅ Crea índice GIN para búsquedas eficientes
- ✅ Incluye validaciones y comentarios
- ✅ Muestra estadísticas post-migración

**Cuándo usar:** Primera vez que configuras el sistema de imágenes

**Ejecución:**
```bash
# Local (PostgreSQL)
psql -U postgres -d tpdesarrollo -f scripts/add-image-urls-column.sql

# Producción (Render/Neon)
psql "postgresql://usuario:password@host:5432/database" -f scripts/add-image-urls-column.sql
```

---

### 2. `insert-sample-product-images.sql`
**Propósito:** Insertar productos de ejemplo con imágenes placeholder

**Incluye:**
- 🥃 Productos temáticos de Peaky Blinders
- 🍺 Bebidas alcohólicas variadas
- 🎨 URLs de placeholder para demostración
- 📊 Consultas de verificación

**Cuándo usar:** Testing, desarrollo, demos

**Ejecución:**
```bash
psql -U postgres -d tpdesarrollo -f scripts/insert-sample-product-images.sql
```

---

## 🚀 Flujo de Trabajo Completo

### Paso 1: Migración de Base de Datos
```bash
# Ejecutar el script de migración
npm run build
psql -U postgres -d tpdesarrollo -f scripts/add-image-urls-column.sql
```

### Paso 2: Configurar UploadThing
```bash
# Agregar en .env
UPLOADTHING_SECRET=sk_live_tu_api_key_aqui
```

### Paso 3: Subir Imágenes Reales
Usar los endpoints de la API:

```bash
# Subir imágenes a un producto
curl -X POST http://localhost:3000/api/products/1/images \
  -H "Cookie: access_token=tu_token" \
  -F "images=@imagen1.jpg" \
  -F "images=@imagen2.jpg"
```

### Paso 4: Verificar
```sql
-- Ver productos con imágenes
SELECT id, description, image_urls
FROM products
WHERE image_urls IS NOT NULL;
```

---

## 🛠️ Operaciones SQL Útiles

### Agregar imagen a producto existente
```sql
UPDATE products
SET image_urls = COALESCE(image_urls, '[]'::jsonb) ||
                 '["https://utfs.io/f/abc123"]'::jsonb
WHERE id = 1;
```

### Reemplazar todas las imágenes
```sql
UPDATE products
SET image_urls = '[
  "https://utfs.io/f/nueva1",
  "https://utfs.io/f/nueva2"
]'::jsonb
WHERE id = 1;
```

### Eliminar una imagen específica (índice 1)
```sql
UPDATE products
SET image_urls = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(image_urls) WITH ORDINALITY AS t(elem, idx)
  WHERE idx - 1 != 1
)
WHERE id = 1;
```

### Eliminar todas las imágenes
```sql
UPDATE products
SET image_urls = NULL
WHERE id = 1;
```

### Consultas de análisis
```sql
-- Productos sin imágenes
SELECT id, description, price
FROM products
WHERE image_urls IS NULL;

-- Productos con más de 3 imágenes
SELECT id, description, jsonb_array_length(image_urls) as num_images
FROM products
WHERE jsonb_array_length(image_urls) > 3;

-- Promedio de imágenes por producto
SELECT ROUND(AVG(jsonb_array_length(image_urls))::numeric, 2) as avg_images
FROM products
WHERE image_urls IS NOT NULL;

-- Total de imágenes en el sistema
SELECT SUM(jsonb_array_length(image_urls)) as total_images
FROM products
WHERE image_urls IS NOT NULL;
```

---

## 📝 Formato de Datos

### Estructura JSONB
```json
{
  "imageUrls": [
    "https://utfs.io/f/abc123def456",
    "https://utfs.io/f/ghi789jkl012",
    "https://utfs.io/f/mno345pqr678"
  ]
}
```

### Ejemplo en PostgreSQL
```sql
INSERT INTO products (description, price, stock, is_illegal, image_urls)
VALUES (
  'Whiskey Premium',
  85.50,
  50,
  false,
  '[
    "https://utfs.io/f/abc123",
    "https://utfs.io/f/def456"
  ]'::jsonb
);
```

---

## ⚠️ Consideraciones Importantes

### Límites
- **Máximo 5 imágenes** por producto (validado en API)
- **5MB por imagen** (validado en middleware)
- **500MB mensuales** de uploads (plan free de UploadThing)

### Producción
1. ✅ Siempre hacer backup antes de ejecutar migraciones
2. ✅ Probar en ambiente de desarrollo primero
3. ✅ Verificar que UPLOADTHING_SECRET está configurado
4. ✅ Monitorear uso de storage con endpoint `/api/storage/stats`

### Limpieza
Cuando se elimina un producto, las imágenes en UploadThing se eliminan automáticamente gracias al método `cleanupImages()` en la entidad Product.

---

## 🔍 Troubleshooting

### Error: "column image_urls already exists"
Ya ejecutaste la migración. Salta al paso 2.

### Error: "function jsonb_array_length does not exist"
Tu versión de PostgreSQL es < 9.4. Actualiza PostgreSQL.

### Las imágenes no se muestran
1. Verifica que las URLs están en la base de datos:
   ```sql
   SELECT id, image_urls FROM products WHERE id = 1;
   ```
2. Verifica que las URLs son accesibles públicamente
3. Revisa que el formato JSON sea correcto

---

## 📚 Referencias

- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [UploadThing Docs](https://docs.uploadthing.com/)
- [API Endpoints](../src/modules/product/product.routes.ts)

---

## 🤝 Contribuir

Si encuentras errores o tienes sugerencias para mejorar estos scripts, por favor abre un issue.
