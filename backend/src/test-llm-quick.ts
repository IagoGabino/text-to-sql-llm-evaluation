/**
 * 🧪 TESTE RÁPIDO - LLM Integration
 * 
 * Como executar:
 * 1. Configure OPENROUTER_API_KEY no arquivo .env
 * 2. Certifique-se que Ollama está rodando (ollama serve)
 * 3. Execute: npx ts-node src/test-llm-quick.ts
 */

import 'dotenv/config';
import { OpenRouterProvider } from './services/llm/providers/openrouter-provider';
import { OllamaProvider } from './services/llm/providers/ollama-provider';

// Prompt de teste simples
const testPrompt = `Você é um assistente SQL. Gere APENAS a query SQL válida.

Schema:
- customers (id, name, email, city)
- orders (id, customer_id, total_amount, order_date)

Pergunta: Liste os 5 clientes que mais gastaram.

Responda APENAS com SQL, sem explicações.`;

async function testOpenRouter() {
  console.log('\n🌐 === TESTE OPENROUTER ===\n');
  
  try {
    const provider = new OpenRouterProvider();
    
    console.log('📡 Verificando conexão com OpenRouter...');
    const available = await provider.isAvailable();
    
    if (!available) {
      console.log('❌ OpenRouter não disponível. Verifique OPENROUTER_API_KEY no .env');
      return;
    }
    
    console.log('✅ OpenRouter disponível!');
    console.log('\n🤖 Gerando SQL com gemini-2.5-flash...');
    console.log('⏳ Aguarde...\n');
    
    const startTime = Date.now();
    const result = await provider.generateSQL(testPrompt, 'openai/gpt-5-mini');
    const duration = Date.now() - startTime;
    
    console.log('✅ SQL GERADO:');
    console.log('─'.repeat(60));
    console.log(result.sql);
    console.log('─'.repeat(60));
    
    console.log('\n📊 MÉTRICAS:');
    console.log(`   Modelo: ${result.model}`);
    console.log(`   Tokens do Prompt: ${result.metrics.promptTokens}`);
    console.log(`   Tokens da Resposta: ${result.metrics.completionTokens}`);
    console.log(`   Total de Tokens: ${result.metrics.totalTokens}`);
    console.log(`   Tempo de Resposta: ${duration}ms`);
    
    // Obter custo real
    if (result.generationId) {
      console.log('\n💰 Obtendo custo real da OpenRouter...');
      const realCost = await provider.getCost(result.generationId);
      console.log(`   Custo Real: $${realCost.toFixed(6)}`);
      console.log(`   Generation ID: ${result.generationId}`);
    }
    
    console.log('\n✅ Teste OpenRouter concluído com sucesso!\n');
    
    return result;
  } catch (error: unknown) {
    const err = error as Error;
    console.log('\n❌ ERRO OpenRouter:');
    console.log(`   ${err.message}`);
    
    if (err.message.includes('API key')) {
      console.log('\n💡 DICA: Configure OPENROUTER_API_KEY no arquivo .env');
      console.log('   1. Acesse https://openrouter.ai/');
      console.log('   2. Faça login e vá em Settings → API Keys');
      console.log('   3. Crie uma nova chave e adicione no .env\n');
    }
    
    return undefined;
  }
}

async function testOllama() {
  console.log('\n🏠 === TESTE OLLAMA (LOCAL) ===\n');
  
  try {
    const provider = new OllamaProvider();
    
    console.log('📡 Verificando conexão com Ollama...');
    const available = await provider.isAvailable();
    
    if (!available) {
      console.log('❌ Ollama não está rodando.');
      console.log('\n💡 DICA: Inicie o Ollama em outro terminal:');
      console.log('   ollama serve\n');
      return;
    }
    
    console.log('✅ Ollama disponível!');
    
    // Listar modelos
    const models = await provider.listModels();
    console.log(`\n📦 Modelos instalados: ${models.join(', ')}`);
    
    // Verificar se duckdb-nsql está instalado
    if (!models.includes('duckdb-nsql:latest')) {
      console.log('\n⚠️  Modelo "duckdb-nsql" não encontrado.');
      console.log('💡 DICA: Instale com: ollama pull duckdb-nsql\n');
      return;
    }
    
    console.log('\n🤖 Gerando SQL com duckdb-nsql...');
    console.log('⏳ Aguarde (modelos locais podem demorar mais)...\n');
    
    const startTime = Date.now();
    const result = await provider.generateSQL(testPrompt, 'duckdb-nsql');
    const duration = Date.now() - startTime;
    
    console.log('✅ SQL GERADO:');
    console.log('─'.repeat(60));
    console.log(result.sql);
    console.log('─'.repeat(60));
    
    console.log('\n📊 MÉTRICAS:');
    console.log(`   Modelo: ${result.model}`);
    console.log(`   Tokens do Prompt: ${result.metrics.promptTokens}`);
    console.log(`   Tokens da Resposta: ${result.metrics.completionTokens}`);
    console.log(`   Total de Tokens: ${result.metrics.totalTokens}`);
    console.log(`   Tempo de Resposta: ${duration}ms`);
    console.log(`   Custo: $0.00 (modelo local)`);
    
    const rawMetrics = result.metrics.rawMetrics.ollama as Record<string, number>;
    console.log(`\n⚙️  MÉTRICAS DETALHADAS (Ollama):`);
    console.log(`   Tempo Total: ${rawMetrics.total_duration_ms}ms`);
    console.log(`   Tempo de Carregamento: ${rawMetrics.load_duration_ms}ms`);
    console.log(`   Tempo de Processamento do Prompt: ${rawMetrics.prompt_eval_duration_ms}ms`);
    console.log(`   Tempo de Geração: ${rawMetrics.eval_duration_ms}ms`);
    
    console.log('\n✅ Teste Ollama concluído com sucesso!\n');
    
    return result;
  } catch (error: unknown) {
    const err = error as Error;
    console.log('\n❌ ERRO Ollama:');
    console.log(`   ${err.message}`);
    
    if (err.message.includes('not running')) {
      console.log('\n💡 DICA: Inicie o Ollama em outro terminal:');
      console.log('   ollama serve\n');
    } else if (err.message.includes('not found')) {
      console.log('\n💡 DICA: Instale o modelo:');
      console.log('   ollama pull duckdb-nsql\n');
    }
    
    return undefined;
  }
}

async function main() {
  console.log('\n🚀 TESTE DE INTEGRAÇÃO LLM - Task 21');
  console.log('═'.repeat(60));
  
  // Testar OpenRouter
  await testOpenRouter();
  
  // Testar Ollama
  const sla = false
  if (sla) {
      await testOllama();
  }
  
  console.log('═'.repeat(60));
  console.log('🎉 TESTES CONCLUÍDOS!\n');
}

// Executar
main().catch((error) => {
  console.error('\n💥 ERRO FATAL:', error);
  process.exit(1);
});
