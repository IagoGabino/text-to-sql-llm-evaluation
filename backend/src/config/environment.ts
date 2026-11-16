import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(Number),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DATABASE_URL: z.string().optional(),
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  
  // LLM Configuration
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
});

// Validate environment variables
function validateEnv() {
  try {
    const validated = envSchema.parse(process.env);
    
    // Construct DATABASE_URL if not provided
    if (!validated.DATABASE_URL) {
      validated.DATABASE_URL = `postgresql://${validated.DB_USER}:${validated.DB_PASSWORD}@${validated.DB_HOST}:${validated.DB_PORT}/${validated.DB_NAME}`;
    }
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Export validated configuration
export const config = validateEnv();

// Export specific config objects
export const databaseConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  connectionString: config.DATABASE_URL,
};

export const serverConfig = {
  port: config.PORT,
  env: config.NODE_ENV,
  corsOrigin: config.CORS_ORIGIN,
};

export const loggingConfig = {
  level: config.LOG_LEVEL,
  filePath: path.resolve(process.cwd(), config.LOG_FILE_PATH),
};

export const llmConfig = {
  openRouterApiKey: config.OPENROUTER_API_KEY,
  ollamaBaseUrl: config.OLLAMA_BASE_URL,
};
