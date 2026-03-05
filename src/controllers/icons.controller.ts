/**
 * Icons Controller
 * Handles icon-related endpoints for demo and retrieval
 */
import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateIconsDemoHTML } from '../views/icons-demo.view.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IconsController {
    private static iconsDir = path.join(__dirname, '..', '..', 'public', 'assets', 'icons');
    private static iconsCache: string[] | null = null;

    /**
     * Get all available icons
     */
    static async getAllIcons(_req: Request, res: Response): Promise<void> {
        try {
            // Use cache if available
            if (!IconsController.iconsCache) {
                const files = await fs.readdir(IconsController.iconsDir);
                IconsController.iconsCache = files
                    .filter(file => file.endsWith('.svg'))
                    .map(file => file.replace('.svg', ''));
            }

            res.json({
                count: IconsController.iconsCache.length,
                icons: IconsController.iconsCache,
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

            const iconContent = await fs.readFile(iconPath, 'utf-8');
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
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
            // Get all icon names
            const files = await fs.readdir(IconsController.iconsDir);
            const icons = files
                .filter(file => file.endsWith('.svg'))
                .map(file => file.replace('.svg', ''));

            // Generate HTML using view
            const html = generateIconsDemoHTML({ icons });
            res.setHeader('Content-Type', 'text/html');
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
