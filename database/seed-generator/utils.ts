/**
 * Utility Functions for Deterministic Database Seeding
 * 
 * This module contains helper functions used across the seed generation process.
 */

import { Faker } from '@faker-js/faker';
import { createObjectCsvWriter } from 'csv-writer';
import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Formats a Date object to PostgreSQL-compatible ISO date format (YYYY-MM-DD)
 * 
 * This format is PostgreSQL's native date format and works regardless of datestyle settings.
 * It's unambiguous, internationally recognized (ISO 8601), and sorts correctly as text.
 * 
 * @param date - The date to format
 * @returns The formatted date string in YYYY-MM-DD format
 * 
 * @example
 * const date = new Date('2025-11-03');
 * formatDateUSA(date); // Returns "2025-11-03"
 */
export function formatDateUSA(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Selects a random item from an array based on weighted probabilities
 * 
 * Uses a seeded Faker instance to ensure deterministic selection. The weights
 * should sum to 1.0 (100%), but the function will normalize them if they don't.
 * 
 * @param items - Array of items with weight property
 * @param faker - Seeded Faker instance for deterministic randomness
 * @returns The selected item
 * 
 * @example
 * const countries = [
 *   { name: 'USA', weight: 0.5 },
 *   { name: 'UK', weight: 0.3 },
 *   { name: 'Brazil', weight: 0.2 }
 * ];
 * const selected = selectWeighted(countries, faker);
 * // Returns one of the countries with probability proportional to weight
 */
export function selectWeighted<T extends { weight: number }>(
  items: T[],
  faker: Faker
): T {
  if (items.length === 0) {
    throw new Error('Cannot select from empty array');
  }

  if (items.length === 1) {
    return items[0];
  }

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    throw new Error('Total weight must be greater than 0');
  }

  // Generate random number between 0 and totalWeight
  const random = faker.number.float({ min: 0, max: totalWeight });

  // Select item based on cumulative weights
  let cumulativeWeight = 0;
  for (const item of items) {
    cumulativeWeight += item.weight;
    if (random <= cumulativeWeight) {
      return item;
    }
  }

  // Fallback to last item (should rarely happen due to floating point precision)
  return items[items.length - 1];
}

/**
 * Writes records to a CSV file with proper formatting
 * 
 * Uses streaming CSV writer for memory efficiency with large datasets.
 * Automatically extracts headers from the first record.
 * 
 * @param filename - Path to the CSV file to create
 * @param records - Array of objects to write as CSV rows
 * @throws Error if file system issues occur or if records array is empty
 * 
 * @example
 * const categories = [
 *   { category_id: 1, name: 'Electronics', description: 'Tech products' },
 *   { category_id: 2, name: 'Clothing', description: 'Apparel' }
 * ];
 * await writeCSV('categories.csv', categories);
 */
export async function writeCSV(
  filename: string,
  records: Record<string, any>[]
): Promise<void> {
  if (records.length === 0) {
    throw new Error('Cannot write CSV with empty records array');
  }

  // Extract headers from first record
  const headers = Object.keys(records[0]).map(key => ({
    id: key,
    title: key
  }));

  // Create CSV writer with streaming
  const csvWriter = createObjectCsvWriter({
    path: filename,
    header: headers,
    encoding: 'utf8'
  });

  try {
    await csvWriter.writeRecords(records);
  } catch (error) {
    throw new Error(`Failed to write CSV file ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Calculates SHA-256 checksum of a file
 * 
 * Uses streaming to efficiently process large files without loading
 * entire content into memory. Returns hex-encoded hash.
 * 
 * @param filePath - Path to the file to calculate checksum for
 * @returns Hex-encoded SHA-256 hash string
 * @throws Error if file does not exist or cannot be read
 * 
 * @example
 * const hash = await calculateSHA256('categories.csv');
 * // Returns "a1b2c3d4e5f6..."
 */
export async function calculateSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => {
      hash.update(chunk);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (error) => {
      reject(new Error(`Failed to calculate checksum for ${filePath}: ${error.message}`));
    });
  });
}
