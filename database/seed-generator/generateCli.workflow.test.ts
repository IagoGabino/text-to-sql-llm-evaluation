/**
 * Tests for Task 5.2 - Main Generation Workflow
 * 
 * These tests verify that the main generation workflow orchestrates
 * all generator functions in the correct dependency order and produces
 * the expected record counts for each preset.
 */

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

describe('Task 5.2 - Main Generation Workflow', () => {
  beforeEach(() => {
    // Reset faker seed before each test
    faker.seed(SEED);
  });

  describe('Workflow Integration', () => {
    it('should generate all data in correct dependency order for small preset', () => {
      const preset = PRESETS.small;
      
      // Step 1: Categories (no dependencies)
      const categories = generateCategories();
      expect(categories).toHaveLength(50);
      
      const categoryIds = categories.map(c => c.category_id);
      
      // Step 2: Suppliers (no dependencies)
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      expect(suppliers).toHaveLength(preset.distribution.suppliers);
      
      const supplierIds = suppliers.map(s => s.supplier_id);
      
      // Step 3: Products (depends on categories and suppliers)
      const products = generateProducts(preset.distribution.products, categoryIds, supplierIds);
      expect(products).toHaveLength(preset.distribution.products);
      
      // Verify all products have valid category_id and supplier_id
      products.forEach(p => {
        expect(categoryIds).toContain(p.category_id);
        expect(supplierIds).toContain(p.supplier_id);
      });
      
      // Step 4: Customers (no dependencies)
      const customers = generateCustomers(preset.distribution.customers);
      expect(customers).toHaveLength(preset.distribution.customers);
      
      // Step 5: Orders (depends on customers)
      const orders = generateOrders(preset.distribution.orders, customers);
      expect(orders).toHaveLength(preset.distribution.orders);
      
      // Verify all orders have valid customer_id and order_date >= registration_date
      const customerMap = new Map(customers.map(c => [c.customer_id, c]));
      orders.forEach(o => {
        const customer = customerMap.get(o.customer_id);
        expect(customer).toBeDefined();
        expect(new Date(o.order_date).getTime()).toBeGreaterThanOrEqual(
          new Date(customer!.registration_date).getTime()
        );
      });
      
      // Step 6: Order Items (depends on orders and products)
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      expect(orderItems.length).toBeGreaterThan(0);
      expect(updatedOrders).toHaveLength(orders.length);
      
      // Verify all order items have valid order_id and product_id
      const orderIds = orders.map(o => o.order_id);
      const productIds = products.map(p => p.product_id);
      orderItems.forEach(oi => {
        expect(orderIds).toContain(oi.order_id);
        expect(productIds).toContain(oi.product_id);
      });
      
      // Step 7: Reviews (depends on products, orders, and order items)
      const reviews = generateReviews(products, updatedOrders, orderItems);
      expect(reviews.length).toBeGreaterThanOrEqual(0);
      
      // Verify all reviews have valid product_id and customer_id
      const customerIds = customers.map(c => c.customer_id);
      reviews.forEach(r => {
        expect(productIds).toContain(r.product_id);
        expect(customerIds).toContain(r.customer_id);
      });
    });

    it('should generate correct record counts for medium preset', () => {
      const preset = PRESETS.medium;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(preset.distribution.products, 
        categories.map(c => c.category_id), 
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      const { orderItems } = generateOrderItems(orders, products);
      
      expect(categories).toHaveLength(50);
      expect(suppliers).toHaveLength(preset.distribution.suppliers);
      expect(products).toHaveLength(preset.distribution.products);
      expect(customers).toHaveLength(preset.distribution.customers);
      expect(orders).toHaveLength(preset.distribution.orders);
      expect(orderItems.length).toBeGreaterThan(0);
    });

    it('should generate correct record counts for large preset', () => {
      const preset = PRESETS.large;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(preset.distribution.products, 
        categories.map(c => c.category_id), 
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      const { orderItems } = generateOrderItems(orders, products);
      
      expect(categories).toHaveLength(50);
      expect(suppliers).toHaveLength(preset.distribution.suppliers);
      expect(products).toHaveLength(preset.distribution.products);
      expect(customers).toHaveLength(preset.distribution.customers);
      expect(orders).toHaveLength(preset.distribution.orders);
      expect(orderItems.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity across all tables', () => {
      const preset = PRESETS.small;
      
      // Generate all data
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const categoryIds = categories.map(c => c.category_id);
      const supplierIds = suppliers.map(s => s.supplier_id);
      const products = generateProducts(preset.distribution.products, categoryIds, supplierIds);
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      const reviews = generateReviews(products, updatedOrders, orderItems);
      
      // Verify all foreign keys are valid
      const productIds = products.map(p => p.product_id);
      const customerIds = customers.map(c => c.customer_id);
      const orderIds = orders.map(o => o.order_id);
      
      // Products reference categories and suppliers
      products.forEach(p => {
        expect(categoryIds).toContain(p.category_id);
        expect(supplierIds).toContain(p.supplier_id);
      });
      
      // Orders reference customers
      orders.forEach(o => {
        expect(customerIds).toContain(o.customer_id);
      });
      
      // Order items reference orders and products
      orderItems.forEach(oi => {
        expect(orderIds).toContain(oi.order_id);
        expect(productIds).toContain(oi.product_id);
      });
      
      // Reviews reference products and customers
      reviews.forEach(r => {
        expect(productIds).toContain(r.product_id);
        expect(customerIds).toContain(r.customer_id);
      });
    });

    it('should update order totals correctly after generating order items', () => {
      const preset = PRESETS.small;
      
      const categories = generateCategories();
      const suppliers = generateSuppliers(preset.distribution.suppliers);
      const products = generateProducts(preset.distribution.products, 
        categories.map(c => c.category_id), 
        suppliers.map(s => s.supplier_id)
      );
      const customers = generateCustomers(preset.distribution.customers);
      const orders = generateOrders(preset.distribution.orders, customers);
      
      // Before generating order items, all totals should be 0
      orders.forEach(o => {
        expect(o.total_amount).toBe(0);
      });
      
      const { orderItems, updatedOrders } = generateOrderItems(orders, products);
      
      // After generating order items, verify totals are calculated correctly
      const orderItemsByOrder = new Map<number, typeof orderItems>();
      orderItems.forEach(oi => {
        if (!orderItemsByOrder.has(oi.order_id)) {
          orderItemsByOrder.set(oi.order_id, []);
        }
        orderItemsByOrder.get(oi.order_id)!.push(oi);
      });
      
      updatedOrders.forEach(order => {
        const items = orderItemsByOrder.get(order.order_id) || [];
        const expectedTotal = items.reduce((sum, item) => {
          return sum + (item.unit_price * item.quantity * (1 - item.discount / 100));
        }, 0);
        
        expect(order.total_amount).toBeCloseTo(expectedTotal, 2);
      });
    });
  });

  describe('Determinism', () => {
    it('should generate identical data with same seed', () => {
      const preset = PRESETS.small;
      
      // First generation
      faker.seed(SEED);
      const categories1 = generateCategories();
      const suppliers1 = generateSuppliers(preset.distribution.suppliers);
      const products1 = generateProducts(preset.distribution.products, 
        categories1.map(c => c.category_id), 
        suppliers1.map(s => s.supplier_id)
      );
      
      // Second generation with same seed
      faker.seed(SEED);
      const categories2 = generateCategories();
      const suppliers2 = generateSuppliers(preset.distribution.suppliers);
      const products2 = generateProducts(preset.distribution.products, 
        categories2.map(c => c.category_id), 
        suppliers2.map(s => s.supplier_id)
      );
      
      // Verify identical generation
      expect(categories1).toEqual(categories2);
      expect(suppliers1).toEqual(suppliers2);
      expect(products1).toEqual(products2);
    });
  });
});
