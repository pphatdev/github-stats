import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { badges, visitorLogs } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { GitHubClient, RepoBadgeType } from '../utils/github-client.js';
import { BadgeRenderer } from '../components/badge-renderer.js';
import type { BadgeType, BadgeOptions } from '../types.js';

const COMMON_OPTIONAL_PARAMS = [
    'theme',
    'customLabel',
    'labelColor',
    'labelBackground',
    'valueColor',
    'valueBackground',
];

/** User-based badge types that have corresponding database columns */
type UserBadgeType = Exclude<BadgeType, 'visitors' | RepoBadgeType>;

/** Maps a user-based BadgeType to the matching badges table column key. */
const TYPE_TO_COLUMN: Record<UserBadgeType, keyof typeof badges.$inferSelect> = {
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

export class BadgeController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();

    static routeDocs = {
        visitors: { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/visitors?username=pphatdev&theme=tokyo' },
        repositories: { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repositories?username=pphatdev' },
        organization: { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/organization?username=pphatdev' },
        languages: { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/languages?username=pphatdev' },
        followers: { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/followers?username=pphatdev' },
        'total-stars': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-stars?username=pphatdev' },
        'total-contributors': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-contributors?username=pphatdev' },
        'total-commits': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-commits?username=pphatdev' },
        'total-code-reviews': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-code-reviews?username=pphatdev' },
        'total-issues': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-issues?username=pphatdev' },
        'total-pull-requests': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-pull-requests?username=pphatdev' },
        'total-joined-years': { requiredParams: ['username'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/total-joined-years?username=pphatdev' },
        // Project/Repository-specific badge routes
        'repo-stars': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-stars?owner=pphatdev&repo=github-stats' },
        'repo-forks': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-forks?owner=pphatdev&repo=github-stats' },
        'repo-watchers': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-watchers?owner=pphatdev&repo=github-stats' },
        'repo-issues': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-issues?owner=pphatdev&repo=github-stats' },
        'repo-prs': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-prs?owner=pphatdev&repo=github-stats' },
        'repo-contributors': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-contributors?owner=pphatdev&repo=github-stats' },
        'repo-size': { requiredParams: ['owner', 'repo'], optionalParams: COMMON_OPTIONAL_PARAMS, payload: null, example: '/badge/repo-size?owner=pphatdev&repo=github-stats' },
    };

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
    private static parseOptions(req: Request, type: BadgeType): BadgeOptions {
        const { theme, customLabel, labelColor, labelBackground, valueColor, valueBackground, hideFrame = 'true', hideIcon = 'false' } = req.query;
        return {
            type,
            theme: typeof theme === 'string' ? theme : undefined,
            customLabel: typeof customLabel === 'string' ? customLabel : undefined,
            labelColor: typeof labelColor === 'string' ? labelColor : undefined,
            labelBackground: typeof labelBackground === 'string' ? labelBackground : undefined,
            valueColor: typeof valueColor === 'string' ? valueColor : undefined,
            valueBackground: typeof valueBackground === 'string' ? valueBackground : undefined,
            ...(hideFrame === 'true' ? { hideFrame: true } : {}),
            ...(hideIcon === 'true' ? { hideIcon: true } : {}),
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
        type: UserBadgeType,
        options: BadgeOptions,
    ) {
        const cacheKey = BadgeController.buildCacheKey(username, options);

        // 1. In-memory SVG cache hit
        const cached = BadgeController.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < BadgeController.CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            return res.send(cached.data);
        }

        // 2. Deduplicate in-flight requests for the same key
        let pending = BadgeController.pendingRequests.get(cacheKey);
        if (!pending) {
            pending = (async () => {
                const col = TYPE_TO_COLUMN[type];

                // 3. Check DB cache
                const row = await db.select().from(badges).where(eq(badges.username, username)).get();
                const isStale = !row?.updated_at || (Date.now() - row.updated_at) > BadgeController.CACHE_DURATION;
                const dbValue = row?.[col] as number | null | undefined;

                let value: number;
                if (!isStale && dbValue != null) {
                    value = dbValue;
                } else {
                    // 4. Fetch from GitHub and persist
                    value = await BadgeController.githubClient.fetchBadgeValue(username, type);
                    await db
                        .insert(badges)
                        .values({ username, [col]: value, updated_at: Date.now() })
                        .onConflictDoUpdate({
                            target: badges.username,
                            set: { [col]: value, updated_at: Date.now() },
                        });
                }

                const svg = BadgeRenderer.generateBadge(value, options);
                BadgeController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
                return svg;
            })();

            BadgeController.pendingRequests.set(cacheKey, pending);
            pending.finally(() => BadgeController.pendingRequests.delete(cacheKey));
        }

        const svg = await pending;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=600');
        return res.send(svg);
    }

    /** GET /badge/visitors — counts unique visitors per IP per calendar day. */
    static async getVisitors(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
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
            // If the row already exists the insert is a no-op (ON CONFLICT DO NOTHING)
            // and `.returning()` returns an empty array — meaning we don't double-count.
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

            const options = BadgeController.parseOptions(req, 'visitors');
            const svg = BadgeRenderer.generateBadge(count, options);

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.send(svg);
        } catch (err) {
            console.error('BadgeController.getVisitors:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repositories */
    static async getRepositories(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'repositories', BadgeController.parseOptions(req, 'repositories'));
        } catch (err) {
            console.error('BadgeController.getRepositories:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/organization */
    static async getOrganization(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'organization', BadgeController.parseOptions(req, 'organization'));
        } catch (err) {
            console.error('BadgeController.getOrganization:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/languages */
    static async getLanguages(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'languages', BadgeController.parseOptions(req, 'languages'));
        } catch (err) {
            console.error('BadgeController.getLanguages:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/followers */
    static async getFollowers(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'followers', BadgeController.parseOptions(req, 'followers'));
        } catch (err) {
            console.error('BadgeController.getFollowers:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-stars */
    static async getTotalStars(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-stars', BadgeController.parseOptions(req, 'total-stars'));
        } catch (err) {
            console.error('BadgeController.getTotalStars:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-contributors */
    static async getTotalContributors(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-contributors', BadgeController.parseOptions(req, 'total-contributors'));
        } catch (err) {
            console.error('BadgeController.getTotalContributors:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-commits */
    static async getTotalCommits(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-commits', BadgeController.parseOptions(req, 'total-commits'));
        } catch (err) {
            console.error('BadgeController.getTotalCommits:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-code-reviews */
    static async getTotalCodeReviews(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-code-reviews', BadgeController.parseOptions(req, 'total-code-reviews'));
        } catch (err) {
            console.error('BadgeController.getTotalCodeReviews:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-issues */
    static async getTotalIssues(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-issues', BadgeController.parseOptions(req, 'total-issues'));
        } catch (err) {
            console.error('BadgeController.getTotalIssues:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-pull-requests */
    static async getTotalPullRequests(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-pull-requests', BadgeController.parseOptions(req, 'total-pull-requests'));
        } catch (err) {
            console.error('BadgeController.getTotalPullRequests:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/total-joined-years */
    static async getTotalJoinedYears(req: Request, res: Response) {
        try {
            const username = BadgeController.requireUsername(req, res);
            if (!username) return;
            await BadgeController.renderGitHubBadge(res, username, 'total-joined-years', BadgeController.parseOptions(req, 'total-joined-years'));
        } catch (err) {
            console.error('BadgeController.getTotalJoinedYears:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Project/Repository-specific badge endpoints
    // ═══════════════════════════════════════════════════════════════════════

    /** Validate owner and repo params; sends 400 and returns null on failure. */
    private static requireOwnerRepo(req: Request, res: Response): { owner: string; repo: string } | null {
        const { owner, repo } = req.query;
        if (!owner || typeof owner !== 'string') {
            res.status(400).send('owner is required');
            return null;
        }
        if (!repo || typeof repo !== 'string') {
            res.status(400).send('repo is required');
            return null;
        }
        return { owner, repo };
    }

    /** Parse options for repo badges - use repo name as default label context */
    private static parseRepoOptions(req: Request, type: BadgeType): BadgeOptions {
        const { theme, customLabel, labelColor, labelBackground, valueColor, valueBackground, repo } = req.query;
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

    /** Build a stable cache key from owner, repo, badge type, and display options. */
    private static buildRepoCacheKey(owner: string, repo: string, options: BadgeOptions): string {
        return [
            owner,
            repo,
            options.type,
            options.theme ?? 'default',
            options.customLabel ?? '',
            options.labelColor ?? '',
            options.labelBackground ?? '',
            options.valueColor ?? '',
            options.valueBackground ?? '',
        ].join('|');
    }

    /** Render a repository-specific badge. */
    private static async renderRepoBadge(
        res: Response,
        owner: string,
        repo: string,
        type: RepoBadgeType,
        options: BadgeOptions,
    ) {
        const cacheKey = BadgeController.buildRepoCacheKey(owner, repo, options);

        // 1. In-memory SVG cache hit
        const cached = BadgeController.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < BadgeController.CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            return res.send(cached.data);
        }

        // 2. Deduplicate in-flight requests for the same key
        let pending = BadgeController.pendingRequests.get(cacheKey);
        if (!pending) {
            pending = (async () => {
                // Fetch from GitHub
                const value = await BadgeController.githubClient.fetchRepoBadgeValue(owner, repo, type);
                const svg = BadgeRenderer.generateBadge(value, options);
                BadgeController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
                return svg;
            })();

            BadgeController.pendingRequests.set(cacheKey, pending);
            pending.finally(() => BadgeController.pendingRequests.delete(cacheKey));
        }

        const svg = await pending;
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=600');
        return res.send(svg);
    }

    /** GET /badge/repo-stars */
    static async getRepoStars(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-stars', BadgeController.parseRepoOptions(req, 'repo-stars'));
        } catch (err) {
            console.error('BadgeController.getRepoStars:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repo-forks */
    static async getRepoForks(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-forks', BadgeController.parseRepoOptions(req, 'repo-forks'));
        } catch (err) {
            console.error('BadgeController.getRepoForks:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repo-watchers */
    static async getRepoWatchers(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-watchers', BadgeController.parseRepoOptions(req, 'repo-watchers'));
        } catch (err) {
            console.error('BadgeController.getRepoWatchers:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repo-issues */
    static async getRepoIssues(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-issues', BadgeController.parseRepoOptions(req, 'repo-issues'));
        } catch (err) {
            console.error('BadgeController.getRepoIssues:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repo-prs */
    static async getRepoPrs(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-prs', BadgeController.parseRepoOptions(req, 'repo-prs'));
        } catch (err) {
            console.error('BadgeController.getRepoPrs:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repo-contributors */
    static async getRepoContributors(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-contributors', BadgeController.parseRepoOptions(req, 'repo-contributors'));
        } catch (err) {
            console.error('BadgeController.getRepoContributors:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /badge/repo-size */
    static async getRepoSize(req: Request, res: Response) {
        try {
            const params = BadgeController.requireOwnerRepo(req, res);
            if (!params) return;
            await BadgeController.renderRepoBadge(res, params.owner, params.repo, 'repo-size', BadgeController.parseRepoOptions(req, 'repo-size'));
        } catch (err) {
            console.error('BadgeController.getRepoSize:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }
}
