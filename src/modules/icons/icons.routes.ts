/**
 * Icons Routes
 * Defines HTTP routes for icon endpoints
 */

import { Router } from 'express';
import { IconsController } from './icons.controller.js';
import { IconsCollectionController } from './icons-collection.controller.js';
import { IconsService } from './icons.service.js';

export function createIconsRouter(): Router {
    const router = Router();

    // Initialize service and controller
    const iconsService = new IconsService();
    const iconsController = new IconsController(iconsService);

    /**
     * @route GET /icons
     * @desc Get list of available icons or icon collection if name parameter provided
     * @query name - Comma-separated icon names for collection (optional)
     * @query size - Icon size: small, medium, large (optional, defaults to medium)
     * @query color - Comma-separated colors for each icon (optional)
     * @query effect - Animation effect: glow, wave (optional)
     * @query columns - Number of columns in grid (optional, defaults to 3, max 40)
     */
    router.get('/', async (req, res) => {
        if (req.query.name) {
            await IconsCollectionController.getIconsCollection(req, res);
        } else {
            await iconsController.getIconsList(req, res);
        }
    });

    /**
     * @route GET /icons/demo
     * @desc Show icons demo page
     */
    router.get('/demo', async (req, res) => {
        await iconsController.showDemo(req, res);
    });

    /**
     * @route GET /icons/:icon
     * @desc Get specific icon SVG
     * @param icon - Icon name
     * @query color - Icon color (optional)
     */
    router.get('/:icon', async (req, res) => {
        await iconsController.getIcon(req, res);
    });

    return router;
}
