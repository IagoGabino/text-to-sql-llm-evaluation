import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { serverConfig } from './config/environment';
import { database } from './config/database';
import queryRoutes from './routes/query.routes';
import testRoutes from './routes/test.routes';
import evaluationRoutes from './routes/evaluation.routes';

/**
 * Initialize Express application with middleware and configuration
 */
export function createApp(): Application {
  const app = express();

  // ===================================
  // MIDDLEWARE SETUP
  // ===================================

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  app.use(
    cors({
      origin: serverConfig.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // HTTP request logging
  if (serverConfig.env === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ===================================
  // ROUTES
  // ===================================

  // Health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      const dbStatus = database.getConnectionStatus();
      const poolStats = database.getPoolStats();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: serverConfig.env,
        database: {
          connected: dbStatus,
          pool: poolStats,
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Service unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Root endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'LLM SQL Evaluation API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        query: '/api/query',
        metrics: '/api/metrics',
        test: '/api/test',
      },
    });
  });

  // ===================================
  // API ROUTES
  // ===================================
  app.use('/api/query', queryRoutes);
  app.use('/api/test', testRoutes);
  app.use('/api/evaluation', evaluationRoutes);
  // app.use('/api/metrics', metricsRoutes); // TODO: Implement metrics routes

  // ===================================
  // ERROR HANDLING
  // ===================================

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: 'Endpoint not found',
      path: req.path,
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Unhandled error:', err);

    res.status(500).json({
      status: 'error',
      message: serverConfig.env === 'development' ? err.message : 'Internal server error',
      ...(serverConfig.env === 'development' && { stack: err.stack }),
    });
  });

  return app;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await database.connect();

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(serverConfig.port, () => {
      console.log('');
      console.log('🚀 Server started successfully!');
      console.log(`   Environment: ${serverConfig.env}`);
      console.log(`   Port: ${serverConfig.port}`);
      console.log(`   URL: http://localhost:${serverConfig.port}`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   GET  /health                            - Health check`);
      console.log(`   GET  /                                  - API information`);
      console.log(`   POST /api/query                         - Generate and execute SQL`);
      console.log(`   GET  /api/query/providers               - List available providers`);
      console.log(`   POST /api/test/generate                 - Test SQL generation (no execution)`);
      console.log(`   GET  /api/evaluation/references         - List reference queries`);
      console.log(`   POST /api/evaluation/references         - Create reference query`);
      console.log(`   GET  /api/evaluation/stats              - View evaluation statistics`);
      console.log(`   GET  /api/evaluation/logs/:provider/:model - View evaluation logs`);
      console.log('');
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('\n⚠️  Shutdown signal received, closing server...');
      
      server.close(() => {
        console.log('✅ HTTP server closed');
      });

      await database.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}
