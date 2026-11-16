#!/usr/bin/env node

/**
 * Batch Evaluation Runner
 * 
 * Script de entrada para executar avaliação em lote de queries em múltiplos modelos LLM
 * 
 * USO:
 * 1. Edite SELECTED_MODELS em src/evaluation/models-config.ts
 * 2. Execute: npm run evaluate
 * 
 * RESULTADOS:
 * - Salvos em: logs/batch-results/{model-id}/
 * - query-1.json, query-2.json, ..., query-20.json
 * - summary.json (resumo da avaliação)
 */

import { batchEvaluator } from './evaluation/batch-evaluator';
import { validateSelectedModels } from './evaluation/models-config';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              LLM SQL Evaluation - Batch Evaluation Runner                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Validar configuração de modelos
  const validation = validateSelectedModels();
  
  if (!validation.valid) {
    console.error('❌ Configuration Error:\n');
    validation.errors.forEach((error) => {
      console.error(`   ${error}`);
    });
    console.error('\n💡 Fix: Edit src/evaluation/models-config.ts and select models to evaluate');
    process.exit(1);
  }

  try {
    // Executar avaliação em lote
    await batchEvaluator.runBatchEvaluation();
    
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ Evaluation Completed Successfully                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:');
    console.error(error);
    process.exit(1);
  }
}

// Run
main();
