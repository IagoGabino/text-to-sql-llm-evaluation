import { DatabaseSchema } from '../../utils/schema-loader';

/**
 * PromptBuilder Service
 * Constructs prompts for LLM models to generate SQL queries based on database schema
 */
class PromptBuilder {
  /**
   * Build a prompt for SQL generation based on user question and database schema
   * @param question User's natural language question
   * @param schema Database schema structure
   * @returns Formatted prompt string for LLM
   */
  public buildPrompt(question: string, schema: DatabaseSchema): string {
    const schemaFormatted = this.formatSchema(schema);

    return `You are a PostgreSQL SQL expert. Generate ONLY a SELECT query.

DATABASE SCHEMA:
${schemaFormatted}

RULES:
- Use ONLY SELECT statements (WITH clauses for CTEs are allowed)
- NO INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE
- Return only the SQL query, no explanations or additional text, even if the query is complex, i want only the SQL query
- Query must start with SELECT or WITH and end with a semicolon (;)
- Use PostgreSQL syntax
- Use proper JOINs when needed
- Use appropriate WHERE clauses for filtering
- Use aggregate functions (COUNT, SUM, AVG, etc.) when appropriate
- Use ORDER BY and LIMIT when relevant
- For floating-point numbers (DECIMAL, NUMERIC, REAL, DOUBLE PRECISION), always use ROUND() to 3 decimal places
  Example: SELECT ROUND(price, 3) instead of SELECT price
  Example: SELECT ROUND(AVG(amount), 3) instead of SELECT AVG(amount)
- DO NOT USE COLUMNS THAT DO NOT EXIST IN THE SCHEMA
- Names of countries are not supposed to be abbreviated

USER QUESTION: ${question}

Do NOT explain the query. 
Do NOT give me any additional text or notes.
Do NOT add text before or after.
Output ONLY a SQL query.
NO EXPLANATION OR NOTES — ABSOLUTELY NONE`;
  }

  /**
   * Format database schema into readable text for LLM context
   * @param schema Database schema structure
   * @returns Formatted schema string
   */
  private formatSchema(schema: DatabaseSchema): string {
    let formatted = '';

    // Format tables
    for (const table of schema.tables) {
      formatted += `\nTABLE: ${table.name}\n`;
      
      if (table.comment) {
        formatted += `  Description: ${table.comment}\n`;
      }

      formatted += '  Columns:\n';
      for (const column of table.columns) {
        const pkMarker = column.isPrimaryKey ? ' [PRIMARY KEY]' : '';
        const fkMarker = column.isForeignKey && column.foreignKeyReference 
          ? ` [FOREIGN KEY -> ${column.foreignKeyReference}]` 
          : '';
        const nullableMarker = column.nullable ? ' (nullable)' : ' (not null)';
        
        formatted += `    - ${column.name}: ${column.type}${nullableMarker}${pkMarker}${fkMarker}\n`;
      }

      if (table.indexes.length > 0) {
        formatted += '  Indexes:\n';
        for (const index of table.indexes) {
          formatted += `    - ${index}\n`;
        }
      }

      formatted += '\n';
    }

    // Format relationships
    if (schema.relationships.length > 0) {
      formatted += 'RELATIONSHIPS:\n';
      for (const rel of schema.relationships) {
        formatted += `  - ${rel.from} -> ${rel.to} (via ${rel.column})\n`;
      }
    }

    return formatted;
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
