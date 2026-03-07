/**
 * Core Cached Routes
 * Routes for stats, languages, and graph with caching middleware
 */
import type { Application, Request } from 'express';
import { StatsController } from '../controllers/stats.js';
import { LanguageController } from '../controllers/languages.js';
import { GraphController } from '../controllers/graph.js';
import { cacheMiddleware } from '../utils/cache-middleware.js';
import { CACHE_KEYS, DEFAULT_TTL } from '../utils/redis-client.js';

export function registerCachedRoutes(app: Application): void {
    const normalizeQueryParams = (query: Record<string, unknown>): string => {
        const entries = Object.entries(query)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return [key, value.join(',')];
                }

                return [key, String(value)];
            })
            .sort(([a], [b]) => a.localeCompare(b));

        return new URLSearchParams(entries as Array<[string, string]>).toString();
    };

    const getStatsContentType = (req: Request) => {
        const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : undefined;
        const userAgent = req.get('user-agent') || '';
        const isPreviewBot = /discordbot|twitterbot|slackbot|facebookexternalhit|linkedinbot|telegrambot|telegram|mastodon|whatsapp/i.test(userAgent);
        const normalizedFormat = format ?? (isPreviewBot ? 'webp' : 'svg');
        return normalizedFormat === 'webp' ? 'image/webp' : 'image/svg+xml';
    };

    const getGraphContentType = (req: Request) => {
        const format = typeof req.query.as === 'string'
            ? req.query.as.toLowerCase()
            : typeof req.query.format === 'string'
                ? req.query.format.toLowerCase()
                : 'svg';

        if (format === 'webp') return 'image/webp';
        if (format === 'png') return 'image/png';
        return 'image/svg+xml';
    };

    // Cache middleware for /stats - cache by username and all params
    const statsCache = cacheMiddleware({
        keyGenerator: (req) => {
            const username = req.query.username as string;
            const params = normalizeQueryParams(req.query as Record<string, unknown>);
            return `${CACHE_KEYS.STATS(username)}:${params}`;
        },
        responseHeaders: (req) => ({ 'Content-Type': getStatsContentType(req) }),
        ttl: DEFAULT_TTL.STATS
    });

    // Cache middleware for /languages - cache by username and all params
    const languagesCache = cacheMiddleware({
        keyGenerator: (req) => {
            const username = req.query.username as string;
            const params = normalizeQueryParams(req.query as Record<string, unknown>);
            return `${CACHE_KEYS.LANGUAGES(username)}:${params}`;
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.LANGUAGES
    });

    // Cache middleware for /graph - cache by username and all params
    const graphCache = cacheMiddleware({
        keyGenerator: (req) => {
            const username = req.query.username as string;
            const params = JSON.stringify(req.query);
            return CACHE_KEYS.GRAPH(username, params);
        },
        responseHeaders: (req) => ({ 'Content-Type': getGraphContentType(req) }),
        ttl: DEFAULT_TTL.GRAPH
    });

    // Main routes with caching
    app.get('/stats', statsCache, StatsController.getSvg);
    app.get('/languages', languagesCache, LanguageController.getSvg);
    app.get('/graph', graphCache, GraphController.getSvg);
}

export async function warmupRedisCache(username: string, port: string | number, protocol: string): Promise<void> {
    const baseUrl = `${protocol}://localhost:${port}`;
    const query = `?username=${encodeURIComponent(username)}`;
    const urls = [
        `${baseUrl}/stats${query}`,
        `${baseUrl}/languages${query}`,
        `${baseUrl}/graph${query}`,
        `${baseUrl}/badge/visitors${query}`,
        `${baseUrl}/badge/repositories${query}`,
        `${baseUrl}/badge/organization${query}`,
        `${baseUrl}/badge/languages${query}`,
        `${baseUrl}/badge/followers${query}`,
        `${baseUrl}/badge/total-stars${query}`,
        `${baseUrl}/badge/total-contributors${query}`,
        `${baseUrl}/badge/total-commits${query}`,
        `${baseUrl}/badge/total-code-reviews${query}`,
        `${baseUrl}/badge/total-issues${query}`,
        `${baseUrl}/badge/total-pull-requests${query}`,
        `${baseUrl}/badge/total-joined-years${query}`,
    ];

    await Promise.all(
        urls.map(async (url) => {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Warm-up failed: ${url} (${response.status})`);
                }
            } catch (error) {
                console.warn(`⚠️  Warm-up request failed: ${url}`, error);
            }
        })
    );
}
