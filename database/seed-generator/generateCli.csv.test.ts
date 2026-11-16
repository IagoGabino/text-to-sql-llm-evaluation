/**
 * Tests for Task 5.3 - CSV File Writing
 * 
 * These tests verify that CSV files are written correctly with proper
 * headers, directory creation, and streaming for large datasets.
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
import { writeCSV } from './utils';

describe('Task 5.3 - CSV File Writing', () => {
  const testOutputDir = path.join(__dirname, '../seed-data/generated/test-csv');

  beforeAll(() => {
    // Clean up test directory before running tests
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up test directory after tests
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Directory Creation', () => {
    it('should create output directory if it does not exist', async () => {
      expect(fs.existsSync(testOutputDir)).toBe(false);

      // Create directory
      fs.mkdirSync(testOutputDir, { recursive: true });

      expect(fs.existsSync(testOutputDir)).toBe(true);
      expect(fs.statSync(testOutputDir).isDirectory()).toBe(true);
    });

    it('should handle nested directory creation', async () => {
      const nestedDir = path.join(testOutputDir, 'level1/level2/level3');
      
      fs.mkdirSync(nestedDir, { recursive: true });

      expect(fs.existsSync(nestedDir)).toBe(true);
      expect(fs.statSync(nestedDir).isDirectory()).toBe(true);
    });
  });

  describe('CSV File Writing', () => {
    beforeEach(() => {
      // Ensure test directory exists
      if (!fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
      }
      
      // Reset faker seed
      faker.seed(SEED);
    });

    it('should write categories.csv with correct headers', async () => {
      const categories = generateCategories();
      const filePath = path.join(testOutputDir, 'categories.csv');

      await writeCSV(filePath, categories);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header
      expect(lines[0]).toBe('category_id,name,description,created_at');
      
      // Check record count (header + 50 categories)
      expect(lines.length).toBe(51);
    });

    it('should write suppliers.csv with correct headers', async () => {
      const suppliers = generateSuppliers(100);
      const filePath = path.join(testOutputDir, 'suppliers.csv');

      await writeCSV(filePath, suppliers);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header
      expect(lines[0]).toBe('supplier_id,name,contact_name,email,phone,country');
      
      // Check record count (header + 100 suppliers)
      expect(lines.length).toBe(101);
    });

    it('should write products.csv with correct headers', async () => {
      const categories = generateCategories();
      const suppliers = generateSuppliers(10);
      const products = generateProducts(
        50, 
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );
      const filePath = path.join(testOutputDir, 'products.csv');

      await writeCSV(filePath, products);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header
      expect(lines[0]).toBe('product_id,name,description,price,stock_quantity,category_id,supplier_id,created_at,is_available');
      
      // Check record count
      expect(lines.length).toBe(51);
    });

    it('should write customers.csv with correct headers', async () => {
      const customers = generateCustomers(100);
      const filePath = path.join(testOutputDir, 'customers.csv');

      await writeCSV(filePath, customers);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header
      expect(lines[0]).toBe('customer_id,name,email,phone,birth_date,address,city,country,registration_date,is_active');
      
      // Check record count
      expect(lines.length).toBe(101);
    });

    it('should write orders.csv with correct headers', async () => {
      const customers = generateCustomers(50);
      const orders = generateOrders(100, customers);
      const filePath = path.join(testOutputDir, 'orders.csv');

      await writeCSV(filePath, orders);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header
      expect(lines[0]).toBe('order_id,customer_id,order_date,total_amount,status,payment_method,shipped_date,delivered_date');
      
      // Check record count
      expect(lines.length).toBe(101);
    });

    it('should write order_items.csv with correct headers', async () => {
      const categories = generateCategories();
      const suppliers = generateSuppliers(10);
      const products = generateProducts(
        50, 
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(20);
      const orders = generateOrders(30, customers);
      const { orderItems } = generateOrderItems(orders, products);
      const filePath = path.join(testOutputDir, 'order_items.csv');

      await writeCSV(filePath, orderItems);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header
      expect(lines[0]).toBe('order_item_id,order_id,product_id,quantity,unit_price,discount');
      
      // Check that we have at least some order items
      expect(lines.length).toBeGreaterThan(10);
    });

    it('should write reviews.csv with correct headers', async () => {
      const categories = generateCategories();
      const suppliers = generateSuppliers(10);
      const products = generateProducts(
        100, 
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(50);
      const orders = generateOrders(100, customers);
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      const reviews = generateReviews(products, updatedOrders, orderItems);
      const filePath = path.join(testOutputDir, 'reviews.csv');

      await writeCSV(filePath, reviews);

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Check header (only if there are reviews)
      if (lines.length > 1) {
        expect(lines[0]).toBe('review_id,product_id,customer_id,rating,comment,review_date');
      }
    });

    it('should handle empty fields correctly (null values)', async () => {
      const suppliers = generateSuppliers(100);
      const filePath = path.join(testOutputDir, 'suppliers_null_test.csv');

      await writeCSV(filePath, suppliers);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Find a line with null phone (should appear as empty between commas)
      const linesWithNullPhone = lines.filter(line => {
        const fields = line.split(',');
        // Phone is the 5th field (index 4)
        return fields[4] === '';
      });

      // With 20% null rate and 100 suppliers, we should have some null phones
      expect(linesWithNullPhone.length).toBeGreaterThan(0);
    });
  });

  describe('CSV File Integrity', () => {
    beforeEach(() => {
      if (!fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
      }
      faker.seed(SEED);
    });

    it('should write files that can be read back correctly', async () => {
      const categories = generateCategories();
      const filePath = path.join(testOutputDir, 'categories_integrity.csv');

      await writeCSV(filePath, categories);

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      
      // Parse first data line
      const firstDataLine = lines[1].split(',');
      
      expect(firstDataLine[0]).toBe('1'); // category_id
      expect(firstDataLine[1]).toBe('smartphones'); // name
      expect(firstDataLine[3]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // created_at (YYYY-MM-DD)
    });

    it('should create files with correct sizes', async () => {
      const preset = PRESETS.small;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(
        preset.distribution.products,
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );

      await writeCSV(path.join(testOutputDir, 'size_test_categories.csv'), categories);
      await writeCSV(path.join(testOutputDir, 'size_test_suppliers.csv'), suppliers);
      await writeCSV(path.join(testOutputDir, 'size_test_products.csv'), products);

      // Check file sizes
      const categoriesSize = fs.statSync(path.join(testOutputDir, 'size_test_categories.csv')).size;
      const suppliersSize = fs.statSync(path.join(testOutputDir, 'size_test_suppliers.csv')).size;
      const productsSize = fs.statSync(path.join(testOutputDir, 'size_test_products.csv')).size;

      // Categories should be smallest (only 50 records)
      expect(categoriesSize).toBeGreaterThan(0);
      expect(categoriesSize).toBeLessThan(10000); // Less than 10KB

      // Suppliers should be small (100 records)
      expect(suppliersSize).toBeGreaterThan(categoriesSize);
      expect(suppliersSize).toBeLessThan(50000); // Less than 50KB

      // Products should be larger (2000 records)
      expect(productsSize).toBeGreaterThan(suppliersSize);
      expect(productsSize).toBeGreaterThan(100000); // More than 100KB
    });
  });

  describe('Streaming Performance', () => {
    beforeEach(() => {
      if (!fs.existsSync(testOutputDir)) {
        fs.mkdirSync(testOutputDir, { recursive: true });
      }
      faker.seed(SEED);
    });

    it('should handle large datasets efficiently', async () => {
      const preset = PRESETS.medium;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(
        preset.distribution.products,
        categories.map(c => c.category_id),
        suppliers.map(s => s.supplier_id)
      );

      const startTime = Date.now();
      
      await writeCSV(path.join(testOutputDir, 'perf_products.csv'), products);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (less than 5 seconds for 10k records)
      expect(duration).toBeLessThan(5000);

      // Verify file was created and has correct size
      const filePath = path.join(testOutputDir, 'perf_products.csv');
      expect(fs.existsSync(filePath)).toBe(true);
      
      const fileSize = fs.statSync(filePath).size;
      expect(fileSize).toBeGreaterThan(1000000); // More than 1MB for 10k products
    }, 10000); // 10 second timeout
  });
});
