/**
 * Performance Middleware
 * Optimizes response delivery with compression, caching, and streaming
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit, { MemoryStore, type Options, type Store, type IncrementResponse } from 'express-rate-limit';
import { createLogger } from '../logs/logger.js';
import { getRedisClient, isRedisConnected } from '../utils/redis-client.js';
import { getEnv } from '../config/env.js';

const logger = createLogger({ service: 'PerformanceMiddleware' });

/**
 * Compression middleware with dynamic level based on response size
 */
export const compressionMiddleware = compression({
    // Only compress responses larger than 1KB
    threshold: 1024,

    // Use high compression level for better performance
    level: 6,

    // Filter function to decide what to compress
    filter: (req: Request, res: Response) => {
        // Don't compress if client doesn't accept encoding
        if (req.headers['x-no-compression']) {
            return false;
        }

        // Fall back to standard filter
        return compression.filter(req, res);
    }
});

/**
 * Security headers with Helmet.
 *
 * CSP is off because the app only serves API JSON and SVG/PNG/WebP media —
 * there's no HTML surface to protect via `default-src`. If HTML routes are
 * added, revisit and enable a strict CSP with an override for SVG endpoints.
 *
 * COEP is off and CORP is `cross-origin` because badges/cards are consumed
 * embedded in third-party sites (GitHub README <img>, blog posts, etc.); the
 * defaults would block those cross-origin loads at the browser.
 */
export const securityMiddleware = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * Locked-down CSP for SVG responses.
 *
 * Browsers ignore scripts in SVGs loaded via <img>, but an SVG opened directly
 * (or via <object>/<iframe>) is a full document and runs inline script. Every
 * user-controlled value is escaped by the renderers (svg-safe.ts); this header
 * is defence in depth so a missed escape can't become stored/reflected XSS on
 * our origin. Our SVGs only use inline styles and data: URIs.
 *
 * Applied at write time because the Content-Type isn't known until the
 * controller sets it.
 */
const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; sandbox";

export const svgCspMiddleware = (_req: Request, res: Response, next: NextFunction) => {
    const originalWriteHead = res.writeHead;
    res.writeHead = function (this: Response, ...args: unknown[]) {
        const contentType = String(this.getHeader('Content-Type') ?? '');
        if (contentType.startsWith('image/svg+xml')) {
            this.setHeader('Content-Security-Policy', SVG_CSP);
        }
        return (originalWriteHead as (...a: unknown[]) => Response).apply(this, args);
    } as typeof res.writeHead;
    next();
};

/**
 * Rate-limit store shared across cluster workers via Redis.
 *
 * The default MemoryStore is per-process, so with N cluster workers (and
 * round-robin scheduling) every limit was effectively N× looser. Counters live
 * in Redis when it is connected; otherwise we fall back to the per-process
 * MemoryStore so the app still enforces *some* limit without Redis.
 */
class SharedRateLimitStore implements Store {
    localKeys = false;
    private windowMs = 60_000;
    private readonly memory = new MemoryStore();

    constructor(public readonly prefix: string) {}

    init(options: Options): void {
        this.windowMs = options.windowMs;
        this.memory.init(options);
    }

    private redisKey(key: string): string {
        return `rl:${this.prefix}:${key}`;
    }

    async increment(key: string): Promise<IncrementResponse> {
        if (isRedisConnected()) {
            try {
                const client = await getRedisClient();
                const k = this.redisKey(key);
                const [hits, ttl] = (await client.multi().incr(k).pTTL(k).exec()) as unknown as [number, number];
                let ttlMs = Number(ttl);
                if (ttlMs < 0) {
                    await client.pExpire(k, this.windowMs);
                    ttlMs = this.windowMs;
                }
                return { totalHits: Number(hits), resetTime: new Date(Date.now() + ttlMs) };
            } catch (error) {
                logger.warn('Rate-limit Redis store failed; using in-memory fallback', {
                    error: (error as Error).message,
                });
            }
        }
        return this.memory.increment(key);
    }

    async decrement(key: string): Promise<void> {
        if (isRedisConnected()) {
            try {
                await (await getRedisClient()).decr(this.redisKey(key));
                return;
            } catch { /* fall through */ }
        }
        this.memory.decrement(key);
    }

    async resetKey(key: string): Promise<void> {
        if (isRedisConnected()) {
            try {
                await (await getRedisClient()).del(this.redisKey(key));
            } catch { /* ignore */ }
        }
        this.memory.resetKey(key);
    }
}

/**
 * Rate limiting to prevent abuse
 */
export const rateLimiter = rateLimit({
    store: new SharedRateLimitStore('global'),
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: () => getEnv().RATE_LIMIT_MAX, // per IP per window, across all workers
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
    skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/health');
    }
});

/**
 * Aggressive rate limiter for expensive operations
 */
export const strictRateLimiter = rateLimit({
    store: new SharedRateLimitStore('strict'),
    windowMs: 60 * 1000, // 1 minute
    // Per IP across all GitHub-backed routes. Keep this generous: README
    // images are fetched through GitHub's camo proxy, so many viewers share
    // a few GitHub IPs.
    limit: () => getEnv().RATE_LIMIT_STRICT_MAX,
    message: 'Rate limit exceeded for this endpoint.',
});

/**
 * Add ETag and cache control headers
 */
export const cacheControlMiddleware = (maxAge: number = 600) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Set cache headers
        res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge * 2}, stale-while-revalidate=${maxAge * 4}`);
        res.setHeader('Vary', 'Accept-Encoding, Origin');

        next();
    };
};

/**
 * Response time tracking
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Track when response is finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);

        // Log slow requests
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration,
                query: req.query
            });
        }
    });

    next();
};

/**
 * Keep-Alive connection optimizer
 */
export const keepAliveMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');
    next();
};

/**
 * Preload hints for better performance
 */
export const preloadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Add resource hints for common assets
    if (req.path === '/') {
        res.setHeader('Link', [
            '</sitemap.xml>; rel=preload; as=document',
            '</assets/>; rel=preconnect',
        ].join(', '));
    }
    next();
};

/**
 * Content-Type optimization
 */
export const contentTypeOptimizer = (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    // Override json method to add charset
    res.json = function (obj: any) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return originalJson(obj);
    };

    next();
};

/**
 * Memory-efficient JSON stringification
 */
export const streamJsonResponse = (data: any, res: Response) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // For large arrays, stream the response
    if (Array.isArray(data) && data.length > 100) {
        res.write('[');
        data.forEach((item, index) => {
            res.write(JSON.stringify(item));
            if (index < data.length - 1) {
                res.write(',');
            }
        });
        res.write(']');
        res.end();
    } else {
        res.json(data);
    }
};

/**
 * Request coalescing cache
 * Prevents duplicate concurrent requests to the same endpoint
 */
const pendingRequests = new Map<string, Promise<any>>();

export const requestCoalescingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Only coalesce GET requests
    if (req.method !== 'GET') {
        return next();
    }

    // Create cache key from URL and query params
    const cacheKey = req.originalUrl || req.url;

    // Check if there's a pending request for the same URL
    const pending = pendingRequests.get(cacheKey);
    if (pending) {
        logger.debug('Request coalesced', { url: cacheKey });

        // Wait for the pending request and use its result
        pending.then((cachedResponse) => {
            if (cachedResponse) {
                res.setHeader('X-Request-Coalesced', 'true');
                if (cachedResponse.headers) {
                    Object.entries(cachedResponse.headers).forEach(([key, value]) => {
                        res.setHeader(key, value as string);
                    });
                }
                res.status(cachedResponse.status || 200);
                if (cachedResponse.contentType?.includes('json')) {
                    res.json(cachedResponse.body);
                } else {
                    res.send(cachedResponse.body);
                }
            }
        }).catch(() => {
            // If pending request failed, continue with normal processing
            next();
        });
        return;
    }

    // Store original res.send and res.json
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);
    let capturedResponse: any = null;

    // Create a promise for this request
    const requestPromise = new Promise((resolve) => {
        // Override response methods to capture the response
        res.send = function (body: any) {
            capturedResponse = {
                status: res.statusCode,
                headers: { ...res.getHeaders() },
                body,
                contentType: res.getHeader('content-type')
            };
            resolve(capturedResponse);
            return originalSend(body);
        };

        res.json = function (obj: any) {
            capturedResponse = {
                status: res.statusCode,
                headers: { ...res.getHeaders() },
                body: obj,
                contentType: 'application/json'
            };
            resolve(capturedResponse);
            return originalJson(obj);
        };
    });

    // Store the promise
    pendingRequests.set(cacheKey, requestPromise);

    // Clean up after response
    res.on('finish', () => {
        setTimeout(() => {
            pendingRequests.delete(cacheKey);
        }, 100); // Keep for 100ms to catch concurrent requests
    });

    next();
};

/**
 * All performance middlewares combined
 */
export const performanceStack = [
    responseTimeMiddleware,
    keepAliveMiddleware,
    compressionMiddleware,
    securityMiddleware,
    preloadMiddleware,
    contentTypeOptimizer,
    requestCoalescingMiddleware,
];
