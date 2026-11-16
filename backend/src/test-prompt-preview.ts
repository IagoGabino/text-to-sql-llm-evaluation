#!/usr/bin/env node

/**
 * Prompt Preview Tool
 * 
 * Mostra o prompt completo que será enviado para a LLM dada uma pergunta
 * Útil para debug e verificar se as instruções estão corretas
 */

import { schemaLoader } from './utils/schema-loader';
import { promptBuilder } from './services/llm/prompt-builder.service';
import { database } from './config/database';

// ========== CONFIGURAÇÃO ==========
// Edite a pergunta aqui:
const QUESTION = "Which products are currently available with a price less than $200, showing their names and prices?";
// ==================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          Prompt Preview Tool                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Conectar ao banco
  console.log('🔌 Connecting to database...');
  await database.connect();
  console.log('');

  // Carregar schema
  console.log('📊 Loading database schema...');
  const schema = await schemaLoader.loadSchema();
  console.log('✅ Schema loaded');
  console.log('');

  // Gerar prompt
  console.log('🤖 Building prompt for question:');
  console.log(`   "${QUESTION}"`);
  console.log('');

  const prompt = promptBuilder.buildPrompt(QUESTION, schema);

  // Exibir prompt completo
  console.log('═'.repeat(80));
  console.log('COMPLETE PROMPT THAT WILL BE SENT TO LLM:');
  console.log('═'.repeat(80));
  console.log('');
  console.log(prompt);
  console.log('');
  console.log('═'.repeat(80));
  console.log('');

  // Estatísticas
  const lines = prompt.split('\n').length;
  const chars = prompt.length;
  const words = prompt.split(/\s+/).filter(w => w.length > 0).length;

  console.log('📊 Prompt Statistics:');
  console.log(`   Lines: ${lines}`);
  console.log(`   Characters: ${chars}`);
  console.log(`   Words: ${words}`);
  console.log(`   Estimated tokens: ~${Math.ceil(chars / 4)} (rough estimate)`);
  console.log('');

  // Desconectar
  await database.disconnect();
  console.log('✅ Done!');
}

main().catch(async (error) => {
  console.error('\n❌ Error:', error);
  await database.disconnect();
  process.exit(1);
});
