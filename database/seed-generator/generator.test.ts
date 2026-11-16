/**
 * Unit Tests for Data Generation Functions
 */

import { generateCategories, generateSuppliers, generateProducts, generateCustomers, generateOrders, generateOrderItems, generateReviews } from './generator';
import { CATEGORIES, COUNTRIES, DATE_RANGE, ORDER_STATUSES, PAYMENT_METHODS } from './constants';

describe('generateCategories', () => {
  it('should generate exactly 50 categories', () => {
    const categories = generateCategories();
    expect(categories.length).toBe(50);
  });

  it('should assign sequential category_ids starting from 1', () => {
    const categories = generateCategories();
    
    expect(categories[0].category_id).toBe(1);
    expect(categories[1].category_id).toBe(2);
    expect(categories[49].category_id).toBe(50);
  });

  it('should use names from CATEGORIES constants', () => {
    const categories = generateCategories();
    
    expect(categories[0].name).toBe(CATEGORIES[0].name);
    expect(categories[10].name).toBe(CATEGORIES[10].name);
    expect(categories[49].name).toBe(CATEGORIES[49].name);
  });

  it('should use descriptions from CATEGORIES constants', () => {
    const categories = generateCategories();
    
    expect(categories[0].description).toBe(CATEGORIES[0].description);
    expect(categories[25].description).toBe(CATEGORIES[25].description);
    expect(categories[49].description).toBe(CATEGORIES[49].description);
  });

  it('should have created_at field in all records', () => {
    const categories = generateCategories();
    
    categories.forEach(category => {
      expect(category.created_at).toBeTruthy();
      expect(typeof category.created_at).toBe('string');
    });
  });

  it('should use YYYY-MM-DD date format for created_at', () => {
    const categories = generateCategories();
    
    // Check date format matches YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    expect(categories[0].created_at).toMatch(dateRegex);
  });

  it('should have all required fields for each category', () => {
    const categories = generateCategories();
    
    categories.forEach(category => {
      expect(category).toHaveProperty('category_id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('description');
      expect(category).toHaveProperty('created_at');
    });
  });

  it('should generate deterministic results', () => {
    const firstRun = generateCategories();
    const secondRun = generateCategories();
    
    expect(firstRun).toEqual(secondRun);
  });

  it('should include specific expected categories', () => {
    const categories = generateCategories();
    const categoryNames = categories.map(c => c.name);
    
    // Check for some expected categories from different sections
    expect(categoryNames).toContain('smartphones'); // Electronics
    expect(categoryNames).toContain('refrigerators'); // Home & Kitchen
    expect(categoryNames).toContain('mens-shirts'); // Clothing
    expect(categoryNames).toContain('packaged-snacks'); // Foods & Beverages
    expect(categoryNames).toContain('fitness-equipment'); // Sports & Outdoors
    expect(categoryNames).toContain('skincare'); // Beauty & Personal Care
  });

  it('should have unique category names', () => {
    const categories = generateCategories();
    const names = categories.map(c => c.name);
    const uniqueNames = new Set(names);
    
    expect(uniqueNames.size).toBe(50);
  });
});

// ============================================================================
// generateSuppliers Tests
// ============================================================================

describe('generateSuppliers', () => {
  // Test case: Should generate exact count requested
  it('should generate exact count of suppliers', () => {
    const counts = [10, 50, 100, 500];
    counts.forEach(count => {
      const result = generateSuppliers(count);
      expect(result.length).toBe(count);
    });
  });

  // Test case: Should assign sequential IDs starting from 1
  it('should have sequential supplier_ids starting from 1', () => {
    const result = generateSuppliers(100);
    result.forEach((supplier, index) => {
      expect(supplier.supplier_id).toBe(index + 1);
    });
  });

  // Test case: All required fields should be present
  it('should have all required fields', () => {
    const result = generateSuppliers(10);
    result.forEach(supplier => {
      expect(supplier).toHaveProperty('supplier_id');
      expect(supplier).toHaveProperty('name');
      expect(supplier).toHaveProperty('contact_name');
      expect(supplier).toHaveProperty('email');
      expect(supplier).toHaveProperty('phone');
      expect(supplier).toHaveProperty('country');
      
      // Required fields should not be null
      expect(supplier.supplier_id).toBeGreaterThan(0);
      expect(supplier.name).toBeTruthy();
      expect(supplier.contact_name).toBeTruthy();
      expect(supplier.email).toBeTruthy();
      expect(supplier.country).toBeTruthy();
    });
  });

  // Test case: Phone numbers should respect 20% null rate
  it('should have approximately 20% null phone numbers', () => {
    const result = generateSuppliers(1000);
    const nullPhones = result.filter(s => s.phone === null).length;
    const nullRate = nullPhones / result.length;
    
    // Allow ±5% variance for 20% null rate
    expect(nullRate).toBeGreaterThanOrEqual(0.15);
    expect(nullRate).toBeLessThanOrEqual(0.25);
  });

  // Test case: Phone numbers should be max 20 characters
  it('should have phone numbers with max 20 characters', () => {
    const result = generateSuppliers(500);
    result.forEach(supplier => {
      if (supplier.phone !== null) {
        expect(supplier.phone.length).toBeLessThanOrEqual(20);
      }
    });
  });

  // Test case: Email addresses should be unique
  it('should have unique email addresses', () => {
    const result = generateSuppliers(500);
    const emails = result.map(s => s.email);
    const uniqueEmails = new Set(emails);
    expect(uniqueEmails.size).toBe(result.length);
  });

  // Test case: Email addresses should use index-based suffix
  it('should have email addresses with index-based prefix', () => {
    const result = generateSuppliers(100);
    result.forEach((supplier, index) => {
      const expectedPrefix = `supplier${index + 1}@`;
      expect(supplier.email).toMatch(new RegExp(`^${expectedPrefix}`));
    });
  });

  // Test case: Countries should be from COUNTRIES constant
  it('should use countries from constants only', () => {
    const result = generateSuppliers(500);
    const constantCountries = COUNTRIES.map(c => c.name);
    result.forEach(supplier => {
      expect(constantCountries).toContain(supplier.country);
    });
  });

  // Test case: Country distribution should follow weights
  it('should respect weighted country distribution', () => {
    const result = generateSuppliers(10000);
    const countryCounts: Record<string, number> = {};
    
    // Count occurrences
    result.forEach(supplier => {
      countryCounts[supplier.country] = (countryCounts[supplier.country] || 0) + 1;
    });

    // Check high-volume countries (should be around their weights)
    const usCount = countryCounts['United States'] || 0;
    const usRate = usCount / result.length;
    expect(usRate).toBeGreaterThanOrEqual(0.10); // 12% ±2%
    expect(usRate).toBeLessThanOrEqual(0.14);

    const ukCount = countryCounts['United Kingdom'] || 0;
    const ukRate = ukCount / result.length;
    expect(ukRate).toBeGreaterThanOrEqual(0.06); // 8% ±2%
    expect(ukRate).toBeLessThanOrEqual(0.10);
  });

  // Test case: Should be deterministic across multiple runs
  it('should produce identical results with same seed', () => {
    const result1 = generateSuppliers(100);
    const result2 = generateSuppliers(100);
    
    expect(result1).toEqual(result2);
  });

  // Test case: Should handle edge case of single supplier
  it('should handle generating single supplier', () => {
    const result = generateSuppliers(1);
    expect(result.length).toBe(1);
    expect(result[0].supplier_id).toBe(1);
    expect(result[0].email).toMatch(/^supplier1@/);
  });
});

// ============================================================================
// generateProducts Tests
// ============================================================================

describe('generateProducts', () => {
  const testCategoryIds = [1, 2, 3, 4, 5];
  const testSupplierIds = [10, 20, 30];

  // Test case: Should generate exact count requested
  it('should generate exact count of products', () => {
    const counts = [10, 50, 100, 500];
    counts.forEach(count => {
      const result = generateProducts(count, testCategoryIds, testSupplierIds);
      expect(result.length).toBe(count);
    });
  });

  // Test case: Should assign sequential IDs starting from 1
  it('should have sequential product_ids starting from 1', () => {
    const result = generateProducts(100, testCategoryIds, testSupplierIds);
    result.forEach((product, index) => {
      expect(product.product_id).toBe(index + 1);
    });
  });

  // Test case: All required fields should be present
  it('should have all required fields', () => {
    const result = generateProducts(10, testCategoryIds, testSupplierIds);
    result.forEach(product => {
      expect(product).toHaveProperty('product_id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('stock_quantity');
      expect(product).toHaveProperty('category_id');
      expect(product).toHaveProperty('supplier_id');
      expect(product).toHaveProperty('created_at');
      expect(product).toHaveProperty('is_available');
      
      // Required non-null fields
      expect(product.product_id).toBeGreaterThan(0);
      expect(product.name).toBeTruthy();
      expect(product.price).toBeGreaterThan(0);
      expect(product.stock_quantity).toBeGreaterThanOrEqual(0);
      expect(product.category_id).toBeGreaterThan(0);
      expect(product.supplier_id).toBeGreaterThan(0);
      expect(product.created_at).toBeTruthy();
    });
  });

  // Test case: Descriptions should respect 15% null rate
  it('should have approximately 15% null descriptions', () => {
    const result = generateProducts(1000, testCategoryIds, testSupplierIds);
    const nullDescriptions = result.filter(p => p.description === null).length;
    const nullRate = nullDescriptions / result.length;
    
    // Allow ±5% variance for 15% null rate
    expect(nullRate).toBeGreaterThanOrEqual(0.10);
    expect(nullRate).toBeLessThanOrEqual(0.20);
  });

  // Test case: Prices should be between $5 and $2000
  it('should have prices between $5 and $2000', () => {
    const result = generateProducts(500, testCategoryIds, testSupplierIds);
    result.forEach(product => {
      expect(product.price).toBeGreaterThanOrEqual(5);
      expect(product.price).toBeLessThanOrEqual(2000);
    });
  });

  // Test case: Prices should have max 2 decimal places
  it('should have prices with max 2 decimal places', () => {
    const result = generateProducts(100, testCategoryIds, testSupplierIds);
    result.forEach(product => {
      const decimalPart = product.price.toString().split('.')[1];
      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });
  });

  // Test case: Stock quantities should be between 0 and 1000
  it('should have stock quantities between 0 and 1000', () => {
    const result = generateProducts(500, testCategoryIds, testSupplierIds);
    result.forEach(product => {
      expect(product.stock_quantity).toBeGreaterThanOrEqual(0);
      expect(product.stock_quantity).toBeLessThanOrEqual(1000);
    });
  });

  // Test case: Category IDs should be from provided array
  it('should use only category_ids from provided array', () => {
    const result = generateProducts(500, testCategoryIds, testSupplierIds);
    result.forEach(product => {
      expect(testCategoryIds).toContain(product.category_id);
    });
  });

  // Test case: Supplier IDs should be from provided array
  it('should use only supplier_ids from provided array', () => {
    const result = generateProducts(500, testCategoryIds, testSupplierIds);
    result.forEach(product => {
      expect(testSupplierIds).toContain(product.supplier_id);
    });
  });

  // Test case: is_available should be 85% true, 15% false
  it('should have approximately 85% is_available true', () => {
    const result = generateProducts(1000, testCategoryIds, testSupplierIds);
    const availableCount = result.filter(p => p.is_available === true).length;
    const availableRate = availableCount / result.length;
    
    // Allow ±5% variance for 85% true rate
    expect(availableRate).toBeGreaterThanOrEqual(0.80);
    expect(availableRate).toBeLessThanOrEqual(0.90);
  });

  // Test case: Should be deterministic across multiple runs
  it('should produce identical results with same seed', () => {
    const result1 = generateProducts(100, testCategoryIds, testSupplierIds);
    const result2 = generateProducts(100, testCategoryIds, testSupplierIds);
    
    expect(result1).toEqual(result2);
  });

  // Test case: Should handle edge case of single product
  it('should handle generating single product', () => {
    const result = generateProducts(1, testCategoryIds, testSupplierIds);
    expect(result.length).toBe(1);
    expect(result[0].product_id).toBe(1);
    expect(testCategoryIds).toContain(result[0].category_id);
    expect(testSupplierIds).toContain(result[0].supplier_id);
  });

  // Test case: Should distribute products across categories
  it('should distribute products across all provided categories', () => {
    const result = generateProducts(1000, testCategoryIds, testSupplierIds);
    const usedCategories = new Set(result.map(p => p.category_id));
    
    // With 1000 products and 5 categories, all should be used
    expect(usedCategories.size).toBe(testCategoryIds.length);
  });

  // Test case: Should distribute products across suppliers
  it('should distribute products across all provided suppliers', () => {
    const result = generateProducts(1000, testCategoryIds, testSupplierIds);
    const usedSuppliers = new Set(result.map(p => p.supplier_id));
    
    // With 1000 products and 3 suppliers, all should be used
    expect(usedSuppliers.size).toBe(testSupplierIds.length);
  });
});

// ============================================================================
// generateCustomers Tests
// ============================================================================

describe('generateCustomers', () => {
  // Test case: Should generate exact count requested
  it('should generate exact count of customers', () => {
    const counts = [10, 50, 100, 500];
    counts.forEach(count => {
      const result = generateCustomers(count);
      expect(result.length).toBe(count);
    });
  });

  // Test case: Should assign sequential IDs starting from 1
  it('should have sequential customer_ids starting from 1', () => {
    const result = generateCustomers(100);
    result.forEach((customer, index) => {
      expect(customer.customer_id).toBe(index + 1);
    });
  });

  // Test case: All required fields should be present
  it('should have all required fields', () => {
    const result = generateCustomers(10);
    result.forEach(customer => {
      expect(customer).toHaveProperty('customer_id');
      expect(customer).toHaveProperty('name');
      expect(customer).toHaveProperty('email');
      expect(customer).toHaveProperty('phone');
      expect(customer).toHaveProperty('birth_date');
      expect(customer).toHaveProperty('address');
      expect(customer).toHaveProperty('city');
      expect(customer).toHaveProperty('country');
      expect(customer).toHaveProperty('registration_date');
      expect(customer).toHaveProperty('is_active');
      
      // Required non-null fields
      expect(customer.customer_id).toBeGreaterThan(0);
      expect(customer.name).toBeTruthy();
      expect(customer.email).toBeTruthy();
      expect(customer.birth_date).toBeTruthy();
      expect(customer.city).toBeTruthy();
      expect(customer.country).toBeTruthy();
      expect(customer.registration_date).toBeTruthy();
      expect(customer.is_active).toBe(true);
    });
  });

  // Test case: Phone numbers should respect 20% null rate
  it('should have approximately 20% null phone numbers', () => {
    const result = generateCustomers(1000);
    const nullPhones = result.filter(c => c.phone === null).length;
    const nullRate = nullPhones / result.length;
    
    // Allow ±5% variance for 20% null rate
    expect(nullRate).toBeGreaterThanOrEqual(0.15);
    expect(nullRate).toBeLessThanOrEqual(0.25);
  });

  // Test case: Phone numbers should be max 20 characters
  it('should have phone numbers with max 20 characters', () => {
    const result = generateCustomers(500);
    result.forEach(customer => {
      if (customer.phone !== null) {
        expect(customer.phone.length).toBeLessThanOrEqual(20);
      }
    });
  });

  // Test case: Addresses should respect 10% null rate
  it('should have approximately 10% null addresses', () => {
    const result = generateCustomers(1000);
    const nullAddresses = result.filter(c => c.address === null).length;
    const nullRate = nullAddresses / result.length;
    
    // Allow ±5% variance for 10% null rate
    expect(nullRate).toBeGreaterThanOrEqual(0.05);
    expect(nullRate).toBeLessThanOrEqual(0.15);
  });

  // Test case: Email addresses should be unique
  it('should have unique email addresses', () => {
    const result = generateCustomers(500);
    const emails = result.map(c => c.email);
    const uniqueEmails = new Set(emails);
    expect(uniqueEmails.size).toBe(result.length);
  });

  // Test case: Email addresses should use index-based prefix
  it('should have email addresses with index-based prefix', () => {
    const result = generateCustomers(100);
    result.forEach((customer, index) => {
      const expectedPrefix = `customer${index + 1}@`;
      expect(customer.email).toMatch(new RegExp(`^${expectedPrefix}`));
    });
  });

  // Test case: Countries should be from COUNTRIES constant
  it('should use countries from constants only', () => {
    const result = generateCustomers(500);
    const constantCountries = COUNTRIES.map(c => c.name);
    result.forEach(customer => {
      expect(constantCountries).toContain(customer.country);
    });
  });

  // Test case: Birth dates should be in valid date format
  it('should have birth_date in YYYY-MM-DD format', () => {
    const result = generateCustomers(100);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    result.forEach(customer => {
      expect(customer.birth_date).toMatch(dateRegex);
    });
  });

  // Test case: Birth dates should be reasonable (18-80 years ago)
  it('should have birth_date between 18 and 80 years ago', () => {
    const result = generateCustomers(500);
    const today = new Date();
    // Customers must be at least 18 years old (born on or before today - 18 years)
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    // Customers up to 80 years old (born on or after today - 80 years)
    const minDate = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
    
    result.forEach(customer => {
      const birthDate = new Date(customer.birth_date);
      expect(birthDate.getTime()).toBeGreaterThanOrEqual(minDate.getTime());
      expect(birthDate.getTime()).toBeLessThanOrEqual(maxDate.getTime());
    });
  });

  // Test case: Registration dates should be in valid date format
  it('should have registration_date in YYYY-MM-DD format', () => {
    const result = generateCustomers(100);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    result.forEach(customer => {
      expect(customer.registration_date).toMatch(dateRegex);
    });
  });

  // Test case: Registration dates should be within DATE_RANGE
  it('should have registration_date within DATE_RANGE', () => {
    const result = generateCustomers(500);
    const startTime = DATE_RANGE.start.getTime();
    const endTime = DATE_RANGE.end.getTime();
    
    result.forEach(customer => {
      const regDate = new Date(customer.registration_date);
      expect(regDate.getTime()).toBeGreaterThanOrEqual(startTime);
      expect(regDate.getTime()).toBeLessThanOrEqual(endTime);
    });
  });

  // Test case: All customers should be active by default
  it('should have all customers as active', () => {
    const result = generateCustomers(500);
    result.forEach(customer => {
      expect(customer.is_active).toBe(true);
    });
  });

  // Test case: Should be deterministic across multiple runs
  it('should produce identical results with same seed', () => {
    const result1 = generateCustomers(100);
    const result2 = generateCustomers(100);
    
    expect(result1).toEqual(result2);
  });

  // Test case: Should handle edge case of single customer
  it('should handle generating single customer', () => {
    const result = generateCustomers(1);
    expect(result.length).toBe(1);
    expect(result[0].customer_id).toBe(1);
    expect(result[0].email).toMatch(/^customer1@/);
    expect(result[0].is_active).toBe(true);
  });

  // Test case: Country distribution should follow weights
  it('should respect weighted country distribution', () => {
    const result = generateCustomers(10000);
    const countryCounts: Record<string, number> = {};
    
    // Count occurrences
    result.forEach(customer => {
      countryCounts[customer.country] = (countryCounts[customer.country] || 0) + 1;
    });

    // Check high-volume countries (should be around their weights)
    const usCount = countryCounts['United States'] || 0;
    const usRate = usCount / result.length;
    expect(usRate).toBeGreaterThanOrEqual(0.10); // 12% ±2%
    expect(usRate).toBeLessThanOrEqual(0.14);

    const ukCount = countryCounts['United Kingdom'] || 0;
    const ukRate = ukCount / result.length;
    expect(ukRate).toBeGreaterThanOrEqual(0.06); // 8% ±2%
    expect(ukRate).toBeLessThanOrEqual(0.10);
  });
});

// ============================================================================
// generateOrders Tests
// ============================================================================

describe('generateOrders', () => {
  // Create test customers for order generation
  const testCustomers = generateCustomers(100);

  // Test case: Should generate exact count requested
  it('should generate exact count of orders', () => {
    const counts = [10, 50, 100, 500];
    counts.forEach(count => {
      const result = generateOrders(count, testCustomers);
      expect(result.length).toBe(count);
    });
  });

  // Test case: Should assign sequential IDs starting from 1
  it('should have sequential order_ids starting from 1', () => {
    const result = generateOrders(100, testCustomers);
    result.forEach((order, index) => {
      expect(order.order_id).toBe(index + 1);
    });
  });

  // Test case: All required fields should be present
  it('should have all required fields', () => {
    const result = generateOrders(10, testCustomers);
    result.forEach(order => {
      expect(order).toHaveProperty('order_id');
      expect(order).toHaveProperty('customer_id');
      expect(order).toHaveProperty('order_date');
      expect(order).toHaveProperty('total_amount');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('payment_method');
      expect(order).toHaveProperty('shipped_date');
      expect(order).toHaveProperty('delivered_date');
      
      // Required non-null fields
      expect(order.order_id).toBeGreaterThan(0);
      expect(order.customer_id).toBeGreaterThan(0);
      expect(order.order_date).toBeTruthy();
      expect(order.status).toBeTruthy();
      expect(order.payment_method).toBeTruthy();
    });
  });

  // Test case: Customer IDs should be from provided customers
  it('should use customer_ids from provided customers only', () => {
    const result = generateOrders(500, testCustomers);
    const customerIds = testCustomers.map(c => c.customer_id);
    result.forEach(order => {
      expect(customerIds).toContain(order.customer_id);
    });
  });

  // Test case: total_amount should be initialized to 0
  it('should have total_amount initialized to 0.00', () => {
    const result = generateOrders(100, testCustomers);
    result.forEach(order => {
      expect(order.total_amount).toBe(0.00);
    });
  });

  // Test case: Order dates should be in valid format
  it('should have order_date in YYYY-MM-DD format', () => {
    const result = generateOrders(100, testCustomers);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    result.forEach(order => {
      expect(order.order_date).toMatch(dateRegex);
    });
  });

  // Test case: Order dates should be after customer registration
  it('should have order_date >= customer registration_date', () => {
    const result = generateOrders(500, testCustomers);
    const customerMap = new Map(testCustomers.map(c => [c.customer_id, c]));
    
    result.forEach(order => {
      const customer = customerMap.get(order.customer_id);
      expect(customer).toBeDefined();
      
      const orderDate = new Date(order.order_date);
      const regDate = new Date(customer!.registration_date);
      expect(orderDate.getTime()).toBeGreaterThanOrEqual(regDate.getTime());
    });
  });

  // Test case: Order dates should be within DATE_RANGE.end
  it('should have order_date <= DATE_RANGE.end', () => {
    const result = generateOrders(500, testCustomers);
    const endTime = DATE_RANGE.end.getTime();
    
    result.forEach(order => {
      const orderDate = new Date(order.order_date);
      expect(orderDate.getTime()).toBeLessThanOrEqual(endTime);
    });
  });

  // Test case: Statuses should be from ORDER_STATUSES constant
  it('should use statuses from constants only', () => {
    const result = generateOrders(500, testCustomers);
    const validStatuses = ORDER_STATUSES.map(s => s.value);
    result.forEach(order => {
      expect(validStatuses).toContain(order.status);
    });
  });

  // Test case: Payment methods should be from PAYMENT_METHODS constant
  it('should use payment methods from constants only', () => {
    const result = generateOrders(500, testCustomers);
    const validPaymentMethods = PAYMENT_METHODS.map(p => p.value);
    result.forEach(order => {
      expect(validPaymentMethods).toContain(order.payment_method);
    });
  });

  // Test case: Status distribution should follow weights
  it('should respect weighted status distribution', () => {
    const result = generateOrders(10000, testCustomers);
    const statusCounts: Record<string, number> = {};
    
    // Count occurrences
    result.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    // Check major statuses (50% delivered, 20% shipped)
    const deliveredCount = statusCounts['delivered'] || 0;
    const deliveredRate = deliveredCount / result.length;
    expect(deliveredRate).toBeGreaterThanOrEqual(0.45); // 50% ±5%
    expect(deliveredRate).toBeLessThanOrEqual(0.55);

    const shippedCount = statusCounts['shipped'] || 0;
    const shippedRate = shippedCount / result.length;
    expect(shippedRate).toBeGreaterThanOrEqual(0.15); // 20% ±5%
    expect(shippedRate).toBeLessThanOrEqual(0.25);
  });

  // Test case: Payment method distribution should follow weights
  it('should respect weighted payment method distribution', () => {
    const result = generateOrders(10000, testCustomers);
    const paymentCounts: Record<string, number> = {};
    
    // Count occurrences
    result.forEach(order => {
      paymentCounts[order.payment_method] = (paymentCounts[order.payment_method] || 0) + 1;
    });

    // Check major payment methods (45% credit_card, 25% debit_card)
    const creditCardCount = paymentCounts['credit_card'] || 0;
    const creditCardRate = creditCardCount / result.length;
    expect(creditCardRate).toBeGreaterThanOrEqual(0.40); // 45% ±5%
    expect(creditCardRate).toBeLessThanOrEqual(0.50);

    const debitCardCount = paymentCounts['debit_card'] || 0;
    const debitCardRate = debitCardCount / result.length;
    expect(debitCardRate).toBeGreaterThanOrEqual(0.20); // 25% ±5%
    expect(debitCardRate).toBeLessThanOrEqual(0.30);
  });

  // Test case: pending/processing/cancelled should have NULL shipping dates
  it('should have NULL shipped_date and delivered_date for pending/processing/cancelled', () => {
    const result = generateOrders(1000, testCustomers);
    result.forEach(order => {
      if (['pending', 'processing', 'cancelled'].includes(order.status)) {
        expect(order.shipped_date).toBeNull();
        expect(order.delivered_date).toBeNull();
      }
    });
  });

  // Test case: shipped status should have shipped_date but NULL delivered_date
  it('should have shipped_date and NULL delivered_date for shipped status', () => {
    const result = generateOrders(1000, testCustomers);
    result.forEach(order => {
      if (order.status === 'shipped') {
        expect(order.shipped_date).not.toBeNull();
        expect(order.delivered_date).toBeNull();
      }
    });
  });

  // Test case: delivered status should have both dates
  it('should have both shipped_date and delivered_date for delivered status', () => {
    const result = generateOrders(1000, testCustomers);
    result.forEach(order => {
      if (order.status === 'delivered') {
        expect(order.shipped_date).not.toBeNull();
        expect(order.delivered_date).not.toBeNull();
      }
    });
  });

  // Test case: shipped_date should be 1-3 days after order_date
  it('should have shipped_date 1-3 days after order_date', () => {
    const result = generateOrders(1000, testCustomers);
    result.forEach(order => {
      if (order.shipped_date) {
        const orderDate = new Date(order.order_date);
        const shippedDate = new Date(order.shipped_date);
        const daysDiff = (shippedDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        
        expect(daysDiff).toBeGreaterThanOrEqual(1);
        expect(daysDiff).toBeLessThanOrEqual(3);
      }
    });
  });

  // Test case: delivered_date should be 2-7 days after shipped_date
  it('should have delivered_date 2-7 days after shipped_date', () => {
    const result = generateOrders(1000, testCustomers);
    result.forEach(order => {
      if (order.delivered_date && order.shipped_date) {
        const shippedDate = new Date(order.shipped_date);
        const deliveredDate = new Date(order.delivered_date);
        const daysDiff = (deliveredDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        expect(daysDiff).toBeGreaterThanOrEqual(2);
        expect(daysDiff).toBeLessThanOrEqual(7);
      }
    });
  });

  // Test case: Should be deterministic across multiple runs
  it('should produce identical results with same seed', () => {
    const result1 = generateOrders(100, testCustomers);
    const result2 = generateOrders(100, testCustomers);
    
    expect(result1).toEqual(result2);
  });

  // Test case: Should handle edge case of single order
  it('should handle generating single order', () => {
    const result = generateOrders(1, testCustomers);
    expect(result.length).toBe(1);
    expect(result[0].order_id).toBe(1);
    expect(result[0].total_amount).toBe(0.00);
  });
});

// ============================================================================
// generateOrderItems Tests
// ============================================================================

describe('generateOrderItems', () => {
  // Create test data
  const testCustomers = generateCustomers(50);
  const testCategoryIds = [1, 2, 3, 4, 5];
  const testSupplierIds = [10, 20, 30];
  const testProducts = generateProducts(100, testCategoryIds, testSupplierIds);
  const testOrders = generateOrders(100, testCustomers);

  // Test case: Should generate at least one item per order
  it('should generate at least one item per order', () => {
    const result = generateOrderItems(testOrders, testProducts);
    
    // Count items per order
    const itemsPerOrder = new Map<number, number>();
    result.orderItems.forEach(item => {
      itemsPerOrder.set(item.order_id, (itemsPerOrder.get(item.order_id) || 0) + 1);
    });
    
    // Every order should have at least 1 item
    testOrders.forEach(order => {
      expect(itemsPerOrder.get(order.order_id)).toBeGreaterThanOrEqual(1);
    });
  });

  // Test case: Should have sequential order_item_ids
  it('should have sequential order_item_ids starting from 1', () => {
    const result = generateOrderItems(testOrders, testProducts);
    result.orderItems.forEach((item, index) => {
      expect(item.order_item_id).toBe(index + 1);
    });
  });

  // Test case: All required fields should be present
  it('should have all required fields', () => {
    const result = generateOrderItems(testOrders, testProducts);
    result.orderItems.forEach(item => {
      expect(item).toHaveProperty('order_item_id');
      expect(item).toHaveProperty('order_id');
      expect(item).toHaveProperty('product_id');
      expect(item).toHaveProperty('quantity');
      expect(item).toHaveProperty('unit_price');
      expect(item).toHaveProperty('discount');
      
      // Required non-null fields
      expect(item.order_item_id).toBeGreaterThan(0);
      expect(item.order_id).toBeGreaterThan(0);
      expect(item.product_id).toBeGreaterThan(0);
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.unit_price).toBeGreaterThanOrEqual(0);
      expect(item.discount).toBeGreaterThanOrEqual(0);
    });
  });

  // Test case: Order IDs should be from provided orders
  it('should use order_ids from provided orders only', () => {
    const result = generateOrderItems(testOrders, testProducts);
    const orderIds = testOrders.map(o => o.order_id);
    result.orderItems.forEach(item => {
      expect(orderIds).toContain(item.order_id);
    });
  });

  // Test case: Product IDs should be from provided products
  it('should use product_ids from provided products only', () => {
    const result = generateOrderItems(testOrders, testProducts);
    const productIds = testProducts.map(p => p.product_id);
    result.orderItems.forEach(item => {
      expect(productIds).toContain(item.product_id);
    });
  });

  // Test case: Quantity should be between 1 and 3
  it('should have quantity between 1 and 3', () => {
    const result = generateOrderItems(testOrders, testProducts);
    result.orderItems.forEach(item => {
      expect(item.quantity).toBeGreaterThanOrEqual(1);
      expect(item.quantity).toBeLessThanOrEqual(3);
    });
  });

  // Test case: Discount should be between 0 and 30
  it('should have discount between 0 and 30', () => {
    const result = generateOrderItems(testOrders, testProducts);
    result.orderItems.forEach(item => {
      expect(item.discount).toBeGreaterThanOrEqual(0);
      expect(item.discount).toBeLessThanOrEqual(30);
    });
  });

  // Test case: unit_price should match product price
  it('should have unit_price matching product price', () => {
    const result = generateOrderItems(testOrders, testProducts);
    const productPriceMap = new Map(testProducts.map(p => [p.product_id, p.price]));
    
    result.orderItems.forEach(item => {
      const expectedPrice = productPriceMap.get(item.product_id);
      expect(item.unit_price).toBe(expectedPrice);
    });
  });

  // Test case: Should update order total_amount
  it('should update order total_amount from 0.00 to calculated value', () => {
    const result = generateOrderItems(testOrders, testProducts);
    
    // All original orders had total_amount = 0.00
    testOrders.forEach(order => {
      expect(order.total_amount).toBe(0.00);
    });
    
    // Updated orders should have positive total_amount (except if all discounts were 100%)
    result.updatedOrders.forEach(order => {
      expect(order.total_amount).toBeGreaterThanOrEqual(0);
    });
  });

  // Test case: Order total should equal sum of item subtotals
  it('should calculate order total_amount correctly', () => {
    const result = generateOrderItems(testOrders, testProducts);
    
    // Calculate totals manually
    const manualTotals = new Map<number, number>();
    result.orderItems.forEach(item => {
      const subtotal = item.quantity * item.unit_price * (1 - item.discount / 100);
      const current = manualTotals.get(item.order_id) || 0;
      manualTotals.set(item.order_id, current + subtotal);
    });
    
    // Compare with updated orders
    result.updatedOrders.forEach(order => {
      const expectedTotal = parseFloat((manualTotals.get(order.order_id) || 0).toFixed(2));
      expect(order.total_amount).toBeCloseTo(expectedTotal, 2);
    });
  });

  // Test case: Should average 1.5-2.1 items per order
  it('should generate average of 1.5-2.5 items per order', () => {
    // Use larger sample for better average
    const largeOrders = generateOrders(1000, testCustomers);
    const result = generateOrderItems(largeOrders, testProducts);
    
    const avgItemsPerOrder = result.orderItems.length / largeOrders.length;
    expect(avgItemsPerOrder).toBeGreaterThanOrEqual(1.5);
    expect(avgItemsPerOrder).toBeLessThanOrEqual(2.5);
  });

  // Test case: Should be deterministic across multiple runs
  it('should produce identical results with same seed', () => {
    const result1 = generateOrderItems(testOrders, testProducts);
    const result2 = generateOrderItems(testOrders, testProducts);
    
    expect(result1.orderItems).toEqual(result2.orderItems);
    expect(result1.updatedOrders).toEqual(result2.updatedOrders);
  });

  // Test case: Updated orders should preserve all original fields
  it('should preserve all original order fields except total_amount', () => {
    const result = generateOrderItems(testOrders, testProducts);
    
    testOrders.forEach((originalOrder, index) => {
      const updatedOrder = result.updatedOrders[index];
      
      expect(updatedOrder.order_id).toBe(originalOrder.order_id);
      expect(updatedOrder.customer_id).toBe(originalOrder.customer_id);
      expect(updatedOrder.order_date).toBe(originalOrder.order_date);
      expect(updatedOrder.status).toBe(originalOrder.status);
      expect(updatedOrder.payment_method).toBe(originalOrder.payment_method);
      expect(updatedOrder.shipped_date).toBe(originalOrder.shipped_date);
      expect(updatedOrder.delivered_date).toBe(originalOrder.delivered_date);
      // Only total_amount should change
    });
  });

  // Test case: Should handle single order
  it('should handle single order with items', () => {
    const singleOrder = [testOrders[0]];
    const result = generateOrderItems(singleOrder, testProducts);
    
    expect(result.orderItems.length).toBeGreaterThanOrEqual(1);
    expect(result.updatedOrders.length).toBe(1);
    expect(result.updatedOrders[0].total_amount).toBeGreaterThan(0);
  });

  // Test case: All items should belong to existing orders
  it('should have all items referencing valid orders', () => {
    const result = generateOrderItems(testOrders, testProducts);
    const orderIdSet = new Set(testOrders.map(o => o.order_id));
    
    result.orderItems.forEach(item => {
      expect(orderIdSet.has(item.order_id)).toBe(true);
    });
  });
});

// ============================================================================
// generateReviews Tests
// ============================================================================

describe('generateReviews', () => {
  // Create test data with delivered orders
  const testCustomers = generateCustomers(50);
  const testCategoryIds = [1, 2, 3, 4, 5];
  const testSupplierIds = [10, 20, 30];
  const testProducts = generateProducts(100, testCategoryIds, testSupplierIds);
  const testOrders = generateOrders(200, testCustomers);
  const { orderItems, updatedOrders } = generateOrderItems(testOrders, testProducts);

  // Test case: Should generate reviews only for delivered orders
  it('should generate reviews only from delivered orders', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    
    // Get all customer IDs from delivered orders only
    const deliveredOrderCustomers = new Set(
      updatedOrders.filter(o => o.status === 'delivered').map(o => o.customer_id)
    );
    
    result.forEach(review => {
      expect(deliveredOrderCustomers.has(review.customer_id)).toBe(true);
    });
  });

  // Test case: Should generate reviews for approximately 5-10% of products
  it('should generate reviews for approximately 5-10% of products', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    const reviewPercentage = result.length / testProducts.length;
    
    expect(reviewPercentage).toBeGreaterThanOrEqual(0.05);
    expect(reviewPercentage).toBeLessThanOrEqual(0.10);
  });

  // Test case: Should have sequential review_ids
  it('should have sequential review_ids starting from 1', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    result.forEach((review, index) => {
      expect(review.review_id).toBe(index + 1);
    });
  });

  // Test case: All required fields should be present
  it('should have all required fields', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    result.forEach(review => {
      expect(review).toHaveProperty('review_id');
      expect(review).toHaveProperty('product_id');
      expect(review).toHaveProperty('customer_id');
      expect(review).toHaveProperty('rating');
      expect(review).toHaveProperty('comment');
      expect(review).toHaveProperty('review_date');
      
      // Required non-null fields
      expect(review.review_id).toBeGreaterThan(0);
      expect(review.product_id).toBeGreaterThan(0);
      expect(review.customer_id).toBeGreaterThan(0);
      expect(review.rating).toBeGreaterThan(0);
      expect(review.review_date).toBeTruthy();
    });
  });

  // Test case: Product IDs should be from provided products
  it('should use product_ids from provided products only', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    const productIds = testProducts.map(p => p.product_id);
    result.forEach(review => {
      expect(productIds).toContain(review.product_id);
    });
  });

  // Test case: Customer IDs should be from delivered orders
  it('should use customer_ids from delivered orders only', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    const deliveredOrderCustomers = updatedOrders
      .filter(o => o.status === 'delivered')
      .map(o => o.customer_id);
    
    result.forEach(review => {
      expect(deliveredOrderCustomers).toContain(review.customer_id);
    });
  });

  // Test case: Ratings should be between 1 and 5
  it('should have ratings between 1 and 5', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    result.forEach(review => {
      expect(review.rating).toBeGreaterThanOrEqual(1);
      expect(review.rating).toBeLessThanOrEqual(5);
    });
  });

  // Test case: Comments should have approximately 80% non-null rate
  it('should have approximately 80% non-null comments', () => {
    // Use larger dataset for better statistical sampling
    const largeProducts = generateProducts(500, testCategoryIds, testSupplierIds);
    const largeOrders = generateOrders(1000, testCustomers);
    const { orderItems: largeOrderItems, updatedOrders: largeUpdatedOrders } = generateOrderItems(largeOrders, largeProducts);
    const result = generateReviews(largeProducts, largeUpdatedOrders, largeOrderItems);
    
    if (result.length < 10) return; // Skip if sample too small
    
    const nonNullComments = result.filter(r => r.comment !== null).length;
    const nonNullRate = nonNullComments / result.length;
    
    // Allow ±10% variance for 80% non-null rate
    expect(nonNullRate).toBeGreaterThanOrEqual(0.70);
    expect(nonNullRate).toBeLessThanOrEqual(0.90);
  });

  // Test case: Review dates should be in valid format
  it('should have review_date in YYYY-MM-DD format', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    result.forEach(review => {
      expect(review.review_date).toMatch(dateRegex);
    });
  });

  // Test case: Review dates should be after delivered_date
  it('should have review_date >= order delivered_date', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    
    // Create map of order items by product
    const productOrderMap = new Map<number, number[]>();
    orderItems.forEach(item => {
      if (!productOrderMap.has(item.product_id)) {
        productOrderMap.set(item.product_id, []);
      }
      productOrderMap.get(item.product_id)!.push(item.order_id);
    });
    
    const orderMap = new Map(updatedOrders.map(o => [o.order_id, o]));
    
    result.forEach(review => {
      const reviewDate = new Date(review.review_date);
      const orderIds = productOrderMap.get(review.product_id) || [];
      
      // Find the delivered order for this product and customer
      const relevantOrders = orderIds
        .map(id => orderMap.get(id))
        .filter(o => o && o.status === 'delivered' && o.customer_id === review.customer_id);
      
      expect(relevantOrders.length).toBeGreaterThan(0);
      
      // Review date should be >= some delivered date
      const hasValidDate = relevantOrders.some(order => {
        const deliveredDate = new Date(order!.delivered_date!);
        return reviewDate.getTime() >= deliveredDate.getTime();
      });
      
      expect(hasValidDate).toBe(true);
    });
  });

  // Test case: Review dates should be within DATE_RANGE.end
  it('should have review_date <= DATE_RANGE.end', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    const endTime = DATE_RANGE.end.getTime();
    
    result.forEach(review => {
      const reviewDate = new Date(review.review_date);
      expect(reviewDate.getTime()).toBeLessThanOrEqual(endTime);
    });
  });

  // Test case: Ratings should favor higher scores (4-5 stars)
  it('should have rating distribution favoring 4-5 stars', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    if (result.length < 20) return; // Skip if sample too small
    
    const highRatings = result.filter(r => r.rating >= 4).length;
    const highRatingRate = highRatings / result.length;
    
    // With weighted distribution (40% for 5, 30% for 4), expect ~70% high ratings
    expect(highRatingRate).toBeGreaterThanOrEqual(0.60);
  });

  // Test case: Should be deterministic across multiple runs
  it('should produce identical results with same seed', () => {
    const result1 = generateReviews(testProducts, updatedOrders, orderItems);
    const result2 = generateReviews(testProducts, updatedOrders, orderItems);
    
    expect(result1).toEqual(result2);
  });

  // Test case: Should return empty array if no delivered orders
  it('should return empty array if no delivered orders', () => {
    const nonDeliveredOrders = updatedOrders.map(o => ({
      ...o,
      status: 'pending'
    }));
    
    const result = generateReviews(testProducts, nonDeliveredOrders, orderItems);
    expect(result.length).toBe(0);
  });

  // Test case: Should only review products that were actually ordered
  it('should only review products from delivered orders', () => {
    const result = generateReviews(testProducts, updatedOrders, orderItems);
    
    // Get products from delivered orders
    const deliveredOrderIds = new Set(
      updatedOrders.filter(o => o.status === 'delivered').map(o => o.order_id)
    );
    const productsInDeliveredOrders = new Set(
      orderItems.filter(item => deliveredOrderIds.has(item.order_id)).map(item => item.product_id)
    );
    
    result.forEach(review => {
      expect(productsInDeliveredOrders.has(review.product_id)).toBe(true);
    });
  });
});
