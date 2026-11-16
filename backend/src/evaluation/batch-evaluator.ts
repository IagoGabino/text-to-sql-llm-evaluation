import fs from 'fs';
import path from 'path';
import { getSelectedModels, ModelConfig } from './models-config';
import { QueryEvaluationResult, ModelEvaluationSummary } from './interfaces/evaluation-result.interface';
import { resultsWriter } from './utils/results-writer';
import { OpenRouterProvider } from '../services/llm/providers/openrouter-provider';
import { OllamaProvider } from '../services/llm/providers/ollama-provider';
import { ILLMProvider } from '../services/llm/interfaces/llm-provider.interface';
import { schemaLoader } from '../utils/schema-loader';
import { promptBuilder } from '../services/llm/prompt-builder.service';
import { sqlValidator } from '../services/sql/sql-validator.service';
import { sqlExecutor } from '../services/sql/sql-executor.service';
import { database } from '../config/database';

/**
 * Estrutura de uma pergunta no test-suite.json
 */
interface TestQuestion {
  id: number;
  question: string;
  complexity: string;
  category: string;
  expectedSQL: string;
  description: string;
  expectedResults?: {
    rowCount: number;
    columns: string[];
    rows: Record<string, unknown>[];
  };
}

/**
 * Estrutura do test-suite.json
 */
interface TestSuite {
  questions: TestQuestion[];
  seedPreset: string;
  generatedAt: string;
}

/**
 * Batch Evaluator
 * 
 * Orquestra a execução em lote de queries de teste em múltiplos modelos LLM
 */
export class BatchEvaluator {
  private providers: Map<string, ILLMProvider> = new Map();
  private testSuite: TestSuite | null = null;

  constructor() {
    // Inicializar providers
    this.providers.set('openrouter', new OpenRouterProvider());
    this.providers.set('ollama', new OllamaProvider());
  }

  /**
   * Carrega o test-suite.json
   */
  private async loadTestSuite(): Promise<TestSuite> {
    if (this.testSuite) {
      return this.testSuite;
    }

    const testSuitePath = path.join(process.cwd(), 'tests', 'test-suite.json');
    const content = fs.readFileSync(testSuitePath, 'utf8');
    this.testSuite = JSON.parse(content) as TestSuite;

    return this.testSuite;
  }

  /**
   * Executa avaliação em lote para os modelos selecionados
   */
  async runBatchEvaluation(): Promise<void> {
    const selectedModels = getSelectedModels();

    if (selectedModels.length === 0) {
      console.error('❌ No models selected in models-config.ts');
      console.error('   Edit SELECTED_MODELS array to choose which models to evaluate');
      return;
    }

    console.log('🚀 Starting batch evaluation');
    console.log(`📋 Selected models: ${selectedModels.map((m) => m.id).join(', ')}`);
    console.log('');

    // Conectar ao banco de dados
    console.log('🔌 Connecting to database...');
    await database.connect();
    console.log('');

    const testSuite = await this.loadTestSuite();
    console.log(`📝 Test suite loaded: ${testSuite.questions.length} questions`);
    console.log('');

    // Executar avaliação para cada modelo
    for (const modelConfig of selectedModels) {
      await this.evaluateModel(modelConfig, testSuite.questions);
    }

    console.log('');
    console.log('✅ Batch evaluation completed!');
    console.log(`📁 Results saved in: logs/batch-results/`);

    // Desconectar do banco
    await database.disconnect();
  }

  /**
   * Avalia um modelo específico em todas as queries
   */
  private async evaluateModel(
    modelConfig: ModelConfig,
    questions: TestQuestion[]
  ): Promise<void> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🤖 Evaluating: ${modelConfig.displayName}`);
    console.log(`   Provider: ${modelConfig.provider}`);
    console.log(`   Model: ${modelConfig.model}`);
    console.log(`   Has Cost: ${modelConfig.hasCost ? 'Yes' : 'No (Local)'}`);
    console.log(`${'='.repeat(80)}\n`);

    const provider = this.providers.get(modelConfig.provider);
    if (!provider) {
      console.error(`❌ Provider '${modelConfig.provider}' not available`);
      return;
    }

    // Verificar disponibilidade do provider
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      console.error(`❌ Provider '${modelConfig.provider}' is not available`);
      console.error(`   Please ensure the service is running`);
      return;
    }

    const startTime = Date.now();
    const results: QueryEvaluationResult[] = [];

    // Executar cada query
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n[${i + 1}/${questions.length}] Processing question ${question.id}...`);
      console.log(`   Category: ${question.category} | Complexity: ${question.complexity}`);
      console.log(`   Question: ${question.question.substring(0, 80)}...`);

      const result = await this.evaluateQuery(
        modelConfig,
        provider,
        question
      );

      results.push(result);

      // Salvar resultado individual
      await resultsWriter.saveQueryResult(modelConfig.id, result);

      // Mostrar resultado
      if (result.executionSuccess) {
        console.log(`   ✅ Success | Time: ${result.executionTimeMs}ms | Rows: ${result.results?.rowCount || 0} | Cost: $${result.llmCost.toFixed(6)}`);
      } else {
        console.log(`   ❌ Failed | Error: ${result.errorType} - ${result.errorMessage?.substring(0, 60)}`);
      }
    }

    const endTime = Date.now();

    // Calcular resumo
    const summary = this.calculateSummary(
      modelConfig,
      results,
      startTime,
      endTime
    );

    // Salvar resumo
    await resultsWriter.saveSummary(modelConfig.id, summary);

    // Mostrar resumo
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📊 Summary for ${modelConfig.displayName}:`);
    console.log(`   Total Queries: ${summary.totalQueries}`);
    console.log(`   Valid Syntax: ${summary.validSyntaxCount} (${(summary.validSyntaxCount / summary.totalQueries * 100).toFixed(1)}%)`);
    console.log(`   Successful Execution: ${summary.successfulExecutionCount} (${(summary.successRate * 100).toFixed(1)}%)`);
    console.log(`   Avg Execution Time: ${summary.avgExecutionTimeMs.toFixed(2)}ms`);
    console.log(`   Total Cost: $${summary.totalCost.toFixed(6)}`);
    console.log(`   Total Duration: ${(summary.totalDurationMs / 1000).toFixed(2)}s`);
    console.log(`${'─'.repeat(80)}`);
  }

  /**
   * Avalia uma query específica
   */
  private async evaluateQuery(
    modelConfig: ModelConfig,
    provider: ILLMProvider,
    question: TestQuestion
  ): Promise<QueryEvaluationResult> {
    const startTime = Date.now();

    const result: QueryEvaluationResult = {
      questionId: question.id,
      question: question.question,
      complexity: question.complexity,
      category: question.category,
      expectedSQL: question.expectedSQL,
      generatedSQL: '',
      timestamp: new Date().toISOString(),
      provider: modelConfig.provider,
      model: modelConfig.model,
      syntaxValid: false,
      executionSuccess: false,
      executionTimeMs: 0,
      llmCost: 0,
    };

    try {
      // 1. Carregar schema
      const schema = await schemaLoader.loadSchema();

      // 2. Construir prompt
      const prompt = promptBuilder.buildPrompt(question.question, schema);

      // 3. Gerar SQL via LLM
      const llmResult = await provider.generateSQL(prompt, modelConfig.model);

      // 4. Enriquecer custo para OpenRouter
      if (modelConfig.provider === 'openrouter' && llmResult.generationId) {
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

      // 5. Validar SQL
      const cleanedSQL = sqlValidator.cleanSQL(llmResult.sql);
      const validation = sqlValidator.validateSQL(cleanedSQL);

      result.syntaxValid = validation.valid;

      if (!validation.valid) {
        result.errorType = 'validation_error';
        result.errorMessage = validation.error || 'SQL validation failed';
        result.executionTimeMs = Date.now() - startTime;
        return result;
      }

      // 6. Executar SQL
      const executionResult = await sqlExecutor.executeQuery(cleanedSQL);

      result.executionSuccess = true;
      
      // Extrair nomes das colunas do primeiro row (se houver)
      const columns = executionResult.rows.length > 0 
        ? Object.keys(executionResult.rows[0])
        : [];

      result.results = {
        rowCount: executionResult.rowCount,
        columns,
        rows: executionResult.rows,
      };

      result.executionTimeMs = Date.now() - startTime;

      return result;
    } catch (error) {
      result.errorType = 'execution_error';
      result.errorMessage = error instanceof Error ? error.message : String(error);
      result.executionTimeMs = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Calcula resumo da avaliação de um modelo
   */
  private calculateSummary(
    modelConfig: ModelConfig,
    results: QueryEvaluationResult[],
    startTime: number,
    endTime: number
  ): ModelEvaluationSummary {
    const validSyntaxCount = results.filter((r) => r.syntaxValid).length;
    const successfulExecutionCount = results.filter((r) => r.executionSuccess).length;
    const totalCost = results.reduce((sum, r) => sum + r.llmCost, 0);
    const avgExecutionTimeMs =
      results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;

    return {
      modelId: modelConfig.id,
      provider: modelConfig.provider,
      model: modelConfig.model,
      totalQueries: results.length,
      validSyntaxCount,
      successfulExecutionCount,
      successRate: successfulExecutionCount / results.length,
      avgExecutionTimeMs,
      totalCost,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date(endTime).toISOString(),
      totalDurationMs: endTime - startTime,
    };
  }
}

// Singleton instance
export const batchEvaluator = new BatchEvaluator();
