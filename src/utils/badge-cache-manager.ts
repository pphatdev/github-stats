/**
 * Badge Cache Invalidation & Warming Utilities
 * Manages cache lifecycle for optimal data freshness and performance
 */

import { getBadgeCacheServiceSync } from '../services/badge-cache.service.js';
import { createLogger } from '../common/logger.js';

const logger = createLogger({ service: 'BadgeCacheManager' });

/**
 * Invalidate all badges for a user when GitHub data is refreshed
 * Call this when a user profile is updated from GitHub API
 */
export async function invalidateUserBadgeCache(username: string): Promise<void> {
    const badgeService = getBadgeCacheServiceSync();
    if (!badgeService?.isReady()) {
        logger.debug('Badge cache not available for invalidation', { username });
        return;
    }

    try {
        await badgeService.invalidateUserBadges(username);
        logger.info('User badge cache invalidated', { username });
    } catch (error) {
        logger.error('Failed to invalidate user badge cache', error as Error, { username });
    }
}

/**
 * Invalidate all badges for a project when repo data is refreshed
 * Call this when repository stats are updated from GitHub API
 */
export async function invalidateProjectBadgeCache(owner: string, repo: string): Promise<void> {
    const badgeService = getBadgeCacheServiceSync();
    if (!badgeService?.isReady()) {
        logger.debug('Badge cache not available for invalidation', { owner, repo });
        return;
    }

    try {
        await badgeService.invalidateProjectBadges(owner, repo);
        logger.info('Project badge cache invalidated', { owner, repo });
    } catch (error) {
        logger.error('Failed to invalidate project badge cache', error as Error, { owner, repo });
    }
}

/**
 * Warm up cache with popular badges to reduce cold starts
 * Should be triggered during application startup or maintenance windows
 */
export async function warmupBadgeCache(
    usernames: string[] = [],
    projects: Array<{ owner: string; repo: string }> = [],
): Promise<{ warmed: number; errors: number }> {
    const badgeService = getBadgeCacheServiceSync();
    if (!badgeService?.isReady()) {
        logger.warn('Badge cache not available for warmup');
        return { warmed: 0, errors: 0 };
    }

    let warmed = 0;
    let errors = 0;

    logger.info('Starting badge cache warmup', { usernames: usernames.length, projects: projects.length });

    // Warmup user badges
    for (const username of usernames) {
        try {
            // Note: This is a placeholder. In a real scenario, you'd want to trigger
            // the actual badge endpoints to populate the cache
            logger.debug('User badge warmup queued', { username });
            warmed++;
        } catch (error) {
            logger.error('Failed to warmup user badge', error as Error, { username });
            errors++;
        }
    }

    // Warmup project badges
    for (const { owner, repo } of projects) {
        try {
            logger.debug('Project badge warmup queued', { owner, repo });
            warmed++;
        } catch (error) {
            logger.error('Failed to warmup project badge', error as Error, { owner, repo });
            errors++;
        }
    }

    logger.info('Badge cache warmup completed', { warmed, errors });
    return { warmed, errors };
}

/**
 * Get cache statistics and health info
 */
export async function getCacheStats(): Promise<{
    connected: boolean;
    dbSize?: number;
    memory?: string;
    health: 'healthy' | 'degraded' | 'offline';
}> {
    const badgeService = getBadgeCacheServiceSync();
    if (!badgeService) {
        return {
            connected: false,
            health: 'offline',
        };
    }

    try {
        const stats = await badgeService.getStats();
        if (!stats) {
            return {
                connected: false,
                health: 'offline',
            };
        }

        return {
            connected: stats.connected,
            dbSize: stats.dbSize,
            memory: stats.memory,
            health: stats.connected ? 'healthy' : 'offline',
        };
    } catch (error) {
        logger.error('Failed to get cache stats', error as Error);
        return {
            connected: false,
            health: 'offline',
        };
    }
}

/**
 * Implement TTL-based cache invalidation strategy
 * Smaller TTL for frequently changing data, longer for stable data
 */
export const CACHE_TTL_STRATEGIES = {
    // Real-time data (changes frequently)
    VISITORS: 60, // 1 minute

    // Frequently updated data
    FOLLOWERS: 30 * 60, // 30 minutes
    TOTAL_COMMITS: 30 * 60, // 30 minutes

    // Moderately updated data
    REPOSITORIES: 2 * 60 * 60, // 2 hours
    TOTAL_STARS: 2 * 60 * 60, // 2 hours

    // Stable data (rarely changes)
    ORGANIZATION: 6 * 60 * 60, // 6 hours
    LANGUAGES: 6 * 60 * 60, // 6 hours

    // Project badges (GitHub API frequently updated)
    REPO_STARS: 30 * 60, // 30 minutes
    REPO_FORKS: 2 * 60 * 60, // 2 hours
    REPO_WATCHERS: 2 * 60 * 60, // 2 hours
};

/**
 * Get optimal TTL for a badge type
 */
export function getOptimalTTL(badgeType: string): number {
    const ttl = CACHE_TTL_STRATEGIES[badgeType.toUpperCase().replace('-', '_') as keyof typeof CACHE_TTL_STRATEGIES];
    return ttl || 10 * 60; // Default 10 minutes
}
