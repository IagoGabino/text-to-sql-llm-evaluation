import fs from 'fs';
import path from 'path';
import { logger } from './logger.service';

/**
 * Estrutura de uma query de referência
 */
export interface QueryReference {
  /** ID único da query de referência */
  id: number;

  /** Nome/descrição da query */
  name: string;

  /** Descrição em linguagem natural do que a query faz */
  description: string;

  /** SQL da query de referência (feita manualmente) */
  sql: string;

  /** Categoria da query (ex: "listagem", "agregação", "join") */
  category?: string;

  /** Tags para facilitar busca */
  tags?: string[];

  /** Data de criação */
  createdAt: string;

  /** Data de última atualização */
  updatedAt?: string;
}

/**
 * Query Reference Service
 * Gerencia queries de referência criadas manualmente para comparação/avaliação
 * Queries são armazenadas em arquivos .sql no diretório reference-queries/
 */
export class QueryReferenceService {
  private referenceQueriesDir: string;
  private metadataFile: string;

  constructor() {
    this.referenceQueriesDir = path.join(
      process.cwd(),
      'logs',
      'reference-queries'
    );
    this.metadataFile = path.join(this.referenceQueriesDir, 'metadata.json');

    // Garantir que diretório existe
    this.ensureDirectory();
  }

  /**
   * Cria uma nova query de referência
   */
  async createReference(reference: Omit<QueryReference, 'id' | 'createdAt'>): Promise<QueryReference> {
    try {
      const metadata = await this.loadMetadata();

      // Gerar próximo ID
      const nextId = metadata.length > 0
        ? Math.max(...metadata.map((r) => r.id)) + 1
        : 1;

      const newReference: QueryReference = {
        ...reference,
        id: nextId,
        createdAt: new Date().toISOString(),
      };

      // Salvar arquivo SQL
      const sqlFileName = `query_${nextId}.sql`;
      const sqlFilePath = path.join(this.referenceQueriesDir, sqlFileName);
      fs.writeFileSync(sqlFilePath, reference.sql, 'utf8');

      // Adicionar metadata
      metadata.push(newReference);
      await this.saveMetadata(metadata);

      logger.info('Query reference created', { id: nextId, name: reference.name });

      return newReference;
    } catch (error) {
      logger.error('Failed to create query reference', error as Error);
      throw error;
    }
  }

  /**
   * Atualiza uma query de referência existente
   */
  async updateReference(
    id: number,
    updates: Partial<Omit<QueryReference, 'id' | 'createdAt'>>
  ): Promise<QueryReference> {
    try {
      const metadata = await this.loadMetadata();
      const index = metadata.findIndex((r) => r.id === id);

      if (index === -1) {
        throw new Error(`Query reference with id ${id} not found`);
      }

      // Atualizar metadata
      const updated: QueryReference = {
        ...metadata[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      metadata[index] = updated;

      // Atualizar arquivo SQL se necessário
      if (updates.sql) {
        const sqlFileName = `query_${id}.sql`;
        const sqlFilePath = path.join(this.referenceQueriesDir, sqlFileName);
        fs.writeFileSync(sqlFilePath, updates.sql, 'utf8');
      }

      await this.saveMetadata(metadata);

      logger.info('Query reference updated', { id, updates });

      return updated;
    } catch (error) {
      logger.error('Failed to update query reference', error as Error);
      throw error;
    }
  }

  /**
   * Busca uma query de referência por ID
   */
  async getReference(id: number): Promise<QueryReference | null> {
    try {
      const metadata = await this.loadMetadata();
      const reference = metadata.find((r) => r.id === id);

      if (!reference) {
        return null;
      }

      // Carregar SQL do arquivo
      const sqlFileName = `query_${id}.sql`;
      const sqlFilePath = path.join(this.referenceQueriesDir, sqlFileName);

      if (fs.existsSync(sqlFilePath)) {
        reference.sql = fs.readFileSync(sqlFilePath, 'utf8');
      }

      return reference;
    } catch (error) {
      logger.error('Failed to get query reference', error as Error);
      return null;
    }
  }

  /**
   * Lista todas as queries de referência
   */
  async listReferences(filters?: {
    category?: string;
    tags?: string[];
  }): Promise<QueryReference[]> {
    try {
      let metadata = await this.loadMetadata();

      // Aplicar filtros
      if (filters?.category) {
        metadata = metadata.filter((r) => r.category === filters.category);
      }

      if (filters?.tags && filters.tags.length > 0) {
        metadata = metadata.filter((r) =>
          r.tags?.some((tag) => filters.tags?.includes(tag))
        );
      }

      return metadata;
    } catch (error) {
      logger.error('Failed to list query references', error as Error);
      return [];
    }
  }

  /**
   * Deleta uma query de referência
   */
  async deleteReference(id: number): Promise<boolean> {
    try {
      const metadata = await this.loadMetadata();
      const index = metadata.findIndex((r) => r.id === id);

      if (index === -1) {
        return false;
      }

      // Remover do metadata
      metadata.splice(index, 1);
      await this.saveMetadata(metadata);

      // Remover arquivo SQL
      const sqlFileName = `query_${id}.sql`;
      const sqlFilePath = path.join(this.referenceQueriesDir, sqlFileName);

      if (fs.existsSync(sqlFilePath)) {
        fs.unlinkSync(sqlFilePath);
      }

      logger.info('Query reference deleted', { id });

      return true;
    } catch (error) {
      logger.error('Failed to delete query reference', error as Error);
      return false;
    }
  }

  /**
   * Busca query de referência que melhor corresponde a uma questão
   * Usa correspondência simples de palavras-chave
   */
  async findMatchingReference(question: string): Promise<QueryReference | null> {
    try {
      const references = await this.listReferences();

      if (references.length === 0) {
        return null;
      }

      const questionLower = question.toLowerCase();

      // Calcular score de relevância para cada referência
      const scored = references.map((ref) => {
        let score = 0;

        // Verificar descrição
        const descLower = ref.description.toLowerCase();
        const words = questionLower.split(/\s+/);

        for (const word of words) {
          if (word.length > 3 && descLower.includes(word)) {
            score += 1;
          }
        }

        // Verificar tags
        if (ref.tags) {
          for (const tag of ref.tags) {
            if (questionLower.includes(tag.toLowerCase())) {
              score += 2;
            }
          }
        }

        return { reference: ref, score };
      });

      // Ordenar por score
      scored.sort((a, b) => b.score - a.score);

      // Retornar melhor match se tiver score > 0
      if (scored[0].score > 0) {
        logger.debug('Found matching reference', {
          questionId: scored[0].reference.id,
          score: scored[0].score,
        });
        return scored[0].reference;
      }

      return null;
    } catch (error) {
      logger.error('Failed to find matching reference', error as Error);
      return null;
    }
  }

  /**
   * Inicializa queries de referência padrão para demonstração
   */
  async initializeDefaultReferences(): Promise<void> {
    try {
      const existing = await this.loadMetadata();

      if (existing.length > 0) {
        logger.info('Reference queries already initialized');
        return;
      }

      // Queries de referência padrão baseadas no esquema do projeto
      const defaultReferences: Array<Omit<QueryReference, 'id' | 'createdAt'>> = [
        {
          name: 'Listar todos os produtos',
          description: 'Lista todos os produtos com suas informações básicas',
          sql: 'SELECT * FROM products ORDER BY created_at DESC LIMIT 100;',
          category: 'listagem',
          tags: ['produtos', 'listar', 'products'],
        },
        {
          name: 'Contar pedidos por status',
          description: 'Conta o número de pedidos agrupados por status',
          sql: `SELECT 
  status, 
  COUNT(*) as total,
  SUM(total_amount) as total_value
FROM orders 
GROUP BY status 
ORDER BY total DESC;`,
          category: 'agregação',
          tags: ['pedidos', 'orders', 'count', 'status'],
        },
        {
          name: 'Clientes com mais pedidos',
          description: 'Lista os clientes que fizeram mais pedidos',
          sql: `SELECT 
  c.id,
  c.name,
  c.email,
  COUNT(o.id) as total_orders,
  SUM(o.total_amount) as total_spent
FROM customers c
INNER JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email
ORDER BY total_orders DESC
LIMIT 10;`,
          category: 'join',
          tags: ['clientes', 'customers', 'pedidos', 'orders', 'top'],
        },
        {
          name: 'Produtos mais vendidos',
          description: 'Lista os produtos mais vendidos com quantidade total',
          sql: `SELECT 
  p.id,
  p.name,
  p.category,
  SUM(oi.quantity) as total_sold,
  SUM(oi.quantity * oi.unit_price) as total_revenue
FROM products p
INNER JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id, p.name, p.category
ORDER BY total_sold DESC
LIMIT 20;`,
          category: 'join',
          tags: ['produtos', 'products', 'vendas', 'sales', 'top'],
        },
      ];

      for (const ref of defaultReferences) {
        await this.createReference(ref);
      }

      logger.info('Default reference queries initialized', {
        count: defaultReferences.length,
      });
    } catch (error) {
      logger.error('Failed to initialize default references', error as Error);
    }
  }

  /**
   * Garante que diretório existe
   */
  private ensureDirectory(): void {
    if (!fs.existsSync(this.referenceQueriesDir)) {
      fs.mkdirSync(this.referenceQueriesDir, { recursive: true });
    }
  }

  /**
   * Carrega metadata de todas as queries de referência
   */
  private async loadMetadata(): Promise<QueryReference[]> {
    try {
      if (!fs.existsSync(this.metadataFile)) {
        return [];
      }

      const content = fs.readFileSync(this.metadataFile, 'utf8');
      return JSON.parse(content) as QueryReference[];
    } catch (error) {
      logger.error('Failed to load query reference metadata', error as Error);
      return [];
    }
  }

  /**
   * Salva metadata de queries de referência
   */
  private async saveMetadata(metadata: QueryReference[]): Promise<void> {
    try {
      const content = JSON.stringify(metadata, null, 2);
      fs.writeFileSync(this.metadataFile, content, 'utf8');
    } catch (error) {
      logger.error('Failed to save query reference metadata', error as Error);
      throw error;
    }
  }
}

// Singleton instance
export const queryReferenceService = new QueryReferenceService();
