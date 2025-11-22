-- ============================================================================
-- SCRIPT: Insertar productos de ejemplo con imágenes (una por producto)
-- ============================================================================
-- Fecha: 2025-11-22
-- Descripción: Actualiza/inserta productos con URLs de imágenes de ejemplo
--              Usa placeholders de https://placehold.co para demostración
-- ============================================================================

-- ============================================================================
-- Opción 1: Actualizar productos existentes por ID
-- ============================================================================

-- Producto 1: Whiskey irlandés
UPDATE products
SET image_url = 'https://placehold.co/800x600/1a472a/white?text=Irish+Whiskey'
WHERE id = 1;

-- Producto 2: Gin Birmingham
UPDATE products
SET image_url = 'https://placehold.co/800x600/4A5568/white?text=Birmingham+Gin'
WHERE id = 2;

-- Producto 3: Brandy francés
UPDATE products
SET image_url = 'https://placehold.co/800x600/8B4513/white?text=French+Brandy'
WHERE id = 3;

-- ============================================================================
-- Opción 2: Insertar productos nuevos con imágenes (Peaky Blinders Theme)
-- ============================================================================

INSERT INTO products (description, detail, price, stock, is_illegal, image_url)
VALUES
  (
    'Irish Whiskey de Contrabando',
    'Whiskey irlandés de alta calidad, traído directamente de Dublín',
    75.00,
    40,
    true,
    'https://placehold.co/800x600/1a472a/white?text=Irish+Whiskey'
  ),
  (
    'Gin Birmingham Special',
    'Gin destilado localmente con botánicos ingleses',
    35.00,
    80,
    false,
    'https://placehold.co/800x600/4A5568/white?text=Birmingham+Gin'
  ),
  (
    'Brandy de Importación',
    'Brandy francés de contrabando, reserva especial',
    95.00,
    25,
    true,
    'https://placehold.co/800x600/8B4513/white?text=French+Brandy'
  ),
  (
    'Cerveza Small Heath Ale',
    'Cerveza local producida en Small Heath',
    8.50,
    200,
    false,
    'https://placehold.co/800x600/CD7F32/white?text=Small+Heath+Ale'
  ),
  (
    'Absenta Verde',
    'Absenta importada de Francia, 70% alcohol',
    110.00,
    15,
    true,
    'https://placehold.co/800x600/00FF00/333?text=Absenta+Verde'
  ),
  (
    'Whiskey Escocés Premium',
    'Whiskey de 18 años añejado en barricas de roble',
    85.50,
    50,
    false,
    'https://placehold.co/800x600/8B4513/white?text=Scotch+Whiskey'
  ),
  (
    'Vodka Ruso Artesanal',
    'Vodka destilado 5 veces, pureza excepcional',
    45.00,
    100,
    false,
    'https://placehold.co/800x600/E0E0E0/333?text=Russian+Vodka'
  ),
  (
    'Ron Caribeño Añejo',
    'Ron de 12 años con notas de vainilla y caramelo',
    65.00,
    75,
    false,
    'https://placehold.co/800x600/654321/white?text=Caribbean+Rum'
  ),
  (
    'Tequila Reposado Mexicano',
    'Tequila 100% agave azul, reposado 6 meses',
    55.00,
    60,
    true,
    'https://placehold.co/800x600/DAA520/white?text=Tequila+Reposado'
  ),
  (
    'Champagne Francés',
    'Champagne brut de la región de Reims',
    120.00,
    30,
    false,
    'https://placehold.co/800x600/FFE4B5/333?text=French+Champagne'
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
    CASE
        WHEN image_url IS NOT NULL THEN 'Sí'
        ELSE 'No'
    END as tiene_imagen,
    image_url
FROM products
ORDER BY id DESC
LIMIT 10;

-- Estadísticas
SELECT
    COUNT(*) as total_products,
    COUNT(image_url) as products_with_image,
    COUNT(*) - COUNT(image_url) as products_without_image,
    ROUND(100.0 * COUNT(image_url) / COUNT(*), 2) as porcentaje_con_imagen
FROM products;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. Las URLs de placehold.co son solo para demostración
-- 2. En producción, usar URLs reales de UploadThing con el formato:
--    https://utfs.io/f/[FILE_KEY]
--
-- 3. Para actualizar con URL real de UploadThing:
--    UPDATE products
--    SET image_url = 'https://utfs.io/f/abc123...'
--    WHERE id = 1;
--
-- 4. Para eliminar imagen de un producto:
--    UPDATE products
--    SET image_url = NULL
--    WHERE id = 1;
--
-- 5. Para buscar productos sin imagen:
--    SELECT id, description FROM products WHERE image_url IS NULL;
--
-- 6. Para buscar productos con imagen:
--    SELECT id, description, image_url FROM products WHERE image_url IS NOT NULL;
