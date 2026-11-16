import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { LLMMetricsLog } from './interfaces/llm-types';
import { logger } from '../logging/logger.service';
import { llmConfig } from '../../config/environment';

/**
 * Serviço para logging de métricas LLM em formato JSONL
 * Permite análises posteriores de desempenho, custo e qualidade
 */
export class LLMMetricsLogger {
  private logFilePath: string;
  private maxFileSizeBytes: number;

  constructor() {
    this.logFilePath = path.join(process.cwd(), 'logs', 'llm-metrics.jsonl');
    this.maxFileSizeBytes = 100 * 1024 * 1024; // 100MB

    // Garantir que diretório de logs existe
    const logsDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  /**
   * Registra métricas de uma chamada LLM
   */
  async logMetrics(data: LLMMetricsLog): Promise<void> {
    try {
      // Verificar rotação de log
      this.checkRotation();

      // Adicionar timestamp se não existir
      if (!data.timestamp) {
        data.timestamp = new Date().toISOString();
      }

      // Serializar como JSON (uma linha)
      const jsonLine = JSON.stringify(data) + '\n';

      // Append síncrono (melhor performance para logs)
      fs.appendFileSync(this.logFilePath, jsonLine, 'utf8');

      logger.debug('LLM metrics logged', {
        provider: data.provider,
        model: data.model,
        hasError: !!data.error,
      });
    } catch (error) {
      logger.error('Failed to log LLM metrics', error as Error);
      // Não lançar erro - logging não deve quebrar o fluxo principal
    }
  }

  /**
   * Enriquece métricas do OpenRouter com custo exato
   * Query ao endpoint /api/v1/generation para obter total_cost
   * Implementa retry porque o custo pode não estar disponível imediatamente
   * @param generationId - ID da geração retornado pela API de chat completions
   * @param maxRetries - Número máximo de tentativas (padrão: 3)
   * @returns Custo real em USD
   */
  async enrichOpenRouterMetrics(
    generationId: string,
    maxRetries: number = 3
  ): Promise<number> {
    const delays = [1000, 2000, 3000]; // 1s, 2s, 3s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Aguardar antes de consultar (exceto na primeira tentativa)
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, delays[attempt - 1]));
          logger.debug('Retrying cost enrichment', { generationId, attempt: attempt + 1 });
        }

        const response = await axios.get(
          `https://openrouter.ai/api/v1/generation`,
          {
            params: { id: generationId },
            headers: {
              Authorization: `Bearer ${llmConfig.openRouterApiKey}`,
            },
            timeout: 10000,
          }
        );

        const data = response.data.data;
        const cost = data.total_cost || 0;

        if (cost > 0) {
          logger.info('OpenRouter metrics enriched', {
            generationId,
            cost,
            model: data.model,
            nativeTokensPrompt: data.native_tokens_prompt,
            nativeTokensCompletion: data.native_tokens_completion,
            providerName: data.provider_name,
            attempt: attempt + 1,
          });

          return cost;
        }

        // Se custo é 0, tentar novamente
        if (attempt < maxRetries - 1) {
          logger.debug('Cost not available yet, will retry', {
            generationId,
            attempt: attempt + 1,
          });
          continue;
        }

        logger.warn('Cost not available after retries', { generationId });
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

        logger.warn('Failed to enrich OpenRouter metrics', {
          generationId,
          error,
          attempt: attempt + 1,
        });

        // Não lançar erro - enrichment é opcional
        return 0;
      }
    }

    return 0;
  }

  /**
   * Verifica se arquivo de log excedeu tamanho máximo
   * Se sim, renomeia com timestamp e cria novo arquivo
   */
  private checkRotation(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return;
      }

      const stats = fs.statSync(this.logFilePath);

      if (stats.size >= this.maxFileSizeBytes) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = this.logFilePath.replace(
          '.jsonl',
          `.${timestamp}.jsonl`
        );

        fs.renameSync(this.logFilePath, rotatedPath);

        logger.info('LLM metrics log rotated', {
          oldFile: this.logFilePath,
          newFile: rotatedPath,
          sizeBytes: stats.size,
        });
      }
    } catch (error) {
      logger.error('Failed to rotate log file', error as Error);
    }
  }

  /**
   * Lê todas as métricas do arquivo JSONL
   * Útil para análises posteriores
   */
  async readMetrics(): Promise<LLMMetricsLog[]> {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }

      const content = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = content.trim().split('\n');

      return lines
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line) as LLMMetricsLog);
    } catch (error) {
      logger.error('Failed to read LLM metrics', error as Error);
      return [];
    }
  }

  /**
   * Calcula estatísticas agregadas das métricas
   */
  async calculateStats(): Promise<{
    totalCalls: number;
    successRate: number;
    avgResponseTimeMs: number;
    totalCost: number;
    byProvider: Record<string, { calls: number; avgResponseTime: number; cost: number }>;
  }> {
    const metrics = await this.readMetrics();

    const totalCalls = metrics.length;
    const successfulCalls = metrics.filter((m) => !m.error).length;
    const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

    const avgResponseTimeMs =
      metrics.reduce((sum, m) => sum + (m.metrics?.responseTimeMs || 0), 0) /
        totalCalls || 0;

    const totalCost = metrics.reduce((sum, m) => sum + (m.metrics?.cost || 0), 0);

    // Agregar por provider
    const byProvider: Record<
      string,
      { calls: number; avgResponseTime: number; cost: number }
    > = {};

    for (const metric of metrics) {
      if (!byProvider[metric.provider]) {
        byProvider[metric.provider] = { calls: 0, avgResponseTime: 0, cost: 0 };
      }

      byProvider[metric.provider].calls++;
      byProvider[metric.provider].avgResponseTime +=
        (metric.metrics?.responseTimeMs || 0) / totalCalls;
      byProvider[metric.provider].cost += metric.metrics?.cost || 0;
    }

    return {
      totalCalls,
      successRate,
      avgResponseTimeMs,
      totalCost,
      byProvider,
    };
  }
}

// Singleton instance
export const llmMetricsLogger = new LLMMetricsLogger();
