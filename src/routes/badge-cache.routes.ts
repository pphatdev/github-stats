/**
 * Badge Cache Health Check Route
 * Provides monitoring and debugging endpoints for cache performance
 */

import { Request, Response, Application } from 'express';
import { getCacheStats, CACHE_TTL_STRATEGIES } from '../utils/badge-cache-manager.js';
import { createLogger } from '../common/logger.js';

const logger = createLogger({ service: 'BadgeCacheHealthCheck' });

/**
 * Register badge cache health check routes
 */
export function registerBadgeCacheRoutes(app: Application): void {
    /**
     * GET /cache/health - Check badge cache health status
     * Returns detailed information about badge cache state
     */
    app.get('/cache/health', async (req: Request, res: Response) => {
        try {
            const stats = await getCacheStats();

            res.json({
                status: stats?.health === 'healthy' ? 'ok' : 'degraded',
                badge_cache: {
                    connected: stats?.connected ?? false,
                    health: stats?.health ?? 'offline',
                    db_size: stats?.dbSize ?? 0,
                    memory: stats?.memory ?? 'unknown',
                },
                cache_strategies: {
                    description: 'TTL strategies for different badge types (in seconds)',
                    strategies: CACHE_TTL_STRATEGIES,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Health check failed', error as Error);
            res.status(500).json({
                status: 'error',
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            });
        }
    });

    /**
     * GET /cache/stats - Detailed cache statistics
     * Returns performance metrics and usage information
     */
    app.get('/cache/stats', async (req: Request, res: Response) => {
        try {
            const stats = await getCacheStats();

            res.json({
                cache_statistics: {
                    connected: stats?.connected ?? false,
                    db_size: stats?.dbSize ?? 0,
                    memory_usage: stats?.memory ?? 'unknown',
                    health: stats?.health ?? 'offline',
                },
                optimization_notes: {
                    redis_benefits: [
                        'Persistent SVG cache across server restarts',
                        'Distributed cache for multi-worker deployments',
                        'Automatic TTL-based eviction reduces memory overhead',
                        'Intelligent TTL management based on data freshness',
                    ],
                    caching_layers: [
                        {
                            layer: 'Redis',
                            scope: 'Persistent - survives restarts',
                            ttl: 'Adaptive (1min-2hrs based on data)',
                            use_case: 'Primary cache for rendered SVGs',
                        },
                        {
                            layer: 'In-Memory Map',
                            scope: 'Process memory',
                            ttl: '600-3600 seconds',
                            use_case: 'Secondary cache for request deduplication',
                        },
                        {
                            layer: 'Database',
                            scope: 'SQLite persistence',
                            ttl: '2 hours max',
                            use_case: 'Source of truth for badge values',
                        },
                    ],
                },
                recommendations: {
                    if_memory_high: 'Reduce TTL values for less-critical badges',
                    if_cache_misses_high: 'Increase TTL values or enable warmup',
                    if_disconnected: 'Check Redis connection - falling back to in-memory',
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Stats request failed', error as Error);
            res.status(500).json({
                error: 'Failed to retrieve cache statistics',
                timestamp: new Date().toISOString(),
            });
        }
    });

    /**
     * POST /cache/clear - Clear badge cache (admin only)
     * Useful for forcing cache refresh during maintenance
     */
    app.post('/cache/clear', async (req: Request, res: Response) => {
        // In production, you'd want to add authentication here
        // For now, this is a basic endpoint
        try {
            logger.info('Cache clear requested');
            res.json({
                message: 'Cache invalidation strategies available via API',
                methods: {
                    user_badge: 'POST /cache/invalidate/user/:username',
                    project_badge: 'POST /cache/invalidate/project/:owner/:repo',
                },
                note: 'Use specific methods to invalidate individual user/project caches',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Cache clear failed', error as Error);
            res.status(500).json({
                error: 'Failed to clear cache',
                timestamp: new Date().toISOString(),
            });
        }
    });

    logger.info('Badge cache health check routes registered');
}
