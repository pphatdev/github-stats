import { getRedisClient, isRedisConnected, DEFAULT_TTL } from './redis-client.js';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
}

/**
 * Get a value from Redis cache
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
    if (!isRedisConnected()) {
        return null;
    }

    try {
        const client = await getRedisClient();
        const value = await client.get(key);

        if (!value) {
            return null;
        }

        return JSON.parse(value) as T;
    } catch (error) {
        console.error(`Error retrieving cache for key ${key}:`, error);
        return null;
    }
}

/**
 * Set a value in Redis cache with optional TTL
 */
export async function setCacheValue(
    key: string,
    value: any,
    options: CacheOptions = {}
): Promise<boolean> {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const client = await getRedisClient();
        const ttl = options.ttl || DEFAULT_TTL.USER_DATA;

        await client.setEx(key, ttl, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error setting cache for key ${key}:`, error);
        return false;
    }
}

/**
 * Delete a value from Redis cache
 */
export async function deleteCacheValue(key: string): Promise<boolean> {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const client = await getRedisClient();
        await client.del(key);
        return true;
    } catch (error) {
        console.error(`Error deleting cache for key ${key}:`, error);
        return false;
    }
}

/**
 * Delete multiple values from Redis cache
 */
export async function deleteCacheValues(keys: string[]): Promise<boolean> {
    if (!isRedisConnected() || keys.length === 0) {
        return false;
    }

    try {
        const client = await getRedisClient();
        await client.del(keys);
        return true;
    } catch (error) {
        console.error(`Error deleting cache values:`, error);
        return false;
    }
}

/**
 * Clear all cache entries for a specific user (pattern-based deletion)
 */
export async function clearUserCache(username: string): Promise<boolean> {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const client = await getRedisClient();
        const keys = await client.keys(`*:${username}:*`);

        if (keys.length > 0) {
            await client.del(keys);
        }

        return true;
    } catch (error) {
        console.error(`Error clearing cache for user ${username}:`, error);
        return false;
    }
}

/**
 * Get or set cache value with a fallback function
 * Useful for cache-aside pattern
 */
export async function getCacheOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
): Promise<T> {
    try {
        // Try to get from cache first
        const cached = await getCacheValue<T>(key);
        if (cached !== null) {
            return cached;
        }

        // If not in cache, compute the value
        const value = await computeFn();

        // Store in cache for future requests
        await setCacheValue(key, value, options);

        return value;
    } catch (error) {
        console.error(`Error in getCacheOrCompute for key ${key}:`, error);
        // If all else fails, return the computed value
        return computeFn();
    }
}

/**
 * Increment a counter in Redis (useful for visitor counts, etc.)
 */
export async function incrementCounter(key: string, amount: number = 1): Promise<number> {
    if (!isRedisConnected()) {
        return 0;
    }

    try {
        const client = await getRedisClient();
        return await client.incrBy(key, amount);
    } catch (error) {
        console.error(`Error incrementing counter ${key}:`, error);
        return 0;
    }
}

/**
 * Set expiration on an existing key
 */
export async function setExpiration(key: string, ttl: number): Promise<boolean> {
    if (!isRedisConnected()) {
        return false;
    }

    try {
        const client = await getRedisClient();
        const result = await client.expire(key, ttl);
        return result === true;
    } catch (error) {
        console.error(`Error setting expiration for key ${key}:`, error);
        return false;
    }
}
