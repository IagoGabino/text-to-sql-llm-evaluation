import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { database } from '../config/database';

/**
 * Script to generate expected results for test suite questions
 * 
 * This script:
 * 1. Reads test-suite.json
 * 2. Connects to the database
 * 3. Iterates over all questions
 * 
 * Usage:
 *   npm run generate:expected-results -- --preset <small|medium|large|xlarge> [--force]
 */

interface Question {
  id: number;
  question: string;
  complexity: string;
  category: string;
  expectedSQL: string;
  description: string;
  expectedResults?: {
    rowCount: number;
    columns: string[];
    rows: any[];
  };
}

interface TestSuite {
  seedPreset?: string;
  generatedAt?: string;
  questions: Question[];
}

interface QueryExecutionResult {
  success: boolean;
  rowCount: number;
  columns: string[];
  rows: any[];
  error?: string;
}

/**
 * Execute a SQL query and capture results with metadata
 */
async function executeQueryAndCaptureResults(sql: string, questionId: number): Promise<QueryExecutionResult> {
  try {
    const pool = database.getPool();
    const result = await pool.query(sql);
    
    // Extract column names from the result
    const columns = result.fields.map(field => field.name);
    
    return {
      success: true,
      rowCount: result.rowCount || 0,
      columns,
      rows: result.rows,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ Error executing query for question #${questionId}:`, errorMessage);
    
    return {
      success: false,
      rowCount: 0,
      columns: [],
      rows: [],
      error: errorMessage,
    };
  }
}

/**
 * Main function to generate expected results
 */
async function generateExpectedResults(): Promise<void> {
  console.log('🚀 Starting expected results generation...\n');

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const presetIndex = args.indexOf('--preset');
    const forceFlag = args.includes('--force');
    
    // Determine seed preset: CLI argument > ENV variable > default 'large'
    let seedPreset: string;
    if (presetIndex !== -1 && args[presetIndex + 1]) {
      seedPreset = args[presetIndex + 1];
    } else if (process.env.SEED_PRESET) {
      seedPreset = process.env.SEED_PRESET;
      console.log(`ℹ️  Using SEED_PRESET from environment variable`);
    } else {
      seedPreset = 'large';
      console.log(`ℹ️  Using default preset: large`);
    }

    const validPresets = ['small', 'medium', 'large', 'xlarge'];
    
    if (!validPresets.includes(seedPreset)) {
      console.error(`❌ Error: Invalid preset '${seedPreset}'`);
      console.log(`Valid presets: ${validPresets.join(', ')}`);
      process.exit(1);
    }

    console.log(`📋 Configuration:`);
    console.log(`   Seed Preset: ${seedPreset}`);
    console.log(`   Force Regeneration: ${forceFlag ? 'Yes' : 'No'}\n`);

    // Read test-suite.json
    const testSuitePath = join(__dirname, '../../tests/test-suite.json');
    console.log(`📖 Reading test suite from: ${testSuitePath}`);
    
    const testSuiteContent = readFileSync(testSuitePath, 'utf-8');
    const testSuite: TestSuite = JSON.parse(testSuiteContent);
    
    console.log(`   Found ${testSuite.questions.length} questions\n`);

    // Validate existing results
    console.log('🔍 Checking for existing results...');
    
    const questionsWithResults = testSuite.questions.filter(q => q.expectedResults).length;
    const hasExistingResults = questionsWithResults > 0;
    
    if (hasExistingResults) {
      console.log(`   ℹ️  Found existing results for ${questionsWithResults}/${testSuite.questions.length} questions`);
      
      if (testSuite.seedPreset) {
        console.log(`   ℹ️  Current seed preset: ${testSuite.seedPreset}`);
        console.log(`   ℹ️  Generated at: ${testSuite.generatedAt || 'unknown'}`);
      }
      
      // Check if preset is different
      if (testSuite.seedPreset && testSuite.seedPreset !== seedPreset) {
        console.warn(`\n⚠️  WARNING: Seed preset mismatch detected!`);
        console.warn(`   Existing preset: ${testSuite.seedPreset}`);
        console.warn(`   Requested preset: ${seedPreset}`);
        console.warn(`   Generated at: ${testSuite.generatedAt || 'unknown'}`);
        
        if (!forceFlag) {
          console.warn(`\n❌ Cannot regenerate with different preset without --force flag`);
          console.warn(`   Use --force to override and regenerate expected results\n`);
          process.exit(1);
        } else {
          console.warn(`\n✅ --force flag detected: Will regenerate with new preset '${seedPreset}'\n`);
        }
      } else if (testSuite.seedPreset === seedPreset) {
        // Same preset - warn about regeneration
        if (!forceFlag) {
          console.warn(`\n⚠️  Expected results already exist for preset '${seedPreset}'`);
          console.warn(`   Use --force flag to regenerate\n`);
          process.exit(1);
        } else {
          console.log(`\n✅ --force flag detected: Will regenerate results\n`);
        }
      }
    } else {
      console.log(`   ✅ No existing results found - will generate fresh\n`);
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    await database.connect();
    console.log('✅ Database connected\n');

    // Iterate over questions
    console.log('🔄 Processing questions...\n');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < testSuite.questions.length; i++) {
      const question = testSuite.questions[i];
      console.log(`[${i + 1}/${testSuite.questions.length}] Question #${question.id}: ${question.question}`);
      console.log(`   SQL: ${question.expectedSQL.substring(0, 80)}${question.expectedSQL.length > 80 ? '...' : ''}`);
      
      // Execute the reference query and capture results
      const result = await executeQueryAndCaptureResults(question.expectedSQL, question.id);
      
      if (result.success) {
        console.log(`   ✅ Executed successfully - ${result.rowCount} rows, ${result.columns.length} columns`);
        console.log(`   📊 Columns: ${result.columns.join(', ')}`);
        
        // Store results in the question object (will be saved in task 17.4)
        question.expectedResults = {
          rowCount: result.rowCount,
          columns: result.columns,
          rows: result.rows,
        };
        
        successCount++;
      } else {
        console.log(`   ❌ Execution failed: ${result.error}`);
        failureCount++;
      }
      
      console.log('');
    }

    console.log('✅ Processing complete!');
    console.log(`   Success: ${successCount}/${testSuite.questions.length}`);
    console.log(`   Failures: ${failureCount}/${testSuite.questions.length}`);
    
    if (failureCount > 0) {
      console.warn('\n⚠️  Some queries failed to execute. Review errors above.');
    }
    
    // Add seed information to the test suite
    console.log('\n📝 Adding seed information...');
    testSuite.seedPreset = seedPreset;
    testSuite.generatedAt = new Date().toISOString();
    
    console.log(`   ✅ Seed preset: ${testSuite.seedPreset}`);
    console.log(`   ✅ Generated at: ${testSuite.generatedAt}`);
    
    // Write updated test-suite.json
    console.log('\n� Writing updated test-suite.json...');
    
    // Only proceed if we have successful executions
    if (successCount > 0) {
      const updatedContent = JSON.stringify(testSuite, null, 2);
      writeFileSync(testSuitePath, updatedContent, 'utf-8');
      
      console.log(`   ✅ File updated successfully`);
      console.log(`   📊 ${successCount} questions with expected results`);
      console.log(`   📍 Location: ${testSuitePath}`);
    } else {
      console.warn('   ⚠️  No successful executions - file not updated');
    }
    
    console.log('\n✨ Generation complete!');

  } catch (error) {
    console.error('❌ Error during generation:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await database.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Execute if run directly
if (require.main === module) {
  generateExpectedResults()
    .then(() => {
      console.log('\n✨ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { generateExpectedResults };
