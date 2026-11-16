import axios, { AxiosInstance, AxiosError } from 'axios';
import { ILLMProvider } from '../interfaces/llm-provider.interface';
import { LLMResponse, LLMMetrics, ProviderConfig } from '../interfaces/llm-types';
import { logger } from '../../logging/logger.service';
import { llmConfig } from '../../../config/environment';

/**
 * Provider para OpenRouter API
 * Permite acesso a múltiplos modelos (GPT-4, Claude, Gemini, etc.)
 * através de uma única API
 */
export class OpenRouterProvider implements ILLMProvider {
  public readonly name = 'openrouter';
  private client: AxiosInstance;
  private config: ProviderConfig;

  // Modelos suportados neste projeto
  public static readonly MODELS = {
    GPT_5_MINI: 'openai/gpt-5-mini',
    GEMINI_FLASH: 'google/gemini-2.5-flash',
    GROK_CODE_FAST: 'openai/gpt-oss-120b',
    QWEN_32B: 'qwen/qwen3-32b'
  };

  constructor() {
    this.config = {
      apiKey: llmConfig.openRouterApiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      timeout: 90000, // 90 segundos
      maxRetries: 3,
      defaultModel: OpenRouterProvider.MODELS.GEMINI_FLASH,
    };

    if (!this.config.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured in environment variables');
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': 'https://github.com/marcelomrad/tp-bda',
        'X-Title': 'LLM SQL Evaluation System',
      },
    });
  }

  /**
   * Gera SQL usando OpenRouter
   * Implementa retry com backoff exponencial
   */
  async generateSQL(prompt: string, model?: string): Promise<LLMResponse> {
    const selectedModel = model || this.config.defaultModel;
    const startTime = Date.now();

    let lastError: Error | null = null;
    const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

    // Retry logic com backoff exponencial
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        logger.debug(`OpenRouter attempt ${attempt + 1}/${this.config.maxRetries}`, {
          model: selectedModel,
        });

        const response = await this.client.post('/chat/completions', {
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1, // Baixa temperatura para respostas mais determinísticas
          max_tokens: 10000, // SQL raramente precisa de mais que isso
        });

        const responseTimeMs = Date.now() - startTime;

        // Extrair SQL da resposta
        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from OpenRouter');
        }

        const sql = this.extractSQL(content);

        // Construir métricas normalizadas
        const metrics: LLMMetrics = {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
          responseTimeMs,
          cost: 0, // Será enriquecido posteriormente via /api/v1/generation
          rawMetrics: {
            openrouter: {
              model: response.data.model,
              finish_reason: response.data.choices[0]?.finish_reason,
              usage: response.data.usage,
            },
          },
        };

        logger.info('OpenRouter SQL generated successfully', {
          model: selectedModel,
          responseTimeMs,
          tokens: metrics.totalTokens,
        });

        return {
          sql,
          model: response.data.model || selectedModel,
          provider: this.name,
          metrics,
          rawResponse: response.data,
          generationId: response.data.id, // Para query posterior de custo
        };
      } catch (error) {
        lastError = error as Error;

        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;

          // Erro 429 (rate limit) - retry
          if (axiosError.response?.status === 429) {
            logger.warn(`OpenRouter rate limit hit, retrying in ${delays[attempt]}ms`, {
              attempt: attempt + 1,
            });

            if (attempt < this.config.maxRetries - 1) {
              await this.sleep(delays[attempt]);
              continue; // Retry
            }
          }

          // Erro 401 (unauthorized) - não retry
          if (axiosError.response?.status === 401) {
            throw new Error('OpenRouter API key is invalid or expired');
          }

          // Erro 400 (bad request) - não retry
          if (axiosError.response?.status === 400) {
            throw new Error(
              `OpenRouter bad request: ${JSON.stringify(axiosError.response.data)}`
            );
          }
        }

        // Timeout ou erro de rede - retry
        if ((error as any).code === 'ECONNABORTED' || (error as any).code === 'ETIMEDOUT') {
          logger.warn(`OpenRouter timeout, retrying in ${delays[attempt]}ms`, {
            attempt: attempt + 1,
          });

          if (attempt < this.config.maxRetries - 1) {
            await this.sleep(delays[attempt]);
            continue; // Retry
          }
        }

        // Erro desconhecido - não retry
        logger.error('OpenRouter unknown error', error as Error);
        throw error;
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error('OpenRouter failed after all retries');
  }

  /**
   * Verifica se OpenRouter está disponível
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/models', { timeout: 5000 });
      return true;
    } catch (error) {
      logger.warn('OpenRouter is not available', { error });
      return false;
    }
  }

  /**
   * Lista modelos disponíveis no OpenRouter
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data.map((model: { id: string }) => model.id);
    } catch (error) {
      logger.error('Failed to list OpenRouter models', error as Error);
      return [];
    }
  }

  /**
   * Obtém o custo real de uma geração específica
   * Usa o generation_id retornado pela API de chat completions
   * Implementa retry com delay porque o custo pode não estar disponível imediatamente
   */
  async getCost(generationId: string, maxRetries: number = 3): Promise<number> {
    const delays = [1000, 2000, 3000]; // 1s, 2s, 3s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Aguardar antes de consultar (exceto na primeira tentativa)
        if (attempt > 0) {
          await this.sleep(delays[attempt - 1]);
          logger.debug('Retrying cost fetch', { generationId, attempt: attempt + 1 });
        }

        const response = await this.client.get('/generation', {
          params: { id: generationId },
        });

        const totalCost = response.data.data?.total_cost;

        if (typeof totalCost === 'number' && totalCost > 0) {
          logger.debug('OpenRouter cost retrieved', {
            generationId,
            totalCost,
            attempt: attempt + 1,
          });
          return totalCost;
        }

        // Se custo é 0 ou não disponível, tentar novamente
        if (attempt < maxRetries - 1) {
          logger.debug('Cost not available yet, will retry', {
            generationId,
            attempt: attempt + 1,
          });
          continue;
        }

        logger.warn('OpenRouter cost not available after retries', { generationId });
        return 0;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          // 404 significa que a geração ainda não está pronta
          if (attempt < maxRetries - 1) {
            logger.debug('Generation not found yet, will retry', {
              generationId,
              attempt: attempt + 1,
            });
            continue;
          }
        }

        logger.error('Failed to get OpenRouter cost', error as Error, {
          generationId,
          attempt: attempt + 1,
        });
        return 0;
      }
    }

    return 0;
  }

  /**
   * Extrai SQL limpo da resposta do LLM
   * Remove markdown code blocks, comentários, etc.
   */
  private extractSQL(content: string): string {
    let sql = content.trim();

    // Remover markdown code blocks
    sql = sql.replace(/```sql\n?/gi, '');
    sql = sql.replace(/```\n?/g, '');

    // Remover comentários de linha
    sql = sql.replace(/--.*$/gm, '');

    // Remover linhas vazias extras
    sql = sql.replace(/\n{3,}/g, '\n\n');

    return sql.trim();
  }

  /**
   * Sleep helper para retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
