/**
 * Badge Collection Controller
 * Renders multiple badges composed into a single SVG grid.
 * Mirrors the structure of icons-collection.controller.ts.
 */
import type { Request, Response } from 'express';
import { createHash } from 'crypto';
import { db } from '../db/index.js';
import { badges } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { GitHubClient } from '../utils/github-client.js';
import { BadgeRenderer } from '../components/badge-renderer.js';
import { badgeThemes } from '../utils/themes.js';
import type { BadgeOptions, UserBadgeType } from '../types/badge.types.js';

/** User badge types that have a corresponding DB column */
type StoredUserBadgeType = Exclude<UserBadgeType, 'visitors'>;

const TYPE_TO_COLUMN: Record<StoredUserBadgeType, keyof typeof badges.$inferSelect> = {
    'repositories': 'repositories',
    'organization': 'organization',
    'languages': 'languages',
    'followers': 'followers',
    'total-stars': 'total_stars',
    'total-contributors': 'total_contributors',
    'total-commits': 'total_commits',
    'total-code-reviews': 'total_code_reviews',
    'total-issues': 'total_issues',
    'total-pull-requests': 'total_pull_requests',
    'total-joined-years': 'total_joined_years',
};

const VALID_USER_BADGE_TYPES = new Set<UserBadgeType>([
    'visitors',
    'repositories',
    'organization',
    'languages',
    'followers',
    'total-stars',
    'total-contributors',
    'total-commits',
    'total-code-reviews',
    'total-issues',
    'total-pull-requests',
    'total-joined-years',
]);

export class BadgeCollectionController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;

    private static readonly svgCache: Map<string, { content: string; etag: string; timestamp: number }> = new Map();
    private static readonly pendingCollections: Map<string, Promise<string>> = new Map();
    private static readonly MAX_CACHE_ITEMS = 1000;
    private static readonly HTTP_CACHE_CONTROL = 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400';
    private static readonly DEFAULT_COLUMNS = 50;
    private static readonly MAX_COLUMNS = 50;
    private static readonly DEFAULT_GAP = 5;
    private static readonly DEFAULT_PADDING = 0;

    /** Route documentation */
    static readonly routeDocs = {
        collection: {
            requiredParams: ['username', 'type'],
            optionalParams: ['columns', 'gap', 'padding', 'theme', 'effect', 'customLabel', 'labelColor', 'labelBackground', 'iconColor', 'valueColor', 'valueBackground'],
            payload: null,
            example: '/badge/collection?username=pphatdev&type=visitors,total-stars,repositories&columns=1&gap=8&padding=12&theme=galaxy&effect=wave',
        },
    };

    static initialize(
        githubClient: GitHubClient,
        cache: Map<string, { data: string; timestamp: number }>,
        cacheDuration: number,
    ): void {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    // ─── Private helpers ───────────────────────────────────────────────────

    private static createWeakEtag(content: string): string {
        const hash = createHash('sha1').update(content).digest('base64url');
        return `W/"${hash}"`;
    }

    private static maybePruneCache(): void {
        if (BadgeCollectionController.svgCache.size <= BadgeCollectionController.MAX_CACHE_ITEMS) {
            return;
        }
        const overflow = BadgeCollectionController.svgCache.size - BadgeCollectionController.MAX_CACHE_ITEMS;
        let removed = 0;
        for (const key of BadgeCollectionController.svgCache.keys()) {
            BadgeCollectionController.svgCache.delete(key);
            if (++removed >= overflow) break;
        }
    }

    private static setImageHeaders(res: Response, etag: string): void {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', BadgeCollectionController.HTTP_CACHE_CONTROL);
        res.setHeader('ETag', etag);
    }

    private static parseQueryList(value: unknown): string[] {
        const values = Array.isArray(value) ? value : [value];
        return values
            .flatMap((entry) => typeof entry === 'string' ? entry.split(',') : [])
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    private static normalizeColumns(value: unknown): number | null {
        if (typeof value === 'undefined') return BadgeCollectionController.DEFAULT_COLUMNS;
        if (typeof value !== 'string') return null;
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > BadgeCollectionController.MAX_COLUMNS) return null;
        return parsed;
    }

    private static normalizeGap(value: unknown): number | null {
        if (typeof value === 'undefined') return BadgeCollectionController.DEFAULT_GAP;
        if (typeof value !== 'string') return null;
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) return null;
        return parsed;
    }

    private static normalizePadding(value: unknown): number | null {
        if (typeof value === 'undefined') return BadgeCollectionController.DEFAULT_PADDING;
        if (typeof value !== 'string') return null;
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 200) return null;
        return parsed;
    }

    private static normalizeEffect(value: unknown): 'glow' | 'wave' | undefined | null {
        if (typeof value === 'undefined') return undefined;
        if (typeof value !== 'string') return null;
        const normalized = value.trim().toLowerCase();
        if (normalized === 'glow' || normalized === 'wave') return normalized;
        return null;
    }

    private static parseSharedOptions(req: Request): Omit<BadgeOptions, 'type'> {
        const { customLabel, labelColor, labelBackground, iconColor, valueColor, valueBackground } = req.query;
        return {
            customLabel: typeof customLabel === 'string' ? customLabel : undefined,
            labelColor: typeof labelColor === 'string' ? labelColor : undefined,
            labelBackground: typeof labelBackground === 'string' ? labelBackground : undefined,
            iconColor: typeof iconColor === 'string' ? iconColor : undefined,
            valueColor: typeof valueColor === 'string' ? valueColor : undefined,
            valueBackground: typeof valueBackground === 'string' ? valueBackground : undefined,
            hideFrame: false,
            hideIcon: true,
        };
    }

    /** Increment all-time visitors and return the latest value. */
    private static async incrementVisitorsCount(username: string): Promise<number> {
        const result = await db
            .insert(badges)
            .values({ username, visitors: 1, updated_at: Date.now() })
            .onConflictDoUpdate({
                target: badges.username,
                set: { visitors: sql`${badges.visitors} + 1`, updated_at: Date.now() },
            })
            .returning();

        return result[0]?.visitors ?? 1;
    }

    /**
     * Fetch the current numeric value for a badge type.
     * For `visitors`, the count is read without being incremented.
     * For all other types, the DB is checked first; GitHub is only queried when stale.
     */
    private static async fetchBadgeValue(username: string, type: UserBadgeType): Promise<number> {
        if (type === 'visitors') {
            const row = await db
                .select({ visitors: badges.visitors })
                .from(badges)
                .where(eq(badges.username, username))
                .get();
            return row?.visitors ?? 0;
        }

        const col = TYPE_TO_COLUMN[type as StoredUserBadgeType];
        const row = await db.select().from(badges).where(eq(badges.username, username)).get();
        const isStale = !row?.updated_at || (Date.now() - row.updated_at) > BadgeCollectionController.CACHE_DURATION;
        const dbValue = row?.[col] as number | null | undefined;

        if (!isStale && dbValue != null) {
            return dbValue;
        }

        const value = await BadgeCollectionController.githubClient.fetchBadgeValue(username, type);
        await db
            .insert(badges)
            .values({ username, [col]: value, updated_at: Date.now() })
            .onConflictDoUpdate({
                target: badges.username,
                set: { [col]: value, updated_at: Date.now() },
            });
        return value;
    }

    /**
     * Extract the `width` and `height` attributes from the root `<svg>` tag.
     */
    private static extractSvgDimensions(svgContent: string): { width: number; height: number } | null {
        const widthMatch = svgContent.match(/<svg\b[^>]*\bwidth="(\d+(?:\.\d+)?)"/i);
        const heightMatch = svgContent.match(/<svg\b[^>]*\bheight="(\d+(?:\.\d+)?)"/i);
        if (!widthMatch || !heightMatch) return null;
        const width = parseFloat(widthMatch[1]);
        const height = parseFloat(heightMatch[1]);
        return isNaN(width) || isNaN(height) ? null : { width, height };
    }

    /**
     * Prefix filter and clip-path IDs within a badge SVG string to prevent ID
     * collisions when multiple badges are embedded in the same document.
     */
    private static scopeBadgeSvgIds(svgContent: string, prefix: string): string {
        return svgContent
            .replace(/\bid="((?:glow|clip)-[^"]+)"/g, `id="${prefix}-$1"`)
            .replace(/\bfilter="url\(#(glow-[^)]+)\)"/g, `filter="url(#${prefix}-$1)"`)
            .replace(/\bclip-path="url\(#(clip-[^)]+)\)"/g, `clip-path="url(#${prefix}-$1)"`);
    }

    /**
     * Compose multiple badge SVG strings into a single grid SVG.
     */
    private static buildCollectionSvg(
        badgeSvgs: string[],
        columns: number,
        gap: number,
        padding: number,
        effect: 'glow' | 'wave' | undefined,
    ): string {
        const dims = badgeSvgs.map(
            (svg) => BadgeCollectionController.extractSvgDimensions(svg) ?? { width: 200, height: 34 }
        );

        const totalCols = Math.min(columns, badgeSvgs.length);
        const totalRows = Math.ceil(badgeSvgs.length / totalCols);

        // Maximum width per column and height per row
        const colWidths = Array.from({ length: totalCols }, (_, c) => {
            let maxW = 0;
            for (let i = c; i < badgeSvgs.length; i += totalCols) {
                maxW = Math.max(maxW, dims[i].width);
            }
            return maxW;
        });

        const rowHeights = Array.from({ length: totalRows }, (_, r) => {
            let maxH = 0;
            for (let c = 0; c < totalCols; c++) {
                const idx = r * totalCols + c;
                if (idx < badgeSvgs.length) maxH = Math.max(maxH, dims[idx].height);
            }
            return maxH;
        });

        const colXOffsets = colWidths.reduce<number[]>((acc, _w, i) => {
            acc.push(i === 0 ? padding : acc[i - 1] + colWidths[i - 1] + gap);
            return acc;
        }, []);

        const rowYOffsets = rowHeights.reduce<number[]>((acc, _h, i) => {
            acc.push(i === 0 ? padding : acc[i - 1] + rowHeights[i - 1] + gap);
            return acc;
        }, []);

        const contentWidth = colWidths.reduce((a, b) => a + b, 0) + gap * Math.max(0, totalCols - 1);
        const contentHeight = rowHeights.reduce((a, b) => a + b, 0) + gap * Math.max(0, totalRows - 1);
        const totalWidth = contentWidth + (padding * 2);
        const totalHeight = contentHeight + (padding * 2);
        const defs: string[] = [];

        const waveStyles = effect === 'wave'
            ? `<style>
                @keyframes badges-wave {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .badge-wave {
                    animation: badges-wave 1.9s ease-in-out infinite;
                    transform-box: fill-box;
                    transform-origin: center;
                }
            </style>`
            : '';

        const embeds = badgeSvgs.map((svgContent, index) => {
            const col = index % totalCols;
            const row = Math.floor(index / totalCols);
            const x = colXOffsets[col];
            const y = rowYOffsets[row];
            const { width, height } = dims[index];
            const prefix = `bc-${index}`;
            const delay = (col * 0.12) + (row * 0.08);
            const className = effect === 'wave' ? 'badge-wave' : '';
            const styleAttr = effect === 'wave' ? `animation-delay: ${delay.toFixed(2)}s;` : '';
            const glowFilterId = effect === 'glow' ? `badge-glow-${index}` : undefined;

            if (glowFilterId) {
                defs.push(`<filter id="${glowFilterId}" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>`);
            }

            const scoped = BadgeCollectionController.scopeBadgeSvgIds(svgContent.trim(), prefix);

            // Rewrite the root <svg> tag with explicit position, size, and no xmlns
            return scoped.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
                const cleaned = attrs
                    .replace(/\s+(?:x|y|width|height|xmlns(?::[a-z]+)?|class|style|filter)="[^"]*"/gi, '')
                    .replace(/\s+(?:x|y|width|height|xmlns(?::[a-z]+)?|class|style|filter)='[^']*'/gi, '')
                    .trim();
                const classPart = className ? ` class="${className}"` : '';
                const stylePart = styleAttr ? ` style="${styleAttr}"` : '';
                const filterPart = glowFilterId ? ` filter="url(#${glowFilterId})"` : '';
                return `<svg${cleaned ? ` ${cleaned}` : ''}${classPart}${stylePart}${filterPart} x="${x}" y="${y}" width="${width}" height="${height}">`;
            });
        });

        return `<?xml version="1.0" encoding="UTF-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="Badge collection">
                <title>Badge collection</title>
                ${defs.length > 0 ? `<defs>
                    ${defs.join('\n                    ')}
                </defs>` : ''}
                ${waveStyles}
                ${embeds.join('\n    ')}
            </svg>
        `;
    }

    private static generateCacheKey(
        username: string,
        types: UserBadgeType[],
        options: Omit<BadgeOptions, 'type'>,
        columns: number,
        gap: number,
        padding: number,
        themes: string[],
        effect: 'glow' | 'wave' | undefined,
    ): string {
        return [
            'badge-collection',
            `user:${username}`,
            `types:${types.join(',')}`,
            `themes:${themes.join(',')}`,
            `effect:${effect ?? 'none'}`,
            `columns:${columns}`,
            `gap:${gap}`,
            `padding:${padding}`,
            `labelColor:${options.labelColor ?? ''}`,
            `labelBg:${options.labelBackground ?? ''}`,
            `iconColor:${options.iconColor ?? ''}`,
            `valueColor:${options.valueColor ?? ''}`,
            `valueBg:${options.valueBackground ?? ''}`,
        ].join('|');
    }

    // ─── Public endpoint ───────────────────────────────────────────────────

    static async getCollection(req: Request, res: Response): Promise<void> {
        try {
            // 1. Validate username
            const { username } = req.query;
            if (!username || typeof username !== 'string') {
                res.status(400).json({
                    error: 'Missing username',
                    message: 'Provide a username query parameter, e.g. /badge/collection?username=pphatdev&type=visitors,total-stars',
                });
                return;
            }

            // 2. Parse and validate badge types
            const rawTypes = BadgeCollectionController.parseQueryList(req.query.type);
            if (rawTypes.length === 0) {
                res.status(400).json({
                    error: 'Missing type',
                    message: 'Provide at least one badge type using the type query parameter',
                    valid_types: [...VALID_USER_BADGE_TYPES],
                    example: '/badge/collection?username=pphatdev&type=visitors,total-stars,repositories',
                });
                return;
            }

            const invalidTypes = rawTypes.filter((t) => !VALID_USER_BADGE_TYPES.has(t as UserBadgeType));
            if (invalidTypes.length > 0) {
                res.status(400).json({
                    error: 'Invalid badge type',
                    invalid_types: invalidTypes,
                    valid_types: [...VALID_USER_BADGE_TYPES],
                });
                return;
            }

            const types = rawTypes as UserBadgeType[];
            const includesVisitors = types.includes('visitors');

            // 3. Validate layout options
            const columns = BadgeCollectionController.normalizeColumns(req.query.columns);
            if (columns === null) {
                res.status(400).json({
                    error: 'Invalid columns parameter',
                    message: `columns must be an integer between 1 and ${BadgeCollectionController.MAX_COLUMNS}`,
                });
                return;
            }

            const gap = BadgeCollectionController.normalizeGap(req.query.gap);
            if (gap === null) {
                res.status(400).json({
                    error: 'Invalid gap parameter',
                    message: 'gap must be an integer between 0 and 100',
                });
                return;
            }

            const padding = BadgeCollectionController.normalizePadding(req.query.padding);
            if (padding === null) {
                res.status(400).json({
                    error: 'Invalid padding parameter',
                    message: 'padding must be an integer between 0 and 200',
                });
                return;
            }

            const effect = BadgeCollectionController.normalizeEffect(req.query.effect);
            if (effect === null) {
                res.status(400).json({
                    error: 'Invalid effect parameter',
                    message: 'effect must be one of: glow, wave',
                });
                return;
            }

            // 4. Parse display options
            const sharedOptions = BadgeCollectionController.parseSharedOptions(req);

            // 4a. Parse and validate themes (comma-separated list; cycles across badges)
            const rawThemes = BadgeCollectionController.parseQueryList(req.query.theme);
            const themes = rawThemes.length > 0 ? rawThemes : ['default'];
            const validThemes = Object.keys(badgeThemes);
            const invalidThemes = themes.filter((t) => !validThemes.includes(t));
            if (invalidThemes.length > 0) {
                res.status(400).json({
                    error: 'Invalid theme',
                    invalid_themes: invalidThemes,
                    valid_themes: validThemes,
                });
                return;
            }

            // 5. Check in-memory collection cache (disabled for visitors to keep counter live)
            const cacheKey = BadgeCollectionController.generateCacheKey(username, types, sharedOptions, columns, gap, padding, themes, effect);
            if (!includesVisitors) {
                const cached = BadgeCollectionController.svgCache.get(cacheKey);
                if (cached) {
                    if (req.headers['if-none-match'] === cached.etag) {
                        res.status(304).end();
                        return;
                    }
                    BadgeCollectionController.setImageHeaders(res, cached.etag);
                    res.send(cached.content);
                    return;
                }
            }

            // 6. Deduplicate in-flight renders for the same cache key
            let pending = BadgeCollectionController.pendingCollections.get(cacheKey);
            if (!pending) {
                pending = (async () => {
                    const visitorsValue = includesVisitors
                        ? await BadgeCollectionController.incrementVisitorsCount(username)
                        : null;

                    // Fetch all badge values in parallel
                    const values = await Promise.all(types.map((type) => {
                        if (type === 'visitors') {
                            return Promise.resolve(visitorsValue ?? 0);
                        }
                        return BadgeCollectionController.fetchBadgeValue(username, type);
                    }));

                    // Render each badge as a standalone SVG
                    const badgeSvgs = values.map((value, i) => {
                        const opts: BadgeOptions = { ...sharedOptions, type: types[i], theme: themes[i % themes.length] };
                        return BadgeRenderer.generateBadge(value, opts).trim();
                    });

                    // Compose into collection
                    return BadgeCollectionController.buildCollectionSvg(badgeSvgs, columns, gap, padding, effect);
                })();

                BadgeCollectionController.pendingCollections.set(cacheKey, pending);
                pending.finally(() => BadgeCollectionController.pendingCollections.delete(cacheKey));
            }

            const svgContent = await pending;
            const etag = BadgeCollectionController.createWeakEtag(svgContent);

            if (!includesVisitors) {
                if (req.headers['if-none-match'] === etag) {
                    res.status(304).end();
                    return;
                }

                BadgeCollectionController.svgCache.set(cacheKey, { content: svgContent, etag, timestamp: Date.now() });
                BadgeCollectionController.maybePruneCache();

                BadgeCollectionController.setImageHeaders(res, etag);
            } else {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }

            res.send(svgContent);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to render badge collection',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
