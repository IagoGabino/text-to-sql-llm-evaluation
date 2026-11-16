#!/bin/bash
set -e

PRESET=${SEED_PRESET:-large}
SEED_DIR="/seed-data/generated/${PRESET}"

echo "============================================"
echo "Deterministic Database Seeding"
echo "Preset: ${PRESET}"
echo "============================================"

if [ ! -d "${SEED_DIR}" ]; then
  echo "ERROR: Seed data not found at ${SEED_DIR}"
  exit 1
fi

echo "Loading seed data (matching columns only)..."

# Categories: CSV has category_id,name,description,created_at
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY categories(category_id, name, description, created_at) FROM '${SEED_DIR}/categories.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded categories"

# Suppliers: CSV has supplier_id,name,contact_name,email,phone,country (missing address, city, created_at)
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY suppliers(supplier_id, name, contact_name, email, phone, country) FROM '${SEED_DIR}/suppliers.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded suppliers"

# Customers: CSV has customer_id,name,email,phone,birth_date,address,city,country,registration_date,is_active
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY customers(customer_id, name, email, phone, birth_date, address, city, country, registration_date, is_active) FROM '${SEED_DIR}/customers.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded customers"

# Products: CSV has product_id,name,description,price,stock_quantity,category_id,supplier_id,created_at,is_available
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY products(product_id, name, description, price, stock_quantity, category_id, supplier_id, created_at, is_available) FROM '${SEED_DIR}/products.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded products"

# Orders: CSV has order_id,customer_id,order_date,total_amount,status,payment_method,shipped_date,delivered_date
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY orders(order_id, customer_id, order_date, total_amount, status, payment_method, shipped_date, delivered_date) FROM '${SEED_DIR}/orders.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded orders"

# Order Items: CSV has order_item_id,order_id,product_id,quantity,unit_price,discount
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY order_items(order_item_id, order_id, product_id, quantity, unit_price, discount) FROM '${SEED_DIR}/order_items.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded order_items"

# Reviews: CSV has review_id,product_id,customer_id,rating,comment,review_date
psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "COPY reviews(review_id, product_id, customer_id, rating, comment, review_date) FROM '${SEED_DIR}/reviews.csv' WITH (FORMAT csv, HEADER true);"
echo "✓ Loaded reviews"

echo ""
echo "✅ Database seeding completed successfully!"
