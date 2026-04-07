/**
 * Stats Module
 * Exports all stats-related functionality
 */

import { Router } from 'express';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';
import type { GitHubClient } from '../../shared/utils/github-client.js';

export { StatsController } from './stats.controller.js';
export { StatsService } from './stats.service.js';
export type { StatsQueryParams, StatsCardOptions } from './stats.types.js';

/**
 * Factory function to create stats router with dependencies
 */
export function createStatsRouter(
    githubClient: GitHubClient,
    cache: Map<string, any>,
    cacheDuration: number
): Router {
    const router = Router();
    const statsService = new StatsService(githubClient, cache, cacheDuration);
    const statsController = new StatsController(statsService);

    router.get('/', (req, res) => statsController.getStats(req, res));

    return router;
}
