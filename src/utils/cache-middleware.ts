import { Request, Response, NextFunction } from 'express';
import { getCacheValue, setCacheValue } from './cache.js';

export interface CacheMiddlewareOptions {
    keyGenerator: (req: Request) => string;
    ttl?: number;
    responseHeaders?: (req: Request) => Record<string, string>;
}

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
};

const inFlightRequests = new Map<string, Promise<unknown>>();

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}

function respondWithCached(res: Response, cached: unknown) {
    if (typeof cached === 'string') {
        return res.send(cached);
    }

    return res.json(cached);
}

/**
 * Express middleware for caching GET requests responses
 * Usage example:
 * app.get('/api/stats',
 *   cacheMiddleware({
 *     keyGenerator: (req) => `stats:${req.query.username}`,
 *     ttl: 3600
 *   }),
 *   controller
 * );
 */
export function cacheMiddleware(options: CacheMiddlewareOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = options.keyGenerator(req);

        // Skip caching if no valid cache key
        if (!cacheKey) {
            return next();
        }

        try {
            // Try to get from cache
            const cachedResponse = await getCacheValue<any>(cacheKey);
            if (cachedResponse) {
                const headers = options.responseHeaders?.(req);
                if (headers) {
                    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
                }
                res.set('X-Cache', 'HIT');
                return respondWithCached(res, cachedResponse);
            }
        } catch (error) {
            console.error('Cache retrieval error:', error);
            // Continue without cache if there's an error
        }

        const inFlight = inFlightRequests.get(cacheKey);
        if (inFlight) {
            try {
                const sharedResponse = await inFlight;
                const headers = options.responseHeaders?.(req);
                if (headers) {
                    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
                }
                res.set('X-Cache', 'COALESCED');
                return respondWithCached(res, sharedResponse);
            } catch (error) {
                console.warn('Coalesced request failed:', error);
            }
        }

        const deferred = createDeferred<unknown>();
        inFlightRequests.set(cacheKey, deferred.promise);
        let responseResolved = false;

        // Intercept the response
        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        const handleResponse = (data: unknown, responder: (payload: any) => Response) => {
            responseResolved = true;
            deferred.resolve(data);
            inFlightRequests.delete(cacheKey);

            // Cache the response for future requests
            setCacheValue(cacheKey, data, { ttl: options.ttl }).catch(error => {
                console.error('Cache storage error:', error);
            });

            res.set('X-Cache', 'MISS');
            return responder(data as any);
        };

        res.json = function (data: any) {
            return handleResponse(data, originalJson);
        };

        res.send = function (data: any) {
            return handleResponse(data, originalSend);
        };

        res.on('close', () => {
            if (responseResolved) {
                return;
            }

            inFlightRequests.delete(cacheKey);
            deferred.reject(new Error('Response closed before sending.'));
        });

        next();
    };
}

/**
 * Cache decorator for controller methods
 * Useful for non-middleware caching
 */
export function withCache<T extends any[], R>(
    keyGenerator: (...args: T) => string,
    ttl: number = 3600
) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: T) {
            const cacheKey = keyGenerator(...args);

            try {
                const cached = await getCacheValue<any>(cacheKey);
                if (cached) {
                    return cached;
                }
            } catch (error) {
                console.error('Cache retrieval error:', error);
            }

            const result = await originalMethod.apply(this, args);

            try {
                await setCacheValue(cacheKey, result, { ttl });
            } catch (error) {
                console.error('Cache storage error:', error);
            }

            return result;
        };

        return descriptor;
    };
}
