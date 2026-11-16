#!/usr/bin/env node
/**
 * CSV Data Loader - PostgreSQL COPY Loader
 * 
 * Command-line tool for loading validated CSV files into PostgreSQL database
 * using the COPY command for optimal performance.
 * 
 * Usage:
 *   npm run load -- --preset small
 *   npm run load -- --preset medium
 *   npm run load -- --preset large
 *   npm run load -- --preset xlarge
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { loadManifest, validateChecksums, ValidationResult } from './validate';

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Loader configuration interface
 */
interface LoaderConfig {
  preset: string;
  dataDir: string;
  manifestPath: string;
  dbConfig: DatabaseConfig;
}

/**
 * Parse command-line arguments
 * 
 * @returns Configuration object
 */
function parseArguments(): LoaderConfig {
  const args = process.argv.slice(2);

  // Find --preset argument
  const presetIndex = args.indexOf('--preset');
  
  if (presetIndex === -1 || presetIndex === args.length - 1) {
    throw new Error('Missing --preset argument');
  }

  const preset = args[presetIndex + 1];

  // Validate preset
  if (!['small', 'medium', 'large', 'xlarge'].includes(preset)) {
    throw new Error(`Invalid preset: ${preset}. Must be one of: small, medium, large, xlarge`);
  }

  const dataDir = path.join(__dirname, `../seed-data/generated/${preset}`);
  const manifestPath = path.join(dataDir, 'manifest.json');

  // Read database configuration from environment variables
  const dbConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'llm_sql_eval',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };

  // Validate database configuration
  if (!dbConfig.password) {
    throw new Error('Database password is required. Set DB_PASSWORD in .env file');
  }

  return {
    preset,
    dataDir,
    manifestPath,
    dbConfig
  };
}

/**
 * Validate CSV files before loading
 * Calls the validation logic to ensure data integrity
 * 
 * @param config - Loader configuration
 * @returns Validation result
 * @throws Error if validation fails
 */
async function validateBeforeLoad(config: LoaderConfig): Promise<ValidationResult> {
  console.log('🔍 Step 1: Validating CSV files...\n');
  
  // Check if manifest exists
  if (!fs.existsSync(config.manifestPath)) {
    throw new Error(`Manifest not found: ${config.manifestPath}\nPlease run: npm run seed:generate -- --preset ${config.preset}`);
  }

  // Load manifest
  console.log('📋 Loading manifest...');
  const manifest = loadManifest(config.manifestPath);
  console.log(`   ✓ Loaded manifest.json`);
  console.log(`   Files to validate: ${Object.keys(manifest.checksums).length}\n`);

  // Validate checksums
  console.log('🔐 Validating checksums...');
  const result = await validateChecksums(manifest, config.dataDir);
  
  if (result.valid) {
    console.log('   ✓ All checksums valid');
    console.log(`   Total records: ${manifest.total_records.toLocaleString()}`);
    console.log(`   Generated: ${manifest.generated_at}\n`);
  } else {
    console.log(`   ✗ Found ${result.errors.length} validation error(s)\n`);
    
    // Display errors
    for (const error of result.errors) {
      console.log(`   File: ${error.file}`);
      console.log(`     Expected: ${error.expected}`);
      console.log(`     Actual:   ${error.actual}`);
      console.log(`     Message:  ${error.message}\n`);
    }
    
    throw new Error('CSV validation failed. Data integrity check did not pass.');
  }

  return result;
}

/**
 * Create and test database connection
 * 
 * @param dbConfig - Database configuration
 * @returns Connected PostgreSQL client
 * @throws Error if connection fails
 */
async function connectToDatabase(dbConfig: DatabaseConfig): Promise<Client> {
  console.log('🔌 Step 2: Connecting to database...\n');
  
  // Create client with configuration
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: dbConfig.password,
    connectionTimeoutMillis: 5000, // 5 second timeout
  });

  try {
    // Attempt to connect
    console.log('   Connecting to PostgreSQL...');
    await client.connect();
    console.log('   ✓ Connected successfully\n');

    // Test connection with a simple query
    console.log('   Testing connection...');
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    const pgVersion = result.rows[0].pg_version.split(',')[0];
    const serverTime = result.rows[0].current_time;
    
    console.log(`   ✓ Connection test passed`);
    console.log(`   PostgreSQL: ${pgVersion}`);
    console.log(`   Server time: ${serverTime}\n`);

    return client;

  } catch (error) {
    // Clean up on error
    try {
      await client.end();
    } catch (endError) {
      // Ignore errors during cleanup
    }

    // Provide helpful error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to PostgreSQL server at ${dbConfig.host}:${dbConfig.port}\n` +
          `   Make sure PostgreSQL is running and accessible.\n` +
          `   For Docker: docker-compose up -d postgres`
        );
      } else if (error.message.includes('password authentication failed')) {
        throw new Error(
          `Authentication failed for user '${dbConfig.user}'\n` +
          `   Check your DB_PASSWORD in .env file`
        );
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        throw new Error(
          `Database '${dbConfig.database}' does not exist\n` +
          `   Create it first or check DB_NAME in .env file`
        );
      } else {
        throw new Error(`Database connection failed: ${error.message}`);
      }
    }
    
    throw new Error('Database connection failed with unknown error');
  }
}

/**
 * Truncate all tables in reverse dependency order
 * This ensures foreign key constraints are not violated during truncation
 * 
 * @param client - Connected PostgreSQL client
 */
async function truncateTables(client: Client): Promise<void> {
  console.log('🗑️  Step 3: Truncating existing data...\n');
  
  // Tables in reverse dependency order (children first, parents last)
  const tables = [
    'reviews',
    'order_items',
    'orders',
    'customers',
    'products',
    'suppliers',
    'categories'
  ];

  try {
    console.log('   Clearing tables in reverse dependency order...');
    
    // Use TRUNCATE CASCADE for safety - it will handle any remaining FKs
    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      console.log(`   ✓ Truncated ${table}`);
    }
    
    console.log('   ✓ All tables cleared successfully\n');
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to truncate tables: ${error.message}`);
    }
    throw new Error('Failed to truncate tables with unknown error');
  }
}

/**
 * Configure PostgreSQL date format for CSV loading
 * Sets datestyle to ISO to correctly interpret YYYY-MM-DD dates from CSV files
 * 
 * Note: The CSV files use ISO format (YYYY-MM-DD), not MM/DD/YYYY.
 * ISO format is unambiguous and the PostgreSQL standard.
 * 
 * @param client - Connected PostgreSQL client
 */
async function setDateFormat(client: Client): Promise<void> {
  console.log('📅 Step 4: Configuring date format...\n');
  
  try {
    // Set datestyle to ISO for YYYY-MM-DD format (used in our CSV files)
    await client.query(`SET datestyle TO 'ISO, MDY'`);
    console.log('   ✓ Date format configured: ISO, MDY (YYYY-MM-DD)');
    
    // Verify the setting
    const result = await client.query('SHOW datestyle');
    console.log(`   Current datestyle: ${result.rows[0].DateStyle}\n`);
    
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to set date format: ${error.message}`);
    }
    throw new Error('Failed to set date format with unknown error');
  }
}

/**
 * Column mappings for each table (CSV columns that exist, excluding auto-generated ones)
 */
const TABLE_COLUMNS: Record<string, string> = {
  categories: 'category_id, name, description, created_at',
  suppliers: 'supplier_id, name, contact_name, email, phone, country',
  customers: 'customer_id, name, email, phone, birth_date, address, city, country, registration_date, is_active',
  products: 'product_id, name, description, price, stock_quantity, category_id, supplier_id, created_at, is_available',
  orders: 'order_id, customer_id, order_date, total_amount, status, payment_method, shipped_date, delivered_date',
  order_items: 'order_item_id, order_id, product_id, quantity, unit_price, discount',
  reviews: 'review_id, product_id, customer_id, rating, comment, review_date'
};

/**
 * Load a single CSV file into a PostgreSQL table using COPY command
 * 
 * @param client - Connected PostgreSQL client
 * @param tableName - Name of the table to load into
 * @param csvPath - Absolute path to the CSV file
 * @returns Number of records loaded
 */
async function loadTable(client: Client, tableName: string, csvPath: string): Promise<number> {
  try {
    // Check if CSV file exists
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    // Get column list for this table
    const columns = TABLE_COLUMNS[tableName];
    if (!columns) {
      throw new Error(`No column mapping defined for table: ${tableName}`);
    }

    // Get file stats for size display
    const stats = fs.statSync(csvPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`   Loading ${tableName}...`);
    console.log(`      File: ${path.basename(csvPath)} (${fileSizeMB} MB)`);

    // Count records before loading (total lines - 1 for header)
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    const recordCount = lines.length - 1;

    // Use COPY command with FROM STDIN for efficient bulk loading
    // Specify columns to match CSV structure (excluding auto-generated columns like created_at for suppliers)
    const copyQuery = `
      COPY ${tableName} (${columns})
      FROM STDIN 
      WITH (
        FORMAT csv,
        HEADER true,
        DELIMITER ',',
        QUOTE '"',
        ESCAPE '"'
      )
    `;

    // Create read stream and copy stream
    const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
    const copyStream = client.query(copyFrom(copyQuery));

    // Execute COPY command by piping file to PostgreSQL
    await new Promise<void>((resolve, reject) => {
      fileStream.on('error', reject);
      copyStream.on('error', reject);
      copyStream.on('finish', resolve);
      
      fileStream.pipe(copyStream);
    });

    console.log(`      ✓ Loaded ${recordCount.toLocaleString()} records\n`);
    
    return recordCount;

  } catch (error) {
    if (error instanceof Error) {
      // Try to extract line number from PostgreSQL error message
      const lineMatch = error.message.match(/line (\d+)/i);
      const lineInfo = lineMatch ? ` at line ${lineMatch[1]}` : '';
      
      throw new Error(`Failed to load ${tableName}${lineInfo}: ${error.message}`);
    }
    throw new Error(`Failed to load ${tableName} with unknown error`);
  }
}

/**
 * Load all CSV files into PostgreSQL tables in dependency order
 * 
 * @param client - Connected PostgreSQL client
 * @param dataDir - Directory containing CSV files
 * @returns Record of table names to record counts
 */
async function loadAllTables(client: Client, dataDir: string): Promise<Record<string, number>> {
  console.log('📥 Step 5: Loading CSV data into PostgreSQL...\n');
  
  // Tables in dependency order (parents first, children last)
  const tables = [
    'categories',
    'suppliers',
    'products',
    'customers',
    'orders',
    'order_items',
    'reviews'
  ];

  const recordCounts: Record<string, number> = {};
  const startTime = Date.now();

  try {
    for (const table of tables) {
      const csvPath = path.join(dataDir, `${table}.csv`);
      const count = await loadTable(client, table, csvPath);
      recordCounts[table] = count;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalRecords = Object.values(recordCounts).reduce((sum, count) => sum + count, 0);

    console.log(`   ✓ All tables loaded successfully`);
    console.log(`   Total records: ${totalRecords.toLocaleString()}`);
    console.log(`   Load time: ${duration}s\n`);

    return recordCounts;

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Data loading failed: ${error.message}`);
    }
    throw new Error('Data loading failed with unknown error');
  }
}

/**
 * Verify foreign key integrity after loading
 * Checks for orphaned records in all child tables
 * 
 * @param client - Connected PostgreSQL client
 * @returns True if all FK checks pass, throws error otherwise
 */
async function verifyForeignKeys(client: Client): Promise<boolean> {
  console.log('🔍 Step 6: Verifying foreign key integrity...\n');
  
  // Define FK checks: [child_table, child_column, parent_table, parent_column]
  const fkChecks = [
    // products FKs
    { 
      child: 'products', 
      childCol: 'category_id', 
      parent: 'categories', 
      parentCol: 'category_id',
      description: 'products → categories'
    },
    { 
      child: 'products', 
      childCol: 'supplier_id', 
      parent: 'suppliers', 
      parentCol: 'supplier_id',
      description: 'products → suppliers'
    },
    // orders FKs
    { 
      child: 'orders', 
      childCol: 'customer_id', 
      parent: 'customers', 
      parentCol: 'customer_id',
      description: 'orders → customers'
    },
    // order_items FKs
    { 
      child: 'order_items', 
      childCol: 'order_id', 
      parent: 'orders', 
      parentCol: 'order_id',
      description: 'order_items → orders'
    },
    { 
      child: 'order_items', 
      childCol: 'product_id', 
      parent: 'products', 
      parentCol: 'product_id',
      description: 'order_items → products'
    },
    // reviews FKs
    { 
      child: 'reviews', 
      childCol: 'product_id', 
      parent: 'products', 
      parentCol: 'product_id',
      description: 'reviews → products'
    },
    { 
      child: 'reviews', 
      childCol: 'customer_id', 
      parent: 'customers', 
      parentCol: 'customer_id',
      description: 'reviews → customers'
    }
  ];

  const violations: string[] = [];

  try {
    console.log('   Checking foreign key relationships...\n');

    for (const fk of fkChecks) {
      // Query to find orphaned records (child records with no matching parent)
      const query = `
        SELECT COUNT(*) as orphan_count
        FROM ${fk.child} c
        WHERE NOT EXISTS (
          SELECT 1 
          FROM ${fk.parent} p 
          WHERE p.${fk.parentCol} = c.${fk.childCol}
        )
      `;

      const result = await client.query(query);
      const orphanCount = parseInt(result.rows[0].orphan_count, 10);

      if (orphanCount > 0) {
        const violation = `   ✗ ${fk.description}: ${orphanCount} orphaned records`;
        violations.push(violation);
        console.log(violation);
      } else {
        console.log(`   ✓ ${fk.description}: OK`);
      }
    }

    console.log('');

    if (violations.length > 0) {
      throw new Error(
        `Foreign key integrity check failed!\n${violations.join('\n')}\n` +
        `   Found ${violations.length} integrity violation(s)`
      );
    }

    console.log('   ✓ All foreign key relationships verified\n');
    return true;

  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw the error with our formatted message
    }
    throw new Error('Foreign key verification failed with unknown error');
  }
}

/**
 * Display usage help
 */
function displayHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                    CSV Data Loader - PostgreSQL COPY                     ║
╚══════════════════════════════════════════════════════════════════════════╝

USAGE:
  npm run load -- --preset <preset_name>

PRESETS:
  small      ~10,000 total records
  medium     ~50,000 total records
  large     ~100,000 total records
  xlarge    ~500,000 total records

EXAMPLES:
  npm run load -- --preset small
  npm run load -- --preset medium

DESCRIPTION:
  Loads validated CSV files into PostgreSQL database using COPY command.
  Validates checksums before loading and verifies foreign key integrity after.
  
PREREQUISITES:
  - PostgreSQL database must be running
  - Database connection details must be set in .env file:
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  - CSV files must exist and pass checksum validation
  - Run 'npm run validate -- --preset <preset>' first

ENVIRONMENT VARIABLES:
  DB_HOST      PostgreSQL host (default: localhost)
  DB_PORT      PostgreSQL port (default: 5432)
  DB_NAME      Database name (default: llm_sql_eval)
  DB_USER      Database user (default: postgres)
  DB_PASSWORD  Database password (required)
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  let client: Client | null = null;
  
  try {
    // Parse arguments
    const config = parseArguments();
    
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    CSV Data Loader - PostgreSQL COPY                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📦 Preset: ${config.preset}`);
    console.log(`📁 Data Directory: ${config.dataDir}`);
    console.log(`🗄️  Database: ${config.dbConfig.user}@${config.dbConfig.host}:${config.dbConfig.port}/${config.dbConfig.database}\n`);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Task 7.2: Pre-load validation
    const validationResult = await validateBeforeLoad(config);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Task 7.3: Database connection
    client = await connectToDatabase(config.dbConfig);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Task 7.4: Truncate existing data
    await truncateTables(client);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Task 7.5: Configure date format
    await setDateFormat(client);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Task 7.6: Load CSV data into database
    const recordCounts = await loadAllTables(client, config.dataDir);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Task 7.7: Verify foreign key integrity
    await verifyForeignKeys(client);
    
    console.log('═══════════════════════════════════════════════════════════════════════════\n');
    
    // Clean up database connection
    if (client) {
      console.log('🔌 Closing database connection...');
      await client.end();
      console.log('   ✓ Connection closed\n');
    }
    
    console.log('✅ Database seeding completed successfully!\n');
    
    process.exit(0);
  } catch (error) {
    // Ensure database connection is closed on error
    if (client) {
      try {
        await client.end();
      } catch (endError) {
        // Ignore errors during cleanup
      }
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Missing --preset') || error.message.includes('Invalid preset')) {
        displayHelp();
        console.error(`\n❌ Error: ${error.message}\n`);
      } else {
        console.error(`\n❌ Error: ${error.message}\n`);
      }
    } else {
      console.error('\n❌ An unexpected error occurred\n');
    }
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

// Export for testing
export { parseArguments, displayHelp, validateBeforeLoad, connectToDatabase, truncateTables, setDateFormat, loadTable, loadAllTables, verifyForeignKeys, LoaderConfig, DatabaseConfig };
