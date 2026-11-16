/**
 * Configuração de Modelos para Avaliação
 * 
 * Este arquivo define os modelos LLM disponíveis para teste.
 * Para rodar testes, edite SELECTED_MODELS com os modelos desejados.
 * 
 * Exemplo: Se você é Dev 1, rode gpt-5-mini e gemini-2.5-flash
 * Exemplo: Se você é Dev 2, rode openai/gpt-oss-120b e qwen3-32b
 * Exemplo: Se você é Dev 3, rode duckdb-nsql e phi3
 */

export interface ModelConfig {
  /** Identificador único do modelo (usado em nomes de pasta) */
  id: string;
  
  /** Provider: 'openrouter' ou 'ollama' */
  provider: 'openrouter' | 'ollama';
  
  /** Nome do modelo conforme API do provider */
  model: string;
  
  /** Nome legível para exibição */
  displayName: string;
  
  /** Se o modelo tem custo (false para modelos locais) */
  hasCost: boolean;
}

/**
 * Todos os modelos disponíveis no sistema
 */
export const ALL_MODELS: ModelConfig[] = [
  // OpenRouter Models (Cloud - com custo)
  {
    id: 'openrouter-gpt-5-mini',
    provider: 'openrouter',
    model: 'openai/gpt-5-mini',
    displayName: 'GPT-5 Mini (OpenRouter)',
    hasCost: true,
  },
  {
    id: 'openrouter-gemini-2.5-flash',
    provider: 'openrouter',
    model: 'google/gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash (OpenRouter)',
    hasCost: true,
  },
  {
    id: 'openrouter-gpt-oss-120b',
    provider: 'openrouter',
    model: 'openai/gpt-oss-120b',
    displayName: 'Openai gpt-oss-120b (OpenRouter)',
    hasCost: true,
  },
  {
    id: 'openrouter-qwen3-32b',
    provider: 'openrouter',
    model: 'qwen/qwen3-32b',
    displayName: 'Qwen 3 32B (OpenRouter)',
    hasCost: true,
  },
  
  // Ollama Models (Local - sem custo)
  {
    id: 'ollama-duckdb-nsql',
    provider: 'ollama',
    model: 'duckdb-nsql',
    displayName: 'DuckDB NSQL (Ollama Local)',
    hasCost: false,
  },
  {
    id: 'ollama-phi3',
    provider: 'ollama',
    model: 'phi3:mini',
    displayName: 'Phi-3 Mini (Ollama Local)',
    hasCost: false,
  },
  {
    id: 'ollama-llama2',
    provider: 'ollama',
    model: 'llama2:7b',
    displayName: 'Llama 2 (Ollama Local)',
    hasCost: false,
  }
];

/**
 * CONFIGURAÇÃO ATIVA: Modelos que serão executados nos testes
 * 
 * INSTRUÇÕES:
 * 1. Cada dev deve descomentar/selecionar APENAS 2 modelos
 * 2. Exemplo para distribuir entre 3 devs:
 *    - Dev 1: openrouter-gpt-5-mini, openrouter-gemini-2.5-flash
 *    - Dev 2: openrouter-gpt-oss-120b, openrouter-qwen3-32b
 *    - Dev 3: ollama-duckdb-nsql, ollama-phi3
 * 
 * Para selecionar modelos, use os IDs da lista ALL_MODELS acima.
 */
export const SELECTED_MODELS: string[] = [
  // Descomente os modelos que VOCÊ vai rodar:
  
  // 'openrouter-gemini-2.5-flash',
  // 'openrouter-qwen3-32b',
  // 'openrouter-gpt-5-mini',
  // 'openrouter-gpt-oss-120b',
  'ollama-duckdb-nsql',
  // 'ollama-phi3',
  // 'ollama-llama2'
];

/**
 * Obtém configurações dos modelos selecionados
 */
export function getSelectedModels(): ModelConfig[] {
  return SELECTED_MODELS
    .map(id => ALL_MODELS.find(m => m.id === id))
    .filter((m): m is ModelConfig => m !== undefined);
}

/**
 * Valida se os IDs selecionados existem
 */
export function validateSelectedModels(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (SELECTED_MODELS.length === 0) {
    errors.push('Nenhum modelo selecionado. Edite SELECTED_MODELS em models-config.ts');
  }
  
  for (const id of SELECTED_MODELS) {
    const found = ALL_MODELS.find(m => m.id === id);
    if (!found) {
      errors.push(`Modelo inválido: "${id}". IDs válidos: ${ALL_MODELS.map(m => m.id).join(', ')}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
