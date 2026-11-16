-- ============================================
-- LLM SQL Evaluation System - Database Indexes
-- ============================================
-- Script de criação de índices para otimização de performance
-- 
-- ⚠️ IMPORTANTE - ORDEM DE EXECUÇÃO:
-- Este script deve ser executado APÓS a população de dados!
-- Criar índices ANTES de popular pode degradar a performance do INSERT.
--
-- COMO EXECUTAR:
-- Após popular o banco com dados, executar:
-- docker exec -i llm_eval_postgres psql -U postgres -d llm_sql_eval < database/schema/02_create_indexes.sql
--
-- Ou manualmente:
-- docker exec -it llm_eval_postgres psql -U postgres -d llm_sql_eval
-- \i /docker-entrypoint-initdb.d/02_create_indexes.sql
--
-- Feature: Database Schema
-- Requirements: 1.1, 2.1, 3.1
-- ============================================

-- ============================================
-- Índices simples em chaves estrangeiras
-- ============================================
-- Task 4.1

-- Índices para tabela orders
CREATE INDEX idx_orders_customer ON orders(customer_id);
COMMENT ON INDEX idx_orders_customer IS 'Otimiza buscas de pedidos por cliente';

-- Índices para tabela order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);
COMMENT ON INDEX idx_order_items_order IS 'Otimiza buscas de itens por pedido';

CREATE INDEX idx_order_items_product ON order_items(product_id);
COMMENT ON INDEX idx_order_items_product IS 'Otimiza buscas de itens por produto';

-- Índices para tabela products
CREATE INDEX idx_products_category ON products(category_id);
COMMENT ON INDEX idx_products_category IS 'Otimiza buscas de produtos por categoria';

CREATE INDEX idx_products_supplier ON products(supplier_id);
COMMENT ON INDEX idx_products_supplier IS 'Otimiza buscas de produtos por fornecedor';

-- Índices para tabela reviews
CREATE INDEX idx_reviews_product ON reviews(product_id);
COMMENT ON INDEX idx_reviews_product IS 'Otimiza buscas de avaliações por produto';

CREATE INDEX idx_reviews_customer ON reviews(customer_id);
COMMENT ON INDEX idx_reviews_customer IS 'Otimiza buscas de avaliações por cliente';

-- ============================================
-- Índices compostos para queries comuns
-- ============================================
-- Task 4.2

-- Índice composto para filtrar pedidos por status e ordenar por data
CREATE INDEX idx_orders_status_date ON orders(status, order_date DESC);
COMMENT ON INDEX idx_orders_status_date IS 'Otimiza queries de pedidos filtrados por status e ordenados por data';

-- Índice composto para filtrar produtos por categoria e ordenar por preço
CREATE INDEX idx_products_category_price ON products(category_id, price);
COMMENT ON INDEX idx_products_category_price IS 'Otimiza queries de produtos por categoria com filtros de preço';

-- Índice para queries temporais em pedidos
CREATE INDEX idx_orders_date ON orders(order_date DESC);
COMMENT ON INDEX idx_orders_date IS 'Otimiza queries temporais e ordenação de pedidos por data';

-- Índice para filtrar produtos disponíveis
CREATE INDEX idx_products_available ON products(is_available) WHERE is_available = true;
COMMENT ON INDEX idx_products_available IS 'Índice parcial para produtos disponíveis';

-- Índice para clientes ativos
CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;
COMMENT ON INDEX idx_customers_active IS 'Índice parcial para clientes ativos';

-- ============================================
-- FIM DO SCRIPT DE CRIAÇÃO DE ÍNDICES
-- ============================================
