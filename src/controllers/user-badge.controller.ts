/**
 * User Badge Controller
 * Handles user-specific badge endpoints (require username parameter)
 */
import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { badges, visitorLogs } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { GitHubClient } from '../utils/github-client.js';
import { BadgeRenderer } from '../components/badge-renderer.js';
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

export class UserBadgeController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();

    /** Route documentation for user badges */
    static routeDocs: Record<UserBadgeType, BadgeRouteDoc> = {
        'visitors': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/visitors?username=pphatdev&theme=tokyo'
        },
        'repositories': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/repositories?username=pphatdev'
        },
        'organization': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/organization?username=pphatdev'
        },
        'languages': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/languages?username=pphatdev'
        },
        'followers': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/followers?username=pphatdev'
        },
        'total-stars': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/total-stars?username=pphatdev'
        },
        'total-contributors': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/total-contributors?username=pphatdev'
        },
        'total-commits': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/total-commits?username=pphatdev'
        },
        'total-code-reviews': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/total-code-reviews?username=pphatdev'
        },
        'total-issues': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/total-issues?username=pphatdev'
        },
        'total-pull-requests': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/total-pull-requests?username=pphatdev'
        },
        'total-joined-years': {
            requiredParams: ['username'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'],
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
        const { theme, customLabel, labelColor, labelBackground, valueColor, valueBackground } = req.query;
        return {
            type,
            theme: typeof theme === 'string' ? theme : undefined,
            customLabel: typeof customLabel === 'string' ? customLabel : undefined,
            labelColor: typeof labelColor === 'string' ? labelColor : undefined,
            labelBackground: typeof labelBackground === 'string' ? labelBackground : undefined,
            valueColor: typeof valueColor === 'string' ? valueColor : undefined,
            valueBackground: typeof valueBackground === 'string' ? valueBackground : undefined,
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
            options.valueColor ?? '',
            options.valueBackground ?? '',
        ].join('|');
    }

    /** Render a GitHub-data badge — in-memory → DB → GitHub API cache chain. */
    private static async renderGitHubBadge(
        res: Response,
        username: string,
        type: StoredUserBadgeType,
        options: BadgeOptions,
    ) {
        const cacheKey = UserBadgeController.buildCacheKey(username, options);

        // 1. In-memory SVG cache hit
        const cached = UserBadgeController.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < UserBadgeController.CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            return res.send(cached.data);
        }

        // 2. Deduplicate in-flight requests for the same key
        let pending = UserBadgeController.pendingRequests.get(cacheKey);
        if (!pending) {
            pending = (async () => {
                const col = TYPE_TO_COLUMN[type];

                // 3. Check DB cache
                const row = await db.select().from(badges).where(eq(badges.username, username)).get();
                const isStale = !row?.updated_at || (Date.now() - row.updated_at) > UserBadgeController.CACHE_DURATION;
                const dbValue = row?.[col] as number | null | undefined;

                let value: number;
                if (!isStale && dbValue != null) {
                    value = dbValue;
                } else {
                    // 4. Fetch from GitHub and persist
                    value = await UserBadgeController.githubClient.fetchBadgeValue(username, type);
                    await db
                        .insert(badges)
                        .values({ username, [col]: value, updated_at: Date.now() })
                        .onConflictDoUpdate({
                            target: badges.username,
                            set: { [col]: value, updated_at: Date.now() },
                        });
                }

                const svg = BadgeRenderer.generateBadge(value, options);
                UserBadgeController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
                return svg;
            })();

            UserBadgeController.pendingRequests.set(cacheKey, pending);
            pending.finally(() => UserBadgeController.pendingRequests.delete(cacheKey));
        }

        const svg = await pending;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=600');
        return res.send(svg);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Badge Endpoints
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /badge/visitors — counts unique visitors per IP per calendar day. */
    static async getVisitors(req: Request, res: Response) {
        try {
            const username = UserBadgeController.requireUsername(req, res);
            if (!username) return;

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

            // Calendar date in UTC (YYYY-MM-DD)
            const visitDate = new Date().toISOString().split('T')[0];

            // Attempt to record this unique IP+date combination.
            const logInsert = await db
                .insert(visitorLogs)
                .values({ username, ip_hash: ipHash, visit_date: visitDate, created_at: Date.now() })
                .onConflictDoNothing()
                .returning();

            let count: number;

            if (logInsert.length > 0) {
                // New unique visit — atomically increment the stored total
                const result = await db
                    .insert(badges)
                    .values({ username, visitors: 1 })
                    .onConflictDoUpdate({
                        target: badges.username,
                        set: { visitors: sql`${badges.visitors} + 1` },
                    })
                    .returning();
                count = result[0]?.visitors ?? 1;
            } else {
                // Same IP already counted today — serve the current total without mutating
                const badge = await db
                    .select({ visitors: badges.visitors })
                    .from(badges)
                    .where(eq(badges.username, username))
                    .get();
                count = badge?.visitors ?? 0;
            }

            const options = UserBadgeController.parseOptions(req, 'visitors');
            const svg = BadgeRenderer.generateBadge(count, options);

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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
