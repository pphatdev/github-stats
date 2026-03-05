/**
 * Icons Routes
 * Routes for icon demo and retrieval
 */
import type { Application } from 'express';
import { IconsController } from '../controllers/icons.controller.js';

/**
 * Register icons routes
 */
export function registerIconsRoutes(app: Application): void {
    // Demo page - must come before the :name route to avoid conflicts
    app.get('/icons/demo', IconsController.getDemoPage);

    // List all icons
    app.get('/icons', IconsController.getAllIcons);

    // Get specific icon (supports both /icons/name and /icons/name.svg)
    app.get('/icons/:name', IconsController.getIcon);
}

/**
 * Get route documentation for icons
 */
export function getIconsRouteDocs(): Record<string, typeof IconsController.routeDocs[keyof typeof IconsController.routeDocs]> {
    return {
        'GET /icons': IconsController.routeDocs['icons-list'],
        'GET /icons/:name': IconsController.routeDocs['icons-get'],
        'GET /icons/demo': IconsController.routeDocs['icons-demo'],
    };
}
