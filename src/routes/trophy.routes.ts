/**
 * Trophy Badge Routes
 * Routes for user trophy badge (requires username parameter)
 */
import type { Application } from 'express';
import { TrophyController } from '../controllers/trophy.controller.js';

/**
 * Register trophy badge routes
 */
export function registerTrophyRoutes(app: Application): void {
    // Register trophy route with support for badge selection
    app.get('/badge/trophy', TrophyController.getTrophy);
}

/**
 * Get route documentation for trophy badge
 */
export function getTrophyRouteDocs(): Record<string, typeof TrophyController.routeDocs['trophy']> {
    return {
        'GET /badge/trophy': TrophyController.routeDocs.trophy,
    };
}
