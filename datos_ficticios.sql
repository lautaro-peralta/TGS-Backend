-- ========================================
-- Datos ficticios para poblar la base
-- ========================================

-- Users
INSERT INTO `users` (id, username, email, password, roles, is_active, email_verified, created_at, updated_at)
VALUES
('u1', 'admin01', 'admin01@example.com', 'hashed_password', '["ADMIN"]', 1, 1, NOW(), NOW()),
('u2', 'client01', 'client01@example.com', 'hashed_password', '["CLIENT"]', 1, 1, NOW(), NOW()),
('u3', 'distributor01', 'distributor01@example.com', 'hashed_password', '["DISTRIBUTOR"]', 1, 1, NOW(), NOW());

-- Clients
INSERT INTO `clients` (id, dni, name, email, phone, address, user_id)
VALUES
('c1', '12345678', 'Cliente Uno', 'cliente1@mail.com', '3411234567', 'Calle Falsa 123', 'u2');

-- Products
INSERT INTO `products` (description, detail, price, stock, is_illegal)
VALUES
('Producto A', 'Detalle del Producto A', 100, 50, 0),
('Producto B', 'Detalle del Producto B', 200, 30, 0),
('Producto C', 'Detalle del Producto C', 150, 20, 1);

-- Distributors
INSERT INTO `distributors` (id, dni, name, email, phone, address, user_id, zone_id)
VALUES
('d1', '87654321', 'Distribuidor Uno', 'dist1@mail.com', '3417654321', 'Av Siempre Viva 456', 'u3', 1);

-- Sales
INSERT INTO `sales` (description, sale_date, sale_amount, distributor_id, client_id, authority_id)
VALUES
('Venta 1', NOW(), 300, 'd1', 'c1', NULL);

-- Sale details
INSERT INTO `sale_details` (quantity, subtotal, sale_id, product_id)
VALUES
(2, 200, 1, 1),
(1, 100, 1, 2);

-- Authorities
INSERT INTO `authorities` (id, dni, name, email, phone, address, user_id, rank, zone_id)
VALUES
('a1', '99999999', 'Autoridad Uno', 'autoridad1@mail.com', '3419999999', 'Zona Central', NULL, 1, 1);

-- Bribes
INSERT INTO `bribes` (amount, paid, creation_date, authority_id, sale_id)
VALUES
(50, 0, NOW(), 'a1', 1);

-- Zones
INSERT INTO `zones` (name, is_headquarters)
VALUES
('Zona 1', 1);
