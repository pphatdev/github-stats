/**
 * Application Entry Point (Refactored)
 * Initializes and starts the GitHub Stats API server
 * 
 * Architecture follows clean code principles with:
 * - Dependency injection
 * - Service layer abstraction
 * - Centralized error handling
 * - Structured logging
 * - Health checks and monitoring
 */

import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Config and Common
import { getConfig } from './config/index.js';
import { createLogger } from './common/logger.js';

// Services
import { GitHubService } from './services/github.service.js';
import { MemoryCacheService, HybridCacheService } from './services/cache.service.js';
import { getServiceContainer } from './services/base.js';

// Middleware
import { errorHandler, notFoundHandler, requestLogger, asyncHandler } from './middleware/error.middleware.js';

// Controllers
import { StatsController } from './controllers/stats.js';
import { LanguageController } from './controllers/languages.js';
import { GraphController } from './controllers/graph.js';
import { BadgeController } from './controllers/badge.js';
import {
    healthCheck,
    livenessProbe,
    readinessProbe,
    metrics,
    initializeHealthCheck
} from './controllers/health.controller.js';

// Routes
import { registerCachedRoutes } from './routes/redis-cached-routes.js';

// Initialize logger
const logger = createLogger({ service: 'Application' });

// Get configuration
const config = getConfig();

// Directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

/**
 * Initialize services
 */
async function initializeServices() {
    logger.info('Initializing services...');

    const container = getServiceContainer();

    // Initialize cache service (hybrid: Redis with memory fallback)
    const memoryCache = new MemoryCacheService();
    const cacheService = new HybridCacheService(memoryCache);

    try {
        await cacheService.initialize();
        container.register('cache', cacheService);
        logger.info('Cache service initialized', {
            type: cacheService.isUsingRedis() ? 'Redis' : 'Memory'
        });
    } catch (error) {
        logger.warn('Failed to initialize hybrid cache, using memory only', {
            error: (error as Error).message
        });
        container.register('cache', memoryCache);
    }

    // Initialize GitHub service
    const githubService = new GitHubService(config.github.token);
    container.register('github', githubService);
    logger.info('GitHub service initialized', {
        hasToken: !!config.github.token
    });

    // Initialize health check with cache service
    const cache = container.get<any>('cache');
    initializeHealthCheck(cache);

    return container;
}

/**
 * Setup Express application
 */
function setupApplication(container: ReturnType<typeof getServiceContainer>): Application {
    const app = express();

    // Basic middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use(requestLogger(logger));

    // Static files
    app.use(express.static(publicDir));
    app.use('/public', express.static(publicDir));

    // Health check endpoints
    app.get('/health', asyncHandler(healthCheck));
    app.get('/health/live', livenessProbe);
    app.get('/health/ready', asyncHandler(readinessProbe));
    app.get('/metrics', metrics);

    // API documentation endpoint
    app.get('/', (req, res) => {
        const routes = [
            { method: 'GET', path: '/health', description: 'Health check endpoint' },
            { method: 'GET', path: '/health/live', description: 'Liveness probe' },
            { method: 'GET', path: '/health/ready', description: 'Readiness probe' },
            { method: 'GET', path: '/metrics', description: 'Application metrics' },
            { method: 'GET', path: '/stats', description: 'User statistics card' },
            { method: 'GET', path: '/languages', description: 'User languages card' },
            { method: 'GET', path: '/graph', description: 'User contribution graph' },
            { method: 'GET', path: '/badge/*', description: 'User badges' },
        ];

        res.json({
            name: 'GitHub Stats API',
            version: '2.0.0',
            description: 'Generate dynamic GitHub stats cards and badges',
            environment: config.server.env,
            routes,
            documentation: '/api-docs',
            examples: {
                stats: `${config.server.protocol}://localhost:${config.server.port}/stats?username=pphatdev&theme=dark`,
                languages: `${config.server.protocol}://localhost:${config.server.port}/languages?username=pphatdev`,
                badge: `${config.server.protocol}://localhost:${config.server.port}/badge/total-stars?username=pphatdev`,
            },
        });
    });

    // Initialize controllers (legacy initialization - TODO: refactor to use DI)
    const githubService = container.get<GitHubService>('github');
    const legacyCache = new Map<string, { data: string; timestamp: number }>();

    StatsController.initialize(githubService as any, legacyCache, config.cache.duration);
    LanguageController.initialize(githubService as any, legacyCache, config.cache.duration);
    GraphController.initialize(githubService as any, legacyCache, config.cache.duration);
    BadgeController.initialize(githubService as any, legacyCache, config.cache.duration);

    // Register API routes
    registerCachedRoutes(app);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler(logger));

    return app;
}

/**
 * Start the server
 */
async function startServer(app: Application, container: ReturnType<typeof getServiceContainer>) {
    const { server: { port, protocol, env } } = config;

    const httpServer = app.listen(port, () => {
        logger.info('Server started', {
            port,
            protocol,
            environment: env,
            url: `${protocol}://localhost:${port}`,
        });

        // Log service status
        const cacheService = container.get<any>('cache');
        logger.info('Service status', {
            cache: cacheService.isUsingRedis ? cacheService.isUsingRedis() ? 'Redis' : 'Memory' : 'Memory',
            github: config.github.token ? 'Authenticated' : 'Unauthenticated (Rate Limited)',
        });

        // Show examples
        logger.info('Example endpoints', {
            stats: `${protocol}://localhost:${port}/stats?username=pphatdev&theme=dark`,
            health: `${protocol}://localhost:${port}/health`,
        });
    });

    // Graceful shutdown
    setupGracefulShutdown(httpServer, container);

    return httpServer;
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server: any, container: ReturnType<typeof getServiceContainer>) {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

    signals.forEach(signal => {
        process.on(signal, async () => {
            logger.info(`Received ${signal}, starting graceful shutdown...`);

            // Stop accepting new connections
            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    // Cleanup services
                    const cacheService = container.get<any>('cache');
                    if (cacheService.disconnect) {
                        await cacheService.disconnect();
                        logger.info('Cache service disconnected');
                    }

                    logger.info('Graceful shutdown completed');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown', error as Error);
                    process.exit(1);
                }
            });

            // Force shutdown after timeout
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000); // 10 second timeout
        });
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection', reason as Error, { promise });
        process.exit(1);
    });
}

/**
 * Main application bootstrap
 */
async function bootstrap() {
    try {
        logger.info('Starting GitHub Stats API...', {
            nodeVersion: process.version,
            environment: config.server.env,
        });

        // Initialize services
        const container = await initializeServices();

        // Setup application
        const app = setupApplication(container);

        // Start server
        await startServer(app, container);

    } catch (error) {
        logger.error('Failed to start application', error as Error);
        process.exit(1);
    }
}

// Start the application
bootstrap();
