/**
 * Graphs Controller
 * Handles HTTP requests for contribution graphs
 */

import { Request, Response } from 'express';
import { GraphsService } from './graphs.service.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { GraphQueryParams } from './graphs.types.js';

const logger = createLogger({ controller: 'GraphsController' });

export class GraphsController {
    private graphsService: GraphsService;

    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: [
            'theme',
            'year',
            'animate',
            'size',
            'as',
            'format',
            'show_title',
            'show_total_contribution',
            'show_background',
            'bgColor',
            'borderColor',
            'textColor',
            'titleColor'
        ],
        payload: null,
        example: '/graph?username=pphatdev&animate=wave'
    };

    constructor(graphsService: GraphsService) {
        this.graphsService = graphsService;
    }

    /**
     * Get contribution graph as SVG
     */
    async getSvg(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();

        try {
            const params = this.parseQueryParams(req);
            
            if (!params.username) {
                res.status(400).send('Username is required');
                return;
            }

            // Generate graph
            const svg = await this.graphsService.generateGraph(params);

            const duration = Date.now() - startTime;
            logger.info('Graph SVG generated', { 
                username: params.username,
                duration 
            });

            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.send(svg);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate graph SVG', error as Error, { duration });
            res.status(500).send('Failed to generate graph');
        }
    }

    /**
     * Get contribution graph as PNG
     */
    async getPng(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();

        try {
            const params = this.parseQueryParams(req);
            
            if (!params.username) {
                res.status(400).send('Username is required');
                return;
            }

            // Generate SVG first
            const svg = await this.graphsService.generateGraph(params);
            
            // Convert to PNG
            const png = await this.graphsService.convertToPng(svg);

            const duration = Date.now() - startTime;
            logger.info('Graph PNG generated', { 
                username: params.username,
                duration 
            });

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.send(png);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate graph PNG', error as Error, { duration });
            res.status(500).send('Failed to generate graph');
        }
    }

    /**
     * Get contribution graph as WebP
     */
    async getWebp(req: Request, res: Response): Promise<void> {
        const startTime = Date.now();

        try {
            const params = this.parseQueryParams(req);
            
            if (!params.username) {
                res.status(400).send('Username is required');
                return;
            }

            // Generate SVG first
            const svg = await this.graphsService.generateGraph(params);
            
            // Convert to WebP
            const webp = await this.graphsService.convertToWebp(svg);

            const duration = Date.now() - startTime;
            logger.info('Graph WebP generated', { 
                username: params.username,
                duration 
            });

            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.send(webp);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to generate graph WebP', error as Error, { duration });
            res.status(500).send('Failed to generate graph');
        }
    }

    /**
     * Parse query parameters
     */
    private parseQueryParams(req: Request): GraphQueryParams {
        const {
            username,
            theme,
            year,
            animate,
            size,
            as: outputFormat,
            format: formatParam,
            show_title,
            show_total_contribution,
            show_background,
            bgColor,
            borderColor,
            textColor,
            titleColor
        } = req.query;

        return {
            username: username as string,
            theme: (theme as string) || 'default',
            year: year as string,
            animate: animate as string,
            size: size as string,
            as: outputFormat as string,
            format: formatParam as string,
            show_title: (show_title as string) || 'false',
            show_total_contribution: (show_total_contribution as string) || 'false',
            show_background: (show_background as string) || 'false',
            bgColor: bgColor as string,
            borderColor: borderColor as string,
            textColor: textColor as string,
            titleColor: titleColor as string
        };
    }
}
