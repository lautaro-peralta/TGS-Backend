-- ============================================================================
-- SCRIPT: Insertar imágenes de ejemplo en productos existentes
-- ============================================================================
-- Fecha: 2025-11-22
-- Descripción: Actualiza productos existentes con URLs de imágenes de ejemplo
--              Usa placeholders de https://placehold.co para demostración
-- ============================================================================

-- IMPORTANTE: Este script usa URLs de placeholder para demostración.
-- En producción, reemplazar con URLs reales de UploadThing después de subir archivos.

-- ============================================================================
-- Opción 1: Actualizar productos específicos por ID
-- ============================================================================

-- Producto 1: Whiskey irlandés (ejemplo de producto ilegal)
UPDATE products
SET image_urls = '[
  "https://placehold.co/800x600/1a1a1a/white?text=Whiskey+Irlandes+1",
  "https://placehold.co/800x600/2a2a2a/white?text=Whiskey+Irlandes+2",
  "https://placehold.co/800x600/3a3a3a/white?text=Whiskey+Irlandes+3"
]'::jsonb
WHERE id = 1;

-- Producto 2: Gin de contrabando
UPDATE products
SET image_urls = '[
  "https://placehold.co/800x600/4a4a4a/white?text=Gin+Premium+1",
  "https://placehold.co/800x600/5a5a5a/white?text=Gin+Premium+2"
]'::jsonb
WHERE id = 2;

-- Producto 3: Cerveza artesanal
UPDATE products
SET image_urls = '[
  "https://placehold.co/800x600/6a6a6a/white?text=Cerveza+Artesanal+1",
  "https://placehold.co/800x600/7a7a7a/white?text=Cerveza+Artesanal+2",
  "https://placehold.co/800x600/8a8a8a/white?text=Cerveza+Artesanal+3",
  "https://placehold.co/800x600/9a9a9a/white?text=Cerveza+Artesanal+4"
]'::jsonb
WHERE id = 3;

-- ============================================================================
-- Opción 2: Actualizar todos los productos con imágenes genéricas
-- ============================================================================

-- Comentar/descomentar según necesidad
/*
UPDATE products
SET image_urls = ARRAY[
  'https://placehold.co/800x600/333/white?text=Producto+' || id || '+Imagen+1',
  'https://placehold.co/800x600/666/white?text=Producto+' || id || '+Imagen+2',
  'https://placehold.co/800x600/999/white?text=Producto+' || id || '+Imagen+3'
]::jsonb
WHERE image_urls IS NULL;
*/

-- ============================================================================
-- Opción 3: Crear nuevos productos con imágenes
-- ============================================================================

-- Insertar producto de ejemplo con imágenes
INSERT INTO products (description, detail, price, stock, is_illegal, image_urls)
VALUES
  (
    'Whiskey Escocés Premium',
    'Whiskey de 18 años añejado en barricas de roble',
    85.50,
    50,
    false,
    '[
      "https://placehold.co/800x600/8B4513/white?text=Whiskey+Premium+1",
      "https://placehold.co/800x600/A0522D/white?text=Whiskey+Premium+2",
      "https://placehold.co/800x600/D2691E/white?text=Whiskey+Premium+3"
    ]'::jsonb
  ),
  (
    'Vodka Ruso Artesanal',
    'Vodka destilado 5 veces, pureza excepcional',
    45.00,
    100,
    false,
    '[
      "https://placehold.co/800x600/E0E0E0/333?text=Vodka+Artesanal+1",
      "https://placehold.co/800x600/F0F0F0/333?text=Vodka+Artesanal+2"
    ]'::jsonb
  ),
  (
    'Ron Caribeño Añejo',
    'Ron de 12 años con notas de vainilla y caramelo',
    65.00,
    75,
    false,
    '[
      "https://placehold.co/800x600/654321/white?text=Ron+Caribeño+1",
      "https://placehold.co/800x600/765432/white?text=Ron+Caribeño+2",
      "https://placehold.co/800x600/876543/white?text=Ron+Caribeño+3",
      "https://placehold.co/800x600/987654/white?text=Ron+Caribeño+4"
    ]'::jsonb
  ),
  (
    'Tequila Reposado Mexicano',
    'Tequila 100% agave azul, reposado 6 meses',
    55.00,
    60,
    true,
    '[
      "https://placehold.co/800x600/DAA520/white?text=Tequila+1",
      "https://placehold.co/800x600/FFD700/333?text=Tequila+2"
    ]'::jsonb
  ),
  (
    'Champagne Francés',
    'Champagne brut de la región de Reims',
    120.00,
    30,
    false,
    '[
      "https://placehold.co/800x600/FFE4B5/333?text=Champagne+1",
      "https://placehold.co/800x600/F5DEB3/333?text=Champagne+2",
      "https://placehold.co/800x600/DEB887/white?text=Champagne+3"
    ]'::jsonb
  );

-- ============================================================================
-- Opción 4: Insertar productos del universo Peaky Blinders
-- ============================================================================

INSERT INTO products (description, detail, price, stock, is_illegal, image_urls)
VALUES
  (
    'Irish Whiskey de Contrabando',
    'Whiskey irlandés de alta calidad, traído directamente de Dublín',
    75.00,
    40,
    true,
    '[
      "https://placehold.co/800x600/1a472a/white?text=Irish+Whiskey+1",
      "https://placehold.co/800x600/2d5a3d/white?text=Irish+Whiskey+2",
      "https://placehold.co/800x600/3f6d4f/white?text=Irish+Whiskey+3"
    ]'::jsonb
  ),
  (
    'Gin Birmingham Special',
    'Gin destilado localmente con botánicos ingleses',
    35.00,
    80,
    false,
    '[
      "https://placehold.co/800x600/4A5568/white?text=Birmingham+Gin+1",
      "https://placehold.co/800x600/5B6679/white?text=Birmingham+Gin+2"
    ]'::jsonb
  ),
  (
    'Brandy de Importación',
    'Brandy francés de contrabando, reserva especial',
    95.00,
    25,
    true,
    '[
      "https://placehold.co/800x600/8B4513/white?text=French+Brandy+1",
      "https://placehold.co/800x600/A0522D/white?text=French+Brandy+2",
      "https://placehold.co/800x600/CD853F/white?text=French+Brandy+3"
    ]'::jsonb
  ),
  (
    'Cerveza Small Heath Ale',
    'Cerveza local producida en Small Heath',
    8.50,
    200,
    false,
    '[
      "https://placehold.co/800x600/CD7F32/white?text=Small+Heath+Ale+1",
      "https://placehold.co/800x600/C87533/white?text=Small+Heath+Ale+2"
    ]'::jsonb
  ),
  (
    'Absenta Verde',
    'Absenta importada de Francia, 70% alcohol',
    110.00,
    15,
    true,
    '[
      "https://placehold.co/800x600/00FF00/333?text=Absenta+1",
      "https://placehold.co/800x600/32CD32/333?text=Absenta+2",
      "https://placehold.co/800x600/228B22/white?text=Absenta+3"
    ]'::jsonb
  );

-- ============================================================================
-- Verificación de resultados
-- ============================================================================

-- Mostrar productos con imágenes
SELECT
    id,
    description,
    price,
    is_illegal,
    jsonb_array_length(image_urls) as num_images,
    image_urls
FROM products
WHERE image_urls IS NOT NULL
ORDER BY id;

-- Estadísticas
SELECT
    COUNT(*) as total_products,
    COUNT(image_urls) as products_with_images,
    COUNT(*) - COUNT(image_urls) as products_without_images,
    ROUND(AVG(jsonb_array_length(image_urls))::numeric, 2) as avg_images_per_product
FROM products;

-- Productos con más de 3 imágenes
SELECT
    id,
    description,
    jsonb_array_length(image_urls) as num_images
FROM products
WHERE image_urls IS NOT NULL
AND jsonb_array_length(image_urls) > 3
ORDER BY num_images DESC;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Las URLs de placehold.co son solo para demostración
-- 2. En producción, usar URLs reales de UploadThing con el formato:
--    https://utfs.io/f/[FILE_KEY]
--
-- 3. Para actualizar con URLs reales de UploadThing:
--    UPDATE products
--    SET image_urls = '[
--      "https://utfs.io/f/abc123...",
--      "https://utfs.io/f/def456..."
--    ]'::jsonb
--    WHERE id = [product_id];
--
-- 4. Para agregar una imagen a un producto existente:
--    UPDATE products
--    SET image_urls = COALESCE(image_urls, '[]'::jsonb) || '["nueva_url"]'::jsonb
--    WHERE id = [product_id];
--
-- 5. Para eliminar todas las imágenes de un producto:
--    UPDATE products
--    SET image_urls = NULL
--    WHERE id = [product_id];
--
-- 6. Para eliminar una imagen específica por índice (0-based):
--    UPDATE products
--    SET image_urls = (
--      SELECT jsonb_agg(elem)
--      FROM jsonb_array_elements(image_urls) WITH ORDINALITY AS t(elem, idx)
--      WHERE idx - 1 != [index_to_remove]
--    )
--    WHERE id = [product_id];
