/**
 * Project Badge Controller
 * Handles repository/project-specific badge endpoints
 * Features: Redis persistent caching, request deduplication, GitHub API optimization
 */
import { Request, Response } from 'express';
import { GitHubClient, RepoBadgeType } from '../utils/github-client.js';
import { BadgeRenderer } from '../components/badge-renderer.js';
import { getBadgeCacheServiceSync } from '../services/badge-cache.service.js';
import type { BadgeOptions, ProjectBadgeType, BadgeRouteDoc, BADGE_OPTIONAL_PARAMS } from '../types/badge.types.js';

export class ProjectBadgeController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();

    /** Route documentation for project badges */
    static routeDocs: Record<ProjectBadgeType, BadgeRouteDoc> = {
        'repo-stars': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/stars?repo=pphatdev/github-stats'
        },
        'repo-forks': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/forks?repo=pphatdev/github-stats'
        },
        'repo-watchers': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/watchers?repo=pphatdev/github-stats'
        },
        'repo-issues': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/issues?repo=pphatdev/github-stats'
        },
        'repo-prs': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/prs?repo=pphatdev/github-stats'
        },
        'repo-contributors': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/contributors?repo=pphatdev/github-stats'
        },
        'repo-size': {
            requiredParams: ['repo'],
            optionalParams: ['theme', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/project/size?repo=pphatdev/github-stats'
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

    /** Validate and parse repo param (format: owner/repo); sends 400 and returns null on failure. */
    private static requireRepo(req: Request, res: Response): { owner: string; repo: string } | null {
        const { repo } = req.query;
        if (!repo || typeof repo !== 'string') {
            res.status(400).send('repo is required (format: owner/repo)');
            return null;
        }
        const parts = repo.split('/');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            res.status(400).send('repo must be in format: owner/repo');
            return null;
        }
        return { owner: parts[0], repo: parts[1] };
    }

    /** Parse options for project badges */
    private static parseOptions(req: Request, type: ProjectBadgeType): BadgeOptions {
        const { theme, customLabel, labelColor, labelBackground, iconColor, valueColor, valueBackground } = req.query;
        return {
            type,
            theme: typeof theme === 'string' ? theme : undefined,
            customLabel: typeof customLabel === 'string' ? customLabel : undefined,
            labelColor: typeof labelColor === 'string' ? labelColor : undefined,
            labelBackground: typeof labelBackground === 'string' ? labelBackground : undefined,
            iconColor: typeof iconColor === 'string' ? iconColor : undefined,
            valueColor: typeof valueColor === 'string' ? valueColor : undefined,
            valueBackground: typeof valueBackground === 'string' ? valueBackground : undefined,
        };
    }

    /** Build a stable cache key from owner, repo, badge type, and display options. */
    private static buildCacheKey(owner: string, repo: string, options: BadgeOptions): string {
        return [
            'project',
            owner,
            repo,
            options.type,
            options.theme ?? 'default',
            options.customLabel ?? '',
            options.labelColor ?? '',
            options.labelBackground ?? '',
            options.iconColor ?? '',
            options.valueColor ?? '',
            options.valueBackground ?? '',
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
        };
    }

    /** Render a repository-specific badge with Redis caching. */
    private static async renderBadge(
        res: Response,
        owner: string,
        repo: string,
        type: RepoBadgeType,
        options: BadgeOptions,
    ) {
        const cacheKey = ProjectBadgeController.buildCacheKey(owner, repo, options);
        const badgeService = getBadgeCacheServiceSync();
        const optionsRecord = ProjectBadgeController.optionsToRecord(options);

        // 1. Check Redis persistent cache first
        if (badgeService?.isReady()) {
            const redisCached = await badgeService.getProjectBadgeSVG(owner, repo, type, optionsRecord);
            if (redisCached) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                res.setHeader('X-Cache', 'REDIS');
                return res.send(redisCached.svg);
            }
        }

        // 2. Check in-memory SVG cache hit
        const cached = ProjectBadgeController.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < ProjectBadgeController.CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.setHeader('X-Cache', 'MEMORY');
            return res.send(cached.data);
        }

        // 3. Deduplicate in-flight requests for the same key
        let pending = ProjectBadgeController.pendingRequests.get(cacheKey);
        if (!pending) {
            pending = (async () => {
                // Fetch from GitHub
                const value = await ProjectBadgeController.githubClient.fetchRepoBadgeValue(owner, repo, type);
                const svg = BadgeRenderer.generateBadge(value, options);
                
                // Cache in both layers
                ProjectBadgeController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
                
                // Cache in Redis
                if (badgeService?.isReady()) {
                    await badgeService.setProjectBadgeSVG(owner, repo, type, optionsRecord, {
                        svg,
                        value,
                        timestamp: Date.now(),
                        dbTimestamp: Date.now(),
                    });
                }
                
                return svg;
            })();

            ProjectBadgeController.pendingRequests.set(cacheKey, pending);
            pending.finally(() => ProjectBadgeController.pendingRequests.delete(cacheKey));
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

    /** GET /project/stars - Repository star count */
    static async getStars(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-stars',
                ProjectBadgeController.parseOptions(req, 'repo-stars')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getStars:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /project/forks - Repository fork count */
    static async getForks(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-forks',
                ProjectBadgeController.parseOptions(req, 'repo-forks')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getForks:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /project/watchers - Repository watcher count */
    static async getWatchers(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-watchers',
                ProjectBadgeController.parseOptions(req, 'repo-watchers')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getWatchers:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /project/issues - Repository open issues count */
    static async getIssues(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-issues',
                ProjectBadgeController.parseOptions(req, 'repo-issues')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getIssues:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /project/prs - Repository open pull requests count */
    static async getPrs(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-prs',
                ProjectBadgeController.parseOptions(req, 'repo-prs')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getPrs:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /project/contributors - Repository contributors count */
    static async getContributors(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-contributors',
                ProjectBadgeController.parseOptions(req, 'repo-contributors')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getContributors:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }

    /** GET /project/size - Repository size */
    static async getSize(req: Request, res: Response) {
        try {
            const params = ProjectBadgeController.requireRepo(req, res);
            if (!params) return;
            await ProjectBadgeController.renderBadge(
                res,
                params.owner,
                params.repo,
                'repo-size',
                ProjectBadgeController.parseOptions(req, 'repo-size')
            );
        } catch (err) {
            console.error('ProjectBadgeController.getSize:', err);
            res.status(500).send(`Error: ${err instanceof Error ? err.message : err}`);
        }
    }
}
