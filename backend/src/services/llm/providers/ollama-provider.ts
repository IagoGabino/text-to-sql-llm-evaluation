import axios, { AxiosInstance, AxiosError } from 'axios';
import { ILLMProvider } from '../interfaces/llm-provider.interface';
import { LLMResponse, LLMMetrics, ProviderConfig } from '../interfaces/llm-types';
import { logger } from '../../logging/logger.service';
import { llmConfig } from '../../../config/environment';

/**
 * Provider para Ollama (modelos locais)
 * Permite executar modelos open-source sem custo e com privacidade total
 */
export class OllamaProvider implements ILLMProvider {
  public readonly name = 'ollama';
  private client: AxiosInstance;
  private config: ProviderConfig;

  // Modelos suportados neste projeto
  public static readonly MODELS = {
    DUCKDB_NSQL: 'duckdb-nsql',
    PHI3: 'phi3:mini',
    LLAMA2: 'llama2:7b',
  };

  constructor() {
    this.config = {
      baseUrl: llmConfig.ollamaBaseUrl,
      timeout: 60000, // 60 segundos (modelos locais podem ser mais lentos)
      maxRetries: 1, // Não faz sentido retry em servidor local
      defaultModel: OllamaProvider.MODELS.DUCKDB_NSQL,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Gera SQL usando Ollama local
   */
  async generateSQL(prompt: string, model?: string): Promise<LLMResponse> {
    const selectedModel = model || this.config.defaultModel;
    const startTime = Date.now();

    try {
      logger.debug('Ollama generating SQL', { model: selectedModel });
      console.log('Ollama generating SQL', { model: selectedModel });

      const response = await this.client.post('/api/generate', {
        model: selectedModel,
        prompt: prompt,
        stream: false, // Resposta completa (não streaming)
        options: {
          temperature: 0.1, // Baixa temperatura para respostas determinísticas
          num_predict: 500, // Máximo de tokens a gerar
        },
      });

      const responseTimeMs = Date.now() - startTime;

      // Extrair SQL da resposta
      const content = response.data.response;
      if (!content) {
        throw new Error('Empty response from Ollama');
      }

      const sql = this.extractSQL(content);

      // Converter métricas de nanosegundos para milissegundos
      const totalDurationMs = this.nsToMs(response.data.total_duration || 0);
      const loadDurationMs = this.nsToMs(response.data.load_duration || 0);
      const promptEvalDurationMs = this.nsToMs(response.data.prompt_eval_duration || 0);
      const evalDurationMs = this.nsToMs(response.data.eval_duration || 0);

      // Construir métricas normalizadas
      const metrics: LLMMetrics = {
        promptTokens: response.data.prompt_eval_count || 0,
        completionTokens: response.data.eval_count || 0,
        totalTokens:
          (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        responseTimeMs,
        cost: 0, // Modelos locais são gratuitos
        rawMetrics: {
          ollama: {
            model: selectedModel,
            total_duration_ms: totalDurationMs,
            load_duration_ms: loadDurationMs,
            prompt_eval_duration_ms: promptEvalDurationMs,
            eval_duration_ms: evalDurationMs,
            prompt_eval_count: response.data.prompt_eval_count,
            eval_count: response.data.eval_count,
          },
        },
      };

      logger.info('Ollama SQL generated successfully', {
        model: selectedModel,
        responseTimeMs,
        tokens: metrics.totalTokens,
        totalDurationMs,
      });

      return {
        sql,
        model: selectedModel,
        provider: this.name,
        metrics,
        rawResponse: response.data,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // ECONNREFUSED - Ollama não está rodando
        if (axiosError.code === 'ECONNREFUSED') {
          throw new Error(
            'Ollama is not running. Please start Ollama with "ollama serve"'
          );
        }

        // Erro 404 - Modelo não encontrado
        if (axiosError.response?.status === 404) {
          throw new Error(
            `Model "${selectedModel}" not found in Ollama. Pull it with "ollama pull ${selectedModel}"`
          );
        }

        // Timeout
        if (axiosError.code === 'ECONNABORTED') {
          throw new Error(`Ollama request timed out after ${this.config.timeout}ms`);
        }
      }

      logger.error('Ollama error', error as Error);
      throw error;
    }
  }

  /**
   * Verifica se Ollama está disponível
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/api/tags', { timeout: 5000 });
      return true;
    } catch (error) {
      logger.warn('Ollama is not available', { error });
      return false;
    }
  }

  /**
   * Lista modelos instalados no Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models.map((model: { name: string }) => model.name);
    } catch (error) {
      logger.error('Failed to list Ollama models', error as Error);
      return [];
    }
  }

  /**
   * Extrai SQL limpo da resposta do LLM
   * Ollama às vezes retorna texto adicional
   */
  private extractSQL(content: string): string {
    let sql = content.trim();

    // Remover prefixos comuns
    sql = sql.replace(/^(SQL Gerado:|Resposta:|Query:)\s*/gi, '');

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
   * Converte nanosegundos para milissegundos
   */
  private nsToMs(nanoseconds: number): number {
    return Math.round(nanoseconds / 1_000_000);
  }
}
