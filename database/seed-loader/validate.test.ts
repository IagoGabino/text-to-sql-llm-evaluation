/**
 * Tests for Task 6 - Checksum Validator
 * 
 * These tests verify the CSV data validator functionality including
 * manifest loading, checksum calculation, validation logic, and reporting.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ManifestData,
  ValidationError,
  ValidationResult,
  calculateSHA256,
  parseArguments,
  loadManifest,
  validateChecksums
} from './validate';

describe('Task 6 - Checksum Validator', () => {
  const testDir = path.join(__dirname, '../seed-data/generated/test-validator');
  const manifestPath = path.join(testDir, 'manifest.json');

  beforeAll(() => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Task 6.1 - Command-line Interface', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should parse --preset argument', () => {
      process.argv = ['node', 'validate.ts', '--preset', 'small'];
      const config = parseArguments();
      
      expect(config.preset).toBe('small');
      expect(config.manifestPath).toContain('small');
      expect(config.dataDir).toContain('small');
    });

    it('should validate preset values', () => {
      process.argv = ['node', 'validate.ts', '--preset', 'invalid'];
      
      expect(() => parseArguments()).toThrow('Invalid preset');
    });

    it('should require --preset argument', () => {
      process.argv = ['node', 'validate.ts'];
      
      expect(() => parseArguments()).toThrow('Missing --preset argument');
    });

    it('should accept all valid presets', () => {
      const validPresets = ['small', 'medium', 'large', 'xlarge'];
      
      for (const preset of validPresets) {
        process.argv = ['node', 'validate.ts', '--preset', preset];
        const config = parseArguments();
        expect(config.preset).toBe(preset);
      }
    });
  });

  describe('Task 6.2 - Manifest Loading', () => {
    it('should load and parse valid manifest.json', () => {
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 100,
        distribution: {
          categories: 50,
          products: 50
        },
        checksums: {
          'test.csv': 'sha256:abc123'
        }
      };

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      const loaded = loadManifest(manifestPath);

      expect(loaded.preset).toBe('test');
      expect(loaded.seed).toBe(42);
      expect(loaded.checksums['test.csv']).toBe('sha256:abc123');
    });

    it('should throw error if manifest file not found', () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.json');
      
      expect(() => loadManifest(nonExistentPath)).toThrow('Manifest not found');
    });

    it('should throw error for invalid JSON', () => {
      const invalidJsonPath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(invalidJsonPath, '{ invalid json }', 'utf8');
      
      expect(() => loadManifest(invalidJsonPath)).toThrow('Invalid JSON');
    });

    it('should validate manifest structure', () => {
      const invalidManifest = {
        // Missing required fields
        seed: 42
      };

      const invalidPath = path.join(testDir, 'invalid-structure.json');
      fs.writeFileSync(invalidPath, JSON.stringify(invalidManifest), 'utf8');
      
      expect(() => loadManifest(invalidPath)).toThrow('Invalid manifest structure');
    });

    it('should parse all required manifest fields', () => {
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: '2025-11-04T00:00:00.000Z',
        total_records: 1000,
        distribution: {
          categories: 50,
          suppliers: 100,
          products: 500,
          customers: 350
        },
        checksums: {
          'categories.csv': 'sha256:abc',
          'suppliers.csv': 'sha256:def',
          'products.csv': 'sha256:ghi'
        }
      };

      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      const loaded = loadManifest(manifestPath);

      expect(loaded.preset).toBe('test');
      expect(loaded.seed).toBe(42);
      expect(loaded.generated_at).toBe('2025-11-04T00:00:00.000Z');
      expect(loaded.total_records).toBe(1000);
      expect(Object.keys(loaded.distribution)).toHaveLength(4);
      expect(Object.keys(loaded.checksums)).toHaveLength(3);
    });
  });

  describe('Task 6.3 - Checksum Validation Logic', () => {
    beforeEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      fs.mkdirSync(testDir, { recursive: true });
    });

    it('should calculate SHA-256 checksum correctly', async () => {
      const testFile = path.join(testDir, 'test.csv');
      const content = 'id,name\n1,test\n';
      fs.writeFileSync(testFile, content, 'utf8');

      const checksum = await calculateSHA256(testFile);

      expect(checksum).toHaveLength(64);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce consistent checksums', async () => {
      const testFile = path.join(testDir, 'consistent.csv');
      const content = 'id,name\n1,test\n2,demo\n';
      fs.writeFileSync(testFile, content, 'utf8');

      const checksum1 = await calculateSHA256(testFile);
      const checksum2 = await calculateSHA256(testFile);

      expect(checksum1).toBe(checksum2);
    });

    it('should validate all checksums match', async () => {
      // Create test files
      const file1 = path.join(testDir, 'file1.csv');
      const file2 = path.join(testDir, 'file2.csv');
      fs.writeFileSync(file1, 'id,name\n1,test\n', 'utf8');
      fs.writeFileSync(file2, 'id,value\n1,100\n', 'utf8');

      // Calculate checksums
      const hash1 = await calculateSHA256(file1);
      const hash2 = await calculateSHA256(file2);

      // Create manifest
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 2,
        distribution: {},
        checksums: {
          'file1.csv': `sha256:${hash1}`,
          'file2.csv': `sha256:${hash2}`
        }
      };

      const result = await validateChecksums(manifest, testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect checksum mismatches', async () => {
      // Create test file
      const testFile = path.join(testDir, 'test.csv');
      fs.writeFileSync(testFile, 'id,name\n1,test\n', 'utf8');

      // Create manifest with wrong checksum
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 1,
        distribution: {},
        checksums: {
          'test.csv': 'sha256:wrongchecksumvalue1234567890abcdef1234567890abcdef1234567890ab'
        }
      };

      const result = await validateChecksums(manifest, testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('test.csv');
      expect(result.errors[0].message).toContain('Checksum mismatch');
    });

    it('should detect missing files', async () => {
      // Create manifest referencing non-existent file
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 0,
        distribution: {},
        checksums: {
          'nonexistent.csv': 'sha256:abc123'
        }
      };

      const result = await validateChecksums(manifest, testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('nonexistent.csv');
      expect(result.errors[0].actual).toBe('FILE_NOT_FOUND');
    });

    it('should collect multiple errors', async () => {
      // Create one valid file
      const validFile = path.join(testDir, 'valid.csv');
      fs.writeFileSync(validFile, 'id\n1\n', 'utf8');
      const validHash = await calculateSHA256(validFile);

      // Create one invalid file
      const invalidFile = path.join(testDir, 'invalid.csv');
      fs.writeFileSync(invalidFile, 'id\n2\n', 'utf8');

      // Create manifest
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 2,
        distribution: {},
        checksums: {
          'valid.csv': `sha256:${validHash}`,
          'invalid.csv': 'sha256:wronghash1234567890abcdef1234567890abcdef1234567890abcdef12',
          'missing.csv': 'sha256:anotherwronghash1234567890abcdef1234567890abcdef1234567890ab'
        }
      };

      const result = await validateChecksums(manifest, testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      
      const errorFiles = result.errors.map(e => e.file);
      expect(errorFiles).toContain('invalid.csv');
      expect(errorFiles).toContain('missing.csv');
      expect(errorFiles).not.toContain('valid.csv');
    });
  });

  describe('Task 6.4 - Validation Reporting', () => {
    it('should return valid result when all checksums match', async () => {
      const testFile = path.join(testDir, 'report-test.csv');
      fs.writeFileSync(testFile, 'id\n1\n', 'utf8');
      const hash = await calculateSHA256(testFile);

      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 1,
        distribution: {},
        checksums: {
          'report-test.csv': `sha256:${hash}`
        }
      };

      const result = await validateChecksums(manifest, testDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.manifest).toEqual(manifest);
    });

    it('should return invalid result with errors array', async () => {
      const manifest: ManifestData = {
        preset: 'test',
        seed: 42,
        generated_at: new Date().toISOString(),
        total_records: 0,
        distribution: {},
        checksums: {
          'missing1.csv': 'sha256:hash1',
          'missing2.csv': 'sha256:hash2'
        }
      };

      const result = await validateChecksums(manifest, testDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      
      for (const error of result.errors) {
        expect(error).toHaveProperty('file');
        expect(error).toHaveProperty('expected');
        expect(error).toHaveProperty('actual');
        expect(error).toHaveProperty('message');
      }
    });
  });

  describe('Integration - Real Preset Validation', () => {
    it('should validate small preset if it exists', async () => {
      const smallDir = path.join(__dirname, '../seed-data/generated/small');
      const smallManifest = path.join(smallDir, 'manifest.json');

      if (fs.existsSync(smallManifest)) {
        const manifest = loadManifest(smallManifest);
        const result = await validateChecksums(manifest, smallDir);

        // If small preset was generated correctly, it should be valid
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      } else {
        // Test is skipped if preset doesn't exist
        expect(true).toBe(true);
      }
    });
  });
});
