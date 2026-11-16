import { getPool } from '../../config/database';

/**
 * PostgreSQL Error
 */
interface PgError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
}

/**
 * SQL Execution Result
 */
export interface SQLExecutionResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number; // in milliseconds
}

/**
 * SQL Executor Service
 * Executes SQL queries safely with timeout and error handling
 */
class SQLExecutor {
  private readonly defaultTimeout = 10000; // 10 seconds

  /**
   * Execute a SQL query
   * @param sql SQL query to execute
   * @param timeout Query timeout in milliseconds (default: 10000)
   * @returns Execution result with rows, count, and timing
   */
  public async executeQuery(
    sql: string,
    timeout: number = this.defaultTimeout
  ): Promise<SQLExecutionResult> {
    const startTime = Date.now();

    try {
      // Execute query with timeout
      const result = await this.executeWithTimeout(sql, timeout);
      const executionTime = Date.now() - startTime;

      return {
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Format PostgreSQL errors
      if (error instanceof Error) {
        const pgError = error as PgError;
        
        // Check if it's a PostgreSQL error
        if (pgError.code) {
          throw new Error(
            `PostgreSQL Error (${pgError.code}): ${pgError.message}` +
            (pgError.detail ? `\nDetail: ${pgError.detail}` : '') +
            (pgError.hint ? `\nHint: ${pgError.hint}` : '')
          );
        }

        // Check for timeout
        if (error.message.includes('timeout') || error.message.includes('Query read timeout')) {
          throw new Error(
            `Query execution timeout after ${timeout}ms. ` +
            `Execution time: ${executionTime}ms`
          );
        }

        throw error;
      }

      throw new Error(`Unknown error executing SQL query: ${String(error)}`);
    }
  }

  /**
   * Execute query with timeout
   * @param sql SQL query
   * @param timeout Timeout in milliseconds
   * @returns Query result
   */
  private async executeWithTimeout(sql: string, timeout: number): Promise<{
    rows: Record<string, unknown>[];
    rowCount: number;
  }> {
    return new Promise((resolve, reject) => {
      // Set timeout
      const timer = setTimeout(() => {
        reject(new Error(`Query execution timeout after ${timeout}ms`));
      }, timeout);

      // Execute query using pool directly
      const pool = getPool();
      pool
        .query(sql)
        .then((result) => {
          clearTimeout(timer);
          resolve({
            rows: result.rows,
            rowCount: result.rowCount || 0,
          });
        })
        .catch((error: Error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Get query execution plan (EXPLAIN)
   * Useful for debugging slow queries
   * @param sql SQL query to explain
   * @returns Execution plan
   */
  public async explainQuery(sql: string): Promise<Record<string, unknown>[]> {
    try {
      const explainSQL = `EXPLAIN (FORMAT JSON) ${sql}`;
      const pool = getPool();
      const result = await pool.query(explainSQL);
      return result.rows;
    } catch (error) {
      throw new Error(
        `Failed to get execution plan: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
export const sqlExecutor = new SQLExecutor();
