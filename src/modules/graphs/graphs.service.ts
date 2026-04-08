/**
 * Graphs Service
 * Business logic for GitHub contribution graphs
 */

import { GitHubClient } from '../../shared/utils/github-client.js';
import { GraphRenderer } from '../../shared/components/graph-renderer.js';
import { createLogger } from '../../shared/logs/logger.js';
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import type { GraphQueryParams, GraphCache, GraphOptions, GraphDateRange } from './graphs.types.js';

const logger = createLogger({ service: 'GraphsService' });

export class GraphsService {
    private githubClient: GitHubClient;
    private cache: Map<string, GraphCache>;
    private readonly cacheDuration: number;

    constructor(
        githubClient: GitHubClient,
        cache: Map<string, GraphCache>,
        cacheDuration: number
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.cacheDuration = cacheDuration;
    }

    /**
     * Generate contribution graph
     */
    async generateGraph(params: GraphQueryParams): Promise<string> {
        const dateRange = this.getDateRange(params);
        const cacheKey = this.getCacheKey(params, dateRange);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            logger.debug('Returning cached graph', { username: params.username });
            return cached.data;
        }

        // Fetch contribution data
        const contributions = await this.githubClient.fetchUserContributions(
            params.username,
            dateRange.from,
            dateRange.to,
            `${dateRange.displayYear || 'current'}`
        );

        // Generate graph
        const options = this.parseOptions(params);
        const graphCardOptions = {
            ...options,
            year: dateRange.displayYear,
            show_title: options.showTitle,
            show_total_contribution: options.showTotalContribution,
            show_background: options.showBackground,
            animate: (params.animate as 'none' | 'glow' | 'wave' | 'pulse' | undefined),
            as: (params.format as 'svg' | 'webp' | 'png' | 'gif' | undefined),
            size: (params.size as 'small' | 'medium' | 'large' | 'default' | undefined)
        };
        const svg = GraphRenderer.generateGraphCard(
            contributions,
            graphCardOptions
        );

        // Cache result
        this.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

        logger.info('Graph generated', {
            username: params.username,
            year: dateRange.displayYear
        });

        return svg;
    }

    /**
     * Convert SVG to PNG
     */
    async convertToPng(svg: string): Promise<Buffer> {
        const resvg = new Resvg(svg, {
            fitTo: {
                mode: 'width',
                value: 1000,
            },
        });

        const pngData = resvg.render();
        return pngData.asPng();
    }

    /**
     * Convert SVG to WebP
     */
    async convertToWebp(svg: string): Promise<Buffer> {
        const pngBuffer = await this.convertToPng(svg);
        const webpBuffer = await sharp(pngBuffer)
            .webp({ quality: 90 })
            .toBuffer();
        return webpBuffer;
    }

    /**
     * Get date range for graph
     */
    private getDateRange(params: GraphQueryParams): GraphDateRange {
        if (params.year && params.year !== 'last') {
            const y = parseInt(params.year, 10);
            if (!isNaN(y)) {
                return {
                    from: `${y}-01-01T00:00:00Z`,
                    to: `${y}-12-31T23:59:59Z`,
                    cacheKeyExtra: y.toString(),
                    displayYear: y
                };
            }
        }

        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);

        return {
            from: oneYearAgo.toISOString(),
            to: now.toISOString(),
            cacheKeyExtra: 'last-year',
            displayYear: 'Last Year'
        };
    }

    /**
     * Parse graph options
     */
    private parseOptions(params: GraphQueryParams): GraphOptions {
        return {
            theme: params.theme || 'default',
            showTitle: params.show_title === 'true',
            showTotalContribution: params.show_total_contribution === 'true',
            showBackground: params.show_background === 'true',
            bgColor: params.bgColor,
            borderColor: params.borderColor,
            textColor: params.textColor,
            titleColor: params.titleColor
        };
    }

    /**
     * Get cache key
     * Includes all rendering-affecting params so different options produce distinct keys.
     * Uses '|' as delimiter to avoid collisions with color values that may contain '-'.
     */
    private getCacheKey(params: GraphQueryParams, dateRange: GraphDateRange): string {
        // Treat 'format' and 'as' as aliases; prefer 'as' when both are provided
        const outputFormat = params.as || params.format || '';
        const renderingParams = [
            params.theme || 'default',
            params.animate || '',
            params.size || '',
            outputFormat,
            params.show_title || '',
            params.show_total_contribution || '',
            params.show_background || '',
            params.bgColor || '',
            params.borderColor || '',
            params.textColor || '',
            params.titleColor || '',
        ].join('|');
        return `graph|${params.username}|${dateRange.cacheKeyExtra}|${renderingParams}`;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        logger.info('Graphs cache cleared');
    }
}
