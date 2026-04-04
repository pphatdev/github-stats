import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { CardRenderer } from '../components/card-renderer.js';
import { createLogger } from '../common/logger.js';
import sharp from 'sharp';
import { db } from '../db/index.js';
import { statsRequests } from '../db/schema.js';

const logger = createLogger({ controller: 'StatsController' });

export class StatsController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();
    private static pngCache: Map<string, { data: Buffer; timestamp: number }> = new Map();
    private static pendingWebpRequests: Map<string, Promise<Buffer>> = new Map();
    static routeDocs = {
        requiredParams: ['username'],
        optionalParams: [
            'theme',
            'hide_title',
            'hide_border',
            'hide_rank',
            'show_icons',
            'avatar_mode',
            'show_avatar',
            'custom_title',
            'data_border_style',
            'data_border_frame',
            'bgColor',
            'borderColor',
            'textColor',
            'titleColor',
            'format'
        ],
        payload: null as null,
        example: '/stats?username=pphatdev&theme=dark'
    };

    static initialize(githubClient: GitHubClient, cache: Map<string, { data: string; timestamp: number }>, cacheDuration: number) {
        this.githubClient = githubClient;
        this.cache = cache;
        this.CACHE_DURATION = cacheDuration;
    }

    static async getSvg(req: Request, res: Response) {
        const startTime = Date.now();
        const timings: { [key: string]: number } = {};

        try {
            const {
                username,
                theme = 'default',
                hide_title,
                hide_border,
                hide_rank,
                show_icons,
                avatar_mode = 'none',
                show_avatar,
                custom_title,
                data_border_style = 'solid',
                data_border_frame = 'out',
                bgColor,
                borderColor,
                textColor,
                titleColor,
                format
            } = req.query;

            if (!username || typeof username !== 'string') {
                return res.status(400).send('Username is required');
            }

            const normalizedParams = Object.entries(req.query)
                .flatMap(([key, value]) => {
                    if (value === undefined || value === null) return [] as Array<[string, string]>;
                    if (Array.isArray(value)) {
                        return value.map((item) => [key, String(item)] as [string, string]);
                    }
                    return [[key, String(value)] as [string, string]];
                })
                .sort(([aKey, aVal], [bKey, bVal]) => {
                    const keyCompare = aKey.localeCompare(bKey);
                    return keyCompare !== 0 ? keyCompare : aVal.localeCompare(bVal);
                });

            const queryString = new URLSearchParams(normalizedParams).toString();
            const normalizedEndpoint = queryString ? `${req.path}?${queryString}` : req.path;

            db.insert(statsRequests)
                .values({ username, url: normalizedEndpoint, created_at: Date.now() })
                .onConflictDoUpdate({
                    target: statsRequests.url,
                    set: {
                        username,
                        created_at: Date.now(),
                    },
                })
                .catch((err: Error) => logger.error('Failed to log stats request', err, { username, normalizedEndpoint }));

            // Backward compatibility: convert show_avatar to avatar_mode
            let finalAvatarMode = avatar_mode as string;
            if (show_avatar === 'true') {
                finalAvatarMode = 'avatar';
            }

            const userAgent = req.get('user-agent') || '';
            const isPreviewBot = /discordbot|twitterbot|slackbot|facebookexternalhit|linkedinbot|telegrambot|telegram|mastodon|whatsapp/i.test(userAgent);
            const normalizedFormat = typeof format === 'string' ? format.toLowerCase() : (isPreviewBot ? 'webp' : 'svg');
            const wantsWebp = normalizedFormat === 'webp';

            // Generate optimized cache key using pipe separator
            const cacheKey = [
                username,
                theme || 'default',
                hide_title || 'false',
                hide_border || 'false',
                hide_rank || 'false',
                show_icons !== 'false' ? 'true' : 'false',
                finalAvatarMode,
                custom_title || '',
                data_border_style || 'solid',
                data_border_frame || 'out',
                bgColor || '',
                borderColor || '',
                textColor || '',
                titleColor || ''
            ].join('|');

            const getSvgCard = async () => {
                const cached = StatsController.cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < StatsController.CACHE_DURATION) {
                    return cached.data;
                }

                if (StatsController.pendingRequests.has(cacheKey)) {
                    return StatsController.pendingRequests.get(cacheKey)!;
                }

                const cardPromise = (async () => {
                    const apiStartTime = Date.now();
                    const stats = await StatsController.githubClient.fetchUserStats(username, {
                        avatarMode: finalAvatarMode as 'none' | 'avatar' | 'radar'
                    });
                    timings['github_api'] = Date.now() - apiStartTime;

                    const renderStartTime = Date.now();
                    const card = CardRenderer.generateStatsCard(stats, {
                        theme: theme as string,
                        hideTitle: hide_title === 'true',
                        hideBorder: hide_border === 'true',
                        hideRank: hide_rank === 'true',
                        showIcons: show_icons !== 'false',
                        avatarMode: finalAvatarMode as 'none' | 'avatar' | 'radar',
                        customTitle: custom_title as string | undefined,
                        dataBorderStyle: data_border_style as 'solid' | 'frame',
                        dataBorderFramePosition: data_border_frame as 'in' | 'out',
                        bgColor: bgColor as string | undefined,
                        borderColor: borderColor as string | undefined,
                        textColor: textColor as string | undefined,
                        titleColor: titleColor as string | undefined,
                    });
                    timings['svg_render'] = Date.now() - renderStartTime;

                    StatsController.cache.set(cacheKey, { data: card, timestamp: Date.now() });
                    return card;
                })();

                StatsController.pendingRequests.set(cacheKey, cardPromise);

                try {
                    return await cardPromise;
                } finally {
                    StatsController.pendingRequests.delete(cacheKey);
                }
            };

            if (wantsWebp) {
                const webpCacheKey = `${cacheKey}|webp`;
                const cachedWebp = StatsController.pngCache.get(webpCacheKey);
                if (cachedWebp && Date.now() - cachedWebp.timestamp < StatsController.CACHE_DURATION) {
                    timings['total'] = Date.now() - startTime;
                    res.setHeader('X-Timing', JSON.stringify(timings));
                    res.setHeader('Content-Type', 'image/webp');
                    res.setHeader('Cache-Control', 'public, max-age=600');
                    return res.send(cachedWebp.data);
                }

                const pendingWebp = StatsController.pendingWebpRequests.get(webpCacheKey);
                if (pendingWebp) {
                    const webpBuffer = await pendingWebp;
                    timings['total'] = Date.now() - startTime;
                    res.setHeader('X-Timing', JSON.stringify(timings));
                    res.setHeader('Content-Type', 'image/webp');
                    res.setHeader('Cache-Control', 'public, max-age=600');
                    return res.send(webpBuffer);
                }

                const webpPromise = (async () => {
                    const svgCard = await getSvgCard();
                    const webpStartTime = Date.now();
                    const webpBuffer = await sharp(Buffer.from(svgCard))
                        .webp({ quality: 75, effort: 4, alphaQuality: 100 })
                        .toBuffer();
                    timings['webp_convert'] = Date.now() - webpStartTime;
                    StatsController.pngCache.set(webpCacheKey, { data: webpBuffer, timestamp: Date.now() });
                    return webpBuffer;
                })();

                StatsController.pendingWebpRequests.set(webpCacheKey, webpPromise);

                const webpBuffer = await webpPromise.finally(() => {
                    StatsController.pendingWebpRequests.delete(webpCacheKey);
                });

                timings['total'] = Date.now() - startTime;
                res.setHeader('X-Timing', JSON.stringify(timings));
                res.setHeader('Content-Type', 'image/webp');
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(webpBuffer);
            }

            const card = await getSvgCard();
            timings['total'] = Date.now() - startTime;
            res.setHeader('X-Timing', JSON.stringify(timings));
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(card);
        } catch (error) {
            timings['total'] = Date.now() - startTime;
            logger.error('Error generating stats', error as Error, { timings });
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}
