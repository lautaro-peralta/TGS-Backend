-- ============================================================================
-- MIGRATION: Agregar columna image_url a la tabla products
-- ============================================================================
-- Fecha: 2025-11-22
-- Descripción: Agrega soporte para almacenar URL de imagen de producto
--              (una imagen por producto)
-- ============================================================================

-- Verificar que la tabla products existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
        RAISE EXCEPTION 'La tabla products no existe';
    END IF;
END $$;

-- Agregar columna image_url si no existe
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN products.image_url IS
'URL de la imagen almacenada en UploadThing. Formato: https://utfs.io/f/FILE_KEY';

-- Crear índice para búsquedas (opcional)
CREATE INDEX IF NOT EXISTS idx_products_image_url
ON products (image_url) WHERE image_url IS NOT NULL;

-- Verificar que la columna se creó correctamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'image_url'
    ) THEN
        RAISE EXCEPTION 'Error: La columna image_url no se creó correctamente';
    ELSE
        RAISE NOTICE 'Migración completada exitosamente: columna image_url agregada a products';
    END IF;
END $$;

-- Mostrar estadísticas
SELECT
    COUNT(*) as total_products,
    COUNT(image_url) as products_with_image,
    COUNT(*) - COUNT(image_url) as products_without_image
FROM products;
