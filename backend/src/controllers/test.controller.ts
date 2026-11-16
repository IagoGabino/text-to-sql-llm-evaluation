import { Request, Response } from 'express';
import { schemaLoader } from '../utils/schema-loader';
import { promptBuilder } from '../services/llm/prompt-builder.service';
import { sqlValidator } from '../services/sql/sql-validator.service';
import { OpenRouterProvider } from '../services/llm/providers/openrouter-provider';
import { OllamaProvider } from '../services/llm/providers/ollama-provider';
import { ILLMProvider } from '../services/llm/interfaces/llm-provider.interface';

/**
 * Test Controller
 * Provides test endpoints for debugging SQL generation pipeline
 */
class TestController {
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
   * Test SQL generation pipeline without executing
   * Returns: prompt, generated SQL, and validation result
   */
  public async testGeneration(req: Request, res: Response): Promise<void> {
    try {
      const { question, provider, model } = req.body;

      // Validate input
      if (!question || !provider || !model) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: question, provider, model',
        });
        return;
      }

      // Get LLM provider
      const llmProvider = this.providers.get(provider);
      if (!llmProvider) {
        res.status(400).json({
          success: false,
          error: `Provider '${provider}' is not available. Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
        });
        return;
      }

      // Check provider availability
      const isAvailable = await llmProvider.isAvailable();
      if (!isAvailable) {
        res.status(503).json({
          success: false,
          error: `Provider '${provider}' is not available. Please check configuration.`,
        });
        return;
      }

      // 1. Load database schema
      const schema = await schemaLoader.loadSchema();

      // 2. Build prompt
      const prompt = promptBuilder.buildPrompt(question, schema);

      // 3. Generate SQL via LLM
      const startTime = Date.now();
      const llmResult = await llmProvider.generateSQL(prompt, model);
      const generationTime = Date.now() - startTime;

      // 4. Clean and validate SQL
      const cleanedSQL = sqlValidator.cleanSQL(llmResult.sql);
      const validation = sqlValidator.validateSQL(cleanedSQL);

      // 5. Return test results
      res.json({
        success: true,
        test: {
          question,
          provider,
          model,
        },
        step1_prompt: {
          prompt,
          length: prompt.length,
          lines: prompt.split('\n').length,
        },
        step2_sql_generated: {
          raw: llmResult.sql,
          cleaned: cleanedSQL,
          generationTimeMs: generationTime,
        },
        step3_validation: {
          valid: validation.valid,
          error: validation.error,
          warnings: validation.warnings,
        },
        metadata: {
          promptTokens: llmResult.metrics.promptTokens,
          completionTokens: llmResult.metrics.completionTokens,
          totalTokens: llmResult.metrics.totalTokens,
          responseTimeMs: llmResult.metrics.responseTimeMs,
          costEstimate: llmResult.metrics.cost,
        },
      });
    } catch (error) {
      console.error('❌ Error in test controller:', error);

      res.status(500).json({
        success: false,
        error: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
}

// Export singleton instance
export const testController = new TestController();
