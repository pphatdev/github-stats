/**
 * Badges Routes
 * Defines HTTP routes for the unified badges endpoint.
 */

import { Router } from 'express';
import { BadgesController } from './badges.controller.js';
import { BadgesService } from './badges.service.js';
import { GitHubClient } from '../../shared/utils/github-client.js';
import { validate } from '../../shared/middlewares/error.middleware.js';
import { badgeQuerySchema } from '../../shared/validations/validation.js';
import type { ResponseCache } from '../../shared/utils/response-cache.js';

export function createBadgesRouter(
    githubClient: GitHubClient,
    cache: ResponseCache<any>,
    cacheDuration: number
): Router {
    const router = Router();

    // Initialize service and controller
    const badgesService = new BadgesService(githubClient, cache, cacheDuration);
    const badgesController = new BadgesController(badgesService);

    router.get('/', validate(badgeQuerySchema, 'query'), async (req, res) => {
        await badgesController.getBadges(req, res);
    });

    return router;
}
