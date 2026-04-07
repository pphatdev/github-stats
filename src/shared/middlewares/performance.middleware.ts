/**
 * Performance Middleware
 * Optimizes response delivery with compression, caching, and streaming
 */

import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '../logs/logger.js';

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
 * Security headers with Helmet
 */
export const securityMiddleware = helmet({
    contentSecurityPolicy: false, // Allow inline SVGs
    crossOriginEmbedderPolicy: false, // Allow embedding in other sites
});

/**
 * Rate limiting to prevent abuse
 */
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
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
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit to 30 requests per minute
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
