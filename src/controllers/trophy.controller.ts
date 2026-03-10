/**
 * Trophy Controller
 * Handles trophy badge endpoints with rank system based on cumulative score
 * Features: Theme options (outline, solid, frame), badge selection, caching
 */
import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { db } from '../db/index.js';
import { badges } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { GitHubClient } from '../utils/github-client.js';
import { getBadgeCacheServiceSync } from '../services/badge-cache.service.js';
import type { BadgeRouteDoc } from '../types/badge.types.js';

/** Trophy badges that contribute to score */
type TrophyBadgeType =
    | 'repositories'
    | 'organization'
    | 'languages'
    | 'followers'
    | 'total-stars'
    | 'total-contributors'
    | 'total-commits'
    | 'total-code-reviews'
    | 'total-issues'
    | 'total-pull-requests'
    | 'total-joined-years';

/** Rank tier based on cumulative score */
export type Rank = 'S+' | 'S' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';

/** Trophy theme style */
export type TrophyTheme = 'solid' | 'frame';

/** Trophy outlineStyle */
export type TrophyOutlineStyle = TrophyTheme;

/** Badge weight for score calculation */
const BADGE_WEIGHTS: Record<TrophyBadgeType, number> = {
    'repositories': 100,
    'organization': 150,
    'languages': 200,
    'followers': 50,
    'total-stars': 200,
    'total-contributors': 150,
    'total-commits': 100,
    'total-code-reviews': 150,
    'total-issues': 100,
    'total-pull-requests': 100,
    'total-joined-years': 100,
};

/** Maps a BadgeType to the matching badges table column key */
const BADGE_TO_COLUMN: Record<TrophyBadgeType, keyof typeof badges.$inferSelect> = {
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

/** Trophy rank thresholds */
const RANK_THRESHOLDS: Record<Rank, number> = {
    'S+': 10000,
    'S': 5000,
    'A+': 2000,
    'A': 1000,
    'B+': 500,
    'B': 100,
    'C': 0,
    'D': -Infinity,
};

/** Trophy visual configs with SVG paths */
const TROPHY_CONFIGS: Record<Rank, { label: string; color: string; highlight: string }> = {
    'S+': { label: 'S+', color: '#FFD700', highlight: '#FFA500' },
    'S': { label: 'S', color: '#C0C0C0', highlight: '#808080' },
    'A+': { label: 'A+', color: '#CD7F32', highlight: '#8B4513' },
    'A': { label: 'A', color: '#FF6B6B', highlight: '#C92A2A' },
    'B+': { label: 'B+', color: '#4ECDC4', highlight: '#1A9F8F' },
    'B': { label: 'B', color: '#45B7D1', highlight: '#0F7BA0' },
    'C': { label: 'C', color: '#95E1D3', highlight: '#38ADA9' },
    'D': { label: 'D', color: '#A0A0A0', highlight: '#505050' },
};

const defaultOptionsParams = ['theme', 'outline', 'customLabel', 'labelColor', 'labelBackground', 'valueColor', 'valueBackground'] as const;

export class TrophyController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();
    // Bump this when trophy SVG artwork/layout changes so old cached SVGs are invalidated.
    private static readonly TROPHY_RENDER_VERSION = 'v4';

    /** Route documentation for trophy */
    static routeDocs: Record<string, BadgeRouteDoc> = {
        'trophy': {
            requiredParams: ['username'],
            optionalParams: defaultOptionsParams,
            payload: null,
            example: '/badge/trophy?username=pphatdev&theme=outline&badge=stars,languages,followers'
        },
    };

    /**
     * Initialize the controller with dependencies
     */
    static initialize(
        githubClient: GitHubClient,
        cache: Map<string, { data: string; timestamp: number }>,
        cacheDuration: number,
    ) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    /** Calculate rank based on cumulative score */
    private static calculateRank(score: number): Rank {
        if (score > 10000) return 'S+';
        if (score > 5000) return 'S';
        if (score > 2000) return 'A+';
        if (score > 1000) return 'A';
        if (score > 500) return 'B+';
        if (score > 100) return 'B';
        if (score <= 100) return 'C';
        return 'D';
    }

    /** Parse trophy-specific options from query params */
    private static parseOptions(req: Request): {
        theme?: string;
        outline: TrophyOutlineStyle;
        badges: TrophyBadgeType[];
        customLabel?: string;
        labelColor?: string;
        labelBackground?: string;
        valueColor?: string;
        valueBackground?: string;
    } {
        const { theme, outline, badge, customLabel, labelColor, labelBackground, valueColor, valueBackground } = req.query;

        // Parse badge list
        let badgeList: TrophyBadgeType[] = [];
        if (badge) {
            let badgeStr = '';
            if (typeof badge === 'string') {
                badgeStr = badge;
            } else if (Array.isArray(badge) && badge.length > 0 && typeof badge[0] === 'string') {
                badgeStr = badge[0];
            }

            if (badgeStr) {
                badgeList = badgeStr.split(',')
                    .map((b: string) => b.trim() as TrophyBadgeType)
                    .filter((b: TrophyBadgeType) => Object.keys(BADGE_TO_COLUMN).includes(b));
            }
        }

        // Default to all badges if none specified
        if (badgeList.length === 0) {
            badgeList = Object.keys(BADGE_TO_COLUMN) as TrophyBadgeType[];
        }

        // Parse outline (default to 'solid')
        const outlineValue = (typeof outline === 'string' && ['solid', 'frame'].includes(outline) ? outline : 'solid') as TrophyOutlineStyle;

        return {
            theme: typeof theme === 'string' ? theme : undefined,
            outline: outlineValue,
            badges: badgeList,
            customLabel: typeof customLabel === 'string' ? customLabel : undefined,
            labelColor: typeof labelColor === 'string' ? labelColor : undefined,
            labelBackground: typeof labelBackground === 'string' ? labelBackground : undefined,
            valueColor: typeof valueColor === 'string' ? valueColor : undefined,
            valueBackground: typeof valueBackground === 'string' ? valueBackground : undefined,
        };
    }

    /** Validate username param; sends 400 and returns null on failure */
    private static requireUsername(req: Request, res: Response): string | null {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            res.status(400).send('username is required');
            return null;
        }
        return username;
    }

    /** Build a stable cache key from username and options */
    private static buildCacheKey(username: string, badgeList: TrophyBadgeType[], outline: TrophyOutlineStyle, theme?: string, customLabel?: string): string {
        return [
            'trophy',
            TrophyController.TROPHY_RENDER_VERSION,
            username,
            badgeList.sort().join(','),
            outline,
            theme ?? 'default',
            customLabel ?? '',
        ].join('|');
    }

    /** Calculate score from badge values */
    private static calculateScore(row: typeof badges.$inferSelect, badgeList: TrophyBadgeType[]): number {
        let score = 0;
        for (const badge of badgeList) {
            const col = BADGE_TO_COLUMN[badge];
            const value = (row[col] as number) ?? 0;
            const weight = BADGE_WEIGHTS[badge];
            score += value * weight;
        }
        return score;
    }

    /** Render a trophy badge with rank calculated from badge scores */
    static async getTrophy(req: Request, res: Response) {
        const username = TrophyController.requireUsername(req, res);
        if (!username) return;

        const options = TrophyController.parseOptions(req);
        const cacheKey = TrophyController.buildCacheKey(username, options.badges, options.outline, options.theme, options.customLabel);
        const badgeService = getBadgeCacheServiceSync();

        // 1. Check Redis persistent cache first
        if (badgeService?.isReady()) {
            const redisCached = await badgeService.getUserBadgeSVG(username, 'trophy', {
                renderVersion: TrophyController.TROPHY_RENDER_VERSION,
                outline: options.outline,
                theme: options.theme,
                customLabel: options.customLabel,
                badges: options.badges.join(','),
            });
            if (redisCached) {
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=600');
                res.setHeader('X-Cache', 'REDIS');
                return res.send(redisCached.svg);
            }
        }

        // 2. Check in-memory SVG cache
        const cached = TrophyController.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < TrophyController.CACHE_DURATION) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.setHeader('X-Cache', 'MEMORY');
            return res.send(cached.data);
        }

        // 3. Deduplicate in-flight requests for the same key
        let pending = TrophyController.pendingRequests.get(cacheKey);
        if (!pending) {
            pending = (async () => {
                // 4. Check DB cache
                let row = await db.select().from(badges).where(eq(badges.username, username)).get();
                const isStale = !row?.updated_at || (Date.now() - row.updated_at) > TrophyController.CACHE_DURATION;

                if (!isStale && row) {
                    // Use cached data
                } else {
                    // 5. Fetch from GitHub and persist
                    for (const badge of options.badges) {
                        const value = await TrophyController.githubClient.fetchBadgeValue(username, badge);
                        const col = BADGE_TO_COLUMN[badge];

                        const result = await db
                            .insert(badges)
                            .values({ username, [col]: value, updated_at: Date.now() })
                            .onConflictDoUpdate({
                                target: badges.username,
                                set: { [col]: value, updated_at: Date.now() },
                            })
                            .returning();

                        if (result[0]) {
                            row = result[0];
                        }
                    }
                }

                if (!row) {
                    res.status(404).send('User not found');
                    throw new Error('User not found');
                }

                // Calculate score and rank
                const score = TrophyController.calculateScore(row, options.badges);
                const rank = TrophyController.calculateRank(score);

                // Generate SVG
                const svg = TrophyController.generateTrophySVG(rank, score, {
                    outline: options.outline,
                    theme: options.theme,
                    customLabel: options.customLabel,
                    labelColor: options.labelColor,
                    labelBackground: options.labelBackground,
                    valueColor: options.valueColor,
                    valueBackground: options.valueBackground,
                });

                // Cache in both layers
                TrophyController.cache.set(cacheKey, { data: svg, timestamp: Date.now() });

                // Cache in Redis
                if (badgeService?.isReady()) {
                    await badgeService.setUserBadgeSVG(username, 'trophy', {
                        renderVersion: TrophyController.TROPHY_RENDER_VERSION,
                        outline: options.outline,
                        theme: options.theme,
                        customLabel: options.customLabel,
                        badges: options.badges.join(','),
                    }, {
                        svg,
                        value: score,
                        timestamp: Date.now(),
                        dbTimestamp: row.updated_at ?? Date.now(),
                    });
                }

                return svg;
            })();

            TrophyController.pendingRequests.set(cacheKey, pending);
            pending.finally(() => TrophyController.pendingRequests.delete(cacheKey));
        }

        try {
            const svg = await pending;
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.setHeader('X-Cache', 'MISS');
            return res.send(svg);
        } catch (error) {
            if (!res.headersSent) {
                res.status(500).send('Failed to generate trophy badge');
            }
        }
    }

    /** Generate trophy SVG with rank design */
    private static generateTrophySVG(
        rank: Rank,
        score: number,
        options: {
            outline: TrophyOutlineStyle;
            theme?: string;
            customLabel?: string;
            labelColor?: string;
            labelBackground?: string;
            valueColor?: string;
            valueBackground?: string;
        }
    ): string {
        const config = TROPHY_CONFIGS[rank];
        const width = 280;
        const height = 100;

        // Theme colors
        const labelBg = options.labelBackground || '#333333';
        const labelText = options.labelColor || '#c0a3fb';
        const valueBg = options.valueBackground || config.color;
        const valueText = options.valueColor || '#ffffff';
        const trophyPrimary = valueBg;
        const trophyAccent = config.highlight;
        const trophyLight = '#ffe9a6';

        const trophyLabel = options.customLabel || 'TROPHY';

        // Pixel-faithful trophy artwork embedded as its own SVG viewport.
        const trophySVG = `
            <svg x="8" y="6" width="64" height="64" viewBox="0 -0.5 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="11.9141" y="15.4102" width="1.58679" height="5.59554" fill="url(#paint0_linear_103_1804)"/>
                <path d="M5.89393 3.5979H1C1 7.393 1.29104 9.57603 6.69821 9.57603" stroke="${trophyLight}" stroke-width="2"/>
                <path d="M19.8636 8.56848C19.8636 12.5379 16.6458 15.7557 12.6764 15.7557C8.70707 15.7557 5.48926 12.5379 5.48926 8.56848C5.48926 4.59911 8.70707 1.3813 12.6764 1.3813C16.6458 1.3813 19.8636 4.59911 19.8636 8.56848Z" fill="${trophyLight}"/>
                <path d="M12.6764 20.7262C9.74579 20.7262 7.37002 21.5833 7.37002 22.6406H17.9829C17.9829 21.5833 15.6071 20.7262 12.6764 20.7262Z" fill="${trophyLight}"/>
                <path d="M5.48926 0H19.8636V8.23263H5.48926V0Z" fill="${trophyLight}"/>
                <path d="M17.9829 23.01H7.37002V22.607H17.9829V23.01Z" fill="${trophyLight}"/>
                <path d="M19.6603 3.5979H24.5542C24.5542 7.393 24.2632 9.57603 18.856 9.57603" stroke="${trophyAccent}" stroke-width="2"/>
                <path d="M19.8634 8.56843C19.8634 12.5378 16.6456 15.7556 12.6762 15.7556C12.6762 15.7556 12.6762 12.5378 12.6762 8.56843C12.6762 4.59905 12.6762 1.38124 12.6762 1.38124C16.6456 1.38124 19.8634 4.59905 19.8634 8.56843Z" fill="url(#paint1_linear_103_1804)"/>
                <path d="M12.6762 20.7262C12.6762 20.7262 12.6762 21.5833 12.6762 22.6405H17.9826C17.9826 21.5833 15.6069 20.7262 12.6762 20.7262Z" fill="url(#paint2_linear_103_1804)"/>
                <path d="M12.6762 0.000488281H19.8634V8.23258H12.6762V0.000488281Z" fill="url(#paint3_linear_103_1804)"/>
                <path d="M17.9826 23.01H12.6762C12.6762 23.01 12.6643 22.7639 12.6762 22.6069C12.8331 20.5406 17.9826 22.6069 17.9826 22.6069V23.01Z" fill="url(#paint4_linear_103_1804)"/>
                <circle cx="12.8176" cy="7.76846" r="4.30105" fill="${trophyAccent}"/>
                <circle cx="12.8088" cy="7.71544" r="3.12686" fill="${trophyPrimary}" stroke="${trophyLight}" stroke-width="4.55437"/>
                <path d="M12.8087 4.17944L13.8984 6.35885L16.0778 6.63128L14.5812 8.30942L14.9881 10.7177L12.8087 9.62796L10.6293 10.7177L11.0397 8.30942L9.53955 6.63128L11.719 6.35885L12.8087 4.17944Z" fill="#FFF4BC"/>
                <path d="M13.2559 3.95584L12.8087 3.06141L12.3614 3.95584L11.3914 5.8959L9.47753 6.13514L8.53113 6.25344L9.16678 6.96451L10.5063 8.46298L10.1364 10.6337L9.97064 11.606L10.8529 11.1649L12.8087 10.187L14.7645 11.1649L15.6451 11.6052L15.4811 10.6344L15.1143 8.46295L16.4509 6.96406L17.0848 6.25327L16.1398 6.13514L14.2259 5.8959L13.2559 3.95584Z" stroke="${trophyAccent}" stroke-opacity="0.7"/>
                <rect x="5" y="23" width="15" height="2" fill="${trophyAccent}"/>
                <defs>
                    <linearGradient id="paint0_linear_103_1804" x1="12.7075" y1="15.4102" x2="12.7075" y2="21.0057" gradientUnits="userSpaceOnUse">
                        <stop stop-color="${trophyAccent}"/>
                        <stop offset="1" stop-color="${trophyPrimary}"/>
                    </linearGradient>
                    <linearGradient id="paint1_linear_103_1804" x1="19.8139" y1="7.24836" x2="12.6085" y2="7.24836" gradientUnits="userSpaceOnUse">
                        <stop stop-color="${trophyAccent}"/>
                        <stop offset="1" stop-color="${trophyPrimary}"/>
                    </linearGradient>
                    <linearGradient id="paint2_linear_103_1804" x1="19.8139" y1="7.24836" x2="12.6085" y2="7.24836" gradientUnits="userSpaceOnUse">
                        <stop stop-color="${trophyAccent}"/>
                        <stop offset="1" stop-color="${trophyPrimary}"/>
                    </linearGradient>
                    <linearGradient id="paint3_linear_103_1804" x1="19.8139" y1="7.24836" x2="12.6085" y2="7.24836" gradientUnits="userSpaceOnUse">
                        <stop stop-color="${trophyAccent}"/>
                        <stop offset="1" stop-color="${trophyPrimary}"/>
                    </linearGradient>
                    <linearGradient id="paint4_linear_103_1804" x1="19.8139" y1="7.24836" x2="12.6085" y2="7.24836" gradientUnits="userSpaceOnUse">
                        <stop stop-color="${trophyAccent}"/>
                        <stop offset="1" stop-color="${trophyPrimary}"/>
                    </linearGradient>
                </defs>
            </svg>
        `;

        // Frame style (outline only)
        const frameStyle = options.outline === 'frame' ? `
            <rect x="3" y="3" width="${width - 6}" height="${height - 6}" fill="none" stroke="${config.color}" stroke-width="1.5"/>
        ` : '';

        // Badge layout with trophy and rank
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <defs>
                <style>
                    .trophy-label { font-family: 'Orbitron', 'Ubuntu', sans-serif; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
                    .trophy-rank { font-family: 'Orbitron', 'Ubuntu', sans-serif; font-size: 42px; font-weight: bold; letter-spacing: 2px; line-height: 1; }
                    .trophy-score { font-family: 'Orbitron', 'Ubuntu', sans-serif; font-size: 9px; letter-spacing: 0.5px; }
                    .trophy-border { fill: none; stroke-width: 1; }
                </style>
                <linearGradient id="labelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${labelBg};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="valueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${valueBg};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${config.highlight};stop-opacity:0.8" />
                </linearGradient>
            </defs>

            <!-- Background sections with gradient -->
            <rect x="0" y="0" width="80" height="${height}" fill="url(#labelGrad)"/>
            <rect x="80" y="0" width="${width - 80}" height="${height}" fill="url(#valueGrad)"/>

            ${frameStyle}

            <!-- Trophy icon -->
            ${trophySVG}

            <!-- Label text -->
            <text x="40" y="85" text-anchor="middle" class="trophy-label" fill="${labelText}">${trophyLabel}</text>

            <!-- Rank display -->
            <text x="${80 + (width - 80) / 2}" y="58" text-anchor="middle" class="trophy-rank" fill="${valueText}">${rank}</text>

            <!-- Score display -->
            <text x="${80 + (width - 80) / 2}" y="78" text-anchor="middle" class="trophy-score" fill="${valueText}">SCORE: ${score}</text>
        </svg>`;
    }
}
