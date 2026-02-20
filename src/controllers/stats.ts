import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github-client.js';
import { CardRenderer } from '../components/card-renderer.js';
import sharp from 'sharp';
export class StatsController {
    private static githubClient: GitHubClient;
    private static cache: Map<string, { data: string; timestamp: number }>;
    private static CACHE_DURATION: number;
    private static pendingRequests: Map<string, Promise<string>> = new Map();
    private static pngCache: Map<string, { data: Buffer; timestamp: number }> = new Map();
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
                    const stats = await StatsController.githubClient.fetchUserStats(username, {
                        avatarMode: finalAvatarMode as 'none' | 'avatar' | 'radar'
                    });

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
                    res.setHeader('Content-Type', 'image/webp');
                    res.setHeader('Cache-Control', 'public, max-age=600');
                    return res.send(cachedWebp.data);
                }

                const svgCard = await getSvgCard();
                const webpBuffer = await sharp(Buffer.from(svgCard)).webp().toBuffer();
                StatsController.pngCache.set(webpCacheKey, { data: webpBuffer, timestamp: Date.now() });
                res.setHeader('Content-Type', 'image/webp');
                res.setHeader('Cache-Control', 'public, max-age=600');
                return res.send(webpBuffer);
            }

            const card = await getSvgCard();
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=600');
            res.send(card);
        } catch (error) {
            console.error('Error generating stats:', error);
            res.status(500).send(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}
