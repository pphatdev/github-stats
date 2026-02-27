/**
 * Service Layer Base Classes and Interfaces
 * Provides abstractions for business logic separation
 */

import { Logger, createLogger } from '../common/logger.js';

/**
 * Base service class providing common functionality
 */
export abstract class BaseService {
    protected logger: Logger;

    constructor(serviceName: string) {
        this.logger = createLogger({ service: serviceName });
    }

    /**
     * Execute operation with error handling and logging
     */
    protected async executeWithLogging<T>(
        operation: string,
        fn: () => Promise<T>
    ): Promise<T> {
        const startTime = Date.now();
        this.logger.debug(`Starting ${operation}`);

        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.logger.debug(`Completed ${operation}`, { duration });
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Failed ${operation}`, error as Error, { duration });
            throw error;
        }
    }
}

/**
 * Cache interface for dependency injection
 */
export interface ICacheService {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    flush(): Promise<void>;
}

/**
 * Memory cache implementation
 */
export class MemoryCacheService implements ICacheService {
    private cache: Map<string, { data: any; timestamp: number; ttl?: number }>;
    private logger: Logger;

    constructor() {
        this.cache = new Map();
        this.logger = createLogger({ service: 'MemoryCache' });

        // Cleanup expired entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            this.logger.debug('Cache entry expired', { key });
            return null;
        }

        this.logger.debug('Cache hit', { key });
        return entry.data;
    }

    async set<T>(key: string, value: T, ttl?: number): Promise<void> {
        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl,
        });
        this.logger.debug('Cache set', { key, hasTtl: !!ttl });
    }

    async del(key: string): Promise<void> {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.logger.debug('Cache deleted', { key });
        }
    }

    async exists(key: string): Promise<boolean> {
        return this.cache.has(key);
    }

    async flush(): Promise<void> {
        this.cache.clear();
        this.logger.info('Cache flushed');
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        let removed = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.ttl && now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }

        if (removed > 0) {
            this.logger.debug('Cleaned up expired entries', { count: removed });
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
        };
    }
}

/**
 * Request deduplication service
 * Prevents duplicate concurrent requests for the same resource
 */
export class RequestDeduplicationService {
    private pendingRequests: Map<string, Promise<any>>;
    private logger: Logger;

    constructor() {
        this.pendingRequests = new Map();
        this.logger = createLogger({ service: 'RequestDeduplication' });
    }

    /**
     * Execute a request with deduplication
     * If the same key is already being processed, wait for that result instead
     */
    async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
        // Check if request is already in flight
        const existing = this.pendingRequests.get(key);
        if (existing) {
            this.logger.debug('Request deduplicated', { key });
            return existing;
        }

        // Execute new request
        const promise = fn();
        this.pendingRequests.set(key, promise);

        try {
            const result = await promise;
            return result;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    /**
     * Check if a request is currently pending
     */
    isPending(key: string): boolean {
        return this.pendingRequests.has(key);
    }

    /**
     * Get count of pending requests
     */
    getPendingCount(): number {
        return this.pendingRequests.size;
    }

    /**
     * Clear all pending requests (useful for shutdown)
     */
    clear(): void {
        this.pendingRequests.clear();
        this.logger.debug('Cleared all pending requests');
    }
}

/**
 * Service container for dependency injection
 */
export class ServiceContainer {
    private services: Map<string, any>;

    constructor() {
        this.services = new Map();
    }

    /**
     * Register a service
     */
    register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }

    /**
     * Get a service
     */
    get<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service '${key}' not found in container`);
        }
        return service;
    }

    /**
     * Check if service exists
     */
    has(key: string): boolean {
        return this.services.has(key);
    }

    /**
     * Remove a service
     */
    remove(key: string): void {
        this.services.delete(key);
    }

    /**
     * Clear all services
     */
    clear(): void {
        this.services.clear();
    }
}

// Global service container
let containerInstance: ServiceContainer | null = null;

/**
 * Get global service container
 */
export function getServiceContainer(): ServiceContainer {
    if (!containerInstance) {
        containerInstance = new ServiceContainer();
    }
    return containerInstance;
}
