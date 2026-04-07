/**
 * Languages Routes
 * Defines HTTP routes for language endpoints
 */

import { Router } from 'express';
import { LanguagesController } from './languages.controller.js';
import { LanguagesService } from './languages.service.js';
import { GitHubClient } from '../../shared/utils/github-client.js';

export function createLanguagesRouter(
    githubClient: GitHubClient,
    cache: Map<string, any>,
    cacheDuration: number
): Router {
    const router = Router();

    // Initialize service and controller
    const languagesService = new LanguagesService(githubClient, cache, cacheDuration);
    const languagesController = new LanguagesController(languagesService);

    /**
     * @route GET /languages
     * @desc Get GitHub user language statistics visualization
     * @query username - GitHub username (required)
     * @query type - Visualization type: card, pie (default: card)
     * @query theme - Color theme (default: default)
     * @query show_info - Show info panel (default: true)
     * @query info_outline - Info outline style: solid, frame (default: solid)
     */
    router.get('/', async (req, res) => {
        await languagesController.getSvg(req, res);
    });

    return router;
}
