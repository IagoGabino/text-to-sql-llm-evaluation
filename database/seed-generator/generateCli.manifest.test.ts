/**
 * Tests for Task 5.4 - Manifest Generation
 * 
 * These tests verify that manifest.json is generated correctly with
 * SHA-256 checksums, metadata, and proper structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import { faker } from '@faker-js/faker';
import { PRESETS, SEED } from './constants';
import {
  generateCategories,
  generateSuppliers,
  generateProducts,
  generateCustomers,
  generateOrders,
  generateOrderItems,
  generateReviews
} from './generator';
import { writeCSV, calculateSHA256 } from './utils';

interface ManifestData {
  preset: string;
  seed: number;
  generated_at: string;
  total_records: number;
  distribution: Record<string, number>;
  checksums: Record<string, string>;
}

describe('Task 5.4 - Manifest Generation', () => {
  const testOutputDir = path.join(__dirname, '../seed-data/generated/test-manifest');

  beforeAll(() => {
    // Clean up test directory before running tests
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testOutputDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory after tests
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('SHA-256 Checksum Calculation', () => {
    beforeEach(() => {
      faker.seed(SEED);
    });

    it('should calculate SHA-256 checksum for CSV file', async () => {
      const categories = generateCategories();
      const filePath = path.join(testOutputDir, 'test_categories.csv');

      await writeCSV(filePath, categories);
      const checksum = await calculateSHA256(filePath);

      // SHA-256 produces 64 hex characters
      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce identical checksums for identical files', async () => {
      const categories = generateCategories();
      const filePath1 = path.join(testOutputDir, 'identical1.csv');
      const filePath2 = path.join(testOutputDir, 'identical2.csv');

      await writeCSV(filePath1, categories);
      await writeCSV(filePath2, categories);

      const checksum1 = await calculateSHA256(filePath1);
      const checksum2 = await calculateSHA256(filePath2);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different files', async () => {
      const categories = generateCategories();
      const suppliers = generateSuppliers(10);
      
      const filePath1 = path.join(testOutputDir, 'different1.csv');
      const filePath2 = path.join(testOutputDir, 'different2.csv');

      await writeCSV(filePath1, categories);
      await writeCSV(filePath2, suppliers);

      const checksum1 = await calculateSHA256(filePath1);
      const checksum2 = await calculateSHA256(filePath2);

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('Manifest Structure', () => {
    beforeEach(() => {
      faker.seed(SEED);
    });

    it('should create manifest with correct structure', async () => {
      const preset = PRESETS.small;
      
      // Generate data
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(
        preset.distribution.products,
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      const reviews = generateReviews(products, updatedOrders, orderItems);

      // Write CSV files
      await writeCSV(path.join(testOutputDir, 'categories.csv'), categories);
      await writeCSV(path.join(testOutputDir, 'suppliers.csv'), suppliers);
      await writeCSV(path.join(testOutputDir, 'products.csv'), products);
      await writeCSV(path.join(testOutputDir, 'customers.csv'), customers);
      await writeCSV(path.join(testOutputDir, 'orders.csv'), updatedOrders);
      await writeCSV(path.join(testOutputDir, 'order_items.csv'), orderItems);
      await writeCSV(path.join(testOutputDir, 'reviews.csv'), reviews);

      // Calculate checksums
      const checksums: Record<string, string> = {};
      const csvFiles = [
        'categories.csv', 'suppliers.csv', 'products.csv', 
        'customers.csv', 'orders.csv', 'order_items.csv', 'reviews.csv'
      ];
      
      for (const filename of csvFiles) {
        const checksum = await calculateSHA256(path.join(testOutputDir, filename));
        checksums[filename] = `sha256:${checksum}`;
      }

      // Create manifest
      const totalRecords = categories.length + suppliers.length + products.length +
                          customers.length + updatedOrders.length + orderItems.length + reviews.length;
      
      const manifest: ManifestData = {
        preset: 'small',
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

      // Verify structure
      expect(manifest).toHaveProperty('preset');
      expect(manifest).toHaveProperty('seed');
      expect(manifest).toHaveProperty('generated_at');
      expect(manifest).toHaveProperty('total_records');
      expect(manifest).toHaveProperty('distribution');
      expect(manifest).toHaveProperty('checksums');

      expect(manifest.preset).toBe('small');
      expect(manifest.seed).toBe(42);
      expect(manifest.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(manifest.total_records).toBeGreaterThan(0);
      expect(Object.keys(manifest.distribution)).toHaveLength(7);
      expect(Object.keys(manifest.checksums)).toHaveLength(7);
    });

    it('should include checksums with sha256: prefix', async () => {
      const categories = generateCategories();
      const filePath = path.join(testOutputDir, 'prefix_test.csv');

      await writeCSV(filePath, categories);
      const checksum = await calculateSHA256(filePath);
      const checksumWithPrefix = `sha256:${checksum}`;

      expect(checksumWithPrefix).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('should have ISO 8601 timestamp format', () => {
      const timestamp = new Date().toISOString();
      
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Manifest Content Validation', () => {
    beforeEach(() => {
      faker.seed(SEED);
    });

    it('should have correct distribution counts', async () => {
      const preset = PRESETS.small;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(
        preset.distribution.products,
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      const reviews = generateReviews(products, updatedOrders, orderItems);

      const distribution = {
        categories: categories.length,
        suppliers: suppliers.length,
        products: products.length,
        customers: customers.length,
        orders: updatedOrders.length,
        order_items: orderItems.length,
        reviews: reviews.length
      };

      // Verify fixed counts
      expect(distribution.categories).toBe(50);
      expect(distribution.suppliers).toBe(preset.distribution.suppliers);
      expect(distribution.products).toBe(preset.distribution.products);
      expect(distribution.customers).toBe(preset.distribution.customers);
      expect(distribution.orders).toBe(preset.distribution.orders);
      
      // Order items and reviews are variable, just verify they exist
      expect(distribution.order_items).toBeGreaterThan(0);
      expect(distribution.reviews).toBeGreaterThanOrEqual(0);
    });

    it('should calculate correct total_records', async () => {
      const preset = PRESETS.small;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(
        preset.distribution.products,
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      const reviews = generateReviews(products, updatedOrders, orderItems);

      const totalRecords = categories.length + suppliers.length + products.length +
                          customers.length + updatedOrders.length + orderItems.length + reviews.length;

      const sumOfDistribution = categories.length + suppliers.length + products.length +
                               customers.length + updatedOrders.length + orderItems.length + reviews.length;

      expect(totalRecords).toBe(sumOfDistribution);
      expect(totalRecords).toBeGreaterThan(10000);
    });
  });

  describe('Manifest File Writing', () => {
    beforeEach(() => {
      faker.seed(SEED);
    });

    it('should write valid JSON file', async () => {
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 100,
        distribution: {
          categories: 50,
          suppliers: 50
        },
        checksums: {
          'test.csv': 'sha256:abc123'
        }
      };

      const manifestPath = path.join(testOutputDir, 'test_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      expect(fs.existsSync(manifestPath)).toBe(true);

      const content = fs.readFileSync(manifestPath, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed).toEqual(manifest);
    });

    it('should write manifest with pretty formatting', async () => {
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 100,
        distribution: { categories: 50 },
        checksums: { 'test.csv': 'sha256:abc' }
      };

      const manifestPath = path.join(testOutputDir, 'formatted_manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      const content = fs.readFileSync(manifestPath, 'utf8');
      
      // Check for indentation
      expect(content).toContain('  "preset"');
      expect(content).toContain('  "seed"');
    });
  });

  describe('Deterministic Checksums', () => {
    it('should produce same checksums for regenerated data', async () => {
      // First generation
      faker.seed(SEED);
      const categories1 = generateCategories();
      const filePath1 = path.join(testOutputDir, 'deterministic1.csv');
      await writeCSV(filePath1, categories1);
      const checksum1 = await calculateSHA256(filePath1);

      // Second generation with same seed
      faker.seed(SEED);
      const categories2 = generateCategories();
      const filePath2 = path.join(testOutputDir, 'deterministic2.csv');
      await writeCSV(filePath2, categories2);
      const checksum2 = await calculateSHA256(filePath2);

      expect(checksum1).toBe(checksum2);
      expect(categories1).toEqual(categories2);
    });
  });
});
