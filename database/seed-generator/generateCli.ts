#!/usr/bin/env node
/**
 * Data Generator CLI - Deterministic Database Seeding
 * 
 * Command-line interface for generating deterministic CSV files
 * for database seeding. Uses fixed seed (42) and preset configurations
 * to ensure reproducible data generation.
 * 
 * Usage:
 *   npm run generate -- --preset small
 *   npm run generate -- --preset medium
 *   npm run generate -- --preset large
 *   npm run generate -- --preset xlarge
 */

import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import { PRESETS, SEED, CATEGORIES, COUNTRIES, ORDER_STATUSES, PAYMENT_METHODS, DATE_RANGE } from './constants';
import {
  generateCategories,
  generateSuppliers,
  generateProducts,
  generateCustomers,
  generateOrders,
  generateOrderItems,
  generateReviews,
  CategoryRecord,
  SupplierRecord,
  ProductRecord,
  CustomerRecord,
  OrderRecord,
  OrderItemRecord,
  ReviewRecord
} from './generator';
import { writeCSV, calculateSHA256 } from './utils';

/**
 * Manifest data structure for validation and tracking
 */
interface ManifestData {
  preset: string;
  seed: number;
  generated_at: string; // ISO 8601
  total_records: number;
  distribution: Record<string, number>;
  checksums: Record<string, string>; // filename -> SHA-256
}

/**
 * Configuration for data generation
 */
interface GeneratorConfig {
  preset: 'small' | 'medium' | 'large' | 'xlarge';
  outputDir: string;
}

/**
 * Parse command-line arguments
 * 
 * Extracts the --preset argument from process.argv and validates it
 * against the available PRESETS constant.
 * 
 * @returns Configuration object with preset and output directory
 * @throws Error if arguments are invalid or missing
 */
function parseArguments(): GeneratorConfig {
  const args = process.argv.slice(2);

  // Find --preset argument
  const presetIndex = args.indexOf('--preset');
  
  if (presetIndex === -1 || presetIndex === args.length - 1) {
    throw new Error('Missing --preset argument');
  }

  const preset = args[presetIndex + 1];

  // Validate preset exists in PRESETS constant
  if (!['small', 'medium', 'large', 'xlarge'].includes(preset)) {
    throw new Error(`Invalid preset: ${preset}. Must be one of: small, medium, large, xlarge`);
  }

  // Verify preset exists in PRESETS constant
  if (!PRESETS[preset as keyof typeof PRESETS]) {
    throw new Error(`Preset '${preset}' not found in PRESETS configuration`);
  }

  const outputDir = `../seed-data/generated/${preset}`;

  return {
    preset: preset as 'small' | 'medium' | 'large' | 'xlarge',
    outputDir
  };
}

/**
 * Display usage help information
 */
function displayHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║              Data Generator - Deterministic Database Seeding             ║
╚══════════════════════════════════════════════════════════════════════════╝

USAGE:
  npm run generate -- --preset <preset_name>

PRESETS:
  small      ~10,000 total records   (Quick testing)
  medium     ~50,000 total records   (Development)
  large     ~100,000 total records   (Staging)
  xlarge    ~500,000 total records   (Production-like)

EXAMPLES:
  npm run generate -- --preset small
  npm run generate -- --preset medium

FEATURES:
  • Deterministic generation with fixed seed (42)
  • Referential integrity maintained across all tables
  • Weighted distributions for realistic data
  • SHA-256 checksums for integrity validation

OUTPUT:
  Files are generated in: database/seed-data/generated/<preset>/
  - categories.csv
  - suppliers.csv
  - products.csv
  - customers.csv
  - orders.csv
  - order_items.csv
  - reviews.csv
  - manifest.json
  - DISTRIBUTION.md
`);
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Parse arguments
    const config = parseArguments();

    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║              Data Generator - Deterministic Database Seeding             ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Preset: ${config.preset}`);
    console.log(`Output: ${config.outputDir}`);
    console.log(`Seed:   ${SEED}`);
    console.log('');

    // Initialize Faker with seed 42 at start
    faker.seed(SEED);

    const presetConfig = PRESETS[config.preset];
    const startTime = Date.now();

    // Task 5.2: Main generation workflow
    // Generate data in dependency order: categories → suppliers → products → customers → orders → order_items → reviews

    // Step 1: Generate categories (always 50, independent of preset)
    console.log('📦 Generating categories...');
    const categories = generateCategories();
    const categoryIds = categories.map(c => c.category_id);
    console.log(`   ✓ Generated ${categories.length} categories`);

    // Step 2: Generate suppliers
    console.log('🏭 Generating suppliers...');
    const suppliers = generateSuppliers(presetConfig.distribution.suppliers);
    const supplierIds = suppliers.map(s => s.supplier_id);
    console.log(`   ✓ Generated ${suppliers.length} suppliers`);

    // Step 3: Generate products (depends on categories and suppliers)
    console.log('📱 Generating products...');
    const products = generateProducts(presetConfig.distribution.products, categoryIds, supplierIds);
    const productIds = products.map(p => p.product_id);
    console.log(`   ✓ Generated ${products.length} products`);

    // Step 4: Generate customers
    console.log('👤 Generating customers...');
    const customers = generateCustomers(presetConfig.distribution.customers);
    const customerIds = customers.map(c => c.customer_id);
    console.log(`   ✓ Generated ${customers.length} customers`);

    // Step 5: Generate orders (depends on customers)
    console.log('🛒 Generating orders...');
    const orders = generateOrders(presetConfig.distribution.orders, customers);
    console.log(`   ✓ Generated ${orders.length} orders`);

    // Step 6: Generate order items (depends on orders and products, updates order totals)
    console.log('📋 Generating order items...');
    const { orderItems, updatedOrders } = generateOrderItems(orders, products);
    console.log(`   ✓ Generated ${orderItems.length} order items`);

    // Step 7: Generate reviews (depends on products, orders, and order items)
    console.log('⭐ Generating reviews...');
    const reviews = generateReviews(products, updatedOrders, orderItems);
    console.log(`   ✓ Generated ${reviews.length} reviews`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('✅ Data generation complete!');
    console.log('');
    console.log('Summary:');
    console.log(`   Categories:   ${categories.length.toLocaleString()}`);
    console.log(`   Suppliers:    ${suppliers.length.toLocaleString()}`);
    console.log(`   Products:     ${products.length.toLocaleString()}`);
    console.log(`   Customers:    ${customers.length.toLocaleString()}`);
    console.log(`   Orders:       ${updatedOrders.length.toLocaleString()}`);
    console.log(`   Order Items:  ${orderItems.length.toLocaleString()}`);
    console.log(`   Reviews:      ${reviews.length.toLocaleString()}`);
    console.log('');
    const totalRecords = categories.length + suppliers.length + products.length + 
                         customers.length + updatedOrders.length + orderItems.length + reviews.length;
    console.log(`   Total:        ${totalRecords.toLocaleString()} records`);
    console.log(`   Duration:     ${duration}s`);
    console.log('');

    // Task 5.3: CSV file writing
    console.log('📝 Writing CSV files...');
    
    // Create output directory (recursive creation)
    const outputPath = path.join(__dirname, config.outputDir);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      console.log(`   ✓ Created directory: ${outputPath}`);
    }

    // Write each table to separate CSV file with headers
    const csvStartTime = Date.now();
    
    await writeCSV(path.join(outputPath, 'categories.csv'), categories);
    console.log(`   ✓ Written categories.csv (${categories.length} rows)`);
    
    await writeCSV(path.join(outputPath, 'suppliers.csv'), suppliers);
    console.log(`   ✓ Written suppliers.csv (${suppliers.length} rows)`);
    
    await writeCSV(path.join(outputPath, 'products.csv'), products);
    console.log(`   ✓ Written products.csv (${products.length} rows)`);
    
    await writeCSV(path.join(outputPath, 'customers.csv'), customers);
    console.log(`   ✓ Written customers.csv (${customers.length} rows)`);
    
    await writeCSV(path.join(outputPath, 'orders.csv'), updatedOrders);
    console.log(`   ✓ Written orders.csv (${updatedOrders.length} rows)`);
    
    await writeCSV(path.join(outputPath, 'order_items.csv'), orderItems);
    console.log(`   ✓ Written order_items.csv (${orderItems.length} rows)`);
    
    await writeCSV(path.join(outputPath, 'reviews.csv'), reviews);
    console.log(`   ✓ Written reviews.csv (${reviews.length} rows)`);
    
    const csvEndTime = Date.now();
    const csvDuration = ((csvEndTime - csvStartTime) / 1000).toFixed(2);
    
    console.log('');
    console.log(`✅ CSV files written successfully!`);
    console.log(`   Output directory: ${outputPath}`);
    console.log(`   Write duration:   ${csvDuration}s`);
    console.log('');

    // Task 5.4: Manifest generation
    console.log('🔐 Generating manifest...');
    
    const manifestStartTime = Date.now();
    
    // Calculate SHA-256 checksums for all CSV files
    const csvFiles = [
      'categories.csv',
      'suppliers.csv',
      'products.csv',
      'customers.csv',
      'orders.csv',
      'order_items.csv',
      'reviews.csv'
    ];
    
    const checksums: Record<string, string> = {};
    
    for (const filename of csvFiles) {
      const filePath = path.join(outputPath, filename);
      const checksum = await calculateSHA256(filePath);
      checksums[filename] = `sha256:${checksum}`;
      console.log(`   ✓ ${filename}: ${checksum.substring(0, 16)}...`);
    }
    
    // Create manifest data
    const manifest: ManifestData = {
      preset: config.preset,
      seed: SEED,
      generated_at: new Date().toISOString(),
      total_records: totalRecords,
      distribution: {
        categories: categories.length,
        suppliers: suppliers.length,
        products: products.length,
        customers: customers.length,
        orders: updatedOrders.length,
        order_items: orderItems.length,
        reviews: reviews.length
      },
      checksums
    };
    
    // Write manifest.json
    const manifestPath = path.join(outputPath, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    
    const manifestEndTime = Date.now();
    const manifestDuration = ((manifestEndTime - manifestStartTime) / 1000).toFixed(2);
    
    console.log('');
    console.log(`✅ Manifest generated successfully!`);
    console.log(`   File: ${manifestPath}`);
    console.log(`   Duration: ${manifestDuration}s`);
    console.log('');

    // Task 5.5: Distribution documentation generation
    console.log('📊 Generating distribution documentation...');
    
    const docStartTime = Date.now();
    
    // Generate DISTRIBUTION.md content
    const distributionDoc = `# Data Distribution Report

**Preset**: ${config.preset}  
**Generated**: ${new Date().toISOString()}  
**Seed**: ${SEED}  
**Total Records**: ${totalRecords.toLocaleString()}

## Record Counts by Table

| Table | Count | Percentage |
|-------|------:|----------:|
| Categories | ${categories.length.toLocaleString()} | ${((categories.length / totalRecords) * 100).toFixed(2)}% |
| Suppliers | ${suppliers.length.toLocaleString()} | ${((suppliers.length / totalRecords) * 100).toFixed(2)}% |
| Products | ${products.length.toLocaleString()} | ${((products.length / totalRecords) * 100).toFixed(2)}% |
| Customers | ${customers.length.toLocaleString()} | ${((customers.length / totalRecords) * 100).toFixed(2)}% |
| Orders | ${updatedOrders.length.toLocaleString()} | ${((updatedOrders.length / totalRecords) * 100).toFixed(2)}% |
| Order Items | ${orderItems.length.toLocaleString()} | ${((orderItems.length / totalRecords) * 100).toFixed(2)}% |
| Reviews | ${reviews.length.toLocaleString()} | ${((reviews.length / totalRecords) * 100).toFixed(2)}% |
| **TOTAL** | **${totalRecords.toLocaleString()}** | **100.00%** |

## Date Ranges

- **Start Date**: ${DATE_RANGE.start.toISOString().split('T')[0]}
- **End Date**: ${DATE_RANGE.end.toISOString().split('T')[0]}
- **Duration**: ${Math.floor((DATE_RANGE.end.getTime() - DATE_RANGE.start.getTime()) / (1000 * 60 * 60 * 24))} days

## Fixed Categories (${CATEGORIES.length})

${CATEGORIES.map((cat, idx) => `${idx + 1}. **${cat.name}** - ${cat.description}`).join('\n')}

## Country Distribution

| Country | Weight |
|---------|-------:|
${COUNTRIES.map(c => `| ${c.name} | ${(c.weight * 100).toFixed(1)}% |`).join('\n')}

## Order Status Distribution

| Status | Weight |
|--------|-------:|
${ORDER_STATUSES.map(s => `| ${s.value} | ${(s.weight * 100).toFixed(1)}% |`).join('\n')}

## Payment Method Distribution

| Payment Method | Weight |
|---------------|-------:|
${PAYMENT_METHODS.map(p => `| ${p.value} | ${(p.weight * 100).toFixed(1)}% |`).join('\n')}

## Data Characteristics

### Products
- Price range: $5.00 - $2,000.00
- Stock quantity: 0 - 1,000 units
- Description null rate: 15%
- Availability rate: 85%

### Customers
- Age range: 18 - 80 years
- Phone null rate: 20%
- Address null rate: 10%
- All customers start as active

### Orders
- Average items per order: ~${(orderItems.length / updatedOrders.length).toFixed(2)}
- Status distribution follows weighted probabilities
- Payment method distribution follows weighted probabilities

### Reviews
- Rating distribution: Normal (favoring 4-5 stars)
- Comment null rate: 20%
- Only for delivered orders
- Coverage: ~${((reviews.length / products.length) * 100).toFixed(2)}% of products

## Example Queries

### Find top 10 products by revenue
\`\`\`sql
SELECT 
  p.product_id,
  p.name,
  SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100)) as total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name
ORDER BY total_revenue DESC
LIMIT 10;
\`\`\`

### Analyze customer order frequency
\`\`\`sql
SELECT 
  customer_id,
  COUNT(*) as order_count,
  SUM(total_amount) as total_spent
FROM orders
GROUP BY customer_id
ORDER BY order_count DESC
LIMIT 20;
\`\`\`

### Products with highest average ratings
\`\`\`sql
SELECT 
  p.product_id,
  p.name,
  COUNT(r.review_id) as review_count,
  AVG(r.rating) as avg_rating
FROM products p
JOIN reviews r ON p.product_id = r.product_id
GROUP BY p.product_id, p.name
HAVING COUNT(r.review_id) >= 3
ORDER BY avg_rating DESC, review_count DESC
LIMIT 10;
\`\`\`

### Orders by status and payment method
\`\`\`sql
SELECT 
  status,
  payment_method,
  COUNT(*) as order_count,
  SUM(total_amount) as total_amount
FROM orders
GROUP BY status, payment_method
ORDER BY order_count DESC;
\`\`\`

### Monthly order trends
\`\`\`sql
SELECT 
  DATE_TRUNC('month', order_date) as month,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue
FROM orders
GROUP BY month
ORDER BY month;
\`\`\`

### Supplier performance
\`\`\`sql
SELECT 
  s.supplier_id,
  s.name,
  s.country,
  COUNT(DISTINCT p.product_id) as product_count,
  COUNT(DISTINCT oi.order_id) as orders_fulfilled
FROM suppliers s
JOIN products p ON s.supplier_id = p.supplier_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY s.supplier_id, s.name, s.country
ORDER BY orders_fulfilled DESC
LIMIT 20;
\`\`\`

### Category popularity
\`\`\`sql
SELECT 
  c.name as category,
  COUNT(DISTINCT p.product_id) as product_count,
  COUNT(oi.order_item_id) as items_sold,
  SUM(oi.quantity * oi.unit_price * (1 - oi.discount / 100)) as revenue
FROM categories c
JOIN products p ON c.category_id = p.category_id
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY c.category_id, c.name
ORDER BY revenue DESC;
\`\`\`

---

*Generated with seed ${SEED} for deterministic reproducibility*
`;

    // Write DISTRIBUTION.md
    const distributionPath = path.join(outputPath, 'DISTRIBUTION.md');
    fs.writeFileSync(distributionPath, distributionDoc, 'utf8');
    
    const docEndTime = Date.now();
    const docDuration = ((docEndTime - docStartTime) / 1000).toFixed(2);
    
    console.log(`   ✓ Generated DISTRIBUTION.md`);
    console.log(`   Duration: ${docDuration}s`);
    console.log('');

    // Task 5.6: Generation summary logging
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                        GENERATION COMPLETE                               ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📁 Output Directory:');
    console.log(`   ${outputPath}`);
    console.log('');
    console.log('📊 Files Generated:');
    console.log('   ✓ categories.csv');
    console.log('   ✓ suppliers.csv');
    console.log('   ✓ products.csv');
    console.log('   ✓ customers.csv');
    console.log('   ✓ orders.csv');
    console.log('   ✓ order_items.csv');
    console.log('   ✓ reviews.csv');
    console.log('   ✓ manifest.json');
    console.log('   ✓ DISTRIBUTION.md');
    console.log('');
    console.log('⏱️  Total Time:');
    console.log(`   Generation:  ${duration}s`);
    console.log(`   CSV Write:   ${csvDuration}s`);
    console.log(`   Manifest:    ${manifestDuration}s`);
    console.log(`   Documentation: ${docDuration}s`);
    console.log(`   **TOTAL:     ${totalDuration}s**`);
    console.log('');
    console.log('✅ All data generated successfully and ready for loading!');
    console.log('');

  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}\n`);
      displayHelp();
      process.exit(1);
    }
    throw error;
  }
}

// Run main function if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { parseArguments, displayHelp, GeneratorConfig };
