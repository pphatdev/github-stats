/**
 * Icons Controller
 * Handles icon-related endpoints for demo and retrieval
 */
import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { generateIconsDemoHTML } from '../views/icons-demo.view.js';
import { IconsCollectionController } from './icons-collection.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IconsController {
    private static iconsDir = path.join(__dirname, '..', '..', 'public', 'assets', 'icons');
    private static iconsCache: string[] | null = null;
    private static svgCache: Map<string, { content: string; etag: string; timestamp: number }> = new Map();
    private static pendingLoads: Map<string, Promise<string>> = new Map();
    private static readonly MAX_CACHE_ITEMS = 2000;
    private static readonly HTTP_CACHE_CONTROL = 'public, max-age=31536000, immutable';
    private static readonly COLOR_REGEX = /^(#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+|currentColor)$/;
    private static readonly ICON_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

    /**
     * Load and cache icon list
     */
    private static async loadIconsList(): Promise<string[]> {
        if (!IconsController.iconsCache) {
            const files = await fs.readdir(IconsController.iconsDir);
            IconsController.iconsCache = files
                .filter(file => file.endsWith('.svg'))
                .map(file => file.replace('.svg', ''));
        }
        return IconsController.iconsCache;
    }

    /**
     * Create weak ETag from SVG content
     */
    private static createWeakEtag(content: string): string {
        const hash = createHash('sha1').update(content).digest('base64url');
        return `W/"${hash}"`;
    }

    /**
     * Prune SVG cache to prevent unbounded memory growth
     */
    private static maybePruneCache(): void {
        if (IconsController.svgCache.size <= IconsController.MAX_CACHE_ITEMS) {
            return;
        }
        const overflowCount = IconsController.svgCache.size - IconsController.MAX_CACHE_ITEMS;
        let removed = 0;
        for (const key of IconsController.svgCache.keys()) {
            IconsController.svgCache.delete(key);
            removed += 1;
            if (removed >= overflowCount) break;
        }
    }

    /**
     * Set optimal cache headers for SVG icons
     */
    private static setImageHeaders(res: Response, etag: string): void {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', IconsController.HTTP_CACHE_CONTROL);
        res.setHeader('ETag', etag);
    }

    /**
     * Validate color parameter
     */
    private static isValidColor(color: string): boolean {
        return IconsController.COLOR_REGEX.test(color);
    }

    /**
     * Resolve icon path after validating the icon name and path boundaries
     */
    private static resolveIconPath(iconName: string): string | null {
        if (!IconsController.ICON_NAME_REGEX.test(iconName)) {
            return null;
        }

        const resolvedIconsDir = path.resolve(IconsController.iconsDir);
        const iconPath = path.resolve(IconsController.iconsDir, `${iconName}.svg`);

        if (!iconPath.startsWith(resolvedIconsDir + path.sep) && iconPath !== resolvedIconsDir) {
            return null;
        }

        return iconPath;
    }

    /**
     * Read base icon SVG content with deduplicated concurrent loads
     */
    private static async readBaseIconContent(iconName: string): Promise<string> {
        const iconPath = IconsController.resolveIconPath(iconName);

        if (!iconPath) {
            throw new Error('INVALID_ICON_NAME');
        }

        let pending = IconsController.pendingLoads.get(iconName);
        if (!pending) {
            pending = fs.readFile(iconPath, 'utf-8');
            IconsController.pendingLoads.set(iconName, pending);
            pending.finally(() => IconsController.pendingLoads.delete(iconName));
        }

        return pending;
    }

    /**
     * Apply color to SVG content
     * Only replaces currentColor values to preserve intentional color choices
     */
    private static applySvgColor(svgContent: string, color: string): string {
        // Replace fill="currentColor" with the specified color
        let result = svgContent.replace(/fill="currentColor"/gi, `fill="${color}"`);
        result = result.replace(/fill='currentColor'/gi, `fill='${color}'`);

        // Replace stroke="currentColor" with the specified color
        result = result.replace(/stroke="currentColor"/gi, `stroke="${color}"`);
        result = result.replace(/stroke='currentColor'/gi, `stroke='${color}'`);

        return result;
    }

    /**
     * Apply foreground color to SVG content
     * Only replaces colors on elements with data-foreground attribute
     */
    private static applyForegroundColor(svgContent: string, color: string): string {
        // Match complete elements with data-foreground attribute
        let result = svgContent.replace(
            /<([^>]+data-foreground[^>]*)>/gi,
            (match) => {
                // Within this element, replace all fill and stroke attributes
                let modified = match.replace(/fill="[^"]*"/gi, `fill="${color}"`);
                modified = modified.replace(/stroke="[^"]*"/gi, `stroke="${color}"`);
                return modified;
            }
        );

        return result;
    }

    /**
     * Apply glow effect to SVG content
     * Adds an SVG filter that creates a glow effect around the icon
     */
    private static applyGlowEffect(svgContent: string, glowColor: string): string {
        // Generate a unique filter ID to avoid conflicts
        const filterId = `glow-${Math.random().toString(36).substr(2, 9)}`;

        // Create the glow filter definition
        const filterDef = `
            <defs>
                <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
                    <feFlood flood-color="${glowColor}" flood-opacity="0.3" result="color"/>
                    <feComposite in="color" in2="blur" operator="in" result="glow"/>
                    <feMerge>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="glow"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>`;

        // Insert the filter definition after the opening SVG tag and apply it to the SVG
        let result = svgContent.replace(
            /(<svg[^>]*)(>)/i,
            (match, svgTag, closingBracket) => {
                // Remove any existing filter attribute first
                const cleanedTag = svgTag.replace(/\s+filter="[^"]*"/gi, '');
                return `${cleanedTag} filter="url(#${filterId})"${closingBracket}${filterDef}`;
            }
        );

        return result;
    }

    /**
     * Generate cache key with optional color and glow parameters
     */
    private static generateCacheKey(iconName: string, color?: string, foreground?: string, glow?: boolean, glowColor?: string): string {
        const parts = [iconName];
        if (color) parts.push(`c:${color}`);
        if (foreground) parts.push(`fg:${foreground}`);
        if (glow && glowColor) parts.push(`glow:${glowColor}`);
        return parts.join(':');
    }

    /**
     * Get all available icons
     */
    static async getAllIcons(req: Request, res: Response): Promise<void> {
        try {
            if (typeof req.query.name !== 'undefined') {
                await IconsCollectionController.getIconsCollection(req, res);
                return;
            }

            const icons = await IconsController.loadIconsList();

            res.setHeader('Cache-Control', IconsController.HTTP_CACHE_CONTROL);
            res.json({
                count: icons.length,
                icons: icons,
                base_url: '/icons',
                examples: {
                    get_icons_svg: '/icons?name=react,typescript&color=%230088CC,%233178C6&size=medium&effect=glow&columns=2',
                    get_icon: '/icons/react',
                    get_icon_svg: '/icons/react.svg',
                    demo_page: '/icons/demo'
                }
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to retrieve icons',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get a specific icon as SVG
     */
    static async getIcon(req: Request, res: Response): Promise<void> {
        try {
            // Strip trailing .svg extension
            const iconName = req.params.name.replace(/\.svg$/, '');

            // Extract optional color parameters
            const colorParam = req.query.color as string | undefined;
            const foregroundParam = req.query.foreground as string | undefined;

            // Extract optional glow parameters
            const glowParam = req.query.glow === 'true' || req.query.glow === '1';
            const glowColorParam = req.query.glowColor as string | undefined;

            if (colorParam && !IconsController.isValidColor(colorParam)) {
                res.status(400).json({
                    error: 'Invalid color parameter',
                    message: 'Color must be a valid hex color (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba, hsl/hsla, named color, or currentColor'
                });
                return;
            }

            if (foregroundParam && !IconsController.isValidColor(foregroundParam)) {
                res.status(400).json({
                    error: 'Invalid foreground parameter',
                    message: 'Foreground must be a valid hex color (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba, hsl/hsla, named color, or currentColor'
                });
                return;
            }

            if (glowColorParam && !IconsController.isValidColor(glowColorParam)) {
                res.status(400).json({
                    error: 'Invalid glowColor parameter',
                    message: 'glowColor must be a valid hex color (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba, hsl/hsla, named color, or currentColor'
                });
                return;
            }

            // If glow is enabled but no glowColor provided, use a default color
            const effectiveGlowColor = glowParam ? (glowColorParam || '#00AAFF') : undefined;

            // Validate icon name against strict regex (alphanumeric, dots, underscores, hyphens only)
            if (!IconsController.ICON_NAME_REGEX.test(iconName)) {
                res.status(400).json({
                    error: 'Invalid icon name',
                    message: 'Icon name must contain only alphanumeric characters, dots, underscores, and hyphens'
                });
                return;
            }

            const iconPath = IconsController.resolveIconPath(iconName);
            if (!iconPath) {
                res.status(400).json({
                    error: 'Invalid icon path',
                    message: 'Icon path must be within the icons directory'
                });
                return;
            }

            // Check if icon exists
            try {
                await fs.access(iconPath);
            } catch {
                res.status(404).json({
                    error: 'Icon not found',
                    icon: iconName,
                    available_icons: '/icons'
                });
                return;
            }

            // Generate cache key including color and glow parameters
            const cacheKey = IconsController.generateCacheKey(iconName, colorParam, foregroundParam, glowParam, effectiveGlowColor);

            // Check in-memory SVG cache first
            const cached = IconsController.svgCache.get(cacheKey);
            if (cached) {
                // ETag validation for 304 responses
                if (req.headers['if-none-match'] === cached.etag) {
                    res.status(304).end();
                    return;
                }
                IconsController.setImageHeaders(res, cached.etag);
                res.send(cached.content);
                return;
            }

            // Deduplicate concurrent loads of the same icon (without color modification)
            let iconContent = await IconsController.readBaseIconContent(iconName);

            // Apply color transformations if requested
            if (colorParam) {
                iconContent = IconsController.applySvgColor(iconContent, colorParam);
            }
            if (foregroundParam) {
                iconContent = IconsController.applyForegroundColor(iconContent, foregroundParam);
            }

            // Apply glow effect if requested
            if (glowParam && effectiveGlowColor) {
                iconContent = IconsController.applyGlowEffect(iconContent, effectiveGlowColor);
            }

            const etag = IconsController.createWeakEtag(iconContent);

            // ETag validation for 304 responses
            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return;
            }

            // Cache SVG content (including color-modified versions)
            IconsController.svgCache.set(cacheKey, { content: iconContent, etag, timestamp: Date.now() });
            IconsController.maybePruneCache();

            IconsController.setImageHeaders(res, etag);
            res.send(iconContent);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to retrieve icon',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Serve the icons demo page
     */
    static async getDemoPage(_req: Request, res: Response): Promise<void> {
        try {
            // Get all icon names using shared helper
            const icons = await IconsController.loadIconsList();

            // Generate HTML using view
            const html = generateIconsDemoHTML({ icons });
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', IconsController.HTTP_CACHE_CONTROL);
            res.send(html);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to load demo page',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Route documentation
     */
    static routeDocs = {
        'icons-list': {
            requiredParams: [],
            optionalParams: ['name', 'color', 'size', 'effect', 'columns'],
            payload: 'Returns JSON metadata when called without query parameters. When name is provided, returns a composite SVG icon grid. Use comma-separated name and color values, size=small|medium|large, effect=glow|wave, and columns to control layout.',
            example: '/icons or /icons?name=react,typescript&color=%230088CC,%233178C6&size=medium&effect=glow&columns=2'
        },
        'icons-get': {
            requiredParams: ['name'],
            optionalParams: ['color', 'foreground', 'glow', 'glowColor'],
            payload: 'Returns the SVG content of the specified icon with optional styling. Use "color" to replace currentColor, "foreground" to target data-foreground elements, "glow=true" to enable glow effect, "glowColor" to set glow color (defaults to #00AAFF)',
            example: '/icons/react.svg or /icons/typescript?color=%23FF0000 or /icons/github?glow=true&glowColor=%23FF00FF or /icons/html?foreground=%23FF0000 or /icons/react?color=%230088CC&glow=true&glowColor=%2300FF00'
        },
        'icons-demo': {
            requiredParams: [],
            optionalParams: [],
            payload: 'Displays an interactive demo page with all available icons',
            example: '/icons/demo'
        }
    };
}
