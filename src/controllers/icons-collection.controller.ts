import type { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IconsCollectionController {
    private static readonly iconsDir = path.join(__dirname, '..', '..', 'public', 'assets', 'icons');
    private static readonly svgCache: Map<string, { content: string; etag: string; timestamp: number }> = new Map();
    private static readonly pendingLoads: Map<string, Promise<string>> = new Map();
    private static readonly MAX_CACHE_ITEMS = 2000;
    private static readonly HTTP_CACHE_CONTROL = 'public, max-age=31536000, immutable';
    private static readonly COLOR_REGEX = /^(#[0-9A-Fa-f]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+|currentColor)$/;
    private static readonly ICON_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;
    private static readonly DEFAULT_ICON_COLUMNS = 3;
    private static readonly MAX_ICON_COLUMNS = 40;
    private static readonly MULTI_ICON_COLOR_PALETTE = [
        '#38BDF8', '#F97316', '#10B981', '#A855F7', '#F43F5E', '#EAB308', '#14B8A6', '#3B82F6', '#EF4444', '#22C55E'
    ];
    private static readonly ICON_SIZE_PRESETS = {
        small: { icon: 40, cell: 52, gap: 0, padding: 5 },
        medium: { icon: 56, cell: 68, gap: 0, padding: 5 },
        large: { icon: 72, cell: 84, gap: 0, padding: 5 },
    } as const;

    private static createWeakEtag(content: string): string {
        const hash = createHash('sha1').update(content).digest('base64url');
        return `W/"${hash}"`;
    }

    private static maybePruneCache(): void {
        if (IconsCollectionController.svgCache.size <= IconsCollectionController.MAX_CACHE_ITEMS) {
            return;
        }

        const overflowCount = IconsCollectionController.svgCache.size - IconsCollectionController.MAX_CACHE_ITEMS;
        let removed = 0;
        for (const key of IconsCollectionController.svgCache.keys()) {
            IconsCollectionController.svgCache.delete(key);
            removed += 1;
            if (removed >= overflowCount) {
                break;
            }
        }
    }

    private static setImageHeaders(res: Response, etag: string): void {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', IconsCollectionController.HTTP_CACHE_CONTROL);
        res.setHeader('ETag', etag);
    }

    private static isValidColor(color: string): boolean {
        return IconsCollectionController.COLOR_REGEX.test(color);
    }

    private static parseQueryList(value: unknown): string[] {
        const values = Array.isArray(value) ? value : [value];

        return values
            .flatMap((entry) => typeof entry === 'string' ? entry.split(',') : [])
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    private static resolveIconPath(iconName: string): string | null {
        if (!IconsCollectionController.ICON_NAME_REGEX.test(iconName)) {
            return null;
        }

        const resolvedIconsDir = path.resolve(IconsCollectionController.iconsDir);
        const iconPath = path.resolve(IconsCollectionController.iconsDir, `${iconName}.svg`);

        if (!iconPath.startsWith(resolvedIconsDir + path.sep) && iconPath !== resolvedIconsDir) {
            return null;
        }

        return iconPath;
    }

    private static async readBaseIconContent(iconName: string): Promise<string> {
        const iconPath = IconsCollectionController.resolveIconPath(iconName);

        if (!iconPath) {
            throw new Error('INVALID_ICON_NAME');
        }

        let pending = IconsCollectionController.pendingLoads.get(iconName);
        if (!pending) {
            pending = fs.readFile(iconPath, 'utf-8');
            IconsCollectionController.pendingLoads.set(iconName, pending);
            pending.finally(() => IconsCollectionController.pendingLoads.delete(iconName));
        }

        return pending;
    }

    private static getFallbackColor(iconName: string, index: number): string {
        const hash = createHash('sha1').update(`${iconName}:${index}`).digest('hex');
        const paletteIndex = parseInt(hash.slice(0, 8), 16) % IconsCollectionController.MULTI_ICON_COLOR_PALETTE.length;
        return IconsCollectionController.MULTI_ICON_COLOR_PALETTE[paletteIndex];
    }

    private static normalizeSize(value: unknown): keyof typeof IconsCollectionController.ICON_SIZE_PRESETS | null {
        if (typeof value === 'undefined') {
            return 'medium';
        }

        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim().toLowerCase();
        return normalized in IconsCollectionController.ICON_SIZE_PRESETS
            ? normalized as keyof typeof IconsCollectionController.ICON_SIZE_PRESETS
            : null;
    }

    private static normalizeEffect(value: unknown): 'glow' | 'wave' | undefined | null {
        if (typeof value === 'undefined') {
            return undefined;
        }

        if (typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim().toLowerCase();
        if (normalized === 'glow' || normalized === 'wave') {
            return normalized;
        }

        return null;
    }

    private static normalizeColumns(value: unknown): number | null {
        if (typeof value === 'undefined') {
            return IconsCollectionController.DEFAULT_ICON_COLUMNS;
        }

        if (typeof value !== 'string') {
            return null;
        }

        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > IconsCollectionController.MAX_ICON_COLUMNS) {
            return null;
        }

        return parsed;
    }

    private static applySvgColor(svgContent: string, color: string): string {
        let result = svgContent.replace(/fill="currentColor"/gi, `fill="${color}"`);
        result = result.replace(/fill='currentColor'/gi, `fill='${color}'`);
        result = result.replace(/stroke="currentColor"/gi, `stroke="${color}"`);
        result = result.replace(/stroke='currentColor'/gi, `stroke='${color}'`);
        return result;
    }

    private static generateCollectionCacheKey(
        iconNames: string[],
        colors: string[],
        size: keyof typeof IconsCollectionController.ICON_SIZE_PRESETS,
        effect: 'glow' | 'wave' | undefined,
        columns: number
    ): string {
        return [
            'collection',
            `icons:${iconNames.join(',')}`,
            `colors:${colors.join(',')}`,
            `size:${size}`,
            `effect:${effect ?? 'none'}`,
            `columns:${columns}`,
        ].join('|');
    }

    private static async buildIconsCollectionSvg(
        iconNames: string[],
        colors: string[],
        size: keyof typeof IconsCollectionController.ICON_SIZE_PRESETS,
        effect: 'glow' | 'wave' | undefined,
        columns: number
    ): Promise<string> {
        const preset = IconsCollectionController.ICON_SIZE_PRESETS[size];
        const totalColumns = Math.min(columns, iconNames.length);
        const totalRows = Math.ceil(iconNames.length / totalColumns);
        const width = preset.padding * 2 + totalColumns * preset.cell + (totalColumns - 1) * preset.gap;
        const height = preset.padding * 2 + totalRows * preset.cell + (totalRows - 1) * preset.gap;
        const waveStyles = effect === 'wave'
            ? `<style>
                @keyframes icons-wave {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .icon-wave {
                    animation: icons-wave 1.8s ease-in-out infinite;
                    transform-box: fill-box;
                    transform-origin: center;
                }
            </style>`
            : '';

        const images = await Promise.all(iconNames.map(async (iconName, index) => {
            const resolvedColor = colors[index] ?? IconsCollectionController.getFallbackColor(iconName, index);
            const row = Math.floor(index / totalColumns);
            const column = index % totalColumns;
            const x = preset.padding + column * (preset.cell + preset.gap) + (preset.cell - preset.icon) / 2;
            const y = preset.padding + row * (preset.cell + preset.gap) + (preset.cell - preset.icon) / 2;
            const delay = (column * 0.12) + (row * 0.08);
            const baseContent = await IconsCollectionController.readBaseIconContent(iconName);
            const coloredContent = IconsCollectionController.applySvgColor(baseContent, resolvedColor);
            const encodedSvg = Buffer.from(coloredContent).toString('base64');
            const effectStyles: string[] = [];

            if (effect === 'glow') {
                effectStyles.push(`filter: drop-shadow(0 0 8px ${resolvedColor}) drop-shadow(0 0 16px ${resolvedColor});`);
            }

            if (effect === 'wave') {
                effectStyles.push(`animation-delay: ${delay.toFixed(2)}s;`);
            }

            const className = effect === 'wave' ? ' class="icon-wave"' : '';
            const styleAttribute = effectStyles.length > 0 ? ` style="${effectStyles.join(' ')}"` : '';

            return `<image${className}${styleAttribute} x="${x}" y="${y}" width="${preset.icon}" height="${preset.icon}" href="data:image/svg+xml;base64,${encodedSvg}" preserveAspectRatio="xMidYMid meet" />`;
        }));

        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Icon collection">
    <title>Icon collection</title>
    ${waveStyles}
    ${images.join('\n    ')}
</svg>`;
    }

    static async getIconsCollection(req: Request, res: Response): Promise<void> {
        try {
            const iconNames = IconsCollectionController.parseQueryList(req.query.name);
            const colors = IconsCollectionController.parseQueryList(req.query.color);
            const invalidNames = iconNames.filter((iconName) => !IconsCollectionController.ICON_NAME_REGEX.test(iconName));
            const invalidColors = colors.filter((color) => !IconsCollectionController.isValidColor(color));
            const size = IconsCollectionController.normalizeSize(req.query.size);
            const effect = IconsCollectionController.normalizeEffect(req.query.effect);
            const columns = IconsCollectionController.normalizeColumns(req.query.columns);

            if (iconNames.length === 0) {
                res.status(400).json({
                    error: 'Missing icon names',
                    message: 'Provide at least one icon name using the name query parameter, for example /icons?name=react,typescript'
                });
                return;
            }

            if (invalidNames.length > 0) {
                res.status(400).json({
                    error: 'Invalid icon name',
                    message: 'Icon names must contain only alphanumeric characters, dots, underscores, and hyphens',
                    invalid_names: invalidNames
                });
                return;
            }

            if (invalidColors.length > 0) {
                res.status(400).json({
                    error: 'Invalid color parameter',
                    message: 'Every color must be a valid hex color (#RGB, #RRGGBB, #RRGGBBAA), rgb/rgba, hsl/hsla, named color, or currentColor',
                    invalid_colors: invalidColors
                });
                return;
            }

            if (!size) {
                res.status(400).json({
                    error: 'Invalid size parameter',
                    message: 'Size must be one of: small, medium, large'
                });
                return;
            }

            if (effect === null) {
                res.status(400).json({
                    error: 'Invalid effect parameter',
                    message: 'Effect must be one of: glow, wave'
                });
                return;
            }

            if (columns === null) {
                res.status(400).json({
                    error: 'Invalid columns parameter',
                    message: `Columns must be an integer between 1 and ${IconsCollectionController.MAX_ICON_COLUMNS}`
                });
                return;
            }

            const missingIcons = (await Promise.all(iconNames.map(async (iconName) => {
                try {
                    await fs.access(path.resolve(IconsCollectionController.iconsDir, `${iconName}.svg`));
                    return null;
                } catch {
                    return iconName;
                }
            }))).filter((iconName): iconName is string => Boolean(iconName));

            if (missingIcons.length > 0) {
                res.status(404).json({
                    error: 'Icon not found',
                    missing_icons: missingIcons,
                    available_icons: '/icons'
                });
                return;
            }

            const cacheKey = IconsCollectionController.generateCollectionCacheKey(iconNames, colors, size, effect, columns);
            const cached = IconsCollectionController.svgCache.get(cacheKey);
            if (cached) {
                if (req.headers['if-none-match'] === cached.etag) {
                    res.status(304).end();
                    return;
                }

                IconsCollectionController.setImageHeaders(res, cached.etag);
                res.send(cached.content);
                return;
            }

            const svgContent = await IconsCollectionController.buildIconsCollectionSvg(iconNames, colors, size, effect, columns);
            const etag = IconsCollectionController.createWeakEtag(svgContent);

            if (req.headers['if-none-match'] === etag) {
                res.status(304).end();
                return;
            }

            IconsCollectionController.svgCache.set(cacheKey, { content: svgContent, etag, timestamp: Date.now() });
            IconsCollectionController.maybePruneCache();

            IconsCollectionController.setImageHeaders(res, etag);
            res.send(svgContent);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to render icon collection',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
