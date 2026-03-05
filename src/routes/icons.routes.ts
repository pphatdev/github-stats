/**
 * Icons Routes
 * Routes for icon demo and retrieval
 */
import type { Application } from 'express';
import { IconsController } from '../controllers/icons.controller.js';

/**
 * Register icon-related HTTP routes on the provided Express application.
 *
 * Registers the following routes:
 * - GET /icons/demo → demo page
 * - GET /icons → list all icons
 * - GET /icons/:name → retrieve a specific icon (accepts `/icons/name` and `/icons/name.svg`)
 *
 * @param app - The Express application instance to attach routes to
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
 * Provide documentation entries for the icon-related HTTP routes.
 *
 * @returns An object mapping HTTP method and path strings to the corresponding route documentation entries from `IconsController.routeDocs` for:
 * - `GET /icons`
 * - `GET /icons/:name`
 * - `GET /icons/demo`
 */
export function getIconsRouteDocs(): Record<string, typeof IconsController.routeDocs[keyof typeof IconsController.routeDocs]> {
    return {
        'GET /icons': IconsController.routeDocs['icons-list'],
        'GET /icons/:name': IconsController.routeDocs['icons-get'],
        'GET /icons/demo': IconsController.routeDocs['icons-demo'],
    };
}
