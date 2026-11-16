#!/bin/bash
# Docker Entrypoint Script for Seed Data Loading
# 
# This script validates and loads pre-generated CSV seed data into PostgreSQL
# on container startup. It is designed to be used with PostgreSQL's 
# docker-entrypoint-initdb.d mechanism.
#
# Requirements: 10.1, 10.2

set -e  # Exit immediately if a command exits with a non-zero status

# ============================================
# Configuration
# ============================================

# Read SEED_PRESET from environment variable, default to 'large'
PRESET=${SEED_PRESET:-large}

# Define seed data directory path
# This path assumes seed-data will be mounted at /seed-data in the container
SEED_DIR="/seed-data/generated/${PRESET}"
MANIFEST_FILE="${SEED_DIR}/manifest.json"

# ============================================
# Step 1: Check if seed data exists
# ============================================

echo "============================================"
echo "Deterministic Database Seeding"
echo "============================================"
echo ""
echo "Preset: ${PRESET}"
echo "Seed directory: ${SEED_DIR}"
echo ""

# Check if the seed data directory exists
if [ ! -d "${SEED_DIR}" ]; then
  echo "❌ ERROR: Seed data directory not found!"
  echo ""
  echo "   Directory: ${SEED_DIR}"
  echo ""
  echo "📝 Instructions:"
  echo "   1. Generate seed data by running:"
  echo "      npm run seed:generate -- --preset ${PRESET}"
  echo ""
  echo "   2. Then start the Docker container again:"
  echo "      docker-compose up -d"
  echo ""
  exit 1
fi

# Check if manifest.json exists
if [ ! -f "${MANIFEST_FILE}" ]; then
  echo "❌ ERROR: Seed data manifest not found!"
  echo ""
  echo "   Expected file: ${MANIFEST_FILE}"
  echo ""
  echo "📝 Instructions:"
  echo "   The seed data directory exists but is missing manifest.json."
  echo "   This indicates incomplete or corrupted seed generation."
  echo ""
  echo "   1. Regenerate seed data by running:"
  echo "      npm run seed:generate -- --preset ${PRESET}"
  echo ""
  echo "   2. Then start the Docker container again:"
  echo "      docker-compose up -d"
  echo ""
  exit 1
fi

echo "✓ Seed data found for preset '${PRESET}'"
echo ""

# ============================================
# Step 2: Validate checksums
# ============================================

echo "🔐 Step 2: Validating data integrity..."
echo ""

# Path to validate.ts script (will be mounted in container)
VALIDATE_SCRIPT="/app/seed-loader/validate.ts"

# Run validation using ts-node
# The validate.ts script expects --preset argument and data at ../seed-data/generated/{preset}
cd /app/seed-loader

if ! npx ts-node validate.ts --preset "${PRESET}"; then
  echo ""
  echo "❌ ERROR: Seed data validation failed!"
  echo ""
  echo "📝 Instructions:"
  echo "   The CSV files failed checksum validation."
  echo "   This indicates data corruption or modification."
  echo ""
  echo "   1. Regenerate seed data by running:"
  echo "      npm run seed:generate -- --preset ${PRESET}"
  echo ""
  echo "   2. Then start the Docker container again:"
  echo "      docker-compose up -d"
  echo ""
  exit 1
fi

echo ""
echo "✅ Validation completed successfully"
echo ""

# ============================================
# Step 3: Initialize database schema
# ============================================

echo "🗄️  Step 3: Initializing database schema..."
echo ""

# Schema files are mounted at /docker-entrypoint-initdb.d/
SCHEMA_DIR="/docker-entrypoint-initdb.d"
CREATE_TABLES_SQL="${SCHEMA_DIR}/01_create_tables.sql"
CREATE_INDEXES_SQL="${SCHEMA_DIR}/02_create_indexes.sql"

# Check if schema files exist
if [ ! -f "${CREATE_TABLES_SQL}" ]; then
  echo "❌ ERROR: Schema file not found: ${CREATE_TABLES_SQL}"
  exit 1
fi

if [ ! -f "${CREATE_INDEXES_SQL}" ]; then
  echo "❌ ERROR: Schema file not found: ${CREATE_INDEXES_SQL}"
  exit 1
fi

# Execute 01_create_tables.sql
echo "   Creating tables..."
if ! psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f "${CREATE_TABLES_SQL}" > /dev/null 2>&1; then
  echo ""
  echo "❌ ERROR: Failed to create tables"
  echo "   Check the SQL script: ${CREATE_TABLES_SQL}"
  exit 1
fi
echo "   ✓ Tables created successfully"

# Execute 02_create_indexes.sql
echo "   Creating indexes..."
if ! psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f "${CREATE_INDEXES_SQL}" > /dev/null 2>&1; then
  echo ""
  echo "❌ ERROR: Failed to create indexes"
  echo "   Check the SQL script: ${CREATE_INDEXES_SQL}"
  exit 1
fi
echo "   ✓ Indexes created successfully"

echo ""
echo "✅ Schema initialization completed"
echo ""

# ============================================
# Step 4: Load seed data
# ============================================

echo "📊 Step 4: Loading seed data..."
echo ""

# Path to load.ts script (will be mounted in container)
LOAD_SCRIPT="/app/seed-loader/load.ts"

# Run data loading using ts-node
# The load.ts script expects --preset argument and uses environment variables for DB config
cd /app/seed-loader

if ! npx ts-node load.ts --preset "${PRESET}"; then
  echo ""
  echo "❌ ERROR: Seed data loading failed!"
  echo ""
  echo "📝 Instructions:"
  echo "   The data loading process encountered an error."
  echo "   Check the error messages above for details."
  echo ""
  exit 1
fi

echo ""
echo "✅ Seed data loading completed"
echo ""

# ============================================
# Completion
# ============================================

echo "════════════════════════════════════════"
echo "✅ Database initialization complete!"
echo "════════════════════════════════════════"
echo ""
echo "Preset: ${PRESET}"
echo "Database ready for queries"
echo ""
