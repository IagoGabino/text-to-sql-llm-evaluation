import { Request, Response } from 'express';
import { schemaLoader } from '../utils/schema-loader';
import { promptBuilder } from '../services/llm/prompt-builder.service';
import { sqlValidator } from '../services/sql/sql-validator.service';
import { sqlExecutor } from '../services/sql/sql-executor.service';
import { OpenRouterProvider } from '../services/llm/providers/openrouter-provider';
import { OllamaProvider } from '../services/llm/providers/ollama-provider';
import { ILLMProvider } from '../services/llm/interfaces/llm-provider.interface';
import { queryEvaluationLogger } from '../services/logging/query-evaluation-logger.service';
import { queryReferenceService } from '../services/logging/query-reference.service';

/**
 * Query Request Body
 */
interface QueryRequestBody {
  question: string;
  provider: 'openrouter' | 'ollama';
  model: string;
}

/**
 * Query Response
 */
interface QueryResponse {
  success: boolean;
  generatedSQL?: string;
  executionResults?: Record<string, unknown>[];
  rowCount?: number;
  executionTime?: number;
  metadata?: {
    model: string;
    provider: string;
    responseTime: number;
    costEstimate: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;
}

/**
 * Query Controller
 * Orquestra todo o fluxo de geração e execução de SQL
 */
class QueryController {
  private providers: Map<string, ILLMProvider> = new Map();

  constructor() {
    // Initialize providers
    try {
      this.providers.set('openrouter', new OpenRouterProvider());
    } catch (error) {
      console.warn('⚠️  OpenRouter provider not available:', error instanceof Error ? error.message : String(error));
    }

    try {
      this.providers.set('ollama', new OllamaProvider());
    } catch (error) {
      console.warn('⚠️  Ollama provider not available:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle query generation and execution
   */
  public async handleQuery(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      // 1. Extract and validate request body
      const { question, provider, model } = req.body as QueryRequestBody;

      if (!question || !provider || !model) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: question, provider, model',
        } as QueryResponse);
        return;
      }

      // 2. Get LLM provider
      const llmProvider = this.providers.get(provider);
      if (!llmProvider) {
        res.status(400).json({
          success: false,
          error: `Provider '${provider}' is not available. Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
        } as QueryResponse);
        return;
      }

      // 3. Check provider availability
      const isAvailable = await llmProvider.isAvailable();
      if (!isAvailable) {
        res.status(503).json({
          success: false,
          error: `Provider '${provider}' is not available. Please check configuration and try again.`,
        } as QueryResponse);
        return;
      }

      // 4. Load database schema
      const schema = await schemaLoader.loadSchema();

      // 5. Build prompt
      const prompt = promptBuilder.buildPrompt(question, schema);

      // 6. Generate SQL via LLM
      console.log('🤖 Generating SQL...');
      const llmResult = await llmProvider.generateSQL(prompt, model);

      // Enriquecer custo para OpenRouter
      if (provider === 'openrouter' && llmResult.generationId) {
        try {
          const openRouterProvider = llmProvider as OpenRouterProvider;
          const cost = await openRouterProvider.getCost(llmResult.generationId);
          llmResult.metrics.cost = cost;
          console.log(`💰 Cost enriched: $${cost.toFixed(6)} for generation ${llmResult.generationId}`);
        } catch (err) {
          console.warn('⚠️  Failed to enrich cost:', err instanceof Error ? err.message : String(err));
        }
      }

      // 7. Validate SQL
      console.log('🔍 Validating SQL syntax...');
      const cleanedSQL = sqlValidator.cleanSQL(llmResult.sql);
      const validation = sqlValidator.validateSQL(cleanedSQL);

      if (!validation.valid) {
        const validationError = validation.error || 'SQL validation failed';
        console.log(`❌ Invalid SQL: ${validationError}`);

        // Log evaluation for syntax validation failure
        const totalTime = Date.now() - startTime;
        const matchingReference = await queryReferenceService.findMatchingReference(question);
        const referenceId = matchingReference?.id || 0;

        const queryGeradaId = await queryEvaluationLogger.saveGeneratedQuery(
          cleanedSQL || 'INVALID_SQL',
          referenceId,
          llmResult.provider,
          llmResult.model
        );

        await queryEvaluationLogger.logEvaluation({
          timestamp: new Date().toISOString(),
          query_gerada_id: queryGeradaId,
          query_base_referencia_id: referenceId,
          tempo_execucao_ms: totalTime,
          custo_llm: llmResult.metrics.cost,
          sintaxe_valida: false,
          execucao_sucesso_db: false,
          metadata: {
            provider: llmResult.provider,
            model: llmResult.model,
            question,
            errorMessage: validationError,
          },
        });

        res.status(400).json({
          success: false,
          error: `SQL validation failed: ${validationError}`,
          generatedSQL: cleanedSQL || null,
        } as QueryResponse);
        return;
      }

      console.log('✅ Valid SQL generated');

      // 8. Execute SQL
      let executionResult;
      
      try {
        executionResult = await sqlExecutor.executeQuery(cleanedSQL);
      } catch (error) {
        const totalTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Log evaluation with execution failure
        const matchingReference = await queryReferenceService.findMatchingReference(question);
        const referenceId = matchingReference?.id || 0;

        const queryGeradaId = await queryEvaluationLogger.saveGeneratedQuery(
          cleanedSQL,
          referenceId,
          llmResult.provider,
          llmResult.model
        );

        await queryEvaluationLogger.logEvaluation({
          timestamp: new Date().toISOString(),
          query_gerada_id: queryGeradaId,
          query_base_referencia_id: referenceId,
          tempo_execucao_ms: totalTime,
          custo_llm: llmResult.metrics.cost,
          sintaxe_valida: true, // Sintaxe válida mas falhou na execução
          execucao_sucesso_db: false,
          metadata: {
            provider: llmResult.provider,
            model: llmResult.model,
            question,
            errorMessage,
          },
        });

        res.status(500).json({
          success: false,
          error: `SQL execution failed: ${errorMessage}`,
          generatedSQL: cleanedSQL,
        } as QueryResponse);
        return;
      }

      // 9. Log query evaluation (CSV with performance metrics)
      const totalTime = Date.now() - startTime;
      
      // Tentar encontrar query de referência correspondente
      const matchingReference = await queryReferenceService.findMatchingReference(question);
      const referenceId = matchingReference?.id || 0;

      // Salvar SQL gerado em arquivo
      const queryGeradaId = await queryEvaluationLogger.saveGeneratedQuery(
        cleanedSQL,
        referenceId,
        llmResult.provider,
        llmResult.model
      );

      // Registrar avaliação completa
      await queryEvaluationLogger.logEvaluation({
        timestamp: new Date().toISOString(),
        query_gerada_id: queryGeradaId,
        query_base_referencia_id: referenceId,
        tempo_execucao_ms: totalTime,
        custo_llm: llmResult.metrics.cost,
        sintaxe_valida: true,
        execucao_sucesso_db: true,
        metadata: {
          provider: llmResult.provider,
          model: llmResult.model,
          question,
          rowCount: executionResult.rowCount,
        },
      });

      // 11. Return success response
      
      res.json({
        success: true,
        generatedSQL: cleanedSQL,
        executionResults: executionResult.rows,
        rowCount: executionResult.rowCount,
        executionTime: executionResult.executionTime,
        metadata: {
          model: llmResult.model,
          provider: llmResult.provider,
          responseTime: totalTime,
          costEstimate: llmResult.metrics.cost,
          promptTokens: llmResult.metrics.promptTokens,
          completionTokens: llmResult.metrics.completionTokens,
          totalTokens: llmResult.metrics.totalTokens,
        },
      } as QueryResponse);

    } catch (error) {
      console.error('❌ Error in query controller:', error);

      res.status(500).json({
        success: false,
        error: `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      } as QueryResponse);
    }
  }

  /**
   * Get available providers and models
   */
  public async getProviders(_req: Request, res: Response): Promise<void> {
    try {
      const providerList = [];

      for (const [name, provider] of this.providers.entries()) {
        const isAvailable = await provider.isAvailable();
        const models = await provider.listModels();

        providerList.push({
          name,
          available: isAvailable,
          models,
        });
      }

      res.json({
        success: true,
        providers: providerList,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: `Failed to get providers: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}

// Export singleton instance
export const queryController = new QueryController();
