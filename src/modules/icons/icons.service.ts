/**
 * Icons Service
 * Business logic for icon management and retrieval
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { createLogger } from '../../shared/logs/logger.js';
import type { IconCache } from './icons.types.js';

const logger = createLogger({ service: 'IconsService' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IconsService {
    private readonly iconsDir: string;
    private iconsCache: string[] | null = null;
    private svgCache: Map<string, IconCache>;
    private pendingLoads: Map<string, Promise<string>>;
    private readonly MAX_CACHE_ITEMS = 2000;
    private readonly HTTP_CACHE_CONTROL = 'public, max-age=31536000, immutable';
    private readonly COLOR_REGEX = /^(#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+|currentColor)$/;
    private readonly ICON_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

    constructor() {
        this.iconsDir = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'icons');
        this.svgCache = new Map();
        this.pendingLoads = new Map();
    }

    /**
     * Load and cache icon list
     */
    async loadIconsList(): Promise<string[]> {
        if (!this.iconsCache) {
            const files = await fs.readdir(this.iconsDir);
            this.iconsCache = files
                .filter(file => file.endsWith('.svg'))
                .map(file => file.replace('.svg', ''));

            logger.info('Icons list loaded', { count: this.iconsCache.length });
        }
        return this.iconsCache;
    }

    /**
     * Get icon SVG content
     */
    async getIcon(iconName: string, color?: string): Promise<{ content: string; etag: string }> {
        // Validate icon name
        if (!this.isValidIconName(iconName)) {
            throw new Error('Invalid icon name');
        }

        // Validate color if provided
        if (color && !this.isValidColor(color)) {
            throw new Error('Invalid color format');
        }

        const cacheKey = color ? `${iconName}-${color}` : iconName;

        // Check cache
        const cached = this.svgCache.get(cacheKey);
        if (cached) {
            logger.debug('Returning cached icon', { iconName, color });
            return { content: cached.content, etag: cached.etag };
        }

        // Check pending loads
        const pending = this.pendingLoads.get(cacheKey);
        if (pending) {
            const content = await pending;
            const cached = this.svgCache.get(cacheKey);
            return { content: cached!.content, etag: cached!.etag };
        }

        // Load icon
        const promise = this.loadIcon(iconName, color);
        this.pendingLoads.set(cacheKey, promise);

        try {
            const content = await promise;
            const etag = this.createWeakEtag(content);

            this.svgCache.set(cacheKey, { content, etag, timestamp: Date.now() });
            this.maybePruneCache();

            return { content, etag };
        } finally {
            this.pendingLoads.delete(cacheKey);
        }
    }

    /**
     * Load icon from file system
     */
    private async loadIcon(iconName: string, color?: string): Promise<string> {
        const iconPath = path.join(this.iconsDir, `${iconName}.svg`);

        // Verify path doesn't escape icons directory
        const resolvedPath = path.resolve(iconPath);
        const resolvedIconsDir = path.resolve(this.iconsDir);

        if (!resolvedPath.startsWith(resolvedIconsDir)) {
            throw new Error('Invalid icon path');
        }

        let content = await fs.readFile(iconPath, 'utf-8');

        // Apply color if specified
        if (color) {
            content = this.applyColor(content, color);
        }

        logger.debug('Icon loaded', { iconName, color });
        return content;
    }

    /**
     * Apply color to SVG content
     */
    private applyColor(svg: string, color: string): string {
        // Replace fill and stroke attributes with the specified color
        return svg
            .replace(/fill="[^"]*"/g, `fill="${color}"`)
            .replace(/stroke="[^"]*"/g, `stroke="${color}"`);
    }

    /**
     * Validate icon name
     */
    private isValidIconName(name: string): boolean {
        return this.ICON_NAME_REGEX.test(name);
    }

    /**
     * Validate color parameter
     */
    private isValidColor(color: string): boolean {
        return this.COLOR_REGEX.test(color);
    }

    /**
     * Create weak ETag from SVG content
     */
    private createWeakEtag(content: string): string {
        const hash = createHash('sha1').update(content).digest('base64url');
        return `W/"${hash}"`;
    }

    /**
     * Prune SVG cache to prevent unbounded memory growth
     */
    private maybePruneCache(): void {
        if (this.svgCache.size <= this.MAX_CACHE_ITEMS) {
            return;
        }

        const overflowCount = this.svgCache.size - this.MAX_CACHE_ITEMS;
        let removed = 0;

        for (const key of this.svgCache.keys()) {
            this.svgCache.delete(key);
            removed += 1;
            if (removed >= overflowCount) break;
        }

        logger.debug('Cache pruned', { removed, remaining: this.svgCache.size });
    }

    /**
     * Get cache control header
     */
    getCacheControl(): string {
        return this.HTTP_CACHE_CONTROL;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.svgCache.clear();
        this.iconsCache = null;
        logger.info('Icons cache cleared');
    }
}
