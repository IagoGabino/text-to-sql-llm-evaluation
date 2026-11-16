/**
 * Data Generation Functions for Deterministic Database Seeding
 * 
 * This module contains functions to generate deterministic test data
 * for all database tables using fixed seeds and constants.
 */

import { faker } from '@faker-js/faker';
import { SEED, CATEGORIES, COUNTRIES, NULL_RATES, DATE_RANGE, ORDER_STATUSES, PAYMENT_METHODS } from './constants';
import { formatDateUSA, selectWeighted } from './utils';

/**
 * Interface for Category records
 */
export interface CategoryRecord {
  category_id: number;
  name: string;
  description: string;
  created_at: string;
}

/**
 * Generates exactly 50 fixed categories from constants
 * 
 * Uses predefined category names and descriptions from constants.ts
 * to ensure consistency across all preset generations. Categories are
 * the same regardless of preset size.
 * 
 * @returns Array of 50 category records with sequential IDs
 * 
 * @example
 * const categories = generateCategories();
 * // Returns 50 categories: smartphones, tablets, laptops, etc.
 */
export function generateCategories(): CategoryRecord[] {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const currentDate = formatDateUSA(new Date());
  const categories: CategoryRecord[] = [];

  // Generate all 50 categories from constants
  for (let i = 0; i < CATEGORIES.length; i++) {
    categories.push({
      category_id: i + 1, // Sequential IDs starting from 1
      name: CATEGORIES[i].name,
      description: CATEGORIES[i].description,
      created_at: currentDate
    });
  }

  return categories;
}

/**
 * Interface for Supplier records
 */
export interface SupplierRecord {
  supplier_id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  country: string;
}

/**
 * Generates supplier records with deterministic data
 * 
 * Creates suppliers with company names, contact information, and weighted
 * country distribution. Phone numbers have a 20% null rate and are limited
 * to 20 characters. Email addresses are guaranteed unique using index-based
 * suffixes.
 * 
 * @param count - Number of suppliers to generate
 * @returns Array of supplier records with sequential IDs
 * 
 * @example
 * const suppliers = generateSuppliers(100);
 * // Returns 100 suppliers with IDs 1-100
 */
export function generateSuppliers(count: number): SupplierRecord[] {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const suppliers: SupplierRecord[] = [];

  for (let i = 0; i < count; i++) {
    // Generate phone with 20% null rate
    let phone: string | null = null;
    if (faker.number.float({ min: 0, max: 1 }) > NULL_RATES.phone) {
      // Generate phone and ensure max 20 characters
      phone = faker.phone.number().substring(0, 20);
    }

    // Select country using weighted distribution
    const country = selectWeighted(COUNTRIES, faker);

    suppliers.push({
      supplier_id: i + 1, // Sequential IDs starting from 1
      name: faker.company.name(),
      contact_name: faker.person.fullName(),
      email: `supplier${i + 1}@${faker.internet.domainName()}`, // Unique email with index
      phone: phone,
      country: country.name
    });
  }

  return suppliers;
}

/**
 * Interface for Product records
 */
export interface ProductRecord {
  product_id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category_id: number;
  supplier_id: number;
  created_at: string;
  is_available: boolean;
}

/**
 * Generates product records with deterministic data
 * 
 * Creates products with names, optional descriptions (15% null), prices
 * between $5-$2000, stock quantities 0-1000, and availability flags (85% true).
 * Products are randomly assigned to provided categories and suppliers while
 * maintaining referential integrity.
 * 
 * @param count - Number of products to generate
 * @param categoryIds - Array of valid category IDs to assign products to
 * @param supplierIds - Array of valid supplier IDs to assign products to
 * @returns Array of product records with sequential IDs
 * 
 * @example
 * const products = generateProducts(1000, [1,2,3], [10,20,30]);
 * // Returns 1000 products with IDs 1-1000
 */
export function generateProducts(
  count: number,
  categoryIds: number[],
  supplierIds: number[]
): ProductRecord[] {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const currentDate = formatDateUSA(new Date());
  const products: ProductRecord[] = [];

  for (let i = 0; i < count; i++) {
    // Generate description with 15% null rate
    let description: string | null = null;
    if (faker.number.float({ min: 0, max: 1 }) > NULL_RATES.description) {
      description = faker.commerce.productDescription();
    }

    // Generate price between $5 and $2000
    const price = faker.number.float({ min: 5, max: 2000, fractionDigits: 2 });

    // Generate stock quantity between 0 and 1000
    const stock_quantity = faker.number.int({ min: 0, max: 1000 });

    // Randomly select category_id from provided array
    const category_id = faker.helpers.arrayElement(categoryIds);

    // Randomly select supplier_id from provided array
    const supplier_id = faker.helpers.arrayElement(supplierIds);

    // Set is_available with 85% true, 15% false
    const is_available = faker.number.float({ min: 0, max: 1 }) > 0.15;

    products.push({
      product_id: i + 1, // Sequential IDs starting from 1
      name: faker.commerce.productName(),
      description: description,
      price: price,
      stock_quantity: stock_quantity,
      category_id: category_id,
      supplier_id: supplier_id,
      created_at: currentDate,
      is_available: is_available
    });
  }

  return products;
}

/**
 * Interface for Customer records
 */
export interface CustomerRecord {
  customer_id: number;
  name: string;
  email: string;
  phone: string | null;
  birth_date: string;
  address: string | null;
  city: string;
  country: string;
  registration_date: string;
  is_active: boolean;
}

/**
 * Generates customer records with deterministic data
 * 
 * Creates customers with full names, unique emails, optional phone numbers
 * (20% null), birth dates, optional addresses (10% null), cities, and weighted
 * country distribution. Registration dates are uniformly distributed between
 * DATE_RANGE.start and DATE_RANGE.end. All customers start as active.
 * 
 * @param count - Number of customers to generate
 * @returns Array of customer records with sequential IDs
 * 
 * @example
 * const customers = generateCustomers(1000);
 * // Returns 1000 customers with IDs 1-1000
 */
export function generateCustomers(count: number): CustomerRecord[] {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const customers: CustomerRecord[] = [];

  for (let i = 0; i < count; i++) {
    // Generate phone with 20% null rate
    let phone: string | null = null;
    if (faker.number.float({ min: 0, max: 1 }) > NULL_RATES.phone) {
      // Generate phone and ensure max 20 characters
      phone = faker.phone.number().substring(0, 20);
    }

    // Generate address with 10% null rate
    let address: string | null = null;
    if (faker.number.float({ min: 0, max: 1 }) > NULL_RATES.address) {
      address = faker.location.streetAddress(true);
    }

    // Select country using weighted distribution
    const country = selectWeighted(COUNTRIES, faker);

    // Generate birth_date (18-80 years ago from today)
    // Calculate exact date to ensure customer is at least 18 years old
    const today = new Date();
    const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const minBirthDate = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
    const birth_date = faker.date.between({ from: minBirthDate, to: maxBirthDate });

    // Generate registration_date uniformly distributed between DATE_RANGE
    const registration_date = faker.date.between({
      from: DATE_RANGE.start,
      to: DATE_RANGE.end
    });

    customers.push({
      customer_id: i + 1, // Sequential IDs starting from 1
      name: faker.person.fullName(),
      email: `customer${i + 1}@${faker.internet.domainName()}`, // Unique email with index
      phone: phone,
      birth_date: formatDateUSA(birth_date),
      address: address,
      city: faker.location.city(),
      country: country.name,
      registration_date: formatDateUSA(registration_date),
      is_active: true // All customers start as active
    });
  }

  return customers;
}

/**
 * Interface for Order records
 */
export interface OrderRecord {
  order_id: number;
  customer_id: number;
  order_date: string;
  total_amount: number;
  status: string;
  payment_method: string;
  shipped_date: string | null;
  delivered_date: string | null;
}

/**
 * Generates order records with deterministic data
 * 
 * Creates orders with weighted status and payment method distribution.
 * Order dates are randomly distributed between customer registration and
 * DATE_RANGE.end. Shipping and delivery dates are calculated based on
 * status logic:
 * - pending/processing/cancelled: both dates NULL
 * - shipped: shipped_date = order_date + 1-3 days, delivered_date = NULL
 * - delivered: shipped_date = order_date + 1-3 days, delivered_date = shipped_date + 2-7 days
 * 
 * @param count - Number of orders to generate
 * @param customers - Array of customer records to assign orders to
 * @returns Array of order records with sequential IDs
 * 
 * @example
 * const orders = generateOrders(1000, customers);
 * // Returns 1000 orders with IDs 1-1000
 */
export function generateOrders(
  count: number,
  customers: CustomerRecord[]
): OrderRecord[] {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const orders: OrderRecord[] = [];

  for (let i = 0; i < count; i++) {
    // Randomly select a customer
    const customer = faker.helpers.arrayElement(customers);

    // Generate order_date between customer registration and DATE_RANGE.end
    const customerRegDate = new Date(customer.registration_date);
    const order_date = faker.date.between({
      from: customerRegDate,
      to: DATE_RANGE.end
    });

    // Select status using weighted distribution
    const status = selectWeighted(ORDER_STATUSES, faker);

    // Select payment method using weighted distribution
    const payment_method = selectWeighted(PAYMENT_METHODS, faker);

    // Calculate shipped_date and delivered_date based on status
    let shipped_date: string | null = null;
    let delivered_date: string | null = null;

    if (status.value === 'shipped' || status.value === 'delivered') {
      // shipped_date = order_date + 1-3 days
      const shippedDateObj = new Date(order_date);
      shippedDateObj.setDate(shippedDateObj.getDate() + faker.number.int({ min: 1, max: 3 }));
      shipped_date = formatDateUSA(shippedDateObj);

      if (status.value === 'delivered') {
        // delivered_date = shipped_date + 2-7 days
        const deliveredDateObj = new Date(shippedDateObj);
        deliveredDateObj.setDate(deliveredDateObj.getDate() + faker.number.int({ min: 2, max: 7 }));
        delivered_date = formatDateUSA(deliveredDateObj);
      }
    }
    // For pending, processing, cancelled: both dates remain NULL

    orders.push({
      order_id: i + 1, // Sequential IDs starting from 1
      customer_id: customer.customer_id,
      order_date: formatDateUSA(order_date),
      total_amount: 0.00, // Will be updated after order_items are generated
      status: status.value,
      payment_method: payment_method.value,
      shipped_date: shipped_date,
      delivered_date: delivered_date
    });
  }

  return orders;
}

/**
 * Interface for OrderItem records
 */
export interface OrderItemRecord {
  order_item_id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
}

/**
 * Generates order item records and updates parent order total_amount
 * 
 * Creates order items with random products, quantities (1-3), and discounts
 * (0-30%). The average number of items per order varies by the total count
 * requested. After generating items, calculates and updates each order's
 * total_amount based on the formula: sum(quantity × unit_price × (1 - discount/100))
 * 
 * @param orders - Array of order records to create items for
 * @param products - Array of product records to select from
 * @returns Object containing order_items array and updated orders array
 * 
 * @example
 * const result = generateOrderItems(orders, products);
 * // Returns { orderItems: [...], updatedOrders: [...] }
 */
export function generateOrderItems(
  orders: OrderRecord[],
  products: ProductRecord[]
): { orderItems: OrderItemRecord[]; updatedOrders: OrderRecord[] } {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const orderItems: OrderItemRecord[] = [];
  let orderItemId = 1;

  // Create a map to track total amounts per order
  const orderTotals = new Map<number, number>();
  orders.forEach(order => orderTotals.set(order.order_id, 0));

  // Generate items for each order
  orders.forEach(order => {
    // Determine number of items for this order (1-4 items, weighted toward 2)
    // This creates an average of ~1.8 items per order
    const numItems = faker.helpers.weightedArrayElement([
      { weight: 20, value: 1 },
      { weight: 40, value: 2 },
      { weight: 30, value: 3 },
      { weight: 10, value: 4 }
    ]);

    for (let i = 0; i < numItems; i++) {
      // Select random product
      const product = faker.helpers.arrayElement(products);

      // Generate quantity (1-3)
      const quantity = faker.number.int({ min: 1, max: 3 });

      // Use product's price as unit_price
      const unit_price = product.price;

      // Generate discount (0-30%)
      const discount = faker.number.float({ min: 0, max: 30, fractionDigits: 2 });

      // Calculate item subtotal: quantity × unit_price × (1 - discount/100)
      const itemSubtotal = quantity * unit_price * (1 - discount / 100);

      // Add to order total
      const currentTotal = orderTotals.get(order.order_id) || 0;
      orderTotals.set(order.order_id, currentTotal + itemSubtotal);

      orderItems.push({
        order_item_id: orderItemId++,
        order_id: order.order_id,
        product_id: product.product_id,
        quantity: quantity,
        unit_price: unit_price,
        discount: discount
      });
    }
  });

  // Update orders with calculated total_amount
  const updatedOrders = orders.map(order => ({
    ...order,
    total_amount: parseFloat((orderTotals.get(order.order_id) || 0).toFixed(2))
  }));

  return { orderItems, updatedOrders };
}

/**
 * Interface for Review records
 */
export interface ReviewRecord {
  review_id: number;
  product_id: number;
  customer_id: number;
  rating: number;
  comment: string | null;
  review_date: string;
}

/**
 * Generates review records for delivered orders
 * 
 * Creates reviews for 5-10% of products, selecting only from delivered orders.
 * Review dates are set between the order's delivered_date and DATE_RANGE.end.
 * Ratings follow a normal distribution favoring higher scores (more 4-5 stars).
 * Comments have an 80% non-null rate.
 * 
 * @param products - Array of product records to potentially review
 * @param orders - Array of order records (only delivered orders will generate reviews)
 * @param orderItems - Array of order item records to link products to orders
 * @returns Array of review records with sequential IDs
 * 
 * @example
 * const reviews = generateReviews(products, orders, orderItems);
 * // Returns reviews for ~7.5% of products from delivered orders
 */
export function generateReviews(
  products: ProductRecord[],
  orders: OrderRecord[],
  orderItems: OrderItemRecord[]
): ReviewRecord[] {
  // Initialize Faker with fixed seed for consistency
  faker.seed(SEED);

  const reviews: ReviewRecord[] = [];

  // Filter only delivered orders
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  
  if (deliveredOrders.length === 0) {
    return reviews; // No delivered orders, no reviews
  }

  // Create a map of order_id to order for quick lookup
  const orderMap = new Map(deliveredOrders.map(o => [o.order_id, o]));

  // Create a map of order_id to its items
  const orderItemsMap = new Map<number, OrderItemRecord[]>();
  orderItems.forEach(item => {
    if (!orderItemsMap.has(item.order_id)) {
      orderItemsMap.set(item.order_id, []);
    }
    orderItemsMap.get(item.order_id)!.push(item);
  });

  // Select 5-10% of products to receive reviews (use 7.5% as midpoint)
  const reviewPercentage = 0.075;
  const numProductsToReview = Math.floor(products.length * reviewPercentage);
  
  // Randomly select products to review
  const productsToReview = faker.helpers.shuffle([...products]).slice(0, numProductsToReview);

  let reviewId = 1;

  productsToReview.forEach(product => {
    // Find delivered orders that contain this product
    const eligibleOrders = deliveredOrders.filter(order => {
      const items = orderItemsMap.get(order.order_id) || [];
      return items.some(item => item.product_id === product.product_id);
    });

    if (eligibleOrders.length === 0) {
      return; // No delivered orders for this product
    }

    // Select a random delivered order for this product
    const selectedOrder = faker.helpers.arrayElement(eligibleOrders);

    // Get the customer from the order
    const customer_id = selectedOrder.customer_id;

    // Generate rating with normal distribution (more 4-5 stars)
    // Using weighted selection: 40% for 5, 30% for 4, 15% for 3, 10% for 2, 5% for 1
    const rating = faker.helpers.weightedArrayElement([
      { weight: 5, value: 1 },
      { weight: 10, value: 2 },
      { weight: 15, value: 3 },
      { weight: 30, value: 4 },
      { weight: 40, value: 5 }
    ]);

    // Generate comment with 80% non-null rate
    let comment: string | null = null;
    if (faker.number.float({ min: 0, max: 1 }) > 0.20) {
      comment = faker.lorem.sentence({ min: 5, max: 20 });
    }

    // Generate review_date between delivered_date and DATE_RANGE.end
    const deliveredDate = new Date(selectedOrder.delivered_date!);
    
    // Ensure delivered date is not after DATE_RANGE.end
    if (deliveredDate.getTime() > DATE_RANGE.end.getTime()) {
      return; // Skip this review if delivered date is after range
    }
    
    const review_date = faker.date.between({
      from: deliveredDate,
      to: DATE_RANGE.end
    });

    reviews.push({
      review_id: reviewId++,
      product_id: product.product_id,
      customer_id: customer_id,
      rating: rating,
      comment: comment,
      review_date: formatDateUSA(review_date)
    });
  });

  return reviews;
}
