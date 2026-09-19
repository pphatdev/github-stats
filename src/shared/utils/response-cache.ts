/**
 * Bounded in-memory response cache used by stats/badges/graphs/languages
 * services. Wraps `LRUCache` so the eviction policy (capacity + TTL) lives
 * in one place; a plain unbounded `Map` here is a memory-DoS vector because
 * cache keys are derived from user-controlled query strings.
 */

import { LRUCache } from 'lru-cache';

export interface ResponseCacheEntry {
    data: string;
    timestamp: number;
}

/** Structural interface that both LRUCache and Map<string, V> satisfy for
 * the subset of methods our services actually call. Tests can pass a plain
 * Map; production wires LRUCache. `.set()` returns `unknown` because Map
 * and LRUCache return different chainable types. */
export interface ResponseCache<V = ResponseCacheEntry> {
    get(key: string): V | undefined;
    set(key: string, value: V): unknown;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
}

const DEFAULT_MAX_ITEMS = 10_000;

/**
 * Create a bounded response cache. Entries older than `ttlMs` are treated as
 * expired; once `max` items are stored, least-recently-used entries are
 * evicted to make room.
 */
export function createResponseCache<V extends object = ResponseCacheEntry>(
    ttlMs: number,
    max: number = DEFAULT_MAX_ITEMS,
): LRUCache<string, V> {
    return new LRUCache<string, V>({
        max,
        ttl: ttlMs,
        // Update recency on read so hot entries stick around under pressure.
        updateAgeOnGet: true,
    });
}
