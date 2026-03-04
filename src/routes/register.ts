import type { Express } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { StatsController } from '../controllers/stats.js';
import { LanguageController } from '../controllers/languages.js';
import { GraphController } from '../controllers/graph.js';
import { UserBadgeController } from '../controllers/user-badge.controller.js';
import { ProjectBadgeController } from '../controllers/project-badge.controller.js';
import { registerCachedRoutes } from './redis-cached-routes.js';
import { registerUserBadgeRoutes } from './user-badge.routes.js';
import { registerProjectBadgeRoutes } from './project-badge.routes.js';

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
}

/**
 * Register all application routes
 */
export function registerRoutes(app: Express): void {
    registerCachedRoutes(app);
    registerUserBadgeRoutes(app);
    registerProjectBadgeRoutes(app);
}
