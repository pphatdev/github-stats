/**
 * Express Application Setup (Modular Architecture)
 * Initializes the Express app with middleware and module-based routes
 */

import express, { type Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from './shared/config/env.js';
import { createLogger } from './shared/logs/logger.js';
import { GitHubClient } from './shared/utils/github-client.js';

// Module route creators
import { createStatsRouter } from './modules/stats/index.js';
import { createLanguagesRouter } from './modules/languages/index.js';
import { createGraphsRouter } from './modules/graphs/index.js';
import { createBadgesRouter } from './modules/badges/index.js';
import { createIconsRouter } from './modules/icons/index.js';
import { createHealthRouter } from './modules/health/index.js';

// Shared middleware
import { errorHandler } from './shared/middlewares/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const logger = createLogger({ module: 'app' });

/**
 * Create and configure Express application
 */
export function createApp(): Express {
    const app = express();
    const env = getEnv();

    // ⚡️ PERFORMANCE: Enable gzip compression for responses
    app.use(compression({
        level: 6,
        threshold: 1024,
    }));

    // 🔒 SECURITY: Manual security headers
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });

    // CORS Configuration
    app.use(cors({
        origin: env.APP_ENV === 'production'
            ? ['https://stats.pphat.top', 'https://pphat.top']
            : '*',
        methods: ['GET', 'POST'],
        credentials: true,
    }));

    // Body Parsing Middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Static File Serving
    app.use(express.static(publicDir));
    app.use('/public', express.static(publicDir));

    // Request Logging Middleware (Development only)
    if (env.DEBUG) {
        app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.debug(`${req.method} ${req.path}`, {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    duration: `${duration}ms`,
                });
            });
            next();
        });
    }

    logger.info('Express middleware configured');

    return app;
}

/**
 * Initialize application routes using modular structure
 */
export function initializeRoutes(
    app: Express,
    githubClient: GitHubClient,
    cache: Map<string, any>,
    cacheDuration: number,
    cacheService?: any
): void {
    const logger = createLogger({ module: 'routes' });

    // Root route
    app.get('/', (req, res) => {
        res.json({
            name: 'GitHub Stats API',
            version: '2.0.0',
            description: 'Modern GitHub statistics and badge generation service',
            documentation: '/api-docs',
            endpoints: {
                stats: '/stats',
                languages: '/languages',
                graphs: '/graph',
                badges: '/badges',
                icons: '/icons',
                health: '/health'
            }
        });
    });

    // Mount module routes
    app.use('/stats', createStatsRouter(githubClient, cache, cacheDuration));
    app.use('/languages', createLanguagesRouter(githubClient, cache, cacheDuration));
    app.use('/graph', createGraphsRouter(githubClient, cache, cacheDuration));
    app.use('/badges', createBadgesRouter(githubClient, cache, cacheDuration));
    app.use('/icons', createIconsRouter());
    app.use('/health', createHealthRouter(cacheService));

    logger.info('Module routes registered');
}

/**
 * Setup error handlers for the application
 */
export function setupErrorHandlers(app: Express): void {
    const logger = createLogger({ module: 'error-handler' });

    // 404 Handler
    app.use((req, res) => {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.path} not found`,
            documentation: '/api-docs',
        });
    });

    // Global Error Handler
    app.use(errorHandler(logger));

    logger.info('Error handlers configured');
}
