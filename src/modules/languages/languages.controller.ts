/**
 * Languages Controller
 * Handles HTTP requests for language statistics
 */

import { Request, Response } from 'express';
import { LanguagesService } from './languages.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { LanguageQueryParams } from './languages.types.js';

const logger = createLogger({ controller: 'LanguagesController' });

export class LanguagesController {
    private languagesService: LanguagesService;

    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: [
            'type',
            'theme',
            'show_info',
            'info_outline'
        ],
        payload: null as null,
        example: '/languages?username=pphatdev&type=card&theme=default'
    };

    constructor(languagesService: LanguagesService) {
        this.languagesService = languagesService;
    }

    /**
     * Get language visualization as SVG
     */
    async getSvg(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();

        try {
            const params = this.parseQueryParams(req);

            if (!params.username) {
                res.status(400).send('Username is required');
                return;
            }

            // Generate visualization
            const svg = await this.languagesService.generateLanguageVisualization(params);

            const duration = Date.now() - startTime;
            logger.info('Language visualization generated', {
                username: params.username,
                type: params.type,
                duration
            });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(svg);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate language visualization', error as Error, { duration });
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse query parameters
     */
    private parseQueryParams(req: Request): LanguageQueryParams {
        const { username, type, theme, show_info, info_outline } = req.query;

        return {
            username: username as string,
            type: (type as any) || 'card',
            theme: (theme as string) || 'default',
            show_info: show_info as string,
            info_outline: (info_outline as any) || 'solid'
        };
    }
}
