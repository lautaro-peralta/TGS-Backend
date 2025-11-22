-- ============================================================================
-- PEAKY BLINDERS - SCRIPT DE DATOS DE PRUEBA
-- ============================================================================
-- Datos ficticios basados en la serie Peaky Blinders
-- Birmingham, Inglaterra - Años 1920s
-- DNIs en formato argentino
-- ============================================================================

-- Limpiar datos existentes (en orden inverso de dependencias)
TRUNCATE TABLE role_requests CASCADE;
TRUNCATE TABLE user_verifications CASCADE;
TRUNCATE TABLE email_verifications CASCADE;
TRUNCATE TABLE refresh_tokens CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE clandestine_agreements CASCADE;
TRUNCATE TABLE monthly_reviews CASCADE;
TRUNCATE TABLE consejos_shelby CASCADE;
TRUNCATE TABLE partners_decisions CASCADE;
TRUNCATE TABLE strategic_decisions_users CASCADE;
TRUNCATE TABLE strategic_decisions CASCADE;
TRUNCATE TABLE topics CASCADE;
TRUNCATE TABLE bribes CASCADE;
TRUNCATE TABLE sale_details CASCADE;
TRUNCATE TABLE sales CASCADE;
TRUNCATE TABLE distributors_products CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE admins CASCADE;
TRUNCATE TABLE authorities CASCADE;
TRUNCATE TABLE partners CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE distributors CASCADE;
TRUNCATE TABLE zones CASCADE;
TRUNCATE TABLE persons CASCADE;
TRUNCATE TABLE users CASCADE;

-- ============================================================================
-- USERS - La familia Shelby y asociados
-- ============================================================================

INSERT INTO users (id, username, email, password, roles, is_active, is_verified, email_verified, profile_completeness, created_at, updated_at) VALUES
-- ADMINS - Liderazgo de Shelby Company Limited
(gen_random_uuid(), 'tommy_shelby', 'thomas.shelby@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['ADMIN', 'USER'], true, true, true, 100, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
(gen_random_uuid(), 'polly_gray', 'elizabeth.gray@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['ADMIN', 'USER'], true, true, true, 100, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),

-- PARTNERS - Socios principales de la familia
(gen_random_uuid(), 'arthur_shelby', 'arthur.shelby@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['PARTNER', 'USER'], true, true, true, 100, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
(gen_random_uuid(), 'john_shelby', 'john.shelby@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['PARTNER', 'USER'], true, true, true, 100, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
(gen_random_uuid(), 'michael_gray', 'michael.gray@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['PARTNER', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'ada_shelby', 'ada.thorne@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['PARTNER', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'alfie_solomons', 'alfie.solomons@camdentownbrewery.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['PARTNER', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),

-- DISTRIBUTORS - Peaky Blinders y asociados
(gen_random_uuid(), 'charlie_strong', 'charlie.strong@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['DISTRIBUTOR', 'USER'], true, true, true, 100, NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months'),
(gen_random_uuid(), 'johnny_dogs', 'johnny.dogs@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['DISTRIBUTOR', 'USER'], true, true, true, 100, NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months'),
(gen_random_uuid(), 'jeremiah_jesus', 'jeremiah@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['DISTRIBUTOR', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'isaiah_jesus', 'isaiah@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['DISTRIBUTOR', 'USER'], true, true, true, 100, NOW() - INTERVAL '10 months', NOW() - INTERVAL '10 months'),
(gen_random_uuid(), 'finn_shelby', 'finn.shelby@shelbyltd.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['DISTRIBUTOR', 'USER'], true, true, true, 100, NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months'),
(gen_random_uuid(), 'aberama_gold', 'aberama.gold@travellers.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['DISTRIBUTOR', 'USER'], true, true, true, 100, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),

-- AUTHORITIES - Policías corruptos
(gen_random_uuid(), 'inspector_campbell', 'campbell@birmingham.police.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['AUTHORITY', 'USER'], true, true, true, 100, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
(gen_random_uuid(), 'superintendent_moss', 'moss@birmingham.police.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['AUTHORITY', 'USER'], true, true, true, 100, NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months'),
(gen_random_uuid(), 'sergeant_ryan', 'ryan@birmingham.police.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['AUTHORITY', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'inspector_hyland', 'hyland@birmingham.police.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['AUTHORITY', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),

-- CLIENTS - Clientes y contactos comerciales
(gen_random_uuid(), 'billy_kimber', 'kimber@racing.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['CLIENT', 'USER'], true, true, true, 100, NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months'),
(gen_random_uuid(), 'darby_sabini', 'sabini@londonracing.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['CLIENT', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'may_carleton', 'may.carleton@estate.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['CLIENT', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'grace_burgess', 'grace.burgess@barmaid.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['CLIENT', 'USER'], true, true, true, 100, NOW() - INTERVAL '18 months', NOW() - INTERVAL '18 months'),
(gen_random_uuid(), 'lizzie_stark', 'lizzie.stark@secretary.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['CLIENT', 'USER'], true, true, true, 100, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
(gen_random_uuid(), 'freddie_thorne', 'freddie.thorne@communist.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['CLIENT', 'USER'], true, true, true, 100, NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),

-- USUARIOS REGULARES
(gen_random_uuid(), 'pub_patron', 'patron@garrison.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['USER'], true, false, true, 25, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
(gen_random_uuid(), 'factory_worker', 'worker@smallheath.co.uk', '$argon2id$v=19$m=65536,t=3,p=4$saltysalt$hash', ARRAY['USER'], true, false, false, 25, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- ============================================================================
-- ZONES - Territorios de Birmingham y alrededores
-- ============================================================================

INSERT INTO zones (name, description, is_headquarters) VALUES
('Small Heath', 'Cuartel general de los Peaky Blinders - Watery Lane', true),
('Camden Town', 'Territorio de Alfie Solomons y su destilería', false),
('Digbeth', 'Zona industrial y fábricas', false),
('Aston', 'Territorio norte de Birmingham', false),
('Sparkbrook', 'Zona este - Comunidad mixta', false),
('London Docks', 'Puerto de Londres - Rutas de contrabando', false),
('Worcester', 'Rutas hacia el campo', false),
('Cheltenham', 'Hipódromo y apuestas', false);

-- ============================================================================
-- ADMINS - DNI Argentino
-- ============================================================================

INSERT INTO admins (dni, name, email, phone, address, department, user_id) VALUES
('20456789', 'Thomas Michael Shelby', 'thomas.shelby@shelbyltd.co.uk', '+44 121 555-0001', '6 Watery Lane, Small Heath, Birmingham', 'Managing Director', (SELECT id FROM users WHERE username = 'tommy_shelby')),
('18234567', 'Elizabeth "Polly" Gray', 'elizabeth.gray@shelbyltd.co.uk', '+44 121 555-0002', '10 Watery Lane, Small Heath, Birmingham', 'Treasurer & Secretary', (SELECT id FROM users WHERE username = 'polly_gray'));

-- ============================================================================
-- PARTNERS - DNI Argentino
-- ============================================================================

INSERT INTO partners (dni, name, email, phone, address, user_id) VALUES
('22567890', 'Arthur Shelby Jr', 'arthur.shelby@shelbyltd.co.uk', '+44 121 555-0003', '8 Watery Lane, Small Heath, Birmingham', (SELECT id FROM users WHERE username = 'arthur_shelby')),
('24678901', 'John Shelby', 'john.shelby@shelbyltd.co.uk', '+44 121 555-0004', '12 Watery Lane, Small Heath, Birmingham', (SELECT id FROM users WHERE username = 'john_shelby')),
('26789012', 'Michael Gray', 'michael.gray@shelbyltd.co.uk', '+44 121 555-0005', '14 Watery Lane, Small Heath, Birmingham', (SELECT id FROM users WHERE username = 'michael_gray')),
('25890123', 'Ada Shelby Thorne', 'ada.thorne@shelbyltd.co.uk', '+44 121 555-0006', 'London Residence', (SELECT id FROM users WHERE username = 'ada_shelby')),
('19901234', 'Alfie Solomons', 'alfie.solomons@camdentownbrewery.co.uk', '+44 207 555-0001', 'Camden Town Brewery, London', (SELECT id FROM users WHERE username = 'alfie_solomons'));

-- ============================================================================
-- DISTRIBUTORS - DNI Argentino
-- ============================================================================

INSERT INTO distributors (dni, name, email, phone, address, zone_id, user_id) VALUES
('21012345', 'Charlie Strong', 'charlie.strong@shelbyltd.co.uk', '+44 121 555-0010', 'The Yard, Small Heath, Birmingham', 1, (SELECT id FROM users WHERE username = 'charlie_strong')),
('23123456', 'Johnny Dogs', 'johnny.dogs@shelbyltd.co.uk', '+44 121 555-0011', 'Gypsy Camp, Worcester', 7, (SELECT id FROM users WHERE username = 'johnny_dogs')),
('24234567', 'Jeremiah "Jesus" Jesus', 'jeremiah@shelbyltd.co.uk', '+44 121 555-0012', 'Workshop, Digbeth, Birmingham', 3, (SELECT id FROM users WHERE username = 'jeremiah_jesus')),
('25345678', 'Isaiah Jesus', 'isaiah@shelbyltd.co.uk', '+44 121 555-0013', 'Small Heath, Birmingham', 1, (SELECT id FROM users WHERE username = 'isaiah_jesus')),
('27456789', 'Finn Shelby', 'finn.shelby@shelbyltd.co.uk', '+44 121 555-0014', '6 Watery Lane, Small Heath, Birmingham', 1, (SELECT id FROM users WHERE username = 'finn_shelby')),
('22567891', 'Aberama Gold', 'aberama.gold@travellers.co.uk', '+44 121 555-0015', 'Travelling Camp, Birmingham Outskirts', 5, (SELECT id FROM users WHERE username = 'aberama_gold'));

-- ============================================================================
-- AUTHORITIES - DNI Argentino
-- ============================================================================

INSERT INTO authorities (dni, name, email, phone, address, rank, zone_id, user_id) VALUES
('15678901', 'Chief Inspector Chester Campbell', 'campbell@birmingham.police.uk', '+44 121 555-1001', 'Birmingham Police HQ', 3, 1, (SELECT id FROM users WHERE username = 'inspector_campbell')),
('16789012', 'Superintendent Moss', 'moss@birmingham.police.uk', '+44 121 555-1002', 'Small Heath Station', 2, 1, (SELECT id FROM users WHERE username = 'superintendent_moss')),
('17890123', 'Sergeant Ryan', 'ryan@birmingham.police.uk', '+44 121 555-1003', 'Digbeth Station', 1, 3, (SELECT id FROM users WHERE username = 'sergeant_ryan')),
('18901234', 'Inspector Hyland', 'hyland@birmingham.police.uk', '+44 121 555-1004', 'Aston Station', 2, 4, (SELECT id FROM users WHERE username = 'inspector_hyland'));

-- ============================================================================
-- CLIENTS - DNI Argentino
-- ============================================================================

INSERT INTO clients (dni, name, email, phone, address, user_id) VALUES
('28012345', 'Billy Kimber', 'kimber@racing.co.uk', '+44 121 555-2001', 'Worcester Racecourse', (SELECT id FROM users WHERE username = 'billy_kimber')),
('29123456', 'Darby Sabini', 'sabini@londonracing.co.uk', '+44 207 555-2001', 'Clerkenwell, London', (SELECT id FROM users WHERE username = 'darby_sabini')),
('30234567', 'May Carleton', 'may.carleton@estate.co.uk', '+44 121 555-2002', 'Carleton Estate, Warwickshire', (SELECT id FROM users WHERE username = 'may_carleton')),
('31345678', 'Grace Burgess', 'grace.burgess@barmaid.co.uk', '+44 121 555-2003', 'The Garrison Pub, Small Heath', (SELECT id FROM users WHERE username = 'grace_burgess')),
('32456789', 'Lizzie Stark', 'lizzie.stark@secretary.co.uk', '+44 121 555-2004', 'Shelby Company Offices', (SELECT id FROM users WHERE username = 'lizzie_stark')),
('33567890', 'Freddie Thorne', 'freddie.thorne@communist.co.uk', '+44 121 555-2005', 'Small Heath, Birmingham', (SELECT id FROM users WHERE username = 'freddie_thorne')),
-- Clientes sin usuario
('34678901', 'Luca Changretta', 'changretta@mafia.it', '+44 121 555-2006', 'Italian Quarter, Birmingham', NULL),
('35789012', 'Father Hughes', 'hughes@church.co.uk', '+44 121 555-2007', 'St. Mary Church, Birmingham', NULL),
('36890123', 'Mr. Romanov', 'romanov@russian.ru', '+44 207 555-2008', 'Russian Embassy, London', NULL),
('37901234', 'Brilliant Chang', 'chang@oriental.co.uk', '+44 207 555-2009', 'Chinatown, London', NULL);

-- ============================================================================
-- PRODUCTS - Productos de los años 1920s
-- ============================================================================

INSERT INTO products (description, detail, price, stock, is_illegal, image_urls) VALUES
-- Productos legales (alcohol, apuestas)
('Irish Whiskey Premium', 'Whiskey irlandés importado de contrabando', 15.00, 200, false, '["https://utfs.io/f/whiskey1920.jpg"]'),
('London Dry Gin', 'Gin destilado en Camden Town Brewery', 8.00, 300, false, '["https://utfs.io/f/gin1920.jpg"]'),
('Scotch Whisky', 'Whisky escocés de malta', 12.00, 150, false, NULL),
('Rum del Caribe', 'Ron importado de Jamaica', 10.00, 100, false, NULL),
('French Cognac', 'Coñac francés de alta calidad', 25.00, 50, false, NULL),
('Betting Slips', 'Boletos de apuestas para carreras', 1.00, 10000, false, NULL),
('Protection Services', 'Servicios de protección para negocios', 50.00, 100, false, NULL),
('Horse Trading', 'Compra-venta de caballos de carreras', 500.00, 20, false, NULL),

-- Productos ilegales
('Opium', 'Opio de alta pureza importado de Oriente', 100.00, 50, true, NULL),
('Cocaine', 'Cocaína en polvo de Colombia', 150.00, 30, true, NULL),
('Chinese Opium', 'Opio chino de máxima calidad', 120.00, 40, true, NULL),
('Morphine', 'Morfina medicinal desviada', 80.00, 60, true, NULL),
('Stolen Goods', 'Mercancía robada de los muelles', 200.00, 25, true, NULL),
('Webley Revolver', 'Revólver militar británico', 45.00, 30, true, NULL),
('Lee-Enfield Rifle', 'Rifle de guerra sobrante', 85.00, 15, true, NULL),
('Military Ammunition', 'Munición militar desviada', 15.00, 500, true, NULL),
('Counterfeit Money', 'Billetes falsificados', 50.00, 100, true, NULL),
('Stolen Jewels', 'Joyas robadas de alta sociedad', 1000.00, 10, true, NULL),
('Fixed Race Information', 'Información sobre carreras arregladas', 200.00, 50, true, NULL),
('Black Market Whiskey', 'Whiskey sin impuestos ni licencia', 6.00, 400, true, NULL);

-- ============================================================================
-- DISTRIBUTORS_PRODUCTS
-- ============================================================================

INSERT INTO distributors_products (distributor_dni, product_id) VALUES
-- Charlie Strong - Maneja alcohol legal e ilegal
('21012345', 1), ('21012345', 2), ('21012345', 3), ('21012345', 20),

-- Johnny Dogs - Caballos y operaciones en el campo
('23123456', 6), ('23123456', 8), ('23123456', 13),

-- Jeremiah Jesus - Armas y explosivos
('24234567', 14), ('24234567', 15), ('24234567', 16),

-- Isaiah Jesus - Drogas y mercancía robada
('25345678', 9), ('25345678', 10), ('25345678', 11), ('25345678', 13),

-- Finn Shelby - Apuestas y protección
('27456789', 6), ('27456789', 7), ('27456789', 19),

-- Aberama Gold - Operaciones especiales y alta sociedad
('22567891', 12), ('22567891', 18), ('22567891', 19), ('22567891', 5);

-- ============================================================================
-- SALES - Operaciones de los Peaky Blinders
-- ============================================================================

INSERT INTO sales (description, sale_date, sale_amount, distributor_dni, client_dni, authority_dni) VALUES
-- Ventas legales
('Suministro de whiskey para The Garrison Pub', NOW() - INTERVAL '60 days', 250.00, '21012345', '31345678', NULL),
('Apuestas carreras de Cheltenham', NOW() - INTERVAL '55 days', 500.00, '27456789', '28012345', NULL),
('Venta de caballos a May Carleton', NOW() - INTERVAL '50 days', 1500.00, '23123456', '30234567', NULL),
('Gin para el club de Londres', NOW() - INTERVAL '45 days', 180.00, '21012345', '29123456', NULL),
('Servicios de protección para comercios', NOW() - INTERVAL '40 days', 300.00, '27456789', '34678901', NULL),

-- Operaciones ilegales con sobornos
('Envío de opio desde los muelles de Londres', NOW() - INTERVAL '35 days', 2000.00, '25345678', '35789012', '15678901'),
('Suministro de armas para operación especial', NOW() - INTERVAL '30 days', 1500.00, '24234567', '29123456', '16789012'),
('Transacción de cocaína para Brilliant Chang', NOW() - INTERVAL '28 days', 3000.00, '25345678', '37901234', '15678901'),
('Información de carreras arregladas', NOW() - INTERVAL '25 days', 800.00, '27456789', '28012345', '17890123'),
('Mercancía robada de los muelles', NOW() - INTERVAL '22 days', 2500.00, '25345678', '36890123', '18901234'),
('Opio chino para distribución', NOW() - INTERVAL '20 days', 1800.00, '25345678', '37901234', '16789012'),
('Armas para Luca Changretta', NOW() - INTERVAL '18 days', 1200.00, '24234567', '34678901', '15678901'),

-- Ventas recientes legales
('Coñac francés para evento de alta sociedad', NOW() - INTERVAL '15 days', 500.00, '21012345', '30234567', NULL),
('Whiskey para pub de Camden Town', NOW() - INTERVAL '12 days', 300.00, '21012345', '29123456', NULL),
('Servicios de protección mensual', NOW() - INTERVAL '10 days', 400.00, '27456789', '32456789', NULL),

-- Operaciones recientes ilegales
('Joyas robadas para venta discreta', NOW() - INTERVAL '8 days', 5000.00, '22567891', '36890123', '15678901'),
('Billetes falsificados', NOW() - INTERVAL '6 days', 3500.00, '25345678', '34678901', '18901234'),
('Morfina desviada de hospital', NOW() - INTERVAL '4 days', 1600.00, '25345678', '35789012', '16789012'),
('Whiskey sin licencia para distribución masiva', NOW() - INTERVAL '2 days', 2400.00, '21012345', '29123456', '17890123'),
('Operación especial de opio', NOW() - INTERVAL '1 day', 2800.00, '25345678', '37901234', '15678901');

-- ============================================================================
-- SALE_DETAILS
-- ============================================================================

INSERT INTO sale_details (quantity, subtotal, sale_id, product_id) VALUES
-- Venta 1
(20, 200.00, 1, 1), (10, 50.00, 1, 2),
-- Venta 2
(500, 500.00, 2, 6),
-- Venta 3
(3, 1500.00, 3, 8),
-- Venta 4
(30, 180.00, 4, 2),
-- Venta 5
(6, 300.00, 5, 7),
-- Venta 6 - ILEGAL
(20, 2000.00, 6, 9),
-- Venta 7 - ILEGAL
(20, 900.00, 7, 14), (10, 600.00, 7, 16),
-- Venta 8 - ILEGAL
(20, 3000.00, 8, 10),
-- Venta 9 - ILEGAL
(4, 800.00, 9, 19),
-- Venta 10 - ILEGAL
(10, 2000.00, 10, 13), (10, 500.00, 10, 16),
-- Venta 11 - ILEGAL
(15, 1800.00, 11, 11),
-- Venta 12 - ILEGAL
(20, 900.00, 12, 14), (2, 300.00, 12, 16),
-- Venta 13
(20, 500.00, 13, 5),
-- Venta 14
(50, 300.00, 14, 2),
-- Venta 15
(8, 400.00, 15, 7),
-- Venta 16 - ILEGAL
(5, 5000.00, 16, 18),
-- Venta 17 - ILEGAL
(70, 3500.00, 17, 17),
-- Venta 18 - ILEGAL
(20, 1600.00, 18, 12),
-- Venta 19 - ILEGAL
(400, 2400.00, 19, 20),
-- Venta 20 - ILEGAL
(20, 2000.00, 20, 9), (10, 800.00, 20, 12);

-- ============================================================================
-- BRIBES - Sobornos a la policía corrupta
-- ============================================================================

INSERT INTO bribes (total_amount, paid_amount, creation_date, authority_dni, sale_id) VALUES
-- Venta 6: £2000 * 25% (rank 3) = £500
(500.00, 500.00, NOW() - INTERVAL '35 days', '15678901', 6),
-- Venta 7: £1500 * 15% (rank 2) = £225
(225.00, 225.00, NOW() - INTERVAL '30 days', '16789012', 7),
-- Venta 8: £3000 * 25% (rank 3) = £750
(750.00, 750.00, NOW() - INTERVAL '28 days', '15678901', 8),
-- Venta 9: £800 * 10% (rank 1) = £80
(80.00, 80.00, NOW() - INTERVAL '25 days', '17890123', 9),
-- Venta 10: £2500 * 15% (rank 2) = £375
(375.00, 200.00, NOW() - INTERVAL '22 days', '18901234', 10),
-- Venta 11: £1800 * 15% (rank 2) = £270
(270.00, 150.00, NOW() - INTERVAL '20 days', '16789012', 11),
-- Venta 12: £1200 * 25% (rank 3) = £300
(300.00, 100.00, NOW() - INTERVAL '18 days', '15678901', 12),
-- Venta 16: £5000 * 25% (rank 3) = £1250
(1250.00, 0.00, NOW() - INTERVAL '8 days', '15678901', 16),
-- Venta 17: £3500 * 15% (rank 2) = £525
(525.00, 0.00, NOW() - INTERVAL '6 days', '18901234', 17),
-- Venta 18: £1600 * 15% (rank 2) = £240
(240.00, 0.00, NOW() - INTERVAL '4 days', '16789012', 18),
-- Venta 19: £2400 * 10% (rank 1) = £240
(240.00, 0.00, NOW() - INTERVAL '2 days', '17890123', 19),
-- Venta 20: £2800 * 25% (rank 3) = £700
(700.00, 0.00, NOW() - INTERVAL '1 day', '15678901', 20);

-- ============================================================================
-- TOPICS
-- ============================================================================

INSERT INTO topics (description) VALUES
('Expansión territorial y nuevas rutas'),
('Alianzas con otras organizaciones criminales'),
('Operaciones de carreras de caballos'),
('Negocios legítimos y lavado de dinero'),
('Gestión de conflictos con autoridades'),
('Contrabando y rutas de importación'),
('Política y conexiones gubernamentales'),
('Venganzas y rivalidades familiares');

-- ============================================================================
-- STRATEGIC_DECISIONS
-- ============================================================================

INSERT INTO strategic_decisions (description, start_date, end_date, topic_id) VALUES
('Expansión a Camden Town y alianza con Alfie Solomons', NOW() - INTERVAL '6 months', NOW() + INTERVAL '6 months', 1),
('Control total de las apuestas en Cheltenham', NOW() - INTERVAL '4 months', NOW() + INTERVAL '8 months', 3),
('Establecimiento de Shelby Company Limited como negocio legal', NOW() - INTERVAL '3 months', NOW() + INTERVAL '9 months', 4),
('Eliminación de la amenaza Changretta', NOW() - INTERVAL '2 months', NOW() + INTERVAL '4 months', 8),
('Rutas de contrabando desde London Docks', NOW() - INTERVAL '5 months', NOW() + INTERVAL '7 months', 6),
('Infiltración en el Parlamento británico', NOW() - INTERVAL '1 month', NOW() + INTERVAL '12 months', 7),
('Neutralización de Inspector Campbell', NOW() - INTERVAL '3 months', NOW() + INTERVAL '3 months', 5);

-- ============================================================================
-- STRATEGIC_DECISIONS_USERS
-- ============================================================================

INSERT INTO strategic_decisions_users (strategic_decision_id, user_id) VALUES
(1, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(1, (SELECT id FROM users WHERE username = 'arthur_shelby')),
(1, (SELECT id FROM users WHERE username = 'alfie_solomons')),
(2, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(2, (SELECT id FROM users WHERE username = 'john_shelby')),
(2, (SELECT id FROM users WHERE username = 'arthur_shelby')),
(3, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(3, (SELECT id FROM users WHERE username = 'polly_gray')),
(3, (SELECT id FROM users WHERE username = 'michael_gray')),
(4, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(4, (SELECT id FROM users WHERE username = 'arthur_shelby')),
(4, (SELECT id FROM users WHERE username = 'john_shelby')),
(5, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(5, (SELECT id FROM users WHERE username = 'alfie_solomons')),
(6, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(6, (SELECT id FROM users WHERE username = 'ada_shelby')),
(6, (SELECT id FROM users WHERE username = 'polly_gray')),
(7, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(7, (SELECT id FROM users WHERE username = 'polly_gray'));

-- ============================================================================
-- PARTNERS_DECISIONS
-- ============================================================================

INSERT INTO partners_decisions (partner_dni, strategic_decision_id) VALUES
('22567890', 1), ('22567890', 2), ('22567890', 4), ('22567890', 7),
('24678901', 2), ('24678901', 4), ('24678901', 5),
('26789012', 3), ('26789012', 5), ('26789012', 6),
('25890123', 3), ('25890123', 6),
('19901234', 1), ('19901234', 5);

-- ============================================================================
-- CONSEJOS_SHELBY
-- ============================================================================

INSERT INTO consejos_shelby (partner_dni, decision_id, join_date, role, notes) VALUES
('22567890', 1, NOW() - INTERVAL '6 months', 'Muscle', 'Responsable de operaciones físicas y seguridad'),
('19901234', 1, NOW() - INTERVAL '6 months', 'Socio Externo', 'Aliado estratégico en Camden Town'),
('22567890', 2, NOW() - INTERVAL '4 months', 'Jefe de Operaciones', 'Gestión de apuestas ilegales'),
('24678901', 2, NOW() - INTERVAL '4 months', 'Coordinador', 'Coordinación con jockeys y entrenadores'),
('26789012', 3, NOW() - INTERVAL '3 months', 'Contador', 'Estructura legal y financiera'),
('22567890', 4, NOW() - INTERVAL '2 months', 'Ejecutor', 'Venganza contra mafia italiana'),
('19901234', 5, NOW() - INTERVAL '5 months', 'Facilitador', 'Contactos en puertos de Londres'),
('25890123', 6, NOW() - INTERVAL '1 month', 'Diplomática', 'Conexiones políticas en Londres'),
('22567890', 7, NOW() - INTERVAL '3 months', 'Operativo', 'Intimidación y presión');

-- ============================================================================
-- MONTHLY_REVIEWS
-- ============================================================================

INSERT INTO monthly_reviews (year, month, review_date, status, observations, total_sales_amount, total_sales_count, recommendations, reviewed_by_dni) VALUES
(1924, 10, NOW() - INTERVAL '4 months', 'APPROVED', 'Mes exitoso con expansión a Camden Town', 8500.00, 45, 'Continuar presión sobre Sabini', '22567890'),
(1924, 11, NOW() - INTERVAL '3 months', 'APPROVED', 'Victoria en Cheltenham, control de apuestas asegurado', 12000.00, 67, 'Expandir operaciones de carreras', '22567890'),
(1924, 12, NOW() - INTERVAL '2 months', 'COMPLETED', 'Cierre de año excepcional, negocios legítimos establecidos', 15000.00, 89, 'Preparar infiltración política', '26789012'),
(1925, 1, NOW() - INTERVAL '1 month', 'IN_REVIEW', 'Amenaza Changretta neutralizada parcialmente', 10500.00, 56, NULL, '22567890'),
(1925, 2, NOW() - INTERVAL '5 days', 'PENDING', 'Mes en curso, operaciones activas', NULL, NULL, NULL, '26789012');

-- ============================================================================
-- CLANDESTINE_AGREEMENTS
-- ============================================================================

INSERT INTO clandestine_agreements (shelby_council_id, admin_dni, authority_dni, agreement_date, description, status) VALUES
(1, '20456789', '15678901', NOW() - INTERVAL '6 months', 'Protección para operaciones en Camden Town a cambio de información', 'ACTIVE'),
(2, '20456789', '16789012', NOW() - INTERVAL '4 months', 'No intervención en Cheltenham durante temporada de carreras', 'ACTIVE'),
(5, '18234567', '17890123', NOW() - INTERVAL '5 months', 'Vista gorda en operaciones de contrabando del puerto', 'ACTIVE'),
(7, '20456789', '15678901', NOW() - INTERVAL '3 months', 'Eliminar amenaza Campbell a cambio de sobornos', 'COMPLETED'),
(9, '18234567', '18901234', NOW() - INTERVAL '1 month', 'Protección para reuniones políticas', 'ACTIVE');

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

INSERT INTO notifications (id, type, title, message, status, related_entity_id, related_entity_type, user_id, created_at) VALUES
(gen_random_uuid(), 'USER_VERIFICATION_APPROVED', 'Bienvenido a Shelby Company Ltd', 'Tu membresía ha sido aprobada por orden de los Peaky Blinders', 'READ', NULL, 'user-verification', (SELECT id FROM users WHERE username = 'finn_shelby'), NOW() - INTERVAL '8 months'),
(gen_random_uuid(), 'SYSTEM', 'Operación Exitosa', 'Envío de opio completado sin incidentes', 'READ', '6', 'sale', (SELECT id FROM users WHERE username = 'isaiah_jesus'), NOW() - INTERVAL '35 days'),
(gen_random_uuid(), 'SYSTEM', 'Alerta: Changretta', 'Movimientos sospechosos de mafia italiana detectados', 'READ', NULL, 'system', (SELECT id FROM users WHERE username = 'tommy_shelby'), NOW() - INTERVAL '2 months'),
(gen_random_uuid(), 'SYSTEM', 'Victoria en Cheltenham', 'Control total de apuestas asegurado', 'READ', '2', 'sale', (SELECT id FROM users WHERE username = 'tommy_shelby'), NOW() - INTERVAL '4 months'),
(gen_random_uuid(), 'SYSTEM', 'Reunión del Consejo', 'Reunión estratégica programada en The Garrison', 'UNREAD', NULL, 'system', (SELECT id FROM users WHERE username = 'arthur_shelby'), NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'SYSTEM', 'Soborno Pendiente', 'Inspector Campbell requiere pago pendiente de £1,250', 'UNREAD', NULL, 'bribe', (SELECT id FROM users WHERE username = 'polly_gray'), NOW() - INTERVAL '8 days'),
(gen_random_uuid(), 'SYSTEM', 'Nueva Alianza', 'Alfie Solomons solicita reunión urgente', 'UNREAD', NULL, 'system', (SELECT id FROM users WHERE username = 'tommy_shelby'), NOW() - INTERVAL '1 day');

-- ============================================================================
-- EMAIL_VERIFICATIONS
-- ============================================================================

INSERT INTO email_verifications (token, email, status, expires_at, verified_at, created_at) VALUES
('ev-shelby-001', 'thomas.shelby@shelbyltd.co.uk', 'verified', NOW() + INTERVAL '15 minutes', NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
('ev-shelby-002', 'arthur.shelby@shelbyltd.co.uk', 'verified', NOW() + INTERVAL '15 minutes', NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years'),
('ev-gray-001', 'michael.gray@shelbyltd.co.uk', 'verified', NOW() + INTERVAL '15 minutes', NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year'),
('ev-pending-001', 'patron@garrison.co.uk', 'pending', NOW() + INTERVAL '10 minutes', NULL, NOW() - INTERVAL '5 minutes'),
('ev-expired-001', 'oldcontact@birmingham.co.uk', 'expired', NOW() - INTERVAL '1 day', NULL, NOW() - INTERVAL '2 days');

-- ============================================================================
-- USER_VERIFICATIONS
-- ============================================================================

INSERT INTO user_verifications (token, email, status, expires_at, verified_at, attempts, created_at) VALUES
('uv-charlie-001', 'charlie.strong@shelbyltd.co.uk', 'verified', NOW() + INTERVAL '24 hours', NOW() - INTERVAL '18 months', 1, NOW() - INTERVAL '18 months'),
('uv-finn-001', 'finn.shelby@shelbyltd.co.uk', 'verified', NOW() + INTERVAL '24 hours', NOW() - INTERVAL '8 months', 1, NOW() - INTERVAL '8 months'),
('uv-pending-001', 'worker@smallheath.co.uk', 'pending', NOW() + INTERVAL '20 hours', NULL, 0, NOW() - INTERVAL '3 hours'),
('uv-expired-001', 'rejected@birmingham.co.uk', 'expired', NOW() - INTERVAL '2 days', NULL, 3, NOW() - INTERVAL '3 days');

-- ============================================================================
-- ROLE_REQUESTS
-- ============================================================================

INSERT INTO role_requests (id, requested_role, role_to_remove, status, justification, additional_data, created_at, reviewed_at, admin_comments, user_id, reviewed_by_id) VALUES
(gen_random_uuid(), 'DISTRIBUTOR', NULL, 'APPROVED', 'Miembro de confianza de la familia, listo para operaciones', '{"zoneId": 1, "address": "6 Watery Lane, Small Heath"}', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months', 'Aprobado por Tommy Shelby - By order of the Peaky Blinders', (SELECT id FROM users WHERE username = 'finn_shelby'), (SELECT id FROM users WHERE username = 'tommy_shelby')),
(gen_random_uuid(), 'PARTNER', NULL, 'APPROVED', 'Contador de confianza, familia directa', NULL, NOW() - INTERVAL '1 year', NOW() - INTERVAL '1 year', 'Aprobado - Familia Gray', (SELECT id FROM users WHERE username = 'michael_gray'), (SELECT id FROM users WHERE username = 'polly_gray')),
(gen_random_uuid(), 'DISTRIBUTOR', NULL, 'PENDING', 'Trabajador leal del pub, solicita unirse a las operaciones', '{"zoneId": 1, "address": "Small Heath, Birmingham"}', NOW() - INTERVAL '1 week', NULL, NULL, (SELECT id FROM users WHERE username = 'pub_patron'), NULL),
(gen_random_uuid(), 'CLIENT', NULL, 'PENDING', 'Comerciante que busca protección de los Peaky Blinders', NULL, NOW() - INTERVAL '3 days', NULL, NULL, (SELECT id FROM users WHERE username = 'factory_worker'), NULL),
(gen_random_uuid(), 'PARTNER', NULL, 'REJECTED', 'Solicitud sin aval familiar', NULL, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months', 'Rechazado - No tiene conexión con la familia Shelby', (SELECT id FROM users WHERE username = 'pub_patron'), (SELECT id FROM users WHERE username = 'tommy_shelby'));

-- ============================================================================
-- REFRESH_TOKENS
-- ============================================================================

INSERT INTO refresh_tokens (id, token, expires_at, created_at, ip_address, user_agent, is_revoked, user_id) VALUES
(gen_random_uuid(), 'token_tommy_' || gen_random_uuid()::text, NOW() + INTERVAL '7 days', NOW() - INTERVAL '2 hours', '192.168.1.100', 'Telegraph Office Terminal', false, (SELECT id FROM users WHERE username = 'tommy_shelby')),
(gen_random_uuid(), 'token_arthur_' || gen_random_uuid()::text, NOW() + INTERVAL '7 days', NOW() - INTERVAL '1 hour', '192.168.1.101', 'Garrison Pub Terminal', false, (SELECT id FROM users WHERE username = 'arthur_shelby')),
(gen_random_uuid(), 'token_polly_' || gen_random_uuid()::text, NOW() + INTERVAL '7 days', NOW() - INTERVAL '30 minutes', '192.168.1.102', 'Office Terminal', false, (SELECT id FROM users WHERE username = 'polly_gray'));

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

DO $$
DECLARE
    v_users INTEGER;
    v_sales INTEGER;
    v_bribes INTEGER;
    v_admins INTEGER;
    v_partners INTEGER;
    v_distributors INTEGER;
    v_authorities INTEGER;
    v_clients INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_users FROM users;
    SELECT COUNT(*) INTO v_sales FROM sales;
    SELECT COUNT(*) INTO v_bribes FROM bribes;
    SELECT COUNT(*) INTO v_admins FROM admins;
    SELECT COUNT(*) INTO v_partners FROM partners;
    SELECT COUNT(*) INTO v_distributors FROM distributors;
    SELECT COUNT(*) INTO v_authorities FROM authorities;
    SELECT COUNT(*) INTO v_clients FROM clients;

    RAISE NOTICE '================================================================';
    RAISE NOTICE '         BY ORDER OF THE PEAKY BLINDERS';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Database Population Complete - DNI Argentino Format';
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE 'Users:                 %', v_users;
    RAISE NOTICE 'Admins:                %', v_admins;
    RAISE NOTICE 'Partners:              %', v_partners;
    RAISE NOTICE 'Distributors:          %', v_distributors;
    RAISE NOTICE 'Authorities:           %', v_authorities;
    RAISE NOTICE 'Clients:               %', v_clients;
    RAISE NOTICE 'Sales:                 %', v_sales;
    RAISE NOTICE 'Bribes to Police:      %', v_bribes;
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Main Accounts (password: password123):';
    RAISE NOTICE '  Tommy Shelby:        tommy_shelby / thomas.shelby@shelbyltd.co.uk';
    RAISE NOTICE '  Arthur Shelby:       arthur_shelby / arthur.shelby@shelbyltd.co.uk';
    RAISE NOTICE '  Polly Gray:          polly_gray / elizabeth.gray@shelbyltd.co.uk';
    RAISE NOTICE '  Alfie Solomons:      alfie_solomons / alfie.solomons@camdentownbrewery.co.uk';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'DNI Examples (Formato Argentino):';
    RAISE NOTICE '  Tommy Shelby (Admin):      DNI 20456789';
    RAISE NOTICE '  Arthur Shelby (Partner):   DNI 22567890';
    RAISE NOTICE '  Charlie Strong (Dist):     DNI 21012345';
    RAISE NOTICE '  Inspector Campbell (Auth): DNI 15678901';
    RAISE NOTICE '  Billy Kimber (Client):     DNI 28012345';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'Location: Birmingham, England - 1920s';
    RAISE NOTICE '================================================================';
END $$;
