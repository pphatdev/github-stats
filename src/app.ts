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
import { createUsersRouter } from './modules/users/index.js';

// Shared middleware
import { errorHandler, trackRequest } from './shared/middlewares/index.js';
import { securityMiddleware, rateLimiter, strictRateLimiter } from './shared/middlewares/performance.middleware.js';
import type { ResponseCache } from './shared/utils/response-cache.js';

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

    // Behind Cloudflare → nginx (one hop). Needed so req.ip is the real client
    // IP for per-IP rate limiting and downstream visitor-dedup work; without
    // this, everyone shares the nginx-loopback bucket.
    app.set('trust proxy', 1);

    // ⚡️ PERFORMANCE: Enable gzip compression for responses
    app.use(compression({
        level: 6,
        threshold: 1024,
    }));

    // 🔒 SECURITY: Helmet-based headers (see performance.middleware for the
    // rationale on CSP/COEP/CORP tuning for cross-origin badge embedding).
    app.use(securityMiddleware);

    // 🚦 RATE LIMIT: Global 1000 req / 15 min per IP. Endpoint-specific limits
    // for GitHub-hitting routes are applied in `initializeRoutes`.
    app.use(rateLimiter);

    // CORS Configuration.
    //
    // In production, only our own origins may send credentialed requests.
    // In dev, we accept any origin but drop `credentials` — the combination
    // of `Access-Control-Allow-Origin: *` + `credentials: true` is invalid
    // per spec and browsers refuse it anyway, but leaving `credentials: true`
    // there previously masked the misconfig and encouraged relying on it.
    app.use(cors(
        env.APP_ENV === 'production'
            ? {
                origin: ['https://stats.pphat.top', 'https://pphat.top'],
                methods: ['GET', 'POST'],
                credentials: true,
            }
            : {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials: false,
            },
    ));

    // Body Parsing Middleware. All API routes are GET so a 10 MB budget was
    // pure attack surface (L3). Kept minimal for any future POST endpoints.
    app.use(express.json({ limit: '100kb' }));
    app.use(express.urlencoded({ extended: true, limit: '100kb' }));

    // Static File Serving. Single mount at `/` (I1). External callers that
    // used the `/public/...` prefix should update to `/...`; drop the alias
    // after grep confirms nothing external still depends on it.
    app.use(express.static(publicDir));

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
    cache: ResponseCache<any>,
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
                health: '/health',
                users: '/users'
            }
        });
    });

    // Mount module routes. `trackRequest` logs every card request (including
    // programmatic/bot user-agents) into `stats_requests` for the admin dashboard.
    // `strictRateLimiter` is layered on /stats and /badges because both may
    // fan out to the GitHub API on cache miss — the global rateLimiter alone
    // would let a hot spot burn through the API quota.
    app.use('/stats', strictRateLimiter, trackRequest, createStatsRouter(githubClient, cache, cacheDuration));
    app.use('/languages', trackRequest, createLanguagesRouter(githubClient, cache, cacheDuration));
    app.use('/graph', trackRequest, createGraphsRouter(githubClient, cache, cacheDuration));
    app.use('/badges', strictRateLimiter, trackRequest, createBadgesRouter(githubClient, cache, cacheDuration));
    app.use('/icons', createIconsRouter());
    app.use('/health', createHealthRouter(cacheService));
    app.use('/users', createUsersRouter());

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
