import { Router, Request, Response } from 'express';
import { queryReferenceService } from '../services/logging/query-reference.service';
import { queryEvaluationLogger } from '../services/logging/query-evaluation-logger.service';

const router = Router();

/**
 * GET /api/evaluation/references
 * Lista todas as queries de referência
 */
router.get('/references', async (_req: Request, res: Response) => {
  try {
    const references = await queryReferenceService.listReferences();
    
    res.json({
      success: true,
      count: references.length,
      references,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to list references: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/evaluation/references/:id
 * Busca uma query de referência específica
 */
router.get('/references/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid reference ID',
      });
      return;
    }

    const reference = await queryReferenceService.getReference(id);
    
    if (!reference) {
      res.status(404).json({
        success: false,
        error: `Reference with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      reference,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to get reference: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * POST /api/evaluation/references
 * Cria uma nova query de referência
 */
router.post('/references', async (req: Request, res: Response) => {
  try {
    const { name, description, sql, category, tags } = req.body;

    if (!name || !description || !sql) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, sql',
      });
      return;
    }

    const reference = await queryReferenceService.createReference({
      name,
      description,
      sql,
      category,
      tags,
    });

    res.status(201).json({
      success: true,
      reference,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to create reference: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * PUT /api/evaluation/references/:id
 * Atualiza uma query de referência
 */
router.put('/references/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid reference ID',
      });
      return;
    }

    const { name, description, sql, category, tags } = req.body;

    const reference = await queryReferenceService.updateReference(id, {
      name,
      description,
      sql,
      category,
      tags,
    });

    res.json({
      success: true,
      reference,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to update reference: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * DELETE /api/evaluation/references/:id
 * Deleta uma query de referência
 */
router.delete('/references/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid reference ID',
      });
      return;
    }

    const deleted = await queryReferenceService.deleteReference(id);
    
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: `Reference with id ${id} not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: `Reference ${id} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to delete reference: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * POST /api/evaluation/references/initialize
 * Inicializa queries de referência padrão
 */
router.post('/references/initialize', async (_req: Request, res: Response) => {
  try {
    await queryReferenceService.initializeDefaultReferences();
    
    res.json({
      success: true,
      message: 'Default reference queries initialized',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to initialize references: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/evaluation/stats
 * Lista estatísticas de todos os arquivos CSV de avaliação
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const files = queryEvaluationLogger.listEvaluationFiles();
    
    const allStats = await Promise.all(
      files.map(async (file) => {
        const stats = await queryEvaluationLogger.calculateStats(
          file.provider,
          file.model
        );
        return {
          provider: file.provider,
          model: file.model,
          fileName: file.fileName,
          ...stats,
        };
      })
    );

    res.json({
      success: true,
      count: allStats.length,
      stats: allStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to calculate stats: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/evaluation/stats/:provider/:model
 * Obtém estatísticas de um provider/modelo específico
 */
router.get('/stats/:provider/:model', async (req: Request, res: Response) => {
  try {
    const { provider, model } = req.params;

    const stats = await queryEvaluationLogger.calculateStats(provider, model);

    res.json({
      success: true,
      provider,
      model,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to calculate stats: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

/**
 * GET /api/evaluation/logs/:provider/:model
 * Obtém todos os logs de avaliação de um provider/modelo
 */
router.get('/logs/:provider/:model', async (req: Request, res: Response) => {
  try {
    const { provider, model } = req.params;

    const logs = await queryEvaluationLogger.readEvaluationCsv(provider, model);

    res.json({
      success: true,
      provider,
      model,
      count: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to read logs: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;
