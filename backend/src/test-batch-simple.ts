#!/usr/bin/env node

/**
 * Teste Simples do Batch Evaluator
 * 
 * Testa 1 modelo com 2 queries apenas para validar o sistema
 */

import fs from 'fs';
import path from 'path';
import { OpenRouterProvider } from './services/llm/providers/openrouter-provider';
import { OllamaProvider } from './services/llm/providers/ollama-provider';
import { ILLMProvider } from './services/llm/interfaces/llm-provider.interface';
import { schemaLoader } from './utils/schema-loader';
import { promptBuilder } from './services/llm/prompt-builder.service';
import { sqlValidator } from './services/sql/sql-validator.service';
import { sqlExecutor } from './services/sql/sql-executor.service';
import { resultsWriter } from './evaluation/utils/results-writer';
import { QueryEvaluationResult } from './evaluation/interfaces/evaluation-result.interface';
import { database } from './config/database';

// ========== CONFIGURAÇÃO ==========
const PROVIDER: 'openrouter' | 'ollama' = 'ollama'; // 'openrouter' ou 'ollama'
const MODEL = 'duckdb-nsql';
const MODEL_ID = 'ollama-duckdb-nsql';
const NUM_QUERIES = 2; // Quantas queries testar (máximo 20)
// ==================================

interface TestQuestion {
  id: number;
  question: string;
  complexity: string;
  category: string;
  expectedSQL: string;
  description: string;
}

interface TestSuite {
  questions: TestQuestion[];
  seedPreset: string;
  generatedAt: string;
}

async function main() {
  console.log('🧪 Teste Simples do Batch Evaluator\n');
  console.log(`Provider: ${PROVIDER}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Testing: ${NUM_QUERIES} queries\n`);

  // 1. Conectar ao banco de dados
  console.log('🔌 Conectando ao banco de dados...');
  await database.connect();
  console.log('');

  // 2. Inicializar provider
  let provider: ILLMProvider;
  if (PROVIDER === 'openrouter') {
    provider = new OpenRouterProvider();
  } else {
    provider = new OllamaProvider();
  }

  // 3. Verificar disponibilidade
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    console.error(`❌ Provider '${PROVIDER}' is not available`);
    await database.disconnect();
    process.exit(1);
  }
  console.log(`✅ Provider disponível\n`);

  // 4. Carregar test suite
  const testSuitePath = path.join(process.cwd(), 'tests', 'test-suite.json');
  const content = fs.readFileSync(testSuitePath, 'utf8');
  const testSuite: TestSuite = JSON.parse(content);

  // Pegar apenas as primeiras N queries
  const questions = testSuite.questions.slice(0, NUM_QUERIES);
  console.log(`📝 Carregadas ${questions.length} queries do test-suite\n`);

  // 5. Carregar schema
  const schema = await schemaLoader.loadSchema();
  console.log(`📊 Schema carregado\n`);

  // 6. Executar queries
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    
    console.log(`${'='.repeat(80)}`);
    console.log(`Query ${i + 1}/${questions.length} - ID: ${question.id}`);
    console.log(`Pergunta: ${question.question}`);
    console.log(`Complexidade: ${question.complexity} | Categoria: ${question.category}`);
    console.log(`${'='.repeat(80)}\n`);

    const startTime = Date.now();

    const result: QueryEvaluationResult = {
      questionId: question.id,
      question: question.question,
      complexity: question.complexity,
      category: question.category,
      expectedSQL: question.expectedSQL,
      generatedSQL: '',
      timestamp: new Date().toISOString(),
      provider: PROVIDER,
      model: MODEL,
      syntaxValid: false,
      executionSuccess: false,
      executionTimeMs: 0,
      llmCost: 0,
    };

    try {
      // Gerar prompt
      const prompt = promptBuilder.buildPrompt(question.question, schema);
      
      // Gerar SQL
      console.log('🤖 Gerando SQL...');
      const llmResult = await provider.generateSQL(prompt, MODEL);
      
      // Enriquecer custo se OpenRouter
      if (PROVIDER === 'openrouter' && llmResult.generationId) {
        const openrouterProvider = provider as OpenRouterProvider;
        const actualCost = await openrouterProvider.getCost(llmResult.generationId);
        llmResult.metrics.cost = actualCost;
      }

      // Remover \n da query gerada para salvar sem quebras de linha
      result.generatedSQL = llmResult.sql.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      result.llmCost = llmResult.metrics.cost;
      result.promptTokens = llmResult.metrics.promptTokens;
      result.completionTokens = llmResult.metrics.completionTokens;
      result.totalTokens = llmResult.metrics.totalTokens;

      console.log(`✅ SQL gerado (${llmResult.metrics.totalTokens} tokens, $${llmResult.metrics.cost.toFixed(6)})`);
      console.log(`\n${llmResult.sql}\n`);

      // Validar SQL
      console.log('🔍 Validando sintaxe...');
      const cleanedSQL = sqlValidator.cleanSQL(llmResult.sql);
      const validation = sqlValidator.validateSQL(cleanedSQL);

      result.syntaxValid = validation.valid;

      if (!validation.valid) {
        result.errorType = 'validation_error';
        result.errorMessage = validation.error || 'SQL validation failed';
        console.log(`❌ Sintaxe inválida: ${result.errorMessage}\n`);
      } else {
        console.log('✅ Sintaxe válida');

        // Executar SQL
        console.log('⚡ Executando query...');
        const executionResult = await sqlExecutor.executeQuery(cleanedSQL);

        result.executionSuccess = true;
        const columns = executionResult.rows.length > 0 
          ? Object.keys(executionResult.rows[0])
          : [];

        result.results = {
          rowCount: executionResult.rowCount,
          columns,
          rows: executionResult.rows,
        };

        console.log(`✅ Execução bem-sucedida: ${executionResult.rowCount} linhas retornadas\n`);
      }
    } catch (error) {
      result.errorType = 'execution_error';
      result.errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ Erro: ${result.errorMessage}\n`);
    }

    result.executionTimeMs = Date.now() - startTime;

    // Salvar resultado
    await resultsWriter.saveQueryResult(MODEL_ID, result);
    console.log(`💾 Resultado salvo: logs/batch-results/${MODEL_ID}/query-${question.id}.json`);
    console.log(`⏱️  Tempo total: ${result.executionTimeMs}ms\n`);
  }

  console.log(`${'='.repeat(80)}`);
  console.log('✅ Teste concluído!');
  console.log(`📁 Resultados em: logs/batch-results/${MODEL_ID}/`);
  console.log(`${'='.repeat(80)}`);

  // Desconectar do banco
  await database.disconnect();
}

main().catch(async (error) => {
  console.error('\n❌ Erro fatal:', error);
  await database.disconnect();
  process.exit(1);
});
