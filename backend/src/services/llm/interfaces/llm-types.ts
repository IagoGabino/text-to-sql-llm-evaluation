/**
 * Resposta normalizada de um provider LLM
 */
export interface LLMResponse {
  /** SQL gerado pelo modelo */
  sql: string;

  /** Modelo utilizado (ex: "gpt-4", "phi3:mini") */
  model: string;

  /** Provider usado (ex: "openrouter", "ollama") */
  provider: string;

  /** Métricas normalizadas entre providers */
  metrics: LLMMetrics;

  /** Resposta bruta do provider (para debug) */
  rawResponse?: unknown;

  /** ID da geração (usado pelo OpenRouter para query de custo) */
  generationId?: string;
}

/**
 * Métricas normalizadas entre todos os providers
 */
export interface LLMMetrics {
  /** Tokens do prompt (entrada) */
  promptTokens: number;

  /** Tokens da resposta (saída) */
  completionTokens: number;

  /** Total de tokens processados */
  totalTokens: number;

  /** Tempo de resposta em milissegundos */
  responseTimeMs: number;

  /** Custo estimado em USD (0 para modelos locais) */
  cost: number;

  /** Métricas específicas do provider (raw data) */
  rawMetrics: Record<string, unknown>;
}

/**
 * Registro de métricas para logging
 */
export interface LLMMetricsLog {
  /** Timestamp ISO 8601 */
  timestamp: string;

  /** Provider usado */
  provider: string;

  /** Modelo usado */
  model: string;

  /** Pergunta original do usuário */
  question: string;

  /** SQL gerado */
  sqlGenerated: string | null;

  /** Métricas normalizadas */
  metrics: LLMMetrics | null;

  /** Erro (se houver) */
  error?: {
    type: string;
    message: string;
    stack?: string;
  };

  /** ID da geração (OpenRouter) */
  generationId?: string;

  /** Se métricas de custo foram enriquecidas */
  costEnriched?: boolean;

  /** Número da tentativa (1 = primeira tentativa, 2 = primeiro retry, etc) */
  retryAttempt?: number;

  /** Se esta tentativa é um retry de uma tentativa anterior que falhou */
  isRetry?: boolean;

  /** Se este retry teve sucesso após falha anterior */
  isRetrySuccess?: boolean;
}

/**
 * Opções de configuração para providers
 */
export interface ProviderConfig {
  /** API key (para providers cloud) */
  apiKey?: string;

  /** URL base da API */
  baseUrl: string;

  /** Timeout em milissegundos */
  timeout: number;

  /** Número máximo de tentativas (retry) */
  maxRetries: number;

  /** Modelo padrão */
  defaultModel: string;
}
