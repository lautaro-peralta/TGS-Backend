-- ============================================================================
-- SCRIPT DE CREACIÓN DE ESQUEMA PARA NEON TECH (PostgreSQL)
-- TGS Backend Database Schema
-- ============================================================================
-- Este script crea la estructura completa de la base de datos.
-- NOTA: Solo incluye la definición de tablas (DDL), sin datos de prueba.
-- ============================================================================

-- Eliminar extensiones y tablas existentes si existen (opcional para desarrollo)
-- DESCOMENTAR SI SE DESEA LIMPIAR LA BASE DE DATOS ANTES DE RECREARLA
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- ============================================================================
-- EXTENSIONES
-- ============================================================================

-- Extensión para UUIDs (requerida para UUIDv7)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: users
-- Usuarios del sistema con autenticación y roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    roles TEXT[] NOT NULL DEFAULT ARRAY['USER']::TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP,
    profile_completeness INTEGER NOT NULL DEFAULT 25,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

COMMENT ON TABLE users IS 'Usuarios del sistema con autenticación JWT';
COMMENT ON COLUMN users.is_verified IS 'Verificación manual por admin de todos los datos personales';
COMMENT ON COLUMN users.email_verified IS 'Validación automática de email (click en link)';
COMMENT ON COLUMN users.profile_completeness IS 'Porcentaje de completitud del perfil (0-100)';

-- ============================================================================
-- TABLA: persons
-- Información personal de usuarios (OneToOne con users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY,
    dni VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    user_id UUID UNIQUE,
    CONSTRAINT fk_persons_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_persons_dni ON persons(dni);
CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons(user_id);

COMMENT ON TABLE persons IS 'Información personal base para usuarios y entidades derivadas';
COMMENT ON COLUMN persons.email IS 'Email sincronizado con el email del usuario asociado';

-- ============================================================================
-- TABLA: zones
-- Zonas geográficas para distribuidores y autoridades
-- ============================================================================

CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_zones_name ON zones(name);

COMMENT ON TABLE zones IS 'Zonas geográficas de operación';
COMMENT ON COLUMN zones.is_headquarters IS 'Indica si la zona es una sede central';

-- ============================================================================
-- TABLA: distributors
-- Distribuidores del sistema (hereda de persons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS distributors (
    dni VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    zone_id INTEGER,
    user_id UUID UNIQUE,
    CONSTRAINT fk_distributors_zone FOREIGN KEY (zone_id)
        REFERENCES zones(id) ON DELETE SET NULL,
    CONSTRAINT fk_distributors_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_distributors_zone ON distributors(zone_id);
CREATE INDEX IF NOT EXISTS idx_distributors_email ON distributors(email);

COMMENT ON TABLE distributors IS 'Distribuidores de productos';

-- ============================================================================
-- TABLA: clients
-- Clientes del sistema (hereda de persons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
    dni VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    user_id UUID UNIQUE,
    CONSTRAINT fk_clients_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

COMMENT ON TABLE clients IS 'Clientes que realizan compras';

-- ============================================================================
-- TABLA: partners
-- Socios del negocio (hereda de persons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partners (
    dni VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    user_id UUID UNIQUE,
    CONSTRAINT fk_partners_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);

COMMENT ON TABLE partners IS 'Socios del negocio con participación en decisiones estratégicas';

-- ============================================================================
-- TABLA: authorities
-- Autoridades con rango y comisión (hereda de persons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS authorities (
    dni VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    rank INTEGER NOT NULL,
    zone_id INTEGER NOT NULL,
    user_id UUID UNIQUE,
    CONSTRAINT fk_authorities_zone FOREIGN KEY (zone_id)
        REFERENCES zones(id) ON DELETE CASCADE,
    CONSTRAINT fk_authorities_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_authorities_rank CHECK (rank >= 0 AND rank <= 3)
);

CREATE INDEX IF NOT EXISTS idx_authorities_zone ON authorities(zone_id);
CREATE INDEX IF NOT EXISTS idx_authorities_rank ON authorities(rank);

COMMENT ON TABLE authorities IS 'Autoridades con rangos y comisiones';
COMMENT ON COLUMN authorities.rank IS 'Rango de autoridad (0-3): 0=5%, 1=10%, 2=15%, 3=25%';

-- ============================================================================
-- TABLA: admins
-- Administradores del sistema (hereda de persons)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admins (
    dni VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    department VARCHAR(255),
    user_id UUID UNIQUE,
    CONSTRAINT fk_admins_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

COMMENT ON TABLE admins IS 'Administradores del sistema';

-- ============================================================================
-- TABLA: products
-- Productos disponibles para la venta
-- ============================================================================

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    detail TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    is_illegal BOOLEAN NOT NULL DEFAULT FALSE,
    image_urls JSONB,
    CONSTRAINT chk_products_price CHECK (price >= 0),
    CONSTRAINT chk_products_stock CHECK (stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_is_illegal ON products(is_illegal);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

COMMENT ON TABLE products IS 'Catálogo de productos';
COMMENT ON COLUMN products.image_urls IS 'URLs de imágenes almacenadas en UploadThing (JSONB array)';

-- ============================================================================
-- TABLA: distributors_products
-- Relación N:M entre distributors y products
-- ============================================================================

CREATE TABLE IF NOT EXISTS distributors_products (
    distributor_dni VARCHAR(50) NOT NULL,
    product_id INTEGER NOT NULL,
    PRIMARY KEY (distributor_dni, product_id),
    CONSTRAINT fk_dp_distributor FOREIGN KEY (distributor_dni)
        REFERENCES distributors(dni) ON DELETE CASCADE,
    CONSTRAINT fk_dp_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dp_distributor ON distributors_products(distributor_dni);
CREATE INDEX IF NOT EXISTS idx_dp_product ON distributors_products(product_id);

COMMENT ON TABLE distributors_products IS 'Productos que distribuye cada distribuidor';

-- ============================================================================
-- TABLA: sales
-- Ventas realizadas en el sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    description TEXT,
    sale_date TIMESTAMP NOT NULL,
    sale_amount DECIMAL(10, 2) NOT NULL,
    distributor_dni VARCHAR(50) NOT NULL,
    client_dni VARCHAR(50),
    authority_dni VARCHAR(50),
    CONSTRAINT fk_sales_distributor FOREIGN KEY (distributor_dni)
        REFERENCES distributors(dni) ON DELETE CASCADE,
    CONSTRAINT fk_sales_client FOREIGN KEY (client_dni)
        REFERENCES clients(dni) ON DELETE SET NULL,
    CONSTRAINT fk_sales_authority FOREIGN KEY (authority_dni)
        REFERENCES authorities(dni) ON DELETE SET NULL,
    CONSTRAINT chk_sales_amount CHECK (sale_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_distributor ON sales(distributor_dni);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_dni);
CREATE INDEX IF NOT EXISTS idx_sales_authority ON sales(authority_dni);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);

COMMENT ON TABLE sales IS 'Registro de ventas realizadas';

-- ============================================================================
-- TABLA: sale_details
-- Detalles de cada venta (productos y cantidades)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sale_details (
    id SERIAL PRIMARY KEY,
    quantity INTEGER NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    CONSTRAINT fk_sd_sale FOREIGN KEY (sale_id)
        REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_sd_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT chk_sd_quantity CHECK (quantity > 0),
    CONSTRAINT chk_sd_subtotal CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sd_sale ON sale_details(sale_id);
CREATE INDEX IF NOT EXISTS idx_sd_product ON sale_details(product_id);

COMMENT ON TABLE sale_details IS 'Líneas de detalle de cada venta';

-- ============================================================================
-- TABLA: bribes
-- Sobornos asociados a ventas y autoridades
-- ============================================================================

CREATE TABLE IF NOT EXISTS bribes (
    id SERIAL PRIMARY KEY,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    creation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    authority_dni VARCHAR(50) NOT NULL,
    sale_id INTEGER NOT NULL,
    CONSTRAINT fk_bribes_authority FOREIGN KEY (authority_dni)
        REFERENCES authorities(dni) ON DELETE CASCADE,
    CONSTRAINT fk_bribes_sale FOREIGN KEY (sale_id)
        REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT chk_bribes_total CHECK (total_amount >= 0),
    CONSTRAINT chk_bribes_paid CHECK (paid_amount >= 0 AND paid_amount <= total_amount)
);

CREATE INDEX IF NOT EXISTS idx_bribes_authority ON bribes(authority_dni);
CREATE INDEX IF NOT EXISTS idx_bribes_sale ON bribes(sale_id);

COMMENT ON TABLE bribes IS 'Sobornos pagados a autoridades';
COMMENT ON COLUMN bribes.paid_amount IS 'Monto ya pagado del soborno';

-- ============================================================================
-- TABLA: topics
-- Temas para decisiones estratégicas
-- ============================================================================

CREATE TABLE IF NOT EXISTS topics (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL
);

COMMENT ON TABLE topics IS 'Temas de discusión para decisiones estratégicas';

-- ============================================================================
-- TABLA: strategic_decisions
-- Decisiones estratégicas del negocio
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategic_decisions (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    topic_id INTEGER NOT NULL,
    CONSTRAINT fk_sd_topic FOREIGN KEY (topic_id)
        REFERENCES topics(id) ON DELETE CASCADE,
    CONSTRAINT chk_sd_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sd_topic ON strategic_decisions(topic_id);
CREATE INDEX IF NOT EXISTS idx_sd_dates ON strategic_decisions(start_date, end_date);

COMMENT ON TABLE strategic_decisions IS 'Decisiones estratégicas del consejo';

-- ============================================================================
-- TABLA: strategic_decisions_users
-- Relación N:M entre strategic_decisions y users (socios participantes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategic_decisions_users (
    strategic_decision_id INTEGER NOT NULL,
    user_id UUID NOT NULL,
    PRIMARY KEY (strategic_decision_id, user_id),
    CONSTRAINT fk_sdu_decision FOREIGN KEY (strategic_decision_id)
        REFERENCES strategic_decisions(id) ON DELETE CASCADE,
    CONSTRAINT fk_sdu_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sdu_decision ON strategic_decisions_users(strategic_decision_id);
CREATE INDEX IF NOT EXISTS idx_sdu_user ON strategic_decisions_users(user_id);

COMMENT ON TABLE strategic_decisions_users IS 'Usuarios (socios) involucrados en cada decisión estratégica';

-- ============================================================================
-- TABLA: partners_decisions
-- Relación N:M entre partners y strategic_decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS partners_decisions (
    partner_dni VARCHAR(50) NOT NULL,
    strategic_decision_id INTEGER NOT NULL,
    PRIMARY KEY (partner_dni, strategic_decision_id),
    CONSTRAINT fk_pd_partner FOREIGN KEY (partner_dni)
        REFERENCES partners(dni) ON DELETE CASCADE,
    CONSTRAINT fk_pd_decision FOREIGN KEY (strategic_decision_id)
        REFERENCES strategic_decisions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pd_partner ON partners_decisions(partner_dni);
CREATE INDEX IF NOT EXISTS idx_pd_decision ON partners_decisions(strategic_decision_id);

COMMENT ON TABLE partners_decisions IS 'Socios participantes en decisiones estratégicas';

-- ============================================================================
-- TABLA: consejos_shelby
-- Agregación entre Partner y StrategicDecision (Shelby Council)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consejos_shelby (
    id SERIAL PRIMARY KEY,
    partner_dni VARCHAR(50) NOT NULL,
    decision_id INTEGER NOT NULL,
    join_date TIMESTAMP NOT NULL,
    role VARCHAR(255),
    notes TEXT,
    CONSTRAINT fk_cs_partner FOREIGN KEY (partner_dni)
        REFERENCES partners(dni) ON DELETE CASCADE,
    CONSTRAINT fk_cs_decision FOREIGN KEY (decision_id)
        REFERENCES strategic_decisions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cs_partner ON consejos_shelby(partner_dni);
CREATE INDEX IF NOT EXISTS idx_cs_decision ON consejos_shelby(decision_id);

COMMENT ON TABLE consejos_shelby IS 'Consejo Shelby - Agregación entre socios y decisiones estratégicas';

-- ============================================================================
-- TABLA: monthly_reviews
-- Revisiones mensuales de ventas por el consejo
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_reviews (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    review_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    observations TEXT,
    total_sales_amount DECIMAL(10, 2),
    total_sales_count INTEGER,
    recommendations TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_dni VARCHAR(50) NOT NULL,
    CONSTRAINT fk_mr_partner FOREIGN KEY (reviewed_by_dni)
        REFERENCES partners(dni) ON DELETE CASCADE,
    CONSTRAINT chk_mr_month CHECK (month >= 1 AND month <= 12),
    CONSTRAINT chk_mr_status CHECK (status IN ('PENDING', 'IN_REVIEW', 'COMPLETED', 'APPROVED', 'REJECTED')),
    CONSTRAINT uq_mr_period UNIQUE (year, month)
);

CREATE INDEX IF NOT EXISTS idx_mr_period ON monthly_reviews(year, month);
CREATE INDEX IF NOT EXISTS idx_mr_status ON monthly_reviews(status);
CREATE INDEX IF NOT EXISTS idx_mr_reviewer ON monthly_reviews(reviewed_by_dni);

COMMENT ON TABLE monthly_reviews IS 'Revisiones mensuales de ventas realizadas por el consejo';

-- ============================================================================
-- TABLA: clandestine_agreements
-- Acuerdos clandestinos (relación ternaria: ShelbyCouncil-Admin-Authority)
-- ============================================================================

CREATE TABLE IF NOT EXISTS clandestine_agreements (
    id SERIAL PRIMARY KEY,
    shelby_council_id INTEGER NOT NULL,
    admin_dni VARCHAR(50) NOT NULL,
    authority_dni VARCHAR(50) NOT NULL,
    agreement_date TIMESTAMP NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT fk_ca_council FOREIGN KEY (shelby_council_id)
        REFERENCES consejos_shelby(id) ON DELETE CASCADE,
    CONSTRAINT fk_ca_admin FOREIGN KEY (admin_dni)
        REFERENCES admins(dni) ON DELETE CASCADE,
    CONSTRAINT fk_ca_authority FOREIGN KEY (authority_dni)
        REFERENCES authorities(dni) ON DELETE CASCADE,
    CONSTRAINT chk_ca_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_ca_council ON clandestine_agreements(shelby_council_id);
CREATE INDEX IF NOT EXISTS idx_ca_admin ON clandestine_agreements(admin_dni);
CREATE INDEX IF NOT EXISTS idx_ca_authority ON clandestine_agreements(authority_dni);
CREATE INDEX IF NOT EXISTS idx_ca_status ON clandestine_agreements(status);

COMMENT ON TABLE clandestine_agreements IS 'Acuerdos clandestinos entre consejo, admin y autoridad';

-- ============================================================================
-- TABLA: notifications
-- Notificaciones del sistema para usuarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNREAD',
    related_entity_id VARCHAR(255),
    related_entity_type VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    user_id UUID NOT NULL,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_notification_status CHECK (status IN ('UNREAD', 'READ'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'Notificaciones del sistema';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación (USER_VERIFICATION_APPROVED, ROLE_REQUEST_APPROVED, etc.)';

-- ============================================================================
-- TABLA: refresh_tokens
-- Tokens de refresco para autenticación JWT
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP,
    user_id UUID NOT NULL,
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rt_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_rt_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at);

COMMENT ON TABLE refresh_tokens IS 'Tokens de refresco para rotación JWT';

-- ============================================================================
-- TABLA: email_verifications
-- Verificaciones automáticas de email (click en link)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_ev_status CHECK (status IN ('pending', 'verified', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_ev_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_ev_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_ev_status ON email_verifications(status);

COMMENT ON TABLE email_verifications IS 'Verificaciones automáticas de email por click en link';

-- ============================================================================
-- TABLA: user_verifications
-- Verificaciones manuales de usuarios por admin (todos los datos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_verifications (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_uv_status CHECK (status IN ('pending', 'verified', 'expired', 'cancelled')),
    CONSTRAINT chk_uv_attempts CHECK (attempts >= 0 AND attempts <= max_attempts)
);

CREATE INDEX IF NOT EXISTS idx_uv_token ON user_verifications(token);
CREATE INDEX IF NOT EXISTS idx_uv_email ON user_verifications(email);
CREATE INDEX IF NOT EXISTS idx_uv_status ON user_verifications(status);

COMMENT ON TABLE user_verifications IS 'Verificaciones manuales por admin de todos los datos del usuario';

-- ============================================================================
-- TABLA: role_requests
-- Solicitudes de roles especiales (PARTNER, DISTRIBUTOR, AUTHORITY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_requests (
    id UUID PRIMARY KEY,
    requested_role VARCHAR(50) NOT NULL,
    role_to_remove VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    justification TEXT,
    additional_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    admin_comments TEXT,
    user_id UUID NOT NULL,
    reviewed_by_id UUID,
    CONSTRAINT fk_rr_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_reviewed_by FOREIGN KEY (reviewed_by_id)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_rr_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_rr_user ON role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rr_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_rr_reviewed_by ON role_requests(reviewed_by_id);

COMMENT ON TABLE role_requests IS 'Solicitudes de cambio de rol que requieren aprobación';
COMMENT ON COLUMN role_requests.role_to_remove IS 'Rol a remover (para cambios de rol)';
COMMENT ON COLUMN role_requests.additional_data IS 'Datos adicionales según el rol (zoneId, rank, etc.)';

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para monthly_reviews
DROP TRIGGER IF EXISTS update_monthly_reviews_updated_at ON monthly_reviews;
CREATE TRIGGER update_monthly_reviews_updated_at
    BEFORE UPDATE ON monthly_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_verifications
DROP TRIGGER IF EXISTS update_user_verifications_updated_at ON user_verifications;
CREATE TRIGGER update_user_verifications_updated_at
    BEFORE UPDATE ON user_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista para ver ventas con información completa
CREATE OR REPLACE VIEW v_sales_complete AS
SELECT
    s.id,
    s.description,
    s.sale_date,
    s.sale_amount,
    d.name AS distributor_name,
    d.dni AS distributor_dni,
    c.name AS client_name,
    c.dni AS client_dni,
    a.name AS authority_name,
    a.rank AS authority_rank,
    z.name AS zone_name
FROM sales s
LEFT JOIN distributors d ON s.distributor_dni = d.dni
LEFT JOIN clients c ON s.client_dni = c.dni
LEFT JOIN authorities a ON s.authority_dni = a.dni
LEFT JOIN zones z ON d.zone_id = z.id;

COMMENT ON VIEW v_sales_complete IS 'Vista completa de ventas con información de distribuidor, cliente y autoridad';

-- Vista para productos por distribuidor
CREATE OR REPLACE VIEW v_distributor_products AS
SELECT
    d.dni,
    d.name AS distributor_name,
    d.email AS distributor_email,
    z.name AS zone_name,
    p.id AS product_id,
    p.description AS product_description,
    p.price AS product_price,
    p.stock AS product_stock,
    p.is_illegal
FROM distributors d
INNER JOIN distributors_products dp ON d.dni = dp.distributor_dni
INNER JOIN products p ON dp.product_id = p.id
LEFT JOIN zones z ON d.zone_id = z.id;

COMMENT ON VIEW v_distributor_products IS 'Productos asignados a cada distribuidor';

-- Vista para estadísticas de usuarios
CREATE OR REPLACE VIEW v_user_stats AS
SELECT
    u.id,
    u.username,
    u.email,
    u.roles,
    u.is_active,
    u.is_verified,
    u.email_verified,
    u.profile_completeness,
    p.dni,
    p.name,
    p.phone,
    CASE
        WHEN p.id IS NOT NULL THEN TRUE
        ELSE FALSE
    END AS has_personal_info
FROM users u
LEFT JOIN persons p ON p.user_id = u.id;

COMMENT ON VIEW v_user_stats IS 'Estadísticas y completitud de usuarios';

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Mensajes de confirmación
DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Schema creado exitosamente para TGS Backend';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Tablas creadas: 25';
    RAISE NOTICE 'Vistas creadas: 3';
    RAISE NOTICE 'Índices creados: ~50';
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Siguiente paso: Ejecutar script de datos de prueba';
    RAISE NOTICE '====================================================';
END $$;
