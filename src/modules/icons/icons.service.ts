/**
 * Icons Service
 * Business logic for icon management and retrieval
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { createLogger } from '../../shared/logs/logger.js';
import type { IconCache, IconCollectionOptions, IconEffect, IconSize } from './icons.types.js';

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
    private readonly COLLECTION_FALLBACK_COLORS = [
        '#0088CC',
        '#3178C6',
        '#FFFFFF',
        '#38B2AC',
        '#F59E0B',
        '#EF4444',
        '#22C55E',
        '#A78BFA',
        '#06B6D4',
    ] as const;

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
            const cachedPending = this.svgCache.get(cacheKey);
            return { content: cachedPending!.content, etag: cachedPending!.etag };
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
     * Get SVG content for multiple icons combined in a single image.
     */
    async getIconCollection(options: IconCollectionOptions): Promise<{ content: string; etag: string }> {
        if (options.iconNames.length === 0) {
            throw new Error('name is required');
        }

        if (options.size !== 'small' && options.size !== 'medium' && options.size !== 'large') {
            throw new Error('Invalid size. Supported: small, medium, large');
        }

        if (options.effect !== undefined && options.effect !== 'glow' && options.effect !== 'wave') {
            throw new Error('Invalid effect. Supported: glow, wave');
        }

        if (!Number.isInteger(options.columns) || options.columns < 1 || options.columns > 20) {
            throw new Error('Invalid columns. Supported range: 1-20');
        }

        const cacheKey = `collection:${options.iconNames.join(',')}:${options.size}:${options.effect || 'none'}:${options.columns}:${(options.colors || []).join(',')}`;
        const cached = this.svgCache.get(cacheKey);

        if (cached) {
            logger.debug('Returning cached icon collection', {
                count: options.iconNames.length,
                size: options.size,
                effect: options.effect,
                columns: options.columns,
            });
            return { content: cached.content, etag: cached.etag };
        }

        const resolvedColors = options.iconNames.map((_, index) => {
            const mappedColor = options.colors?.[index];
            return mappedColor || this.COLLECTION_FALLBACK_COLORS[index % this.COLLECTION_FALLBACK_COLORS.length];
        });

        const icons = await Promise.all(options.iconNames.map(async (iconName, index) => {
            try {
                const icon = await this.getIcon(iconName, resolvedColors[index]);
                return icon.content;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                if (message.includes('Invalid')) {
                    throw error;
                }
                throw new Error(`Icon not found: ${iconName}`);
            }
        }));

        const content = this.combineIcons(icons, {
            size: options.size,
            effect: options.effect,
            columns: options.columns,
        });
        const etag = this.createWeakEtag(content);

        this.svgCache.set(cacheKey, { content, etag, timestamp: Date.now() });
        this.maybePruneCache();

        return { content, etag };
    }

    private combineIcons(
        icons: string[],
        options: { size: IconSize; effect?: IconEffect; columns: number },
    ): string {
        const scale = this.getCollectionScale(options.size);
        const gap = this.getCollectionGap(options.size);
        const columnCount = options.columns;
        const rowCount = Math.ceil(icons.length / columnCount);
        const actualColumnCount = Math.min(columnCount, icons.length);

        const svgParts = icons.map((icon, index) => this.extractSvgParts(icon, `icon-${index}`));
        const widths = new Array(actualColumnCount).fill(0);
        const heights = new Array(rowCount).fill(0);

        svgParts.forEach((part, index) => {
            const row = Math.floor(index / columnCount);
            const col = index % columnCount;
            const scaledWidth = Math.ceil(part.width * scale);
            const scaledHeight = Math.ceil(part.height * scale);

            if (col < actualColumnCount) {
                widths[col] = Math.max(widths[col], scaledWidth);
            }
            heights[row] = Math.max(heights[row], scaledHeight);
        });

        const xOffsets: number[] = [];
        let xCursor = 0;
        for (let i = 0; i < actualColumnCount; i++) {
            xOffsets.push(xCursor);
            xCursor += widths[i] + (i < actualColumnCount - 1 ? gap : 0);
        }

        const yOffsets: number[] = [];
        let yCursor = 0;
        for (let i = 0; i < rowCount; i++) {
            yOffsets.push(yCursor);
            yCursor += heights[i] + (i < rowCount - 1 ? gap : 0);
        }

        const totalWidth = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, actualColumnCount - 1) * gap;
        const totalHeight = heights.reduce((sum, height) => sum + height, 0) + Math.max(0, rowCount - 1) * gap;

        const defs = options.effect === 'glow'
            ? '<defs><filter id="icons-collection-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
            : '';

        const groups = svgParts.map((part, index) => {
            const row = Math.floor(index / columnCount);
            const col = index % columnCount;
            const x = xOffsets[col];
            const y = yOffsets[row];
            const filterAttr = options.effect === 'glow' ? ' filter="url(#icons-collection-glow)"' : '';
            const animatedTransform = options.effect === 'wave'
                ? `<animateTransform attributeName="transform" type="translate" values="${x} ${y}; ${x} ${Math.max(0, y - 3)}; ${x} ${y}; ${x} ${y + 3}; ${x} ${y}" dur="2.4s" begin="${(index * 0.12).toFixed(2)}s" repeatCount="indefinite"/>`
                : '';
            const transformAttr = options.effect === 'wave' ? '' : ` transform="translate(${x} ${y})"`;

            return `<g${transformAttr}${filterAttr}>${animatedTransform}<g transform="scale(${scale})">${part.content}</g></g>`;
        }).join('');

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" fill="none">${defs}${groups}</svg>`;
    }

    private extractSvgParts(svg: string, suffix: string): { width: number; height: number; content: string } {
        const width = this.readSvgDimension(svg, 'width');
        const height = this.readSvgDimension(svg, 'height');
        const [viewBoxWidth, viewBoxHeight] = this.readViewBox(svg);
        const content = svg
            .replace(/^\s*<svg[^>]*>/i, '')
            .replace(/<\/svg>\s*$/i, '');

        return {
            width: width || viewBoxWidth || 24,
            height: height || viewBoxHeight || 24,
            content: this.namespaceIds(content, suffix),
        };
    }

    private readSvgDimension(svg: string, attribute: 'width' | 'height'): number | null {
        const match = svg.match(new RegExp(`\\b${attribute}="([0-9]+(?:\\.[0-9]+)?)"`, 'i'));
        if (!match) {
            return null;
        }

        return Number.parseFloat(match[1]);
    }

    private readViewBox(svg: string): [number, number] {
        const match = svg.match(/\bviewBox="[^\"]*\s([0-9]+(?:\.[0-9]+)?)\s([0-9]+(?:\.[0-9]+)?)"/i);
        if (!match) {
            return [0, 0];
        }

        return [Number.parseFloat(match[1]), Number.parseFloat(match[2])];
    }

    private namespaceIds(content: string, suffix: string): string {
        const ids = Array.from(content.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);

        return ids.reduce((output, id) => {
            const nextId = `${id}-${suffix}`;
            return output
                .split(`id="${id}"`).join(`id="${nextId}"`)
                .split(`url(#${id})`).join(`url(#${nextId})`)
                .split(`href="#${id}"`).join(`href="#${nextId}"`)
                .split(`xlink:href="#${id}"`).join(`xlink:href="#${nextId}"`);
        }, content);
    }

    private getCollectionScale(size: IconSize): number {
        switch (size) {
            case 'small':
                return 0.82;
            case 'large':
                return 1.35;
            default:
                return 1;
        }
    }

    private getCollectionGap(size: IconSize): number {
        switch (size) {
            case 'small':
                return 8;
            case 'large':
                return 16;
            default:
                return 12;
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
