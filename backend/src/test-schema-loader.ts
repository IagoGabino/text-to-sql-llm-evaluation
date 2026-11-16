import { database } from './config/database';
import { schemaLoader } from './utils/schema-loader';

/**
 * Test script to verify schema loader functionality
 */
async function testSchemaLoader() {
  try {
    console.log('🔌 Connecting to database...');
    await database.connect();

    console.log('\n📊 Loading database schema...');
    const schema = await schemaLoader.loadSchema();

    console.log(`\n✅ Loaded ${schema.tables.length} tables`);
    schema.tables.forEach((table) => {
      console.log(`   - ${table.name} (${table.columns.length} columns, ${table.indexes.length} indexes)`);
    });

    console.log(`\n🔗 Found ${schema.relationships.length} relationships`);
    schema.relationships.forEach((rel) => {
      console.log(`   - ${rel.from}.${rel.column} → ${rel.to}`);
    });

    console.log('\n📝 Formatted schema for LLM:\n');
    console.log('─'.repeat(80));
    const formattedSchema = schemaLoader.formatSchemaForLLM(schema);
    console.log(formattedSchema);
    console.log('─'.repeat(80));

    await database.disconnect();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSchemaLoader();
