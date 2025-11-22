-- ============================================================================
-- MIGRATION: Agregar columna image_urls a la tabla products
-- ============================================================================
-- Fecha: 2025-11-22
-- Descripción: Agrega soporte para almacenar URLs de imágenes de productos
--              usando tipo JSONB para almacenamiento eficiente
-- ============================================================================

-- Verificar que la tabla products existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        RAISE EXCEPTION 'La tabla products no existe';
    END IF;
END $$;

-- Agregar columna image_urls si no existe
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT NULL;

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN products.image_urls IS
'Array de URLs de imágenes almacenadas en UploadThing. Formato: ["https://utfs.io/f/key1", "https://utfs.io/f/key2"]';

-- Crear índice GIN para búsquedas eficientes en JSONB (opcional)
CREATE INDEX IF NOT EXISTS idx_products_image_urls
ON products USING GIN (image_urls);

-- Verificar que la columna se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'image_urls'
    ) THEN
        RAISE EXCEPTION 'Error: La columna image_urls no se creó correctamente';
    ELSE
        RAISE NOTICE 'Migración completada exitosamente: columna image_urls agregada a products';
    END IF;
END $$;

-- Mostrar estadísticas
SELECT
    COUNT(*) as total_products,
    COUNT(image_urls) as products_with_images,
    COUNT(*) - COUNT(image_urls) as products_without_images
FROM products;
