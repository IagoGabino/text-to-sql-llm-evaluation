import { Router, Request, Response, NextFunction } from 'express';
import { queryController } from '../controllers/query.controller';

/**
 * Query Routes
 * Endpoints for SQL generation and execution
 */
const router = Router();

/**
 * Middleware to validate query request
 */
function validateQueryRequest(req: Request, res: Response, next: NextFunction): void {
  const { question, provider, model } = req.body;

  // Validate question
  if (!question || typeof question !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Field "question" is required and must be a string',
    });
    return;
  }

  if (question.trim().length < 10) {
    res.status(400).json({
      success: false,
      error: 'Field "question" must be at least 10 characters long',
    });
    return;
  }

  // Validate provider
  if (!provider || typeof provider !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Field "provider" is required and must be a string',
    });
    return;
  }

  const validProviders = ['openrouter', 'ollama'];
  if (!validProviders.includes(provider)) {
    res.status(400).json({
      success: false,
      error: `Invalid provider "${provider}". Valid providers: ${validProviders.join(', ')}`,
    });
    return;
  }

  // Validate model
  if (!model || typeof model !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Field "model" is required and must be a string',
    });
    return;
  }

  // Validate model for specific provider
  if (provider === 'openrouter') {
    const validModels = [
      'openai/gpt-5-mini',
      'google/gemini-2.5-flash',
      'openai/gpt-oss-120b',
      'qwen/qwen3-32b'
    ];
    if (!validModels.includes(model)) {
      res.status(400).json({
        success: false,
        error: `Invalid model "${model}" for provider "openrouter". Valid models: ${validModels.join(', ')}`,
      });
      return;
    }
  }

  if (provider === 'ollama') {
    const validModels = ['duckdb-nsql', 'phi3:mini', 'llama2:7b'];
    if (!validModels.includes(model)) {
      res.status(400).json({
        success: false,
        error: `Invalid model "${model}" for provider "ollama". Valid models: ${validModels.join(', ')}`,
      });
      return;
    }
  }

  next();
}

/**
 * POST /api/query
 * Generate and execute SQL query from natural language question
 * 
 * Request Body:
 * {
 *   "question": string (min 10 chars),
 *   "provider": "openrouter" | "ollama",
 *   "model": string
 * }
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "generatedSQL": string,
 *   "executionResults": array,
 *   "rowCount": number,
 *   "executionTime": number,
 *   "metadata": {
 *     "model": string,
 *     "provider": string,
 *     "responseTime": number,
 *     "costEstimate": number,
 *     "promptTokens": number,
 *     "completionTokens": number,
 *     "totalTokens": number
 *   }
 * }
 */
router.post('/', validateQueryRequest, (req: Request, res: Response) => {
  queryController.handleQuery(req, res);
});

/**
 * GET /api/query/providers
 * Get available providers and their models
 * 
 * Response:
 * {
 *   "success": boolean,
 *   "providers": [
 *     {
 *       "name": string,
 *       "available": boolean,
 *       "models": string[]
 *     }
 *   ]
 * }
 */
router.get('/providers', (req: Request, res: Response) => {
  queryController.getProviders(req, res);
});

export default router;
