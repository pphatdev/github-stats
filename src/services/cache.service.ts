/**
 * Redis Cache Service Implementation
 * Provides a Redis-backed cache service with fallback to memory cache
 */

import { createClient, RedisClientType } from 'redis';
import { ICacheService } from './base.js';
import { CacheError } from '../common/errors.js';
import { createLogger, Logger } from '../common/logger.js';
import { getConfig } from '../config/index.js';

/**
 * Redis cache service with connection pooling and error handling
 */
export class RedisCacheService implements ICacheService {
    private client: RedisClientType | null = null;
    private logger: Logger;
    private config: ReturnType<typeof getConfig>['redis'];
    private isConnected: boolean = false;
    private connectionPromise: Promise<void> | null = null;

    constructor() {
        this.logger = createLogger({ service: 'RedisCache' });
        this.config = getConfig().redis;
    }

    /**
     * Initialize Redis connection
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        if (!this.config.enabled) {
            this.logger.info('Redis is disabled in configuration');
            throw new CacheError('Redis is disabled');
        }

        this.connectionPromise = this._connect();

        try {
            await this.connectionPromise;
        } finally {
            this.connectionPromise = null;
        }
    }

    private async _connect(): Promise<void> {
        try {
            const clientOptions = this.buildClientOptions();

            this.client = createClient(clientOptions);

            // Error handlers
            this.client.on('error', (error) => {
                this.logger.error('Redis client error', error);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                this.logger.info('Redis client connecting...');
            });

            this.client.on('ready', () => {
                this.logger.info('Redis client ready', {
                    host: this.config.host || 'unknown',
                    port: this.config.port,
                    tls: this.config.tls,
                });
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                this.logger.warn('Redis client reconnecting...');
                this.isConnected = false;
            });

            this.client.on('end', () => {
                this.logger.info('Redis client disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error as Error);
            this.client = null;
            this.isConnected = false;
            throw new CacheError('Failed to connect to Redis', { error: (error as Error).message });
        }
    }

    /**
     * Build Redis client options from config
     */
    private buildClientOptions(): any {
        const { url, host, port, username, password, db, tls, connectionTimeout, commandTimeout } = this.config;

        // URL-based configuration
        if (url) {
            return {
                url,
                socket: {
                    connectTimeout: connectionTimeout,
                    commandTimeout,
                    tls: tls ? {} : undefined,
                },
            };
        }

        // Socket-based configuration
        const shouldEnableTLS = tls ?? this.shouldEnableTLS(host);

        return {
            socket: {
                host: host || 'localhost',
                port: port || 6379,
                connectTimeout: connectionTimeout,
                commandTimeout,
                tls: shouldEnableTLS ? {} : undefined,
            },
            username: username || 'default',
            password: password || '',
            database: db,
        };
    }

    /**
     * Auto-detect TLS requirement based on host
     */
    private shouldEnableTLS(host: string | undefined): boolean {
        if (!host) return false;

        const tlsHosts = [
            'cloud.redislabs.com',
            'cache.amazonaws.com',
            'redis-enterprise.com',
            'redislabs.com',
            'render.com',
        ];

        return tlsHosts.some(tlsHost => host.includes(tlsHost));
    }

    /**
     * Ensure client is connected before operation
     */
    private async ensureConnected(): Promise<void> {
        if (!this.isConnected || !this.client) {
            await this.connect();
        }
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            await this.ensureConnected();

            if (!this.client) {
                return null;
            }

            const value = await this.client.get(key);

            if (!value) {
                this.logger.debug('Cache miss', { key });
                return null;
            }

            this.logger.debug('Cache hit', { key });
            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.error('Cache get error', error as Error, { key });
            return null; // Fail gracefully
        }
    }

    /**
     * Set value in cache
     */
    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        try {
            await this.ensureConnected();

            if (!this.client) {
                return;
            }

            const serialized = JSON.stringify(value);

            if (ttl && ttl > 0) {
                await this.client.setEx(key, Math.floor(ttl / 1000), serialized);
            } else {
                await this.client.set(key, serialized);
            }

            this.logger.debug('Cache set', { key, hasTtl: !!ttl });
        } catch (error) {
            this.logger.error('Cache set error', error as Error, { key });
            // Fail gracefully - don't throw on cache errors
        }
    }

    /**
     * Delete value from cache
     */
    async del(key: string): Promise<void> {
        try {
            await this.ensureConnected();

            if (!this.client) {
                return;
            }

            await this.client.del(key);
            this.logger.debug('Cache deleted', { key });
        } catch (error) {
            this.logger.error('Cache delete error', error as Error, { key });
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            await this.ensureConnected();

            if (!this.client) {
                return false;
            }

            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            this.logger.error('Cache exists error', error as Error, { key });
            return false;
        }
    }

    /**
     * Flush all cache entries
     */
    async flush(): Promise<void> {
        try {
            await this.ensureConnected();

            if (!this.client) {
                return;
            }

            await this.client.flushDb();
            this.logger.info('Cache flushed');
        } catch (error) {
            this.logger.error('Cache flush error', error as Error);
        }
    }

    /**
     * Get cache info
     */
    async info(): Promise<any> {
        try {
            await this.ensureConnected();

            if (!this.client) {
                return null;
            }

            return await this.client.info();
        } catch (error) {
            this.logger.error('Failed to get cache info', error as Error);
            return null;
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.client && this.isConnected) {
            this.logger.info('Disconnecting from Redis...');
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
        }
    }

    /**
     * Check if connected
     */
    isReady(): boolean {
        return this.isConnected && this.client !== null;
    }
}

/**
 * Export MemoryCacheService for use in other modules
 */
export { MemoryCacheService } from './base.js';

/**
 * Hybrid cache service that uses Redis with memory fallback
 */
export class HybridCacheService implements ICacheService {
    private redisCache: RedisCacheService;
    private memoryCache: ICacheService;
    private logger: Logger;
    private useRedis: boolean = false;

    constructor(memoryCache: ICacheService) {
        this.redisCache = new RedisCacheService();
        this.memoryCache = memoryCache;
        this.logger = createLogger({ service: 'HybridCache' });
    }

    /**
     * Initialize - tries Redis, falls back to memory
     */
    async initialize(): Promise<void> {
        try {
            await this.redisCache.connect();
            this.useRedis = this.redisCache.isReady();

            if (this.useRedis) {
                this.logger.info('Using Redis cache');
            } else {
                this.logger.info('Using memory cache (Redis unavailable)');
            }
        } catch (error) {
            this.logger.warn('Redis unavailable, using memory cache', { error: (error as Error).message });
            this.useRedis = false;
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (this.useRedis) {
            const value = await this.redisCache.get<T>(key);
            if (value !== null) {
                return value;
            }
        }
        return this.memoryCache.get<T>(key);
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        if (this.useRedis) {
            await this.redisCache.set(key, value, ttl);
        } else {
            await this.memoryCache.set(key, value, ttl);
        }
    }

    async del(key: string): Promise<void> {
        if (this.useRedis) {
            await this.redisCache.del(key);
        } else {
            await this.memoryCache.del(key);
        }
    }

    async exists(key: string): Promise<boolean> {
        if (this.useRedis) {
            return this.redisCache.exists(key);
        }
        return this.memoryCache.exists(key);
    }

    async flush(): Promise<void> {
        if (this.useRedis) {
            await this.redisCache.flush();
        }
        await this.memoryCache.flush();
    }

    async disconnect(): Promise<void> {
        if (this.useRedis) {
            await this.redisCache.disconnect();
        }
    }

    isUsingRedis(): boolean {
        return this.useRedis;
    }
}
