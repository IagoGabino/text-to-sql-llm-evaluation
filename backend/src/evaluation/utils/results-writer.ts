import fs from 'fs';
import path from 'path';
import { QueryEvaluationResult, ModelEvaluationSummary } from '../interfaces/evaluation-result.interface';

/**
 * Results Writer Service
 * 
 * Responsável por salvar resultados de avaliação em arquivos JSON
 * organizados por modelo
 */
export class ResultsWriter {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'logs', 'batch-results');
    this.ensureBaseDirectory();
  }

  /**
   * Salva o resultado de uma query individual
   * 
   * Estrutura: logs/batch-results/{modelId}/query-{questionId}.json
   */
  async saveQueryResult(
    modelId: string,
    result: QueryEvaluationResult
  ): Promise<string> {
    const modelDir = this.getModelDirectory(modelId);
    this.ensureDirectory(modelDir);

    const fileName = `query-${result.questionId}.json`;
    const filePath = path.join(modelDir, fileName);

    const jsonContent = JSON.stringify(result, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf8');

    return filePath;
  }

  /**
   * Salva o resumo da avaliação de um modelo
   * 
   * Estrutura: logs/batch-results/{modelId}/summary.json
   */
  async saveSummary(
    modelId: string,
    summary: ModelEvaluationSummary
  ): Promise<string> {
    const modelDir = this.getModelDirectory(modelId);
    this.ensureDirectory(modelDir);

    const fileName = 'summary.json';
    const filePath = path.join(modelDir, fileName);

    const jsonContent = JSON.stringify(summary, null, 2);
    fs.writeFileSync(filePath, jsonContent, 'utf8');

    return filePath;
  }

  /**
   * Lê o resultado de uma query específica
   */
  async readQueryResult(
    modelId: string,
    questionId: number
  ): Promise<QueryEvaluationResult | null> {
    const modelDir = this.getModelDirectory(modelId);
    const fileName = `query-${questionId}.json`;
    const filePath = path.join(modelDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as QueryEvaluationResult;
  }

  /**
   * Lê o resumo de um modelo
   */
  async readSummary(modelId: string): Promise<ModelEvaluationSummary | null> {
    const modelDir = this.getModelDirectory(modelId);
    const fileName = 'summary.json';
    const filePath = path.join(modelDir, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as ModelEvaluationSummary;
  }

  /**
   * Lista todos os modelos que possuem resultados salvos
   */
  listEvaluatedModels(): string[] {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }

    return fs
      .readdirSync(this.baseDir)
      .filter((item) => {
        const itemPath = path.join(this.baseDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
  }

  /**
   * Lista todos os resultados de queries de um modelo
   */
  listQueryResults(modelId: string): number[] {
    const modelDir = this.getModelDirectory(modelId);

    if (!fs.existsSync(modelDir)) {
      return [];
    }

    return fs
      .readdirSync(modelDir)
      .filter((file) => file.startsWith('query-') && file.endsWith('.json'))
      .map((file) => {
        const match = file.match(/query-(\d+)\.json/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((id) => id > 0)
      .sort((a, b) => a - b);
  }

  /**
   * Remove todos os resultados de um modelo
   */
  clearModelResults(modelId: string): void {
    const modelDir = this.getModelDirectory(modelId);

    if (fs.existsSync(modelDir)) {
      fs.rmSync(modelDir, { recursive: true, force: true });
    }
  }

  /**
   * Remove todos os resultados de avaliação
   */
  clearAllResults(): void {
    if (fs.existsSync(this.baseDir)) {
      fs.rmSync(this.baseDir, { recursive: true, force: true });
      this.ensureBaseDirectory();
    }
  }

  /**
   * Obtém o diretório de um modelo específico
   */
  private getModelDirectory(modelId: string): string {
    return path.join(this.baseDir, modelId);
  }

  /**
   * Garante que o diretório base existe
   */
  private ensureBaseDirectory(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Garante que um diretório específico existe
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Singleton instance
export const resultsWriter = new ResultsWriter();
