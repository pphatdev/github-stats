/**
 * User Badge Routes
 * Routes for user-specific badges (require username parameter)
 */
import type { Application, Request } from 'express';
import { UserBadgeController } from '../controllers/user-badge.controller.js';
import { cacheMiddleware } from '../utils/cache-middleware.js';
import { CACHE_KEYS, DEFAULT_TTL } from '../utils/redis-client.js';

/**
 * Register user badge routes with caching middleware
 */
export function registerUserBadgeRoutes(app: Application): void {
    // Cache middleware for each badge type
    const visitorsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_VISITORS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const repositoriesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_REPOSITORIES(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const organizationCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_ORGANIZATION(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const languagesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_LANGUAGES(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const followersCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_FOLLOWERS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalStarsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_STARS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalContributorsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_CONTRIBUTORS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalCommitsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_COMMITS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalCodeReviewsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_CODE_REVIEWS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalIssuesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_ISSUES(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalPullRequestsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_PULL_REQUESTS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    const totalJoinedYearsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_JOINED_YEARS(req.query.username as string),
        responseHeaders: () => ({ 'Content-Type': 'image/svg+xml' }),
        ttl: DEFAULT_TTL.BADGE
    });

    // Register routes
    app.get('/badge/visitors', visitorsCache, UserBadgeController.getVisitors);
    app.get('/badge/repositories', repositoriesCache, UserBadgeController.getRepositories);
    app.get('/badge/organization', organizationCache, UserBadgeController.getOrganization);
    app.get('/badge/languages', languagesCache, UserBadgeController.getLanguages);
    app.get('/badge/followers', followersCache, UserBadgeController.getFollowers);
    app.get('/badge/total-stars', totalStarsCache, UserBadgeController.getTotalStars);
    app.get('/badge/total-contributors', totalContributorsCache, UserBadgeController.getTotalContributors);
    app.get('/badge/total-commits', totalCommitsCache, UserBadgeController.getTotalCommits);
    app.get('/badge/total-code-reviews', totalCodeReviewsCache, UserBadgeController.getTotalCodeReviews);
    app.get('/badge/total-issues', totalIssuesCache, UserBadgeController.getTotalIssues);
    app.get('/badge/total-pull-requests', totalPullRequestsCache, UserBadgeController.getTotalPullRequests);
    app.get('/badge/total-joined-years', totalJoinedYearsCache, UserBadgeController.getTotalJoinedYears);
}

/**
 * Get route documentation for user badges
 */
export function getUserBadgeRouteDocs(): Record<string, typeof UserBadgeController.routeDocs[keyof typeof UserBadgeController.routeDocs]> {
    return {
        'GET /badge/visitors': UserBadgeController.routeDocs.visitors,
        'GET /badge/repositories': UserBadgeController.routeDocs.repositories,
        'GET /badge/organization': UserBadgeController.routeDocs.organization,
        'GET /badge/languages': UserBadgeController.routeDocs.languages,
        'GET /badge/followers': UserBadgeController.routeDocs.followers,
        'GET /badge/total-stars': UserBadgeController.routeDocs['total-stars'],
        'GET /badge/total-contributors': UserBadgeController.routeDocs['total-contributors'],
        'GET /badge/total-commits': UserBadgeController.routeDocs['total-commits'],
        'GET /badge/total-code-reviews': UserBadgeController.routeDocs['total-code-reviews'],
        'GET /badge/total-issues': UserBadgeController.routeDocs['total-issues'],
        'GET /badge/total-pull-requests': UserBadgeController.routeDocs['total-pull-requests'],
        'GET /badge/total-joined-years': UserBadgeController.routeDocs['total-joined-years'],
    };
}
