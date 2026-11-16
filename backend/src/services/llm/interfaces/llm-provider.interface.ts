import { LLMResponse } from './llm-types';
/**
 * Interface base para provedores de LLM
 * Todos os providers devem implementar esta interface
 */
export interface ILLMProvider {
  /**
   * Nome do provider (ex: "openrouter", "ollama")
   */
  readonly name: string;

  /**
   * Gera SQL a partir de um prompt
   * @param prompt - Prompt formatado contendo schema e pergunta
   * @param model - Modelo específico a ser usado (opcional)
   * @returns Resposta com SQL gerado e métricas
   */
  generateSQL(prompt: string, model?: string): Promise<LLMResponse>;

  /**
   * Verifica se o provider está disponível
   * @returns true se o provider está acessível
   */
  isAvailable(): Promise<boolean>;

  /**
   * Lista os modelos disponíveis no provider
   * @returns Array de modelos suportados
   */
  listModels(): Promise<string[]>;

  /**
   * Obtém o custo real de uma geração (opcional)
   * Disponível apenas para providers com suporte a billing
   * @param generationId - ID da geração retornado pela API
   * @returns Custo em USD, ou 0 se não disponível
   */
  getCost?(generationId: string): Promise<number>;
}

// Re-export types from llm-types
export type { LLMResponse, LLMMetrics, LLMMetricsLog, ProviderConfig } from './llm-types.ts';
