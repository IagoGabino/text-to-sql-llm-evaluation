/**
 * Fixed Data Constants for Deterministic Database Seeding
 * 
 * All constants defined here are immutable and used across all preset generations
 * to ensure reproducibility and consistency of test data.
 */

// ============================================================================
// SEED CONFIGURATION
// ============================================================================

export const SEED = 42;

// ============================================================================
// FIXED CATEGORIES (50 total)
// ============================================================================

export const CATEGORIES = [
  // Electronics (10)
  { name: 'smartphones', description: 'Mobile phones with advanced features and connectivity' },
  { name: 'tablets', description: 'Portable touchscreen computing devices' },
  { name: 'laptops', description: 'Portable personal computers for work and entertainment' },
  { name: 'desktops', description: 'Stationary personal computers with high performance' },
  { name: 'monitors', description: 'Display screens for computers and gaming' },
  { name: 'keyboards', description: 'Input devices for typing and gaming' },
  { name: 'mice', description: 'Pointing devices for computer navigation' },
  { name: 'headphones', description: 'Audio devices for music and communication' },
  { name: 'speakers', description: 'Audio output devices for entertainment systems' },
  { name: 'webcams', description: 'Video cameras for online communication' },

  // Home & Kitchen (8)
  { name: 'refrigerators', description: 'Appliances for food preservation and cooling' },
  { name: 'microwaves', description: 'Kitchen appliances for quick heating and cooking' },
  { name: 'coffee-makers', description: 'Appliances for brewing coffee and espresso' },
  { name: 'blenders', description: 'Kitchen devices for mixing and pureeing ingredients' },
  { name: 'vacuum-cleaners', description: 'Cleaning appliances for floors and surfaces' },
  { name: 'air-conditioners', description: 'Climate control systems for cooling spaces' },
  { name: 'fans', description: 'Devices for air circulation and cooling' },
  { name: 'heaters', description: 'Appliances for warming indoor spaces' },

  // Clothing (10)
  { name: 'mens-shirts', description: 'Casual and formal shirts for men' },
  { name: 'mens-pants', description: 'Trousers and jeans for men' },
  { name: 'mens-shoes', description: 'Footwear for men including sneakers and dress shoes' },
  { name: 'mens-jackets', description: 'Outerwear and coats for men' },
  { name: 'mens-accessories', description: 'Belts, ties, wallets and other accessories for men' },
  { name: 'womens-dresses', description: 'Dresses and gowns for women' },
  { name: 'womens-shoes', description: 'Footwear for women including heels and flats' },
  { name: 'womens-accessories', description: 'Handbags, jewelry and accessories for women' },
  { name: 'kids-clothing', description: 'Apparel for children of all ages' },
  { name: 'sportswear', description: 'Athletic clothing and activewear' },

  // Foods & Beverages (6)
  { name: 'packaged-snacks', description: 'Ready-to-eat snacks and chips' },
  { name: 'canned-goods', description: 'Preserved foods in cans and jars' },
  { name: 'beverages', description: 'Soft drinks, juices and bottled water' },
  { name: 'coffee-tea', description: 'Coffee beans, tea leaves and related products' },
  { name: 'condiments-sauces', description: 'Seasonings, sauces and flavor enhancers' },
  { name: 'breakfast-cereals', description: 'Ready-to-eat and hot breakfast cereals' },

  // Sports & Outdoors (8)
  { name: 'fitness-equipment', description: 'Exercise machines and workout gear' },
  { name: 'camping-gear', description: 'Equipment for outdoor camping and hiking' },
  { name: 'bicycles', description: 'Bikes for recreation and transportation' },
  { name: 'sports-balls', description: 'Balls for various sports and games' },
  { name: 'yoga-mats', description: 'Mats for yoga and floor exercises' },
  { name: 'running-shoes', description: 'Specialized footwear for running and jogging' },
  { name: 'swimming-gear', description: 'Swimwear and swimming accessories' },
  { name: 'sports-nutrition', description: 'Supplements and nutrition for athletes' },

  // Beauty & Personal Care (8)
  { name: 'skincare', description: 'Creams, lotions and skincare products' },
  { name: 'makeup', description: 'Cosmetics and beauty products' },
  { name: 'haircare', description: 'Shampoos, conditioners and hair styling products' },
  { name: 'perfumes', description: 'Fragrances and colognes' },
  { name: 'oral-care', description: 'Toothpaste, mouthwash and dental hygiene products' },
  { name: 'shaving-supplies', description: 'Razors, shaving cream and grooming products' },
  { name: 'nail-care', description: 'Nail polish and manicure supplies' },
  { name: 'bath-products', description: 'Soaps, body wash and bathing essentials' }
];

// ============================================================================
// FIXED COUNTRIES (20 total) WITH WEIGHTED DISTRIBUTION
// ============================================================================

export const COUNTRIES = [
  // High volume (30% total) - 4 countries
  { name: 'United States', weight: 0.12 },      // 12%
  { name: 'United Kingdom', weight: 0.08 },     // 8%
  { name: 'Germany', weight: 0.06 },            // 6%
  { name: 'Brazil', weight: 0.04 },             // 4%

  // Medium volume (50% total) - 7 countries
  { name: 'Canada', weight: 0.08 },             // 8%
  { name: 'France', weight: 0.08 },             // 8%
  { name: 'Spain', weight: 0.07 },              // 7%
  { name: 'Japan', weight: 0.07 },              // 7%
  { name: 'Australia', weight: 0.07 },          // 7%
  { name: 'Mexico', weight: 0.07 },             // 7%
  { name: 'Italy', weight: 0.06 },              // 6%

  // Low volume (20% total) - 9 countries
  { name: 'Netherlands', weight: 0.03 },        // 3%
  { name: 'Poland', weight: 0.03 },             // 3%
  { name: 'Sweden', weight: 0.02 },             // 2%
  { name: 'South Korea', weight: 0.02 },        // 2%
  { name: 'India', weight: 0.02 },              // 2%
  { name: 'Argentina', weight: 0.02 },          // 2%
  { name: 'Colombia', weight: 0.02 },           // 2%
  { name: 'South Africa', weight: 0.01 },       // 1%
  { name: 'Turkey', weight: 0.01 }              // 1%
];

// ============================================================================
// ORDER STATUSES WITH REALISTIC DISTRIBUTION
// ============================================================================

export const ORDER_STATUSES = [
  { value: 'delivered', weight: 0.50 },         // 50%
  { value: 'shipped', weight: 0.20 },           // 20%
  { value: 'processing', weight: 0.15 },        // 15%
  { value: 'pending', weight: 0.10 },           // 10%
  { value: 'cancelled', weight: 0.05 }          // 5%
];

// ============================================================================
// PAYMENT METHODS WITH GLOBAL DISTRIBUTION
// ============================================================================

export const PAYMENT_METHODS = [
  { value: 'credit_card', weight: 0.45 },       // 45%
  { value: 'debit_card', weight: 0.25 },        // 25%
  { value: 'paypal', weight: 0.15 },            // 15%
  { value: 'bank_transfer', weight: 0.08 },     // 8%
  { value: 'cash_on_delivery', weight: 0.05 },  // 5%
  { value: 'digital_wallet', weight: 0.02 }     // 2%
];

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const PRESETS = {
  small: {
    name: 'small',
    totalRecords: 10000,
    distribution: {
      categories: 50,          // Fixed (0.5%)
      suppliers: 100,          // 1%
      products: 2000,          // 20%
      customers: 3000,         // 30%
      orders: 4000,            // 40%
      order_items: 6000,       // 60% (avg 1.5 items/order)
      reviews: 250             // 2.5%
    }
  },
  medium: {
    name: 'medium',
    totalRecords: 50000,
    distribution: {
      categories: 50,          // Fixed (0.1%)
      suppliers: 200,          // 0.4%
      products: 10000,         // 20%
      customers: 15000,        // 30%
      orders: 20000,           // 40%
      order_items: 35000,      // 70% (avg 1.75 items/order)
      reviews: 1250            // 2.5%
    }
  },
  large: {
    name: 'large',
    totalRecords: 100000,
    distribution: {
      categories: 50,          // Fixed (0.05%)
      suppliers: 500,          // 0.5%
      products: 20000,         // 20%
      customers: 30000,        // 30%
      orders: 40000,           // 40%
      order_items: 80000,      // 80% (avg 2 items/order)
      reviews: 1450            // 1.45%
    }
  },
  xlarge: {
    name: 'xlarge',
    totalRecords: 500000,
    distribution: {
      categories: 50,          // Fixed (0.01%)
      suppliers: 2000,         // 0.4%
      products: 100000,        // 20%
      customers: 150000,       // 30%
      orders: 200000,          // 40%
      order_items: 420000,     // 84% (avg 2.1 items/order)
      reviews: 7950            // 1.59%
    }
  }
};

// ============================================================================
// DATE RANGE CONFIGURATION
// ============================================================================

export const DATE_RANGE = {
  start: new Date('2023-11-03'),
  end: new Date('2025-11-03')
};

// ============================================================================
// NULL RATE CONFIGURATION (for optional fields)
// ============================================================================

export const NULL_RATES = {
  phone: 0.20,           // 20% of customers have no phone
  description: 0.15,     // 15% of products have no description
  address: 0.10          // 10% of customers have no address
};
