/**
 * SQL Validation Result
 */
export interface SQLValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * SQL Validator Service
 * Validates SQL queries to ensure they are safe SELECT-only statements
 */
class SQLValidator {
  // Dangerous SQL keywords that should be blocked
  private readonly dangerousKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'EXEC',
    'EXECUTE',
  ];

  /**
   * Validate SQL query
   * @param sql SQL query string to validate
   * @returns Validation result with valid flag and optional error message
   */
  public validateSQL(sql: string): SQLValidationResult {
    // Clean and normalize SQL
    const cleanSQL = sql.trim();

    // Check if SQL is empty
    if (!cleanSQL) {
      return {
        valid: false,
        error: 'SQL query is empty',
      };
    }

    // Check if SQL starts with SELECT or WITH (for CTEs - Common Table Expressions)
    const startsWithSelectOrWith = /^\s*(SELECT|WITH)\s+/i.test(cleanSQL);
    if (!startsWithSelectOrWith) {
      return {
        valid: false,
        error: 'SQL query must start with SELECT or WITH statement',
      };
    }

    // Check for dangerous keywords
    const upperSQL = cleanSQL.toUpperCase();
    for (const keyword of this.dangerousKeywords) {
      // Use word boundary regex to avoid false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(upperSQL)) {
        return {
          valid: false,
          error: `Dangerous SQL keyword detected: ${keyword}. Only SELECT queries are allowed.`,
        };
      }
    }

    // Check for multiple statements (semicolon followed by more SQL)
    const statements = cleanSQL.split(';').filter((s) => s.trim());
    if (statements.length > 1) {
      return {
        valid: false,
        error: 'Multiple SQL statements detected. Only single SELECT queries are allowed.',
      };
    }

    // Additional security checks
    const warnings: string[] = [];

    // Warn about comments (potential SQL injection vector)
    if (cleanSQL.includes('--') || cleanSQL.includes('/*')) {
      warnings.push('SQL contains comments. Please review carefully.');
    }

    // All checks passed
    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Clean SQL string by removing markdown code blocks and common prefixes
   * @param sql Raw SQL string potentially wrapped in markdown
   * @returns Cleaned SQL string
   */
  public cleanSQL(sql: string): string {
    let cleaned = sql.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```sql\n?/gi, '');
    cleaned = cleaned.replace(/```\n?/g, '');

    // Remove common prefixes
    cleaned = cleaned.replace(/^SQL Gerado:\s*/i, '');
    cleaned = cleaned.replace(/^Resposta:\s*/i, '');
    cleaned = cleaned.replace(/^Query:\s*/i, '');
    cleaned = cleaned.replace(/^SQL:\s*/i, '');

    return cleaned.trim();
  }
}

// Export singleton instance
export const sqlValidator = new SQLValidator();
