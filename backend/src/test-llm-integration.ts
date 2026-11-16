/**
 * Script de teste rápido para verificar integração LLM
 * 
 * Para executar:
 * 1. Configure OPENROUTER_API_KEY no .env
 * 2. Inicie Ollama: ollama serve
 * 3. Baixe modelos: ollama pull duckdb-nsql && ollama pull phi3
 * 4. Execute: npm run dev (ou ts-node src/test-llm-integration.ts)
 */

import { OpenRouterProvider } from './services/llm/providers/openrouter-provider';
import { OllamaProvider } from './services/llm/providers/ollama-provider';
import { llmMetricsLogger } from './services/llm/llm-metrics-logger.service';
import { logger } from './services/logging/logger.service';

const testPrompt = `
Você é um assistente SQL especializado. Gere APENAS a query SQL válida, sem explicações.

Schema do banco:
- customers (id, name, email, city)
- orders (id, customer_id, total_amount, order_date)
- products (id, name, price, stock)

Pergunta: Quais são os 5 clientes que mais gastaram em 2024?

Responda APENAS com o SQL válido, sem markdown ou comentários.
`;

async function testOpenRouter() {
  try {
    logger.info('=== Testando OpenRouter ===');
    
    const provider = new OpenRouterProvider();
    
    // Verificar disponibilidade
    const available = await provider.isAvailable();
    logger.info('OpenRouter disponível:', { available });
    
    if (!available) {
      logger.warn('OpenRouter não disponível. Verifique OPENROUTER_API_KEY no .env');
      return;
    }
    
    // Testar com modelo padrão (gemini-2.5-flash)
    logger.info('Gerando SQL com gemini-2.5-flash...');
    const result = await provider.generateSQL(testPrompt);
    
    logger.info('SQL Gerado:', { sql: result.sql });
    logger.info('Métricas:', result.metrics);
    
    // Registrar métricas iniciais
    await llmMetricsLogger.logMetrics({
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      question: 'Quais são os 5 clientes que mais gastaram em 2024?',
      sqlGenerated: result.sql,
      metrics: result.metrics,
      generationId: result.generationId,
    });
    
    // Enriquecer com custo real (se generation_id disponível)
    if (result.generationId) {
      logger.info('Obtendo custo real da geração...');
      const realCost = await llmMetricsLogger.enrichOpenRouterMetrics(result.generationId);
      logger.info('Custo real obtido:', { 
        generationId: result.generationId,
        estimatedCost: result.metrics.cost,
        realCost,
      });
      
      // Também pode usar o método direto do provider
      const costFromProvider = await provider.getCost(result.generationId);
      logger.info('Custo via provider:', { costFromProvider });
    }
    
    logger.info('✅ Teste OpenRouter concluído com sucesso!');
  } catch (error) {
    logger.error('❌ Erro ao testar OpenRouter:', error as Error);
  }
}

async function testOllama() {
  try {
    logger.info('=== Testando Ollama ===');
    
    const provider = new OllamaProvider();
    
    // Verificar disponibilidade
    const available = await provider.isAvailable();
    logger.info('Ollama disponível:', { available });
    
    if (!available) {
      logger.warn('Ollama não disponível. Inicie com: ollama serve');
      return;
    }
    
    // Listar modelos instalados
    const models = await provider.listModels();
    logger.info('Modelos instalados:', { models });
    
    if (!models.includes('duckdb-nsql')) {
      logger.warn('Modelo duckdb-nsql não encontrado. Instale com: ollama pull duckdb-nsql');
      return;
    }
    
    // Testar com duckdb-nsql
    logger.info('Gerando SQL com duckdb-nsql...');
    const result = await provider.generateSQL(testPrompt, 'duckdb-nsql');
    
    logger.info('SQL Gerado:', { sql: result.sql });
    logger.info('Métricas:', result.metrics);
    
    // Registrar métricas
    await llmMetricsLogger.logMetrics({
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      question: 'Quais são os 5 clientes que mais gastaram em 2024?',
      sqlGenerated: result.sql,
      metrics: result.metrics,
    });
    
    logger.info('✅ Teste Ollama concluído com sucesso!');
  } catch (error) {
    logger.error('❌ Erro ao testar Ollama:', error as Error);
  }
}

async function main() {
  logger.info('🚀 Iniciando testes de integração LLM');
  
  await testOpenRouter();
  console.log('\n');
  await testOllama();
  
  // Mostrar estatísticas
  console.log('\n');
  logger.info('=== Estatísticas de Métricas ===');
  const stats = await llmMetricsLogger.calculateStats();
  logger.info('Estatísticas:', stats);
  
  logger.info('🎉 Testes concluídos!');
}

// Executar se for chamado diretamente
if (require.main === module) {
  main().catch((error) => {
    logger.error('Erro fatal nos testes:', error as Error);
    process.exit(1);
  });
}
