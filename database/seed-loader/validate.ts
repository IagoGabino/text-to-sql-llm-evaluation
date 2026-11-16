#!/usr/bin/env node
/**
 * CSV Data Validator - Checksum Verification
 * 
 * Command-line tool for validating CSV files against their manifest checksums.
 * Ensures data integrity before loading into the database.
 * 
 * Usage:
 *   npm run validate -- --preset small
 *   npm run validate -- --preset medium
 *   npm run validate -- --preset large
 *   npm run validate -- --preset xlarge
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Manifest data structure
 */
interface ManifestData {
  preset: string;
  seed: number;
  generated_at: string;
  total_records: number;
  distribution: Record<string, number>;
  checksums: Record<string, string>;
}

/**
 * Validation error for checksum mismatches
 */
interface ValidationError {
  file: string;
  expected: string;
  actual: string;
  message: string;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  manifest: ManifestData;
}

/**
 * Configuration for validation
 */
interface ValidatorConfig {
  preset: string;
  manifestPath: string;
  dataDir: string;
}

/**
 * Calculate SHA-256 checksum of a file
 * 
 * @param filePath - Path to the file
 * @returns Hex-encoded SHA-256 hash
 */
async function calculateSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
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

/**
 * Parse command-line arguments
 * 
 * @returns Configuration object
 */
function parseArguments(): ValidatorConfig {
  const args = process.argv.slice(2);

  // Find --preset argument
  const presetIndex = args.indexOf('--preset');
  
  if (presetIndex === -1 || presetIndex === args.length - 1) {
    throw new Error('Missing --preset argument');
  }

  const preset = args[presetIndex + 1];

  // Validate preset
  if (!['small', 'medium', 'large', 'xlarge'].includes(preset)) {
    throw new Error(`Invalid preset: ${preset}. Must be one of: small, medium, large, xlarge`);
  }

  const dataDir = path.join(__dirname, `../seed-data/generated/${preset}`);
  const manifestPath = path.join(dataDir, 'manifest.json');

  return {
    preset,
    manifestPath,
    dataDir
  };
}

/**
 * Display usage help
 */
function displayHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                    CSV Data Validator - Checksum Verification            ║
╚══════════════════════════════════════════════════════════════════════════╝

USAGE:
  npm run validate -- --preset <preset_name>

PRESETS:
  small      ~10,000 total records
  medium     ~50,000 total records
  large     ~100,000 total records
  xlarge    ~500,000 total records

EXAMPLES:
  npm run validate -- --preset small
  npm run validate -- --preset medium

DESCRIPTION:
  Validates CSV files against manifest checksums to ensure data integrity
  before loading into the database. Exits with code 0 if valid, 1 if invalid.
`);
}

/**
 * Load and parse manifest.json
 * 
 * @param manifestPath - Path to manifest.json
 * @returns Parsed manifest data
 */
function loadManifest(manifestPath: string): ManifestData {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, 'utf8');
  
  try {
    const manifest = JSON.parse(content) as ManifestData;
    
    // Validate structure
    if (!manifest.preset || !manifest.seed || !manifest.checksums) {
      throw new Error('Invalid manifest structure: missing required fields');
    }
    
    return manifest;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in manifest: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate checksums for all CSV files
 * 
 * @param manifest - Manifest data
 * @param dataDir - Directory containing CSV files
 * @returns Validation result
 */
async function validateChecksums(
  manifest: ManifestData,
  dataDir: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  console.log('🔍 Validating checksums...\n');

  for (const [filename, expectedChecksum] of Object.entries(manifest.checksums)) {
    const filePath = path.join(dataDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      errors.push({
        file: filename,
        expected: expectedChecksum,
        actual: 'FILE_NOT_FOUND',
        message: `File not found: ${filename}`
      });
      console.log(`   ✗ ${filename}: FILE NOT FOUND`);
      continue;
    }

    try {
      // Calculate actual checksum
      const actualHash = await calculateSHA256(filePath);
      const actualChecksum = `sha256:${actualHash}`;

      // Compare checksums
      if (actualChecksum === expectedChecksum) {
        console.log(`   ✓ ${filename}: ${actualHash.substring(0, 16)}...`);
      } else {
        errors.push({
          file: filename,
          expected: expectedChecksum,
          actual: actualChecksum,
          message: `Checksum mismatch for ${filename}`
        });
        console.log(`   ✗ ${filename}: CHECKSUM MISMATCH`);
      }
    } catch (error) {
      errors.push({
        file: filename,
        expected: expectedChecksum,
        actual: 'ERROR',
        message: error instanceof Error ? error.message : String(error)
      });
      console.log(`   ✗ ${filename}: ERROR`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    manifest
  };
}

/**
 * Display validation results
 * 
 * @param result - Validation result
 */
function displayResults(result: ValidationResult): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');

  if (result.valid) {
    console.log('✅ VALIDATION PASSED');
    console.log('');
    console.log('All checksums match! Data integrity verified.');
    console.log('');
    console.log(`Preset: ${result.manifest.preset}`);
    console.log(`Total Records: ${result.manifest.total_records.toLocaleString()}`);
    console.log(`Generated: ${result.manifest.generated_at}`);
    console.log('');
    console.log('✓ Data is ready to be loaded into the database');
  } else {
    console.log('❌ VALIDATION FAILED');
    console.log('');
    console.log(`Found ${result.errors.length} error(s):\n`);
    
    for (const error of result.errors) {
      console.log(`File: ${error.file}`);
      console.log(`  Expected: ${error.expected}`);
      console.log(`  Actual:   ${error.actual}`);
      console.log(`  Message:  ${error.message}`);
      console.log('');
    }
    
    console.log('⚠️  Data integrity check failed. Do not load this data into the database.');
    console.log('   Please regenerate the dataset or investigate file corruption.');
  }
  
  console.log('═══════════════════════════════════════════════════════════════════════════');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    // Parse arguments
    const config = parseArguments();

    console.log('╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    CSV Data Validator - Checksum Verification            ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Preset: ${config.preset}`);
    console.log(`Data Directory: ${config.dataDir}`);
    console.log('');

    // Task 6.2: Load manifest
    console.log('📋 Loading manifest...');
    const manifest = loadManifest(config.manifestPath);
    console.log(`   ✓ Loaded manifest.json`);
    console.log(`   Files to validate: ${Object.keys(manifest.checksums).length}`);
    console.log('');

    // Task 6.3: Validate checksums
    const result = await validateChecksums(manifest, config.dataDir);

    // Task 6.4: Display results and exit with appropriate code
    displayResults(result);

    process.exit(result.valid ? 0 : 1);

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

export {
  ManifestData,
  ValidationError,
  ValidationResult,
  ValidatorConfig,
  calculateSHA256,
  parseArguments,
  loadManifest,
  validateChecksums,
  displayResults
};
