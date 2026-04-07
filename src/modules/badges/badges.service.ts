/**
 * Badges Service
 * Business logic for badge generation
 */

import { GitHubClient } from '../../shared/utils/github-client.js';
import { db } from '../../db/index.js';
import { badges } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { createLogger } from '../../shared/logs/logger.js';
import type { UserBadgeType, ProjectBadgeType, BadgeOptions, BadgeCache } from './badges.types.js';

const logger = createLogger({ service: 'BadgesService' });

export class BadgesService {
    private githubClient: GitHubClient;
    private cache: Map<string, BadgeCache>;
    private pendingRequests: Map<string, Promise<string>>;
    private readonly cacheDuration: number;
    private readonly HTTP_CACHE_CONTROL = 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400';

    constructor(
        githubClient: GitHubClient,
        cache: Map<string, BadgeCache>,
        cacheDuration: number
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.pendingRequests = new Map();
        this.cacheDuration = cacheDuration;
    }

    /**
     * Generate user badge
     */
    async generateUserBadge(
        username: string,
        type: UserBadgeType,
        options: BadgeOptions = {}
    ): Promise<string> {
        const cacheKey = this.getCacheKey('user', username, type, options);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            logger.debug('Returning cached user badge', { username, type });
            return cached.data;
        }

        // Check pending requests
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
            logger.debug('Waiting for pending badge request', { username, type });
            return await pending;
        }

        // Generate new badge
        const promise = this.generateNewUserBadge(username, type, options);
        this.pendingRequests.set(cacheKey, promise);

        try {
            const badge = await promise;
            this.cache.set(cacheKey, { data: badge, timestamp: Date.now() });
            return badge;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Generate project badge
     */
    async generateProjectBadge(
        owner: string,
        repo: string,
        type: ProjectBadgeType,
        options: BadgeOptions = {}
    ): Promise<string> {
        const cacheKey = this.getCacheKey('project', `${owner}/${repo}`, type, options);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            logger.debug('Returning cached project badge', { owner, repo, type });
            return cached.data;
        }

        // Check pending requests
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
            logger.debug('Waiting for pending badge request', { owner, repo, type });
            return await pending;
        }

        // Generate new badge
        const promise = this.generateNewProjectBadge(owner, repo, type, options);
        this.pendingRequests.set(cacheKey, promise);

        try {
            const badge = await promise;
            this.cache.set(cacheKey, { data: badge, timestamp: Date.now() });
            return badge;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Generate new user badge from GitHub data
     */
    private async generateNewUserBadge(
        username: string,
        type: UserBadgeType,
        options: BadgeOptions
    ): Promise<string> {
        let value: number;

        switch (type) {
            case 'visitors':
                // Get from database
                value = await this.getVisitorCount(username);
                break;
            case 'repositories':
            case 'followers':
            case 'organization':
            case 'languages':
            case 'total-stars':
            case 'total-contributors':
            case 'total-commits':
            case 'total-code-reviews':
            case 'total-issues':
            case 'total-pull-requests':
            case 'total-joined-years':
                // Get from database cache
                value = await this.getUserBadgeValue(username, type);
                break;
            default:
                throw new Error(`Unknown user badge type: ${type}`);
        }

        return this.generateSimpleBadge(
            options.customLabel || type,
            value.toString(),
            options
        );
    }

    /**
     * Generate new project badge from GitHub data
     */
    private async generateNewProjectBadge(
        owner: string,
        repo: string,
        type: ProjectBadgeType,
        options: BadgeOptions
    ): Promise<string> {
        let value: number;

        // Map project badge types to repo badge types
        const repoBadgeTypeMap: Record<string, string> = {
            'stars': 'repo-stars',
            'forks': 'repo-forks',
            'watchers': 'repo-watchers',
            'issues': 'repo-issues',
            'pull-requests': 'repo-prs',
            'contributors': 'repo-contributors',
            'size': 'repo-size'
        };

        // For simple metrics, use fetchRepoBadgeValue
        if (repoBadgeTypeMap[type]) {
            value = await this.githubClient.fetchRepoBadgeValue(
                owner,
                repo,
                repoBadgeTypeMap[type] as any
            );

            // Format size in MB
            if (type === 'size') {
                return this.generateSimpleBadge(
                    options.customLabel || type,
                    `${(value / 1024).toFixed(2)} MB`,
                    options
                );
            }

            return this.generateSimpleBadge(
                options.customLabel || type,
                value.toString(),
                options
            );
        }

        // For language and license, fetch directly (not implemented yet)
        if (type === 'language' || type === 'license') {
            return this.generateSimpleBadge(
                options.customLabel || type,
                'N/A',
                options
            );
        }

        // For other metrics
        value = await this.getProjectMetric(owner, repo, type);
        return this.generateSimpleBadge(
            options.customLabel || type,
            value.toString(),
            options
        );
    }

    /**
     * Generate a simple badge SVG
     */
    private generateSimpleBadge(label: string, value: string, options: BadgeOptions): string {
        const theme = options.theme || 'default';
        // Simple badge generation - this is a placeholder
        // You may want to use a proper badge renderer or library
        return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
            <text x="10" y="15">${label}: ${value}</text>
        </svg>`;
    }

    /**
     * Get user badge value from database
     */
    private async getUserBadgeValue(username: string, type: UserBadgeType): Promise<number> {
        const result = await db.select().from(badges).where(eq(badges.username, username)).limit(1);

        if (result.length === 0) {
            // Fetch fresh data
            await this.refreshUserBadgeData(username);
            const refreshed = await db.select().from(badges).where(eq(badges.username, username)).limit(1);
            return this.extractBadgeValue(refreshed[0], type);
        }

        return this.extractBadgeValue(result[0], type);
    }

    /**
     * Extract badge value from database record
     */
    private extractBadgeValue(record: any, type: UserBadgeType): number {
        const columnMap: Record<string, string> = {
            'repositories': 'repositories',
            'organization': 'organization',
            'languages': 'languages',
            'followers': 'followers',
            'total-stars': 'total_stars',
            'total-contributors': 'total_contributors',
            'total-commits': 'total_commits',
            'total-code-reviews': 'total_code_reviews',
            'total-issues': 'total_issues',
            'total-pull-requests': 'total_pull_requests',
            'total-joined-years': 'total_joined_years',
        };

        const column = columnMap[type];
        return record[column] || 0;
    }

    /**
     * Refresh user badge data from GitHub
     */
    private async refreshUserBadgeData(username: string): Promise<void> {
        const userData = await this.githubClient.fetchUserStats(username, { avatarMode: 'none' });
        const now = Date.now();

        await db.insert(badges)
            .values({
                username,
                repositories: 0, // Not available in GitHubStats, needs separate fetch
                organization: 0, // Not available in GitHubStats
                languages: 0, // Not available in GitHubStats
                followers: 0, // Not available in GitHubStats
                total_stars: userData.totalStars || 0,
                total_contributors: 0, // Not available
                total_commits: userData.totalCommits || 0,
                total_code_reviews: 0, // Not available
                total_issues: userData.totalIssues || 0,
                total_pull_requests: userData.totalPRs || 0,
                total_joined_years: 0, // Need createdAt from user data
                updated_at: now
            })
            .onConflictDoUpdate({
                target: badges.username,
                set: {
                    total_stars: userData.totalStars || 0,
                    total_commits: userData.totalCommits || 0,
                    total_issues: userData.totalIssues || 0,
                    total_pull_requests: userData.totalPRs || 0,
                    updated_at: now
                }
            });

        logger.info('User badge data refreshed', { username });
    }

    /**
     * Get visitor count
     */
    private async getVisitorCount(username: string): Promise<number> {
        // Implement visitor counting logic
        return 0;
    }

    /**
     * Get project metric
     */
    private async getProjectMetric(owner: string, repo: string, type: ProjectBadgeType): Promise<number> {
        // Implement project metric fetching logic
        return 0;
    }

    /**
     * Get cache key
     */
    private getCacheKey(
        category: 'user' | 'project',
        identifier: string,
        type: string,
        options: BadgeOptions
    ): string {
        const optionsStr = JSON.stringify(options);
        return `badge-${category}-${identifier}-${type}-${optionsStr}`;
    }

    /**
     * Get cache control header
     */
    getCacheControl(): string {
        return this.HTTP_CACHE_CONTROL;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        logger.info('Badges cache cleared');
    }
}
