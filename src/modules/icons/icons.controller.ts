/**
 * Icons Controller
 * Handles HTTP requests for icon retrieval
 */

import { Request, Response } from 'express';
import { IconsService } from './icons.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import { generateIconsDemoHTML } from '../../views/icons-demo.view.js';

const logger = createLogger({ controller: 'IconsController' });

export class IconsController {
    private iconsService: IconsService;

    constructor(iconsService: IconsService) {
        this.iconsService = iconsService;
    }

    /**
     * Get icon SVG
     */
    async getIcon(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();

        try {
            const iconName = req.params.icon;
            const { color } = req.query;

            if (!iconName) {
                res.status(400).send('Icon name is required');
                return;
            }

            const { content, etag } = await this.iconsService.getIcon(
                iconName,
                color as string | undefined
            );

            // Check ETag for conditional requests
            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return;
            }

            const duration = Date.now() - startTime;
            logger.info('Icon served', { iconName, color, duration });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', this.iconsService.getCacheControl());
            res.setHeader('ETag', etag);
            res.send(content);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to serve icon', error as Error, { duration });

            if ((error as Error).message.includes('Invalid')) {
                res.status(400).send((error as Error).message);
            } else {
                res.status(404).send('Icon not found');
            }
        }
    }

    /**
     * Get icons list
     */
    async getIconsList(req: Request, res: Response): Promise<void> {
        try {
            const icons = await this.iconsService.loadIconsList();

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.json({ icons, count: icons.length });
        } catch (error) {
            logger.error('Failed to load icons list', error as Error);
            res.status(500).send('Failed to load icons list');
        }
    }

    /**
     * Show icons demo page
     */
    async showDemo(req: Request, res: Response): Promise<void> {
        try {
            const icons = await this.iconsService.loadIconsList();
            const html = generateIconsDemoHTML({ icons });

            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } catch (error) {
            logger.error('Failed to generate icons demo', error as Error);
            res.status(500).send('Failed to generate icons demo');
        }
    }
}
