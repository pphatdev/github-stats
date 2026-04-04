import type { Express } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { StatsController } from '../controllers/stats.js';
import { LanguageController } from '../controllers/languages.js';
import { GraphController } from '../controllers/graph.js';
import { UserBadgeController } from '../controllers/user-badge.controller.js';
import { ProjectBadgeController } from '../controllers/project-badge.controller.js';
import { registerCachedRoutes } from './redis-cached.routes.js';
import { registerUserBadgeRoutes } from './user-badge.routes.js';
import { registerProjectBadgeRoutes } from './project-badge.routes.js';
import { registerBadgeCacheRoutes } from './badge-cache.routes.js';
import { registerIconsRoutes } from './icons.routes.js';
import { BadgeCollectionController } from '../controllers/badge-collection.controller.js';
import { registerBadgeCollectionRoutes } from './badge-collection.routes.js';

// Cache type
type CacheMap = Map<string, { data: string; timestamp: number }>;

/**
 * Initialize all controllers with shared dependencies
 */
export function initializeControllers(
    githubClient: GitHubClient,
    cache: CacheMap,
    cacheDuration: number
): void {
    StatsController.initialize(githubClient, cache, cacheDuration);
    LanguageController.initialize(githubClient, cache, cacheDuration);
    GraphController.initialize(githubClient, cache, cacheDuration);
    UserBadgeController.initialize(githubClient, cache, cacheDuration);
    ProjectBadgeController.initialize(githubClient, cache, cacheDuration);
    BadgeCollectionController.initialize(githubClient, cache, cacheDuration);
}

/**
 * Register all application routes on the given Express app.
 *
 * @param app - The Express application instance to attach routes to
 */
export function registerRoutes(app: Express): void {
    registerCachedRoutes(app);
    registerUserBadgeRoutes(app);
    registerProjectBadgeRoutes(app);
    registerBadgeCacheRoutes(app);
    registerBadgeCollectionRoutes(app);
    registerIconsRoutes(app);
}
