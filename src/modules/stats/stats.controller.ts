/**
 * Stats Module - Controller
 * Handles user statistics card generation
 */

import { Request, Response } from 'express';
import { StatsService } from './stats.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { StatsQuery } from '../../shared/validations/validation.js';
import type { StatsQueryParams } from './stats.types.js';

const logger = createLogger({ service: 'StatsController' });

export class StatsController {
    private statsService: StatsService;

    constructor(statsService: StatsService) {
        this.statsService = statsService;
    }

    async getStats(req: Request, res: Response): Promise<void> {
        try {
            // Populated by `validate(statsQuerySchema, 'query')` at the route.
            // Zod has already enforced username shape, enum values, and hex colors
            // (normalized to `#…` form).
            const params = (req as Request & { validated?: StatsQuery }).validated as StatsQueryParams;

            // Determine format based on user agent
            const userAgent = req.get('user-agent') || '';
            const isPreviewBot = /discordbot|twitterbot|slackbot|facebookexternalhit|linkedinbot|telegrambot|telegram|mastodon|whatsapp/i.test(userAgent);
            const format = params.format?.toLowerCase() || (isPreviewBot ? 'webp' : 'svg');

            // Generate SVG
            const svg = await this.statsService.generateSvg(params);

            // Convert to WebP if requested
            if (format === 'webp') {
                const cacheKey = JSON.stringify(params) + '|webp';
                const webpBuffer = await this.statsService.convertToWebp(svg, cacheKey);
                res.setHeader('Content-Type', 'image/webp');
                res.setHeader('Cache-Control', 'public, max-age=600');
                res.send(webpBuffer);
                return;
            }

            // Return SVG
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(svg);

        } catch (error) {
            logger.error('Failed to generate stats', error as Error);
            res.status(500).send('Failed to generate stats');
        }
    }
}
