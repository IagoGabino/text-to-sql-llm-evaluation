/**
 * Resultado individual de uma query executada por um modelo LLM
 * Contém tanto a resposta quanto as métricas de execução
 */
export interface QueryEvaluationResult {
  /** ID da pergunta no test-suite */
  questionId: number;

  /** Pergunta em linguagem natural */
  question: string;

  /** Complexidade da query (simple, moderate, complex) */
  complexity: string;

  /** Categoria da query (filter, aggregation, join, etc) */
  category: string;

  /** SQL esperado (referência do test-suite) */
  expectedSQL: string;

  /** SQL gerado pelo modelo LLM */
  generatedSQL: string;

  /** Timestamp da execução (ISO 8601) */
  timestamp: string;

  /** Provider usado (openrouter ou ollama) */
  provider: string;

  /** Nome do modelo LLM */
  model: string;

  /** Se a sintaxe SQL é válida */
  syntaxValid: boolean;

  /** Se a query executou com sucesso no banco de dados */
  executionSuccess: boolean;

  /** Tempo total de execução em milissegundos */
  executionTimeMs: number;

  /** Custo da chamada LLM (0 para modelos locais) */
  llmCost: number;

  /** Tokens do prompt */
  promptTokens?: number;

  /** Tokens da resposta */
  completionTokens?: number;

  /** Total de tokens */
  totalTokens?: number;

  /** Resultados da execução da query */
  results?: {
    /** Número de linhas retornadas */
    rowCount: number;

    /** Nomes das colunas */
    columns: string[];

    /** Linhas de dados retornadas */
    rows: Record<string, unknown>[];
  };

  /** Mensagem de erro (se houver) */
  errorMessage?: string;

  /** Tipo de erro (validation_error, execution_error, etc) */
  errorType?: string;

  /** Número da tentativa (1 para primeira tentativa, 2+ para retries) */
  attemptNumber?: number;

  /** Se foi uma tentativa de retry bem-sucedida */
  wasRetrySuccessful?: boolean;
}

/**
 * Resumo da avaliação de um modelo em todas as queries
 */
export interface ModelEvaluationSummary {
  /** ID do modelo */
  modelId: string;

  /** Provider */
  provider: string;

  /** Nome do modelo */
  model: string;

  /** Total de queries executadas */
  totalQueries: number;

  /** Queries com sintaxe válida */
  validSyntaxCount: number;

  /** Queries executadas com sucesso */
  successfulExecutionCount: number;

  /** Taxa de sucesso (0 a 1) */
  successRate: number;

  /** Tempo médio de execução (ms) */
  avgExecutionTimeMs: number;

  /** Custo total das chamadas LLM */
  totalCost: number;

  /** Timestamp do início da avaliação */
  startedAt: string;

  /** Timestamp do fim da avaliação */
  completedAt: string;

  /** Duração total da avaliação (ms) */
  totalDurationMs: number;
}
