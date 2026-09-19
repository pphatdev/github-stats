/**
 * Badges Service
 * Business logic for badge generation
 */

import { GitHubClient } from '../../shared/utils/github-client.js';
import { db } from '../../db/index.js';
import { badges, visitorLogs } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { createLogger } from '../../shared/logs/logger.js';
import type { UserBadgeType, ProjectBadgeType, BadgeOptions, BadgeCache } from './badges.types.js';
import { BadgeRenderer } from '../../shared/components/badge-renderer.js';
import { BadgeType } from '../../shared/types/badge.types.js';
import type { ResponseCache } from '../../shared/utils/response-cache.js';
import { currentVisitDateUtc } from '../../shared/utils/visitor.js';
import { GITHUB_USERNAME_RE } from '../../shared/utils/username.js';

const logger = createLogger({ service: 'BadgesService' });

export class BadgesService {
    private githubClient: GitHubClient;
    private cache: ResponseCache<BadgeCache>;
    private pendingRequests: Map<string, Promise<string>>;
    private backgroundRefreshAt: Map<string, number>;
    private readonly cacheDuration: number;
    private readonly realtimeMaxStaleMs = 15000;
    private readonly minBackgroundRefreshIntervalMs = 120000;
    private readonly minRealtimeIntervalMs = 30000;
    private readonly HTTP_CACHE_CONTROL = 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400';

    constructor(
        githubClient: GitHubClient,
        cache: ResponseCache<BadgeCache>,
        cacheDuration: number
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.pendingRequests = new Map();
        this.backgroundRefreshAt = new Map();
        this.cacheDuration = cacheDuration;
    }

    /**
     * Generate user badge
     */
    async generateUserBadge(
        username: string,
        type: UserBadgeType,
        options: BadgeOptions = {},
        repo?: string,
        ipHash?: string
    ): Promise<string> {
        // Visitors always bypass cache because each request may increment the counter.
        if (type === 'visitors') {
            return this.generateNewUserBadge(username, type, options, repo, ipHash);
        }

        const cacheKey = this.getCacheKey('user', username, type, options);
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        // Realtime mode still has a short cooldown to protect GitHub rate limits.
        if (options.realtime) {
            if (cached && now - cached.timestamp < this.minRealtimeIntervalMs) {
                logger.debug('Realtime request served from short-term cache', { username, type });
                return cached.data;
            }

            return this.fetchAndCacheBadge(cacheKey, () => this.generateNewUserBadge(username, type, options));
        }

        // Check cache
        if (cached && now - cached.timestamp < this.cacheDuration) {
            const age = now - cached.timestamp;
            if (age >= this.realtimeMaxStaleMs && this.canBackgroundRefresh(cacheKey, now)) {
                this.refreshBadgeInBackground(cacheKey, () => this.generateNewUserBadge(username, type, options));
            }
            logger.debug('Returning cached user badge', { username, type });
            return cached.data;
        }

        return this.fetchAndCacheBadge(cacheKey, () => this.generateNewUserBadge(username, type, options));
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
        const now = Date.now();
        const cached = this.cache.get(cacheKey);

        if (options.realtime) {
            if (cached && now - cached.timestamp < this.minRealtimeIntervalMs) {
                logger.debug('Realtime project badge served from short-term cache', { owner, repo, type });
                return cached.data;
            }

            return this.fetchAndCacheBadge(cacheKey, () => this.generateNewProjectBadge(owner, repo, type, options));
        }

        // Check cache
        if (cached && now - cached.timestamp < this.cacheDuration) {
            const age = now - cached.timestamp;
            if (age >= this.realtimeMaxStaleMs && this.canBackgroundRefresh(cacheKey, now)) {
                this.refreshBadgeInBackground(cacheKey, () => this.generateNewProjectBadge(owner, repo, type, options));
            }
            logger.debug('Returning cached project badge', { owner, repo, type });
            return cached.data;
        }

        return this.fetchAndCacheBadge(cacheKey, () => this.generateNewProjectBadge(owner, repo, type, options));
    }

    /**
     * Generate new user badge from GitHub data
     */
    private async generateNewUserBadge(
        username: string,
        type: UserBadgeType,
        options: BadgeOptions,
        repo?: string,
        ipHash?: string
    ): Promise<string> {
        let value: number;

        switch (type) {
            case 'visitors':
                // Get from database – scope to repo when provided
                value = await this.getVisitorCount(username, repo, ipHash);
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
                // Use GitHub source for accurate values (client has internal request cache).
                value = await this.githubClient.fetchBadgeValue(
                    username,
                    type as Exclude<UserBadgeType, 'visitors'>
                );
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
        const numericValue = Number.parseFloat(value.replace(/[^0-9.]/g, ''));

        return BadgeRenderer.generateBadge(Number.isFinite(numericValue) ? numericValue : 0, {
            type: this.resolveRendererType(label, options),
            theme: options.theme,
            customLabel: options.customLabel,
            labelColor: options.labelColor,
            labelBackground: options.labelBackground,
            iconColor: options.iconColor,
            valueColor: options.valueColor,
            valueBackground: options.valueBackground,
            hideFrame: options.hideFrame,
            hideIcon: true,
        });
    }

    private resolveRendererType(label: string, options: BadgeOptions): BadgeType {
        const customType = options.customType as BadgeType | undefined;
        if (customType) {
            return customType;
        }

        const normalizedLabel = label.toLowerCase();

        const userTypes: BadgeType[] = [
            'visitors',
            'repositories',
            'organization',
            'languages',
            'followers',
            'total-stars',
            'total-contributors',
            'total-commits',
            'total-code-reviews',
            'total-issues',
            'total-pull-requests',
            'total-joined-years',
        ];

        const matchedUserType = userTypes.find((type) => type === normalizedLabel);
        if (matchedUserType) {
            return matchedUserType;
        }

        const projectTypeMap: Record<string, BadgeType> = {
            'stars': 'repo-stars',
            'forks': 'repo-forks',
            'watchers': 'repo-watchers',
            'issues': 'repo-issues',
            'pull-requests': 'repo-prs',
            'contributors': 'repo-contributors',
            'size': 'repo-size',
        };

        return projectTypeMap[normalizedLabel] || 'visitors';
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
        const repositories = await this.githubClient.fetchBadgeValue(username, 'repositories');
        const now = Date.now();

        await db.insert(badges)
            .values({
                username,
                repositories,
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
                    repositories,
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
     * Record a visit and return the resulting visitor count.
     *
     * Dedup rules (H4): a given `(visit_date, key, ip_hash)` triple bumps
     * the counter at most once per UTC day. The unique index on
     * `visitor_logs` is the source of truth; we treat an INSERT that
     * changed no rows as "already counted today" and skip the bump.
     *
     * When we can't identify the caller (no ipHash — should not happen once
     * `trust proxy` is on; belt-and-braces here) or when the caller supplies
     * a username that doesn't match GitHub's naming rules, we return the
     * current count without incrementing. This is the anti-inflation stance.
     */
    private async getVisitorCount(username: string, repo?: string, ipHash?: string): Promise<number> {
        const now = Date.now();
        const key = repo ? `${username}/${repo}` : username;

        // Defense-in-depth: don't let a garbage username become a DB row even
        // if some upstream path skipped Zod. Composite (`user/repo`) keys are
        // allowed through because `key` is what lands in `badges.username`.
        const usernameOk = GITHUB_USERNAME_RE.test(username);
        if (!usernameOk) {
            logger.warn('Visitor bump refused: invalid username shape', { username });
            const [row] = await db.select({ visitors: badges.visitors })
                .from(badges)
                .where(eq(badges.username, key))
                .limit(1);
            return row?.visitors ?? 0;
        }

        // No IP → we can't dedup. Refuse to increment so anonymous scrapers
        // can't inflate the counter. Report the last known total instead.
        if (!ipHash) {
            const [row] = await db.select({ visitors: badges.visitors })
                .from(badges)
                .where(eq(badges.username, key))
                .limit(1);
            return row?.visitors ?? 0;
        }

        const visitDate = currentVisitDateUtc();

        // SQLite's `INSERT OR IGNORE` uses the unique (username, ip_hash,
        // visit_date) constraint on `visitor_logs`; the returning() clause
        // yields one row on a successful insert and an empty result on a
        // conflict-suppressed insert.
        const inserted = await db.insert(visitorLogs)
            .values({
                username: key,
                ip_hash: ipHash,
                visit_date: visitDate,
                created_at: now,
            })
            .onConflictDoNothing({
                target: [visitorLogs.username, visitorLogs.ip_hash, visitorLogs.visit_date],
            })
            .returning({ id: visitorLogs.id });

        if (inserted.length === 0) {
            // Same viewer already counted today. Return the current total
            // without touching `badges.visitors`.
            const [row] = await db.select({ visitors: badges.visitors })
                .from(badges)
                .where(eq(badges.username, key))
                .limit(1);
            return row?.visitors ?? 0;
        }

        // First unique visit today for this viewer → bump the counter.
        const [result] = await db.insert(badges)
            .values({
                username: key,
                visitors: 1,
                updated_at: now,
            })
            .onConflictDoUpdate({
                target: badges.username,
                set: {
                    visitors: sql`${badges.visitors} + 1`,
                    updated_at: now,
                },
            })
            .returning({ visitors: badges.visitors });

        return result?.visitors ?? 1;
    }

    /**
     * Get project metric
     */
    private async getProjectMetric(owner: string, repo: string, type: ProjectBadgeType): Promise<number> {
        // Implement project metric fetching logic
        return 0;
    }

    /**
     * Build a cache key from category + identifier + type + a normalized
     * fingerprint of *render-affecting* options. Fields that don't influence
     * the SVG output (notably `realtime`, which only tunes freshness policy)
     * are excluded so equivalent requests share a cache entry.
     *
     * Bounded input surface here is doubly important because the values
     * flow into an LRU cap of ~10k entries — attackers cycling non-render
     * options would otherwise churn evictions.
     */
    private getCacheKey(
        category: 'user' | 'project',
        identifier: string,
        type: string,
        options: BadgeOptions
    ): string {
        const fingerprint = JSON.stringify([
            options.theme ?? '',
            options.customLabel ?? '',
            options.customType ?? '',
            options.labelColor ?? '',
            options.labelBackground ?? '',
            options.iconColor ?? '',
            options.valueColor ?? '',
            options.valueBackground ?? '',
            options.hideFrame === true ? 1 : 0,
            options.padding ?? 0,
        ]);
        return `badge-${category}-${identifier}-${type}-${fingerprint}`;
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
        this.backgroundRefreshAt.clear();
        logger.info('Badges cache cleared');
    }

    private canBackgroundRefresh(cacheKey: string, now: number): boolean {
        const lastRefreshAt = this.backgroundRefreshAt.get(cacheKey) || 0;
        return now - lastRefreshAt >= this.minBackgroundRefreshIntervalMs;
    }

    private async fetchAndCacheBadge(cacheKey: string, producer: () => Promise<string>): Promise<string> {
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
            return await pending;
        }

        const promise = producer();
        this.pendingRequests.set(cacheKey, promise);

        try {
            const badge = await promise;
            this.cache.set(cacheKey, { data: badge, timestamp: Date.now() });
            return badge;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    private refreshBadgeInBackground(cacheKey: string, producer: () => Promise<string>): void {
        if (this.pendingRequests.has(cacheKey)) {
            return;
        }

        this.backgroundRefreshAt.set(cacheKey, Date.now());

        const promise = producer();
        this.pendingRequests.set(cacheKey, promise);

        promise
            .then((badge) => {
                this.cache.set(cacheKey, { data: badge, timestamp: Date.now() });
            })
            .catch((error) => {
                logger.warn('Background badge refresh failed', {
                    cacheKey,
                    error: error instanceof Error ? error.message : String(error),
                });
            })
            .finally(() => {
                this.pendingRequests.delete(cacheKey);
            });
    }
}
