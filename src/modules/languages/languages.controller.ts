/**
 * Languages Controller
 * Handles HTTP requests for language statistics
 */

import { Request, Response } from 'express';
import { LanguagesService } from './languages.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { LanguagesQuery } from '../../shared/validations/validation.js';
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
            'info_outline',
            'size'
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
            const params = this.readValidated(req);

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
            // Never echo raw error messages to clients — they may leak internal
            // paths, GitHub-token hints from rate-limit errors, or DB details.
            res.status(500).send('Failed to generate language visualization');
        }
    }

    /**
     * Read the Zod-validated query. `validate(languagesQuerySchema, 'query')`
     * attaches `req.validated`; controller-level defaults for backward
     * compatibility are applied here.
     */
    private readValidated(req: Request): LanguageQueryParams {
        const v = (req as Request & { validated?: LanguagesQuery }).validated ?? ({} as LanguagesQuery);
        return {
            username: v.username as string,
            type: v.type ?? 'card',
            theme: v.theme ?? 'default',
            show_info: v.show_info,
            info_outline: v.info_outline ?? 'solid',
            size: v.size,
        };
    }
}
