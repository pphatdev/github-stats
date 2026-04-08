/**
 * Badges Routes
 * Defines HTTP routes for the unified badges endpoint.
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

    router.get('/', async (req, res) => {
        await badgesController.getBadges(req, res);
    });

    return router;
}
