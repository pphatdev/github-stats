/**
 * Badge Cache Service
 * Optimized Redis-backed persistent cache for badge rendering
 * Ensures latest data from database with intelligent TTL management
 */

import { createClient, RedisClientType } from 'redis';
import { createLogger, Logger } from '../shared/logs/logger.js';
import { getConfig } from '../shared/config/index.js';

export interface CachedBadge {
    svg: string;
    value: number;
    timestamp: number;
    dbTimestamp: number; // When the database record was last updated
}

export class BadgeCacheService {
    private client: RedisClientType | null = null;
    private logger: Logger;
    private config: ReturnType<typeof getConfig>['redis'];
    private isConnected: boolean = false;
    private connectionPromise: Promise<void> | null = null;

    // Cache key prefixes for organization
    private readonly USER_BADGE_PREFIX = 'badge:user:';
    private readonly PROJECT_BADGE_PREFIX = 'badge:project:';
    private readonly BADGE_VALUE_PREFIX = 'badge:value:';

    // Default TTL values (in seconds)
    private readonly DEFAULT_SVG_TTL = 10 * 60; // 10 minutes for SVG rendering
    private readonly DEFAULT_VALUE_TTL = 30 * 60; // 30 minutes for badge values
    private readonly MAX_TTL = 2 * 60 * 60; // 2 hours absolute max

    constructor() {
        this.logger = createLogger({ service: 'BadgeCache' });
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
            this.logger.info('Badge cache (Redis) is disabled');
            return;
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

            // Event handlers
            this.client.on('error', (error) => {
                this.logger.error('Badge cache error', error);
                this.isConnected = false;
            });

            this.client.on('ready', () => {
                this.logger.info('Badge cache ready');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                this.logger.warn('Badge cache reconnecting...');
                this.isConnected = false;
            });

            this.client.on('end', () => {
                this.logger.info('Badge cache disconnected');
                this.isConnected = false;
            });

            await this.client.connect();
        } catch (error) {
            this.logger.error('Failed to connect to badge cache', error as Error);
            this.client = null;
            this.isConnected = false;
            throw error;
        }
    }

    private buildClientOptions(): any {
        const { url, host, port, username, password, db, tls, connectionTimeout, commandTimeout } = this.config;

        if (url) {
            return {
                url,
                socket: {
                    connectTimeout: connectionTimeout || 5000,
                    commandTimeout: commandTimeout || 30000,
                    tls: tls ? {} : undefined,
                },
            };
        }

        return {
            socket: {
                host: host || 'localhost',
                port: port || 6379,
                connectTimeout: connectionTimeout || 5000,
                commandTimeout: commandTimeout || 30000,
                tls: this.shouldEnableTLS(host) ? {} : undefined,
            },
            username: username || 'default',
            password: password || '',
            database: db || 0,
        };
    }

    private shouldEnableTLS(host: string | undefined): boolean {
        if (!host) return false;
        const tlsHosts = ['cloud.redislabs.com', 'cache.amazonaws.com', 'redis-enterprise.com'];
        return tlsHosts.some(h => host.includes(h));
    }

    private async ensureConnected(): Promise<void> {
        if (!this.isConnected || !this.client) {
            if (this.config.enabled) {
                await this.connect();
            }
        }
    }

    /**
     * Get cached user badge SVG
     * Combines SVG cache with value, ensuring data freshness
     */
    async getUserBadgeSVG(
        username: string,
        badgeType: string,
        options: Record<string, string | boolean | undefined>
    ): Promise<CachedBadge | null> {
        if (!this.client) return null;

        try {
            await this.ensureConnected();

            const cacheKey = this.buildUserBadgeKey(username, badgeType, options);
            const data = await this.client.get(cacheKey);

            if (!data) {
                this.logger.debug('User badge cache miss', { username, badgeType });
                return null;
            }

            this.logger.debug('User badge cache hit', { username, badgeType });
            return JSON.parse(data) as CachedBadge;
        } catch (error) {
            this.logger.error('Failed to get user badge from cache', error as Error);
            return null; // Fail gracefully
        }
    }

    /**
     * Cache user badge SVG with intelligent TTL
     */
    async setUserBadgeSVG(
        username: string,
        badgeType: string,
        options: Record<string, string | boolean | undefined>,
        badge: CachedBadge,
        ttl?: number
    ): Promise<void> {
        if (!this.client) return;

        try {
            await this.ensureConnected();

            const cacheKey = this.buildUserBadgeKey(username, badgeType, options);
            const finalTtl = this.calculateOptimalTTL(badge.dbTimestamp, ttl);

            const serialized = JSON.stringify(badge);
            await this.client.setEx(cacheKey, finalTtl, serialized);

            this.logger.debug('User badge cached', { username, badgeType, ttl: finalTtl });
        } catch (error) {
            this.logger.error('Failed to cache user badge', error as Error);
        }
    }

    /**
     * Get cached project badge SVG
     */
    async getProjectBadgeSVG(
        owner: string,
        repo: string,
        badgeType: string,
        options: Record<string, string | boolean | undefined>
    ): Promise<CachedBadge | null> {
        if (!this.client) return null;

        try {
            await this.ensureConnected();

            const cacheKey = this.buildProjectBadgeKey(owner, repo, badgeType, options);
            const data = await this.client.get(cacheKey);

            if (!data) {
                this.logger.debug('Project badge cache miss', { owner, repo, badgeType });
                return null;
            }

            this.logger.debug('Project badge cache hit', { owner, repo, badgeType });
            return JSON.parse(data) as CachedBadge;
        } catch (error) {
            this.logger.error('Failed to get project badge from cache', error as Error);
            return null;
        }
    }

    /**
     * Cache project badge SVG
     */
    async setProjectBadgeSVG(
        owner: string,
        repo: string,
        badgeType: string,
        options: Record<string, string | boolean | undefined>,
        badge: CachedBadge,
        ttl?: number
    ): Promise<void> {
        if (!this.client) return;

        try {
            await this.ensureConnected();

            const cacheKey = this.buildProjectBadgeKey(owner, repo, badgeType, options);
            const finalTtl = this.calculateOptimalTTL(badge.dbTimestamp, ttl);

            const serialized = JSON.stringify(badge);
            await this.client.setEx(cacheKey, finalTtl, serialized);

            this.logger.debug('Project badge cached', { owner, repo, badgeType, ttl: finalTtl });
        } catch (error) {
            this.logger.error('Failed to cache project badge', error as Error);
        }
    }

    /**
     * Invalidate all badges for a user
     * Called when user data is refreshed from GitHub
     */
    async invalidateUserBadges(username: string): Promise<void> {
        if (!this.client) return;

        try {
            await this.ensureConnected();

            // Use SCAN instead of KEYS to avoid blocking in production
            const pattern = `${this.USER_BADGE_PREFIX}${username}:*`;
            let cursor = 0;
            let keysDeleted = 0;

            do {
                const reply = await this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });

                if (reply.keys.length > 0) {
                    await this.client.del(reply.keys);
                    keysDeleted += reply.keys.length;
                }

                cursor = reply.cursor;
            } while (cursor !== 0);

            if (keysDeleted > 0) {
                this.logger.info('User badges invalidated', { username, count: keysDeleted });
            }
        } catch (error) {
            this.logger.error('Failed to invalidate user badges', error as Error);
        }
    }

    /**
     * Invalidate all badges for a project
     */
    async invalidateProjectBadges(owner: string, repo: string): Promise<void> {
        if (!this.client) return;

        try {
            await this.ensureConnected();

            const pattern = `${this.PROJECT_BADGE_PREFIX}${owner}:${repo}:*`;
            let cursor = 0;
            let keysDeleted = 0;

            do {
                const reply = await this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100,
                });

                if (reply.keys.length > 0) {
                    await this.client.del(reply.keys);
                    keysDeleted += reply.keys.length;
                }

                cursor = reply.cursor;
            } while (cursor !== 0);

            if (keysDeleted > 0) {
                this.logger.info('Project badges invalidated', { owner, repo, count: keysDeleted });
            }
        } catch (error) {
            this.logger.error('Failed to invalidate project badges', error as Error);
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{ connected: boolean; dbSize?: number; memory?: string } | null> {
        if (!this.client || !this.isConnected) return null;

        try {
            const dbSize = await this.client.dbSize();
            const info = await this.client.info('memory');

            // Extract used_memory_human from info
            const memoryMatch = info?.match(/used_memory_human:([^\r\n]+)/);
            const memory = memoryMatch?.[1];

            return { connected: true, dbSize, memory };
        } catch (error) {
            this.logger.error('Failed to get cache stats', error as Error);
            return null;
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect(): Promise<void> {
        if (this.client && this.isConnected) {
            this.logger.info('Disconnecting badge cache...');
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
        }
    }

    /**
     * Check if cache is ready
     */
    isReady(): boolean {
        return this.isConnected && this.client !== null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Build cache key for user badge
     * Format: badge:user:username:type:theme:customLabel:...
     */
    private buildUserBadgeKey(
        username: string,
        badgeType: string,
        options: Record<string, string | boolean | undefined>
    ): string {
        const parts = [
            this.USER_BADGE_PREFIX,
            username,
            badgeType,
            this.hashOptions(options),
        ];
        return parts.join(':');
    }

    /**
     * Build cache key for project badge
     * Format: badge:project:owner:repo:type:theme:...
     */
    private buildProjectBadgeKey(
        owner: string,
        repo: string,
        badgeType: string,
        options: Record<string, string | boolean | undefined>
    ): string {
        const parts = [
            this.PROJECT_BADGE_PREFIX,
            owner,
            repo,
            badgeType,
            this.hashOptions(options),
        ];
        return parts.join(':');
    }

    /**
     * Create a stable hash of options
     * Allows same badge with different option orders to share cache
     */
    private hashOptions(options: Record<string, string | boolean | undefined>): string {
        const sorted = Object.entries(options)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');

        if (!sorted) return 'default';

        // Simple hash to keep key length reasonable
        let hash = 0;
        for (let i = 0; i < sorted.length; i++) {
            const char = sorted.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36).slice(0, 8);
    }

    /**
     * Calculate optimal TTL based on database timestamp
     * Ensures fresh data while maximizing cache hits
     * 
     * Strategy:
     * - If DB data is fresh (< 30 min), use longer TTL (10 min for SVG)
     * - If DB data is stale (> 30 min), use shorter TTL to refresh sooner
     * - Never exceed MAX_TTL absolute limit
     */
    private calculateOptimalTTL(dbTimestamp: number, overrideTtl?: number): number {
        if (overrideTtl !== undefined) {
            return Math.min(overrideTtl, this.MAX_TTL);
        }

        const ageMs = Date.now() - dbTimestamp;
        const ageSeconds = Math.floor(ageMs / 1000);

        // If DB data is newer than 30 minutes, use full SVG TTL
        if (ageSeconds < 30 * 60) {
            return this.DEFAULT_SVG_TTL;
        }

        // If DB data is older than 30 minutes, use reduced TTL to refresh sooner
        if (ageSeconds < this.DEFAULT_VALUE_TTL) {
            return Math.floor(this.DEFAULT_VALUE_TTL / 2);
        }

        // Max 2 hours absolute
        return this.MAX_TTL;
    }
}

// Singleton instance
let badgeCacheService: BadgeCacheService | null = null;

/**
 * Get or create badge cache service singleton
 */
export async function getBadgeCacheService(): Promise<BadgeCacheService> {
    if (!badgeCacheService) {
        badgeCacheService = new BadgeCacheService();
        await badgeCacheService.connect();
    }
    return badgeCacheService;
}

/**
 * Get badge cache service without initializing if not ready
 */
export function getBadgeCacheServiceSync(): BadgeCacheService | null {
    return badgeCacheService || null;
}
