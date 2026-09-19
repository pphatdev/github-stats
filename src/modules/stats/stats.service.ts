/**
 * Stats Service
 * Business logic for GitHub user statistics
 */

import { GitHubClient } from '../../shared/utils/github-client.js';
import { CardRenderer } from '../../shared/components/card-renderer.js';
import { createLogger } from '../../shared/logs/logger.js';
import type { StatsQueryParams, StatsCache, PngCache } from './stats.types.js'; import type { StatsCardOptions } from './stats.types.js';
import type { ResponseCache } from '../../shared/utils/response-cache.js';

const logger = createLogger({ service: 'StatsService' });
let sharpLoader: Promise<any> | null = null;

async function getSharp() {
    if (!sharpLoader) {
        sharpLoader = import('sharp').then((module) => module.default);
    }

    return sharpLoader;
}

export class StatsService {
    private githubClient: GitHubClient;
    private cache: ResponseCache<StatsCache>;
    private pngCache: Map<string, PngCache>;
    private pendingRequests: Map<string, Promise<string>>;
    private pendingWebpRequests: Map<string, Promise<Buffer>>;
    private readonly cacheDuration: number;

    constructor(
        githubClient: GitHubClient,
        cache: ResponseCache<StatsCache>,
        cacheDuration: number
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.pngCache = new Map();
        this.pendingRequests = new Map();
        this.pendingWebpRequests = new Map();
        this.cacheDuration = cacheDuration;
    }

    /**
     * Generate SVG stats card
     */
    async generateSvg(params: StatsQueryParams): Promise<string> {
        const cacheKey = JSON.stringify(params);

        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            logger.debug('Returning cached SVG', { username: params.username });
            return cached.data;
        }

        // Check pending requests
        const pending = this.pendingRequests.get(cacheKey);
        if (pending) {
            logger.debug('Waiting for pending request', { username: params.username });
            return await pending;
        }

        // Generate new SVG
        const promise = this.generateNewSvg(params);
        this.pendingRequests.set(cacheKey, promise);

        try {
            const svg = await promise;
            this.cache.set(cacheKey, { data: svg, timestamp: Date.now() });
            return svg;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Generate new SVG from GitHub data
     */
    private async generateNewSvg(params: StatsQueryParams): Promise<string> {
        const avatarMode = params.avatar_mode || 'none';
        const stats = await this.githubClient.fetchUserStats(params.username, { avatarMode });

        const options: StatsCardOptions = {
            theme: params.theme || 'default',
            hideTitle: params.hide_title === 'true',
            hideBorder: params.hide_border === 'true',
            hideRank: params.hide_rank === 'true',
            showIcons: params.show_icons === 'true',
            avatarMode: avatarMode,
            customTitle: params.custom_title,
            dataBorderStyle: params.data_border_style as 'solid' | 'frame' || 'solid',
            dataBorderFramePosition: params.data_border_frame as 'in' | 'out' || 'out',
            textColor: params.textColor,
            titleColor: params.titleColor,
            size: params.size
        };

        return CardRenderer.generateStatsCard(stats, options);
    }

    /**
     * Convert SVG to PNG
     */
    async convertToPng(svg: string): Promise<Buffer> {
        const sharp = await getSharp();
        const pngBuffer = await sharp(Buffer.from(svg))
            .png()
            .toBuffer();
        return pngBuffer;
    }

    /**
     * Convert SVG to WebP
     */
    async convertToWebp(svg: string, cacheKey: string): Promise<Buffer> {
        // Check PNG cache first
        const pngCached = this.pngCache.get(cacheKey);
        if (pngCached && Date.now() - pngCached.timestamp < this.cacheDuration) {
            return pngCached.data;
        }

        // Check pending requests
        const pending = this.pendingWebpRequests.get(cacheKey);
        if (pending) {
            return await pending;
        }

        // Generate new WebP
        const promise = this.generateWebp(svg);
        this.pendingWebpRequests.set(cacheKey, promise);

        try {
            const webp = await promise;
            this.pngCache.set(cacheKey, { data: webp, timestamp: Date.now() });
            return webp;
        } finally {
            this.pendingWebpRequests.delete(cacheKey);
        }
    }

    /**
     * Generate WebP from SVG
     */
    private async generateWebp(svg: string): Promise<Buffer> {
        const sharp = await getSharp();
        const webpBuffer = await sharp(Buffer.from(svg))
            .webp({ quality: 90 })
            .toBuffer();
        return webpBuffer;
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.cache.clear();
        this.pngCache.clear();
        logger.info('Stats cache cleared');
    }
}
