/**
 * Server Startup (Modular Architecture)
 * Handles server initialization with modular structure
 */

import { type Server as HttpServer } from 'http';
import { type Express } from 'express';
import { createApp, initializeRoutes, setupErrorHandlers } from './app.js';
import { getEnv } from './shared/config/env.js';
import { createLogger } from './shared/logs/logger.js';
import { initializeDatabaseAsync } from './shared/config/db.js';
import { GitHubClient } from './shared/utils/github-client.js';
import { closeRedisClient, getRedisClient } from './shared/utils/redis-client.js';
import type { ICacheService } from './services/base.service.js';

const logger = createLogger({ module: 'server' });
let activeApp: Express | null = null;
let activeServer: HttpServer | null = null;
let shutdownPromise: Promise<void> | null = null;

// Shared cache for API responses
const cache = new Map<string, { data: string; timestamp: number }>();

function createRedisHealthCacheService(): ICacheService {
    return {
        async get<T>(key: string): Promise<T | null> {
            const client = await getRedisClient();
            const value = await client.get(key);

            if (value === null) {
                return null;
            }

            try {
                return JSON.parse(value) as T;
            } catch {
                return value as T;
            }
        },
        async set<T>(key: string, value: T, ttl?: number): Promise<void> {
            const client = await getRedisClient();
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

            if (ttl && ttl > 0) {
                await client.setEx(key, ttl, serializedValue);
                return;
            }

            await client.set(key, serializedValue);
        },
        async del(key: string): Promise<void> {
            const client = await getRedisClient();
            await client.del(key);
        },
        async exists(key: string): Promise<boolean> {
            const client = await getRedisClient();
            return (await client.exists(key)) > 0;
        },
        async flush(): Promise<void> {
            const client = await getRedisClient();
            await client.flushDb();
        },
    };
}

/**
 * Initialize external services
 */
async function initializeServices(): Promise<{ cacheService?: ICacheService }> {
    const env = getEnv();

    // Initialize Database
    try {
        await initializeDatabaseAsync();
        logger.info('Database initialized', {
            provider: env.DATABASE_PROVIDER,
        });
    } catch (error) {
        logger.error('Database initialization failed', error as Error, {
            provider: env.DATABASE_PROVIDER,
        });
        throw error;
    }

    // Initialize Redis (optional)
    let cacheService: ICacheService | undefined;
    try {
        await getRedisClient();
        cacheService = createRedisHealthCacheService();
        logger.info('Redis cache initialized');
    } catch (error) {
        logger.warn('Redis not available - using in-memory cache');
    }

    return { cacheService };
}

/**
 * Start the server
 */
export async function startServer(): Promise<Express> {
    if (activeApp && activeServer?.listening) {
        return activeApp;
    }

    const env = getEnv();

    // Initialize services
    const { cacheService } = await initializeServices();

    // Create GitHub client
    const githubClient = new GitHubClient(env.GITHUB_TOKEN);

    // Create Express app
    const app = createApp();

    // Initialize routes with dependencies
    initializeRoutes(app, githubClient, cache, env.CACHE_DURATION, cacheService);

    // Setup error handlers
    setupErrorHandlers(app);

    // Start listening
    const port = env.PORT;
    const host = env.HOST;
    const server = app.listen(port, host, () => {
        logger.info(`Server started on port ${port}`, {
            port,
            host,
            environment: env.APP_ENV,
            nodeEnv: process.env.NODE_ENV
        });
    });

    activeApp = app;
    activeServer = server;

    server.on('error', (error: NodeJS.ErrnoException) => {
        logger.error('HTTP server failed to listen', error, {
            port,
            host,
            code: error.code,
        });
        process.exit(1);
    });

    return app;
}

export async function stopServer(): Promise<void> {
    if (shutdownPromise) {
        return shutdownPromise;
    }

    shutdownPromise = (async () => {
        if (activeServer) {
            await new Promise<void>((resolve, reject) => {
                activeServer?.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });

            logger.info('HTTP server stopped');
        }

        try {
            await closeRedisClient();
        } catch (error) {
            logger.warn('Failed to close Redis client cleanly', {
                error: error instanceof Error ? error.message : String(error),
            });
        }

        activeServer = null;
        activeApp = null;
    })();

    try {
        await shutdownPromise;
    } finally {
        shutdownPromise = null;
    }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch((error) => {
        logger.error('Failed to start server', error as Error);
        process.exit(1);
    });
}
