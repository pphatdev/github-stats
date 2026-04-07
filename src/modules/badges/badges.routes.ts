/**
 * Badges Routes
 * Defines HTTP routes for badge endpoints
 */

import { Router } from 'express';
import { BadgesController } from './badges.controller.js';
import { BadgesService } from './badges.service.js';
import { GitHubClient } from '../../shared/utils/github-client.js';

export function createBadgesRouter(
    githubClient: GitHubClient,
    cache: Map<string, any>,
    cacheDuration: number
): Router {
    const router = Router();

    // Initialize service and controller
    const badgesService = new BadgesService(githubClient, cache, cacheDuration);
    const badgesController = new BadgesController(badgesService);

    // User badge routes
    router.get('/visitors', (req, res) => badgesController.getUserBadge(req, res, 'visitors'));
    router.get('/repositories', (req, res) => badgesController.getUserBadge(req, res, 'repositories'));
    router.get('/organization', (req, res) => badgesController.getUserBadge(req, res, 'organization'));
    router.get('/languages', (req, res) => badgesController.getUserBadge(req, res, 'languages'));
    router.get('/followers', (req, res) => badgesController.getUserBadge(req, res, 'followers'));
    router.get('/total-stars', (req, res) => badgesController.getUserBadge(req, res, 'total-stars'));
    router.get('/total-contributors', (req, res) => badgesController.getUserBadge(req, res, 'total-contributors'));
    router.get('/total-commits', (req, res) => badgesController.getUserBadge(req, res, 'total-commits'));
    router.get('/total-code-reviews', (req, res) => badgesController.getUserBadge(req, res, 'total-code-reviews'));
    router.get('/total-issues', (req, res) => badgesController.getUserBadge(req, res, 'total-issues'));
    router.get('/total-pull-requests', (req, res) => badgesController.getUserBadge(req, res, 'total-pull-requests'));
    router.get('/total-joined-years', (req, res) => badgesController.getUserBadge(req, res, 'total-joined-years'));

    // Project badge routes
    router.get('/project/stars', (req, res) => badgesController.getProjectBadge(req, res, 'stars'));
    router.get('/project/forks', (req, res) => badgesController.getProjectBadge(req, res, 'forks'));
    router.get('/project/contributors', (req, res) => badgesController.getProjectBadge(req, res, 'contributors'));
    router.get('/project/commits', (req, res) => badgesController.getProjectBadge(req, res, 'commits'));
    router.get('/project/code-reviews', (req, res) => badgesController.getProjectBadge(req, res, 'code-reviews'));
    router.get('/project/issues', (req, res) => badgesController.getProjectBadge(req, res, 'issues'));
    router.get('/project/pull-requests', (req, res) => badgesController.getProjectBadge(req, res, 'pull-requests'));
    router.get('/project/watchers', (req, res) => badgesController.getProjectBadge(req, res, 'watchers'));
    router.get('/project/language', (req, res) => badgesController.getProjectBadge(req, res, 'language'));
    router.get('/project/license', (req, res) => badgesController.getProjectBadge(req, res, 'license'));
    router.get('/project/size', (req, res) => badgesController.getProjectBadge(req, res, 'size'));

    return router;
}
