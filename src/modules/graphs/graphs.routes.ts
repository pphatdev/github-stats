/**
 * Graphs Routes
 * Defines HTTP routes for graph endpoints
 */

import { Router } from 'express';
import { GraphsController } from './graphs.controller.js';
import { GraphsService } from './graphs.service.js';
import { GitHubClient } from '../../shared/utils/github-client.js';

export function createGraphsRouter(
    githubClient: GitHubClient,
    cache: Map<string, any>,
    cacheDuration: number
): Router {
    const router = Router();

    // Initialize service and controller
    const graphsService = new GraphsService(githubClient, cache, cacheDuration);
    const graphsController = new GraphsController(graphsService);

    /**
     * @route GET /graph
     * @desc Get GitHub contribution graph
     * @query username - GitHub username (required)
     * @query format - Output format: svg, png, webp (default: svg)
     * @query theme - Color theme (default: default)
     * @query year - Specific year for contributions
     * @query animate - Animation type
     * @query size - Graph size
     * @query show_title - Show title (default: false)
     * @query show_total_contribution - Show total contributions (default: false)
     * @query show_background - Show background (default: false)
     * @query bgColor - Background color
     * @query borderColor - Border color
     * @query textColor - Text color
     * @query titleColor - Title color
     */
    router.get('/', async (req, res) => {
        const format = (req.query.format as string) || (req.query.as as string) || 'svg';

        switch (format) {
            case 'png':
                await graphsController.getPng(req, res);
                break;
            case 'webp':
                await graphsController.getWebp(req, res);
                break;
            case 'svg':
            default:
                await graphsController.getSvg(req, res);
                break;
        }
    });

    return router;
}
