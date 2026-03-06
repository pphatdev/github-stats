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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IconsController {
    private static iconsDir = path.join(__dirname, '..', '..', 'public', 'assets', 'icons');
    private static iconsCache: string[] | null = null;
    private static svgCache: Map<string, { content: string; etag: string; timestamp: number }> = new Map();
    private static pendingLoads: Map<string, Promise<string>> = new Map();
    private static readonly MAX_CACHE_ITEMS = 2000;
    private static readonly HTTP_CACHE_CONTROL = 'public, max-age=31536000, immutable';

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
     * Get all available icons
     */
    static async getAllIcons(_req: Request, res: Response): Promise<void> {
        try {
            const icons = await IconsController.loadIconsList();

            res.setHeader('Cache-Control', IconsController.HTTP_CACHE_CONTROL);
            res.json({
                count: icons.length,
                icons: icons,
                base_url: '/icons',
                examples: {
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

            // Validate icon name against strict regex (alphanumeric, dots, underscores, hyphens only)
            const validFilenameRegex = /^[a-zA-Z0-9._-]+$/;
            if (!validFilenameRegex.test(iconName)) {
                res.status(400).json({
                    error: 'Invalid icon name',
                    message: 'Icon name must contain only alphanumeric characters, dots, underscores, and hyphens'
                });
                return;
            }

            // Resolve paths to prevent path traversal
            const resolvedIconsDir = path.resolve(IconsController.iconsDir);
            const iconPath = path.resolve(IconsController.iconsDir, `${iconName}.svg`);

            // Ensure the resolved path is contained within the icons directory
            if (!iconPath.startsWith(resolvedIconsDir + path.sep) && iconPath !== resolvedIconsDir) {
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

            // Check in-memory SVG cache first
            const cached = IconsController.svgCache.get(iconName);
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

            // Deduplicate concurrent loads of the same icon
            let pending = IconsController.pendingLoads.get(iconName);
            if (!pending) {
                pending = fs.readFile(iconPath, 'utf-8');
                IconsController.pendingLoads.set(iconName, pending);
                pending.finally(() => IconsController.pendingLoads.delete(iconName));
            }

            const iconContent = await pending;
            const etag = IconsController.createWeakEtag(iconContent);

            // ETag validation for 304 responses
            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return;
            }

            // Cache SVG content
            IconsController.svgCache.set(iconName, { content: iconContent, etag, timestamp: Date.now() });
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
            optionalParams: [],
            payload: 'Returns a list of all available icons with metadata',
            example: '/icons'
        },
        'icons-get': {
            requiredParams: ['name'],
            optionalParams: [],
            payload: 'Returns the SVG content of the specified icon',
            example: '/icons/react.svg or /icons/typescript'
        },
        'icons-demo': {
            requiredParams: [],
            optionalParams: [],
            payload: 'Displays an interactive demo page with all available icons',
            example: '/icons/demo'
        }
    };
}
