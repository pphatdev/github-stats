/**
 * Project Badge Routes
 * Routes for project/repository-specific badges (require owner and repo parameters)
 */
import type { Application } from 'express';
import { ProjectBadgeController } from '../controllers/project-badge.controller.js';

/**
 * Register project badge routes
 */
export function registerProjectBadgeRoutes(app: Application): void {
    // Register routes under /project prefix
    app.get('/project/stars', ProjectBadgeController.getStars);
    app.get('/project/forks', ProjectBadgeController.getForks);
    app.get('/project/watchers', ProjectBadgeController.getWatchers);
    app.get('/project/issues', ProjectBadgeController.getIssues);
    app.get('/project/prs', ProjectBadgeController.getPrs);
    app.get('/project/contributors', ProjectBadgeController.getContributors);
    app.get('/project/size', ProjectBadgeController.getSize);
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
