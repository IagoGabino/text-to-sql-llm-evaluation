-- ============================================
-- LLM SQL Evaluation System - Database Schema
-- ============================================
-- Script de criação de tabelas para o sistema de avaliação de LLMs
-- 
-- EXECUÇÃO DOCKER:
-- Este script é executado AUTOMATICAMENTE pelo Docker na primeira inicialização
-- através do volume mount: ./database/schema:/docker-entrypoint-initdb.d:ro
-- 
-- ORDEM DE EXECUÇÃO:
-- 1. Este script (01_create_tables.sql) - Cria todas as tabelas
-- 2. Após população manual/script, executar 02_create_indexes.sql
-- 3. Executar 03_validate_schema.sql para validação
--
-- Feature: Database Schema
-- Requirements: 1.1, 1.2, 2.1, 2.2
-- ============================================

-- Garantir que o banco de dados está limpo antes de criar
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ============================================
-- Tabela: categories
-- Descrição: Armazena categorias de produtos
-- ============================================
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentários para documentação
COMMENT ON TABLE categories IS 'Categorias de produtos do sistema';
COMMENT ON COLUMN categories.category_id IS 'Identificador único da categoria';
COMMENT ON COLUMN categories.name IS 'Nome da categoria (deve ser único)';
COMMENT ON COLUMN categories.description IS 'Descrição detalhada da categoria';

-- ============================================
-- Tabela: suppliers
-- Descrição: Armazena informações de fornecedores
-- ============================================
CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_name VARCHAR(150),
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    country VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comentários para documentação
COMMENT ON TABLE suppliers IS 'Fornecedores de produtos';
COMMENT ON COLUMN suppliers.supplier_id IS 'Identificador único do fornecedor';
COMMENT ON COLUMN suppliers.name IS 'Nome da empresa fornecedora';
COMMENT ON COLUMN suppliers.contact_name IS 'Nome da pessoa de contato';
COMMENT ON COLUMN suppliers.email IS 'Email do fornecedor (deve ser único)';
COMMENT ON COLUMN suppliers.phone IS 'Telefone de contato';
COMMENT ON COLUMN suppliers.country IS 'País de origem do fornecedor';

-- ============================================
-- Tabela: products
-- Descrição: Catálogo de produtos com relacionamentos
-- ============================================
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    category_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE,
    
    -- Chaves estrangeiras
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) 
        REFERENCES suppliers(supplier_id) ON DELETE RESTRICT
);

-- Comentários para documentação
COMMENT ON TABLE products IS 'Catálogo de produtos do sistema';
COMMENT ON COLUMN products.product_id IS 'Identificador único do produto';
COMMENT ON COLUMN products.name IS 'Nome do produto';
COMMENT ON COLUMN products.description IS 'Descrição detalhada do produto';
COMMENT ON COLUMN products.price IS 'Preço unitário do produto (deve ser positivo)';
COMMENT ON COLUMN products.stock_quantity IS 'Quantidade em estoque (não pode ser negativa)';
COMMENT ON COLUMN products.category_id IS 'Referência para a categoria do produto';
COMMENT ON COLUMN products.supplier_id IS 'Referência para o fornecedor do produto';
COMMENT ON COLUMN products.is_available IS 'Indica se o produto está disponível para venda';

-- ============================================
-- Tabela: customers
-- Descrição: Clientes do sistema com validações
-- ============================================
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    birth_date DATE,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    registration_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Validações
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_birth_date CHECK (birth_date <= CURRENT_DATE)
);

-- Comentários para documentação
COMMENT ON TABLE customers IS 'Clientes cadastrados no sistema';
COMMENT ON COLUMN customers.customer_id IS 'Identificador único do cliente';
COMMENT ON COLUMN customers.name IS 'Nome completo do cliente';
COMMENT ON COLUMN customers.email IS 'Email do cliente (deve ser único e válido)';
COMMENT ON COLUMN customers.phone IS 'Telefone de contato';
COMMENT ON COLUMN customers.birth_date IS 'Data de nascimento';
COMMENT ON COLUMN customers.address IS 'Endereço completo';
COMMENT ON COLUMN customers.city IS 'Cidade';
COMMENT ON COLUMN customers.country IS 'País';
COMMENT ON COLUMN customers.registration_date IS 'Data de cadastro no sistema';
COMMENT ON COLUMN customers.is_active IS 'Indica se o cliente está ativo';

-- ============================================
-- Tabela: orders
-- Descrição: Pedidos realizados por clientes
-- ============================================
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    
    -- Chave estrangeira
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) ON DELETE RESTRICT,
    
    -- Validações
    CONSTRAINT chk_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    CONSTRAINT chk_shipped_after_order CHECK (shipped_date IS NULL OR shipped_date >= order_date),
    CONSTRAINT chk_delivered_after_shipped CHECK (delivered_date IS NULL OR (shipped_date IS NOT NULL AND delivered_date >= shipped_date))
);

-- Comentários para documentação
COMMENT ON TABLE orders IS 'Pedidos realizados no sistema';
COMMENT ON COLUMN orders.order_id IS 'Identificador único do pedido';
COMMENT ON COLUMN orders.customer_id IS 'Referência para o cliente que fez o pedido';
COMMENT ON COLUMN orders.order_date IS 'Data e hora do pedido';
COMMENT ON COLUMN orders.total_amount IS 'Valor total do pedido';
COMMENT ON COLUMN orders.status IS 'Status atual do pedido';
COMMENT ON COLUMN orders.payment_method IS 'Método de pagamento utilizado';
COMMENT ON COLUMN orders.shipped_date IS 'Data de envio do pedido';
COMMENT ON COLUMN orders.delivered_date IS 'Data de entrega do pedido';

-- ============================================
-- Tabela: order_items
-- Descrição: Itens de cada pedido (tabela de junção)
-- ============================================
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    discount DECIMAL(5, 2) DEFAULT 0.00 CHECK (discount >= 0 AND discount <= 100),
    
    -- Chaves estrangeiras
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) 
        REFERENCES products(product_id) ON DELETE RESTRICT
);

-- Comentários para documentação
COMMENT ON TABLE order_items IS 'Itens individuais de cada pedido';
COMMENT ON COLUMN order_items.order_item_id IS 'Identificador único do item do pedido';
COMMENT ON COLUMN order_items.order_id IS 'Referência para o pedido';
COMMENT ON COLUMN order_items.product_id IS 'Referência para o produto';
COMMENT ON COLUMN order_items.quantity IS 'Quantidade do produto (deve ser positiva)';
COMMENT ON COLUMN order_items.unit_price IS 'Preço unitário no momento da compra';
COMMENT ON COLUMN order_items.discount IS 'Percentual de desconto aplicado (0-100)';

-- ============================================
-- Tabela: reviews
-- Descrição: Avaliações de produtos por clientes
-- ============================================
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves estrangeiras
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) 
        REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id) ON DELETE CASCADE
);

-- Comentários para documentação
COMMENT ON TABLE reviews IS 'Avaliações de produtos feitas pelos clientes';
COMMENT ON COLUMN reviews.review_id IS 'Identificador único da avaliação';
COMMENT ON COLUMN reviews.product_id IS 'Referência para o produto avaliado';
COMMENT ON COLUMN reviews.customer_id IS 'Referência para o cliente que fez a avaliação';
COMMENT ON COLUMN reviews.rating IS 'Nota da avaliação (1 a 5)';
COMMENT ON COLUMN reviews.comment IS 'Comentário descritivo da avaliação';
COMMENT ON COLUMN reviews.review_date IS 'Data e hora da avaliação';

-- ============================================
-- FIM DO SCRIPT DE CRIAÇÃO DE TABELAS
-- ============================================

