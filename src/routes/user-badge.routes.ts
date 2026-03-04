/**
 * User Badge Routes
 * Routes for user-specific badges (require username parameter)
 */
import type { Application } from 'express';
import { UserBadgeController } from '../controllers/user-badge.controller.js';

/**
 * Register user badge routes
 */
export function registerUserBadgeRoutes(app: Application): void {
    // Register routes
    app.get('/badge/visitors', UserBadgeController.getVisitors);
    app.get('/badge/repositories', UserBadgeController.getRepositories);
    app.get('/badge/organization', UserBadgeController.getOrganization);
    app.get('/badge/languages', UserBadgeController.getLanguages);
    app.get('/badge/followers', UserBadgeController.getFollowers);
    app.get('/badge/total-stars', UserBadgeController.getTotalStars);
    app.get('/badge/total-contributors', UserBadgeController.getTotalContributors);
    app.get('/badge/total-commits', UserBadgeController.getTotalCommits);
    app.get('/badge/total-code-reviews', UserBadgeController.getTotalCodeReviews);
    app.get('/badge/total-issues', UserBadgeController.getTotalIssues);
    app.get('/badge/total-pull-requests', UserBadgeController.getTotalPullRequests);
    app.get('/badge/total-joined-years', UserBadgeController.getTotalJoinedYears);
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
