import { database } from '../config/database';

/**
 * Database table column information
 */
interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyReference?: string;
}

/**
 * Database table information
 */
interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: string[];
  comment?: string;
}

/**
 * Database schema structure
 */
export interface DatabaseSchema {
  tables: TableInfo[];
  relationships: Array<{
    from: string;
    to: string;
    column: string;
  }>;
}

/**
 * Schema loader utility
 * Extracts and formats database schema information for LLM context
 */
class SchemaLoader {
  private cachedSchema: DatabaseSchema | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Load complete database schema
   */
  public async loadSchema(forceRefresh: boolean = false): Promise<DatabaseSchema> {
    // Return cached schema if available and not expired
    if (
      !forceRefresh &&
      this.cachedSchema &&
      Date.now() - this.cacheTimestamp < this.cacheTTL
    ) {
      return this.cachedSchema;
    }

    const tables = await this.loadTables();
    const relationships = await this.loadRelationships();

    this.cachedSchema = {
      tables,
      relationships,
    };
    this.cacheTimestamp = Date.now();

    return this.cachedSchema;
  }

  /**
   * Load all tables with their columns and metadata
   */
  private async loadTables(): Promise<TableInfo[]> {
    const query = `
      SELECT 
        t.table_name,
        obj_description(pgc.oid) as table_comment
      FROM information_schema.tables t
      LEFT JOIN pg_catalog.pg_class pgc ON pgc.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    const tableRows = await database.query<{
      table_name: string;
      table_comment: string | null;
    }>(query);

    const tables: TableInfo[] = [];

    for (const row of tableRows) {
      const columns = await this.loadColumns(row.table_name);
      const indexes = await this.loadIndexes(row.table_name);

      tables.push({
        name: row.table_name,
        columns,
        indexes,
        comment: row.table_comment || undefined,
      });
    }

    return tables;
  }

  /**
   * Load columns for a specific table
   */
  private async loadColumns(tableName: string): Promise<ColumnInfo[]> {
    const query = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        (
          SELECT COUNT(*) > 0
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = c.table_name
            AND ccu.column_name = c.column_name
            AND tc.constraint_type = 'PRIMARY KEY'
        ) as is_primary_key,
        (
          SELECT COUNT(*) > 0
          FROM information_schema.table_constraints tc
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = c.table_name
            AND ccu.column_name = c.column_name
            AND tc.constraint_type = 'FOREIGN KEY'
        ) as is_foreign_key
      FROM information_schema.columns c
      WHERE c.table_name = $1
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position;
    `;

    const rows = await database.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      is_primary_key: boolean;
      is_foreign_key: boolean;
    }>(query, [tableName]);

    const columns: ColumnInfo[] = [];

    for (const row of rows) {
      const column: ColumnInfo = {
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
      };

      if (row.is_foreign_key) {
        const fkReference = await this.getForeignKeyReference(tableName, row.column_name);
        column.foreignKeyReference = fkReference;
      }

      columns.push(column);
    }

    return columns;
  }

  /**
   * Get foreign key reference for a column
   */
  private async getForeignKeyReference(tableName: string, columnName: string): Promise<string> {
    const query = `
      SELECT 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND kcu.column_name = $2;
    `;

    const rows = await database.query<{
      foreign_table_name: string;
      foreign_column_name: string;
    }>(query, [tableName, columnName]);

    if (rows.length > 0) {
      return `${rows[0].foreign_table_name}(${rows[0].foreign_column_name})`;
    }

    return '';
  }

  /**
   * Load indexes for a specific table
   */
  private async loadIndexes(tableName: string): Promise<string[]> {
    const query = `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = $1
        AND schemaname = 'public'
      ORDER BY indexname;
    `;

    const rows = await database.query<{ indexname: string }>(query, [tableName]);
    return rows.map((row) => row.indexname);
  }

  /**
   * Load all foreign key relationships
   */
  private async loadRelationships(): Promise<
    Array<{
      from: string;
      to: string;
      column: string;
    }>
  > {
    const query = `
      SELECT 
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `;

    const rows = await database.query<{
      from_table: string;
      from_column: string;
      to_table: string;
    }>(query);

    return rows.map((row) => ({
      from: row.from_table,
      to: row.to_table,
      column: row.from_column,
    }));
  }

  /**
   * Format schema as human-readable text for LLM prompts
   */
  public formatSchemaForLLM(schema: DatabaseSchema): string {
    let output = 'DATABASE SCHEMA:\n\n';

    // Add tables
    for (const table of schema.tables) {
      output += `Table: ${table.name}\n`;
      if (table.comment) {
        output += `  Description: ${table.comment}\n`;
      }

      output += '  Columns:\n';
      for (const col of table.columns) {
        let line = `    - ${col.name} (${col.type})`;

        const attributes: string[] = [];
        if (col.isPrimaryKey) attributes.push('PRIMARY KEY');
        if (col.isForeignKey && col.foreignKeyReference) {
          attributes.push(`FK → ${col.foreignKeyReference}`);
        }
        if (!col.nullable) attributes.push('NOT NULL');

        if (attributes.length > 0) {
          line += ` [${attributes.join(', ')}]`;
        }

        output += line + '\n';
      }

      if (table.indexes.length > 0) {
        output += '  Indexes:\n';
        for (const idx of table.indexes) {
          output += `    - ${idx}\n`;
        }
      }

      output += '\n';
    }

    // Add relationships summary
    if (schema.relationships.length > 0) {
      output += 'RELATIONSHIPS:\n';
      for (const rel of schema.relationships) {
        output += `  ${rel.from}.${rel.column} → ${rel.to}\n`;
      }
      output += '\n';
    }

    return output;
  }

  /**
   * Clear cached schema
   */
  public clearCache(): void {
    this.cachedSchema = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton instance
export const schemaLoader = new SchemaLoader();
