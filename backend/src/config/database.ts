import { Pool, PoolConfig } from 'pg';
import { databaseConfig } from './environment';

/**
 * PostgreSQL Connection Pool
 * Manages database connections with proper resource pooling
 */
class DatabaseConnection {
  private pool: Pool | null = null;
  private isConnected = false;

  /**
   * Initialize the connection pool
   */
  public async connect(): Promise<void> {
    if (this.pool) {
      console.log('⚠️  Database pool already initialized');
      return;
    }

    const poolConfig: PoolConfig = {
      host: databaseConfig.host,
      port: databaseConfig.port,
      database: databaseConfig.database,
      user: databaseConfig.user,
      password: databaseConfig.password,
      max: 20, // Maximum number of connections in pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 5000, // Timeout after 5 seconds if connection can't be established
    };

    try {
      this.pool = new Pool(poolConfig);

      // Test the connection
      await this.testConnection();

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('❌ Unexpected database pool error:', err);
      });

      this.isConnected = true;
      console.log('✅ Database connection pool initialized successfully');
      console.log(`   Host: ${databaseConfig.host}:${databaseConfig.port}`);
      console.log(`   Database: ${databaseConfig.database}`);
    } catch (error) {
      console.error('❌ Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      client.release();

      console.log('✅ Database connection test successful');
      console.log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(',')[0]}`);
      console.log(`   Server Time: ${result.rows[0].current_time}`);
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      throw error;
    }
  }

  /**
   * Get the pool instance
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Check if database is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Close all connections in the pool
   */
  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('✅ Database connection pool closed');
    }
  }

  /**
   * Execute a query with automatic connection handling
   */
  public async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const pool = this.getPool();
    const result = await pool.query(text, params);
    return result.rows;
  }

  /**
   * Get connection pool statistics
   */
  public getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const database = new DatabaseConnection();

// Export pool getter for direct access
export const getPool = () => database.getPool();
