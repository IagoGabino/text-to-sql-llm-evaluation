export type Provider = 'openrouter' | 'ollama';

export interface Model {
  value: string;
  label: string;
  badge: 'cloud' | 'local';
}

export interface QueryRequest {
  question: string;
  model: string;
  provider: Provider;
}

export interface QueryResponse {
  success: boolean;
  generatedSQL?: string;
  executionResults?: Record<string, unknown>[];
  executionTime?: number;
  rowCount?: number;
  error?: string;
  metadata?: {
    model: string;
    provider: string;
    responseTime: number;
    costEstimate: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    retryAttempt?: number;
    wasRetried?: boolean;
  };
}

export const MODELS: Record<Provider, Model[]> = {
  openrouter: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', badge: 'cloud' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', badge: 'cloud' },
    { value: 'openai/gpt-oss-120b', label: 'Gpt oss 120b', badge: 'cloud' },
    { value: 'qwen/qwen3-32b', label: 'Qwen 3 32B', badge: 'cloud' }
  ],
  ollama: [
    { value: 'duckdb-nsql', label: 'DuckDB NSQL', badge: 'local' },
    { value: 'phi3:mini', label: 'Phi-3', badge: 'local' },
    { value: 'llama2:7b', label: 'Llama 2', badge: 'local' }
  ]
};


export const EXAMPLE_QUESTIONS = [
  "List the top 5 best-selling products",
  "Which customers spent more than $1000?",
  "Show the monthly revenue for 2024",
  "Which category has the most products?",
  "List pending orders with customer details"
];