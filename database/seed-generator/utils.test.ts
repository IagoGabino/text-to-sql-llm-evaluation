/**
 * Unit Tests for Utility Functions
 */

import { faker } from '@faker-js/faker';
import { formatDateUSA, selectWeighted, writeCSV, calculateSHA256 } from './utils';
import { SEED } from './constants';
import * as fs from 'fs';
import * as path from 'path';


// Test directory for CSV files
const TEST_DIR = path.join(__dirname, 'test-output');

describe('formatDateUSA', () => {
  it('should format dates as YYYY-MM-DD (ISO 8601)', () => {
    const date = new Date('2025-11-03');
    expect(formatDateUSA(date)).toBe('2025-11-03');
  });

  it('should handle single-digit months correctly', () => {
    const date = new Date('2025-01-15');
    expect(formatDateUSA(date)).toBe('2025-01-15');
  });

  it('should handle single-digit days correctly', () => {
    const date = new Date('2025-12-05');
    expect(formatDateUSA(date)).toBe('2025-12-05');
  });

  it('should handle leap year dates', () => {
    const date = new Date('2024-02-29');
    expect(formatDateUSA(date)).toBe('2024-02-29');
  });

  it('should handle year 2023 correctly', () => {
    const date = new Date('2023-11-03');
    expect(formatDateUSA(date)).toBe('2023-11-03');
  });

  it('should handle last day of month', () => {
    const date = new Date('2025-01-31');
    expect(formatDateUSA(date)).toBe('2025-01-31');
  });

  it('should handle December dates', () => {
    const date = new Date('2024-12-31');
    expect(formatDateUSA(date)).toBe('2024-12-31');
  });

  it('should handle February in non-leap year', () => {
    const date = new Date('2025-02-28');
    expect(formatDateUSA(date)).toBe('2025-02-28');
  });

  it('should handle mid-year dates', () => {
    const date = new Date('2024-06-15');
    expect(formatDateUSA(date)).toBe('2024-06-15');
  });
});

describe('selectWeighted', () => {
  beforeEach(() => {
    faker.seed(SEED);
  });

  it('should select items based on weights', () => {
    const items = [
      { name: 'A', weight: 0.5 },
      { name: 'B', weight: 0.3 },
      { name: 'C', weight: 0.2 }
    ];

    const selected = selectWeighted(items, faker);
    expect(items).toContainEqual(selected);
  });

  it('should return the only item in single-item array', () => {
    const items = [{ name: 'Only', weight: 1.0 }];
    const selected = selectWeighted(items, faker);
    expect(selected).toEqual({ name: 'Only', weight: 1.0 });
  });

  it('should throw error for empty array', () => {
    expect(() => selectWeighted([], faker)).toThrow('Cannot select from empty array');
  });

  it('should throw error for zero total weight', () => {
    const items = [
      { name: 'A', weight: 0 },
      { name: 'B', weight: 0 }
    ];
    expect(() => selectWeighted(items, faker)).toThrow('Total weight must be greater than 0');
  });

  it('should throw error for negative weights', () => {
    const items = [
      { name: 'A', weight: -0.5 },
      { name: 'B', weight: 0.3 }
    ];
    expect(() => selectWeighted(items, faker)).toThrow('Total weight must be greater than 0');
  });

  it('should produce deterministic results with same seed', () => {
    const items = [
      { name: 'A', weight: 0.5 },
      { name: 'B', weight: 0.3 },
      { name: 'C', weight: 0.2 }
    ];

    faker.seed(SEED);
    const firstRun = [];
    for (let i = 0; i < 10; i++) {
      firstRun.push(selectWeighted(items, faker).name);
    }

    faker.seed(SEED);
    const secondRun = [];
    for (let i = 0; i < 10; i++) {
      secondRun.push(selectWeighted(items, faker).name);
    }

    expect(firstRun).toEqual(secondRun);
  });

  it('should respect weight distribution over many selections', () => {
    const items = [
      { name: 'High', weight: 0.70 },    // 70%
      { name: 'Medium', weight: 0.20 },  // 20%
      { name: 'Low', weight: 0.10 }      // 10%
    ];

    faker.seed(SEED);
    const selections: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    const totalSelections = 10000;

    for (let i = 0; i < totalSelections; i++) {
      const selected = selectWeighted(items, faker);
      selections[selected.name]++;
    }

    // Check that distributions are within 5% of expected values
    expect(selections.High / totalSelections).toBeCloseTo(0.70, 1);
    expect(selections.Medium / totalSelections).toBeCloseTo(0.20, 1);
    expect(selections.Low / totalSelections).toBeCloseTo(0.10, 1);
  });

  it('should work with weights that do not sum to 1.0', () => {
    const items = [
      { name: 'A', weight: 5 },
      { name: 'B', weight: 3 },
      { name: 'C', weight: 2 }
    ];

    faker.seed(SEED);
    const selections: Record<string, number> = { A: 0, B: 0, C: 0 };
    const totalSelections = 10000;

    for (let i = 0; i < totalSelections; i++) {
      const selected = selectWeighted(items, faker);
      selections[selected.name]++;
    }

    // Total weight is 10, so A=50%, B=30%, C=20%
    expect(selections.A / totalSelections).toBeCloseTo(0.50, 1);
    expect(selections.B / totalSelections).toBeCloseTo(0.30, 1);
    expect(selections.C / totalSelections).toBeCloseTo(0.20, 1);
  });

  it('should handle items with very small weights', () => {
    const items = [
      { name: 'Common', weight: 0.98 },
      { name: 'Rare', weight: 0.02 }
    ];

    faker.seed(SEED);
    let foundRare = false;
    let foundCommon = false;

    for (let i = 0; i < 1000; i++) {
      const selected = selectWeighted(items, faker);
      if (selected.name === 'Rare') foundRare = true;
      if (selected.name === 'Common') foundCommon = true;
    }

    expect(foundCommon).toBe(true);
    expect(foundRare).toBe(true);
  });
});

describe('writeCSV', () => {
  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should write CSV file with correct headers and data', async () => {
    const records = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 }
    ];
    const filename = path.join(TEST_DIR, 'test1.csv');

    await writeCSV(filename, records);

    expect(fs.existsSync(filename)).toBe(true);

    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines[0]).toBe('id,name,age');
    expect(lines[1]).toBe('1,Alice,30');
    expect(lines[2]).toBe('2,Bob,25');
  });

  it('should handle records with string values containing commas', async () => {
    const records = [
      { id: 1, description: 'A product, with commas' }
    ];
    const filename = path.join(TEST_DIR, 'test2.csv');

    await writeCSV(filename, records);

    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines[1]).toContain('"A product, with commas"');
  });

  it('should handle records with special characters', async () => {
    const records = [
      { id: 1, text: 'Text with "quotes"' }
    ];
    const filename = path.join(TEST_DIR, 'test3.csv');

    await writeCSV(filename, records);

    expect(fs.existsSync(filename)).toBe(true);
    const content = fs.readFileSync(filename, 'utf8');
    expect(content).toContain('Text with ""quotes""');
  });

  it('should throw error for empty records array', async () => {
    const filename = path.join(TEST_DIR, 'test4.csv');

    await expect(writeCSV(filename, [])).rejects.toThrow('Cannot write CSV with empty records array');
  });

  it('should handle large datasets efficiently', async () => {
    const records = [];
    for (let i = 1; i <= 10000; i++) {
      records.push({ id: i, name: `User${i}`, value: i * 10 });
    }
    const filename = path.join(TEST_DIR, 'test5.csv');

    await writeCSV(filename, records);

    expect(fs.existsSync(filename)).toBe(true);

    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(10001); // 1 header + 10000 data rows
    expect(lines[0]).toBe('id,name,value');
  });

  it('should throw error for invalid file path', async () => {
    const records = [{ id: 1, name: 'Test' }];
    const filename = '/nonexistent/path/that/does/not/exist/test.csv';

    await expect(writeCSV(filename, records)).rejects.toThrow();
  });

  it('should handle boolean and number types correctly', async () => {
    const records = [
      { id: 1, active: true, score: 99.5 },
      { id: 2, active: false, score: 88.2 }
    ];
    const filename = path.join(TEST_DIR, 'test6.csv');

    await writeCSV(filename, records);

    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines[1]).toBe('1,true,99.5');
    expect(lines[2]).toBe('2,false,88.2');
  });
});

describe('calculateSHA256', () => {
  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should calculate correct SHA-256 hash for known content', async () => {
    const filename = path.join(TEST_DIR, 'checksum1.txt');
    const content = 'Hello, World!';
    fs.writeFileSync(filename, content, 'utf8');

    const hash = await calculateSHA256(filename);

    // Known SHA-256 hash for "Hello, World!"
    expect(hash).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
  });

  it('should calculate different hashes for different content', async () => {
    const file1 = path.join(TEST_DIR, 'checksum2.txt');
    const file2 = path.join(TEST_DIR, 'checksum3.txt');

    fs.writeFileSync(file1, 'Content A', 'utf8');
    fs.writeFileSync(file2, 'Content B', 'utf8');

    const hash1 = await calculateSHA256(file1);
    const hash2 = await calculateSHA256(file2);

    expect(hash1).not.toBe(hash2);
  });

  it('should calculate same hash for identical content', async () => {
    const file1 = path.join(TEST_DIR, 'checksum4.txt');
    const file2 = path.join(TEST_DIR, 'checksum5.txt');

    const content = 'Identical content';
    fs.writeFileSync(file1, content, 'utf8');
    fs.writeFileSync(file2, content, 'utf8');

    const hash1 = await calculateSHA256(file1);
    const hash2 = await calculateSHA256(file2);

    expect(hash1).toBe(hash2);
  });

  it('should throw error for non-existent file', async () => {
    const filename = path.join(TEST_DIR, 'nonexistent.txt');

    await expect(calculateSHA256(filename)).rejects.toThrow('File not found');
  });

  it('should handle empty files', async () => {
    const filename = path.join(TEST_DIR, 'empty.txt');
    fs.writeFileSync(filename, '', 'utf8');

    const hash = await calculateSHA256(filename);

    // SHA-256 hash of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('should handle large files efficiently', async () => {
    const filename = path.join(TEST_DIR, 'large.txt');
    const largeContent = 'x'.repeat(1000000); // 1MB of 'x'
    fs.writeFileSync(filename, largeContent, 'utf8');

    const hash = await calculateSHA256(filename);

    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
  });

  it('should return hex-encoded hash', async () => {
    const filename = path.join(TEST_DIR, 'hex.txt');
    fs.writeFileSync(filename, 'Test content', 'utf8');

    const hash = await calculateSHA256(filename);

    // Check it's a valid hex string (64 characters, only 0-9 and a-f)
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle CSV files correctly', async () => {
    const filename = path.join(TEST_DIR, 'test.csv');
    const csvContent = 'id,name,value\n1,Alice,100\n2,Bob,200\n';
    fs.writeFileSync(filename, csvContent, 'utf8');

    const hash = await calculateSHA256(filename);

    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);

    // Recalculate to verify consistency
    const hash2 = await calculateSHA256(filename);
    expect(hash).toBe(hash2);
  });
});
