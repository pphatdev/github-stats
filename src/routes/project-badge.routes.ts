/**
 * Project Badge Routes
 * Routes for project/repository-specific badges (require owner and repo parameters)
 */
import type { Application, Request } from 'express';
import { ProjectBadgeController } from '../controllers/project-badge.controller.js';
import { cacheMiddleware } from '../utils/cache-middleware.js';
import { CACHE_KEYS, DEFAULT_TTL } from '../utils/redis-client.js';

/** Parse repo query param into owner and repo - returns null if invalid */
const parseRepo = (repo: unknown): { owner: string; repo: string } | null => {
    if (!repo || typeof repo !== 'string') return null;
    const parts = repo.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1] };
};

/**
 * Register project badge routes with caching middleware
 */
export function registerProjectBadgeRoutes(app: Application): void {
    // Cache middleware for each project badge type
    const starsCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return ''; // Empty key will skip caching
            return CACHE_KEYS.BADGE_REPO_STARS(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const forksCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return '';
            return CACHE_KEYS.BADGE_REPO_FORKS(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const watchersCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return '';
            return CACHE_KEYS.BADGE_REPO_WATCHERS(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const issuesCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return '';
            return CACHE_KEYS.BADGE_REPO_ISSUES(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const prsCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return '';
            return CACHE_KEYS.BADGE_REPO_PRS(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const contributorsCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return '';
            return CACHE_KEYS.BADGE_REPO_CONTRIBUTORS(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const sizeCache = cacheMiddleware({
        keyGenerator: (req) => {
            const parsed = parseRepo(req.query.repo);
            if (!parsed) return '';
            return CACHE_KEYS.BADGE_REPO_SIZE(parsed.owner, parsed.repo);
        },
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    // Register routes under /project prefix
    app.get('/project/stars', starsCache, ProjectBadgeController.getStars);
    app.get('/project/forks', forksCache, ProjectBadgeController.getForks);
    app.get('/project/watchers', watchersCache, ProjectBadgeController.getWatchers);
    app.get('/project/issues', issuesCache, ProjectBadgeController.getIssues);
    app.get('/project/prs', prsCache, ProjectBadgeController.getPrs);
    app.get('/project/contributors', contributorsCache, ProjectBadgeController.getContributors);
    app.get('/project/size', sizeCache, ProjectBadgeController.getSize);
}

/**
 * Get route documentation for project badges
 */
export function getProjectBadgeRouteDocs(): Record<string, typeof ProjectBadgeController.routeDocs[keyof typeof ProjectBadgeController.routeDocs]> {
    return {
        'GET /project/stars': ProjectBadgeController.routeDocs['repo-stars'],
        'GET /project/forks': ProjectBadgeController.routeDocs['repo-forks'],
        'GET /project/watchers': ProjectBadgeController.routeDocs['repo-watchers'],
        'GET /project/issues': ProjectBadgeController.routeDocs['repo-issues'],
        'GET /project/prs': ProjectBadgeController.routeDocs['repo-prs'],
        'GET /project/contributors': ProjectBadgeController.routeDocs['repo-contributors'],
        'GET /project/size': ProjectBadgeController.routeDocs['repo-size'],
    };
}
