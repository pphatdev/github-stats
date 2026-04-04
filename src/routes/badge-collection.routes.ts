/**
 * Badge Collection Routes
 * Route for rendering multiple badges composed into a single SVG.
 */
import type { Application } from 'express';
import { BadgeCollectionController } from '../controllers/badge-collection.controller.js';

/**
 * Register badge collection routes
 */
export function registerBadgeCollectionRoutes(app: Application): void {
    app.get('/badge/collection', BadgeCollectionController.getCollection);
}

/**
 * Get route documentation for badge collection
 */
export function getBadgeCollectionRouteDocs(): Record<string, typeof BadgeCollectionController.routeDocs[keyof typeof BadgeCollectionController.routeDocs]> {
    return {
        'GET /badge/collection': BadgeCollectionController.routeDocs.collection,
    };
}
