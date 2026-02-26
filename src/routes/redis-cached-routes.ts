import type { Application } from 'express';
import { StatsController } from '../controllers/stats.js';
import { LanguageController } from '../controllers/languages.js';
import { GraphController } from '../controllers/graph.js';
import { BadgeController } from '../controllers/badge.js';
import { cacheMiddleware } from '../utils/cache-middleware.js';
import { CACHE_KEYS, DEFAULT_TTL } from '../utils/redis-client.js';

export function registerCachedRoutes(app: Application): void {
    const normalizeQueryParams = (query: Record<string, unknown>): string => {
        const entries = Object.entries(query)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return [key, value.join(',')];
                }

                return [key, String(value)];
            })
            .sort(([a], [b]) => a.localeCompare(b));

        return new URLSearchParams(entries as Array<[string, string]>).toString();
    };

    // Cache middleware for /stats - cache by username and all params
    const statsCache = cacheMiddleware({
        keyGenerator: (req) => {
            const username = req.query.username as string;
            const params = normalizeQueryParams(req.query as Record<string, unknown>);
            return `${CACHE_KEYS.STATS(username)}:${params}`;
        },
        ttl: DEFAULT_TTL.STATS
    });

    // Cache middleware for /languages - cache by username
    const languagesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.LANGUAGES(req.query.username as string),
        ttl: DEFAULT_TTL.LANGUAGES
    });

    // Cache middleware for /graph - cache by username and all params
    const graphCache = cacheMiddleware({
        keyGenerator: (req) => {
            const username = req.query.username as string;
            const params = JSON.stringify(req.query);
            return CACHE_KEYS.GRAPH(username, params);
        },
        ttl: DEFAULT_TTL.GRAPH
    });

    // Cache middleware for badge routes - cache by type and username
    const badgeVisitorsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_VISITORS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeRepositoriesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_REPOSITORIES(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeOrganizationCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_ORGANIZATION(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeLanguagesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_LANGUAGES(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeFollowersCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_FOLLOWERS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalStarsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_STARS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalContributorsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_CONTRIBUTORS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalCommitsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_COMMITS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalCodeReviewsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_CODE_REVIEWS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalIssuesCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_ISSUES(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalPullRequestsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_PULL_REQUESTS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    const badgeTotalJoinedYearsCache = cacheMiddleware({
        keyGenerator: (req) => CACHE_KEYS.BADGE_TOTAL_JOINED_YEARS(req.query.username as string),
        ttl: DEFAULT_TTL.BADGE
    });

    // Main routes with caching
    app.get('/stats', statsCache, StatsController.getSvg);
    app.get('/languages', languagesCache, LanguageController.getSvg);
    app.get('/graph', graphCache, GraphController.getSvg);

    // Badge routes with caching
    app.get('/badge/visitors', badgeVisitorsCache, BadgeController.getVisitors);
    app.get('/badge/repositories', badgeRepositoriesCache, BadgeController.getRepositories);
    app.get('/badge/organization', badgeOrganizationCache, BadgeController.getOrganization);
    app.get('/badge/languages', badgeLanguagesCache, BadgeController.getLanguages);
    app.get('/badge/followers', badgeFollowersCache, BadgeController.getFollowers);
    app.get('/badge/total-stars', badgeTotalStarsCache, BadgeController.getTotalStars);
    app.get('/badge/total-contributors', badgeTotalContributorsCache, BadgeController.getTotalContributors);
    app.get('/badge/total-commits', badgeTotalCommitsCache, BadgeController.getTotalCommits);
    app.get('/badge/total-code-reviews', badgeTotalCodeReviewsCache, BadgeController.getTotalCodeReviews);
    app.get('/badge/total-issues', badgeTotalIssuesCache, BadgeController.getTotalIssues);
    app.get('/badge/total-pull-requests', badgeTotalPullRequestsCache, BadgeController.getTotalPullRequests);
    app.get('/badge/total-joined-years', badgeTotalJoinedYearsCache, BadgeController.getTotalJoinedYears);
}
