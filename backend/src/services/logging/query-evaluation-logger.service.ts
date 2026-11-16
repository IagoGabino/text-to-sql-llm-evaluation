import fs from 'fs';
import path from 'path';
import { logger } from './logger.service';

/**
 * Estrutura de um log de avaliação de query
 */
export interface QueryEvaluationLog {
  /** Data e hora da execução (ISO 8601) */
  timestamp: string;

  /** ID da query gerada (referência ao arquivo .sql) */
  query_gerada_id: string;

  /** ID da query base de referência para comparação */
  query_base_referencia_id: number;

  /** Tempo total de execução em milissegundos */
  tempo_execucao_ms: number;

  /** Custo associado à chamada LLM (0 para modelos locais) */
  custo_llm: number;

  /** Se a sintaxe SQL é válida */
  sintaxe_valida: boolean;

  /** Se a query executou com sucesso no banco de dados */
  execucao_sucesso_db: boolean;

  /** Informações adicionais (provider, model, etc) */
  metadata?: {
    provider: string;
    model: string;
    question: string;
    rowCount?: number;
    errorMessage?: string;
  };
}

/**
 * Query Evaluation Logger Service
 * Registra métricas de performance e validação de queries em formato CSV
 * Organiza logs por provider/modelo para facilitar análises posteriores
 */
export class QueryEvaluationLogger {
  private logsDir: string;
  private generatedQueriesDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs', 'query-evaluation');
    this.generatedQueriesDir = path.join(
      process.cwd(),
      'logs',
      'generated-queries'
    );

    // Garantir que diretórios existem
    this.ensureDirectories();
  }

  /**
   * Registra uma avaliação de query no CSV apropriado
   * CSV é organizado por provider/modelo (ex: openrouter-gpt4.csv, ollama-llama3.csv)
   */
  async logEvaluation(log: QueryEvaluationLog): Promise<void> {
    try {
      if (!log.metadata?.provider || !log.metadata?.model) {
        throw new Error('Provider e model são obrigatórios no metadata');
      }

      // Normalizar nome do arquivo: provider-model.csv
      const fileName = this.normalizeFileName(
        log.metadata.provider,
        log.metadata.model
      );
      const csvPath = path.join(this.logsDir, fileName);

      // Verificar se arquivo existe para adicionar header
      const fileExists = fs.existsSync(csvPath);

      // CSV Header
      const header =
        'timestamp,query_gerada_id,query_base_referencia_id,tempo_execucao_ms,custo_llm,sintaxe_valida,execucao_sucesso_db,provider,model,question,row_count,error_message\n';

      // CSV Row
      const row = this.formatCsvRow(log);

      // Append ao arquivo
      if (!fileExists) {
        fs.writeFileSync(csvPath, header + row, 'utf8');
      } else {
        fs.appendFileSync(csvPath, row, 'utf8');
      }

      logger.debug('Query evaluation logged', {
        provider: log.metadata.provider,
        model: log.metadata.model,
        csvFile: fileName,
      });
    } catch (error) {
      logger.error('Failed to log query evaluation', error as Error);
      // Não lançar erro - logging não deve quebrar o fluxo principal
    }
  }

  /**
   * Salva a query SQL gerada em um arquivo .sql
   * Retorna o ID único da query gerada (usado no CSV)
   */
  async saveGeneratedQuery(
    sql: string,
    baseReferenceId: number,
    provider: string,
    model: string
  ): Promise<string> {
    try {
      // Gerar ID único: timestamp + provider + model + referenceId
      const timestamp = new Date().getTime();
      const normalizedProvider = this.normalizeString(provider);
      const normalizedModel = this.normalizeString(model);
      const queryId = `${timestamp}_${normalizedProvider}_${normalizedModel}_ref${baseReferenceId}`;

      // Caminho do arquivo
      const fileName = `${queryId}.sql`;
      const filePath = path.join(this.generatedQueriesDir, fileName);

      // Salvar arquivo
      fs.writeFileSync(filePath, sql, 'utf8');

      logger.debug('Generated query saved', {
        queryId,
        filePath,
        baseReferenceId,
      });

      return queryId;
    } catch (error) {
      logger.error('Failed to save generated query', error as Error);
      // Retornar ID de fallback
      return `error_${Date.now()}`;
    }
  }

  /**
   * Lê um arquivo CSV de avaliação específico
   */
  async readEvaluationCsv(
    provider: string,
    model: string
  ): Promise<QueryEvaluationLog[]> {
    try {
      const fileName = this.normalizeFileName(provider, model);
      const csvPath = path.join(this.logsDir, fileName);

      if (!fs.existsSync(csvPath)) {
        return [];
      }

      const content = fs.readFileSync(csvPath, 'utf8');
      const lines = content.trim().split('\n');

      // Remover header
      const dataLines = lines.slice(1);

      return dataLines
        .filter((line) => line.trim())
        .map((line) => this.parseCsvRow(line));
    } catch (error) {
      logger.error('Failed to read evaluation CSV', error as Error);
      return [];
    }
  }

  /**
   * Lista todos os arquivos CSV de avaliação disponíveis
   */
  listEvaluationFiles(): Array<{ provider: string; model: string; fileName: string }> {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files
        .filter((file) => file.endsWith('.csv'))
        .map((file) => {
          const parts = file.replace('.csv', '').split('-');
          return {
            provider: parts[0] || 'unknown',
            model: parts.slice(1).join('-') || 'unknown',
            fileName: file,
          };
        });
    } catch (error) {
      logger.error('Failed to list evaluation files', error as Error);
      return [];
    }
  }

  /**
   * Calcula estatísticas agregadas de um CSV específico
   */
  async calculateStats(
    provider: string,
    model: string
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    avgExecutionTimeMs: number;
    totalCost: number;
    syntaxValidRate: number;
  }> {
    const logs = await this.readEvaluationCsv(provider, model);

    if (logs.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTimeMs: 0,
        totalCost: 0,
        syntaxValidRate: 0,
      };
    }

    const successfulExecutions = logs.filter((l) => l.execucao_sucesso_db).length;
    const validSyntax = logs.filter((l) => l.sintaxe_valida).length;

    return {
      totalExecutions: logs.length,
      successRate: successfulExecutions / logs.length,
      avgExecutionTimeMs:
        logs.reduce((sum, l) => sum + l.tempo_execucao_ms, 0) / logs.length,
      totalCost: logs.reduce((sum, l) => sum + l.custo_llm, 0),
      syntaxValidRate: validSyntax / logs.length,
    };
  }

  /**
   * Garante que diretórios necessários existem
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    if (!fs.existsSync(this.generatedQueriesDir)) {
      fs.mkdirSync(this.generatedQueriesDir, { recursive: true });
    }
  }

  /**
   * Normaliza nome de arquivo: provider-model.csv
   */
  private normalizeFileName(provider: string, model: string): string {
    const normalizedProvider = this.normalizeString(provider);
    const normalizedModel = this.normalizeString(model);
    return `${normalizedProvider}-${normalizedModel}.csv`;
  }

  /**
   * Normaliza string para usar em nome de arquivo
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Formata log como linha CSV
   */
  private formatCsvRow(log: QueryEvaluationLog): string {
    const escape = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const str = String(value);
      // Escapar aspas duplas e envolver em aspas se contém vírgula ou quebra de linha
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escape(log.timestamp),
      escape(log.query_gerada_id),
      escape(log.query_base_referencia_id),
      escape(log.tempo_execucao_ms),
      escape(log.custo_llm.toFixed(6)),
      escape(log.sintaxe_valida),
      escape(log.execucao_sucesso_db),
      escape(log.metadata?.provider || ''),
      escape(log.metadata?.model || ''),
      escape(log.metadata?.question || ''),
      escape(log.metadata?.rowCount || ''),
      escape(log.metadata?.errorMessage || ''),
    ].join(',') + '\n';
  }

  /**
   * Parse linha CSV para objeto
   */
  private parseCsvRow(row: string): QueryEvaluationLog {
    // Parse CSV básico (não lida com vírgulas dentro de aspas por simplicidade)
    const parts = row.split(',');

    return {
      timestamp: parts[0] || '',
      query_gerada_id: parts[1] || '',
      query_base_referencia_id: parseInt(parts[2] || '0', 10),
      tempo_execucao_ms: parseFloat(parts[3] || '0'),
      custo_llm: parseFloat(parts[4] || '0'),
      sintaxe_valida: parts[5] === 'true',
      execucao_sucesso_db: parts[6] === 'true',
      metadata: {
        provider: parts[7] || '',
        model: parts[8] || '',
        question: parts[9] || '',
        rowCount: parts[10] ? parseInt(parts[10], 10) : undefined,
        errorMessage: parts[11] || undefined,
      },
    };
  }
}

// Singleton instance
export const queryEvaluationLogger = new QueryEvaluationLogger();
