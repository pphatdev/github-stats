/**
 * User Badge Controller
 * Handles user-specific badge endpoints (require username parameter)
 * Features: Redis persistent caching with intelligent TTL, request deduplication
 */
import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { badges, visitorLogs } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { GitHubClient } from '../utils/github-client.js';
import { BadgeRenderer } from '../components/badge-renderer.js';
import { getBadgeCacheServiceSync } from '../services/badge-cache.service.js';
import type { BadgeOptions, UserBadgeType, BadgeRouteDoc } from '../types/badge.types.js';

/** User badge types that have corresponding database columns (excludes 'visitors') */
type StoredUserBadgeType = Exclude<UserBadgeType, 'visitors'>;

/** Maps a user-based BadgeType to the matching badges table column key. */
const TYPE_TO_COLUMN: Record<StoredUserBadgeType, keyof typeof badges.$inferSelect> = {
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

const defaultOptionsParams = ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground', 'hideFrame', 'hideIcon'] as const;

export class UserBadgeController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();

    /** Route documentation for user badges */
    static routeDocs: Record<UserBadgeType, BadgeRouteDoc> = {
        'visitors': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/visitors?username=pphatdev&theme=tokyo'
        },
        'repositories': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/repositories?username=pphatdev'
        },
        'organization': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/organization?username=pphatdev'
        },
        'languages': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/languages?username=pphatdev'
        },
        'followers': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/followers?username=pphatdev'
        },
        'total-stars': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-stars?username=pphatdev'
        },
        'total-contributors': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-contributors?username=pphatdev'
        },
        'total-commits': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-commits?username=pphatdev'
        },
        'total-code-reviews': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-code-reviews?username=pphatdev'
        },
        'total-issues': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-issues?username=pphatdev'
        },
        'total-pull-requests': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-pull-requests?username=pphatdev'
        },
        'total-joined-years': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/total-joined-years?username=pphatdev'
        },
    };

    /**
     * Initialize the controller with dependencies
     */
    static initialize(
        githubClient: GitHubClient,
        cache: Map<string, { data: string; timestamp: number }>,
        cacheDuration: number,
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    /** Parse common display options from query params. */
    private static parseOptions(req: Request, type: UserBadgeType): BadgeOptions {
        const { theme, customLabel, labelColor, labelBackground, iconColor, valueColor, valueBackground, hideFrame = 'false', hideIcon = 'true' } = req.query;
        return {
            type,
            theme: typeof theme === 'string' ? theme : undefined,
            customLabel: typeof customLabel === 'string' ? customLabel : undefined,
            labelColor: typeof labelColor === 'string' ? labelColor : undefined,
            labelBackground: typeof labelBackground === 'string' ? labelBackground : undefined,
            iconColor: typeof iconColor === 'string' ? iconColor : undefined,
            valueColor: typeof valueColor === 'string' ? valueColor : undefined,
            valueBackground: typeof valueBackground === 'string' ? valueBackground : undefined,
            hideFrame: hideFrame === 'true',
            hideIcon: hideIcon === 'true',
        };
    }

    /** Validate username param; sends 400 and returns null on failure. */
    private static requireUsername(req: Request, res: Response): string | null {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            res.status(400).send('username is required');
            return null;
        }
        return username;
    }

    /** Build a stable cache key from username, badge type, and display options. */
    private static buildCacheKey(username: string, options: BadgeOptions): string {
        return [
            'user',
            username,
            options.type,
            options.theme ?? 'default',
            options.customLabel ?? '',
            options.labelColor ?? '',
            options.labelBackground ?? '',
            options.iconColor ?? '',
            options.valueColor ?? '',
            options.valueBackground ?? '',
            options.hideFrame ? 'hideFrame' : '',
            options.hideIcon ? 'hideIcon' : '',
        ].join('|');
    }

    /** Convert BadgeOptions to Record for Redis caching */
    private static optionsToRecord(options: BadgeOptions): Record<string, string | boolean | undefined> {
        return {
            theme: options.theme,
            customLabel: options.customLabel,
            labelColor: options.labelColor,
            labelBackground: options.labelBackground,
            iconColor: options.iconColor,
            valueColor: options.valueColor,
            valueBackground: options.valueBackground,
            hideFrame: options.hideFrame,
            hideIcon: options.hideIcon,
        };
    }

    /** Render a GitHub-data badge — Redis → In-memory → DB → GitHub API cache chain. */
    private static async renderGitHubBadge(
        res: Response,
        username: string,
        type: StoredUserBadgeType,
        options: BadgeOptions,
    ) {
        const cacheKey = UserBadgeController.buildCacheKey(username, options);
        const badgeService = getBadgeCacheServiceSync();
        const optionsRecord = UserBadgeController.optionsToRecord(options);

        // 1. Check Redis persistent cache first
        if (badgeService?.isReady()) {
            const redisCached = await badgeService.getUserBadgeSVG(username, type, optionsRecord);
            if (redisCached) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                res.setHeader('X-Cache', 'REDIS');
                return res.send(redisCached.svg);
            }
        }

        // 2. Check in-memory SVG cache
        const cached = UserBadgeController.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < UserBadgeController.CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.setHeader('X-Cache', 'MEMORY');
            return res.send(cached.data);
        }

        // 3. Deduplicate in-flight requests for the same key
        let pending = UserBadgeController.pendingRequests.get(cacheKey);
        if (!pending) {
            pending = (async () => {
                const col = TYPE_TO_COLUMN[type];

                // 4. Check DB cache
                const row = await db.select().from(badges).where(eq(badges.username, username)).get();
                const isStale = !row?.updated_at || (Date.now() - row.updated_at) > UserBadgeController.CACHE_DURATION;
                const dbValue = row?.[col] as number | null | undefined;
                let dbTimestamp = row?.updated_at ?? Date.now();

                let value: number;
                if (!isStale && dbValue != null) {
                    value = dbValue;
                } else {
                    // 5. Fetch from GitHub and persist
                    value = await UserBadgeController.githubClient.fetchBadgeValue(username, type);
                    const result = await db
                        .insert(badges)
                        .values({ username, [col]: value, updated_at: Date.now() })
                        .onConflictDoUpdate({
                            target: badges.username,
                            set: { [col]: value, updated_at: Date.now() },
                        })
                        .returning();

                    // Update timestamp to latest
                    if (result[0]?.updated_at) {
                        dbTimestamp = result[0].updated_at;
                    }
                }

                const svg = BadgeRenderer.generateBadge(value, options);

                // Cache in both layers
                UserBadgeController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

                // Cache in Redis with intelligent TTL
                if (badgeService?.isReady()) {
                    await badgeService.setUserBadgeSVG(username, type, optionsRecord, {
                        svg,
                        value,
                        timestamp: Date.now(),
                        dbTimestamp,
                    });
                }

                return svg;
            })();

            UserBadgeController.pendingRequests.set(cacheKey, pending);
            pending.finally(() => UserBadgeController.pendingRequests.delete(cacheKey));
        }

        const svg = await pending;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=600');
        res.setHeader('X-Cache', 'MISS');
        return res.send(svg);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Badge Endpoints
    // ═══════════════════════════════════════════════════════════════════════
    /** 
     * GET /badge/visitors — counts unique visitors per IP per calendar day.
     * 
     * The same IP can increment the counter once per day:
     * - Day 1: IP visits → count +1
     * - Day 1 (later): Same IP visits again → count stays same (already counted today)
     * - Day 2: Same IP visits → count +1 (new day, allowed to count again)
     * 
     * This is enforced by the unique index on (username, ip_hash, visit_date) in the visitor_logs table.
     * 
     * Caching Strategy:
     * - Redis cache for rendered SVG (10 minutes)
     * - In-memory cache for rapid F5 spam (60 seconds)
     * - Short TTL ensures visitor counts update frequently
     */
    static async getVisitors(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;

            const options = UserBadgeController.parseOptions(req, 'visitors');
            const cacheKey = UserBadgeController.buildCacheKey(username, options);
            const badgeService = getBadgeCacheServiceSync();
            const optionsRecord = UserBadgeController.optionsToRecord(options);

            // 1. Check Redis persistent cache first
            if (badgeService?.isReady()) {
                const redisCached = await badgeService.getUserBadgeSVG(username, 'visitors', optionsRecord);
                if (redisCached) {
                    res.setHeader('Content-Type', 'image/svg+xml');
                    res.setHeader('Cache-Control', 'public, max-age=60');
                    res.setHeader('X-Cache', 'REDIS');
                    return res.send(redisCached.svg);
                }
            }

            // 2. Check in-memory SVG cache first — prevents unnecessary DB queries for rapid refreshes
            const cached = UserBadgeController.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 60_000) {  // 60-second cache
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=60');
                res.setHeader('X-Cache', 'MEMORY');
                return res.send(cached.data);
            }

            // Resolve the real client IP (works behind reverse proxies)
            const rawIp = (
                (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
                req.socket?.remoteAddress ||
                'unknown'
            );

            // Hash the IP for privacy — truncated SHA-256 is enough for dedup
            const ipHash = crypto
                .createHash('sha256')
                .update(rawIp)
                .digest('hex')
                .slice(0, 16);

            // Calendar date in UTC (YYYY-MM-DD) — ensures same IP can count once per day
            const visitDate = new Date().toISOString().split('T')[0];

            // Attempt to record this unique IP+date combination
            // If this IP already visited today, onConflictDoNothing() prevents duplicate insertion
            const logInsert = await db
                .insert(visitorLogs)
                .values({ username, ip_hash: ipHash, visit_date: visitDate, created_at: Date.now() })
                .onConflictDoNothing()
                .returning();

            let count: number;
            let dbTimestamp = Date.now();

            if (logInsert.length > 0) {
                // New unique visit for today — atomically increment the stored total
                const result = await db
                    .insert(badges)
                    .values({ username, visitors: 1, updated_at: Date.now() })
                    .onConflictDoUpdate({
                        target: badges.username,
                        set: { visitors: sql`${badges.visitors} + 1`, updated_at: Date.now() },
                    })
                    .returning();
                count = result[0]?.visitors ?? 1;
                dbTimestamp = result[0]?.updated_at ?? Date.now();
            } else {
                // Same IP already counted today — return the current total without incrementing
                const badge = await db
                    .select({ visitors: badges.visitors, updated_at: badges.updated_at })
                    .from(badges)
                    .where(eq(badges.username, username))
                    .get();
                count = badge?.visitors ?? 0;
                dbTimestamp = badge?.updated_at ?? Date.now();
            }

            const svg = BadgeRenderer.generateBadge(count, options);

            // Cache the SVG in both layers
            UserBadgeController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

            // Cache in Redis with short TTL for frequent updates
            if (badgeService?.isReady()) {
                await badgeService.setUserBadgeSVG(username, 'visitors', optionsRecord, {
                    svg,
                    value: count,
                    timestamp: Date.now(),
                    dbTimestamp,
                }, 60); // 60 seconds for visitors (shorter for freshness)
            }

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=60');
            res.setHeader('X-Cache', 'MISS');
            return res.send(svg);
        } catch (err) {
            console.error('UserBadgeController.getVisitors:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repositories */
    static async getRepositories(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'repositories', UserBadgeController.parseOptions(req, 'repositories'));
        } catch (err) {
            console.error('UserBadgeController.getRepositories:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/organization */
    static async getOrganization(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'organization', UserBadgeController.parseOptions(req, 'organization'));
        } catch (err) {
            console.error('UserBadgeController.getOrganization:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/languages */
    static async getLanguages(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'languages', UserBadgeController.parseOptions(req, 'languages'));
        } catch (err) {
            console.error('UserBadgeController.getLanguages:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/followers */
    static async getFollowers(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'followers', UserBadgeController.parseOptions(req, 'followers'));
        } catch (err) {
            console.error('UserBadgeController.getFollowers:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-stars */
    static async getTotalStars(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-stars', UserBadgeController.parseOptions(req, 'total-stars'));
        } catch (err) {
            console.error('UserBadgeController.getTotalStars:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-contributors */
    static async getTotalContributors(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-contributors', UserBadgeController.parseOptions(req, 'total-contributors'));
        } catch (err) {
            console.error('UserBadgeController.getTotalContributors:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-commits */
    static async getTotalCommits(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-commits', UserBadgeController.parseOptions(req, 'total-commits'));
        } catch (err) {
            console.error('UserBadgeController.getTotalCommits:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-code-reviews */
    static async getTotalCodeReviews(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-code-reviews', UserBadgeController.parseOptions(req, 'total-code-reviews'));
        } catch (err) {
            console.error('UserBadgeController.getTotalCodeReviews:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-issues */
    static async getTotalIssues(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-issues', UserBadgeController.parseOptions(req, 'total-issues'));
        } catch (err) {
            console.error('UserBadgeController.getTotalIssues:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-pull-requests */
    static async getTotalPullRequests(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-pull-requests', UserBadgeController.parseOptions(req, 'total-pull-requests'));
        } catch (err) {
            console.error('UserBadgeController.getTotalPullRequests:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-joined-years */
    static async getTotalJoinedYears(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;
            await UserBadgeController.renderGitHubBadge(res, username, 'total-joined-years', UserBadgeController.parseOptions(req, 'total-joined-years'));
        } catch (err) {
            console.error('UserBadgeController.getTotalJoinedYears:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }
}
